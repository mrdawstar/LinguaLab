-- =====================================================
-- LINGUALAB - KOMPLETNY SKRYPT MIGRACJI DO SUPABASE
-- =====================================================
-- Uruchom ten skrypt w SQL Editor w swoim nowym projekcie Supabase
-- Kolejność jest ważna - najpierw schematy, potem dane

-- =====================================================
-- CZĘŚĆ 1: TYPY ENUM
-- =====================================================

CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'manager');

-- =====================================================
-- CZĘŚĆ 2: TWORZENIE TABEL
-- =====================================================

-- Tabela: schools
CREATE TABLE public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#1457ff',
  secondary_color TEXT DEFAULT '#2c8bff',
  accent_color TEXT DEFAULT '#60a5fa',
  stripe_customer_id TEXT,
  subscription_status TEXT DEFAULT 'trial',
  subscription_plan TEXT,
  subscription_ends_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela: profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  school_id UUID REFERENCES public.schools(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela: user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL
);

-- Tabela: user_preferences
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  primary_color TEXT DEFAULT '#3b82f6',
  secondary_color TEXT DEFAULT '#60a5fa',
  accent_color TEXT DEFAULT '#93c5fd',
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela: school_settings
CREATE TABLE public.school_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL UNIQUE REFERENCES public.schools(id),
  lesson_duration_minutes INTEGER DEFAULT 60,
  default_price_per_hour NUMERIC DEFAULT 100,
  currency TEXT DEFAULT 'PLN',
  timezone TEXT DEFAULT 'Europe/Warsaw',
  email_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela: teachers
CREATE TABLE public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id),
  user_id UUID,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  instagram TEXT,
  meeting_link TEXT,
  calendar_color TEXT DEFAULT '#1457ff',
  languages TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela: groups
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id),
  teacher_id UUID REFERENCES public.teachers(id),
  name TEXT NOT NULL,
  language TEXT NOT NULL,
  level TEXT NOT NULL,
  price_per_hour NUMERIC DEFAULT 0,
  max_students INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela: students
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id),
  teacher_id UUID REFERENCES public.teachers(id),
  group_id UUID REFERENCES public.groups(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  instagram TEXT,
  language TEXT NOT NULL,
  level TEXT NOT NULL,
  price_per_hour NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  payment_status TEXT DEFAULT 'no_payment',
  package_hours INTEGER DEFAULT 0,
  package_used_hours INTEGER DEFAULT 0,
  package_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela: lessons
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id),
  teacher_id UUID NOT NULL REFERENCES public.teachers(id),
  student_id UUID REFERENCES public.students(id),
  group_id UUID REFERENCES public.groups(id),
  title TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  notes TEXT,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela: package_purchases
CREATE TABLE public.package_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id),
  student_id UUID NOT NULL REFERENCES public.students(id),
  teacher_id UUID,
  created_by UUID,
  hours_purchased INTEGER NOT NULL,
  lessons_total INTEGER,
  lessons_used INTEGER DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  price_per_hour NUMERIC,
  price_per_lesson NUMERIC,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela: lesson_attendance
CREATE TABLE public.lesson_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id),
  student_id UUID NOT NULL REFERENCES public.students(id),
  package_purchase_id UUID REFERENCES public.package_purchases(id),
  attended BOOLEAN NOT NULL DEFAULT true,
  comment TEXT,
  revenue_amount NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela: payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id),
  student_id UUID NOT NULL REFERENCES public.students(id),
  teacher_id UUID,
  package_purchase_id UUID REFERENCES public.package_purchases(id),
  created_by UUID,
  amount NUMERIC NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_type TEXT DEFAULT 'single',
  package_lessons INTEGER,
  payment_date DATE,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela: invitations
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id),
  invited_by UUID NOT NULL,
  email TEXT NOT NULL,
  role app_role NOT NULL,
  token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- CZĘŚĆ 3: FUNKCJE POMOCNICZE
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_user_school_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT school_id FROM public.profiles WHERE id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_invitation_by_token(_token TEXT)
RETURNS TABLE(id UUID, email TEXT, role app_role, school_id UUID, token TEXT, expires_at TIMESTAMPTZ)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT i.id, i.email, i.role, i.school_id, i.token, i.expires_at
  FROM public.invitations i
  WHERE i.token = _token
    AND i.accepted_at IS NULL
    AND i.expires_at > NOW()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_student_payment_status(_student_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_remaining_lessons INTEGER;
  v_new_status TEXT;
BEGIN
  SELECT COALESCE(SUM(lessons_total - lessons_used), 0)
  INTO v_remaining_lessons
  FROM public.package_purchases
  WHERE student_id = _student_id
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > NOW());
  
  IF v_remaining_lessons = 0 THEN
    v_new_status := 'no_payment';
  ELSIF v_remaining_lessons <= 1 THEN
    v_new_status := 'warning';
  ELSE
    v_new_status := 'active';
  END IF;
  
  UPDATE public.students
  SET payment_status = v_new_status
  WHERE id = _student_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_attendance_deduction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_student_id UUID;
  v_active_package RECORD;
  v_price_per_lesson NUMERIC;
