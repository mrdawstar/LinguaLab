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
import { useGroups, Group } from '@/hooks/useGroups';
import { useTeachers } from '@/hooks/useTeachers';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { LimitExceededDialog } from '@/components/subscription/LimitExceededDialog';

const groupSchema = z.object({
  name: z.string().min(2, 'Nazwa grupy jest wymagana'),
  language: z.string().min(1, 'Wybierz język'),
  level: z.string().min(1, 'Wybierz poziom'),
  teacher_id: z.string().optional().nullable(),
  max_students: z.coerce.number().min(2, 'Min. 2 uczniów'),
});

type GroupFormValues = z.infer<typeof groupSchema>;

interface GroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: Group | null;
}

const languages = ['Angielski', 'Niemiecki', 'Hiszpański', 'Francuski', 'Włoski', 'Rosyjski'];
const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export function GroupDialog({ open, onOpenChange, group }: GroupDialogProps) {
  const { teachers } = useTeachers();
  const { addGroup, updateGroup } = useGroups();
  const { limits, plan, recommendedUpgradePlan } = useSubscriptionLimits();
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: '',
      language: '',
      level: '',
      teacher_id: null,
      max_students: 6,
    },
  });

  useEffect(() => {
    if (group) {
      form.reset({
        name: group.name,
        language: group.language,
        level: group.level,
        teacher_id: group.teacher_id,
        max_students: group.max_students || 6,
      });
    } else {
      form.reset({
        name: '',
        language: '',
        level: '',
        teacher_id: null,
        max_students: 6,
      });
    }
  }, [group, form]);

  const onSubmit = (values: GroupFormValues) => {
    // BŁĄD #5 - poprawiono: sprawdź limit tylko przy dodawaniu nowej grupy
    // BŁĄD #15 - poprawiono: uproszczono logikę - sprawdź tylko canAdd
    if (!group && !limits.groups.canAdd) {
      setLimitDialogOpen(true);
      return;
    }

    if (group) {
      updateGroup.mutate({ 
        id: group.id, 
        ...values,
        teacher_id: values.teacher_id || null,
      });
    } else {
      addGroup.mutate({
        name: values.name,
        language: values.language,
        level: values.level,
        teacher_id: values.teacher_id || null,
        max_students: values.max_students,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>{group ? 'Edytuj grupę' : 'Dodaj nową grupę'}</DialogTitle>
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
                    <FormLabel>Nazwa grupy</FormLabel>
                    <FormControl>
                      <Input placeholder="np. Angielski B1 - Grupa poniedziałkowa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Język</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
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
                      <FormLabel>Poziom</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wybierz poziom" />
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

              <FormField
                control={form.control}
                name="teacher_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nauczyciel</FormLabel>
                    <Select 
                      onValueChange={(val) => field.onChange(val === "none" ? null : val)} 
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz nauczyciela" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Brak</SelectItem>
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
                  name="max_students"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max. liczba uczniów</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Anuluj
                </Button>
                <Button type="submit" className="bg-gradient-primary">
                  {group ? 'Zapisz zmiany' : 'Dodaj grupę'}
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
        resource="groups"
        currentPlan={plan}
        recommendedPlan={recommendedUpgradePlan}
      />
    </Dialog>
  );
}
