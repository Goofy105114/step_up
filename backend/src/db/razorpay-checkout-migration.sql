-- Additive Razorpay checkout support. Existing orders and payment columns are retained.
-- Apply manually to the configured PostgreSQL database before enabling Razorpay in production.
BEGIN;
CREATE INDEX IF NOT EXISTS idx_orders_payment_intent_id ON orders(payment_intent_id) WHERE payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_pending_payment_created ON orders(created_at) WHERE payment_status='pending' AND payment_method='razorpay';
COMMIT;
