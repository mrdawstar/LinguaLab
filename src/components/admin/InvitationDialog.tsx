import { useState, useEffect, useRef } from 'react';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useInvitations } from '@/hooks/useInvitations';
import { useTeachers } from '@/hooks/useTeachers';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Mail, UserPlus, AlertCircle, Copy, CheckCircle2, Link2, User, Users } from 'lucide-react';
import { toast } from 'sonner';
import { validateEmailFormat, validateEmailExists } from '@/lib/utils';
import { cn } from '@/lib/utils';

const emailSchema = z.string().email('Nieprawidłowy adres email');

type InvitationMode = 'new' | 'existing_teacher';

interface InvitationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CreatedInvitation {
  email: string;
  token: string;
  role: string;
}

export function InvitationDialog({ open, onOpenChange }: InvitationDialogProps) {
  const { role, schoolId } = useAuth();
  const queryClient = useQueryClient();
  const { sendInvitation } = useInvitations();
  const { teachers } = useTeachers();
  const [mode, setMode] = useState<InvitationMode>('new');
  const [email, setEmail] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [inviteRole, setInviteRole] = useState<'manager' | 'teacher'>('teacher');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [createdInvitation, setCreatedInvitation] = useState<CreatedInvitation | null>(null);
  const [copied, setCopied] = useState(false);
  const [teacherPopoverOpen, setTeacherPopoverOpen] = useState(false);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Pokazujemy WSZYSTKICH nauczycieli z sekcji Nauczyciele, żeby każdy był widoczny
  const unlinkedTeachers = teachers.filter((t) => !t.user_id);
  const unlinkedWithEmail = unlinkedTeachers.filter((t) => t.email?.trim());
  const selectedTeacher = selectedTeacherId
    ? teachers.find((t) => t.id === selectedTeacherId)
    : null;
  const canSelectForInvite = (t: { user_id?: string | null; email?: string | null }) =>
    !t.user_id && !!t.email?.trim();

  // Po otwarciu dialogu odśwież listę nauczycieli, żeby po usunięciu zaproszenia osoby znów były na liście
  useEffect(() => {
    if (open && schoolId) {
      queryClient.invalidateQueries({ queryKey: ['teachers', schoolId] });
    }
  }, [open, schoolId, queryClient]);

  const validateEmail = async (value: string) => {
    // First check format
    const formatCheck = validateEmailFormat(value);
    if (!formatCheck.isValid) {
      setEmailError(formatCheck.error || 'Nieprawidłowy email');
      return false;
    }

    // Then check if domain exists (async)
    const existsCheck = await validateEmailExists(value);
    if (!existsCheck.isValid) {
      setEmailError(existsCheck.error || 'Nieprawidłowy email');
      return false;
    }

    setEmailError(null);
    return true;
  };

  // Debounced validation effect
  useEffect(() => {
    if (email.length === 0) {
      setEmailError(null);
      return;
    }

    // Clear previous timeout
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    // Set new timeout for validation
    validationTimeoutRef.current = setTimeout(async () => {
      await validateEmail(email);
    }, 500);

    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [email]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    // Validation happens in useEffect
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailToUse = mode === 'existing_teacher' ? selectedTeacher?.email : email;
    const roleToUse = mode === 'existing_teacher' ? 'teacher' as const : inviteRole;

    if (!emailToUse) {
      if (mode === 'existing_teacher') {
        if (selectedTeacher?.user_id) {
          toast.error('Ta osoba ma już konto. Użyj opcji „Nowy” i wpisz jej email.');
        } else if (selectedTeacher && !selectedTeacher.email?.trim()) {
          toast.error('Ten nauczyciel nie ma emaila. Dodaj go w sekcji Nauczyciele i spróbuj ponownie.');
        } else {
          toast.error('Wybierz nauczyciela');
        }
      }
      return;
    }

    if (mode === 'new' && !(await validateEmail(email))) {
      return; // Error already set by validateEmail
    }

    try {
      const result = await sendInvitation.mutateAsync({ email: emailToUse, role: roleToUse });
      setCreatedInvitation({
        email: result.email,
        token: result.token,
        role: result.role,
      });
    } catch (error) {
      // Error handled by the hook
    }
  };

  const getInviteLink = () => {
    if (!createdInvitation) return '';
    return `${window.location.origin}/auth?token=${createdInvitation.token}`;
  };

  const copyLink = () => {
    navigator.clipboard.writeText(getInviteLink());
    setCopied(true);
    toast.success('Link skopiowany do schowka');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setMode('new');
    setEmail('');
    setSelectedTeacherId('');
    setTeacherPopoverOpen(false);
    setEmailError(null);
    setCreatedInvitation(null);
    setCopied(false);
    onOpenChange(false);
  };

  // Manager can only invite teachers
  const availableRoles = role === 'admin' 
    ? [{ value: 'manager', label: 'Manager' }, { value: 'teacher', label: 'Nauczyciel' }]
    : [{ value: 'teacher', label: 'Nauczyciel' }];

  // Show success screen with link after invitation is created
  if (createdInvitation) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="glass-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Zaproszenie utworzone
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-xl bg-success/10 p-4 text-center">
              <p className="text-sm text-muted-foreground">Zaproszenie dla:</p>
              <p className="font-semibold text-foreground">{createdInvitation.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Rola: {createdInvitation.role === 'teacher' ? 'Nauczyciel' : 'Manager'}
              </p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Link2 className="h-4 w-4 text-primary" />
                Link do zaproszenia
              </label>
              <div className="flex gap-2">
                <Input
                  value={getInviteLink()}
                  readOnly
                  className="rounded-xl bg-muted text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyLink}
                  className="shrink-0 rounded-xl"
                >
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Skopiuj link i wyślij go do zaproszonej osoby. Link jest ważny przez 7 dni.
              </p>
            </div>

            <div className="rounded-xl border border-success/30 bg-success/10 p-3">
              <p className="text-xs text-emerald-800 dark:text-emerald-200">
                <strong>✓ Email wysłany:</strong> Zaproszenie zostało wysłane na adres {createdInvitation.email}. 
                Odbiorca otrzyma email z linkiem do rejestracji.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreatedInvitation(null);
                  setMode('new');
                  setEmail('');
                  setSelectedTeacherId('');
                }}
                className="rounded-xl"
              >
                Nowe zaproszenie
              </Button>
              <Button
                type="button"
                onClick={handleClose}
                className="rounded-xl bg-gradient-primary"
              >
                Zamknij
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const canSubmitNew = mode === 'new' && !emailError && email.trim().length > 0;
  const canSubmitExisting = mode === 'existing_teacher' && !!selectedTeacherId && selectedTeacher != null && canSelectForInvite(selectedTeacher);
  const canSubmit = (mode === 'new' && canSubmitNew) || (mode === 'existing_teacher' && canSubmitExisting);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="glass-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Nowe zaproszenie
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Mode: new vs existing teacher */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Kogo zapraszasz?</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={mode === 'new' ? 'default' : 'outline'}
                className={cn(
                  'rounded-xl h-auto py-3 flex flex-col items-center gap-1',
                  mode === 'new' && 'bg-gradient-primary border-0'
                )}
                onClick={() => {
                  setMode('new');
                  setSelectedTeacherId('');
                }}
              >
                <UserPlus className="h-4 w-4" />
                <span className="text-xs font-medium">Nowy</span>
                <span className="text-[10px] opacity-90">nauczyciel lub manager</span>
              </Button>
              <Button
                type="button"
                variant={mode === 'existing_teacher' ? 'default' : 'outline'}
                className={cn(
                  'rounded-xl h-auto py-3 flex flex-col items-center gap-1',
                  mode === 'existing_teacher' && 'bg-gradient-primary border-0'
                )}
                onClick={() => {
                  setMode('existing_teacher');
                  setEmail('');
                  setEmailError(null);
                }}
              >
                <Users className="h-4 w-4" />
                <span className="text-xs font-medium">Istniejący</span>
                <span className="text-[10px] opacity-90">nauczyciel (już w systemie)</span>
              </Button>
            </div>
          </div>

          {mode === 'new' && (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    placeholder="jan@example.com"
                    className={`rounded-xl pl-10 ${emailError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    required
                  />
                </div>
                {emailError && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" />
                    {emailError}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Rola</label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'manager' | 'teacher')}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Wybierz rolę" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {mode === 'existing_teacher' && (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium">Wybierz nauczyciela</label>
                <Popover open={teacherPopoverOpen} onOpenChange={setTeacherPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between rounded-xl font-normal"
                    >
                      {selectedTeacher
                        ? `${selectedTeacher.name}${selectedTeacher.email ? ` · ${selectedTeacher.email}` : ''}`
                        : 'Wybierz nauczyciela...'}
                      <Users className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="min-w-72 w-full max-w-[calc(100vw-2rem)] p-0" align="start">
                    {teachers.length === 0 ? (
                      <div className="py-4 px-3 text-sm text-muted-foreground text-center">
                        Brak nauczycieli. Dodaj nauczyciela w sekcji Nauczyciele.
                      </div>
                    ) : (
                      <div
                        className="h-72 w-full overflow-y-auto overflow-x-hidden overscroll-contain py-1"
                        style={{ maxHeight: '18rem' }}
                        role="listbox"
                      >
                        <div className="p-1">
                          {teachers.map((t) => {
                            const hasAccount = !!t.user_id;
                            const hasEmail = !!t.email?.trim();
                            const selectable = canSelectForInvite(t);
                            return (
                              <button
                                key={t.id}
                                type="button"
                                role="option"
                                aria-selected={selectedTeacherId === t.id}
                                className={cn(
                                  'relative flex w-full select-none items-center rounded-sm py-2 pl-3 pr-2 text-left text-sm outline-none',
                                  selectable && 'cursor-pointer hover:bg-accent hover:text-accent-foreground',
                                  !selectable && 'cursor-default opacity-75 text-muted-foreground',
                                  selectedTeacherId === t.id && selectable && 'bg-accent'
                                )}
                                onClick={() => {
                                  setSelectedTeacherId(t.id);
                                  if (selectable) setTeacherPopoverOpen(false);
                                  else if (hasAccount) toast.info('Ta osoba ma już konto. Wyślij link przez opcję „Nowy” (wpisz jej email).');
                                  else toast.error('Najpierw dodaj email w sekcji Nauczyciele.');
                                }}
                              >
                                {t.name}
                                {hasEmail && ` · ${t.email?.trim()}`}
                                {hasAccount && ' · (ma już konto – wyślij link przez opcję Nowy)'}
                                {!hasAccount && !hasEmail && ' · (brak email – uzupełnij w Nauczyciele)'}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {teachers.length > 0 && (
                    <span className="block mb-0.5">
                      Wszyscy nauczyciele ({teachers.length}). Do zaproszenia: {unlinkedWithEmail.length} bez konta z emailem.
                      {unlinkedTeachers.length > unlinkedWithEmail.length && unlinkedTeachers.length > 0 && (
                        <> {unlinkedTeachers.length - unlinkedWithEmail.length} bez emaila – uzupełnij w Nauczyciele.</>
                      )}
                    </span>
                  )}
                  Zaproszenie trafi na email wybranego nauczyciela. Po zalogowaniu konto zostanie powiązane z tym profilem (uczniowie pozostaną przypisani).
                  <span className="block mt-1 text-muted-foreground/90">
                    Jeśli kogoś nie ma na liście, ma już konto – wyślij link ponownie przez opcję „Nowy” (wpisz email).
                  </span>
                </p>
              </div>
            </>
          )}

          <p className="text-sm text-muted-foreground">
            Zaproszenie będzie ważne przez 7 dni.
          </p>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="rounded-xl"
            >
              Anuluj
            </Button>
            <Button
              type="submit"
              disabled={sendInvitation.isPending || !canSubmit}
              className="rounded-xl bg-gradient-primary"
            >
              {sendInvitation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Utwórz zaproszenie
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
