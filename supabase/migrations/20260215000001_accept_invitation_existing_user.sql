-- Allow existing users to accept an invitation (e.g. re-invited manager).
-- When they log in with invitation token in URL, this RPC updates their profile and user_roles.
CREATE OR REPLACE FUNCTION public.accept_invitation_for_existing_user(_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv RECORD;
  current_email TEXT;
BEGIN
  -- Get valid invitation by token
  SELECT i.id, i.email, i.role, i.school_id INTO inv
  FROM public.invitations i
  WHERE i.token = _token
    AND i.accepted_at IS NULL
    AND i.expires_at > NOW()
  LIMIT 1;

  IF inv.id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Ensure the invitation is for the current user's email
  SELECT email INTO current_email FROM auth.users WHERE id = auth.uid();
  IF current_email IS NULL OR current_email != inv.email THEN
    RETURN FALSE;
  END IF;

  -- Update profile with school from invitation
  UPDATE public.profiles
  SET school_id = inv.school_id
  WHERE id = auth.uid();

  -- Assign role (ignore conflict if already exists)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), inv.role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- If teacher, ensure teachers row exists (only if not already present)
  IF inv.role = 'teacher' THEN
    INSERT INTO public.teachers (name, email, school_id, user_id)
    SELECT
      COALESCE((SELECT full_name FROM public.profiles WHERE id = auth.uid()), current_email),
      current_email,
      inv.school_id,
      auth.uid()
    WHERE NOT EXISTS (SELECT 1 FROM public.teachers WHERE user_id = auth.uid());
  END IF;

  -- Mark invitation as accepted
  UPDATE public.invitations
  SET accepted_at = NOW()
  WHERE id = inv.id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invitation_for_existing_user(TEXT) TO authenticated;

COMMENT ON FUNCTION public.accept_invitation_for_existing_user(TEXT) IS
  'Accepts a pending invitation for the currently authenticated user (same email). Updates profile.school_id and user_roles. Used when re-invited manager/teacher logs in.';
