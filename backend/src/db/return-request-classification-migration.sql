-- Classify return requests without treating statutory product-quality complaints as ordinary change-of-mind returns.
-- Additive only; existing records default to standard and are not rewritten beyond the new default.
BEGIN;

ALTER TABLE public.return_requests
  ADD COLUMN IF NOT EXISTS request_type VARCHAR(24) NOT NULL DEFAULT 'standard';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'return_requests_request_type_check'
      AND conrelid = 'public.return_requests'::regclass
  ) THEN
    ALTER TABLE public.return_requests
      ADD CONSTRAINT return_requests_request_type_check
      CHECK (request_type IN ('standard','defective','damaged','incorrect','misdescribed'));
  END IF;
END $$;

COMMIT;
