import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { useLessons } from '@/hooks/useLessons';
import { useTeachers } from '@/hooks/useTeachers';
import { useStudents } from '@/hooks/useStudents';
import { useGroups } from '@/hooks/useGroups';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const lessonSchema = z.object({
  title: z.string().min(2, 'Tytuł jest wymagany'),
  teacher_id: z.string().min(1, 'Wybierz nauczyciela'),
  student_id: z.string().optional(),
  group_id: z.string().optional(),
  date: z.date(),
  start_time: z.string().min(1, 'Podaj godzinę rozpoczęcia'),
  end_time: z.string().min(1, 'Podaj godzinę zakończenia'),
});

type LessonFormValues = z.infer<typeof lessonSchema>;

interface LessonDialogSupabaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date;
  defaultHour?: number;
}

export function LessonDialogSupabase({ open, onOpenChange, defaultDate, defaultHour }: LessonDialogSupabaseProps) {
  const { addLesson } = useLessons();
  const { teachers } = useTeachers();
  const { students } = useStudents();
  const { groups } = useGroups();
  const { schoolId } = useAuth();
  
  const [showAllStudents, setShowAllStudents] = useState(false);
  const [showAllGroups, setShowAllGroups] = useState(false);

  // Fetch school settings using useQuery for proper caching and reactivity
  const { data: schoolSettings } = useQuery({
    queryKey: ['school-settings', schoolId],
    queryFn: async () => {
      if (!schoolId) return { lesson_duration_minutes: 60 };
      
      const { data, error } = await supabase
        .from('school_settings')
        .select('lesson_duration_minutes')
        .eq('school_id', schoolId)
        .maybeSingle();
      
      if (error) throw error;
      return data || { lesson_duration_minutes: 60 };
    },
    enabled: !!schoolId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const lessonDuration = schoolSettings?.lesson_duration_minutes || 60;

  const form = useForm<LessonFormValues>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      title: '',
      teacher_id: '',
      student_id: '',
      group_id: '',
      date: new Date(),
      start_time: '09:00',
      end_time: '10:00',
    },
  });

  useEffect(() => {
    if (open) {
      const startHour = defaultHour !== undefined ? defaultHour : 9;
      const durationHours = Math.floor(lessonDuration / 60);
      const durationMinutes = lessonDuration % 60;
      
      const endHour = startHour + durationHours;
      const endMinute = durationMinutes;
      
      form.reset({
        title: '',
        teacher_id: '',
        student_id: '',
        group_id: '',
        date: defaultDate || new Date(),
        start_time: `${String(startHour).padStart(2, '0')}:00`,
        end_time: `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`,
      });
      setShowAllStudents(false);
      setShowAllGroups(false);
    }
  }, [open, defaultDate, defaultHour, lessonDuration, form]);

  const selectedTeacherId = form.watch('teacher_id');

  // Filter students and groups by selected teacher, with option to show all
  const filteredStudents = showAllStudents 
    ? students 
    : students.filter((s) => s.teacher_id === selectedTeacherId);
  const filteredGroups = showAllGroups 
    ? groups 
    : groups.filter((g) => g.teacher_id === selectedTeacherId);

  const onSubmit = async (values: LessonFormValues) => {
    await addLesson.mutateAsync({
      title: values.title,
      teacher_id: values.teacher_id,
      student_id: values.student_id || null,
      group_id: values.group_id || null,
      date: format(values.date, 'yyyy-MM-dd'),
      start_time: values.start_time,
      end_time: values.end_time,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:max-w-lg sm:p-6">
        <DialogHeader>
          <DialogTitle>Dodaj zajęcia</DialogTitle>
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
                    <Input placeholder="np. Angielski B2 - konwersacje" {...field} className="rounded-xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="teacher_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nauczyciel</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Wybierz nauczyciela" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="h-3 w-3 rounded-full" 
                              style={{ backgroundColor: teacher.calendar_color || '#3b82f6' }}
                            />
                            {teacher.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="student_id"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Uczeń (indywidualne)</FormLabel>
                      {selectedTeacherId && (
                        <button
                          type="button"
                          className="text-xs text-primary hover:underline"
                          onClick={() => setShowAllStudents(!showAllStudents)}
                        >
                          {showAllStudents ? 'Tylko przypisani' : 'Pokaż wszystkich'}
                        </button>
                      )}
                    </div>
                    <Select 
                      onValueChange={(val) => {
                        field.onChange(val === "none" ? "" : val);
                        if (val !== "none") {
                          form.setValue('group_id', '');
                        }
                      }} 
                      value={field.value || "none"} 
                      disabled={!selectedTeacherId}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Wybierz ucznia" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Brak</SelectItem>
                        {filteredStudents.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="group_id"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Lub grupa</FormLabel>
                      {selectedTeacherId && (
                        <button
                          type="button"
                          className="text-xs text-primary hover:underline"
                          onClick={() => setShowAllGroups(!showAllGroups)}
                        >
                          {showAllGroups ? 'Tylko przypisane' : 'Pokaż wszystkie'}
                        </button>
                      )}
                    </div>
                    <Select 
                      onValueChange={(val) => {
                        field.onChange(val === "none" ? "" : val);
                        if (val !== "none") {
                          form.setValue('student_id', '');
                        }
                      }} 
                      value={field.value || "none"} 
                      disabled={!selectedTeacherId}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Wybierz grupę" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Brak</SelectItem>
                        {filteredGroups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                            'w-full pl-3 text-left font-normal rounded-xl',
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

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Godzina rozpoczęcia</FormLabel>
                    <FormControl>
                      <Input 
                        type="time" 
                        step="60"
                        {...field} 
                        className="rounded-xl" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Godzina zakończenia</FormLabel>
                    <FormControl>
                      <Input 
                        type="time" 
                        step="60"
                        {...field} 
                        className="rounded-xl" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
                Anuluj
              </Button>
              <Button 
                type="submit" 
                disabled={addLesson.isPending}
                className="rounded-xl bg-gradient-primary"
              >
                {addLesson.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Dodaj zajęcia
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}