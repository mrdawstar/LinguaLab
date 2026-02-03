import { useState } from 'react';
import { Plus, Search, Edit, Trash2, Users, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGroups, Group } from '@/hooks/useGroups';
import { useTeachers } from '@/hooks/useTeachers';
import { useStudents } from '@/hooks/useStudents';
import { useAuth } from '@/contexts/AuthContext';
import { GroupDialog } from '@/components/admin/GroupDialog';
import { GroupDetailsSheet } from '@/components/admin/GroupDetailsSheet';
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

export default function GroupsPage() {
  const { groups, isLoading, deleteGroup } = useGroups();
  const { teachers } = useTeachers();
  const { students } = useStudents();
  const { role, canViewFinances, canManageData } = useAuth();
  
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewingGroup, setViewingGroup] = useState<Group | null>(null);

  const filteredGroups = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.language.toLowerCase().includes(search.toLowerCase())
  );

  const getTeacherName = (id: string | null) => teachers.find((t) => t.id === id)?.name || '-';
  const getStudentCount = (groupId: string) => students.filter((s) => s.group_id === groupId).length;

  const handleEdit = (group: Group) => {
    setEditingGroup(group);
    setDialogOpen(true);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteGroup.mutate(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <DashboardLayout 
      title="Grupy" 
      subtitle="Zarządzaj grupami zajęciowymi" 
      requiredRole={['admin', 'manager']}
    >
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        {/* Header */}
        <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Szukaj grup..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {canManageData && (
            <Button
              onClick={() => {
                setEditingGroup(null);
                setDialogOpen(true);
              }}
              className="w-full rounded-xl bg-gradient-primary sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              Dodaj grupę
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
              {filteredGroups.map((group) => (
                <div
                  key={group.id}
                  onClick={() => setViewingGroup(group)}
                  className="cursor-pointer rounded-xl border border-border bg-background p-4 transition-all hover:border-primary/30 hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{group.name}</p>
                        <p className="text-xs text-muted-foreground">{getTeacherName(group.teacher_id)}</p>
                      </div>
                    </div>
                    {canManageData && (
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(group)}
                          className="h-8 w-8"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(group.id)}
                          className="h-8 w-8 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {group.language} {group.level}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                      {getStudentCount(group.id)} / {group.max_students} uczniów
                    </span>
                  </div>
                </div>
              ))}
              {filteredGroups.length === 0 && (
                <p className="py-8 text-center text-muted-foreground">Nie znaleziono grup</p>
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Grupa</TableHead>
                    <TableHead>Język / Poziom</TableHead>
                    <TableHead>Nauczyciel</TableHead>
                    <TableHead>Uczniowie</TableHead>
                    {canManageData && <TableHead className="text-right">Akcje</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGroups.map((group) => (
                    <TableRow
                      key={group.id}
                      onClick={() => setViewingGroup(group)}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Users className="h-4 w-4" />
                          </div>
                          <p className="font-medium">{group.name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{group.language}</span>
                        <span className="ml-2 rounded bg-muted px-2 py-0.5 text-xs">
                          {group.level}
                        </span>
                      </TableCell>
                      <TableCell>{getTeacherName(group.teacher_id)}</TableCell>
                      <TableCell>
                        {getStudentCount(group.id)} / {group.max_students}
                      </TableCell>
                      {canManageData && (
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(group)}
                              className="h-8 w-8"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(group.id)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {filteredGroups.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={canManageData ? 5 : 4} className="py-8 text-center text-muted-foreground">
                        Nie znaleziono grup
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      <GroupDialog open={dialogOpen} onOpenChange={setDialogOpen} group={editingGroup} />

      <GroupDetailsSheet
        group={viewingGroup}
        open={!!viewingGroup}
        onOpenChange={(open) => !open && setViewingGroup(null)}
        teacher={teachers.find((teacher) => teacher.id === viewingGroup?.teacher_id) ?? null}
        students={students}
        onEdit={() => {
          if (viewingGroup) {
            handleEdit(viewingGroup);
          }
        }}
        canManageData={canManageData}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć tę grupę?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta akcja jest nieodwracalna. Grupa zostanie trwale usunięta z systemu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
