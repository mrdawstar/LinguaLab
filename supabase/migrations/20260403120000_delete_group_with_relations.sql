-- Delete group together with group lessons and attendance in one SECURITY DEFINER transaction.
-- Avoids RLS failures on CASCADE deletes (lessons, lesson_attendance) for admins/managers.
CREATE OR REPLACE FUNCTION public.delete_group_with_relations(p_group_id uuid)
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
  FROM public.groups
  WHERE id = p_group_id;

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

  DELETE FROM public.lesson_attendance
  WHERE lesson_id IN (
    SELECT id FROM public.lessons WHERE group_id = p_group_id
  );

  DELETE FROM public.lessons WHERE group_id = p_group_id;

  UPDATE public.students
  SET group_id = NULL
  WHERE group_id = p_group_id;

  DELETE FROM public.groups WHERE id = p_group_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_group_with_relations(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_group_with_relations(uuid) TO authenticated;
