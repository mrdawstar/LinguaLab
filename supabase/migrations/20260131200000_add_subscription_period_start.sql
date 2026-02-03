-- Add subscription_period_start column to schools table
ALTER TABLE public.schools
ADD COLUMN IF NOT EXISTS subscription_period_start TIMESTAMP WITH TIME ZONE;
