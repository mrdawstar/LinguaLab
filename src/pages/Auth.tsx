import { useState, useEffect, useRef } from 'react';
import React from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { GraduationCap, Moon, Sun, ArrowRight, Loader2, Building2, Mail, Lock, User, UserPlus, ArrowLeft, AlertCircle, CheckCircle2, Eye, EyeOff, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, validateEmailFormat, validateEmailExists } from '@/lib/utils';
import { getEmailRedirectUrl } from '@/lib/auth-utils';
import { toast } from 'sonner';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

const loginSchema = z.object({
  email: z.string().email('Nieprawidłowy adres email'),
  password: z.string().min(6, 'Hasło musi mieć minimum 6 znaków'),
});

const signupSchema = z.object({
  email: z.string().email('Nieprawidłowy adres email'),
  password: z.string().min(6, 'Hasło musi mieć minimum 6 znaków'),
  fullName: z.string().min(2, 'Imię i nazwisko musi mieć minimum 2 znaki'),
  schoolName: z.string().min(2, 'Nazwa szkoły musi mieć minimum 2 znaki'),
});

const invitationSignupSchema = z.object({
  email: z.string().email('Nieprawidłowy adres email'),
  password: z.string().min(6, 'Hasło musi mieć minimum 6 znaków'),
  fullName: z.string().min(2, 'Imię i nazwisko musi mieć minimum 2 znaki'),
});

// Function to translate Supabase error messages to Polish
const translateError = (errorMessage: string): string => {
  if (!errorMessage) return 'Wystąpił błąd';
  
  const lowerMessage = errorMessage.toLowerCase();
  
  // Email validation errors - catch all variants
  if (lowerMessage.includes('email address') && lowerMessage.includes('invalid')) {
    return 'Email nie wygląda poprawnie. Sprawdź format adresu email';
  }
  if (lowerMessage.includes('email') && lowerMessage.includes('invalid')) {
    return 'Email nie wygląda poprawnie. Sprawdź format adresu email';
  }
  if (lowerMessage.includes('invalid email')) {
    return 'Email nie wygląda poprawnie. Sprawdź format adresu email';
  }
  if (lowerMessage.includes('email format') || lowerMessage.includes('email is not valid')) {
    return 'Email nie wygląda poprawnie. Sprawdź format adresu email';
  }
  
  // User already exists
  if (lowerMessage.includes('user already registered') || lowerMessage.includes('already registered')) {
    return 'Użytkownik o tym adresie email już istnieje';
  }
  
  // Login errors
  if (lowerMessage.includes('invalid login credentials') || lowerMessage.includes('invalid credentials')) {
    return 'Nieprawidłowy email lub hasło';
  }
  
  // Password errors
  if (lowerMessage.includes('password') && (lowerMessage.includes('weak') || lowerMessage.includes('invalid'))) {
    return 'Hasło nie spełnia wymagań';
  }
  
  // Rate limit errors
  if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests') || lowerMessage.includes('email rate limit exceeded')) {
    return 'Zbyt wiele prób rejestracji. Poczekaj kilka minut i spróbuj ponownie.';
  }
  
  // 429 status code
  if (errorMessage.includes('429')) {
    return 'Zbyt wiele prób rejestracji. Poczekaj kilka minut i spróbuj ponownie.';
  }
  
  return errorMessage;
};

interface InvitationData {
  id: string;
  email: string;
  role: 'admin' | 'teacher' | 'manager';
  school_id: string;
  token: string;
}

