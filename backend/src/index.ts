import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { query } from './db/pool';

// Routes
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import categoryRoutes from './routes/categories';
import cartRoutes from './routes/cart';
import orderRoutes from './routes/orders';
import userRoutes from './routes/users';
import reviewRoutes from './routes/reviews';
import paymentRoutes from './routes/payments';
import adminRoutes from './routes/admin';
import wishlistRoutes from './routes/wishlist';
import clinicalStudiesRoutes from './routes/clinical-studies';
import patientProfileRoutes from './routes/patient-profile';

dotenv.config();

const app = express();
const PORT = Number.parseInt(process.env.PORT || '5000', 10);

// Render runs behind a reverse proxy.
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (origin, callback) => {
    const configured = process.env.FRONTEND_URL;
    const allowed = !origin ||
      origin === configured ||
      origin === 'http://localhost:5173' ||
      origin === 'http://localhost:3000' ||
      /^https:\/\/[^/]+\.vercel\.app$/.test(origin);
    callback(null, allowed);
  },
  credentials: true,
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Body Parsing
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Health checks: keep both paths during the deployment transition.
const healthCheck = async (_req: express.Request, res: express.Response) => {
  try {
    await query('SELECT 1');
    return res.json({ status: 'OK', database: 'connected', timestamp: new Date().toISOString() });
  } catch {
    return res.status(503).json({ status: 'degraded', database: 'unavailable', timestamp: new Date().toISOString() });
  }
};
app.get('/health', healthCheck);
app.get('/api/health', healthCheck);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/clinical-studies', clinicalStudiesRoutes);
app.use('/api/patient-profile', patientProfileRoutes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
});

export default app;
