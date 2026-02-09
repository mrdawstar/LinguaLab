import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthContext } from './AuthContext';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme') as Theme;
      if (stored) return stored;
      // Domyślnie zawsze tryb jasny dla nowych użytkowników
      return 'light';
    }
    return 'light';
  });
  const [isLoading, setIsLoading] = useState(true);
  const [hasThemeInDatabase, setHasThemeInDatabase] = useState(false);

  // BŁĄD #16 - poprawiono: bezpieczne użycie AuthContext z fallback dla HMR
  // Użyj useContext bezpośrednio zamiast useAuth hook, aby uniknąć błędów podczas HMR
  let user = null;
  try {
    const authContextValue = useContext(AuthContext);
    user = authContextValue?.user ?? null;
  } catch (error) {
    // Jeśli AuthProvider nie jest jeszcze dostępny (np. podczas HMR), użyj null
    // ThemeProvider może działać bez user - użyje domyślnego motywu
  }

  // Load theme from database when user logs in
  useEffect(() => {
    const loadThemeFromDatabase = async () => {
      if (!user) {
        // Dla niezalogowanych użytkowników: domyślnie tryb jasny
        setTheme('light');
        setHasThemeInDatabase(false);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('theme')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          // Ignore AbortError - it's usually caused by component unmounting or navigation
          if (error.name === 'AbortError' || error.message?.includes('aborted')) {
            setIsLoading(false);
            return;
          }
          throw error;
        }

        if (data?.theme) {
          // Użytkownik ma zapisany motyw w bazie - użyj go
          setTheme(data.theme as Theme);
          setHasThemeInDatabase(true);
          localStorage.setItem('theme', data.theme);
        } else {
          // Nowy użytkownik - domyślnie tryb jasny, nie zapisuj do localStorage
          setTheme('light');
          setHasThemeInDatabase(false);
          // Usuń z localStorage jeśli był tam zapisany inny motyw (np. z preferencji systemowych)
          localStorage.removeItem('theme');
        }
      } catch (error: any) {
        // Ignore AbortError - it's usually caused by component unmounting or navigation
        if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
          setIsLoading(false);
          return;
        }
        console.error('Error loading theme from database:', error);
        // W przypadku błędu: domyślnie tryb jasny
        setTheme('light');
        setHasThemeInDatabase(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadThemeFromDatabase();
  }, [user]);

  // Apply theme to DOM and save to localStorage (tylko jeśli użytkownik ma zapisany motyw w bazie)
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    
    // Zapisz do localStorage tylko jeśli użytkownik ma zapisany motyw w bazie
    // (nowi użytkownicy nie mają motywu w bazie, więc nie zapisujemy do localStorage)
    if (user && hasThemeInDatabase) {
      localStorage.setItem('theme', theme);
    }
  }, [theme, user, hasThemeInDatabase]);

  // Save theme to database when it changes
  const saveThemeToDatabase = useCallback(async (newTheme: Theme) => {
    if (!user) return;

    try {
      // Check if user has preferences record
      const { data: existing } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing?.id) {
        // Update existing
        await supabase
          .from('user_preferences')
          .update({ theme: newTheme })
          .eq('id', existing.id);
      } else {
        // Create new preferences record with theme
        await supabase
          .from('user_preferences')
          .insert({
            user_id: user.id,
            theme: newTheme,
          });
      }
    } catch (error) {
      console.error('Error saving theme to database:', error);
    }
  }, [user]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    setHasThemeInDatabase(true); // Oznacz, że użytkownik ma teraz zapisany motyw
    saveThemeToDatabase(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
