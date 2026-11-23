# StepUp — D2C Footwear Full-Stack Application

A complete, production-ready D2C footwear e-commerce platform built with React, Node/Express, and PostgreSQL.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Framer Motion |
| **State** | Zustand (auth + cart), TanStack Query (server state) |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | PostgreSQL 16 |
| **Auth** | JWT (HTTP-only approach) |
| **Payments** | Stripe (payment intents) |
| **Containerisation** | Docker + docker-compose |

---

## Project Structure

```
footwear-app/
├── backend/
│   └── src/
│       ├── db/          # pool.ts, schema.sql, seed.sql
│       ├── middleware/  # auth, errorHandler, notFound
│       ├── routes/      # auth, products, cart, orders, reviews,
│       │                # payments, wishlist, users, admin
│       ├── types/       # shared TypeScript types
│       └── index.ts     # Express app entry point
├── frontend/
│   └── src/
│       ├── components/  # Navbar, Footer, ProductCard, CartDrawer, AdminLayout
│       ├── pages/       # Home, Shop, Product, Cart, Checkout,
│       │                # Orders, Wishlist, Profile, Auth, Admin
│       ├── store/       # authStore (Zustand), cartStore (Zustand)
│       ├── lib/         # axios instance, formatters
│       └── App.tsx      # Route definitions
├── docker-compose.yml
└── README.md
```

---

## Quick Start (Docker — recommended)

```bash
# 1. Clone / navigate to project
cd "footwear-app"

# 2. Copy and configure env
cp backend/.env.example backend/.env
# Edit backend/.env — add your Stripe key, JWT secret, etc.

# 3. Start everything (DB + backend + frontend)
docker-compose up --build
```

Then visit:
- **Store** → http://localhost:5173
- **API**   → http://localhost:5000
- **Admin** → http://localhost:5173/admin _(requires admin user)_

---

## Quick Start (Local — no Docker)

### Prerequisites
- Node.js 20+
- PostgreSQL 14+ running locally

### 1. Database setup
```bash
createdb footwear_db
psql footwear_db < backend/src/db/schema.sql
psql footwear_db < backend/src/db/seed.sql
```

### 2. Backend
```bash
cd backend
cp ../.env.example .env      # fill in your values
npm install
npm run dev
# → http://localhost:5000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## Key Features

### Customer-Facing
- **Homepage** — hero banner, category grid, featured products, sale banner, testimonials
- **Shop** — paginated grid with sorting (price, rating, newest), filters (price range, collections)
- **Product page** — image gallery, colour/size selector, quantity, reviews accordion, trust badges
- **Cart drawer** — slide-in, quantity controls, free-shipping indicator, quick checkout
- **Checkout** — 2-step (address → payment), multi-method (COD, UPI, card, net banking)
- **Order tracking** — visual stepper, status history, cancel option
- **Wishlist** — add/remove, quick add to cart
- **Profile** — name/phone update, password change

### Admin Panel (`/admin`)
- **Dashboard** — revenue, orders, users, products KPIs, top sellers
- **Orders** — list with status filter, inline status update
- **Products** — table with toggle active/inactive
- **Users** — customer list with lifetime value

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Register |
| POST | `/api/auth/login` | — | Login |
| GET | `/api/auth/me` | ✓ | Current user |
| GET | `/api/products` | — | List (filters, pagination) |
| GET | `/api/products/:slug` | — | Single product |
| GET | `/api/categories` | — | All categories |
| GET | `/api/cart` | ✓ | Get cart |
| POST | `/api/cart/items` | ✓ | Add item |
| PATCH | `/api/cart/items/:id` | ✓ | Update qty |
| DELETE | `/api/cart/items/:id` | ✓ | Remove item |
| POST | `/api/orders` | ✓ | Place order |
| GET | `/api/orders` | ✓ | My orders |
| GET | `/api/orders/:id` | ✓ | Order detail |
| POST | `/api/orders/:id/cancel` | ✓ | Cancel order |
| GET | `/api/wishlist` | ✓ | Get wishlist |
| POST | `/api/wishlist` | ✓ | Add to wishlist |
| DELETE | `/api/wishlist/:id` | ✓ | Remove from wishlist |
| POST | `/api/payments/intent` | ✓ | Stripe payment intent |
| POST | `/api/payments/validate-coupon` | ✓ | Validate coupon |
| GET | `/api/admin/dashboard` | admin | Dashboard stats |
| GET | `/api/admin/orders` | admin | All orders |
| PATCH | `/api/admin/orders/:id/status` | admin | Update order status |
| GET | `/api/admin/products` | admin | All products |
| PATCH | `/api/admin/products/:id` | admin | Update product |
| GET | `/api/admin/users` | admin | All users |

---

## Creating an Admin User

After registration, run this SQL to elevate a user:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

---

## Environment Variables

See `backend/.env.example` for the full list. The critical ones:

```env
JWT_SECRET=<long-random-string>
STRIPE_SECRET_KEY=sk_test_...
DB_PASSWORD=yourpassword
```
