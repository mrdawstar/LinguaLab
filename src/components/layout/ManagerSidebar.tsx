import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  Calendar, 
  BookOpen,
  UserPlus,
  ChevronLeft,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const managerNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/manager' },
  { icon: Users, label: 'Uczniowie', path: '/manager/students' },
  { icon: GraduationCap, label: 'Nauczyciele', path: '/manager/teachers' },
  { icon: BookOpen, label: 'Grupy', path: '/manager/groups' },
  { icon: Calendar, label: 'Harmonogram', path: '/manager/schedule' },
  { icon: UserPlus, label: 'Zaproszenia', path: '/manager/invitations' },
];

export function ManagerSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { profile, logout } = useAuth();

  const displayName = profile?.full_name || profile?.email || 'Manager';

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 hidden h-screen border-r border-border/50 bg-card/80 backdrop-blur-xl transition-all duration-300 lg:block',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-border/50 px-4">
        {!collapsed && (
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-foreground">LinguaLab</span>
          </Link>
        )}
        {collapsed && (
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-muted hover:text-foreground',
            collapsed && 'absolute -right-3 top-6 z-50 bg-card border shadow-sm'
          )}
        >
          <ChevronLeft
            className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-3">
        {managerNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 rounded-xl px-4 py-3 text-muted-foreground transition-all duration-200',
                isActive 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md' 
                  : 'hover:bg-muted hover:text-foreground',
                collapsed && 'justify-center px-3'
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-border/50 p-3">
        <div
          className={cn(
            'flex items-center gap-3 rounded-xl p-3 transition-colors',
            collapsed && 'justify-center'
          )}
        >
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-medium text-white">
            {displayName.charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-foreground">
                {displayName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                Manager
              </p>
            </div>
          )}
          <button
            onClick={logout}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive',
              collapsed && 'absolute -right-2 bottom-6'
            )}
            title="Wyloguj"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
