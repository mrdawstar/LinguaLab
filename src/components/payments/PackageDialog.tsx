import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Calculator, Loader2, BookOpen } from 'lucide-react';
import { useStudents } from '@/hooks/useStudents';
import { useTeachers } from '@/hooks/useTeachers';
import { usePackages } from '@/hooks/usePackages';

const packageSchema = z.object({
  student_id: z.string().min(1, 'Wybierz ucznia'),
  total_amount: z.coerce.number().min(1, 'Podaj kwotę'),
  lessons_total: z.coerce.number().min(1, 'Podaj liczbę lekcji'),
  teacher_id: z.string().optional(),
  purchase_date: z.string().optional(),
});

const singleLessonSchema = z.object({
  student_id: z.string().min(1, 'Wybierz ucznia'),
  price: z.coerce.number().min(1, 'Podaj cenę za lekcję'),
  teacher_id: z.string().optional(),
});

type PackageFormData = z.infer<typeof packageSchema>;
type SingleLessonFormData = z.infer<typeof singleLessonSchema>;

interface PackageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedStudentId?: string;
}

export function PackageDialog({ open, onOpenChange, preselectedStudentId }: PackageDialogProps) {
  const { students } = useStudents();
  const { teachers } = useTeachers();
  const { createPackage } = usePackages();
  const [paymentType, setPaymentType] = useState<'package' | 'single'>('package');
  
  const packageForm = useForm<PackageFormData>({
    resolver: zodResolver(packageSchema),
    defaultValues: {
      student_id: preselectedStudentId || '',
      total_amount: 0,
      lessons_total: 10,
      teacher_id: '',
      purchase_date: new Date().toISOString().split('T')[0],
    },
  });

  const singleForm = useForm<SingleLessonFormData>({
    resolver: zodResolver(singleLessonSchema),
    defaultValues: {
      student_id: preselectedStudentId || '',
      price: 100,
      teacher_id: '',
    },
  });

  useEffect(() => {
    if (preselectedStudentId) {
      packageForm.setValue('student_id', preselectedStudentId);
      singleForm.setValue('student_id', preselectedStudentId);
    }
  }, [preselectedStudentId, packageForm, singleForm]);

  const watchAmount = packageForm.watch('total_amount');
  const watchLessons = packageForm.watch('lessons_total');
  const pricePerLesson = watchLessons > 0 ? (watchAmount / watchLessons).toFixed(2) : '0.00';

  const onSubmitPackage = async (data: PackageFormData) => {
    await createPackage.mutateAsync({
      student_id: data.student_id,
      total_amount: data.total_amount,
      lessons_total: data.lessons_total,
      teacher_id: data.teacher_id || null,
      purchase_date: data.purchase_date || new Date().toISOString().split('T')[0],
    });
    packageForm.reset();
    onOpenChange(false);
  };

  const onSubmitSingle = async (data: SingleLessonFormData) => {
    // Single lesson = package with 1 lesson
    await createPackage.mutateAsync({
      student_id: data.student_id,
      total_amount: data.price,
      lessons_total: 1,
      teacher_id: data.teacher_id || null,
    });
    singleForm.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {paymentType === 'package' ? (
              <Package className="h-5 w-5 text-primary" />
            ) : (
              <BookOpen className="h-5 w-5 text-primary" />
            )}
            Dodaj płatność
          </DialogTitle>
        </DialogHeader>

        <Tabs value={paymentType} onValueChange={(v) => setPaymentType(v as 'package' | 'single')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="package" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Pakiet
            </TabsTrigger>
            <TabsTrigger value="single" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Jednorazowe
            </TabsTrigger>
          </TabsList>

          <TabsContent value="package" className="mt-4">
            <Form {...packageForm}>
              <form onSubmit={packageForm.handleSubmit(onSubmitPackage)} className="space-y-4">
                <FormField
                  control={packageForm.control}
                  name="student_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Uczeń *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wybierz ucznia" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {students.map((student) => (
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

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={packageForm.control}
                    name="total_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kwota całkowita (PLN) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="np. 800"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={packageForm.control}
                    name="lessons_total"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Liczba lekcji *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="np. 10"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Price per lesson calculation */}
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calculator className="h-4 w-4" />
                    <span>Cena za lekcję:</span>
                  </div>
                  <p className="mt-1 text-2xl font-bold text-primary">
                    {pricePerLesson} PLN
                  </p>
                </div>

                <FormField
                  control={packageForm.control}
                  name="teacher_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nauczyciel (opcjonalnie)</FormLabel>
                      <Select 
                        onValueChange={(val) => field.onChange(val === "none" ? "" : val)} 
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

                <FormField
                  control={packageForm.control}
                  name="purchase_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data dodania</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Anuluj
                  </Button>
                  <Button
                    type="submit"
                    disabled={createPackage.isPending}
                    className="bg-gradient-primary"
                  >
                    {createPackage.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Dodaj pakiet
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="single" className="mt-4">
            <Form {...singleForm}>
              <form onSubmit={singleForm.handleSubmit(onSubmitSingle)} className="space-y-4">
                <FormField
                  control={singleForm.control}
                  name="student_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Uczeń *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wybierz ucznia" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {students.map((student) => (
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
                  control={singleForm.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cena za zajęcia (PLN) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="np. 100"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Info box */}
                <div className="rounded-xl border border-amber-500/20 bg-amber-50/50 p-4 dark:bg-amber-900/10">
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Zajęcia jednorazowe to pakiet z 1 lekcją. Po zaznaczeniu obecności
                    uczeń automatycznie otrzyma status "brak płatności".
                  </p>
                </div>

                <FormField
                  control={singleForm.control}
                  name="teacher_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nauczyciel (opcjonalnie)</FormLabel>
                      <Select 
                        onValueChange={(val) => field.onChange(val === "none" ? "" : val)} 
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

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Anuluj
                  </Button>
                  <Button
                    type="submit"
                    disabled={createPackage.isPending}
                    className="bg-gradient-primary"
                  >
                    {createPackage.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Dodaj zajęcia
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
