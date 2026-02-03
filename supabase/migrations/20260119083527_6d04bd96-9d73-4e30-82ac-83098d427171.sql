-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view valid invitations by token" ON public.invitations;

-- Create secure function to look up invitation by token
-- This is SECURITY DEFINER to bypass RLS while enforcing token requirement
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(_token TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  role app_role,
  school_id UUID,
  token TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    i.id,
    i.email,
    i.role,
    i.school_id,
    i.token,
    i.expires_at
  FROM public.invitations i
  WHERE i.token = _token
    AND i.accepted_at IS NULL
    AND i.expires_at > NOW()
  LIMIT 1;
$$;

-- Grant execute permission to anonymous users (for signup flow)
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(TEXT) TO anon;

-- Grant execute permission to authenticated users as well
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(TEXT) TO authenticated;