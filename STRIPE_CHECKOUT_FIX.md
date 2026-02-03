# Naprawa błędu 404 NOT_FOUND dla Stripe Checkout

## Problem

Gdy próbujesz zapłacić na Vercel, dostajesz błąd:
```
404: NOT_FOUND
Code: NOT_FOUND
```

To oznacza, że **Supabase Edge Function `create-checkout` nie jest wdrożona**.

## Rozwiązanie: Wdróż funkcję na Supabase

### Krok 1: Zainstaluj Supabase CLI (jeśli jeszcze nie masz)

```bash
# macOS
brew install supabase/tap/supabase

# Lub przez npm
npm install -g supabase
```

### Krok 2: Zaloguj się do Supabase CLI

```bash
supabase login
```

To otworzy przeglądarkę, gdzie zalogujesz się do Supabase.

### Krok 3: Połącz się z projektem

```bash
# Przejdź do katalogu projektu
cd /Users/dawidbubnow/Downloads/LinguaLab-Cursor-main

# Połącz się z projektem (użyj swojego project reference)
# Sprawdź w .env pliku VITE_SUPABASE_PROJECT_ID lub w Supabase Dashboard
supabase link --project-ref krvwypyvurjfsmcfndav
```

**Gdzie znaleźć project reference?**
- Sprawdź w pliku `.env` - `VITE_SUPABASE_PROJECT_ID`
- Lub przejdź do [Supabase Dashboard](https://app.supabase.com)
- Wybierz projekt
- W Settings → General znajdziesz **Reference ID**

**⚠️ UWAGA:** Upewnij się, że używasz tego samego projektu co w `.env`!

### Krok 4: Ustaw secrets (zmienne środowiskowe)

Funkcja potrzebuje następujących secrets:

```bash
# 1. Stripe Secret Key (z Stripe Dashboard)
supabase secrets set STRIPE_SECRET_KEY=sk_test_...  # dla test mode
# lub
supabase secrets set STRIPE_SECRET_KEY=sk_live_...  # dla production

# 2. Supabase Service Role Key (z Supabase Dashboard → Settings → API)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...

# 3. Supabase URL (opcjonalne, może być już ustawione)
# Użyj wartości z .env: VITE_SUPABASE_URL
supabase secrets set SUPABASE_URL=https://krvwypyvurjfsmcfndav.supabase.co

# 4. Supabase Anon Key (opcjonalne, może być już ustawione)
# Użyj wartości z .env: VITE_SUPABASE_ANON_KEY
supabase secrets set SUPABASE_ANON_KEY=eyJ...
```

**Gdzie znaleźć te wartości?**

**Stripe Secret Key:**
1. Przejdź do [Stripe Dashboard](https://dashboard.stripe.com)
2. Developers → API keys
3. Skopiuj **Secret key** (zaczyna się od `sk_test_` dla test mode lub `sk_live_` dla production)

**Supabase Service Role Key:**
1. Przejdź do [Supabase Dashboard](https://app.supabase.com)
2. Wybierz projekt → Settings → API
3. Skopiuj **service_role** key (⚠️ UWAGA: To jest sekretny klucz, nie udostępniaj go publicznie!)

### Krok 5: Wdróż funkcję create-checkout

```bash
supabase functions deploy create-checkout
```

Powinieneś zobaczyć coś takiego:
```
Deploying function create-checkout...
Function create-checkout deployed successfully!
```

### Krok 6: Weryfikacja

Sprawdź czy funkcja jest wdrożona:

1. Przejdź do [Supabase Dashboard](https://app.supabase.com)
2. Wybierz projekt → Edge Functions
3. Powinieneś zobaczyć `create-checkout` na liście

Lub przetestuj bezpośrednio:

```bash
# Sprawdź status funkcji
supabase functions list
```

### Krok 7: Przetestuj ponownie

1. Przejdź na swoją aplikację na Vercel
2. Zaloguj się jako admin
3. Spróbuj kupić pakiet
4. Powinno przekierować do Stripe Checkout zamiast błędu 404

## Alternatywa: Wdróż przez Supabase Dashboard

Jeśli nie możesz użyć CLI, możesz wdrożyć funkcję przez Dashboard:

1. Przejdź do [Supabase Dashboard](https://app.supabase.com)
2. Wybierz projekt → Edge Functions
3. Kliknij **Create a new function**
4. Nazwa: `create-checkout`
5. Skopiuj kod z `supabase/functions/create-checkout/index.ts`
6. Wklej kod
7. Ustaw secrets (Settings → Secrets):
   - `STRIPE_SECRET_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
8. Kliknij **Deploy**

## Troubleshooting

### Błąd: "Function not found" po wdrożeniu

**Problem:** Funkcja jest wdrożona, ale nadal dostajesz 404.

**Rozwiązanie:**
1. Sprawdź czy używasz poprawnego URL:
   ```
   https://krvwypyvurjfsmcfndav.supabase.co/functions/v1/create-checkout
   ```
2. Sprawdź czy funkcja jest publiczna (nie wymaga dodatkowej autoryzacji)
3. Sprawdź logi funkcji w Supabase Dashboard → Edge Functions → create-checkout → Logs

### Błąd: "Missing server configuration"

**Problem:** Funkcja zwraca błąd 500 z komunikatem "Missing server configuration".

**Rozwiązanie:**
1. Sprawdź czy wszystkie secrets są ustawione:
   ```bash
   supabase secrets list
   ```
2. Ustaw brakujące secrets (patrz Krok 4)

### Błąd: "Unauthorized"

**Problem:** Funkcja zwraca błąd 401 Unauthorized.

**Rozwiązanie:**
1. Upewnij się, że jesteś zalogowany w aplikacji
2. Sprawdź czy token autoryzacji jest wysyłany w headerze `Authorization: Bearer ...`
3. Sprawdź konsolę przeglądarki (F12) czy nie ma błędów autoryzacji

### Funkcja działa lokalnie, ale nie na Vercel

**Problem:** Funkcja działa na localhost, ale nie działa na Vercel.

**Rozwiązanie:**
1. Sprawdź czy `VITE_SUPABASE_URL` jest ustawione na Vercel
2. Upewnij się, że używasz tego samego projektu Supabase
3. Sprawdź czy funkcja jest wdrożona na tym samym projekcie Supabase

## Sprawdzenie czy wszystko działa

Po wdrożeniu możesz przetestować funkcję bezpośrednio:

```bash
# Pobierz swój access token z aplikacji (konsola przeglądarki po zalogowaniu)
# Wykonaj request:
curl -X POST \
  https://krvwypyvurjfsmcfndav.supabase.co/functions/v1/create-checkout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"plan":"basic","billingCycle":"monthly"}'
```

Powinieneś otrzymać odpowiedź z `url` do Stripe Checkout.

## Ważne uwagi

⚠️ **Secrets:**
- Nigdy nie commituj secrets do repozytorium
- Używaj `sk_test_` dla test mode, `sk_live_` dla production
- Service Role Key jest bardzo wrażliwy - nie udostępniaj go

✅ **Best practices:**
- Wdróż funkcję przed wdrożeniem aplikacji na Vercel
- Testuj funkcję lokalnie przed wdrożeniem
- Sprawdzaj logi funkcji w Supabase Dashboard

## Następne kroki

Po wdrożeniu `create-checkout`, powinieneś też wdrożyć:
- `stripe-webhook` - do obsługi płatności (patrz DEPLOYMENT_GUIDE.md)
