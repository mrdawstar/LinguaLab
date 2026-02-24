-- Allow existing users to accept an invitation (e.g. re-invited manager/teacher).
-- For teachers: link to existing teacher row (school+email, user_id NULL) if any, so pre-assigned students stay visible.
CREATE OR REPLACE FUNCTION public.accept_invitation_for_existing_user(_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv RECORD;
  current_email TEXT;
  linked_teacher_id UUID;
BEGIN
  SELECT i.id, i.email, i.role, i.school_id INTO inv
  FROM public.invitations i
  WHERE i.token = _token
    AND i.accepted_at IS NULL
    AND i.expires_at > NOW()
  LIMIT 1;

  IF inv.id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT email INTO current_email FROM auth.users WHERE id = auth.uid();
  IF current_email IS NULL OR current_email != inv.email THEN
    RETURN FALSE;
  END IF;

  UPDATE public.profiles
  SET school_id = inv.school_id
  WHERE id = auth.uid();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), inv.role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF inv.role = 'teacher' THEN
    -- Prefer linking existing teacher (same school + email, no user yet) so students stay assigned
    UPDATE public.teachers
    SET user_id = auth.uid(),
        name = COALESCE((SELECT full_name FROM public.profiles WHERE id = auth.uid()), name)
    WHERE id = (
      SELECT id FROM public.teachers
      WHERE school_id = inv.school_id AND email = inv.email AND user_id IS NULL
      LIMIT 1
    )
    RETURNING id INTO linked_teacher_id;

    IF linked_teacher_id IS NULL THEN
      INSERT INTO public.teachers (name, email, school_id, user_id)
      SELECT
        COALESCE((SELECT full_name FROM public.profiles WHERE id = auth.uid()), current_email),
        current_email,
        inv.school_id,
        auth.uid()
      WHERE NOT EXISTS (SELECT 1 FROM public.teachers WHERE user_id = auth.uid());
    END IF;
  END IF;

  UPDATE public.invitations
  SET accepted_at = NOW()
  WHERE id = inv.id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invitation_for_existing_user(TEXT) TO authenticated;

COMMENT ON FUNCTION public.accept_invitation_for_existing_user(TEXT) IS
  'Accepts a pending invitation for the currently authenticated user (same email). For teachers, links existing teacher row if any so pre-assigned students remain visible.';
