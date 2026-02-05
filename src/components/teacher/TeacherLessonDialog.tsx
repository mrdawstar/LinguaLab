import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const lessonSchema = z.object({
  title: z.string().min(2, 'Tytuł jest wymagany'),
  studentId: z.string().optional(),
  groupId: z.string().optional(),
  date: z.date(),
  startTime: z.string().min(1, 'Podaj godzinę rozpoczęcia'),
  endTime: z.string().min(1, 'Podaj godzinę zakończenia'),
});

type LessonFormValues = z.infer<typeof lessonSchema>;

interface TeacherLessonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date;
  defaultHour?: number;
  teacherId: string;
}

export function TeacherLessonDialog({ open, onOpenChange, defaultDate, defaultHour, teacherId }: TeacherLessonDialogProps) {
  const { schoolId } = useAuth();

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

  // Fetch students assigned to this teacher from Supabase
  const { data: myStudents = [] } = useQuery({
    queryKey: ['teacher-students', teacherId, schoolId],
    queryFn: async () => {
      if (!teacherId || !schoolId) return [];
      const { data, error } = await supabase
        .from('students')
        .select('id, name, language, level')
        .eq('school_id', schoolId)
        .eq('teacher_id', teacherId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!teacherId && !!schoolId,
  });

  // Fetch groups assigned to this teacher from Supabase
  const { data: myGroups = [] } = useQuery({
    queryKey: ['teacher-groups', teacherId, schoolId],
    queryFn: async () => {
      if (!teacherId || !schoolId) return [];
      const { data, error } = await supabase
        .from('groups')
        .select('id, name')
        .eq('school_id', schoolId)
        .eq('teacher_id', teacherId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!teacherId && !!schoolId,
  });

  const form = useForm<LessonFormValues>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      title: '',
      studentId: '',
      groupId: '',
      date: new Date(),
      startTime: '09:00',
      endTime: '10:00',
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
        studentId: '',
        groupId: '',
        date: defaultDate || new Date(),
        startTime: `${String(startHour).padStart(2, '0')}:00`,
        endTime: `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`,
      });
    }
  }, [open, defaultDate, defaultHour, lessonDuration, form]);

  const onSubmit = async (values: LessonFormValues) => {
    try {
      const { error } = await supabase.from('lessons').insert({
        title: values.title,
        teacher_id: teacherId,
        student_id: values.studentId || null,
        group_id: values.groupId || null,
        date: format(values.date, 'yyyy-MM-dd'),
        start_time: values.startTime,
        end_time: values.endTime,
        school_id: schoolId,
      });
      
      if (error) throw error;
      toast.success('Zajęcia zostały zaplanowane');
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating lesson:', error);
      toast.error('Nie udało się zaplanować zajęć');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] rounded-2xl p-4 sm:max-w-lg sm:p-6">
        <DialogHeader>
          <DialogTitle>Zaplanuj zajęcia online</DialogTitle>
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

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="studentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Uczeń (indywidualne)</FormLabel>
                    <Select 
                      onValueChange={(val) => field.onChange(val === "none" ? "" : val)} 
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz ucznia" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Brak</SelectItem>
                        {myStudents.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.name} ({student.language}{student.level ? ` ${student.level}` : ''})
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
                name="groupId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lub grupa</FormLabel>
                    <Select 
                      onValueChange={(val) => field.onChange(val === "none" ? "" : val)} 
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz grupę" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Brak</SelectItem>
                        {myGroups.map((group) => (
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

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Godzina rozpoczęcia</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
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
                    <FormLabel>Godzina zakończenia</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Anuluj
              </Button>
              <Button type="submit" className="bg-gradient-primary">
                Zaplanuj zajęcia
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
