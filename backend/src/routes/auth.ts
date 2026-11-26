import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { query } from '../db/pool';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
const router=Router();
const getJwtSecret=()=>{const secret=process.env.JWT_SECRET;if(!secret)throw new Error('JWT_SECRET environment variable is not set');return secret;};
const strongPassword=(value:string)=>value.length>=10&&value.length<=72&&/[a-z]/.test(value)&&/[A-Z]/.test(value)&&/\d/.test(value)&&/[^A-Za-z0-9]/.test(value)&&!/\s/.test(value);
const emailRules=body('email').trim().isEmail({allow_utf8_local_part:false,require_tld:true}).normalizeEmail().custom(value=>!value.includes('..')&&value.length<=254).withMessage('Enter a valid email address');
const phoneRules=body('phone').optional({checkFalsy:true}).custom(value=>typeof value==='string'&&/^[6-9]\d{9}$/.test(value.replace(/\s/g,''))).withMessage('Enter exactly 10 digits for an Indian mobile number');
router.post('/register',[emailRules,body('password').custom(strongPassword).withMessage('Use 10–72 characters with uppercase, lowercase, a number and a symbol; no spaces.'),body('first_name').trim().isLength({min:1,max:100}),body('last_name').trim().isLength({min:1,max:100}),phoneRules],async(req:Request,res:Response)=>{
 const errors=validationResult(req);if(!errors.isEmpty())return res.status(400).json({success:false,message:'Please correct the highlighted fields.',errors:errors.array()});
 const email=String(req.body.email).trim().toLowerCase(),phone=req.body.phone?String(req.body.phone).replace(/\s/g,''):null;
 const {password,first_name,last_name}=req.body;
 const existing=await query('SELECT id FROM users WHERE email=$1',[email]);if(existing.rows.length)throw new AppError('Email already registered',409);
 const hash=await bcrypt.hash(password,12);
 const result=await query(`INSERT INTO users(email,password_hash,first_name,last_name,phone) VALUES($1,$2,$3,$4,$5) RETURNING id,email,first_name,last_name,role`,[email,hash,first_name.trim(),last_name.trim(),phone]);
 const user=result.rows[0],token=jwt.sign({userId:user.id,email:user.email,role:user.role},getJwtSecret(),{expiresIn:'7d'});
 return res.status(201).json({success:true,token,user});
});
router.post('/login',[emailRules,body('password').isLength({min:1,max:72})],async(req:Request,res:Response)=>{
 const errors=validationResult(req);if(!errors.isEmpty())return res.status(400).json({success:false,errors:errors.array()});
 const email=String(req.body.email).trim().toLowerCase(),{password}=req.body;
 const result=await query('SELECT * FROM users WHERE email=$1',[email]),user=result.rows[0];
 if(!user||!(await bcrypt.compare(password,user.password_hash)))throw new AppError('Invalid email or password',401);
 const token=jwt.sign({userId:user.id,email:user.email,role:user.role},getJwtSecret(),{expiresIn:'7d'}),{password_hash:_pw,...safeUser}=user;
 return res.json({success:true,token,user:safeUser});
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
