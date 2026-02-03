import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
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
import { useSchoolStore } from '@/stores/schoolStore';
import { cn } from '@/lib/utils';

const lessonSchema = z.object({
  title: z.string().min(2, 'Tytuł jest wymagany'),
  teacherId: z.string().min(1, 'Wybierz nauczyciela'),
  studentId: z.string().optional(),
  groupId: z.string().optional(),
  date: z.date(),
  startTime: z.string().min(1, 'Podaj godzinę rozpoczęcia'),
  endTime: z.string().min(1, 'Podaj godzinę zakończenia'),
});

type LessonFormValues = z.infer<typeof lessonSchema>;

interface LessonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date;
  defaultHour?: number;
}

export function LessonDialog({ open, onOpenChange, defaultDate, defaultHour }: LessonDialogProps) {
  const { teachers, students, groups, addLesson } = useSchoolStore();

  const form = useForm<LessonFormValues>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      title: '',
      teacherId: '',
      studentId: '',
      groupId: '',
      date: new Date(),
      startTime: '09:00',
      endTime: '10:00',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: '',
        teacherId: '',
        studentId: '',
        groupId: '',
        date: defaultDate || new Date(),
        startTime: defaultHour ? `${String(defaultHour).padStart(2, '0')}:00` : '09:00',
        endTime: defaultHour ? `${String(defaultHour + 1).padStart(2, '0')}:00` : '10:00',
      });
    }
  }, [open, defaultDate, defaultHour, form]);

  const selectedTeacherId = form.watch('teacherId');
  const filteredStudents = students.filter((s) => s.teacherId === selectedTeacherId);
  const filteredGroups = groups.filter((g) => g.teacherId === selectedTeacherId);

  const onSubmit = (values: LessonFormValues) => {
    addLesson({
      title: values.title,
      teacherId: values.teacherId,
      studentId: values.studentId || undefined,
      groupId: values.groupId || undefined,
      date: values.date,
      startTime: values.startTime,
      endTime: values.endTime,
      status: 'scheduled',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
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
                    <Input placeholder="np. Angielski B2 - konwersacje" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="teacherId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nauczyciel</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz nauczyciela" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.name}
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
                name="studentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Uczeń (indywidualne)</FormLabel>
                    <Select 
                      onValueChange={(val) => field.onChange(val === "none" ? "" : val)} 
                      value={field.value || "none"} 
                      disabled={!selectedTeacherId}
                    >
                      <FormControl>
                        <SelectTrigger>
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
                name="groupId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lub grupa</FormLabel>
                    <Select 
                      onValueChange={(val) => field.onChange(val === "none" ? "" : val)} 
                      value={field.value || "none"} 
                      disabled={!selectedTeacherId}
                    >
                      <FormControl>
                        <SelectTrigger>
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
                Dodaj zajęcia
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
