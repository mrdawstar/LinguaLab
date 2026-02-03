# Dodatkowe znalezione błędy

## ✅ WSZYSTKIE DODATKOWE BŁĘDY NAPRAWIONE

### 11. ✅ **Niespójność `exceeded` i `canAdd` gdy `plan === null && !isTrial`** - NAPRAWIONE
**Lokalizacja:** `src/hooks/useSubscriptionLimits.ts:62-88`
**Rozwiązanie:** Zmieniono logikę `exceeded` - teraz jest `true` gdy `canAdd` jest `false`, niezależnie od tego czy jest plan czy trial.

### 12. ✅ **Użycie `isTrial` w `queryFn` może używać starej wartości** - NAPRAWIONE
**Lokalizacja:** `src/hooks/useSubscriptionLimits.ts:35`
**Rozwiązanie:** Używa `trial_active && !subscribed` bezpośrednio w `queryFn` zamiast `isTrial`, co zapewnia zawsze aktualną wartość.

### 13. ✅ **Default values w `useSubscription` mogą być mylące** - NAPRAWIONE
**Lokalizacja:** `src/hooks/useSubscription.ts:214`
**Rozwiązanie:** Zmieniono default values:
- `trial_active: false` (zamiast `true`)
- `trial_days_left: 0` (zamiast `7`)
- `access_allowed: false` (zamiast `true`)

### 14. **Warunek `showTrialBanner` może nie działać poprawnie** - NIE WYMAGA NAPRAWY
**Lokalizacja:** `src/components/layout/SubscriptionGuard.tsx:28`
**Status:** Nie wymaga naprawy - `trial_days_left` jest już sprawdzane w `useSubscription` i będzie 0 jeśli trial wygasł.

### 15. ✅ **Podwójna walidacja w dialogach** - NAPRAWIONE
**Lokalizacja:** 
- `src/components/admin/TeacherDialog.tsx:112-126`
- `src/components/admin/StudentDialog.tsx:118-132`
- `src/components/admin/GroupDialog.tsx:90-104`
**Rozwiązanie:** Uproszczono logikę - sprawdzamy tylko `!limits.canAdd` zamiast podwójnej walidacji.

## 📊 PODSUMOWANIE DODATKOWYCH BŁĘDÓW

**Całkowita liczba dodatkowych błędów:** 5
- ✅ Naprawione: 4
- ℹ️ Nie wymaga naprawy: 1
- ❌ Pozostałe: 0
