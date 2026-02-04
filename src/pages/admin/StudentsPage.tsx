import { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2, User, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useStudents, Student } from '@/hooks/useStudents';
import { useTeachers } from '@/hooks/useTeachers';
import { useGroups } from '@/hooks/useGroups';
import { useAuth } from '@/contexts/AuthContext';
import { StudentDialog } from '@/components/admin/StudentDialog';
import { StudentDetailsSheet } from '@/components/admin/StudentDetailsSheet';
import { StudentPaymentStatus } from '@/components/payments/StudentPaymentStatus';
import { cn } from '@/lib/utils';
import { useLocation, useNavigate } from 'react-router-dom';
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

export default function StudentsPage() {
  const { students, isLoading, deleteStudent } = useStudents();
  const { teachers } = useTeachers();
  const { groups } = useGroups();
  const { canViewFinances, role, canManageData } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);

  useEffect(() => {
    const state = location.state as { viewStudentId?: string } | null;
    if (!state?.viewStudentId || viewingStudent) return;
    const student = students.find((item) => item.id === state.viewStudentId);
    if (student) {
      setViewingStudent(student);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, students, viewingStudent, navigate]);

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.language.toLowerCase().includes(search.toLowerCase())
  );

  const getTeacherName = (id?: string | null) => teachers.find((t) => t.id === id)?.name || '-';
  const getGroupName = (id?: string | null) => groups.find((g) => g.id === id)?.name || '-';
  const getTeacher = (id?: string | null) => teachers.find((t) => t.id === id) || null;
  const getGroup = (id?: string | null) => groups.find((g) => g.id === id) || null;

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setDialogOpen(true);
  };

  const handleView = (student: Student) => {
    setViewingStudent(student);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteStudent.mutate(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <DashboardLayout 
      title="Uczniowie" 
      subtitle="Zarządzaj uczniami szkoły" 
      requiredRole={['admin', 'manager']}
    >
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        {/* Header */}
        <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Szukaj uczniów..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {canManageData && (
            <Button
              onClick={() => {
                setEditingStudent(null);
                setDialogOpen(true);
              }}
              className="w-full rounded-xl bg-gradient-primary sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              Dodaj ucznia
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
              {filteredStudents.map((student) => (
                <div 
                  key={student.id} 
                  onClick={() => handleView(student)}
                  className={cn(
                    "cursor-pointer rounded-xl border border-border bg-background p-4 transition-all hover:shadow-md hover:border-primary/30",
                    student.payment_status === 'no_payment' && 'border-rose-500/30 bg-rose-50/30 dark:bg-rose-900/10',
                    student.payment_status === 'warning' && 'border-amber-500/30 bg-amber-50/30 dark:bg-amber-900/10'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.email}</p>
                      </div>
                    </div>
                    {canManageData && (
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(student)}
                          className="h-8 w-8"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(student.id)}
                          className="h-8 w-8 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {student.language} {student.level}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      student.status === 'active' 
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}>
                      {student.status === 'active' ? 'Aktywny' : student.status}
                    </span>
                  </div>
                  <div className="mt-2">
                    <StudentPaymentStatus 
                      status={student.payment_status as any} 
                      size="sm"
                      showDetails={canViewFinances}
                    />
                  </div>
                </div>
              ))}
              {filteredStudents.length === 0 && (
                <p className="py-8 text-center text-muted-foreground">Nie znaleziono uczniów</p>
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Uczeń</TableHead>
                    <TableHead>Język / Poziom</TableHead>
                    <TableHead>Nauczyciel</TableHead>
                    <TableHead>Grupa</TableHead>
                    <TableHead>Status</TableHead>
                    {canManageData && <TableHead className="text-right">Akcje</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow 
                      key={student.id} 
                      onClick={() => handleView(student)}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <User className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-xs text-muted-foreground">{student.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{student.language}</span>
                        <span className="ml-2 rounded bg-muted px-2 py-0.5 text-xs">
                          {student.level}
                        </span>
                      </TableCell>
                      <TableCell>{getTeacherName(student.teacher_id)}</TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {getGroupName(student.group_id)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            student.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : student.status === 'paused'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                          }`}
                        >
                          {student.status === 'active' ? 'Aktywny' : student.status === 'paused' ? 'Wstrzymany' : 'Nieaktywny'}
                        </span>
                      </TableCell>
                      {canManageData && (
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(student)}
                              className="h-8 w-8"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(student.id)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {filteredStudents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={canManageData ? 6 : 5} className="py-8 text-center text-muted-foreground">
                        Nie znaleziono uczniów
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      <StudentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        student={editingStudent}
      />

      <StudentDetailsSheet
        student={viewingStudent}
        open={!!viewingStudent}
        onOpenChange={(open) => !open && setViewingStudent(null)}
        teacher={viewingStudent ? getTeacher(viewingStudent.teacher_id) : null}
        group={viewingStudent ? getGroup(viewingStudent.group_id) : null}
        onEdit={() => {
          if (viewingStudent) {
            handleEdit(viewingStudent);
          }
        }}
        canViewFinances={canViewFinances}
        canManageData={canManageData}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć tego ucznia?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta akcja jest nieodwracalna. Uczeń zostanie trwale usunięty z systemu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
