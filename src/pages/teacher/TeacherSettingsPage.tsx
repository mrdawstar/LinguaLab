import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ColorSettings } from '@/components/settings/ColorSettings';
import { useTheme } from '@/contexts/ThemeContext';
import { Switch } from '@/components/ui/switch';
import { Moon, Sun } from 'lucide-react';

export default function TeacherSettingsPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <DashboardLayout requiredRole="teacher">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ustawienia</h1>
          <p className="text-muted-foreground">Dostosuj wygląd aplikacji</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <ColorSettings />

          {/* Theme toggle */}
          <div className="glass-card p-6">
            <div className="mb-4 flex items-center gap-2">
              {theme === 'dark' ? (
                <Moon className="h-5 w-5 text-primary" />
              ) : (
                <Sun className="h-5 w-5 text-primary" />
              )}
              <h2 className="text-lg font-semibold text-foreground">Motyw</h2>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Tryb ciemny</p>
                <p className="text-sm text-muted-foreground">
                  Zmień wygląd aplikacji na ciemny motyw
                </p>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={toggleTheme}
              />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
