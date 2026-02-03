import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Student } from '@/hooks/useStudents';
import { Teacher } from '@/hooks/useTeachers';
import { Tables } from '@/integrations/supabase/types';
import { StudentPaymentStatus } from '@/components/payments/StudentPaymentStatus';
import { 
  User, 
  Mail, 
  Phone, 
  Globe, 
  GraduationCap, 
  Users, 
  Calendar,
  Instagram,
  CreditCard,
  Edit,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface StudentDetailsSheetProps {
  student: Student | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher?: Teacher | null;
  group?: Tables<'groups'> | null;
  onEdit?: () => void;
  canViewFinances?: boolean;
  canManageData?: boolean;
}

export function StudentDetailsSheet({
  student,
  open,
  onOpenChange,
  teacher,
  group,
  onEdit,
  canViewFinances,
  canManageData
}: StudentDetailsSheetProps) {
  if (!student) return null;

  const statusColors = {
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    paused: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    inactive: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  };

  const statusLabels = {
    active: 'Aktywny',
    paused: 'Wstrzymany',
    inactive: 'Nieaktywny',
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="text-left">
          <div className="flex items-center gap-4">
            <div className={`flex h-16 w-16 items-center justify-center rounded-2xl text-white dark:text-black ${
              student.payment_status === 'no_payment' 
                ? 'bg-rose-500 text-white' 
                : student.payment_status === 'warning' 
                ? 'bg-amber-500 text-white'
                : 'bg-gradient-primary text-white'
            }`}>
              <User className="h-8 w-8" />
            </div>
            <div>
              <SheetTitle className="text-xl">{student.name}</SheetTitle>
              <Badge className={statusColors[student.status as keyof typeof statusColors] || statusColors.inactive}>
                {statusLabels[student.status as keyof typeof statusLabels] || student.status}
              </Badge>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-4 space-y-6">
          {canManageData && onEdit && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => { onOpenChange(false); onEdit(); }}>
                <Edit className="mr-2 h-4 w-4" />
                Edytuj
              </Button>
            </div>
          )}
          {/* Status płatności */}
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <h4 className="mb-3 text-sm font-medium text-muted-foreground">Status płatności</h4>
            <StudentPaymentStatus 
              status={student.payment_status as any} 
              showDetails={canViewFinances}
            />
          </div>

          {/* Dane kontaktowe */}
          <div>
            <h4 className="mb-3 text-sm font-medium text-muted-foreground">Dane kontaktowe</h4>
            <div className="space-y-3">
              {student.email && (
                <div className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${student.email}`} className="text-sm hover:text-primary hover:underline">
                    {student.email}
                  </a>
                </div>
              )}
              {student.phone && (
                <div className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${student.phone}`} className="text-sm hover:text-primary hover:underline">
                    {student.phone}
                  </a>
                </div>
              )}
              {student.instagram && (
                <div className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2">
                  <Instagram className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={`https://instagram.com/${student.instagram.replace('@', '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm hover:text-primary hover:underline"
                  >
                    {student.instagram}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Nauka */}
          <div>
            <h4 className="mb-3 text-sm font-medium text-muted-foreground">Nauka</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  <span className="text-xs">Język</span>
                </div>
                <p className="mt-1 font-medium">{student.language}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <GraduationCap className="h-4 w-4" />
                  <span className="text-xs">Poziom</span>
                </div>
                <p className="mt-1 font-medium">{student.level}</p>
              </div>
            </div>
          </div>

          {/* Nauczyciel i grupa */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span className="text-xs">Nauczyciel</span>
              </div>
              <p className="mt-1 font-medium">{teacher?.name || '-'}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span className="text-xs">Grupa</span>
              </div>
              <p className="mt-1 truncate font-medium">{group?.name || '-'}</p>
            </div>
          </div>

          {/* Finanse */}
          {canViewFinances && (
            <>
              <Separator />
              <div>
                <h4 className="mb-3 text-sm font-medium text-muted-foreground">Finanse</h4>
                <div className="grid grid-cols-2 gap-3">
                  {student.package_hours !== null && student.package_hours !== undefined && student.package_hours > 0 && (
                    <div className="rounded-lg border border-border bg-card p-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span className="text-xs">Pakiet godzin</span>
                      </div>
                      <p className="mt-1 font-medium">
                        {student.package_used_hours || 0} / {student.package_hours} h
                      </p>
                    </div>
                  )}
                </div>
                {student.package_expires_at && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Pakiet wygasa: {format(new Date(student.package_expires_at), 'd MMMM yyyy', { locale: pl })}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Data utworzenia */}
          <div className="rounded-lg bg-muted/30 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              Dodany: {format(new Date(student.created_at), 'd MMMM yyyy', { locale: pl })}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
