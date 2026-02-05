import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Group } from '@/hooks/useGroups';
import { Teacher } from '@/hooks/useTeachers';
import { Student } from '@/hooks/useStudents';
import { Users, User, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface GroupDetailsSheetProps {
  group: Group | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher?: Teacher | null;
  students?: Student[];
  onEdit?: () => void;
  canManageData?: boolean;
}

export function GroupDetailsSheet({
  group,
  open,
  onOpenChange,
  teacher,
  students = [],
  onEdit,
  canManageData,
}: GroupDetailsSheetProps) {
  if (!group) return null;

  const groupStudents = students.filter((student) => student.group_id === group.id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="text-left">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Users className="h-8 w-8" />
            </div>
            <div>
              <SheetTitle className="text-xl">{group.name}</SheetTitle>
              <div className="mt-1 flex flex-wrap gap-1">
                <Badge variant="secondary" className="text-xs">
                  {group.language}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {group.level}
                </Badge>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-4 space-y-6">
          {canManageData && onEdit && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onEdit();
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edytuj
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span className="text-xs">Nauczyciel</span>
              </div>
              <p className="mt-1 truncate font-medium">{teacher?.name || '-'}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span className="text-xs">Uczniowie</span>
              </div>
              <p className="mt-1 font-medium">
                {groupStudents.length} / {group.max_students}
              </p>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="mb-3 text-sm font-medium text-muted-foreground">
              Przypisani uczniowie ({groupStudents.length})
            </h4>
            {groupStudents.length > 0 ? (
              <div className="max-h-60 space-y-2 overflow-y-auto scrollbar-none pr-1">
                {groupStudents.map((student) => (
                  <div key={student.id} className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="flex-1 truncate">
                      <p className="text-sm font-medium">{student.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {student.language}{student.level ? ` • ${student.level}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Brak przypisanych uczniów</p>
            )}
          </div>

          <div className="rounded-lg bg-muted/30 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              Dodana: {format(new Date(group.created_at), 'd MMMM yyyy', { locale: pl })}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
