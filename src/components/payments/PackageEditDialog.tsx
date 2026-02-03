import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Loader2, Trash2, CalendarIcon } from 'lucide-react';
import { usePackages, PackagePurchase } from '@/hooks/usePackages';
import { useTeachers } from '@/hooks/useTeachers';
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
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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

const packageEditSchema = z.object({
  totalAmount: z.coerce.number().min(1, 'Kwota musi być większa od 0'),
  lessonsTotal: z.coerce.number().min(1, 'Liczba lekcji musi być większa od 0'),
  lessonsUsed: z.coerce.number().min(0, 'Liczba wykorzystanych lekcji nie może być ujemna'),
  teacherId: z.string().optional(),
  expiresAt: z.date().optional().nullable(),
  status: z.enum(['active', 'exhausted', 'expired']),
});

type PackageEditFormValues = z.infer<typeof packageEditSchema>;

interface PackageEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packageData: PackagePurchase | null;
  studentName?: string;
}

export function PackageEditDialog({
  open,
  onOpenChange,
  packageData,
  studentName,
}: PackageEditDialogProps) {
  const { updatePackage, deletePackage } = usePackages();
  const { teachers } = useTeachers();

  const form = useForm<PackageEditFormValues>({
    resolver: zodResolver(packageEditSchema),
    defaultValues: {
      totalAmount: 0,
      lessonsTotal: 1,
      lessonsUsed: 0,
      teacherId: '',
      expiresAt: null,
      status: 'active',
    },
  });

  useEffect(() => {
    if (open && packageData) {
      form.reset({
        totalAmount: packageData.total_amount,
        lessonsTotal: packageData.lessons_total,
        lessonsUsed: packageData.lessons_used,
        teacherId: packageData.teacher_id || '',
        expiresAt: packageData.expires_at ? new Date(packageData.expires_at) : null,
        status: packageData.status,
      });
    }
  }, [open, packageData, form]);

  const totalAmount = form.watch('totalAmount');
  const lessonsTotal = form.watch('lessonsTotal');
  const lessonsUsed = form.watch('lessonsUsed');
  const pricePerLesson = lessonsTotal > 0 ? totalAmount / lessonsTotal : 0;
  const remainingLessons = lessonsTotal - lessonsUsed;

  const onSubmit = async (values: PackageEditFormValues) => {
    if (!packageData) return;

    await updatePackage.mutateAsync({
      id: packageData.id,
      total_amount: values.totalAmount,
      lessons_total: values.lessonsTotal,
      lessons_used: values.lessonsUsed,
      teacher_id: values.teacherId || null,
      expires_at: values.expiresAt?.toISOString() || null,
      status: values.status,
    });

    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!packageData) return;
    await deletePackage.mutateAsync(packageData.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edytuj pakiet
            {packageData && (
              <Badge 
                variant="secondary" 
                className={cn(
                  packageData.status === 'active' && 'bg-emerald-100 text-emerald-700',
                  packageData.status === 'exhausted' && 'bg-rose-100 text-rose-700',
                  packageData.status === 'expired' && 'bg-muted text-muted-foreground'
                )}
              >
                {packageData.status === 'active' && 'Aktywny'}
                {packageData.status === 'exhausted' && 'Wykorzystany'}
                {packageData.status === 'expired' && 'Wygasły'}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {studentName && (
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm text-muted-foreground">
              Uczeń: <span className="font-medium text-foreground">{studentName}</span>
            </p>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 grid-cols-2">
              <FormField
                control={form.control}
                name="totalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kwota całkowita (PLN)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lessonsTotal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Liczba lekcji</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Price per lesson display */}
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Cena za lekcję</span>
                <span className="text-lg font-bold text-primary">
                  {pricePerLesson.toFixed(2)} PLN
                </span>
              </div>
            </div>

            <div className="grid gap-4 grid-cols-2">
              <FormField
                control={form.control}
                name="lessonsUsed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wykorzystane lekcje</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} max={lessonsTotal} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <label className="text-sm font-medium">Pozostało lekcji</label>
                <div className={cn(
                  "h-10 flex items-center px-3 rounded-md border",
                  remainingLessons === 0 && 'bg-rose-50 border-rose-200 text-rose-700',
                  remainingLessons === 1 && 'bg-amber-50 border-amber-200 text-amber-700',
                  remainingLessons > 1 && 'bg-emerald-50 border-emerald-200 text-emerald-700'
                )}>
                  <span className="font-semibold">{remainingLessons}</span>
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Aktywny</SelectItem>
                      <SelectItem value="exhausted">Wykorzystany</SelectItem>
                      <SelectItem value="expired">Wygasły</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="teacherId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nauczyciel (opcjonalnie)</FormLabel>
                  <Select 
                    value={field.value || "none"} 
                    onValueChange={(val) => field.onChange(val === "none" ? "" : val)}
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
              control={form.control}
              name="expiresAt"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data wygaśnięcia (opcjonalnie)</FormLabel>
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
                          {field.value ? format(field.value, 'dd.MM.yyyy') : 'Brak daty wygaśnięcia'}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {field.value && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-fit text-xs"
                      onClick={() => field.onChange(null)}
                    >
                      Usuń datę wygaśnięcia
                    </Button>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Delete button */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start border-destructive/50 text-destructive hover:bg-destructive/10"
                  disabled={deletePackage.isPending}
                >
                  {deletePackage.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Usuń pakiet
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Czy na pewno chcesz usunąć ten pakiet?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Ta akcja jest nieodwracalna. Pakiet zostanie trwale usunięty, a powiązane rozliczenia obecności zostaną odłączone.
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

            <Separator />

            {/* Footer buttons */}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Anuluj
              </Button>
              <Button
                type="submit"
                className="bg-gradient-primary"
                disabled={updatePackage.isPending}
              >
                {updatePackage.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Zapisz zmiany
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}