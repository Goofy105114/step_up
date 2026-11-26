import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { query } from '../db/pool';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { sendOtp, resendOtp, verifyOtp, verifyOtpAccessToken } from '../services/msg91Otp';
import { createResetToken, hashResetToken, sendPasswordResetEmail } from '../services/passwordResetEmail';

const router=Router();
const getJwtSecret=()=>{const secret=process.env.JWT_SECRET;if(!secret)throw new Error('JWT_SECRET environment variable is not set');return secret;};
const strongPassword=(value:string)=>typeof value==='string'&&value.length>=10&&value.length<=72&&/[a-z]/.test(value)&&/[A-Z]/.test(value)&&/\d/.test(value)&&/[^A-Za-z0-9]/.test(value)&&!/\s/.test(value);
const emailRules=body('email').trim().isEmail({allow_utf8_local_part:false,require_tld:true}).normalizeEmail().custom(value=>!value.includes('..')&&value.length<=254).withMessage('Enter a valid email address');
const phoneRules=body('phone').optional({checkFalsy:true}).custom(value=>typeof value==='string'&&/^[6-9]\d{9}$/.test(value.replace(/\s/g,''))).withMessage('Enter exactly 10 digits for an Indian mobile number');
const authAttemptLimiter=rateLimit({windowMs:15*60*1000,limit:10,standardHeaders:true,legacyHeaders:false,message:{success:false,message:'Too many authentication attempts. Try again in 15 minutes.'}});
const otpLimiter=rateLimit({windowMs:15*60*1000,limit:5,standardHeaders:true,legacyHeaders:false,message:{success:false,message:'Too many OTP requests. Try again later.'}});
const normalizeIdentifier=(raw:string)=>{const value=String(raw||'').trim();if(value.includes('@')){const email=value.toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)||email.includes('..')||email.length>254)throw new AppError('Enter a valid email address',400);return email;}const digits=value.replace(/\D/g,'');if(!/^[6-9]\d{9}$/.test(digits))throw new AppError('Enter a valid 10-digit Indian mobile number',400);return '91'+digits;};
const sameIdentifier=(a:string,b:string)=>a.includes('@')?a.toLowerCase()===b.toLowerCase():a.replace(/\D/g,'').slice(-10)===b.replace(/\D/g,'').slice(-10);
const issueToken=(user:any)=>jwt.sign({userId:user.id,email:user.email,role:user.role},getJwtSecret(),{expiresIn:'7d'});
const issueVerifiedTicket=(challenge:any,identifier:string)=>jwt.sign({sub:challenge.id,purpose:challenge.purpose,identifier,kind:'otp_verified'},getJwtSecret(),{expiresIn:'10m'});

