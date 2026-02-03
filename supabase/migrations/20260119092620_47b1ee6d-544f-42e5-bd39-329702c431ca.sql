-- Add comment column to lesson_attendance table
ALTER TABLE public.lesson_attendance 
ADD COLUMN comment TEXT;

-- Add comment for the column
COMMENT ON COLUMN public.lesson_attendance.comment IS 'Optional comment from teacher about attendance';