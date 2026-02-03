import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, Search, Moon, Sun, CheckCircle2, AlertCircle, Clock, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MobileNav } from './MobileNav';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface TopbarProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function Topbar({ title, subtitle, actions }: TopbarProps) {
  const { theme, toggleTheme } = useTheme();
  const { profile, schoolId, role, canViewFinances } = useAuth();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [lastSeenAt, setLastSeenAt] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);

  const displayName = profile?.full_name || profile?.email || 'U';
  const roleBase = role === 'teacher' ? '/teacher' : '/admin';
  const lastSeenKey = useMemo(
    () => (profile?.id ? `topbar_last_seen_${profile.id}` : ''),
    [profile?.id]
  );

  useEffect(() => {
    if (!lastSeenKey) return;
    const stored = localStorage.getItem(lastSeenKey);
    setLastSeenAt(stored ? Number(stored) : 0);
  }, [lastSeenKey]);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const { data: notifications = [], isLoading: notificationsLoading } = useQuery({
    queryKey: ['topbar-notifications', schoolId, canViewFinances],
    queryFn: async () => {
      if (!schoolId) return [];

      const [paymentsRes, packagesRes, attendanceRes] = await Promise.all([
        canViewFinances
          ? supabase
              .from('payments')
              .select('id, amount, status, created_at, students(name)')
              .eq('school_id', schoolId)
              .order('created_at', { ascending: false })
              .limit(3)
          : Promise.resolve({ data: [] }),
        canViewFinances
          ? supabase
              .from('package_purchases')
              .select('id, total_amount, created_at, students(name)')
              .eq('school_id', schoolId)
              .order('created_at', { ascending: false })
              .limit(3)
          : Promise.resolve({ data: [] }),
        supabase
          .from('lesson_attendance')
          .select(
            `id, attended, created_at, lessons!inner (school_id, title), students (name)`
          )
          .eq('lessons.school_id', schoolId)
          .order('created_at', { ascending: false })
          .limit(3),
      ]);

      const paymentItems =
        paymentsRes.data?.map((p) => ({
          id: `payment_${p.id}`,
          title: p.status === 'paid' ? 'Płatność opłacona' : 'Płatność oczekuje',
          description: `${p.students?.name || 'Uczeń'} • ${p.amount ?? 0} PLN`,
          time: p.created_at,
          tone: p.status === 'overdue' ? 'warning' : 'success',
          href: `${roleBase}/payments`,
        })) || [];

      const packageItems =
        packagesRes.data?.map((p) => ({
          id: `package_${p.id}`,
          title: 'Nowy pakiet',
          description: `${p.students?.name || 'Uczeń'} • ${p.total_amount ?? 0} PLN`,
          time: p.created_at,
          tone: 'success',
          href: `${roleBase}/payments`,
        })) || [];

      const attendanceItems =
        attendanceRes.data?.map((a) => ({
          id: `attendance_${a.id}`,
          title: a.attended ? 'Obecność zapisana' : 'Nieobecność odnotowana',
          description: `${a.students?.name || 'Uczeń'} • ${a.lessons?.title || 'Lekcja'}`,
          time: a.created_at,
          tone: a.attended ? 'info' : 'warning',
          href: roleBase === '/teacher' ? '/teacher/lessons' : '/admin/schedule',
        })) || [];

      return [...paymentItems, ...packageItems, ...attendanceItems]
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 5);
    },
    enabled: !!schoolId,
  });

  const latestNotificationTime = useMemo(() => {
    if (!notifications.length) return 0;
    return Math.max(...notifications.map((item) => new Date(item.time).getTime()));
  }, [notifications]);

  const hasUnread = latestNotificationTime > lastSeenAt;

  const markAllRead = useCallback(() => {
    if (!lastSeenKey || !latestNotificationTime) return;
    localStorage.setItem(lastSeenKey, String(latestNotificationTime));
    setLastSeenAt(latestNotificationTime);
  }, [lastSeenKey, latestNotificationTime]);

  const formatTimeAgo = useCallback((dateValue: string) => {
    const target = new Date(dateValue);
    if (Number.isNaN(target.getTime())) return '';
    const diffMs = Date.now() - target.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 1) return 'przed chwilą';
    if (diffMinutes < 60) return `${diffMinutes} min temu`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} godz. temu`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} dni temu`;
    return target.toLocaleDateString('pl-PL');
  }, []);

  return (
    <header
      className={cn(
        'app-topbar sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/50 px-4 backdrop-blur-xl lg:px-6',
        isScrolled ? 'bg-background/45' : 'bg-background/65'
      )}
    >
      <div className="flex items-center gap-3">
        <MobileNav />
        <div>
          {title && <h1 className="text-lg font-semibold text-foreground lg:text-xl">{title}</h1>}
          {subtitle && (
            <p className="hidden text-sm text-muted-foreground sm:block">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Custom actions */}
        {actions}

        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Szukaj..."
            className="w-48 rounded-xl border-border/50 bg-muted/50 pl-10 focus:bg-background lg:w-64"
          />
        </div>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary"
        >
          {theme === 'light' ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </Button>

        {/* Notifications */}
        <Popover
          open={notificationsOpen}
          onOpenChange={(open) => {
            setNotificationsOpen(open);
            if (!open) {
              markAllRead();
            }
          }}
        >
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary"
            >
              <Bell className="h-4 w-4" />
              {hasUnread && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" sideOffset={8} className="w-80 rounded-2xl p-0">
            <div className="border-b border-border/60 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Powiadomienia</p>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {notifications.length}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Ostatnie aktywności w systemie</p>
            </div>
            <div className="max-h-72 overflow-auto p-2">
              {notificationsLoading && (
                <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Ładowanie powiadomień...
                </div>
              )}
              {!notificationsLoading && notifications.length === 0 && (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  Brak nowych powiadomień
                </div>
              )}
              {notifications.map((item) => {
                const toneClass =
                  item.tone === 'success'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : item.tone === 'warning'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
                const Icon =
                  item.tone === 'success' ? CheckCircle2 : item.tone === 'warning' ? AlertCircle : Clock;
                const timeLabel = formatTimeAgo(item.time);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      markAllRead();
                      setNotificationsOpen(false);
                      navigate(item.href);
                    }}
                    className="group flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-muted/60"
                  >
                    <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl ${toneClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{timeLabel}</span>
                  </button>
                );
              })}
            </div>
            <div className="border-t border-border/60 px-4 py-3 text-center">
              <button className="text-xs font-medium text-primary hover:underline">
                Zobacz wszystkie
              </button>
            </div>
          </PopoverContent>
        </Popover>

        {/* User avatar - hidden on mobile since it's in the mobile nav */}
        <div className="avatar-bubble hidden sm:flex">
          {displayName.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
