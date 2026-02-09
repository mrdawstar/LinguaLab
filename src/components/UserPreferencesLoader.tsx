import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const DEFAULT_COLORS = {
  primary_color: '#3b82f6',
  secondary_color: '#60a5fa',
  accent_color: '#93c5fd',
};

function hexToHsl(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '221 83% 53%';
  
  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;
  
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
}

function applyColors(colors: { primary_color: string; secondary_color: string; accent_color: string }) {
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
}

export function UserPreferencesLoader({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    async function loadPreferences() {
      if (!user) {
        // Reset to defaults when logged out
        applyColors(DEFAULT_COLORS);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('primary_color, secondary_color, accent_color')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          // Ignore AbortError - it's usually caused by component unmounting or navigation
          if (error.name === 'AbortError' || error.message?.includes('aborted')) {
            return;
          }
          console.error('Error loading preferences:', error);
          return;
        }

        if (data) {
          applyColors(data);
        }
      } catch (error: any) {
        // Ignore AbortError - it's usually caused by component unmounting or navigation
        if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
          return;
        }
        console.error('Error loading preferences:', error);
      }
    }

    loadPreferences();
  }, [user]);

  return <>{children}</>;
}
