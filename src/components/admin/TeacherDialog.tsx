import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Check } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useTeachers, Teacher } from '@/hooks/useTeachers';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, validateEmailFormat } from '@/lib/utils';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { LimitExceededDialog } from '@/components/subscription/LimitExceededDialog';

const teacherSchema = z.object({
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
  phone: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string().optional()
  ),
  instagram: z.string().optional(),
  meeting_link: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.union([z.string().url('Nieprawidłowy link'), z.literal('')]).optional()
  ),
  languages: z.array(z.string()).min(1, 'Wybierz przynajmniej jeden język'),
  calendar_color: z.string(),
});

type TeacherFormValues = z.infer<typeof teacherSchema>;

interface TeacherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher: Teacher | null;
}

const allLanguages = ['Angielski', 'Niemiecki', 'Hiszpański', 'Francuski', 'Włoski', 'Rosyjski', 'Portugalski', 'Chiński', 'Japoński'];
const colors = ['#2563eb', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

export function TeacherDialog({ open, onOpenChange, teacher }: TeacherDialogProps) {
  const { addTeacher, updateTeacher } = useTeachers();
  const { limits, plan, recommendedUpgradePlan } = useSubscriptionLimits();
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);

  const form = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      instagram: '',
      meeting_link: '',
      languages: [],
      calendar_color: colors[0],
    },
  });

  useEffect(() => {
    if (teacher) {
      form.reset({
        name: teacher.name,
        email: teacher.email || '',
        phone: teacher.phone || '',
        instagram: (teacher as any).instagram || '',
        meeting_link: (teacher as any).meeting_link || '',
        languages: teacher.languages || [],
        calendar_color: teacher.calendar_color || colors[0],
      });
    } else {
      form.reset({
        name: '',
        email: '',
        phone: '',
        instagram: '',
        meeting_link: '',
        languages: [],
        calendar_color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }, [teacher, form]);

  const onSubmit = (values: TeacherFormValues) => {
    // BŁĄD #2 - poprawiono: sprawdź limit tylko przy dodawaniu nowego nauczyciela
    // BŁĄD #15 - poprawiono: uproszczono logikę - sprawdź tylko canAdd
    if (!teacher && !limits.teachers.canAdd) {
      setLimitDialogOpen(true);
      return;
    }

    const teacherData = {
      name: values.name,
      email: values.email || null,
      phone: values.phone || null,
      instagram: values.instagram || null,
      meeting_link: values.meeting_link || null,
      languages: values.languages,
      calendar_color: values.calendar_color,
    };
    
    if (teacher) {
      updateTeacher.mutate({ id: teacher.id, ...teacherData } as any);
    } else {
      addTeacher.mutate(teacherData as any);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>{teacher ? 'Edytuj nauczyciela' : 'Dodaj nowego nauczyciela'}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-100px)]">
          <div className="px-6 pb-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                    <FormLabel>Email (opcjonalny)</FormLabel>
                      <FormControl>
                        <Input placeholder="jan@lingualab.pl" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefon (opcjonalny)</FormLabel>
                      <FormControl>
                        <Input placeholder="+48 123 456 789" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
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
                <FormField
                  control={form.control}
                  name="meeting_link"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Link do zajęć online (opcjonalny)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://meet.google.com/..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="languages"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nauczane języki</FormLabel>
                    <div className="grid grid-cols-2 gap-2 rounded-lg border p-3 sm:grid-cols-3">
                      {allLanguages.map((lang) => (
                        <div key={lang} className="flex items-center space-x-2">
                          <Checkbox
                            id={`lang-${lang}`}
                            checked={field.value?.includes(lang)}
                            onCheckedChange={(checked) => {
                              const updated = checked
                                ? [...(field.value || []), lang]
                                : field.value?.filter((l) => l !== lang) || [];
                              field.onChange(updated);
                            }}
                          />
                          <label htmlFor={`lang-${lang}`} className="text-sm">
                            {lang}
                          </label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="calendar_color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kolor w kalendarzu</FormLabel>
                    <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
                      {colors.map((color) => {
                        const isActive = field.value === color;
                        return (
                          <button
                            key={color}
                            type="button"
                            onClick={() => field.onChange(color)}
                            className={cn(
                              'group relative h-10 w-10 rounded-2xl border border-border/60 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
                              isActive && 'ring-2 ring-primary ring-offset-2'
                            )}
                            style={{ backgroundColor: color }}
                            aria-label={`Kolor ${color}`}
                          >
                            <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-black/10" />
                            <span
                              className={cn(
                                'absolute inset-0 flex items-center justify-center text-white opacity-0 transition-opacity',
                                isActive && 'opacity-100'
                              )}
                            >
                              <Check className="h-4 w-4 drop-shadow" />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Anuluj
                </Button>
                <Button type="submit" className="bg-gradient-primary">
                  {teacher ? 'Zapisz zmiany' : 'Dodaj nauczyciela'}
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
        resource="teachers"
        currentPlan={plan}
        recommendedPlan={recommendedUpgradePlan}
      />
    </Dialog>
  );
}
