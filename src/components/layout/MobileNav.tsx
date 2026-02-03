import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  Calendar, 
  CreditCard, 
  Settings, 
  BookOpen,
  ClipboardCheck,
  LogOut,
  Menu,
  X,
  Crown
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const adminNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: Users, label: 'Uczniowie', path: '/admin/students' },
  { icon: GraduationCap, label: 'Nauczyciele', path: '/admin/teachers' },
  { icon: BookOpen, label: 'Grupy', path: '/admin/groups' },
  { icon: Calendar, label: 'Harmonogram', path: '/admin/schedule' },
  { icon: CreditCard, label: 'Płatności', path: '/admin/payments' },
  { icon: Crown, label: 'Subskrypcja', path: '/admin/subscription' },
  { icon: Settings, label: 'Ustawienia', path: '/admin/settings' },
];

const managerNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: Users, label: 'Uczniowie', path: '/admin/students' },
  { icon: GraduationCap, label: 'Nauczyciele', path: '/admin/teachers' },
  { icon: BookOpen, label: 'Grupy', path: '/admin/groups' },
  { icon: Calendar, label: 'Harmonogram', path: '/admin/schedule' },
  { icon: CreditCard, label: 'Płatności', path: '/admin/payments' },
  { icon: Settings, label: 'Ustawienia', path: '/admin/settings' },
];

const teacherNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/teacher' },
  { icon: BookOpen, label: 'Moje zajęcia', path: '/teacher/lessons' },
  { icon: ClipboardCheck, label: 'Obecności', path: '/teacher/attendance' },
  { icon: Users, label: 'Moi uczniowie', path: '/teacher/students' },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { profile, role, logout } = useAuth();

  const navItems = role === 'admin' ? adminNavItems : role === 'manager' ? managerNavItems : teacherNavItems;
  const displayName = profile?.full_name || profile?.email || 'Użytkownik';

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="app-mobile-nav w-72 p-0 border-r border-border/50">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-border/50 px-4">
          <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground">LinguaLab</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 p-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-muted-foreground transition-all duration-200',
                  isActive 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-border/50 p-4">
          <div className="flex items-center gap-3 rounded-xl p-3">
            <div className="avatar-bubble flex-shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-foreground">
                {displayName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {role === 'admin' ? 'Administrator' : role === 'manager' ? 'Manager' : 'Nauczyciel'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                logout();
                setOpen(false);
              }}
              className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
