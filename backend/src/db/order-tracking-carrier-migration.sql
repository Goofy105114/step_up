-- Optional carrier name entered by the fulfilment operator; never inferred.
BEGIN;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_carrier VARCHAR(100);
COMMIT;
