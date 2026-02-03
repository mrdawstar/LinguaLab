-- Add subscription fields to schools table
ALTER TABLE public.schools
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '14 days'),
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS subscription_plan TEXT,
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMP WITH TIME ZONE;

-- Update existing schools to have trial period from their creation date
UPDATE public.schools
SET trial_ends_at = created_at + INTERVAL '14 days'
WHERE trial_ends_at IS NULL OR trial_ends_at = NOW() + INTERVAL '14 days';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_schools_subscription_status ON public.schools(subscription_status);
CREATE INDEX IF NOT EXISTS idx_schools_stripe_customer_id ON public.schools(stripe_customer_id);