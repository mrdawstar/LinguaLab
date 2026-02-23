-- Fix: Allow deleting a teacher when students reference them.
-- Set students.teacher_id to NULL when the teacher is deleted (ON DELETE SET NULL).
-- The initial migration already defined ON DELETE SET NULL; this ensures the live DB has it.

ALTER TABLE public.students
  DROP CONSTRAINT IF EXISTS students_teacher_id_fkey;

ALTER TABLE public.students
  ADD CONSTRAINT students_teacher_id_fkey
  FOREIGN KEY (teacher_id)
  REFERENCES public.teachers(id)
  ON DELETE SET NULL;
