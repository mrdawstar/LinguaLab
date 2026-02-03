import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Plus, 
  Loader2, 
  Mail, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Trash2,
  Copy,
  Link2
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useInvitations } from '@/hooks/useInvitations';
import { InvitationDialog } from '@/components/admin/InvitationDialog';
import { format, isPast } from 'date-fns';
import { pl } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function InvitationsPage() {
  const { invitations, isLoading, deleteInvitation } = useInvitations();
  const [dialogOpen, setDialogOpen] = useState(false);

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/auth?token=${token}`;
    navigator.clipboard.writeText(link);
    toast.success('Link skopiowany do schowka');
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="badge-danger">Admin</span>;
      case 'manager':
        return <span className="badge-warning">Manager</span>;
      case 'teacher':
        return <span className="badge-info">Nauczyciel</span>;
      default:
        return <span className="badge-default">{role}</span>;
    }
  };

  const getStatusBadge = (invitation: { accepted_at: string | null; expires_at: string }) => {
    if (invitation.accepted_at) {
      return (
        <span className="badge-success flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Zaakceptowane
        </span>
      );
    }
    if (isPast(new Date(invitation.expires_at))) {
      return (
        <span className="badge-danger flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Wygasło
        </span>
      );
    }
    return (
      <span className="badge-info flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Oczekuje
      </span>
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Zaproszenia" 
      subtitle="Zapraszaj managerów i nauczycieli do systemu"
      requiredRole={['admin', 'manager']}
      actions={
        <Button
          onClick={() => setDialogOpen(true)}
          className="rounded-xl bg-gradient-primary"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nowe zaproszenie
        </Button>
      }
    >
      <div className="space-y-6">

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-info/10 p-2">
                <Mail className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Wszystkie</p>
                <p className="text-xl font-bold">{invitations.length}</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-warning/10 p-2">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Oczekujące</p>
                <p className="text-xl font-bold">
                  {invitations.filter(i => !i.accepted_at && !isPast(new Date(i.expires_at))).length}
                </p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-success/10 p-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Zaakceptowane</p>
                <p className="text-xl font-bold">
                  {invitations.filter(i => i.accepted_at).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Invitations Table */}
        <div className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Rola</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Wygasa</TableHead>
                <TableHead className="text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Brak zaproszeń. Kliknij "Nowe zaproszenie" aby dodać.
                  </TableCell>
                </TableRow>
              ) : (
                invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="avatar-bubble h-9 w-9 text-xs">
                          {invitation.email.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{invitation.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(invitation.role)}</TableCell>
                    <TableCell>{getStatusBadge(invitation)}</TableCell>
                    <TableCell>
                      <span className={cn(
                        "text-sm",
                        isPast(new Date(invitation.expires_at)) && "text-destructive"
                      )}>
                        {format(new Date(invitation.expires_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => copyInviteLink(invitation.token)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Kopiuj link zaproszenia</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                onClick={() => deleteInvitation.mutate(invitation.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Usuń zaproszenie</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <InvitationDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </DashboardLayout>
  );
}
