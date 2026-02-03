import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Teacher } from '@/hooks/useTeachers';
import { Student } from '@/hooks/useStudents';
import { Tables } from '@/integrations/supabase/types';
import { 
  GraduationCap, 
  Mail, 
  Phone, 
  Globe, 
  Users, 
  User,
  Instagram,
  Video,
  Edit,
  ExternalLink,
  Palette
} from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface TeacherDetailsSheetProps {
  teacher: Teacher | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students?: Student[];
  groups?: Tables<'groups'>[];
  onEdit?: () => void;
  canManageData?: boolean;
}

export function TeacherDetailsSheet({
  teacher,
  open,
  onOpenChange,
  students = [],
  groups = [],
  onEdit,
  canManageData
}: TeacherDetailsSheetProps) {
  if (!teacher) return null;

  const teacherStudents = students.filter(s => s.teacher_id === teacher.id);
  const teacherGroups = groups.filter(g => g.teacher_id === teacher.id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="text-left">
          <div className="flex items-center gap-4">
            <div 
              className="flex h-16 w-16 items-center justify-center rounded-2xl text-white dark:text-black"
              style={{ backgroundColor: teacher.calendar_color || '#3b82f6' }}
            >
              <GraduationCap className="h-8 w-8" />
            </div>
            <div>
              <SheetTitle className="text-xl">{teacher.name}</SheetTitle>
              <div className="mt-1 flex flex-wrap gap-1">
                {teacher.languages?.map((lang) => (
                  <Badge key={lang} variant="secondary" className="text-xs">
                    {lang}
                  </Badge>
                ))}
              </div>
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
          {/* Statystyki */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 to-primary/10 p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-primary">
                <User className="h-5 w-5" />
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">{teacherStudents.length}</p>
              <p className="text-xs text-muted-foreground">Uczniów</p>
            </div>
            <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 to-primary/10 p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">{teacherGroups.length}</p>
              <p className="text-xs text-muted-foreground">Grup</p>
            </div>
          </div>

          {/* Dane kontaktowe */}
          <div>
            <h4 className="mb-3 text-sm font-medium text-muted-foreground">Dane kontaktowe</h4>
            <div className="space-y-3">
              {teacher.email && (
                <div className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${teacher.email}`} className="text-sm hover:text-primary hover:underline">
                    {teacher.email}
                  </a>
                </div>
              )}
              {teacher.phone && (
                <div className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${teacher.phone}`} className="text-sm hover:text-primary hover:underline">
                    {teacher.phone}
                  </a>
                </div>
              )}
              {teacher.instagram && (
                <div className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2">
                  <Instagram className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={`https://instagram.com/${teacher.instagram.replace('@', '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm hover:text-primary hover:underline"
                  >
                    {teacher.instagram}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              {teacher.meeting_link && (
                <div className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2">
                  <Video className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={teacher.meeting_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 truncate text-sm hover:text-primary hover:underline"
                  >
                    Link do zajęć online
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Kolor kalendarza */}
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
            <div 
              className="h-8 w-8 rounded-lg"
              style={{ backgroundColor: teacher.calendar_color || '#3b82f6' }}
            />
            <div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Palette className="h-4 w-4" />
                <span className="text-xs">Kolor kalendarza</span>
              </div>
              <p className="text-sm font-medium">{teacher.calendar_color || '#3b82f6'}</p>
            </div>
          </div>

          {/* Lista uczniów */}
          {teacherStudents.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="mb-3 text-sm font-medium text-muted-foreground">
                  Przypisani uczniowie ({teacherStudents.length})
                </h4>
                <div className="max-h-48 space-y-2 overflow-y-auto scrollbar-none pr-1">
                  {teacherStudents.slice(0, 10).map((student) => (
                    <div key={student.id} className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="flex-1 truncate">
                        <p className="text-sm font-medium">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.language} • {student.level}</p>
                      </div>
                    </div>
                  ))}
                  {teacherStudents.length > 10 && (
                    <p className="text-center text-xs text-muted-foreground">
                      +{teacherStudents.length - 10} więcej...
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Lista grup */}
          {teacherGroups.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="mb-3 text-sm font-medium text-muted-foreground">
                  Prowadzone grupy ({teacherGroups.length})
                </h4>
                <div className="max-h-48 space-y-2 overflow-y-auto scrollbar-none pr-1">
                  {teacherGroups.map((group) => (
                    <div key={group.id} className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Users className="h-4 w-4" />
                      </div>
                      <div className="flex-1 truncate">
                        <p className="text-sm font-medium">{group.name}</p>
                        <p className="text-xs text-muted-foreground">{group.language} • {group.level}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Data utworzenia */}
          <div className="rounded-lg bg-muted/30 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              Dodany: {format(new Date(teacher.created_at), 'd MMMM yyyy', { locale: pl })}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
