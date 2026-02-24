-- Allow (re-)sending invitation: create new or refresh existing (same school_id, email, role).
-- After deleting an invitation, the row is gone so a new one can be created.
-- When sending again without deleting, we refresh the existing row (new token, new expiry).
-- Ensure unique on (school_id, email, role) so ON CONFLICT works (may be missing in some DBs).
CREATE UNIQUE INDEX IF NOT EXISTS invitations_school_id_email_role_key
  ON public.invitations (school_id, email, role);

-- Helper does INSERT in a separate context so ON CONFLICT (school_id, email, role) is unambiguous.
CREATE OR REPLACE FUNCTION public.insert_or_refresh_invitation(
  p_school_id UUID,
  p_email TEXT,
  p_role public.app_role,
  p_invited_by UUID
)
RETURNS SETOF public.invitations
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.invitations (school_id, email, role, invited_by)
  VALUES (p_school_id, p_email, p_role, p_invited_by)
  ON CONFLICT (school_id, email, role)
  DO UPDATE SET
    token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
    expires_at = now() + interval '7 days',
    updated_at = now(),
    accepted_at = NULL,
    invited_by = EXCLUDED.invited_by
  RETURNING *;
$$;

CREATE OR REPLACE FUNCTION public.create_or_refresh_invitation(
  p_school_id UUID,
  p_email TEXT,
  p_role public.app_role,
  p_invited_by UUID
)
RETURNS TABLE (
  id UUID,
  school_id UUID,
  email TEXT,
  role public.app_role,
  token TEXT,
  invited_by UUID,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    get_user_school_id(auth.uid()) = p_school_id
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_role = 'manager' AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admin can invite managers';
  END IF;

  RETURN QUERY
  SELECT r.id, r.school_id, r.email, r.role, r.token, r.invited_by,
         r.accepted_at, r.expires_at, r.created_at, r.updated_at
  FROM public.insert_or_refresh_invitation(p_school_id, p_email, p_role, p_invited_by) AS r;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_or_refresh_invitation(UUID, TEXT, public.app_role, UUID) TO authenticated;

COMMENT ON FUNCTION public.create_or_refresh_invitation(UUID, TEXT, public.app_role, UUID) IS
  'Creates a new invitation or refreshes existing one (new token, 7-day expiry). Enables re-inviting after delete and resend without deleting.';
