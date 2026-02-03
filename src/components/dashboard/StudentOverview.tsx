import { useMemo, useState } from 'react';
import { MoreHorizontal, Eye, Pencil, CreditCard, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useStudents, Student } from '@/hooks/useStudents';
import { useGroups } from '@/hooks/useGroups';
import { usePackages } from '@/hooks/usePackages';
import { StudentDialog } from '@/components/admin/StudentDialog';

export function StudentOverview() {
  const { schoolId, role } = useAuth();
  const navigate = useNavigate();
  const studentsPath = role === 'teacher' ? '/teacher/students' : '/admin/students';
  const { students, isLoading } = useStudents();
  const { groups } = useGroups();
  const { packages } = usePackages();
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const hasData = students.length > 0;
  const getGroupName = (id?: string | null) => groups.find((g) => g.id === id)?.name || 'Brak grupy';

  const toNumber = (value: unknown) => {
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? num : 0;
  };

  const lessonsByStudent = useMemo(() => {
    const map = new Map<string, { remaining: number; total: number }>();
    for (const pkg of packages) {
      if (pkg.status !== 'active' && pkg.status !== null) continue;
      const total = toNumber((pkg as any).lessons_total ?? (pkg as any).hours_purchased);
      if (!map.has(pkg.student_id)) {
        map.set(pkg.student_id, { remaining: 0, total: 0 });
      }
      const entry = map.get(pkg.student_id)!;
      const used = toNumber(pkg.lessons_used);
      const remaining = Math.max(0, total - used);
      entry.remaining += remaining;
      entry.total += total;
    }
    return map;
  }, [packages]);

  const handleView = (student: Student) => {
    navigate(studentsPath, { state: { viewStudentId: student.id } });
  };
  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setDialogOpen(true);
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm sm:p-6 h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground sm:text-lg">Przegląd uczniów</h3>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {hasData ? 'Top 5 według frekwencji' : 'Dodaj uczniów, aby zobaczyć przegląd'}
          </p>
        </div>
        {hasData && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(studentsPath)}
            className="h-8 rounded-full border-border/60 bg-background/50 text-xs font-semibold text-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary sm:text-sm"
          >
            Zobacz wszystkich
          </Button>
        )}
      </div>

      <div className="flex-1 flex flex-col">
      {!hasData ? (
        <div className="flex h-full lg:h-[320px] min-h-[200px] flex-col items-center justify-center gap-3">
          <Users className="h-12 w-12 text-muted-foreground/30" />
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground">Brak uczniów</p>
            <p className="text-xs text-muted-foreground/70">Dodaj uczniów, aby zobaczyć ich przegląd</p>
          </div>
        </div>
      ) : (
        <>
          <div className="max-h-80 space-y-3 overflow-auto pr-1 scrollbar-none">
            {students.map((student) => {
              const lessons = lessonsByStudent.get(student.id);
              const remaining = lessons?.remaining ?? 0;
              const total = lessons?.total ?? 0;
              return (
                <div
                  key={student.id}
                  className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-sm font-medium text-primary-foreground">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground sm:text-base">{student.name}</p>
                        <p className="text-xs text-muted-foreground sm:text-sm">{getGroupName(student.group_id)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
                        onClick={() => handleView(student)}
                        aria-label="Podgląd ucznia"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
                        onClick={() => handleEdit(student)}
                        aria-label="Edytuj ucznia"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
                            aria-label="Akcje ucznia"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(student)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Podgląd
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(student)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edytuj
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate('/admin/payments')}>
                            <CreditCard className="mr-2 h-4 w-4" />
                            Płatności
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-border/50 bg-muted/40 px-3 py-2 text-xs text-muted-foreground sm:text-sm">
                    {total > 0 ? (
                      <span className="font-medium text-foreground">Pozostało: {remaining} / {total}</span>
                    ) : (
                      <span>Brak aktywnego pakietu</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      </div>

      <StudentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        student={editingStudent}
      />
    </div>
  );
}
