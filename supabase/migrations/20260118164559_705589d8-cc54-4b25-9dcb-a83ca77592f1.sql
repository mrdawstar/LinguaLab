-- Add Instagram and meeting_link fields to teachers table
ALTER TABLE public.teachers 
ADD COLUMN IF NOT EXISTS instagram text,
ADD COLUMN IF NOT EXISTS meeting_link text;

-- Add Instagram field to students table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS instagram text;

-- Make teacher_id required for students (update existing nulls first)
-- Note: We cannot set NOT NULL if there are existing NULL values, so we'll handle this in the application layer
-- But we can add a comment to document the requirement
COMMENT ON COLUMN public.students.teacher_id IS 'Required: Every student must be assigned to a teacher';