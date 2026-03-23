-- Allow managers to manage lesson attendance records in their school.
-- This is required for deleting students/teachers with related attendance.
CREATE POLICY "Managers can manage attendance"
ON public.lesson_attendance
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.lessons l
    WHERE l.id = lesson_id
      AND l.school_id = get_user_school_id(auth.uid())
      AND has_role(auth.uid(), 'manager'::app_role)
  )
);
