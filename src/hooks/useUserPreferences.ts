import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface UserPreferences {
  id?: string;
  user_id: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  theme?: 'light' | 'dark';
}

const DEFAULT_COLORS = {
  primary_color: '#3b82f6',
  secondary_color: '#60a5fa',
  accent_color: '#93c5fd',
};

export function useUserPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const hexToHsl = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '221 83% 53%';
    
    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const applyColors = useCallback((colors: { primary_color: string; secondary_color: string; accent_color: string }) => {
    document.documentElement.style.setProperty('--primary', hexToHsl(colors.primary_color));
    document.documentElement.style.setProperty('--ring', hexToHsl(colors.primary_color));
    document.documentElement.style.setProperty('--sidebar-primary', hexToHsl(colors.primary_color));
    document.documentElement.style.setProperty('--sidebar-ring', hexToHsl(colors.primary_color));
    
    // Create gradient
    const primaryHsl = hexToHsl(colors.primary_color);
    const [h, s, l] = primaryHsl.split(' ');
    const lighterL = Math.min(parseInt(l) + 10, 100);
    document.documentElement.style.setProperty(
      '--gradient-primary',
      `linear-gradient(135deg, hsl(${primaryHsl}) 0%, hsl(${h} ${s} ${lighterL}%) 100%)`
    );
  }, []);

  const fetchPreferences = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences(data);
        applyColors(data);
      } else {
        // No preferences yet, use defaults
        setPreferences({
          user_id: user.id,
          ...DEFAULT_COLORS,
        });
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, applyColors]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const savePreferences = async (newPreferences: Partial<UserPreferences>) => {
    if (!user) return;

    try {
      const updatedPrefs = {
        ...preferences,
        ...newPreferences,
        user_id: user.id,
      };

      if (preferences?.id) {
        // Update existing
        const { error } = await supabase
          .from('user_preferences')
          .update({
            primary_color: updatedPrefs.primary_color,
            secondary_color: updatedPrefs.secondary_color,
            accent_color: updatedPrefs.accent_color,
            ...(newPreferences.theme && { theme: newPreferences.theme }),
          })
          .eq('id', preferences.id);

        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('user_preferences')
          .insert({
            user_id: user.id,
            primary_color: updatedPrefs.primary_color,
            secondary_color: updatedPrefs.secondary_color,
            accent_color: updatedPrefs.accent_color,
            ...(newPreferences.theme && { theme: newPreferences.theme }),
          })
          .select()
          .single();

        if (error) throw error;
        updatedPrefs.id = data.id;
      }

      setPreferences(updatedPrefs as UserPreferences);
      applyColors(updatedPrefs as UserPreferences);
      toast.success('Preferencje zostały zapisane');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Nie udało się zapisać preferencji');
    }
  };

  const resetToDefaults = async () => {
    await savePreferences(DEFAULT_COLORS);
    toast.success('Przywrócono domyślne kolory');
  };

  return {
    preferences,
    isLoading,
    savePreferences,
    resetToDefaults,
    applyColors,
    DEFAULT_COLORS,
  };
}
