-- Fix handle_new_user() to explicitly set trial period for new schools
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_school_id UUID;
  school_name TEXT;
  invitation_token TEXT;
  invitation_record RECORD;
BEGIN
  -- Get metadata
  school_name := NEW.raw_user_meta_data ->> 'school_name';
  invitation_token := NEW.raw_user_meta_data ->> 'invitation_token';
  
  -- Check if this is an invitation-based signup
  IF invitation_token IS NOT NULL THEN
    -- Find the invitation
    SELECT * INTO invitation_record
    FROM public.invitations
    WHERE token = invitation_token
      AND accepted_at IS NULL
      AND expires_at > NOW();
    
    IF invitation_record.id IS NOT NULL THEN
      -- Create profile with school_id from invitation
      INSERT INTO public.profiles (id, email, full_name, school_id)
      VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
        invitation_record.school_id
      );
      
      -- Insert user role from invitation
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, invitation_record.role);
      
      -- If teacher, create teacher record
      IF invitation_record.role = 'teacher' THEN
        INSERT INTO public.teachers (name, email, school_id, user_id)
        VALUES (
          COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
          NEW.email,
          invitation_record.school_id,
          NEW.id
        );
      END IF;
      
      -- Mark invitation as accepted
      UPDATE public.invitations
      SET accepted_at = NOW()
      WHERE id = invitation_record.id;
      
      RETURN NEW;
    END IF;
  END IF;
  
  -- Regular admin signup (creates new school)
  IF school_name IS NOT NULL AND school_name != '' THEN
    -- Create school with explicit trial period settings
    INSERT INTO public.schools (name, subscription_status, trial_ends_at)
    VALUES (
      school_name,
      'trial',
      NOW() + INTERVAL '7 days'
    )
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
    -- Fallback - just create profile without school
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update existing schools that don't have trial_ends_at set or have wrong subscription_status
UPDATE public.schools
SET 
  subscription_status = COALESCE(subscription_status, 'trial'),
  trial_ends_at = COALESCE(
    trial_ends_at,
    CASE 
      WHEN created_at > NOW() - INTERVAL '7 days' THEN created_at + INTERVAL '7 days'
      ELSE NOW() + INTERVAL '7 days'
    END
  )
WHERE 
  (subscription_status IS NULL OR subscription_status != 'active')
  AND (trial_ends_at IS NULL OR trial_ends_at < created_at);
