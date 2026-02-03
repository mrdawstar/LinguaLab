-- Allow inserting user_roles for invited users (via trigger or direct insert during signup)
-- We need a function to handle this securely

CREATE OR REPLACE FUNCTION public.handle_invitation_signup()
RETURNS TRIGGER AS $$
DECLARE
  invitation_record RECORD;
  invitation_token TEXT;
BEGIN
  -- Get invitation token from user metadata
  invitation_token := NEW.raw_user_meta_data->>'invitation_token';
  
  IF invitation_token IS NOT NULL THEN
    -- Find the invitation
    SELECT * INTO invitation_record
    FROM public.invitations
    WHERE token = invitation_token
      AND accepted_at IS NULL
      AND expires_at > NOW();
    
    IF invitation_record.id IS NOT NULL THEN
      -- Update profile with school_id
      UPDATE public.profiles
      SET school_id = invitation_record.school_id
      WHERE id = NEW.id;
      
      -- Insert user role
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, invitation_record.role);
      
      -- If teacher, create teacher record
      IF invitation_record.role = 'teacher' THEN
        INSERT INTO public.teachers (name, email, school_id, user_id)
        VALUES (
          COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
          NEW.email,
          invitation_record.school_id,
          NEW.id
        );
      END IF;
      
      -- Mark invitation as accepted
      UPDATE public.invitations
      SET accepted_at = NOW()
      WHERE id = invitation_record.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for handling invitation signup
DROP TRIGGER IF EXISTS on_auth_user_created_invitation ON auth.users;
CREATE TRIGGER on_auth_user_created_invitation
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_invitation_signup();