import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, role, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        navigate('/auth');
      } else if (allowedRoles && role && !allowedRoles.includes(role)) {
        // Redirect to user's appropriate dashboard
        navigate(`/${role}`);
      }
    }
  }, [isAuthenticated, role, isLoading, allowedRoles, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-soft">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return null;
  }

  return <>{children}</>;
}
