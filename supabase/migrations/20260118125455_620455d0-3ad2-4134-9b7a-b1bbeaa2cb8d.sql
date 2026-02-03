-- Update RLS policies for managers (they can view everything except payment amounts)

-- Managers can view students in their school
CREATE POLICY "Managers can view students in their school"
ON public.students FOR SELECT
USING (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'manager'::app_role));

-- Managers can view teachers in their school  
CREATE POLICY "Managers can view teachers in their school"
ON public.teachers FOR SELECT
USING (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'manager'::app_role));

-- Managers can view groups in their school
CREATE POLICY "Managers can view groups in their school"
ON public.groups FOR SELECT
USING (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'manager'::app_role));

-- Managers can view lessons in their school
CREATE POLICY "Managers can view lessons in their school"
ON public.lessons FOR SELECT
USING (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'manager'::app_role));

-- Managers can view their school settings
CREATE POLICY "Managers can view their school settings"
ON public.school_settings FOR SELECT
USING (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'manager'::app_role));

-- Managers can view their own school
CREATE POLICY "Managers can view their own school"
ON public.schools FOR SELECT
USING (id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'manager'::app_role));

-- Managers can view profiles in their school
CREATE POLICY "Managers can view profiles in their school"
ON public.profiles FOR SELECT
USING (school_id = get_user_school_id(auth.uid()) AND has_role(auth.uid(), 'manager'::app_role));