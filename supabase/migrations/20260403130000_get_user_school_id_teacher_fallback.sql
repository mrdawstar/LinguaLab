-- Teachers invited to a school often have school_id on public.teachers but not yet on public.profiles.
-- That made get_user_school_id() return NULL, breaking RLS and subscription checks for teachers.
CREATE OR REPLACE FUNCTION public.get_user_school_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p.school_id FROM public.profiles p WHERE p.id = _user_id),
    (SELECT t.school_id FROM public.teachers t WHERE t.user_id = _user_id ORDER BY t.created_at ASC LIMIT 1)
  );
$$;

-- One-time backfill: keep profile in sync when teacher row already has school
UPDATE public.profiles p
SET school_id = t.school_id
FROM public.teachers t
WHERE t.user_id = p.id
  AND p.school_id IS NULL
  AND t.school_id IS NOT NULL;
