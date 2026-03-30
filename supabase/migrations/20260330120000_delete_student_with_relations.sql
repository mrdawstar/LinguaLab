-- Delete student together with dependent records in a single SECURITY DEFINER transaction.
-- This avoids RLS/cascade issues for managers when a student has related data (attendance, lessons, payments, packages).
CREATE OR REPLACE FUNCTION public.delete_student_with_relations(p_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_id uuid;
BEGIN
  SELECT school_id
  INTO v_school_id
  FROM public.students
  WHERE id = p_student_id;

  IF v_school_id IS NULL THEN
    RETURN;
  END IF;

  IF v_school_id <> public.get_user_school_id(auth.uid()) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  -- Attendance and lessons
  DELETE FROM public.lesson_attendance WHERE student_id = p_student_id;
  DELETE FROM public.lessons WHERE student_id = p_student_id;

  -- Financials
  DELETE FROM public.payments WHERE student_id = p_student_id;
  DELETE FROM public.package_purchases WHERE student_id = p_student_id;

  -- Finally, the student
  DELETE FROM public.students WHERE id = p_student_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_student_with_relations(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_student_with_relations(uuid) TO authenticated;

