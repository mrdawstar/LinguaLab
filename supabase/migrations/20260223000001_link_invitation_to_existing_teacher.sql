-- Link invitation to existing teacher when admin added teacher without sending invite.
-- When a teacher row exists for (school_id, email) with user_id NULL (added by admin/manager),
-- accepting the invitation (signup or existing user) should set user_id instead of creating a duplicate.

-- 1) accept_invitation_for_existing_user: for teacher role, link existing teacher row if exists
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
    -- Prefer linking one existing teacher (same school + email, no user yet) so students stay assigned
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
      -- No existing teacher to link; create row only if user has no teacher yet
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

COMMENT ON FUNCTION public.accept_invitation_for_existing_user(TEXT) IS
  'Accepts a pending invitation for the current user. For teachers, links existing teacher row (school+email, user_id NULL) if any, so pre-added teachers with students get linked.';

-- 2) handle_new_user: when signup with invitation token is teacher, link existing teacher row if exists
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_school_id UUID;
  school_name TEXT;
  invitation_token TEXT;
  invitation_record RECORD;
  linked_teacher_id UUID;
BEGIN
  school_name := NEW.raw_user_meta_data ->> 'school_name';
  invitation_token := NEW.raw_user_meta_data ->> 'invitation_token';

  IF invitation_token IS NOT NULL THEN
    SELECT * INTO invitation_record
    FROM public.invitations
    WHERE token = invitation_token
      AND accepted_at IS NULL
      AND expires_at > NOW();

    IF invitation_record.id IS NOT NULL THEN
      INSERT INTO public.profiles (id, email, full_name, school_id)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
        invitation_record.school_id
      );

      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, invitation_record.role);

      IF invitation_record.role = 'teacher' THEN
        -- Link one existing teacher row (same school + email, user_id NULL) if exists
        UPDATE public.teachers
        SET user_id = NEW.id,
            name = COALESCE(NEW.raw_user_meta_data ->> 'full_name', name)
        WHERE id = (
          SELECT id FROM public.teachers
          WHERE school_id = invitation_record.school_id AND email = NEW.email AND user_id IS NULL
          LIMIT 1
        )
        RETURNING id INTO linked_teacher_id;

        IF linked_teacher_id IS NULL THEN
          INSERT INTO public.teachers (name, email, school_id, user_id)
          VALUES (
            COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
            NEW.email,
            invitation_record.school_id,
            NEW.id
          );
        END IF;
      END IF;

      UPDATE public.invitations
      SET accepted_at = NOW()
      WHERE id = invitation_record.id;

      RETURN NEW;
    END IF;
  END IF;

  IF school_name IS NOT NULL AND school_name != '' THEN
    INSERT INTO public.schools (name, subscription_status, trial_ends_at)
    VALUES (
      school_name,
      'trial',
      NOW() + INTERVAL '7 days'
    )
    RETURNING id INTO new_school_id;

    INSERT INTO public.profiles (id, email, full_name, school_id)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name', new_school_id);

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');

    INSERT INTO public.school_settings (school_id)
    VALUES (new_school_id);
  ELSE
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  END IF;

  RETURN NEW;
END;
$$;
