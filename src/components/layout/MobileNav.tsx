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
  Crown,
  ChevronRight,
  UserPlus
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const adminNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: Users, label: 'Uczniowie', path: '/admin/students' },
  { icon: GraduationCap, label: 'Nauczyciele', path: '/admin/teachers' },
  { icon: BookOpen, label: 'Grupy', path: '/admin/groups' },
  { icon: Calendar, label: 'Harmonogram', path: '/admin/schedule' },
  { icon: CreditCard, label: 'Płatności', path: '/admin/payments' },
  { icon: ClipboardCheck, label: 'Zaproszenia', path: '/admin/invitations' },
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
  { icon: ClipboardCheck, label: 'Zaproszenia', path: '/admin/invitations' },
  { icon: Settings, label: 'Ustawienia', path: '/admin/settings' },
];

const teacherNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/teacher' },
  { icon: BookOpen, label: 'Moje zajęcia', path: '/teacher/lessons' },
  { icon: Users, label: 'Moi uczniowie', path: '/teacher/students' },
  { icon: Settings, label: 'Ustawienia', path: '/teacher/settings' },
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
        <Button 
          variant="ghost" 
          size="icon" 
          className="lg:hidden relative hover:bg-primary/10 transition-all duration-200"
        >
          <Menu className="h-5 w-5 transition-transform duration-200" />
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="left" 
        className="app-mobile-nav w-[280px] sm:w-[320px] p-0 border-r border-border/50 bg-background/95 backdrop-blur-xl"
      >
        {/* Header with gradient */}
        <div className="relative flex h-20 items-center justify-between border-b border-border/50 px-6 bg-gradient-to-br from-primary/5 via-background to-background">
          <Link 
            to="/" 
            className="flex items-center gap-3 group" 
            onClick={() => setOpen(false)}
          >
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-primary shadow-lg shadow-primary/25 transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-primary/30">
              <GraduationCap className="h-6 w-6 text-primary-foreground transition-transform duration-300 group-hover:rotate-12" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-foreground tracking-tight">LinguaLab</span>
              <span className="text-xs text-muted-foreground">System CRM</span>
            </div>
          </Link>
        </div>

        {/* Navigation with smooth scroll */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          <div className="space-y-1.5">
            {navItems.map((item, index) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium transition-all duration-200',
                    'hover:scale-[1.02] active:scale-[0.98]',
                    isActive 
                      ? 'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/20' 
                      : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                  )}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-primary-foreground/30" />
                  )}
                  
                  {/* Icon */}
                  <div className={cn(
                    'relative flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200',
                    isActive 
                      ? 'bg-primary-foreground/20' 
                      : 'bg-muted/50 group-hover:bg-primary/10'
                  )}>
                    <item.icon className={cn(
                      'h-5 w-5 transition-all duration-200',
                      isActive 
                        ? 'text-primary-foreground scale-110' 
                        : 'text-muted-foreground group-hover:text-primary group-hover:scale-110'
                    )} />
                  </div>
                  
                  {/* Label */}
                  <span className="flex-1 font-semibold">{item.label}</span>
                  
                  {/* Chevron for active */}
                  {isActive && (
                    <ChevronRight className="h-4 w-4 text-primary-foreground/70 animate-in slide-in-from-right-2" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User section with improved design */}
        <div className="border-t border-border/50 bg-gradient-to-t from-muted/30 to-transparent p-4">
          <div className="flex items-center gap-3 rounded-2xl bg-card/50 p-3.5 backdrop-blur-sm border border-border/50 shadow-sm">
            <Avatar className="h-11 w-11 border-2 border-primary/20 shadow-md">
              <AvatarFallback className="bg-gradient-primary text-primary-foreground font-bold text-sm">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {displayName}
              </p>
              <p className="truncate text-xs text-muted-foreground font-medium">
                {role === 'admin' ? '👑 Administrator' : role === 'manager' ? '📊 Manager' : '👨‍🏫 Nauczyciel'}
              </p>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                logout();
                setOpen(false);
              }}
              className="h-9 w-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200 hover:scale-110 rounded-lg"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
