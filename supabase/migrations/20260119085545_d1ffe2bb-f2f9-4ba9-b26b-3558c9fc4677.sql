-- Add payment type and package lessons to payments table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'single' CHECK (payment_type IN ('single', 'package')),
ADD COLUMN IF NOT EXISTS package_lessons INTEGER DEFAULT NULL;

-- Drop existing admin-only policies for manager access
DROP POLICY IF EXISTS "Admins can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can update payments" ON public.payments;

-- Create new policies that include managers for INSERT and UPDATE
CREATE POLICY "Admins and managers can insert payments" 
ON public.payments 
FOR INSERT 
WITH CHECK (
  (school_id = get_user_school_id(auth.uid())) 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
);

CREATE POLICY "Admins and managers can update payments" 
ON public.payments 
FOR UPDATE 
USING (
  (school_id = get_user_school_id(auth.uid())) 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
);

-- Add SELECT policy for managers
DROP POLICY IF EXISTS "Admins can view payments" ON public.payments;

CREATE POLICY "Admins and managers can view payments" 
ON public.payments 
FOR SELECT 
USING (
  (school_id = get_user_school_id(auth.uid())) 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
);

-- Add DELETE policy for managers (optional, to match admin access)
DROP POLICY IF EXISTS "Admins can delete payments" ON public.payments;

CREATE POLICY "Admins and managers can delete payments" 
ON public.payments 
FOR DELETE 
USING (
  (school_id = get_user_school_id(auth.uid())) 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
);