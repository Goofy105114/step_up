# StepUp — Deploy to Render (API) + Vercel (Frontend)

## Prerequisites
- GitHub account  
- Render account → https://render.com (free tier works)  
- Vercel account → https://vercel.com (free tier works)  
- Neon account   → https://neon.tech (free tier, serverless Postgres)

---

## Step 1 — Push to GitHub

```bash
# In the footwear-app folder
git remote add origin https://github.com/YOUR_USERNAME/stepup-footwear.git
git branch -M main
git push -u origin main
```

---

## Step 2 — Set up Neon Database

1. Go to https://neon.tech → Create account → New Project → name it `stepup`
2. Copy the **Connection string** (looks like):  
   `postgresql://user:pass@ep-cool-name.us-east-2.aws.neon.tech/footwear_db?sslmode=require`
3. Run migrations + seed from your local machine:

```bash
# In footwear-app/api — add DATABASE_URL to .env first
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/footwear_db?sslmode=require" \
  npm run db:migrate --prefix api

DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/footwear_db?sslmode=require" \
  npm run db:seed --prefix api
```

---

## Step 3 — Deploy API to Render

1. Go to https://render.com → New → **Web Service**
2. Connect your GitHub repo
3. Set these fields:
   - **Name**: `stepup-api`
   - **Root Directory**: `api`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node dist/index.js`
   - **Instance Type**: Free
4. Add **Environment Variables**:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | your Neon connection string |
| `JWT_SECRET` | any long random string (32+ chars) |
| `JWT_EXPIRES_IN` | `7d` |
| `STRIPE_SECRET_KEY` | `sk_test_...` from Stripe dashboard |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` from Stripe dashboard |
| `FRONTEND_URL` | set after Vercel deploy (e.g. `https://stepup.vercel.app`) |

5. Click **Deploy** — wait ~2 min
6. Note your API URL: `https://stepup-api.onrender.com`
7. Test: `curl https://stepup-api.onrender.com/api/health`

---

## Step 4 — Deploy Frontend to Vercel

1. Go to https://vercel.com → New Project → Import your GitHub repo
2. Set these:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add **Environment Variable**:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://stepup-api.onrender.com` |

4. Click **Deploy** — wait ~1 min
5. Note your frontend URL: `https://stepup-xxxx.vercel.app`

---

## Step 5 — Connect frontend URL back to Render

1. Go to Render → stepup-api → Environment
2. Update `FRONTEND_URL` → `https://stepup-xxxx.vercel.app`
3. Click **Save** (Render will auto-restart)

---

## Step 6 — Create Admin User

After deploy, register at your Vercel URL, then run:

```bash
psql "postgresql://user:pass@ep-xxx.neon.tech/footwear_db?sslmode=require" \
  -c "UPDATE users SET role='admin' WHERE email='your@email.com';"
```

Then visit `https://stepup-xxxx.vercel.app/admin`

---

## Done! Your URLs

| | URL |
|---|---|
| **Store** | `https://stepup-xxxx.vercel.app` |
| **Admin** | `https://stepup-xxxx.vercel.app/admin` |
| **API** | `https://stepup-api.onrender.com/api` |
| **Health** | `https://stepup-api.onrender.com/api/health` |

---

## Troubleshooting

**CORS errors** → Make sure `FRONTEND_URL` on Render matches your exact Vercel URL  
**DB connection fails** → Check Neon connection string has `?sslmode=require`  
**Render cold start (free tier)** → First request after 15min inactivity takes ~30s, that's normal  
**Vercel 404 on page refresh** → Already handled by `vercel.json` rewrites