router.post('/otp/send',otpLimiter,async(req:Request,res:Response)=>{
 const identifier=normalizeIdentifier(req.body.identifier),purpose=String(req.body.purpose||'register');
 if(!['register','login','admin','checkout'].includes(purpose))throw new AppError('Unsupported verification purpose',400);
 const contact=identifier.includes('@')?identifier:identifier.slice(-10);
 if(purpose==='register'){
  const existing=identifier.includes('@')?await query('SELECT id FROM users WHERE lower(email)=lower($1)',[contact]):await query("SELECT id FROM users WHERE regexp_replace(phone,'\\D','','g') LIKE $1",['%'+contact]);
  if(existing.rows.length)throw new AppError('An account already exists for this contact',409);
 }else{
  const found=identifier.includes('@')?await query('SELECT id,role FROM users WHERE lower(email)=lower($1)',[contact]):await query("SELECT id,role FROM users WHERE regexp_replace(phone,'\\D','','g') LIKE $1",['%'+contact]);
  if(!found.rows.length)throw new AppError('No account found for this contact',404);
  if(purpose==='admin'&&!['admin','staff'].includes(found.rows[0].role))throw new AppError('Admin access is not available for this account',403);
 }
 const recent=await query("SELECT count(*)::int AS total FROM auth_otp_challenges WHERE identifier=$1 AND created_at>NOW()-INTERVAL '15 minutes'",[identifier]);
 if(Number(recent.rows[0]?.total||0)>=5)throw new AppError('OTP request limit reached. Try again later.',429);
 const providerId=await sendOtp(identifier);
 const saved=await query("INSERT INTO auth_otp_challenges(provider_request_id,identifier,purpose,expires_at) VALUES($1,$2,$3,NOW()+INTERVAL '10 minutes') RETURNING id,expires_at",[providerId,identifier,purpose]);
 res.status(200).json({success:true,request_id:providerId,challenge_id:saved.rows[0].id,expires_at:saved.rows[0].expires_at,message:'OTP sent if the contact is eligible.'});
});
router.post('/otp/resend',otpLimiter,async(req:Request,res:Response)=>{
 const requestId=String(req.body.request_id||'');if(!requestId||requestId.length>200)throw new AppError('Invalid OTP request',400);
 const found=await query("SELECT id FROM auth_otp_challenges WHERE provider_request_id=$1 AND consumed_at IS NULL AND expires_at>NOW()",[requestId]);
 if(!found.rows.length)throw new AppError('OTP request expired. Request a new code.',410);
 await resendOtp(requestId);res.json({success:true,message:'OTP resent'});
});
router.post('/otp/verify',authAttemptLimiter,async(req:Request,res:Response)=>{
 const requestId=String(req.body.request_id||''),otp=String(req.body.otp||'');
 if(!/^\d{4,8}$/.test(otp)||!requestId)throw new AppError('Enter a valid OTP',400);
 const found=await query("SELECT * FROM auth_otp_challenges WHERE provider_request_id=$1 AND consumed_at IS NULL AND expires_at>NOW()",[requestId]);
 const challenge=found.rows[0];if(!challenge)throw new AppError('OTP request expired or already used',410);
 const accessToken=await verifyOtp(requestId,otp);
 const verifiedIdentifier=await verifyOtpAccessToken(accessToken);
 if(!sameIdentifier(challenge.identifier,verifiedIdentifier))throw new AppError('Verified contact does not match the requested contact',403);
 await query('UPDATE auth_otp_challenges SET verified_at=NOW() WHERE id=$1',[challenge.id]);
 res.json({success:true,verification_ticket:issueVerifiedTicket(challenge,challenge.identifier),purpose:challenge.purpose});
});
router.post('/otp/login',authAttemptLimiter,async(req:Request,res:Response)=>{
 const ticket=String(req.body.verification_ticket||'');let claims:any;
 try{claims=jwt.verify(ticket,getJwtSecret());}catch{throw new AppError('OTP verification expired. Please verify again.',401);}
 if(claims.kind!=='otp_verified'||!['login','admin'].includes(claims.purpose))throw new AppError('Invalid login verification',400);
 const challenge=await query('SELECT * FROM auth_otp_challenges WHERE id=$1 AND verified_at IS NOT NULL AND consumed_at IS NULL AND expires_at>NOW()',[claims.sub]);
 if(!challenge.rows.length)throw new AppError('OTP verification has expired or was already used',410);
 const identifier=String(claims.identifier),contact=identifier.includes('@')?identifier:identifier.slice(-10);
 const found=identifier.includes('@')?await query('SELECT id,email,first_name,last_name,role,phone,avatar_url FROM users WHERE lower(email)=lower($1)',[contact]):await query("SELECT id,email,first_name,last_name,role,phone,avatar_url FROM users WHERE regexp_replace(phone,'\\D','','g') LIKE $1",['%'+contact]);
 const user=found.rows[0];if(!user)throw new AppError('Account not found',404);
 if(claims.purpose==='admin'&&!['admin','staff'].includes(user.role))throw new AppError('Admin access required',403);
 await query('UPDATE auth_otp_challenges SET consumed_at=NOW() WHERE id=$1',[claims.sub]);
 res.json({success:true,token:issueToken(user),user});
});

