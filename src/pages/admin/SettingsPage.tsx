import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { 
  Save, 
  Loader2, 
  Building2,
  Moon,
  Sun
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ColorSettings } from '@/components/settings/ColorSettings';

interface SchoolData {
  id: string;
  name: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
}

interface SettingsData {
  id: string;
  currency: string;
  timezone: string;
  lesson_duration_minutes: number;
  email_notifications: boolean;
  sms_notifications: boolean;
}

export default function SettingsPage() {
  const { schoolId, canViewFinances, role } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [school, setSchool] = useState<SchoolData | null>(null);
  const [settings, setSettings] = useState<SettingsData | null>(null);

  useEffect(() => {
    if (!schoolId) {
      setIsLoading(false);
      setSchool(null);
      setSettings(null);
      return;
    }
    fetchData();
  }, [schoolId]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch school data
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('*')
        .eq('id', schoolId)
        .maybeSingle();

      if (schoolError) throw schoolError;
      if (schoolData) setSchool(schoolData);

      // Fetch settings
      let { data: settingsData, error: settingsError } = await supabase
        .from('school_settings')
        .select('*')
        .eq('school_id', schoolId)
        .maybeSingle();

      if (settingsError) throw settingsError;
      
      // If no settings exist, create default settings
      if (!settingsData) {
        const { data: createdSettings, error: createError } = await supabase
          .from('school_settings')
          .insert({
            school_id: schoolId,
            currency: 'PLN',
            timezone: 'Europe/Warsaw',
            lesson_duration_minutes: 60,
            email_notifications: true,
            sms_notifications: false,
          })
          .select()
          .single();

        if (createError) throw createError;
        settingsData = createdSettings;
      }

      if (settingsData) setSettings(settingsData);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Nie udało się pobrać ustawień');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!school || !settings) {
      toast.error('Brak danych do zapisania');
      return;
    }
    
    if (!settings.id) {
      toast.error('Brak ID ustawień szkoły');
      console.error('Settings object:', settings);
      return;
    }
    
    setIsSaving(true);
    try {
      // Only allow admin to update school name
      if (role === 'admin') {
        const { error: schoolError } = await supabase
          .from('schools')
          .update({
            name: school.name,
          })
          .eq('id', school.id);

        if (schoolError) throw schoolError;
      }

      toast.success('Ustawienia zostały zapisane');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Nie udało się zapisać ustawień');
    } finally {
      setIsSaving(false);
    }
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

  if (!schoolId) {
    return (
      <DashboardLayout requiredRole={['admin', 'manager']}>
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Brak przypisanej szkoły</h2>
          <p className="text-muted-foreground">
            To konto nie ma przypisanej szkoły. Skontaktuj się z administratorem.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Ustawienia" 
      subtitle="Zarządzaj ustawieniami szkoły"
      requiredRole={['admin', 'manager']}
      actions={
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-xl bg-gradient-primary"
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Zapisz zmiany
        </Button>
      }
    >
      <div className="space-y-6">

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            {/* School Info */}
            <div className="glass-card p-6">
              <div className="mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Informacje o szkole</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Nazwa szkoły
                    {role !== 'admin' && (
                      <span className="ml-2 text-xs text-muted-foreground">(tylko admin)</span>
                    )}
                  </label>
                  <Input
                    value={school?.name || ''}
                    onChange={(e) => setSchool(prev => prev ? { ...prev, name: e.target.value } : null)}
                    className="rounded-xl"
                    placeholder="Nazwa Twojej szkoły"
                    disabled={role !== 'admin'}
                  />
                </div>
              </div>
            </div>

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

          {/* Personal Color Settings */}
          <ColorSettings />

        </div>
      </div>
    </DashboardLayout>
  );
}
