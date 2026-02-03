import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Trash2, CheckCircle, Users, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { AttendanceDialog } from './AttendanceDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const lessonSchema = z.object({
  title: z.string().min(2, 'Tytuł jest wymagany'),
  date: z.date(),
  startTime: z.string().min(1, 'Podaj godzinę rozpoczęcia'),
  endTime: z.string().min(1, 'Podaj godzinę zakończenia'),
  assignmentType: z.enum(['student', 'group']),
  studentId: z.string().optional(),
  groupId: z.string().optional(),
});

type LessonFormValues = z.infer<typeof lessonSchema>;

interface Lesson {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  is_completed: boolean | null;
  student_id: string | null;
  group_id: string | null;
  students?: { id: string; name: string } | null;
  groups?: { id: string; name: string } | null;
}

interface TeacherLessonEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: Lesson | null;
  onSuccess: () => void;
}

export function TeacherLessonEditDialog({ 
  open, 
  onOpenChange, 
  lesson,
  onSuccess 
}: TeacherLessonEditDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Fetch teacher record
  const { data: teacher } = useQuery({
    queryKey: ['current-teacher', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('teachers')
        .select('id, school_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const teacherId = teacher?.id;
  const schoolId = teacher?.school_id;

  // Fetch ALL students from the school (so teacher can assign any student)
  const { data: students = [] } = useQuery({
    queryKey: ['school-students-for-lesson', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase
        .from('students')
        .select('id, name')
        .eq('school_id', schoolId)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId && open,
  });

  // Fetch ALL groups from the school
  const { data: groups = [] } = useQuery({
    queryKey: ['school-groups-for-lesson', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase
        .from('groups')
        .select('id, name')
        .eq('school_id', schoolId)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId && open,
  });
  
  const form = useForm<LessonFormValues>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      title: '',
      date: new Date(),
      startTime: '09:00',
      endTime: '10:00',
      assignmentType: 'student',
      studentId: '',
      groupId: '',
    },
  });

  const assignmentType = form.watch('assignmentType');

  useEffect(() => {
    if (open && lesson) {
      const isGroup = !!lesson.group_id;
      form.reset({
        title: lesson.title,
        date: new Date(lesson.date),
        startTime: lesson.start_time.slice(0, 5),
        endTime: lesson.end_time.slice(0, 5),
        assignmentType: isGroup ? 'group' : 'student',
        studentId: lesson.student_id || '',
        groupId: lesson.group_id || '',
      });
    }
  }, [open, lesson, form]);

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['teacher-lessons'] });
    queryClient.invalidateQueries({ queryKey: ['lessons'] });
    queryClient.invalidateQueries({ queryKey: ['lesson-attendance'] });
  };

  const onSubmit = async (values: LessonFormValues) => {
    if (!lesson) return;
    
    try {
      const updateData: Record<string, unknown> = {
        title: values.title,
        date: format(values.date, 'yyyy-MM-dd'),
        start_time: values.startTime,
        end_time: values.endTime,
      };

      // Handle student/group assignment
      if (values.assignmentType === 'student') {
        updateData.student_id = values.studentId || null;
        updateData.group_id = null;
      } else {
        updateData.group_id = values.groupId || null;
        updateData.student_id = null;
      }

      const { error } = await supabase
        .from('lessons')
        .update(updateData)
        .eq('id', lesson.id);

      if (error) throw error;
      toast.success('Zajęcia zostały zaktualizowane');
      invalidateQueries();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating lesson:', error);
      toast.error('Nie udało się zaktualizować zajęć');
    }
  };

  const handleDelete = async () => {
    if (!lesson) return;
    setIsDeleting(true);
    
    try {
      // First delete attendance records for this lesson
      const { error: attendanceError } = await supabase
        .from('lesson_attendance')
        .delete()
        .eq('lesson_id', lesson.id);
      
      if (attendanceError) {
        console.error('Error deleting attendance:', attendanceError);
        // Continue with lesson deletion even if attendance deletion fails
      }

      // Then delete the lesson
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lesson.id);

      if (error) throw error;
      toast.success('Zajęcia zostały usunięte');
      invalidateQueries();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting lesson:', error);
      toast.error('Nie udało się usunąć zajęć');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleCompleted = async () => {
    if (!lesson) return;
    setIsUpdatingStatus(true);
    
    try {
      const newStatus = !lesson.is_completed;
      const { error } = await supabase
        .from('lessons')
        .update({ is_completed: newStatus })
        .eq('id', lesson.id);

      if (error) throw error;
      toast.success(newStatus ? 'Zajęcia oznaczone jako ukończone' : 'Cofnięto status ukończenia');
      invalidateQueries();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error toggling lesson status:', error);
      toast.error('Nie udało się zmienić statusu zajęć');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:max-w-md sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Edytuj zajęcia
              {lesson?.is_completed && (
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  Ukończone
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tytuł zajęć</FormLabel>
                    <FormControl>
                      <Input placeholder="np. Konwersacje B2" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Assignment type tabs */}
              <FormField
                control={form.control}
                name="assignmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Przypisanie</FormLabel>
                    <Tabs value={field.value} onValueChange={field.onChange}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="student">Uczeń</TabsTrigger>
                        <TabsTrigger value="group">Grupa</TabsTrigger>
                      </TabsList>
                      <TabsContent value="student" className="mt-2">
                        <FormField
                          control={form.control}
                          name="studentId"
                          render={({ field: studentField }) => (
                            <Select 
                              value={studentField.value || "none"} 
                              onValueChange={(val) => studentField.onChange(val === "none" ? "" : val)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Wybierz ucznia" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Brak przypisania</SelectItem>
                                {students.map((student) => (
                                  <SelectItem key={student.id} value={student.id}>
                                    {student.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </TabsContent>
                      <TabsContent value="group" className="mt-2">
                        <FormField
                          control={form.control}
                          name="groupId"
                          render={({ field: groupField }) => (
                            <Select 
                              value={groupField.value || "none"} 
                              onValueChange={(val) => groupField.onChange(val === "none" ? "" : val)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Wybierz grupę" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Brak przypisania</SelectItem>
                                {groups.map((group) => (
                                  <SelectItem key={group.id} value={group.id}>
                                    {group.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </TabsContent>
                    </Tabs>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? format(field.value, 'PPP') : 'Wybierz datę'}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 grid-cols-2">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rozpoczęcie</FormLabel>
                      <FormControl>
                        <Input type="time" step="60" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zakończenie</FormLabel>
                      <FormControl>
                        <Input type="time" step="60" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Action buttons section */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Akcje</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => setAttendanceOpen(true)}
                    className="justify-start"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Obecność
                  </Button>

                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={handleToggleCompleted}
                    disabled={isUpdatingStatus}
                    className={cn(
                      "justify-start",
                      lesson?.is_completed 
                        ? "border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20"
                        : "border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                    )}
                  >
                    {isUpdatingStatus ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : lesson?.is_completed ? (
                      <XCircle className="mr-2 h-4 w-4" />
                    ) : (
                      <CheckCircle className="mr-2 h-4 w-4" />
                    )}
                    {lesson?.is_completed ? 'Cofnij ukończ.' : 'Ukończone'}
                  </Button>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      className="w-full justify-start border-destructive/50 text-destructive hover:bg-destructive/10"
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      Usuń zajęcia
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Czy na pewno chcesz usunąć te zajęcia?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Ta akcja jest nieodwracalna. Zajęcia oraz powiązane zapisy obecności zostaną trwale usunięte.
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
              </div>

              <Separator />

              {/* Footer buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Anuluj
                </Button>
                <Button type="submit" className="bg-gradient-primary">
                  Zapisz zmiany
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AttendanceDialog
        open={attendanceOpen}
        onOpenChange={setAttendanceOpen}
        lesson={lesson}
        onSuccess={() => {
          invalidateQueries();
          onSuccess();
        }}
      />
    </>
  );
}