BEGIN
  IF NEW.attended = true AND (OLD.attended IS NULL OR OLD.attended = false) THEN
    v_student_id := NEW.student_id;
    
    SELECT * INTO v_active_package
    FROM public.package_purchases
    WHERE student_id = v_student_id
      AND status = 'active'
      AND lessons_used < lessons_total
      AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY purchase_date ASC, created_at ASC
    LIMIT 1;
    
    IF v_active_package.id IS NOT NULL THEN
      v_price_per_lesson := v_active_package.total_amount / v_active_package.lessons_total;
      
      UPDATE public.package_purchases
      SET lessons_used = lessons_used + 1
      WHERE id = v_active_package.id;
      
      NEW.package_purchase_id := v_active_package.id;
      NEW.revenue_amount := v_price_per_lesson;
    END IF;
    
    PERFORM public.update_student_payment_status(v_student_id);
  END IF;
  
  IF NEW.attended = false AND OLD.attended = true AND OLD.package_purchase_id IS NOT NULL THEN
    UPDATE public.package_purchases
    SET lessons_used = GREATEST(0, lessons_used - 1)
    WHERE id = OLD.package_purchase_id;
    
    NEW.package_purchase_id := NULL;
    NEW.revenue_amount := NULL;
    
    PERFORM public.update_student_payment_status(NEW.student_id);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_package_purchase_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM public.update_student_payment_status(NEW.student_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.update_student_payment_status(OLD.student_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_package_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.package_purchases
  SET status = CASE 
    WHEN lessons_used >= lessons_total THEN 'exhausted'
    WHEN expires_at IS NOT NULL AND expires_at < NOW() THEN 'expired'
    ELSE 'active'
  END
  WHERE id = NEW.id OR id = OLD.id;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_school_id UUID;
  school_name TEXT;
  invitation_token TEXT;
  invitation_record RECORD;
BEGIN
  school_name := NEW.raw_user_meta_data ->> 'school_name';
  invitation_token := NEW.raw_user_meta_data ->> 'invitation_token';
  
  IF invitation_token IS NOT NULL THEN
    SELECT * INTO invitation_record
    FROM public.invitations
    WHERE token = invitation_token
      AND accepted_at IS NULL
      AND expires_at > NOW();
    
    IF invitation_record.id IS NOT NULL THEN
      INSERT INTO public.profiles (id, email, full_name, school_id)
      VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
        invitation_record.school_id
      );
      
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, invitation_record.role);
      
      IF invitation_record.role = 'teacher' THEN
        INSERT INTO public.teachers (name, email, school_id, user_id)
        VALUES (
          COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
          NEW.email,
          invitation_record.school_id,
          NEW.id
        );
      END IF;
      
      UPDATE public.invitations
      SET accepted_at = NOW()
      WHERE id = invitation_record.id;
      
      RETURN NEW;
    END IF;
  END IF;
  
  IF school_name IS NOT NULL AND school_name != '' THEN
    INSERT INTO public.schools (name)
    VALUES (school_name)
    RETURNING id INTO new_school_id;
    
    INSERT INTO public.profiles (id, email, full_name, school_id)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name', new_school_id);
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
    
    INSERT INTO public.school_settings (school_id)
    VALUES (new_school_id);
  ELSE
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  END IF;
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- CZĘŚĆ 4: TRIGGERY
-- =====================================================

-- Trigger na auth.users (uruchom osobno w SQL Editor)
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Triggery updated_at
CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON public.schools FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON public.teachers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON public.groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_package_purchases_updated_at BEFORE UPDATE ON public.package_purchases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invitations_updated_at BEFORE UPDATE ON public.invitations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_school_settings_updated_at BEFORE UPDATE ON public.school_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- CZĘŚĆ 5: ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Włącz RLS na wszystkich tabelach
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Polityki dla schools
CREATE POLICY "Users can view their own school" ON public.schools FOR SELECT USING (id = get_user_school_id(auth.uid()));
CREATE POLICY "Managers can view their own school" ON public.schools FOR SELECT USING (id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins can update their school" ON public.schools FOR UPDATE USING (id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- Polityki dla profiles
CREATE POLICY "Users can view profiles in their school" ON public.profiles FOR SELECT USING (school_id = get_user_school_id(auth.uid()) OR id = auth.uid());
CREATE POLICY "Managers can view profiles in their school" ON public.profiles FOR SELECT USING (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'manager'));
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());

-- Polityki dla user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid());

-- Polityki dla user_preferences
CREATE POLICY "Users can view their own preferences" ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own preferences" ON public.user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own preferences" ON public.user_preferences FOR UPDATE USING (auth.uid() = user_id);

-- Polityki dla school_settings
CREATE POLICY "Users can view their school settings" ON public.school_settings FOR SELECT USING (school_id = get_user_school_id(auth.uid()));
CREATE POLICY "Managers can view their school settings" ON public.school_settings FOR SELECT USING (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins can update school settings" ON public.school_settings FOR UPDATE USING (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- Polityki dla teachers
CREATE POLICY "Users can view teachers in their school" ON public.teachers FOR SELECT USING (school_id = get_user_school_id(auth.uid()));
CREATE POLICY "Managers can view teachers in their school" ON public.teachers FOR SELECT USING (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins can insert teachers" ON public.teachers FOR INSERT WITH CHECK (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Managers can insert teachers" ON public.teachers FOR INSERT WITH CHECK (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins can update teachers" ON public.teachers FOR UPDATE USING (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Managers can update teachers" ON public.teachers FOR UPDATE USING (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins can delete teachers" ON public.teachers FOR DELETE USING (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Managers can delete teachers" ON public.teachers FOR DELETE USING (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'manager'));

-- Polityki dla groups
CREATE POLICY "Admins can view all groups in their school" ON public.groups FOR SELECT USING (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Managers can view all groups in their school" ON public.groups FOR SELECT USING (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'manager'));
CREATE POLICY "Teachers can view only their assigned groups" ON public.groups FOR SELECT USING (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'teacher') AND teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()));
CREATE POLICY "Admins and managers can insert groups" ON public.groups FOR INSERT WITH CHECK (school_id = get_user_school_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')));
CREATE POLICY "Admins and managers can update groups" ON public.groups FOR UPDATE USING (school_id = get_user_school_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')));
CREATE POLICY "Admins and managers can delete groups" ON public.groups FOR DELETE USING (school_id = get_user_school_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')));

-- Polityki dla students
CREATE POLICY "Admins can view all students in their school" ON public.students FOR SELECT USING (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Managers can view all students in their school" ON public.students FOR SELECT USING (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'manager'));
CREATE POLICY "Teachers can view only their assigned students" ON public.students FOR SELECT USING (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'teacher') AND teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()));
CREATE POLICY "Teachers can view students in their groups" ON public.students FOR SELECT USING (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'teacher') AND group_id IN (SELECT id FROM groups WHERE teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())));
CREATE POLICY "Admins and managers can insert students" ON public.students FOR INSERT WITH CHECK (school_id = get_user_school_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')));
CREATE POLICY "Admins and managers can update students" ON public.students FOR UPDATE USING (school_id = get_user_school_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')));
CREATE POLICY "Admins and managers can delete students" ON public.students FOR DELETE USING (school_id = get_user_school_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')));

-- Polityki dla lessons
CREATE POLICY "Admins can view all lessons in their school" ON public.lessons FOR SELECT USING (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Managers can view all lessons in their school" ON public.lessons FOR SELECT USING (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'manager'));
CREATE POLICY "Teachers can view only their lessons" ON public.lessons FOR SELECT USING (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'teacher') AND teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()));
CREATE POLICY "Admins and managers can insert lessons" ON public.lessons FOR INSERT WITH CHECK (school_id = get_user_school_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')));
CREATE POLICY "Teachers can insert their own lessons" ON public.lessons FOR INSERT WITH CHECK (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'teacher') AND teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()));
CREATE POLICY "Admins and teachers can update lessons" ON public.lessons FOR UPDATE USING (school_id = get_user_school_id(auth.uid()));
CREATE POLICY "Admins and managers can delete lessons" ON public.lessons FOR DELETE USING (school_id = get_user_school_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')));
CREATE POLICY "Teachers can delete their own lessons" ON public.lessons FOR DELETE USING (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'teacher') AND teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()));

-- Polityki dla package_purchases
CREATE POLICY "Admins can manage package purchases" ON public.package_purchases FOR ALL USING (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Managers can view package purchases" ON public.package_purchases FOR SELECT USING (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'manager'));
CREATE POLICY "Managers can insert package purchases" ON public.package_purchases FOR INSERT WITH CHECK (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'manager'));
CREATE POLICY "Managers can update package purchases" ON public.package_purchases FOR UPDATE USING (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'manager'));
CREATE POLICY "Managers can delete package purchases" ON public.package_purchases FOR DELETE USING (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'manager'));

