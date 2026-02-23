-- Give managers the same permissions as admins on invitations: add, delete, update.
-- Managers already have: SELECT (view), INSERT (teacher only). Add UPDATE and ensure DELETE.

-- Managers can update invitations (e.g. resend, or any future update)
CREATE POLICY "Managers can update invitations"
ON public.invitations
FOR UPDATE
USING (
  school_id = get_user_school_id(auth.uid())
  AND has_role(auth.uid(), 'manager'::app_role)
);

-- Ensure managers can delete invitations (idempotent: drop if exists then create)
DROP POLICY IF EXISTS "Managers can delete invitations" ON public.invitations;
CREATE POLICY "Managers can delete invitations"
ON public.invitations
FOR DELETE
USING (
  school_id = get_user_school_id(auth.uid())
  AND has_role(auth.uid(), 'manager'::app_role)
);
