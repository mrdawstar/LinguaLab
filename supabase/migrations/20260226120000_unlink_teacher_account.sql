-- Odłączenie konta użytkownika od nauczyciela (admin/manager).
-- Po odłączeniu: rekord nauczyciela zostaje (user_id = null), użytkownik traci dostęp do szkoły i rolę teacher.
-- Nauczyciel pojawi się znowu w zaproszeniach jako "bez konta" i można go ponownie zaprosić.
CREATE OR REPLACE FUNCTION public.unlink_teacher_account(p_teacher_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teacher RECORD;
  v_caller_school_id UUID;
BEGIN
  v_caller_school_id := get_user_school_id(auth.uid());
  IF v_caller_school_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')) THEN
    RAISE EXCEPTION 'Forbidden - admin or manager only';
  END IF;

  SELECT id, user_id, school_id INTO v_teacher
  FROM public.teachers
  WHERE id = p_teacher_id AND school_id = v_caller_school_id;

  IF v_teacher.id IS NULL THEN
    RAISE EXCEPTION 'Teacher not found or not in your school';
  END IF;

  IF v_teacher.user_id IS NULL THEN
    RETURN TRUE;
  END IF;

  UPDATE public.teachers SET user_id = NULL WHERE id = p_teacher_id;

  UPDATE public.profiles
  SET school_id = NULL
  WHERE id = v_teacher.user_id AND school_id = v_teacher.school_id;

  DELETE FROM public.user_roles
  WHERE user_id = v_teacher.user_id AND role = 'teacher';

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unlink_teacher_account(UUID) TO authenticated;

COMMENT ON FUNCTION public.unlink_teacher_account(UUID) IS
  'Unlinks the user account from a teacher. Teacher row stays (user_id=null); user loses school and teacher role. Admin/manager only.';
