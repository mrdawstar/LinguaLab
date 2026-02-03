# Konfiguracja URL przekierowania dla potwierdzenia emaila w Supabase

## Problem

Supabase wysyła link potwierdzający email, który przekierowuje użytkownika po kliknięciu. Aby to działało poprawnie, musisz skonfigurować URL przekierowania zarówno w kodzie aplikacji, jak i w Supabase Dashboard.

## Rozwiązanie

### Krok 1: Ustaw zmienną środowiskową (opcjonalne, ale zalecane)

Dodaj zmienną środowiskową `VITE_FRONTEND_URL` z URL Twojej aplikacji:

**W pliku `.env` (lokalnie):**
```env
VITE_FRONTEND_URL="https://twoja-domena.com"
```

**Na Vercel:**
1. Przejdź do projektu na Vercel
2. Settings → Environment Variables
3. Dodaj: `VITE_FRONTEND_URL` = `https://twoja-domena.com`
4. Zapisz i zrób redeploy

**Uwaga:** Jeśli nie ustawisz `VITE_FRONTEND_URL`, aplikacja użyje `window.location.origin` (działa lokalnie, ale może nie działać w produkcji).

### Krok 2: Skonfiguruj URL w Supabase Dashboard

**To jest najważniejszy krok!** Supabase musi wiedzieć, które URL są dozwolone dla przekierowań.

1. Przejdź do [Supabase Dashboard](https://app.supabase.com)
2. Wybierz swój projekt
3. Przejdź do **Authentication** → **URL Configuration**
4. W sekcji **Redirect URLs** dodaj następujące URL:

   **Dla produkcji:**
   ```
   https://twoja-domena.com/**
   ```

   **Dla developmentu (opcjonalnie):**
   ```
   http://localhost:8080/**
   http://localhost:5173/**
   ```

   **Dla Vercel preview deployments (opcjonalnie):**
   ```
   https://*.vercel.app/**
   ```

5. Kliknij **Save**

### Krok 3: Sprawdź Site URL

W tym samym miejscu (Authentication → URL Configuration) upewnij się, że **Site URL** jest ustawiony na:

```
https://twoja-domena.com
```

lub dla developmentu:

```
http://localhost:8080
```

## Jak to działa

1. Użytkownik rejestruje się w aplikacji
2. Aplikacja wywołuje `supabase.auth.signUp()` z `emailRedirectTo: getEmailRedirectUrl()`
3. Funkcja `getEmailRedirectUrl()` zwraca:
   - `VITE_FRONTEND_URL` jeśli jest ustawione
   - `window.location.origin` jako fallback
4. Supabase wysyła email z linkiem potwierdzającym
5. Link zawiera token i przekierowuje na URL ustawiony w `emailRedirectTo`
6. Po kliknięciu, Supabase sprawdza czy URL jest na liście dozwolonych
7. Jeśli tak, użytkownik jest przekierowany i zalogowany

## Przykłady konfiguracji

### Development (lokalnie)
```env
# .env
VITE_FRONTEND_URL="http://localhost:8080"
```

W Supabase Dashboard dodaj:
- Redirect URL: `http://localhost:8080/**`
- Site URL: `http://localhost:8080`

### Production (Vercel)
```env
# Vercel Environment Variables
VITE_FRONTEND_URL="https://lingualab.pl"
```

W Supabase Dashboard dodaj:
- Redirect URL: `https://lingualab.pl/**`
- Site URL: `https://lingualab.pl`

### Staging + Production
W Supabase Dashboard możesz dodać wiele URL:
- `https://lingualab.pl/**` (production)
- `https://staging.lingualab.pl/**` (staging)
- `http://localhost:8080/**` (development)

## Troubleshooting

### Link przekierowuje na zły URL

**Problem:** Link w emailu przekierowuje na `localhost` zamiast na produkcję.

**Rozwiązanie:**
1. Sprawdź czy `VITE_FRONTEND_URL` jest ustawione na Vercel
2. Zrób redeploy aplikacji
3. Sprawdź czy URL jest dodany w Supabase Dashboard → Redirect URLs

### Błąd: "Invalid redirect URL"

**Problem:** Supabase odrzuca przekierowanie z błędem "Invalid redirect URL".

**Rozwiązanie:**
1. Sprawdź czy URL jest dodany w Supabase Dashboard → Authentication → URL Configuration → Redirect URLs
2. Upewnij się, że URL jest dokładnie taki sam (z protokołem `https://`, bez końcowego `/` w liście, ale z `/**` na końcu)
3. Sprawdź czy `VITE_FRONTEND_URL` w kodzie odpowiada URL w Supabase

### Link działa lokalnie, ale nie w produkcji

**Problem:** Link działa na `localhost`, ale nie działa na Vercel.

**Rozwiązanie:**
1. Dodaj `VITE_FRONTEND_URL` na Vercel z URL produkcji
2. Dodaj URL produkcji do Supabase Redirect URLs
3. Zrób redeploy

## Ważne uwagi

⚠️ **Bezpieczeństwo:**
- Supabase sprawdza czy URL jest na liście dozwolonych
- Nie możesz przekierować na dowolny URL - musi być wcześniej dodany w Dashboard
- Używaj `https://` w produkcji

✅ **Best practices:**
- Używaj `VITE_FRONTEND_URL` w produkcji zamiast `window.location.origin`
- Dodaj wszystkie środowiska (dev, staging, production) do Redirect URLs
- Testuj linki potwierdzające na każdym środowisku przed wdrożeniem

## Sprawdzenie konfiguracji

Aby sprawdzić jaki URL jest używany:

1. Otwórz konsolę przeglądarki (F12)
2. Wykonaj:
   ```javascript
   console.log('Redirect URL:', import.meta.env.VITE_FRONTEND_URL || window.location.origin);
   ```
3. Powinien pokazać URL który będzie użyty dla przekierowań
