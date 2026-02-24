-- Fix: (1) Link existing teacher on accept/signup with case-insensitive email,
--      (2) Merge duplicate teachers (same school + email), (3) Prevent future duplicates.

-- 1) accept_invitation_for_existing_user: link existing teacher by school_id + LOWER(email), then create only if none
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
  IF current_email IS NULL OR LOWER(TRIM(current_email)) != LOWER(TRIM(inv.email)) THEN
    RETURN FALSE;
  END IF;

  UPDATE public.profiles
  SET school_id = inv.school_id
  WHERE id = auth.uid();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), inv.role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF inv.role = 'teacher' THEN
    -- Link one existing teacher (same school + email case-insensitive, no user yet)
    UPDATE public.teachers
    SET user_id = auth.uid(),
        name = COALESCE((SELECT full_name FROM public.profiles WHERE id = auth.uid()), name)
    WHERE id = (
      SELECT id FROM public.teachers
      WHERE school_id = inv.school_id
        AND LOWER(TRIM(email)) = LOWER(TRIM(inv.email))
        AND user_id IS NULL
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

COMMENT ON FUNCTION public.accept_invitation_for_existing_user(TEXT) IS
  'Accepts invitation for current user. For teachers, links existing teacher row (school+email case-insensitive, user_id NULL) if any.';

-- 2) handle_new_user: teacher branch – match existing teacher by LOWER(email)
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
        UPDATE public.teachers
        SET user_id = NEW.id,
            name = COALESCE(NEW.raw_user_meta_data ->> 'full_name', name)
        WHERE id = (
          SELECT id FROM public.teachers
          WHERE school_id = invitation_record.school_id
            AND LOWER(TRIM(email)) = LOWER(TRIM(NEW.email))
            AND user_id IS NULL
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

-- 3) Data fix: merge duplicate teachers (same school_id, same email case-insensitive)
--    Keep one row per (school_id, lower(email)): prefer row with user_id set, else first by id.
--    Point students, groups, lessons, package_purchases, payments to the kept row; delete duplicates.
DO $$
DECLARE
  dup RECORD;
  keep_id UUID;
  drop_id UUID;
  student_count_keep BIGINT;
  student_count_drop BIGINT;
BEGIN
  FOR dup IN
    SELECT school_id, LOWER(TRIM(email)) AS email_key, array_agg(id ORDER BY (user_id IS NOT NULL) DESC, id) AS ids
    FROM public.teachers
    WHERE email IS NOT NULL AND TRIM(email) != ''
    GROUP BY school_id, LOWER(TRIM(email))
    HAVING count(*) > 1
  LOOP
    keep_id := dup.ids[1];
    FOR i IN 2 .. array_length(dup.ids, 1) LOOP
      drop_id := dup.ids[i];
      UPDATE public.students   SET teacher_id = keep_id WHERE teacher_id = drop_id;
      UPDATE public.groups     SET teacher_id = keep_id WHERE teacher_id = drop_id;
      UPDATE public.lessons    SET teacher_id = keep_id WHERE teacher_id = drop_id;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'package_purchases' AND column_name = 'teacher_id') THEN
        UPDATE public.package_purchases SET teacher_id = keep_id WHERE teacher_id = drop_id;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'teacher_id') THEN
        UPDATE public.payments SET teacher_id = keep_id WHERE teacher_id = drop_id;
      END IF;
      DELETE FROM public.teachers WHERE id = drop_id;
    END LOOP;
  END LOOP;
END;
$$;

-- 4) Prevent future duplicates: unique on (school_id, lower(email))
CREATE UNIQUE INDEX IF NOT EXISTS teachers_school_email_unique
  ON public.teachers (school_id, LOWER(TRIM(email)))
  WHERE email IS NOT NULL AND TRIM(email) != '';

COMMENT ON INDEX public.teachers_school_email_unique IS
  'One teacher per email per school; case-insensitive.';
