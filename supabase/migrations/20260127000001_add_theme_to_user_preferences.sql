-- Add theme column to user_preferences table
ALTER TABLE public.user_preferences 
ADD COLUMN theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark'));

-- Add comment to column
COMMENT ON COLUMN public.user_preferences.theme IS 'User preferred theme: light or dark';
