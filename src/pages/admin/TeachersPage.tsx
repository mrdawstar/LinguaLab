import { useState, useMemo } from 'react';
import { Plus, Search, Edit, Trash2, GraduationCap, Loader2, ExternalLink, AlertTriangle } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTeachers, Teacher } from '@/hooks/useTeachers';
import { useStudents } from '@/hooks/useStudents';
import { useGroups } from '@/hooks/useGroups';
import { useLessons } from '@/hooks/useLessons';
import { useAuth } from '@/contexts/AuthContext';
import { TeacherDialog } from '@/components/admin/TeacherDialog';
import { TeacherDetailsSheet } from '@/components/admin/TeacherDetailsSheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function TeachersPage() {
  const { teachers, isLoading, deleteTeacher, deleteTeacherWithRelations, unlinkTeacher } = useTeachers();
  const { students } = useStudents();
  const { groups } = useGroups();
  const { lessons } = useLessons();
  const { role, canManageData } = useAuth();
  
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [unlinkId, setUnlinkId] = useState<string | null>(null);
  const [viewingTeacher, setViewingTeacher] = useState<Teacher | null>(null);

  const getContactValue = (teacher: Teacher) => {
    const entries = [
      teacher.email ?? null,
      teacher.instagram ?? null,
      teacher.phone ?? null,
      teacher.meeting_link ?? null,
    ].filter(Boolean) as string[];

    if (entries.length > 1) {
      return teacher.email ?? entries[0] ?? null;
    }

    return entries[0] ?? null;
  };

  const normalizedSearch = search.toLowerCase();
  const filteredTeachers = teachers.filter(
    (t) =>
      t.name.toLowerCase().includes(normalizedSearch) ||
      (t.email ?? '').toLowerCase().includes(normalizedSearch) ||
      (t.instagram ?? '').toLowerCase().includes(normalizedSearch) ||
      (t.phone ?? '').toLowerCase().includes(normalizedSearch) ||
      (t.meeting_link ?? '').toLowerCase().includes(normalizedSearch) ||
      (t.languages?.some((l) => l.toLowerCase().includes(normalizedSearch)) ?? false)
  );

  const getStudentCount = (teacherId: string) =>
    students.filter((s) => s.teacher_id === teacherId).length;

  const getGroupCount = (teacherId: string) =>
    groups.filter((g) => g.teacher_id === teacherId).length;

  const getLessonCount = (teacherId: string) =>
    lessons.filter((l) => l.teacher_id === teacherId).length;

  const deleteTeacherInfo = useMemo(() => {
    if (!deleteId) return null;
    const studentCount = getStudentCount(deleteId);
    const groupCount = getGroupCount(deleteId);
    const lessonCount = getLessonCount(deleteId);
    const hasRelations = studentCount > 0 || groupCount > 0 || lessonCount > 0;
    return { studentCount, groupCount, lessonCount, hasRelations };
  }, [deleteId, students, groups, lessons]);

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setDialogOpen(true);
  };

  const handleView = (teacher: Teacher) => {
    setViewingTeacher(teacher);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteTeacher.mutate(deleteId);
      setDeleteId(null);
    }
  };

  const handleDeleteWithRelations = () => {
    if (deleteId) {
      deleteTeacherWithRelations.mutate(deleteId);
      setDeleteId(null);
    }
  };

  const handleUnlink = () => {
    if (unlinkId) {
      unlinkTeacher.mutate(unlinkId);
      setUnlinkId(null);
      if (viewingTeacher?.id === unlinkId) setViewingTeacher(null);
    }
  };

  return (
    <DashboardLayout 
      title="Nauczyciele" 
      subtitle="Zarządzaj nauczycielami" 
      requiredRole={['admin', 'manager']}
    >
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        {/* Header */}
        <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Szukaj nauczycieli..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {canManageData && (
            <Button
              onClick={() => {
                setEditingTeacher(null);
                setDialogOpen(true);
              }}
              className="w-full rounded-xl bg-gradient-primary sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              Dodaj nauczyciela
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-3 sm:hidden">
              {filteredTeachers.map((teacher) => (
                <div 
                  key={teacher.id} 
                  onClick={() => handleView(teacher)}
                  className="cursor-pointer rounded-xl border border-border bg-background p-4 transition-all hover:shadow-md hover:border-primary/30"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full text-white dark:text-black"
                        style={{ backgroundColor: teacher.calendar_color || '#3b82f6' }}
                      >
                        <GraduationCap className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{teacher.name}</p>
                        {getContactValue(teacher) ? (
                          <p className="text-xs text-muted-foreground">{getContactValue(teacher)}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">Brak kontaktu</p>
                        )}
                      </div>
                    </div>
                    {canManageData && (
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        {teacher.meeting_link && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(teacher.meeting_link || '', '_blank', 'noopener,noreferrer')}
                            className="h-8 w-8"
                            title="Otwórz link do zajęć"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(teacher)}
                          className="h-8 w-8"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(teacher.id)}
                          className="h-8 w-8 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {teacher.languages?.map((lang) => (
                      <span key={lang} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                        {lang}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                    <span>{getStudentCount(teacher.id)} uczniów</span>
                    <span>{getGroupCount(teacher.id)} grup</span>
                  </div>
                </div>
              ))}
              {filteredTeachers.length === 0 && (
                <p className="py-8 text-center text-muted-foreground">Nie znaleziono nauczycieli</p>
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nauczyciel</TableHead>
                    <TableHead>Języki</TableHead>
                    <TableHead>Uczniowie</TableHead>
                    <TableHead>Grupy</TableHead>
                    <TableHead>Kontakt</TableHead>
                    {canManageData && <TableHead className="text-right">Akcje</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeachers.map((teacher) => (
                    <TableRow 
                      key={teacher.id}
                      onClick={() => handleView(teacher)}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-9 w-9 items-center justify-center rounded-full text-white dark:text-black"
                            style={{ backgroundColor: teacher.calendar_color || '#3b82f6' }}
                          >
                            <GraduationCap className="h-4 w-4" />
                          </div>
                          <p className="font-medium">{teacher.name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {teacher.languages?.map((lang) => (
                            <span key={lang} className="rounded bg-muted px-2 py-0.5 text-xs">
                              {lang}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{getStudentCount(teacher.id)}</TableCell>
                      <TableCell>{getGroupCount(teacher.id)}</TableCell>
                      <TableCell>
                        {getContactValue(teacher) ? (
                          <p className="text-sm">{getContactValue(teacher)}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">Brak kontaktu</p>
                        )}
                      </TableCell>
                      {canManageData && (
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            {teacher.meeting_link && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(teacher.meeting_link || '', '_blank', 'noopener,noreferrer')}
                                className="h-8 w-8"
                                title="Otwórz link do zajęć"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(teacher)}
                              className="h-8 w-8"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(teacher.id)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {filteredTeachers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={canManageData ? 6 : 5} className="py-8 text-center text-muted-foreground">
                        Nie znaleziono nauczycieli
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      <TeacherDialog open={dialogOpen} onOpenChange={setDialogOpen} teacher={editingTeacher} />

      <TeacherDetailsSheet
        teacher={viewingTeacher}
        open={!!viewingTeacher}
        onOpenChange={(open) => !open && setViewingTeacher(null)}
        students={students}
        groups={groups}
        onEdit={() => {
          if (viewingTeacher) {
            handleEdit(viewingTeacher);
          }
        }}
        onUnlink={canManageData ? (id) => setUnlinkId(id) : undefined}
        canManageData={canManageData}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć tego nauczyciela?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {deleteTeacherInfo?.hasRelations ? (
                  <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-medium text-amber-700 dark:text-amber-400">
                          Uwaga! Nauczyciel ma przypisane elementy:
                        </p>
                        <ul className="text-sm text-amber-600 dark:text-amber-300 list-disc list-inside">
                          {deleteTeacherInfo.lessonCount > 0 && (
                            <li>{deleteTeacherInfo.lessonCount} lekcji w harmonogramie (zostaną usunięte)</li>
                          )}
                          {deleteTeacherInfo.studentCount > 0 && (
                            <li>{deleteTeacherInfo.studentCount} uczniów (zostaną odłączeni)</li>
                          )}
                          {deleteTeacherInfo.groupCount > 0 && (
                            <li>{deleteTeacherInfo.groupCount} grup (zostaną odłączone)</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p>Ta akcja jest nieodwracalna. Nauczyciel zostanie trwale usunięty z systemu.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            {deleteTeacherInfo?.hasRelations ? (
              <AlertDialogAction
                onClick={handleDeleteWithRelations}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Usuń wraz z powiązaniami
              </AlertDialogAction>
            ) : (
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Usuń
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!unlinkId} onOpenChange={() => setUnlinkId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Odłączyć konto tego nauczyciela?</AlertDialogTitle>
            <AlertDialogDescription>
              Nauczyciel straci dostęp do systemu (nie będzie mógł się zalogować). Rekord nauczyciela zostanie – będzie widoczny w zaproszeniach jako „bez konta” i będzie go można ponownie zaprosić.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnlink}>
              Odłącz konto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
