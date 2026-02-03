import { useState, useEffect } from 'react';
import { Bell, Send, X, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PremiumFeatureGuard } from '@/components/subscription/PremiumFeatureGuard';

interface NotificationsSectionProps {
  noPaymentCount: number;
  warningCount: number;
  onSendNotifications?: () => Promise<void>;
  isSending?: boolean;
}

const STORAGE_KEY = 'notifications-section-dismissed';

export function NotificationsSection({
  noPaymentCount,
  warningCount,
  onSendNotifications,
  isSending = false,
}: NotificationsSectionProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isCollapsing, setIsCollapsing] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY) === 'true';
    if (dismissed) {
      setIsDismissed(true);
    }
  }, []);

  const totalCount = noPaymentCount + warningCount;

  // Don't show if dismissed or no notifications needed
  if (isDismissed || totalCount === 0) {
    return null;
  }

  const handleDismiss = () => {
    setIsCollapsing(true);
    setTimeout(() => {
      setIsDismissed(true);
      localStorage.setItem(STORAGE_KEY, 'true');
    }, 300); // Match animation duration
  };

  const handleSend = async () => {
    if (onSendNotifications) {
      await onSendNotifications();
    }
  };

  return (
    <PremiumFeatureGuard feature="automaticEmails">
      <div
        className={cn(
          'rounded-2xl border border-border/50 bg-card p-4 shadow-sm sm:p-6 transition-all duration-300 ease-in-out overflow-hidden',
          isCollapsing 
            ? 'opacity-0 max-h-0 mb-0 p-0 border-0' 
            : 'opacity-100 max-h-[500px] mb-4'
        )}
      >
        <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {/* Header */}
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Bell className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground sm:text-lg">
                Powiadomienia ({totalCount} {totalCount === 1 ? 'uczeń' : 'uczniów'})
              </h3>
            </div>
          </div>

          {/* Description */}
          <p className="mb-4 text-sm text-muted-foreground">
            Wyślij automatyczne przypomnienie o kończącym się pakiecie lub braku płatności.
          </p>

          {/* Status badges and Actions in a grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Status badges */}
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 px-3 py-1.5">
                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="text-sm font-medium text-red-700 dark:text-red-300">
                  Brak płatności: <span className="font-semibold">{noPaymentCount}</span>
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/30 px-3 py-1.5">
                <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                  Kończą pakiet: <span className="font-semibold">{warningCount}</span>
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <Button
                onClick={handleSend}
                disabled={isSending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wysyłanie...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Wyślij przypomnienia email
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="text-muted-foreground hover:text-foreground"
              >
                Nie teraz
              </Button>
            </div>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Zamknij"
        >
          <X className="h-4 w-4" />
        </button>
        </div>
      </div>
    </PremiumFeatureGuard>
  );
}