export default function Auth() {
  const [searchParams] = useSearchParams();
  const invitationToken = searchParams.get('token');
  const mode = searchParams.get('mode');
  
  const [isLogin, setIsLogin] = useState(mode !== 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [validating, setValidating] = useState<Record<string, boolean>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loadingInvitation, setLoadingInvitation] = useState(!!invitationToken);
  const [emailConfirmationRequired, setEmailConfirmationRequired] = useState<string | null>(null);
  const validationTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const lastSignupAttemptRef = useRef<number>(0);
  const signupAttemptCountRef = useRef<number>(0);
  
  const { login, signup, isAuthenticated, role, isLoading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Load invitation data if token is present using secure RPC function
  useEffect(() => {
    async function loadInvitation() {
      if (!invitationToken) return;
      
      setLoadingInvitation(true);
      try {
        // Use secure RPC function to lookup invitation by token
        // This prevents enumeration of all invitations
        const { data, error } = await supabase.rpc('get_invitation_by_token', {
          _token: invitationToken
        });
        
        if (error || !data || data.length === 0) {
          toast.error('Zaproszenie jest nieprawidłowe lub wygasło');
          navigate('/auth');
          return;
        }
        
        const invitationData = data[0];
        setInvitation(invitationData as InvitationData);
        setEmail(invitationData.email);
        setIsLogin(false);
      } catch (err) {
        console.error('Error loading invitation:', err);
        toast.error('Błąd podczas ładowania zaproszenia');
      } finally {
        setLoadingInvitation(false);
      }
    }
    
    loadInvitation();
  }, [invitationToken, navigate]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && role) {
      navigate(`/${role}`);
    }
  }, [isAuthenticated, role, authLoading, navigate]);

  // Real-time email validation - check immediately when typing
  useEffect(() => {
    if (email.length === 0) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.email;
        return newErrors;
      });
      setValidating(prev => ({ ...prev, email: false }));
      return;
    }

    // Clear previous timeout
    if (validationTimeoutRef.current.email) {
      clearTimeout(validationTimeoutRef.current.email);
    }

    setValidating(prev => ({ ...prev, email: true }));

    validationTimeoutRef.current.email = setTimeout(async () => {
      const formatCheck = validateEmailFormat(email);
      if (!formatCheck.isValid) {
        setErrors(prev => ({ ...prev, email: formatCheck.error || 'Nieprawidłowy adres email' }));
        setValidating(prev => ({ ...prev, email: false }));
        return;
      }

      // Check if domain exists immediately
      const existsCheck = await validateEmailExists(email);
      if (!existsCheck.isValid) {
        setErrors(prev => ({ ...prev, email: existsCheck.error || 'Nieprawidłowy adres email' }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.email;
          return newErrors;
        });
      }
      setValidating(prev => ({ ...prev, email: false }));
    }, 300); // Reduced timeout for faster validation

    return () => {
      if (validationTimeoutRef.current.email) {
        clearTimeout(validationTimeoutRef.current.email);
      }
    };
  }, [email]); // Removed touched.email dependency to check immediately

  // Real-time password validation
  useEffect(() => {
    if (!touched.password || password.length === 0) {
      return;
    }

    if (validationTimeoutRef.current.password) {
      clearTimeout(validationTimeoutRef.current.password);
    }

    validationTimeoutRef.current.password = setTimeout(() => {
      if (password.length < 6) {
        setErrors(prev => ({ ...prev, password: 'Hasło musi mieć minimum 6 znaków' }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.password;
          return newErrors;
        });
      }
    }, 300);

    return () => {
      if (validationTimeoutRef.current.password) {
        clearTimeout(validationTimeoutRef.current.password);
      }
    };
  }, [password, touched.password]);

  // Real-time fullName validation
  useEffect(() => {
    if (!touched.fullName || fullName.length === 0) {
      return;
    }

    if (validationTimeoutRef.current.fullName) {
      clearTimeout(validationTimeoutRef.current.fullName);
    }

    validationTimeoutRef.current.fullName = setTimeout(() => {
      if (fullName.length < 2) {
        setErrors(prev => ({ ...prev, fullName: 'Imię i nazwisko musi mieć minimum 2 znaki' }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.fullName;
          return newErrors;
        });
      }
    }, 300);

    return () => {
      if (validationTimeoutRef.current.fullName) {
        clearTimeout(validationTimeoutRef.current.fullName);
      }
    };
  }, [fullName, touched.fullName]);

  // Real-time schoolName validation
  useEffect(() => {
    if (!touched.schoolName || schoolName.length === 0) {
      return;
    }

    if (validationTimeoutRef.current.schoolName) {
      clearTimeout(validationTimeoutRef.current.schoolName);
    }

    validationTimeoutRef.current.schoolName = setTimeout(() => {
      if (schoolName.length < 2) {
        setErrors(prev => ({ ...prev, schoolName: 'Nazwa szkoły musi mieć minimum 2 znaki' }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.schoolName;
          return newErrors;
        });
      }
    }, 300);

    return () => {
      if (validationTimeoutRef.current.schoolName) {
        clearTimeout(validationTimeoutRef.current.schoolName);
      }
    };
  }, [schoolName, touched.schoolName]);

  const handleInvitationSignup = async () => {
    if (!invitation) return;
    
    // Mark all fields as touched
    setTouched({
      email: true,
      password: true,
      fullName: true,
    });
    
    // Validate email format first
    const emailFormatCheck = validateEmailFormat(email);
    if (!emailFormatCheck.isValid) {
      setErrors({ email: emailFormatCheck.error || 'Nieprawidłowy adres email' });
      setIsLoading(false);
      return;
    }

    // Then validate domain exists
    setIsLoading(true);
    const emailExistsCheck = await validateEmailExists(email);
    if (!emailExistsCheck.isValid) {
      setErrors({ email: emailExistsCheck.error || 'Nieprawidłowy adres email' });
      setIsLoading(false);
      return;
    }
    
    const validation = invitationSignupSchema.safeParse({ email, password, fullName });
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      setIsLoading(false);
      return;
    }
    
    // Zapobiegaj wielokrotnym próbom rejestracji w krótkim czasie
    const now = Date.now();
    const timeSinceLastAttempt = now - lastSignupAttemptRef.current;
    
    // Jeśli minęło mniej niż 5 sekund od ostatniej próby, zablokuj
    if (timeSinceLastAttempt < 5000) {
      toast.error('Proszę poczekać chwilę przed kolejną próbą rejestracji');
      setIsLoading(false);
      return;
    }
    
    // Resetuj licznik po 60 sekundach
    if (timeSinceLastAttempt > 60000) {
      signupAttemptCountRef.current = 0;
    }
    
    // Jeśli było więcej niż 3 próby w ciągu minuty, zablokuj
    if (signupAttemptCountRef.current >= 3) {
      toast.error('Zbyt wiele prób rejestracji. Poczekaj minutę i spróbuj ponownie.');
      setIsLoading(false);
      return;
    }
    
    lastSignupAttemptRef.current = now;
    signupAttemptCountRef.current += 1;
    
    try {
      // Sign up the user - the database trigger handles role assignment automatically
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getEmailRedirectUrl(),
          data: {
            full_name: fullName,
            invitation_token: invitation.token,
          },
        },
      });
      
      if (signupError) {
        // Resetuj licznik przy sukcesie
        signupAttemptCountRef.current = 0;
        throw signupError;
      }
      
      // Resetuj licznik przy sukcesie
      signupAttemptCountRef.current = 0;
      
      // Check if email confirmation is required
      if (signupData.user && !signupData.session) {
        // User needs to confirm email
        setEmailConfirmationRequired(email);
        toast.success('Konto zostało utworzone! Sprawdź swoją skrzynkę e-mail, aby potwierdzić adres.');
      } else {
        toast.success('Konto zostało utworzone! Zaloguj się teraz.');
      }
      
      setInvitation(null);
      setIsLogin(true);
      navigate('/auth');
    } catch (error: any) {
      console.error('Invitation signup error:', error);
      
      // Sprawdź czy to błąd rate limit (429)
      const isRateLimit = error.status === 429 || 
                         error.message?.toLowerCase().includes('rate limit') ||
                         error.message?.toLowerCase().includes('too many requests') ||
                         error.message?.toLowerCase().includes('email rate limit exceeded');
      
      if (isRateLimit) {
        const waitTime = Math.min(60, Math.pow(2, signupAttemptCountRef.current) * 5); // Exponential backoff, max 60s
        toast.error(`Zbyt wiele prób rejestracji. Poczekaj ${waitTime} sekund i spróbuj ponownie.`, {
          duration: 8000,
        });
        setErrors({ 
          email: `Zbyt wiele prób. Poczekaj ${waitTime} sekund przed kolejną próbą.` 
        });
      } else {
        const translatedError = translateError(error.message || 'Wystąpił błąd podczas rejestracji');
        toast.error(translatedError);
        
        // Set error in form if it's email related
        if (error.message?.toLowerCase().includes('email') && error.message?.toLowerCase().includes('invalid')) {
          setErrors({ email: 'Email nie wygląda poprawnie. Sprawdź format adresu email' });
        } else if (error.message?.includes('User already registered')) {
          setErrors({ email: 'Użytkownik o tym adresie email już istnieje. Zaloguj się.' });
          setIsLogin(true);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    setTouched({
      email: true,
      password: true,
      fullName: !isLogin,
      schoolName: !isLogin,
    });
    
    setErrors({});
    
    // Handle invitation signup separately
    if (invitation && !isLogin) {
      await handleInvitationSignup();
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (isLogin) {
        // Validate email format first
        const emailFormatCheck = validateEmailFormat(email);
        if (!emailFormatCheck.isValid) {
          setErrors({ email: emailFormatCheck.error || 'Nieprawidłowy adres email' });
          setIsLoading(false);
          return;
        }

        // Then validate domain exists
        const emailExistsCheck = await validateEmailExists(email);
        if (!emailExistsCheck.isValid) {
          setErrors({ email: emailExistsCheck.error || 'Nieprawidłowy adres email' });
          setIsLoading(false);
          return;
        }

        const validation = loginSchema.safeParse({ email, password });
        if (!validation.success) {
          const fieldErrors: Record<string, string> = {};
          validation.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setIsLoading(false);
          return;
        }

        const { error } = await login(email, password);
        if (error) {
          const translatedError = translateError(error.message);
          toast.error(translatedError);
          // Also set error in form if it's email related
          if (error.message.toLowerCase().includes('email') && error.message.toLowerCase().includes('invalid')) {
            setErrors({ email: 'Email nie wygląda poprawnie. Sprawdź format adresu email' });
          }
        } else {
          toast.success('Zalogowano pomyślnie!');
        }
      } else {
        // Validate email format first
        const emailFormatCheck = validateEmailFormat(email);
        if (!emailFormatCheck.isValid) {
          setErrors({ email: emailFormatCheck.error || 'Nieprawidłowy adres email' });
          setIsLoading(false);
          return;
        }

        // Then validate domain exists
        const emailExistsCheck = await validateEmailExists(email);
        if (!emailExistsCheck.isValid) {
          setErrors({ email: emailExistsCheck.error || 'Nieprawidłowy adres email' });
          setIsLoading(false);
          return;
        }

        const validation = signupSchema.safeParse({ email, password, fullName, schoolName });
        if (!validation.success) {
          const fieldErrors: Record<string, string> = {};
          validation.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setIsLoading(false);
          return;
        }

        // Zapobiegaj wielokrotnym próbom rejestracji w krótkim czasie
        const now = Date.now();
        const timeSinceLastAttempt = now - lastSignupAttemptRef.current;
        
        // Jeśli minęło mniej niż 5 sekund od ostatniej próby, zablokuj
        if (timeSinceLastAttempt < 5000) {
          toast.error('Proszę poczekać chwilę przed kolejną próbą rejestracji');
          setIsLoading(false);
          return;
        }
        
        // Resetuj licznik po 60 sekundach
        if (timeSinceLastAttempt > 60000) {
          signupAttemptCountRef.current = 0;
        }
        
        // Jeśli było więcej niż 3 próby w ciągu minuty, zablokuj
        if (signupAttemptCountRef.current >= 3) {
          toast.error('Zbyt wiele prób rejestracji. Poczekaj minutę i spróbuj ponownie.');
          setIsLoading(false);
          return;
        }
        
        lastSignupAttemptRef.current = now;
        signupAttemptCountRef.current += 1;

        // Use supabase.auth.signUp directly to check if email confirmation is required
        const { data: signupData, error: signupError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              school_name: schoolName,
            },
            emailRedirectTo: getEmailRedirectUrl(),
          },
        });
        
        if (signupError) {
          // Sprawdź czy to błąd rate limit (429)
          const isRateLimit = signupError.status === 429 || 
                             signupError.message?.toLowerCase().includes('rate limit') ||
                             signupError.message?.toLowerCase().includes('too many requests') ||
                             signupError.message?.toLowerCase().includes('email rate limit exceeded');
          
          if (isRateLimit) {
            const waitTime = Math.min(60, Math.pow(2, signupAttemptCountRef.current) * 5); // Exponential backoff, max 60s
            toast.error(`Zbyt wiele prób rejestracji. Poczekaj ${waitTime} sekund i spróbuj ponownie.`, {
              duration: 8000,
            });
            setErrors({ 
              email: `Zbyt wiele prób. Poczekaj ${waitTime} sekund przed kolejną próbą.` 
            });
          } else {
            const translatedError = translateError(signupError.message);
            toast.error(translatedError);
            // Set error in form if it's email related
            if (signupError.message.toLowerCase().includes('email') && signupError.message.toLowerCase().includes('invalid')) {
              setErrors({ email: 'Email nie wygląda poprawnie. Sprawdź format adresu email' });
            } else if (signupError.message.includes('User already registered')) {
              setErrors({ email: 'Użytkownik o tym adresie email już istnieje' });
            }
          }
        } else {
          // Resetuj licznik przy sukcesie
          signupAttemptCountRef.current = 0;
          
          // Check if email confirmation is required
          if (signupData.user && !signupData.session) {
            // User needs to confirm email
            setEmailConfirmationRequired(email);
            toast.success('Konto zostało utworzone! Sprawdź swoją skrzynkę e-mail, aby potwierdzić adres.');
          } else {
            toast.success('Konto zostało utworzone! Możesz się zalogować.');
          }
          setIsLogin(true);
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast.error('Wystąpił błąd. Spróbuj ponownie.');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || loadingInvitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-soft">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Render invitation signup form
  if (invitation) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-gradient-soft p-4">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
        </div>

        {/* Back to home button */}
        <Link
          to="/"
          className="absolute left-4 top-4 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-background/50 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Strona główna
        </Link>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="absolute right-4 top-4 rounded-xl"
        >
          {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </Button>

        {/* Invitation card */}
        <div className="relative z-10 w-full max-w-md animate-fade-in">
          <div className="glass-card p-8">
            {/* Logo */}
            <div className="mb-8 flex flex-col items-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary shadow-lg shadow-primary/25">
                <UserPlus className="h-8 w-8 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Zaproszenie</h1>
              <p className="mt-1 text-center text-sm text-muted-foreground">
                Zostałeś zaproszony jako <span className="font-semibold text-primary">
                  {invitation.role === 'teacher' ? 'Nauczyciel' : invitation.role === 'manager' ? 'Manager' : 'Admin'}
                </span>
              </p>
            </div>

            {/* Email Confirmation Message */}
            {emailConfirmationRequired && (
              <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">Potwierdź swój adres e-mail</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Wysłaliśmy wiadomość e-mail na adres <span className="font-medium text-foreground">{emailConfirmationRequired}</span>. 
                      Kliknij link w wiadomości, aby potwierdzić swój adres e-mail i aktywować konto.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Ważne:</strong> Bez potwierdzenia e-maila nie będziesz mógł w pełni korzystać z aplikacji.
                    </p>
                  </div>
                  <button
                    onClick={() => setEmailConfirmationRequired(null)}
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Zamknij"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Imię i nazwisko <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Jan Kowalski"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      setTouched(prev => ({ ...prev, fullName: true }));
                    }}
                    onBlur={() => setTouched(prev => ({ ...prev, fullName: true }))}
                  className={cn(
                    'rounded-xl pl-10 pr-10',
                    errors.fullName && 'border-destructive',
                    !errors.fullName && touched.fullName && fullName.length >= 2 && 'border-green-500/50'
                  )}
                    required
                  />
                  {!errors.fullName && touched.fullName && fullName.length >= 2 && (
                    <CheckCircle2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
                  )}
                  {errors.fullName && (
                    <AlertCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive" />
                  )}
                </div>
                {errors.fullName && (
                  <div className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-destructive/10 p-2">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 translate-y-0.5 text-destructive" />
                    <p className="text-xs text-destructive">{errors.fullName}</p>
                  </div>
                )}
                {!touched.fullName && (
                  <p className="mt-1 text-xs text-muted-foreground">Imię i nazwisko musi mieć minimum 2 znaki</p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Email <span className="text-muted-foreground text-xs">(zaproszenie)</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    disabled
                    className="rounded-xl pl-10 bg-muted"
                  />
                  <CheckCircle2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Email został przypisany do zaproszenia</p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Utwórz hasło <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setTouched(prev => ({ ...prev, password: true }));
                    }}
                    onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
                    className={cn(
                      'rounded-xl pl-10 pr-10',
                      errors.password && 'border-destructive',
                      !errors.password && touched.password && password.length >= 6 && 'border-green-500/50'
                    )}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>
                  {!errors.password && touched.password && password.length >= 6 && !showPassword && (
                    <CheckCircle2 className="absolute right-10 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
                  )}
                  {errors.password && !showPassword && (
                    <AlertCircle className="absolute right-10 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive" />
                  )}
                </div>
                {errors.password && (
                  <div className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-destructive/10 p-2">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 translate-y-0.5 text-destructive" />
                    <p className="text-xs text-destructive">{errors.password}</p>
                  </div>
                )}
                {!errors.password && touched.password && password.length > 0 && password.length < 6 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Hasło musi mieć minimum 6 znaków (pozostało {6 - password.length})
                  </p>
                )}
                {!errors.password && touched.password && password.length >= 6 && (
                  <p className="mt-1 text-xs text-green-600 dark:text-green-400">Hasło jest wystarczająco długie</p>
                )}
                {!touched.password && (
                  <p className="mt-1 text-xs text-muted-foreground">Hasło musi mieć minimum 6 znaków</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-gradient-primary py-5 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Utwórz konto
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-soft p-4">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
      </div>

      {/* Back to home button */}
      <Link
        to="/"
        className="absolute left-4 top-4 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-background/50 hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Strona główna
      </Link>

      {/* Theme toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="absolute right-4 top-4 rounded-xl"
      >
        {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      </Button>

      {/* Auth card */}
      <div className="relative z-10 w-full max-w-md animate-fade-in">
        <div className="glass-card p-8">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary shadow-lg shadow-primary/25">
              <GraduationCap className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">LinguaLab</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isLogin ? 'Zaloguj się do swojego konta' : 'Utwórz nowe konto szkoły'}
            </p>
          </div>

          {/* Email Confirmation Message */}
          {emailConfirmationRequired && (
            <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">Potwierdź swój adres e-mail</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Wysłaliśmy wiadomość e-mail na adres <span className="font-medium text-foreground">{emailConfirmationRequired}</span>. 
                    Kliknij link w wiadomości, aby potwierdzić swój adres e-mail i aktywować konto.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Ważne:</strong> Bez potwierdzenia e-maila nie będziesz mógł w pełni korzystać z aplikacji.
                  </p>
                </div>
                <button
                  onClick={() => setEmailConfirmationRequired(null)}
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Zamknij"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Toggle */}
          <div className="mb-6 flex rounded-xl bg-muted/50 p-1">
            <button
              onClick={() => {
                setIsLogin(true);
                setEmailConfirmationRequired(null);
              }}
              className={cn(
                'flex-1 rounded-lg py-2 text-sm font-medium transition-all',
                isLogin
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Logowanie
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setEmailConfirmationRequired(null);
              }}
              className={cn(
                'flex-1 rounded-lg py-2 text-sm font-medium transition-all',
                !isLogin
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Rejestracja
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Imię i nazwisko <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Jan Kowalski"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        setTouched(prev => ({ ...prev, fullName: true }));
                      }}
                      onBlur={() => setTouched(prev => ({ ...prev, fullName: true }))}
                  className={cn(
                    'rounded-xl pl-10 pr-10',
                    errors.fullName && 'border-destructive',
                    !errors.fullName && touched.fullName && fullName.length >= 2 && 'border-green-500/50'
                  )}
                      required
                    />
                    {!errors.fullName && touched.fullName && fullName.length >= 2 && (
                      <CheckCircle2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
                    )}
                    {errors.fullName && (
                      <AlertCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive" />
                    )}
                  </div>
                  {errors.fullName && (
                    <div className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-destructive/10 p-2">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 translate-y-0.5 text-destructive" />
                      <p className="text-xs text-destructive">{errors.fullName}</p>
                    </div>
                  )}
                  {!touched.fullName && (
                    <p className="mt-1 text-xs text-muted-foreground">Imię i nazwisko musi mieć minimum 2 znaki</p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Nazwa szkoły <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Moja Szkoła Językowa"
                      value={schoolName}
                      onChange={(e) => {
                        setSchoolName(e.target.value);
                        setTouched(prev => ({ ...prev, schoolName: true }));
                      }}
                      onBlur={() => setTouched(prev => ({ ...prev, schoolName: true }))}
                  className={cn(
                    'rounded-xl pl-10 pr-10',
                    errors.schoolName && 'border-destructive',
                    !errors.schoolName && touched.schoolName && schoolName.length >= 2 && 'border-green-500/50'
                  )}
                      required
                    />
                    {!errors.schoolName && touched.schoolName && schoolName.length >= 2 && (
                      <CheckCircle2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
                    )}
                    {errors.schoolName && (
                      <AlertCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive" />
                    )}
                  </div>
                  {errors.schoolName && (
                    <div className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-destructive/10 p-2">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 translate-y-0.5 text-destructive" />
                      <p className="text-xs text-destructive">{errors.schoolName}</p>
                    </div>
                  )}
                  {!touched.schoolName && (
                    <p className="mt-1 text-xs text-muted-foreground">Nazwa szkoły musi mieć minimum 2 znaki</p>
                  )}
                </div>
              </>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Email <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="twoj@email.pl"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setTouched(prev => ({ ...prev, email: true }));
                  }}
                  onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
                  className={cn(
                    'rounded-xl pl-10 pr-10',
                    errors.email && 'border-destructive',
                    !errors.email && email.length > 0 && !validating.email && 'border-green-500/50'
                  )}
                  required
                />
                {validating.email && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
                {!validating.email && email.length > 0 && (
                  errors.email ? (
                    <AlertCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive" />
                  ) : (
                    <CheckCircle2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
                  )
                )}
              </div>
              {errors.email && (
                <div className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-destructive/10 p-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 translate-y-0.5 text-destructive" />
                  <p className="text-xs text-destructive">{errors.email}</p>
                </div>
              )}
              {!errors.email && email.length > 0 && !validating.email && (
                <p className="mt-1 text-xs text-green-600 dark:text-green-400">Email wygląda poprawnie</p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Hasło <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setTouched(prev => ({ ...prev, password: true }));
                  }}
                  onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
                  className={cn(
                    'rounded-xl pl-10 pr-10',
                    errors.password && 'border-destructive',
                    !errors.password && touched.password && password.length >= 6 && 'border-green-500/50'
                  )}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </button>
                {!errors.password && touched.password && password.length >= 6 && !showPassword && (
                  <CheckCircle2 className="absolute right-10 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
                )}
                {errors.password && !showPassword && (
                  <AlertCircle className="absolute right-10 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive" />
                )}
              </div>
              {errors.password && (
                <div className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-destructive/10 p-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 translate-y-0.5 text-destructive" />
                  <p className="text-xs text-destructive">{errors.password}</p>
                </div>
              )}
              {!errors.password && touched.password && password.length > 0 && password.length < 6 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Hasło musi mieć minimum 6 znaków (pozostało {6 - password.length})
                </p>
              )}
              {!errors.password && touched.password && password.length >= 6 && (
                <p className="mt-1 text-xs text-green-600 dark:text-green-400">Hasło jest wystarczająco długie</p>
              )}
              {!touched.password && (
                <p className="mt-1 text-xs text-muted-foreground">Hasło musi mieć minimum 6 znaków</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-gradient-primary py-5 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Zaloguj się' : 'Utwórz konto'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isLogin ? (
              <>
                Nie masz konta?{' '}
                <button
                  onClick={() => setIsLogin(false)}
                  className="font-medium text-primary hover:underline"
                >
                  Zarejestruj się
                </button>
              </>
            ) : (
              <>
                Masz już konto?{' '}
                <button
                  onClick={() => setIsLogin(true)}
                  className="font-medium text-primary hover:underline"
                >
                  Zaloguj się
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}