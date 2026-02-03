-- Add DELETE policy for teachers to delete their own lessons
CREATE POLICY "Teachers can delete their own lessons"
ON public.lessons
FOR DELETE
USING (
  school_id = get_user_school_id(auth.uid())
  AND has_role(auth.uid(), 'teacher'::app_role)
  AND teacher_id IN (
    SELECT id FROM teachers WHERE user_id = auth.uid()
  )
);