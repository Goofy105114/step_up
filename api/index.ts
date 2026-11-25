import 'express-async-errors';
import express    from 'express';
import cors       from 'cors';
import helmet     from 'helmet';
import morgan     from 'morgan';
import rateLimit  from 'express-rate-limit';
import dotenv     from 'dotenv';

dotenv.config();

import { errorHandler } from './middleware/errorHandler';
import { notFound }     from './middleware/notFound';
import authRoutes       from './routes/auth';
import productRoutes    from './routes/products';
import categoryRoutes   from './routes/categories';
import cartRoutes       from './routes/cart';
import orderRoutes      from './routes/orders';
import userRoutes       from './routes/users';
import reviewRoutes     from './routes/reviews';
import paymentRoutes    from './routes/payments';
import adminRoutes      from './routes/admin';
import wishlistRoutes   from './routes/wishlist';
import clinicalStudiesRoutes from './routes/clinical-studies';
import patientProfileRoutes from './routes/patient-profile';

const app = express();

// Trust Render/Vercel proxy headers
app.set('trust proxy', 1);

/* ── Security ─────────────────────────────────────────────────────────── */
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

app.use(cors({
  origin: (origin, cb) => {
    const allowed = [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:3000',
    ].filter(Boolean);
    // allow same-origin, Vercel preview URLs, and configured origin
    if (!origin || allowed.includes(origin) || /\.vercel\.app$/.test(origin)) {
      return cb(null, true);
    }
    return cb(null, false);
  },
  credentials: true,
}));

/* ── Rate limit ───────────────────────────────────────────────────────── */
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true }));

/* ── Body parsing ─────────────────────────────────────────────────────── */
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* ── Logging ──────────────────────────────────────────────────────────── */
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

/* ── Health ───────────────────────────────────────────────────────────── */
app.get('/api/health', (_req, res) =>
  res.json({ status: 'OK', env: process.env.NODE_ENV, ts: new Date().toISOString() })
);

/* ── Routes ───────────────────────────────────────────────────────────── */
app.use('/api/auth',       authRoutes);
app.use('/api/products',   productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart',       cartRoutes);
app.use('/api/orders',     orderRoutes);
app.use('/api/users',      userRoutes);
app.use('/api/reviews',    reviewRoutes);
app.use('/api/payments',   paymentRoutes);
app.use('/api/admin',      adminRoutes);
app.use('/api/wishlist',   wishlistRoutes);
app.use('/api/clinical-studies', clinicalStudiesRoutes);
app.use('/api/patient-profile', patientProfileRoutes);

/* ── Error handling ───────────────────────────────────────────────────── */
app.use(notFound);
app.use(errorHandler);

/* ── Start server (Render / local) ───────────────────────────────────── */
const PORT = parseInt(process.env.PORT || '4000', 10);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API → http://localhost:${PORT}/api`);
  console.log(`📊 NODE_ENV: ${process.env.NODE_ENV}`);
});

export default app;
