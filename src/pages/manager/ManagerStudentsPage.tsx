import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  Loader2,
  AlertTriangle,
  Package
} from 'lucide-react';
import { useStudents } from '@/hooks/useStudents';
import { useTeachers } from '@/hooks/useTeachers';
import { useGroups } from '@/hooks/useGroups';
import { StudentDialog } from '@/components/admin/StudentDialog';
import { cn } from '@/lib/utils';

export default function ManagerStudentsPage() {
  const { students, isLoading, deleteStudent } = useStudents();
  const { teachers } = useTeachers();
  const { groups } = useGroups();
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<typeof students[0] | null>(null);

  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTeacherName = (id?: string | null) => {
    if (!id) return '—';
    return teachers.find((t) => t.id === id)?.name || '—';
  };

  const getGroupName = (id?: string | null) => {
    if (!id) return '—';
    return groups.find((g) => g.id === id)?.name || '—';
  };

  const getPackageStatus = (student: typeof students[0]) => {
    const remaining = (student.package_hours || 0) - (student.package_used_hours || 0);
    if (remaining <= 0) {
      return { status: 'empty', color: 'bg-destructive', textColor: 'text-destructive', label: 'Brak godzin' };
    }
    if (remaining === 1) {
      return { status: 'low', color: 'bg-warning', textColor: 'text-warning', label: '1 godzina' };
    }
    if (remaining <= 3) {
      return { status: 'medium', color: 'bg-warning/60', textColor: 'text-warning', label: `${remaining} godziny` };
    }
    return { status: 'ok', color: 'bg-success', textColor: 'text-success', label: `${remaining} godzin` };
  };

  const handleEdit = (student: typeof students[0]) => {
    setSelectedStudent(student);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedStudent(null);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <DashboardLayout requiredRole="manager">
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout requiredRole="manager">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Uczniowie</h1>
            <p className="text-muted-foreground">Zarządzaj uczniami i pakietami</p>
          </div>
          <Button
            onClick={handleAdd}
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600"
          >
            <Plus className="mr-2 h-4 w-4" />
            Dodaj ucznia
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Szukaj ucznia..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-xl pl-10"
          />
        </div>

        {/* Students Table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Uczeń</TableHead>
                  <TableHead className="hidden md:table-cell">Język</TableHead>
                  <TableHead className="hidden lg:table-cell">Nauczyciel</TableHead>
                  <TableHead className="hidden lg:table-cell">Grupa</TableHead>
                  <TableHead>Pakiet</TableHead>
                  <TableHead className="text-right">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Nie znaleziono uczniów
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student) => {
                    const packageStatus = getPackageStatus(student);
                    const remaining = (student.package_hours || 0) - (student.package_used_hours || 0);
                    
                    return (
                      <TableRow key={student.id} className={cn(
                        remaining <= 0 && "bg-destructive/5",
                        remaining === 1 && "bg-warning/5"
                      )}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="avatar-bubble h-9 w-9 text-xs">
                              {student.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium">{student.name}</p>
                              <p className="text-xs text-muted-foreground">{student.email}</p>
                            </div>
                            {remaining <= 1 && (
                              <AlertTriangle className={cn(
                                "h-4 w-4",
                                remaining <= 0 ? "text-destructive" : "text-warning"
                              )} />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="badge-default">{student.language}</span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {getTeacherName(student.teacher_id)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {getGroupName(student.group_id)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "h-2 w-2 rounded-full",
                              packageStatus.color
                            )} />
                            <span className={cn("text-sm font-medium", packageStatus.textColor)}>
                              {packageStatus.label}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {student.package_used_hours || 0}/{student.package_hours || 0} wykorzystane
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => handleEdit(student)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              onClick={() => deleteStudent.mutate(student.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <StudentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        student={selectedStudent}
      />
    </DashboardLayout>
  );
}
