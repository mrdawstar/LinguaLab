import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { useStudents, Student } from '@/hooks/useStudents';
import { useTeachers } from '@/hooks/useTeachers';
import { useGroups } from '@/hooks/useGroups';
import { ScrollArea } from '@/components/ui/scroll-area';
import { validateEmailFormat } from '@/lib/utils';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { LimitExceededDialog } from '@/components/subscription/LimitExceededDialog';

const studentSchema = z.object({
  name: z.string().min(2, 'Imię i nazwisko jest wymagane'),
  email: z.string()
    .optional()
    .or(z.literal(''))
    .refine((val) => {
      if (!val || val === '') return true;
      const emailCheck = validateEmailFormat(val);
      return emailCheck.isValid;
    }, {
      message: 'Nieprawidłowy email lub domena nie istnieje'
    }),
  phone: z.string().optional(),
  instagram: z.string().optional(),
  language: z.string().min(1, 'Wybierz język'),
  level: z.string().optional().or(z.literal('')),
  teacher_id: z.string().min(1, 'Nauczyciel jest wymagany'),
  group_id: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive', 'paused']),
});

type StudentFormValues = z.infer<typeof studentSchema>;

interface StudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
}

const languages = ['Angielski', 'Niemiecki', 'Hiszpański', 'Francuski', 'Włoski', 'Rosyjski'];
const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export function StudentDialog({ open, onOpenChange, student }: StudentDialogProps) {
  const { teachers } = useTeachers();
  const { groups } = useGroups();
  const { addStudent, updateStudent } = useStudents();
  const { limits, plan, recommendedUpgradePlan } = useSubscriptionLimits();
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      instagram: '',
      language: '',
      level: '',
      teacher_id: '',
      group_id: null,
      status: 'active',
    },
  });

  useEffect(() => {
    if (student) {
      form.reset({
        name: student.name,
        email: student.email,
        phone: student.phone || '',
        instagram: (student as any).instagram || '',
        language: student.language,
        level: student.level || '',
        teacher_id: student.teacher_id || '',
        group_id: student.group_id,
        status: (student.status as 'active' | 'inactive' | 'paused') || 'active',
      });
    } else {
      form.reset({
        name: '',
        email: '',
        phone: '',
        instagram: '',
        language: '',
        level: '',
        teacher_id: '',
        group_id: null,
        status: 'active',
      });
    }
  }, [student, form]);

  const onSubmit = (values: StudentFormValues) => {
    // BŁĄD #5 - poprawiono: sprawdź limit tylko przy dodawaniu nowego ucznia
    // BŁĄD #15 - poprawiono: uproszczono logikę - sprawdź tylko canAdd
    if (!student && !limits.students.canAdd) {
      setLimitDialogOpen(true);
      return;
    }

    const studentData = {
      name: values.name,
      email: values.email || '',
      phone: values.phone || null,
      instagram: values.instagram || null,
      language: values.language,
      level: values.level || '',
      status: values.status,
      teacher_id: values.teacher_id,
      group_id: values.group_id || null,
    };
    
    if (student) {
      updateStudent.mutate({ id: student.id, ...studentData } as any);
    } else {
      addStudent.mutate(studentData as any);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>{student ? 'Edytuj ucznia' : 'Dodaj nowego ucznia'}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-100px)]">
          <div className="px-6 pb-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Imię i nazwisko</FormLabel>
                      <FormControl>
                        <Input placeholder="Jan Kowalski" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (opcjonalne)</FormLabel>
                      <FormControl>
                        <Input placeholder="jan@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefon (opcjonalne)</FormLabel>
                      <FormControl>
                        <Input placeholder="+48 123 456 789" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="instagram"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instagram (opcjonalne)</FormLabel>
                      <FormControl>
                        <Input placeholder="@username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Język</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger className="text-left">
                            <SelectValue placeholder="Wybierz język" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {languages.map((lang) => (
                            <SelectItem key={lang} value={lang}>
                              {lang}
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
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Poziom (opcjonalne)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger className="text-left">
                            <SelectValue placeholder="Wybierz poziom (opcjonalne)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {levels.map((level) => (
                            <SelectItem key={level} value={level}>
                              {level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="teacher_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nauczyciel *</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wybierz nauczyciela" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {teachers.length === 0 ? (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                              Najpierw dodaj nauczyciela
                            </div>
                          ) : (
                            teachers.map((teacher) => (
                              <SelectItem key={teacher.id} value={teacher.id}>
                                {teacher.name}
                              </SelectItem>
                            ))
                          )}
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
                      <FormLabel>Grupa</FormLabel>
                      <Select 
                        onValueChange={(val) => field.onChange(val === 'none' ? null : val)} 
                        value={field.value || 'none'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wybierz grupę" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Brak</SelectItem>
                          {groups.map((group) => (
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Aktywny</SelectItem>
                        <SelectItem value="paused">Wstrzymany</SelectItem>
                        <SelectItem value="inactive">Nieaktywny</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Anuluj
                </Button>
                <Button type="submit" className="bg-gradient-primary">
                  {student ? 'Zapisz zmiany' : 'Dodaj ucznia'}
                </Button>
              </div>
              </form>
            </Form>
          </div>
        </ScrollArea>
      </DialogContent>

      <LimitExceededDialog
        open={limitDialogOpen}
        onOpenChange={setLimitDialogOpen}
        resource="students"
        currentPlan={plan}
        recommendedPlan={recommendedUpgradePlan}
      />
    </Dialog>
  );
}
