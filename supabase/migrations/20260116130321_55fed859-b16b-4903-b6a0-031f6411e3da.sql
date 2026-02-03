-- Create enum for user roles (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'teacher');
    END IF;
END $$;

-- Create schools table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  primary_color TEXT DEFAULT '#1457ff',
  secondary_color TEXT DEFAULT '#2c8bff',
  accent_color TEXT DEFAULT '#60a5fa',
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create profiles table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table (for RBAC) (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create teachers table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  languages TEXT[] DEFAULT '{}',
  calendar_color TEXT DEFAULT '#1457ff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create groups table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  language TEXT NOT NULL,
  level TEXT NOT NULL,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  price_per_hour DECIMAL(10,2) DEFAULT 0,
  max_students INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create students table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  language TEXT NOT NULL,
  level TEXT NOT NULL,
  price_per_hour DECIMAL(10,2) DEFAULT 0,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active',
  package_hours INTEGER DEFAULT 0,
  package_used_hours INTEGER DEFAULT 0,
  package_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create lessons table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  notes TEXT,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create payments table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_date DATE,
  due_date DATE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create school_settings table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.school_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL UNIQUE,
  currency TEXT DEFAULT 'PLN',
  timezone TEXT DEFAULT 'Europe/Warsaw',
  lesson_duration_minutes INTEGER DEFAULT 60,
  default_price_per_hour DECIMAL(10,2) DEFAULT 100,
  email_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user's school_id
CREATE OR REPLACE FUNCTION public.get_user_school_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id FROM public.profiles WHERE id = _user_id
$$;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_school_id UUID;
  school_name TEXT;
BEGIN
  -- Get school name from metadata
  school_name := NEW.raw_user_meta_data ->> 'school_name';
  
  -- Create new school if school_name provided (admin signup)
  IF school_name IS NOT NULL AND school_name != '' THEN
    INSERT INTO public.schools (name)
    VALUES (school_name)
    RETURNING id INTO new_school_id;
    
    -- Create profile
    INSERT INTO public.profiles (id, email, full_name, school_id)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name', new_school_id);
    
    -- Assign admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
    
    -- Create default school settings
    INSERT INTO public.school_settings (school_id)
    VALUES (new_school_id);
  ELSE
    -- Teacher signup - no school created
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user (drop if exists first)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for schools
DROP POLICY IF EXISTS "Users can view their own school" ON public.schools;
CREATE POLICY "Users can view their own school"
  ON public.schools FOR SELECT
  USING (id = public.get_user_school_id(auth.uid()));

DROP POLICY IF EXISTS "Admins can update their school" ON public.schools;
CREATE POLICY "Admins can update their school"
  ON public.schools FOR UPDATE
  USING (id = public.get_user_school_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
DROP POLICY IF EXISTS "Users can view profiles in their school" ON public.profiles;
CREATE POLICY "Users can view profiles in their school"
  ON public.profiles FOR SELECT
  USING (school_id = public.get_user_school_id(auth.uid()) OR id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- RLS Policies for user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

-- RLS Policies for teachers
DROP POLICY IF EXISTS "Users can view teachers in their school" ON public.teachers;
CREATE POLICY "Users can view teachers in their school"
  ON public.teachers FOR SELECT
  USING (school_id = public.get_user_school_id(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert teachers" ON public.teachers;
CREATE POLICY "Admins can insert teachers"
  ON public.teachers FOR INSERT
  WITH CHECK (school_id = public.get_user_school_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update teachers" ON public.teachers;
CREATE POLICY "Admins can update teachers"
  ON public.teachers FOR UPDATE
  USING (school_id = public.get_user_school_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete teachers" ON public.teachers;
CREATE POLICY "Admins can delete teachers"
  ON public.teachers FOR DELETE
  USING (school_id = public.get_user_school_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- RLS Policies for groups
DROP POLICY IF EXISTS "Users can view groups in their school" ON public.groups;
CREATE POLICY "Users can view groups in their school"
  ON public.groups FOR SELECT
  USING (school_id = public.get_user_school_id(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert groups" ON public.groups;
CREATE POLICY "Admins can insert groups"
  ON public.groups FOR INSERT
  WITH CHECK (school_id = public.get_user_school_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update groups" ON public.groups;
CREATE POLICY "Admins can update groups"
  ON public.groups FOR UPDATE
  USING (school_id = public.get_user_school_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete groups" ON public.groups;
CREATE POLICY "Admins can delete groups"
  ON public.groups FOR DELETE
  USING (school_id = public.get_user_school_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- RLS Policies for students
DROP POLICY IF EXISTS "Users can view students in their school" ON public.students;
CREATE POLICY "Users can view students in their school"
  ON public.students FOR SELECT
  USING (school_id = public.get_user_school_id(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert students" ON public.students;
CREATE POLICY "Admins can insert students"
  ON public.students FOR INSERT
  WITH CHECK (school_id = public.get_user_school_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update students" ON public.students;
CREATE POLICY "Admins can update students"
  ON public.students FOR UPDATE
  USING (school_id = public.get_user_school_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete students" ON public.students;
CREATE POLICY "Admins can delete students"
  ON public.students FOR DELETE
  USING (school_id = public.get_user_school_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- RLS Policies for lessons
CREATE POLICY "Users can view lessons in their school"
  ON public.lessons FOR SELECT
  USING (school_id = public.get_user_school_id(auth.uid()));

CREATE POLICY "Admins can insert lessons"
  ON public.lessons FOR INSERT
  WITH CHECK (school_id = public.get_user_school_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins and teachers can update lessons"
  ON public.lessons FOR UPDATE
  USING (school_id = public.get_user_school_id(auth.uid()));

CREATE POLICY "Admins can delete lessons"
  ON public.lessons FOR DELETE
  USING (school_id = public.get_user_school_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- Teachers can also insert their own lessons
CREATE POLICY "Teachers can insert their own lessons"
  ON public.lessons FOR INSERT
  WITH CHECK (
    school_id = public.get_user_school_id(auth.uid()) 
    AND public.has_role(auth.uid(), 'teacher')
    AND teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())
  );

-- RLS Policies for payments (only admins)
CREATE POLICY "Admins can view payments"
  ON public.payments FOR SELECT
  USING (school_id = public.get_user_school_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert payments"
  ON public.payments FOR INSERT
  WITH CHECK (school_id = public.get_user_school_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update payments"
  ON public.payments FOR UPDATE
  USING (school_id = public.get_user_school_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete payments"
  ON public.payments FOR DELETE
  USING (school_id = public.get_user_school_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- RLS Policies for school_settings
CREATE POLICY "Users can view their school settings"
  ON public.school_settings FOR SELECT
  USING (school_id = public.get_user_school_id(auth.uid()));

CREATE POLICY "Admins can update school settings"
  ON public.school_settings FOR UPDATE
  USING (school_id = public.get_user_school_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to all tables (drop if exists first)
DROP TRIGGER IF EXISTS update_schools_updated_at ON public.schools;
CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON public.schools FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_teachers_updated_at ON public.teachers;
CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON public.teachers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_groups_updated_at ON public.groups;
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON public.groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_students_updated_at ON public.students;
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_lessons_updated_at ON public.lessons;
CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_school_settings_updated_at ON public.school_settings;
CREATE TRIGGER update_school_settings_updated_at BEFORE UPDATE ON public.school_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();