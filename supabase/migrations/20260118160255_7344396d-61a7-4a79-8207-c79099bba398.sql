-- Update RLS policies for students table - teachers can only see their assigned students
DROP POLICY IF EXISTS "School staff can view students" ON public.students;

-- Admins can view all students in their school
CREATE POLICY "Admins can view all students in their school"
ON public.students
FOR SELECT
USING (
  school_id = get_user_school_id(auth.uid()) 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Managers can view all students in their school
CREATE POLICY "Managers can view all students in their school"
ON public.students
FOR SELECT
USING (
  school_id = get_user_school_id(auth.uid()) 
  AND has_role(auth.uid(), 'manager'::app_role)
);

-- Teachers can ONLY view students assigned to them
CREATE POLICY "Teachers can view only their assigned students"
ON public.students
FOR SELECT
USING (
  school_id = get_user_school_id(auth.uid()) 
  AND has_role(auth.uid(), 'teacher'::app_role)
  AND teacher_id IN (
    SELECT id FROM public.teachers WHERE user_id = auth.uid()
  )
);

-- Teachers can also view students in groups assigned to them
CREATE POLICY "Teachers can view students in their groups"
ON public.students
FOR SELECT
USING (
  school_id = get_user_school_id(auth.uid()) 
  AND has_role(auth.uid(), 'teacher'::app_role)
  AND group_id IN (
    SELECT id FROM public.groups WHERE teacher_id IN (
      SELECT id FROM public.teachers WHERE user_id = auth.uid()
    )
  )
);

-- Update RLS policies for groups table - teachers can only see their assigned groups
DROP POLICY IF EXISTS "Users can view groups in their school" ON public.groups;
DROP POLICY IF EXISTS "Managers can view groups in their school" ON public.groups;

-- Admins can view all groups in their school
CREATE POLICY "Admins can view all groups in their school"
ON public.groups
FOR SELECT
USING (
  school_id = get_user_school_id(auth.uid()) 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Managers can view all groups in their school
CREATE POLICY "Managers can view all groups in their school"
ON public.groups
FOR SELECT
USING (
  school_id = get_user_school_id(auth.uid()) 
  AND has_role(auth.uid(), 'manager'::app_role)
);

-- Teachers can ONLY view groups assigned to them
CREATE POLICY "Teachers can view only their assigned groups"
ON public.groups
FOR SELECT
USING (
  school_id = get_user_school_id(auth.uid()) 
  AND has_role(auth.uid(), 'teacher'::app_role)
  AND teacher_id IN (
    SELECT id FROM public.teachers WHERE user_id = auth.uid()
  )
);

-- Update lessons policies - teachers can only see lessons they teach
DROP POLICY IF EXISTS "Users can view lessons in their school" ON public.lessons;
DROP POLICY IF EXISTS "Managers can view lessons in their school" ON public.lessons;

-- Admins can view all lessons
CREATE POLICY "Admins can view all lessons in their school"
ON public.lessons
FOR SELECT
USING (
  school_id = get_user_school_id(auth.uid()) 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Managers can view all lessons
CREATE POLICY "Managers can view all lessons in their school"
ON public.lessons
FOR SELECT
USING (
  school_id = get_user_school_id(auth.uid()) 
  AND has_role(auth.uid(), 'manager'::app_role)
);

-- Teachers can only view their own lessons
CREATE POLICY "Teachers can view only their lessons"
ON public.lessons
FOR SELECT
USING (
  school_id = get_user_school_id(auth.uid()) 
  AND has_role(auth.uid(), 'teacher'::app_role)
  AND teacher_id IN (
    SELECT id FROM public.teachers WHERE user_id = auth.uid()
  )
);