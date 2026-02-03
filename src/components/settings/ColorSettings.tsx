import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Palette, RefreshCw, RotateCcw, Loader2 } from 'lucide-react';
import { useUserPreferences } from '@/hooks/useUserPreferences';

export function ColorSettings() {
  const { preferences, isLoading, savePreferences, resetToDefaults, DEFAULT_COLORS } = useUserPreferences();
  const [localColors, setLocalColors] = useState({
    primary_color: DEFAULT_COLORS.primary_color,
    secondary_color: DEFAULT_COLORS.secondary_color,
    accent_color: DEFAULT_COLORS.accent_color,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (preferences) {
      setLocalColors({
        primary_color: preferences.primary_color,
        secondary_color: preferences.secondary_color,
        accent_color: preferences.accent_color,
      });
    }
  }, [preferences]);

  const handleSave = async () => {
    setIsSaving(true);
    await savePreferences(localColors);
    setIsSaving(false);
  };

  const handleReset = async () => {
    setIsSaving(true);
    await resetToDefaults();
    setLocalColors(DEFAULT_COLORS);
    setIsSaving(false);
  };

  const handlePreview = () => {
    // Temporarily apply colors for preview
    const hexToHsl = (hex: string): string => {
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
    };

    document.documentElement.style.setProperty('--primary', hexToHsl(localColors.primary_color));
    document.documentElement.style.setProperty('--ring', hexToHsl(localColors.primary_color));
    document.documentElement.style.setProperty('--sidebar-primary', hexToHsl(localColors.primary_color));
  };

  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">Kolor główny</h2>
            <p className="text-sm text-muted-foreground">
              Ten kolor ustawia wygląd przycisków, linków i akcentów w aplikacji.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreview}
            className="rounded-xl"
          >
            <RefreshCw className="mr-2 h-3 w-3" />
            Podgląd
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={isSaving}
            className="rounded-xl"
          >
            <RotateCcw className="mr-2 h-3 w-3" />
            Domyślne
          </Button>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative h-12 w-20">
            <div
              className="h-full w-full rounded-xl border border-border shadow-sm"
              style={{ backgroundColor: localColors.primary_color }}
              aria-hidden
            />
            <input
              type="color"
              value={localColors.primary_color}
              onChange={(e) => setLocalColors(prev => ({ ...prev, primary_color: e.target.value }))}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              aria-label="Wybierz kolor główny"
            />
          </div>
          <div className="flex flex-1 items-center gap-3">
            <Input
              value={localColors.primary_color}
              onChange={(e) => setLocalColors(prev => ({ ...prev, primary_color: e.target.value }))}
              className="flex-1 rounded-xl font-mono"
              placeholder="#3b82f6"
            />
            <div
              className="h-12 w-12 rounded-xl border border-border"
              style={{ backgroundColor: localColors.primary_color }}
              aria-hidden
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <p className="text-sm font-medium text-foreground">Podgląd</p>
          <p className="mt-1 text-sm text-muted-foreground">
            To przykładowy wygląd elementów interfejsu z wybranym kolorem.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white dark:text-black"
              style={{ backgroundColor: localColors.primary_color }}
            >
              Przycisk główny
            </div>
            <span className="text-sm" style={{ color: localColors.primary_color }}>
              Link akcentu
            </span>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full rounded-xl bg-gradient-primary"
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Zapisz kolor
        </Button>
      </div>
    </div>
  );
}