router.post('/register',authAttemptLimiter,[emailRules,body('password').custom(strongPassword).withMessage('Use 10–72 characters with uppercase, lowercase, a number and a symbol; no spaces.'),body('first_name').trim().isLength({min:1,max:100}),body('last_name').trim().isLength({min:1,max:100}),phoneRules],async(req:Request,res:Response)=>{
 const errors=validationResult(req);if(!errors.isEmpty())return res.status(400).json({success:false,message:'Please correct the highlighted fields.',errors:errors.array()});
 let claims:any;try{claims=jwt.verify(String(req.body.verification_ticket||''),getJwtSecret());}catch{throw new AppError('Verify your email or mobile number before creating an account',403);}
 if(claims.kind!=='otp_verified'||claims.purpose!=='register')throw new AppError('Invalid registration verification',403);
 const email=String(req.body.email).trim().toLowerCase(),phone=req.body.phone?String(req.body.phone).replace(/\s/g,''):null;
 const matches=claims.identifier.includes('@')?claims.identifier===email:sameIdentifier(claims.identifier,phone||'');
 if(!matches)throw new AppError('Verified email or mobile must match your account details',403);
 const challenge=await query('SELECT id FROM auth_otp_challenges WHERE id=$1 AND verified_at IS NOT NULL AND consumed_at IS NULL AND expires_at>NOW()',[claims.sub]);
 if(!challenge.rows.length)throw new AppError('Registration verification expired or already used',410);
 const existing=await query('SELECT id FROM users WHERE lower(email)=lower($1)',[email]);if(existing.rows.length)throw new AppError('Email already registered',409);
 const hash=await bcrypt.hash(req.body.password,12);
 const result=await query('INSERT INTO users(email,password_hash,first_name,last_name,phone,is_verified) VALUES($1,$2,$3,$4,$5,true) RETURNING id,email,first_name,last_name,role,phone,avatar_url',[email,hash,req.body.first_name.trim(),req.body.last_name.trim(),phone]);
 await query('UPDATE auth_otp_challenges SET consumed_at=NOW() WHERE id=$1',[claims.sub]);
 const user=result.rows[0];return res.status(201).json({success:true,token:issueToken(user),user});
});
router.post('/login',authAttemptLimiter,[emailRules,body('password').isLength({min:1,max:72})],async(req:Request,res:Response)=>{
 const errors=validationResult(req);if(!errors.isEmpty())return res.status(400).json({success:false,errors:errors.array()});
 const email=String(req.body.email).trim().toLowerCase(),{password}=req.body;
 const result=await query('SELECT * FROM users WHERE email=$1',[email]),user=result.rows[0];
 if(!user||!(await bcrypt.compare(password,user.password_hash)))throw new AppError('Invalid email or password',401);
 const token=issueToken(user),{password_hash:_pw,...safeUser}=user;return res.json({success:true,token,user:safeUser});
});
router.post('/forgot-password',authAttemptLimiter,[emailRules],async(req:Request,res:Response)=>{
 const email=String(req.body.email).trim().toLowerCase(),found=await query('SELECT id FROM users WHERE lower(email)=lower($1)',[email]);
 if(found.rows[0]){
  const token=createResetToken(),hash=hashResetToken(token);
  await query('UPDATE password_reset_tokens SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL',[found.rows[0].id]);
  await query('INSERT INTO password_reset_tokens(user_id,token_hash,expires_at) VALUES($1,$2,NOW()+INTERVAL \'30 minutes\')',[found.rows[0].id,hash]);
  const base=(process.env.FRONTEND_URL||'').replace(/\/$/,'');if(!base)throw new Error('FRONTEND_URL is not configured');
  const url=base+'/forgot-password?token='+encodeURIComponent(token);
  await sendPasswordResetEmail(email,url);
 }
 res.json({success:true,message:'If an account exists for this email, a password reset link has been sent.'});
});
router.post('/reset-password',authAttemptLimiter,[body('token').isLength({min:30,max:200}),body('new_password').custom(strongPassword).withMessage('Use 10–72 characters with uppercase, lowercase, a number and a symbol; no spaces.')],async(req:Request,res:Response)=>{
 const hash=hashResetToken(String(req.body.token)),found=await query('SELECT id,user_id FROM password_reset_tokens WHERE token_hash=$1 AND used_at IS NULL AND expires_at>NOW()',[hash]);
 if(!found.rows[0])throw new AppError('Reset link is invalid or expired. Request a new one.',400);
 const passwordHash=await bcrypt.hash(req.body.new_password,12);
 const changed=await query('WITH updated_user AS (UPDATE users SET password_hash=$1,updated_at=NOW() WHERE id=$2 RETURNING id) UPDATE password_reset_tokens SET used_at=NOW() WHERE user_id=(SELECT id FROM updated_user) AND used_at IS NULL RETURNING id',[passwordHash,found.rows[0].user_id]);if(!changed.rowCount)throw new AppError('Reset link is invalid or expired. Request a new one.',400);
 res.json({success:true,message:'Password updated successfully'});
});
router.get('/me',authenticate,async(req:Request,res:Response)=>{
 const result=await query('SELECT id,email,first_name,last_name,phone,role,avatar_url,created_at FROM users WHERE id=$1',[req.user!.userId]);
 if(!result.rows[0])throw new AppError('User not found',404);return res.json({success:true,user:result.rows[0]});
});
router.post('/change-password',authenticate,[body('current_password').notEmpty(),body('new_password').custom(strongPassword).withMessage('Use 10–72 characters with uppercase, lowercase, a number and a symbol; no spaces.')],async(req:Request,res:Response)=>{
 const {current_password,new_password}=req.body,result=await query('SELECT password_hash FROM users WHERE id=$1',[req.user!.userId]),user=result.rows[0];
 if(!user||!(await bcrypt.compare(current_password,user.password_hash)))throw new AppError('Current password is incorrect',400);
 const hash=await bcrypt.hash(new_password,12);await query('UPDATE users SET password_hash=$1,updated_at=NOW() WHERE id=$2',[hash,req.user!.userId]);
 return res.json({success:true,message:'Password updated'});
});
export default router;
