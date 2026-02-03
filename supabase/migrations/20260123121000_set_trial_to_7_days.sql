-- Set new trial duration to 7 days
ALTER TABLE public.schools
  ALTER COLUMN trial_ends_at SET DEFAULT (NOW() + INTERVAL '7 days');

-- Tighten existing trial windows to 7 days for trial schools
UPDATE public.schools
SET trial_ends_at = created_at + INTERVAL '7 days'
WHERE subscription_status = 'trial'
  AND trial_ends_at > created_at + INTERVAL '7 days';
