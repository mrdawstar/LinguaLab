-- Add DELETE policy for managers on invitations table
-- Managers should be able to delete invitations in their school
CREATE POLICY "Managers can delete invitations"
ON public.invitations
FOR DELETE
USING (
  school_id = get_user_school_id(auth.uid()) 
  AND has_role(auth.uid(), 'manager'::app_role)
);