-- Polityki dla lesson_attendance
CREATE POLICY "School members can view attendance" ON public.lesson_attendance FOR SELECT USING (EXISTS (SELECT 1 FROM lessons l WHERE l.id = lesson_attendance.lesson_id AND l.school_id = get_user_school_id(auth.uid())));
CREATE POLICY "Admins and teachers can manage attendance" ON public.lesson_attendance FOR ALL USING (EXISTS (SELECT 1 FROM lessons l WHERE l.id = lesson_attendance.lesson_id AND l.school_id = get_user_school_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher'))));

-- Polityki dla payments
CREATE POLICY "Admins and managers can view payments" ON public.payments FOR SELECT USING (school_id = get_user_school_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')));
CREATE POLICY "Admins and managers can insert payments" ON public.payments FOR INSERT WITH CHECK (school_id = get_user_school_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')));
CREATE POLICY "Admins and managers can update payments" ON public.payments FOR UPDATE USING (school_id = get_user_school_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')));
CREATE POLICY "Admins and managers can delete payments" ON public.payments FOR DELETE USING (school_id = get_user_school_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')));

-- Polityki dla invitations
CREATE POLICY "Admins can view invitations" ON public.invitations FOR SELECT USING (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Managers can view invitations in their school" ON public.invitations FOR SELECT USING (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins can insert invitations" ON public.invitations FOR INSERT WITH CHECK (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Managers can create teacher invitations" ON public.invitations FOR INSERT WITH CHECK (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'manager') AND role = 'teacher');
CREATE POLICY "Admins can update invitations" ON public.invitations FOR UPDATE USING (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete invitations" ON public.invitations FOR DELETE USING (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- =====================================================
-- CZĘŚĆ 6: DANE - SCHOOLS
-- =====================================================

INSERT INTO public.schools (id, name, primary_color, secondary_color, accent_color, subscription_status, trial_ends_at, created_at, updated_at)
VALUES
  ('8b6e2328-aeca-46cf-80db-e9123c50993d', 'VeronikaWise', '#1457ff', '#2c8bff', '#60a5fa', 'trial', '2026-01-30 13:10:44.188152+00', '2026-01-16 13:10:44.188152+00', '2026-01-19 13:09:34.756975+00'),
  ('928978af-4e4d-44ea-89e5-ff4ae25ac2a2', 'sdf', '#1457ff', '#2c8bff', '#60a5fa', 'trial', '2026-01-31 13:12:38.431451+00', '2026-01-17 13:12:38.431451+00', '2026-01-19 13:09:34.756975+00'),
  ('cf89828f-51d6-439f-8a49-93eb65b6f6cf', 'ad', '#1457ff', '#2c8bff', '#60a5fa', 'trial', '2026-01-31 21:18:32.35188+00', '2026-01-17 21:18:32.35188+00', '2026-01-19 13:09:34.756975+00'),
  ('e7e144f5-8b32-4a74-bcd0-47cfadcbe439', 'Dawstar', '#1457ff', '#2c8bff', '#60a5fa', 'trial', '2026-02-01 12:56:03.726467+00', '2026-01-18 12:56:03.726467+00', '2026-01-19 13:09:34.756975+00'),
  ('5744d05d-fada-4186-9206-f3a556d8ee04', 'Veronika Wise', '#1457ff', '#2c8bff', '#60a5fa', 'trial', '2026-02-01 13:25:51.660964+00', '2026-01-18 13:25:51.660964+00', '2026-01-19 13:09:34.756975+00'),
  ('40ea67b3-2773-48b9-83d4-409814bd41ac', 'Dawstar', '#1457ff', '#2c8bff', '#60a5fa', 'trial', '2026-02-01 13:55:41.205125+00', '2026-01-18 13:55:41.205125+00', '2026-01-19 17:20:54.941269+00'),
  ('f8da6656-68be-4c60-a74a-f37ed4b4f468', 'Veronika Wise - Way to Say', '#1457ff', '#2c8bff', '#60a5fa', 'trial', '2026-02-03 11:56:29.227009+00', '2026-01-20 11:56:29.227009+00', '2026-01-20 11:56:29.227009+00');

-- =====================================================
-- CZĘŚĆ 7: DANE - PROFILES (UWAGA: user_id musi istnieć w auth.users!)
-- =====================================================
-- Te profile są powiązane z użytkownikami w auth.users
-- Musisz najpierw utworzyć użytkowników w Supabase Auth, a potem zaktualizować te ID

-- INSERT INTO public.profiles (id, email, full_name, school_id, created_at, updated_at)
-- VALUES
--   ('38bb888d-be12-425d-96f9-3993435807f4', 'star4pl@gmail.com', 'Dawid', '40ea67b3-2773-48b9-83d4-409814bd41ac', '2026-01-18 13:55:41.205125+00', '2026-01-18 13:55:41.205125+00'),
--   ('c1417bac-f0eb-4863-8422-e77ea6a00bf3', 'saxophonist4world@gmail.com', 'Anna Kowalska', '40ea67b3-2773-48b9-83d4-409814bd41ac', '2026-01-18 15:56:41.198164+00', '2026-01-18 15:56:41.198164+00'),
--   ('5bbb044c-cfce-40d2-8e11-fc3ba9f6806a', 'bizneskonto2009@gmail.com', 'Ola Kowalska', '40ea67b3-2773-48b9-83d4-409814bd41ac', '2026-01-18 16:33:07.314113+00', '2026-01-18 16:33:07.314113+00'),
--   ('0d8c6a33-628b-4041-8326-0b7f2b4e76f8', 'veronikaa.wise@gmail.com', 'Veronika Wise', 'f8da6656-68be-4c60-a74a-f37ed4b4f468', '2026-01-20 11:56:29.227009+00', '2026-01-20 11:56:29.227009+00');

-- =====================================================
-- CZĘŚĆ 8: DANE - SCHOOL_SETTINGS
-- =====================================================

INSERT INTO public.school_settings (id, school_id, currency, default_price_per_hour, email_notifications, lesson_duration_minutes, sms_notifications, timezone, created_at, updated_at)
VALUES
  ('076c1c81-dc65-4acc-9647-66f53c86267e', '8b6e2328-aeca-46cf-80db-e9123c50993d', 'PLN', 100.00, true, 60, false, 'Europe/Warsaw', '2026-01-16 13:10:44.188152+00', '2026-01-16 13:10:44.188152+00'),
  ('49ab094c-b68c-4685-a091-e7fb60ac808e', '928978af-4e4d-44ea-89e5-ff4ae25ac2a2', 'PLN', 100.00, true, 60, false, 'Europe/Warsaw', '2026-01-17 13:12:38.431451+00', '2026-01-17 13:12:38.431451+00'),
  ('6a7e281c-ea28-46bf-91a7-b830bfd220f5', 'cf89828f-51d6-439f-8a49-93eb65b6f6cf', 'PLN', 100.00, true, 60, false, 'Europe/Warsaw', '2026-01-17 21:18:32.35188+00', '2026-01-17 21:18:32.35188+00'),
  ('6a7fc8a5-aa49-4c6a-9071-45e618f2cfb3', 'e7e144f5-8b32-4a74-bcd0-47cfadcbe439', 'PLN', 100.00, true, 60, false, 'Europe/Warsaw', '2026-01-18 12:56:03.726467+00', '2026-01-18 12:56:03.726467+00'),
  ('265791e4-57b0-4314-9e50-d3001f6e9a51', '5744d05d-fada-4186-9206-f3a556d8ee04', 'PLN', 100.00, true, 60, false, 'Europe/Warsaw', '2026-01-18 13:25:51.660964+00', '2026-01-18 13:25:51.660964+00'),
  ('3453f608-9552-4e7f-9169-ffc03aac3f4b', '40ea67b3-2773-48b9-83d4-409814bd41ac', 'PLN', 100.00, true, 60, false, 'Europe/Warsaw', '2026-01-18 13:55:41.205125+00', '2026-01-19 17:20:55.069141+00'),
  ('541e39c8-8352-4d70-b259-da319e98d352', 'f8da6656-68be-4c60-a74a-f37ed4b4f468', 'PLN', 100.00, true, 60, false, 'Europe/Warsaw', '2026-01-20 11:56:29.227009+00', '2026-01-20 11:56:29.227009+00');

-- =====================================================
-- CZĘŚĆ 9: DANE - TEACHERS
-- =====================================================

INSERT INTO public.teachers (id, school_id, user_id, name, email, phone, instagram, meeting_link, calendar_color, languages, created_at, updated_at)
VALUES
  ('0897ea03-db8e-4199-a3fd-f45a16db53ca', '5744d05d-fada-4186-9206-f3a556d8ee04', NULL, 'Dawid', 'erasmusik2024@gmail.com', '987348973', NULL, NULL, '#10b981', ARRAY['Angielski'], '2026-01-18 13:37:28.704239+00', '2026-01-18 13:37:28.704239+00'),
  ('c6946171-3dc6-4821-b256-f531ed4a4856', '40ea67b3-2773-48b9-83d4-409814bd41ac', NULL, 'asdasd', 'asda@gmail.com', '232123345', NULL, NULL, '#84cc16', ARRAY['Rosyjski'], '2026-01-18 13:58:28.219838+00', '2026-01-18 13:58:28.219838+00'),
  ('00903da2-56a0-40bf-92fb-ece5103a247d', '40ea67b3-2773-48b9-83d4-409814bd41ac', 'c1417bac-f0eb-4863-8422-e77ea6a00bf3', 'Anna Kowalska', 'saxophonist4world@gmail.com', NULL, NULL, NULL, '#ec4899', ARRAY['Angielski'], '2026-01-18 15:56:41.198164+00', '2026-01-19 09:27:57.620262+00'),
  ('2447204e-06f7-4cc5-a4b0-b4057eec519d', '40ea67b3-2773-48b9-83d4-409814bd41ac', NULL, 'Veronika Bubnova', 'asdfas@gmail.com', NULL, NULL, 'https://chat.deepseek.com/', '#3b82f6', ARRAY['Angielski'], '2026-01-19 08:49:34.001469+00', '2026-01-19 09:28:02.591456+00');

-- =====================================================
-- CZĘŚĆ 10: DANE - GROUPS
-- =====================================================

INSERT INTO public.groups (id, school_id, teacher_id, name, language, level, price_per_hour, max_students, created_at, updated_at)
VALUES
  ('3d91645e-d955-407b-a4a1-5976821916ec', '40ea67b3-2773-48b9-83d4-409814bd41ac', 'c6946171-3dc6-4821-b256-f531ed4a4856', 'Hiszpanski', 'Hiszpański', 'A2', 50.00, 6, '2026-01-18 15:49:10.680643+00', '2026-01-18 15:49:10.680643+00'),
  ('21ba8c13-d9f7-40e7-9686-23aafe0dbd77', '40ea67b3-2773-48b9-83d4-409814bd41ac', '00903da2-56a0-40bf-92fb-ece5103a247d', 'Matura Rozszerzona', 'Angielski', 'B2', 50.00, 6, '2026-01-19 15:17:40.447282+00', '2026-01-19 15:17:40.447282+00');

-- =====================================================
-- CZĘŚĆ 11: DANE - STUDENTS
-- =====================================================

INSERT INTO public.students (id, school_id, teacher_id, group_id, name, email, phone, instagram, language, level, price_per_hour, status, payment_status, package_hours, package_used_hours, created_at, updated_at)
VALUES
  ('b2002ccc-555f-4b66-9fa8-068c6a75879b', '40ea67b3-2773-48b9-83d4-409814bd41ac', '2447204e-06f7-4cc5-a4b0-b4057eec519d', NULL, 'Veronika Bubnova', 'erasmusik2024@gmail.com', '987348973', NULL, 'Angielski', 'B1', 110.00, 'active', 'active', 0, 0, '2026-01-18 13:58:59.603829+00', '2026-01-19 15:13:00.523495+00'),
  ('2851862c-adba-4d65-9dc3-3daa5597c4ea', '40ea67b3-2773-48b9-83d4-409814bd41ac', '00903da2-56a0-40bf-92fb-ece5103a247d', NULL, 'Olaf', '', NULL, NULL, 'Angielski', 'B2', 80.00, 'active', 'active', 0, 1, '2026-01-19 09:23:17.957942+00', '2026-01-19 17:19:09.75309+00'),
  ('311f6119-f156-459b-b5a5-38b11ee81054', '40ea67b3-2773-48b9-83d4-409814bd41ac', '00903da2-56a0-40bf-92fb-ece5103a247d', NULL, 'Maria', '', NULL, '@shemaria', 'Angielski', 'B2', 80.00, 'active', 'active', 0, 2, '2026-01-18 19:26:17.563856+00', '2026-01-20 10:10:09.373551+00'),
  ('41c4d053-b07c-4bb8-a2c1-f5fea617fefe', '40ea67b3-2773-48b9-83d4-409814bd41ac', '00903da2-56a0-40bf-92fb-ece5103a247d', '21ba8c13-d9f7-40e7-9686-23aafe0dbd77', 'Dawid', '', NULL, NULL, 'Angielski', 'C1', 80.00, 'active', 'active', 0, 0, '2026-01-19 08:48:17.809101+00', '2026-01-20 13:35:03.950976+00');

-- =====================================================
-- CZĘŚĆ 12: DANE - LESSONS
-- =====================================================

INSERT INTO public.lessons (id, school_id, teacher_id, student_id, group_id, title, date, start_time, end_time, notes, is_completed, created_at, updated_at)
VALUES
  ('6f1ed260-55d4-40a6-84d6-4affda70d16e', '40ea67b3-2773-48b9-83d4-409814bd41ac', '00903da2-56a0-40bf-92fb-ece5103a247d', '311f6119-f156-459b-b5a5-38b11ee81054', NULL, 'Speaking Technology', '2026-01-27', '17:05:00', '18:05:00', NULL, true, '2026-01-19 09:19:50.59165+00', '2026-01-19 09:23:55.185194+00'),
  ('e49f070b-e75f-4406-9ca8-0a693f6554fb', '40ea67b3-2773-48b9-83d4-409814bd41ac', '00903da2-56a0-40bf-92fb-ece5103a247d', '2851862c-adba-4d65-9dc3-3daa5597c4ea', NULL, 'Ioiaoasd', '2026-01-19', '11:00:00', '12:00:00', NULL, true, '2026-01-19 09:25:12.469489+00', '2026-01-19 09:28:43.173367+00'),
  ('a331f947-d05b-4300-b64e-2f70c7217294', '40ea67b3-2773-48b9-83d4-409814bd41ac', '00903da2-56a0-40bf-92fb-ece5103a247d', '311f6119-f156-459b-b5a5-38b11ee81054', NULL, 'Speaking Club', '2026-01-19', '12:00:00', '13:00:00', NULL, true, '2026-01-19 09:32:30.733402+00', '2026-01-19 09:33:02.865712+00'),
  ('91187170-c892-40c5-ab06-61b623f8cd54', '40ea67b3-2773-48b9-83d4-409814bd41ac', '00903da2-56a0-40bf-92fb-ece5103a247d', '41c4d053-b07c-4bb8-a2c1-f5fea617fefe', NULL, 'Pierwsze zajecia', '2026-01-19', '13:00:00', '14:00:00', NULL, true, '2026-01-19 10:06:18.465154+00', '2026-01-19 10:06:55.085202+00'),
  ('b9698794-3f4d-424a-acf0-3b38a4d59c6b', '40ea67b3-2773-48b9-83d4-409814bd41ac', '00903da2-56a0-40bf-92fb-ece5103a247d', '311f6119-f156-459b-b5a5-38b11ee81054', NULL, 'Speaking', '2026-01-19', '15:00:00', '16:00:00', NULL, true, '2026-01-19 10:10:42.032316+00', '2026-01-19 10:11:08.778506+00'),
  ('2f7a4e99-cb2c-4c8f-b28e-ab4cefe271e9', '40ea67b3-2773-48b9-83d4-409814bd41ac', '00903da2-56a0-40bf-92fb-ece5103a247d', '311f6119-f156-459b-b5a5-38b11ee81054', NULL, '2 lekcje', '2026-01-19', '17:00:00', '18:00:00', NULL, true, '2026-01-19 11:06:09.437336+00', '2026-01-19 11:09:41.026406+00'),
  ('01eaf765-1d91-43a9-8e55-37f311fb0006', '40ea67b3-2773-48b9-83d4-409814bd41ac', '00903da2-56a0-40bf-92fb-ece5103a247d', '41c4d053-b07c-4bb8-a2c1-f5fea617fefe', NULL, '3 lekcja', '2026-01-19', '16:00:00', '17:00:00', NULL, true, '2026-01-19 11:05:54.948865+00', '2026-01-19 11:09:43.625147+00'),
  ('90246ce2-f823-4599-a71a-0506115872f2', '40ea67b3-2773-48b9-83d4-409814bd41ac', '00903da2-56a0-40bf-92fb-ece5103a247d', '311f6119-f156-459b-b5a5-38b11ee81054', NULL, 'lekcje 2', '2026-01-19', '18:00:00', '19:00:00', NULL, true, '2026-01-19 11:09:09.024749+00', '2026-01-19 11:09:46.658285+00'),
  ('ded979f4-33db-4be8-a5ec-08ec0854b58a', '40ea67b3-2773-48b9-83d4-409814bd41ac', '00903da2-56a0-40bf-92fb-ece5103a247d', '311f6119-f156-459b-b5a5-38b11ee81054', NULL, 'lekcja 0', '2026-01-19', '20:00:00', '21:00:00', NULL, true, '2026-01-19 11:09:20.437738+00', '2026-01-19 11:24:08.844395+00'),
  ('1b886c41-6069-4be7-b95c-df4ad2a3b7e1', '40ea67b3-2773-48b9-83d4-409814bd41ac', '00903da2-56a0-40bf-92fb-ece5103a247d', '311f6119-f156-459b-b5a5-38b11ee81054', NULL, 'lekcje1', '2026-01-19', '19:00:00', '20:00:00', NULL, true, '2026-01-19 11:09:14.802654+00', '2026-01-19 11:24:10.762057+00'),
  ('87362850-1eef-4e42-881b-df13a1a8b73c', '40ea67b3-2773-48b9-83d4-409814bd41ac', '00903da2-56a0-40bf-92fb-ece5103a247d', '2851862c-adba-4d65-9dc3-3daa5597c4ea', NULL, 'lekcja', '2026-01-19', '21:00:00', '22:00:00', NULL, true, '2026-01-19 17:17:46.410648+00', '2026-01-19 17:17:57.063388+00'),
  ('3634a32b-ffa7-4519-af00-6b1bf4e32217', '40ea67b3-2773-48b9-83d4-409814bd41ac', '00903da2-56a0-40bf-92fb-ece5103a247d', '311f6119-f156-459b-b5a5-38b11ee81054', NULL, 'Po prostu', '2026-01-20', '13:00:00', '14:00:00', NULL, true, '2026-01-19 09:24:28.227907+00', '2026-01-20 10:10:11.113813+00'),
  ('363f0aa5-23fd-4a07-bab7-2edac198d938', '40ea67b3-2773-48b9-83d4-409814bd41ac', '00903da2-56a0-40bf-92fb-ece5103a247d', NULL, '21ba8c13-d9f7-40e7-9686-23aafe0dbd77', 'Grupowa', '2026-01-20', '14:00:00', '15:00:00', NULL, true, '2026-01-19 17:17:10.532757+00', '2026-01-20 10:10:22.313686+00'),
  ('1154ddf8-431b-43ae-a97e-c64bf941bc63', '40ea67b3-2773-48b9-83d4-409814bd41ac', '00903da2-56a0-40bf-92fb-ece5103a247d', NULL, '21ba8c13-d9f7-40e7-9686-23aafe0dbd77', 'Grupowa 2', '2026-01-20', '15:00:00', '16:00:00', NULL, true, '2026-01-20 13:33:50.93697+00', '2026-01-20 13:35:05.584306+00');

-- =====================================================
-- CZĘŚĆ 13: DANE - PACKAGE_PURCHASES
-- =====================================================

INSERT INTO public.package_purchases (id, school_id, student_id, teacher_id, created_by, hours_purchased, lessons_total, lessons_used, total_amount, price_per_hour, price_per_lesson, purchase_date, expires_at, status, created_at, updated_at)
VALUES
  ('5aa0e4f7-86f3-4d44-80c0-0f46cd42b30e', '40ea67b3-2773-48b9-83d4-409814bd41ac', '311f6119-f156-459b-b5a5-38b11ee81054', '00903da2-56a0-40bf-92fb-ece5103a247d', '38bb888d-be12-425d-96f9-3993435807f4', 4, 4, 4, 480, 120.00, 120.00, '2026-01-19', '2026-01-31 00:00:00+00', 'exhausted', '2026-01-19 10:09:17.053961+00', '2026-01-19 11:24:15.752855+00'),
  ('69814c9c-fabe-4c1f-a1e4-5b35ce37f0f5', '40ea67b3-2773-48b9-83d4-409814bd41ac', 'b2002ccc-555f-4b66-9fa8-068c6a75879b', '00903da2-56a0-40bf-92fb-ece5103a247d', '5bbb044c-cfce-40d2-8e11-fc3ba9f6806a', 8, 8, 0, 900, 112.50, 112.50, '2026-01-19', NULL, 'active', '2026-01-19 15:13:00.235272+00', '2026-01-19 15:13:00.235272+00'),
  ('5f4a47f9-ca90-46db-8fc5-b2be0b314334', '40ea67b3-2773-48b9-83d4-409814bd41ac', '41c4d053-b07c-4bb8-a2c1-f5fea617fefe', '00903da2-56a0-40bf-92fb-ece5103a247d', '38bb888d-be12-425d-96f9-3993435807f4', 8, 8, 2, 800, 100.00, 100.00, '2026-01-19', '2026-09-08 00:00:00+00', 'expired', '2026-01-19 10:05:31.878238+00', '2026-01-19 15:16:06.286073+00'),
  ('0033b25d-3630-47ff-845c-2dcb8658861e', '40ea67b3-2773-48b9-83d4-409814bd41ac', '2851862c-adba-4d65-9dc3-3daa5597c4ea', '00903da2-56a0-40bf-92fb-ece5103a247d', '5bbb044c-cfce-40d2-8e11-fc3ba9f6806a', 1, 1, 1, 100, 100.00, 100.00, '2026-01-19', NULL, 'exhausted', '2026-01-19 15:12:22.347891+00', '2026-01-19 17:17:51.782769+00'),
  ('d66cebfd-49f8-4d05-9559-07ec72fb7dab', '40ea67b3-2773-48b9-83d4-409814bd41ac', '2851862c-adba-4d65-9dc3-3daa5597c4ea', NULL, '38bb888d-be12-425d-96f9-3993435807f4', 5, 5, 0, 700, 140.00, 140.00, '2026-01-19', NULL, 'active', '2026-01-19 17:19:09.62484+00', '2026-01-19 17:19:09.62484+00'),
  ('3a315586-15ab-47b9-978e-52ef7c3db52b', '40ea67b3-2773-48b9-83d4-409814bd41ac', '311f6119-f156-459b-b5a5-38b11ee81054', '00903da2-56a0-40bf-92fb-ece5103a247d', '38bb888d-be12-425d-96f9-3993435807f4', 8, 8, 1, 800, 100.00, 100.00, '2026-01-19', '2026-09-08 00:00:00+00', 'active', '2026-01-19 12:19:44.980866+00', '2026-01-20 10:10:09.373551+00'),
  ('b9659bd9-f153-40b9-a035-8feed0668fdb', '40ea67b3-2773-48b9-83d4-409814bd41ac', '41c4d053-b07c-4bb8-a2c1-f5fea617fefe', '00903da2-56a0-40bf-92fb-ece5103a247d', '5bbb044c-cfce-40d2-8e11-fc3ba9f6806a', 10, 10, 1, 900, 90.00, 90.00, '2026-01-21', NULL, 'active', '2026-01-19 15:16:06.359863+00', '2026-01-20 13:35:03.950976+00');

-- =====================================================
-- CZĘŚĆ 14: DANE - LESSON_ATTENDANCE
-- =====================================================

INSERT INTO public.lesson_attendance (id, lesson_id, student_id, package_purchase_id, attended, comment, revenue_amount, created_at, updated_at)
VALUES
  ('af9316bb-11ff-4c62-be8b-fbef6dbcdeda', 'a331f947-d05b-4300-b64e-2f70c7217294', '311f6119-f156-459b-b5a5-38b11ee81054', NULL, true, 'Nie powiadomila wczesniej ze nie przyjdziie', NULL, '2026-01-19 09:32:37.471385+00', '2026-01-19 09:33:00.741071+00'),
  ('65f51c14-facc-4d9d-b90f-054bef31d1d6', 'b9698794-3f4d-424a-acf0-3b38a4d59c6b', '311f6119-f156-459b-b5a5-38b11ee81054', '5aa0e4f7-86f3-4d44-80c0-0f46cd42b30e', true, 'Nie pszyszlo i nie powiadomila', 120.00, '2026-01-19 10:10:51.266445+00', '2026-01-19 11:07:28.031425+00'),
  ('2b89d1ba-1985-4744-8ad1-0d7467bc86b6', '91187170-c892-40c5-ab06-61b623f8cd54', '41c4d053-b07c-4bb8-a2c1-f5fea617fefe', '5f4a47f9-ca90-46db-8fc5-b2be0b314334', true, 'Nie zglosil ze go nie bedzie', 100.00, '2026-01-19 10:06:23.528686+00', '2026-01-19 11:07:37.314878+00'),
  ('ba3c7f24-f52b-476a-a204-aa3de1f9ca45', '2f7a4e99-cb2c-4c8f-b28e-ab4cefe271e9', '311f6119-f156-459b-b5a5-38b11ee81054', '5aa0e4f7-86f3-4d44-80c0-0f46cd42b30e', true, NULL, 120.00, '2026-01-19 11:07:44.958582+00', '2026-01-19 11:07:44.958582+00'),
  ('1e847f58-be19-4027-b5ee-0622632c7379', '01eaf765-1d91-43a9-8e55-37f311fb0006', '41c4d053-b07c-4bb8-a2c1-f5fea617fefe', '5f4a47f9-ca90-46db-8fc5-b2be0b314334', true, NULL, 100.00, '2026-01-19 11:07:16.158536+00', '2026-01-19 11:09:30.57821+00'),
  ('c6865285-b3e7-4888-bb74-993c3f69fdd0', '90246ce2-f823-4599-a71a-0506115872f2', '311f6119-f156-459b-b5a5-38b11ee81054', '5aa0e4f7-86f3-4d44-80c0-0f46cd42b30e', true, NULL, 120.00, '2026-01-19 11:09:36.594142+00', '2026-01-19 11:09:36.594142+00'),
  ('6943a3bc-7dd1-4c40-8ccf-960b30ada769', 'ded979f4-33db-4be8-a5ec-08ec0854b58a', '311f6119-f156-459b-b5a5-38b11ee81054', NULL, true, NULL, NULL, '2026-01-19 11:24:07.916831+00', '2026-01-19 11:24:07.916831+00'),
  ('8c341e74-8a66-4736-87a8-d189f10af39d', '87362850-1eef-4e42-881b-df13a1a8b73c', '2851862c-adba-4d65-9dc3-3daa5597c4ea', '0033b25d-3630-47ff-845c-2dcb8658861e', true, NULL, 100.00, '2026-01-19 17:17:51.782769+00', '2026-01-19 17:17:55.173814+00'),
  ('94209e19-ec6c-4874-806e-c666b0ef8bf9', '3634a32b-ffa7-4519-af00-6b1bf4e32217', '311f6119-f156-459b-b5a5-38b11ee81054', '3a315586-15ab-47b9-978e-52ef7c3db52b', true, NULL, 100.00, '2026-01-20 10:10:09.373551+00', '2026-01-20 10:10:09.373551+00'),
  ('1c8b08f8-73ca-4a60-af2a-66b91e5d7ad2', '363f0aa5-23fd-4a07-bab7-2edac198d938', '41c4d053-b07c-4bb8-a2c1-f5fea617fefe', 'b9659bd9-f153-40b9-a035-8feed0668fdb', true, NULL, 90.00, '2026-01-20 10:10:19.523378+00', '2026-01-20 10:10:19.523378+00'),
  ('647264c8-caaf-4c30-8551-a008df8253ec', '1154ddf8-431b-43ae-a97e-c64bf941bc63', '41c4d053-b07c-4bb8-a2c1-f5fea617fefe', NULL, false, NULL, NULL, '2026-01-20 13:33:58.287212+00', '2026-01-20 13:35:03.950976+00'),
  ('df939cc0-1d42-4ae8-9f7a-807152cc44d3', 'e49f070b-e75f-4406-9ca8-0a693f6554fb', '2851862c-adba-4d65-9dc3-3daa5597c4ea', NULL, true, NULL, NULL, '2026-01-19 09:25:17.690028+00', '2026-01-19 09:32:15.981404+00');

-- =====================================================
-- CZĘŚĆ 15: DANE - PAYMENTS
-- =====================================================

INSERT INTO public.payments (id, school_id, student_id, teacher_id, package_purchase_id, created_by, amount, description, status, payment_type, package_lessons, payment_date, due_date, created_at, updated_at)
VALUES
  ('80d773d4-98b7-4648-a24c-82295e69e6b2', '40ea67b3-2773-48b9-83d4-409814bd41ac', 'b2002ccc-555f-4b66-9fa8-068c6a75879b', NULL, NULL, NULL, 800.00, 'Pakiet 10 lekcji', 'paid', 'single', NULL, '2026-01-18', '2026-08-09', '2026-01-18 14:02:30.777793+00', '2026-01-18 14:02:36.025265+00'),
  ('e86644e9-50cf-43a5-a379-889fb988c10f', '40ea67b3-2773-48b9-83d4-409814bd41ac', '311f6119-f156-459b-b5a5-38b11ee81054', NULL, NULL, NULL, 1000.00, '6 lekcji', 'paid', 'single', NULL, '2026-01-19', '2026-08-09', '2026-01-19 08:38:23.079662+00', '2026-01-19 08:38:27.058336+00'),
  ('afaf80d0-462b-4090-83fa-0a19e9ca3c58', '40ea67b3-2773-48b9-83d4-409814bd41ac', '41c4d053-b07c-4bb8-a2c1-f5fea617fefe', NULL, NULL, NULL, 3000.00, NULL, 'paid', 'package', 30, '2026-01-19', '2026-09-08', '2026-01-19 09:15:49.347664+00', '2026-01-19 09:16:21.689368+00'),
  ('d0b3add7-2197-4a52-b9f0-009f794b46dc', '40ea67b3-2773-48b9-83d4-409814bd41ac', '41c4d053-b07c-4bb8-a2c1-f5fea617fefe', NULL, NULL, NULL, 80.00, NULL, 'paid', 'single', NULL, '2026-01-19', '2026-07-08', '2026-01-19 09:16:12.95876+00', '2026-01-19 09:44:03.330986+00');

-- =====================================================
-- CZĘŚĆ 16: DANE - USER_PREFERENCES (wymaga user_id z auth.users)
-- =====================================================

-- INSERT INTO public.user_preferences (id, user_id, primary_color, secondary_color, accent_color, created_at, updated_at)
-- VALUES
--   ('acac0825-2757-468e-ad2d-e30c93aebb28', '5bbb044c-cfce-40d2-8e11-fc3ba9f6806a', '#8a7aff', '#60a5fa', '#93c5fd', '2026-01-18 17:18:38.916647+00', '2026-01-19 09:21:59.594651+00'),
--   ('04aa1d4c-3b1e-4262-8d80-648993cff038', 'c1417bac-f0eb-4863-8422-e77ea6a00bf3', '#3b82f6', '#60a5fa', '#93c5fd', '2026-01-18 19:20:17.343937+00', '2026-01-20 10:09:28.129175+00'),
--   ('edb063f1-9dee-4474-8bb2-7dce79629878', '38bb888d-be12-425d-96f9-3993435807f4', '#3b82f6', '#60a5fa', '#93c5fd', '2026-01-18 17:26:12.081138+00', '2026-01-20 11:36:09.250753+00');

-- =====================================================
-- CZĘŚĆ 17: DANE - USER_ROLES (wymaga user_id z auth.users)
-- =====================================================

-- INSERT INTO public.user_roles (id, user_id, role)
-- VALUES
--   ('05732d2c-1a07-4039-ac03-68f7ed80f7ef', '38bb888d-be12-425d-96f9-3993435807f4', 'admin'),
--   ('d2568338-11c9-455c-a801-52ac3bd11eaa', 'c1417bac-f0eb-4863-8422-e77ea6a00bf3', 'teacher'),
--   ('4b071053-3dd5-414e-ab04-24e39cbd39fc', '5bbb044c-cfce-40d2-8e11-fc3ba9f6806a', 'manager'),
--   ('b877b851-eca0-43d1-8711-89ea26006180', '0d8c6a33-628b-4041-8326-0b7f2b4e76f8', 'admin');

-- =====================================================
-- CZĘŚĆ 18: TRIGGER NA AUTH.USERS
-- =====================================================
-- Uruchom to OSOBNO po załadowaniu głównego skryptu:

-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- KONIEC SKRYPTU MIGRACJI
-- =====================================================
-- UWAGA: 
-- 1. Sekcje z profiles, user_roles i user_preferences są zakomentowane
--    ponieważ wymagają istnienia użytkowników w tabeli auth.users
-- 2. Musisz najpierw utworzyć użytkowników przez rejestrację lub 
--    w Supabase Dashboard → Authentication → Users
-- 3. Po utworzeniu użytkowników, odkomentuj sekcje i zaktualizuj UUID
