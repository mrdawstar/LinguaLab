-- Fix invitations RLS policies - the ALL policy needs WITH CHECK for INSERT to work
-- Drop the existing admin policy that doesn't have WITH CHECK
DROP POLICY IF EXISTS "Admins can manage all invitations" ON public.invitations;

-- Create separate policies for admins with proper clauses
CREATE POLICY "Admins can view invitations"
ON public.invitations
FOR SELECT
USING (
  school_id = get_user_school_id(auth.uid()) 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can insert invitations"
ON public.invitations
FOR INSERT
WITH CHECK (
  school_id = get_user_school_id(auth.uid()) 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update invitations"
ON public.invitations
FOR UPDATE
USING (
  school_id = get_user_school_id(auth.uid()) 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete invitations"
ON public.invitations
FOR DELETE
USING (
  school_id = get_user_school_id(auth.uid()) 
  AND has_role(auth.uid(), 'admin'::app_role)
);