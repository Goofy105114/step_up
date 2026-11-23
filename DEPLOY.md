# StepUp — Deploy Guide (Supabase + Render + Vercel)

## Overview
| Layer | Platform | Cost |
|---|---|---|
| Database | Supabase | Free |
| Backend API | Render | Free |
| Frontend | Vercel | Free |

---

## Step 1 — Push to GitHub

```bash
cd "/Users/goofy/Documents/Recoz internship/Footcare Project/footwear-app"
git remote add origin https://github.com/YOUR_USERNAME/stepup-footwear.git
git push -u origin main
```

Create the repo first at github.com → New repository → `stepup-footwear` → no README.

---

## Step 2 — Set up Supabase Database

1. Go to **supabase.com** → Sign up → **New Project**
   - Name: `stepup`
   - Database Password: set a strong password (save it!)
   - Region: pick closest to you
   - Click **Create new project** (takes ~1 min)

2. Go to **Project Settings → Database → Connection string → URI**
   Copy it — looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.abcdefghij.supabase.co:5432/postgres
   ```

3. Go to **SQL Editor** (left sidebar) → **New query**
   Paste the entire contents of `api/db/schema.sql` → Click **Run**
   Then paste the entire contents of `api/db/seed.sql` → Click **Run**

4. Go to **Table Editor** to verify — you should see all 15 tables with data.

---

## Step 3 — Deploy API to Render

1. Go to **render.com** → Sign up with GitHub → **New → Web Service**
2. Connect your `stepup-footwear` repo
3. Settings:

| Field | Value |
|---|---|
| Name | `stepup-api` |
| Root Directory | `api` |
| Build Command | `npm install && npm run build` |
| Start Command | `node dist/index.js` |
| Instance Type | Free |

4. Click **Advanced** → **Add Environment Variables**:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | your Supabase connection string |
| `JWT_SECRET` | run `openssl rand -hex 32` in terminal and paste result |
| `JWT_EXPIRES_IN` | `7d` |
| `STRIPE_SECRET_KEY` | `sk_test_placeholder` (update later for real payments) |
| `FRONTEND_URL` | leave blank for now |

5. Click **Create Web Service** → wait ~3 minutes to deploy
6. Test: visit `https://stepup-api.onrender.com/api/health` → should return `{"status":"OK"}`
7. Test products: `https://stepup-api.onrender.com/api/products` → should return 8 products

---

## Step 4 — Deploy Frontend to Vercel

1. Go to **vercel.com** → Sign up with GitHub → **New Project**
2. Import your `stepup-footwear` repo
3. Settings:

| Field | Value |
|---|---|
| Framework Preset | Vite |
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

4. Environment Variables:

| Key | Value |
|---|---|
| `VITE_API_URL` | `https://stepup-api.onrender.com` |

5. Click **Deploy** → wait ~1 minute
6. Your site: `https://stepup-xxxx.vercel.app`

---

## Step 5 — Connect frontend URL to Render

1. Render → `stepup-api` → **Environment**
2. Add `FRONTEND_URL` = `https://stepup-xxxx.vercel.app`
3. Click **Save** — auto restarts

---

## Step 6 — Create Admin User

1. Register at your Vercel URL
2. Go to Supabase → **Table Editor → users**
3. Find your user row → edit `role` column → change `customer` to `admin` → Save
4. Visit `https://stepup-xxxx.vercel.app/admin`

---

## Done! Your URLs

| | URL |
|---|---|
| **Store** | `https://stepup-xxxx.vercel.app` |
| **Admin Panel** | `https://stepup-xxxx.vercel.app/admin` |
| **API** | `https://stepup-api.onrender.com/api` |
| **Database UI** | `supabase.com → your project → Table Editor` |

---

## Troubleshooting

| Problem | Fix |
|---|---|
| CORS error on frontend | Make sure `FRONTEND_URL` on Render exactly matches your Vercel URL |
| `SSL SYSCALL error` | DATABASE_URL must include `?sslmode=require` or use `db.xxx.supabase.co` host |
| Render cold start (30s delay) | Free tier sleeps after 15min — upgrade to $7/mo to avoid |
| Vercel 404 on page refresh | Already handled by `vercel.json` rewrites |
| `JWT_SECRET is not set` | Add it in Render environment variables |
