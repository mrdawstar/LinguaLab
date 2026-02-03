import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Loader2 } from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  requiredRole?: UserRole | UserRole[];
  actions?: ReactNode;
}

export function DashboardLayout({ 
  children, 
  title, 
  subtitle, 
  requiredRole,
  actions 
}: DashboardLayoutProps) {
  const { isAuthenticated, role, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        navigate('/auth');
      } else if (requiredRole) {
        const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        if (role && !allowedRoles.includes(role)) {
          // Manager uses admin routes, so redirect to /admin instead of /manager
          const redirectPath = role === 'manager' ? '/admin' : `/${role}`;
          navigate(redirectPath);
        }
      }
    }
  }, [isAuthenticated, role, isLoading, requiredRole, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <div className="flex-1 lg:pl-64">
        <Topbar title={title} subtitle={subtitle} actions={actions} />
        <main className="page-fade-in px-4 pb-4 pt-3 lg:px-6 lg:pb-6 lg:pt-4">
          {children}
        </main>
      </div>
    </div>
  );
}
