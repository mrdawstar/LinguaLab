-- Create invitations table for managers and teachers
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.app_role NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(school_id, email, role)
);

-- Enable RLS on invitations
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Policies for invitations
CREATE POLICY "Admins can manage all invitations"
ON public.invitations
FOR ALL
USING (
  school_id = get_user_school_id(auth.uid()) 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Managers can create teacher invitations"
ON public.invitations
FOR INSERT
WITH CHECK (
  school_id = get_user_school_id(auth.uid()) 
  AND has_role(auth.uid(), 'manager'::app_role)
  AND role = 'teacher'::app_role
);

CREATE POLICY "Managers can view invitations in their school"
ON public.invitations
FOR SELECT
USING (
  school_id = get_user_school_id(auth.uid()) 
  AND has_role(auth.uid(), 'manager'::app_role)
);

-- Update RLS policies for students to allow manager CRUD
DROP POLICY IF EXISTS "Admins can insert students" ON public.students;
DROP POLICY IF EXISTS "Admins can update students" ON public.students;
DROP POLICY IF EXISTS "Admins can delete students" ON public.students;

CREATE POLICY "Admins and managers can insert students"
ON public.students
FOR INSERT
WITH CHECK (
  school_id = get_user_school_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Admins and managers can update students"
ON public.students
FOR UPDATE
USING (
  school_id = get_user_school_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Admins and managers can delete students"
ON public.students
FOR DELETE
USING (
  school_id = get_user_school_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

-- Update RLS for groups - manager can also manage
DROP POLICY IF EXISTS "Admins can insert groups" ON public.groups;
DROP POLICY IF EXISTS "Admins can update groups" ON public.groups;
DROP POLICY IF EXISTS "Admins can delete groups" ON public.groups;

CREATE POLICY "Admins and managers can insert groups"
ON public.groups
FOR INSERT
WITH CHECK (
  school_id = get_user_school_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Admins and managers can update groups"
ON public.groups
FOR UPDATE
USING (
  school_id = get_user_school_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Admins and managers can delete groups"
ON public.groups
FOR DELETE
USING (
  school_id = get_user_school_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

-- Update RLS for lessons - manager can insert and delete
DROP POLICY IF EXISTS "Admins can insert lessons" ON public.lessons;
DROP POLICY IF EXISTS "Admins can delete lessons" ON public.lessons;

CREATE POLICY "Admins and managers can insert lessons"
ON public.lessons
FOR INSERT
WITH CHECK (
  school_id = get_user_school_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Admins and managers can delete lessons"
ON public.lessons
FOR DELETE
USING (
  school_id = get_user_school_id(auth.uid()) 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

-- Create package_purchases table to track package sales
CREATE TABLE IF NOT EXISTS public.package_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  hours_purchased INTEGER NOT NULL,
  total_amount NUMERIC NOT NULL,
  price_per_hour NUMERIC GENERATED ALWAYS AS (total_amount / hours_purchased) STORED,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on package_purchases
ALTER TABLE public.package_purchases ENABLE ROW LEVEL SECURITY;

-- Policies for package_purchases - admins see all, managers can see but not amounts
CREATE POLICY "Admins can manage package purchases"
ON public.package_purchases
FOR ALL
USING (
  school_id = get_user_school_id(auth.uid()) 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Managers can view package purchases"
ON public.package_purchases
FOR SELECT
USING (
  school_id = get_user_school_id(auth.uid()) 
  AND has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Managers can insert package purchases"
ON public.package_purchases
FOR INSERT
WITH CHECK (
  school_id = get_user_school_id(auth.uid()) 
  AND has_role(auth.uid(), 'manager'::app_role)
);

-- Create lesson_attendance table to track completed lessons for revenue
CREATE TABLE IF NOT EXISTS public.lesson_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  package_purchase_id UUID REFERENCES public.package_purchases(id) ON DELETE SET NULL,
  attended BOOLEAN NOT NULL DEFAULT true,
  revenue_amount NUMERIC, -- calculated based on package price_per_hour
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lesson_id, student_id)
);

-- Enable RLS on lesson_attendance
ALTER TABLE public.lesson_attendance ENABLE ROW LEVEL SECURITY;

-- Policies for lesson_attendance
CREATE POLICY "School members can view attendance"
ON public.lesson_attendance
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lessons l 
    WHERE l.id = lesson_id 
    AND l.school_id = get_user_school_id(auth.uid())
  )
);

CREATE POLICY "Admins and teachers can manage attendance"
ON public.lesson_attendance
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.lessons l 
    WHERE l.id = lesson_id 
    AND l.school_id = get_user_school_id(auth.uid())
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
  )
);

-- Function to handle user signup with invitation
CREATE OR REPLACE FUNCTION public.handle_invitation_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_record RECORD;
BEGIN
  -- Check if there's a pending invitation for this email
  SELECT * INTO invitation_record
  FROM public.invitations
  WHERE email = NEW.email
    AND accepted_at IS NULL
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF FOUND THEN
    -- Update profile with school_id from invitation
    UPDATE public.profiles
    SET school_id = invitation_record.school_id
    WHERE id = NEW.id;
    
    -- Assign the role from invitation
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, invitation_record.role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- If teacher role, create teacher record
    IF invitation_record.role = 'teacher' THEN
      INSERT INTO public.teachers (school_id, email, name, user_id)
      VALUES (
        invitation_record.school_id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.id
      );
    END IF;
    
    -- Mark invitation as accepted
    UPDATE public.invitations
    SET accepted_at = now()
    WHERE id = invitation_record.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run after handle_new_user
DROP TRIGGER IF EXISTS on_auth_user_created_invitation ON auth.users;
CREATE TRIGGER on_auth_user_created_invitation
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_invitation_signup();

-- Function to deduct hours when lesson is completed
CREATE OR REPLACE FUNCTION public.deduct_package_hours()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lesson_record RECORD;
  lesson_duration_hours NUMERIC;
BEGIN
  -- Only trigger when lesson is marked as completed
  IF NEW.is_completed = true AND (OLD.is_completed = false OR OLD.is_completed IS NULL) THEN
    -- Get lesson details
    SELECT * INTO lesson_record FROM public.lessons WHERE id = NEW.id;
    
    -- Calculate lesson duration in hours
    lesson_duration_hours := EXTRACT(EPOCH FROM (
      (lesson_record.date || ' ' || lesson_record.end_time)::timestamp - 
      (lesson_record.date || ' ' || lesson_record.start_time)::timestamp
    )) / 3600;
    
    -- If individual lesson
    IF lesson_record.student_id IS NOT NULL THEN
      UPDATE public.students
      SET package_used_hours = COALESCE(package_used_hours, 0) + CEIL(lesson_duration_hours)
      WHERE id = lesson_record.student_id;
    END IF;
    
    -- If group lesson, update all students in the group
    IF lesson_record.group_id IS NOT NULL THEN
      UPDATE public.students
      SET package_used_hours = COALESCE(package_used_hours, 0) + CEIL(lesson_duration_hours)
      WHERE group_id = lesson_record.group_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for package hour deduction
DROP TRIGGER IF EXISTS on_lesson_completed ON public.lessons;
CREATE TRIGGER on_lesson_completed
AFTER UPDATE ON public.lessons
FOR EACH ROW
EXECUTE FUNCTION public.deduct_package_hours();

-- Add updated_at triggers
CREATE TRIGGER update_invitations_updated_at
BEFORE UPDATE ON public.invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_package_purchases_updated_at
BEFORE UPDATE ON public.package_purchases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lesson_attendance_updated_at
BEFORE UPDATE ON public.lesson_attendance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();