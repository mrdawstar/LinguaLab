# 🚀 Kompletny Przewodnik Deploymentu LinguaLab

## Spis Treści
1. [Przygotowanie Projektu](#przygotowanie-projektu)
2. [Deployment na Vercel](#deployment-na-vercel)
3. [Konfiguracja Supabase](#konfiguracja-supabase)
4. [Konfiguracja Stripe](#konfiguracja-stripe)
5. [Weryfikacja](#weryfikacja)
6. [Troubleshooting](#troubleshooting)

---

## Przygotowanie Projektu

### Krok 1: Upewnij się, że kod jest w repozytorium GitHub

```bash
# Sprawdź status
git status

# Jeśli są niezacommitowane zmiany, dodaj je
git add .
git commit -m "Przygotowanie do deploymentu"

# Wypchnij do GitHub
git push origin main
```

### Krok 2: Sprawdź czy masz wszystkie pliki

Upewnij się, że masz:
- ✅ `vercel.json` - konfiguracja Vercel
- ✅ `.env.example` - szablon zmiennych środowiskowych
- ✅ `package.json` - zależności
- ✅ Kod źródłowy w `src/`

---

## Deployment na Vercel

### Metoda 1: Przez Vercel Dashboard (Zalecana)

#### 1.1. Utwórz konto na Vercel

1. Przejdź do [vercel.com](https://vercel.com)
2. Zaloguj się przez GitHub
3. Kliknij **Add New Project**

#### 1.2. Połącz repozytorium

1. Wybierz repozytorium **LinguaLab** z listy
2. Kliknij **Import**

#### 1.3. Skonfiguruj projekt

**Framework Preset:** Vite (powinno być wykryte automatycznie)

**Build Command:** `npm run build` (domyślne)

**Output Directory:** `dist` (domyślne dla Vite)

**Install Command:** `npm install` (domyślne)

**Root Directory:** `./` (domyślne)

#### 1.4. Dodaj zmienne środowiskowe

**⚠️ WAŻNE:** Dodaj te zmienne PRZED pierwszym deploymentem!

Kliknij **Environment Variables** i dodaj:

| Klucz | Wartość | Środowiska |
|-------|---------|------------|
| `VITE_SUPABASE_URL` | `https://krvwypyvurjfsmcfndav.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_PROJECT_ID` | `krvwypyvurjfsmcfndav` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Production, Preview, Development |
| `VITE_FRONTEND_URL` | `https://twoja-domena.vercel.app` | Production |

**Gdzie znaleźć wartości?**
- Przejdź do [Supabase Dashboard](https://app.supabase.com)
- Wybierz projekt → Settings → API
- Skopiuj wartości

#### 1.5. Wdróż projekt

1. Kliknij **Deploy**
2. Poczekaj na zakończenie builda (2-5 minut)
3. Po zakończeniu otrzymasz URL: `https://twoj-projekt.vercel.app`

### Metoda 2: Przez Vercel CLI

```bash
# 1. Zainstaluj Vercel CLI
npm install -g vercel

# 2. Zaloguj się
vercel login

# 3. Przejdź do katalogu projektu
cd /Users/dawidbubnow/Downloads/LinguaLab-Cursor-main

# 4. Wdróż projekt
vercel

# 5. Postępuj zgodnie z instrukcjami:
# - Set up and deploy? Y
# - Which scope? (wybierz swoje konto)
# - Link to existing project? N
# - Project name? lingualab (lub inna nazwa)
# - Directory? ./
# - Override settings? N

# 6. Dodaj zmienne środowiskowe
vercel env add VITE_SUPABASE_URL production
# Wklej wartość gdy zostaniesz poproszony

vercel env add VITE_SUPABASE_PROJECT_ID production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add VITE_FRONTEND_URL production

# 7. Wdróż ponownie z zmiennymi
vercel --prod
```

---

## Konfiguracja Supabase

### Krok 1: Wdróż Edge Functions

**⚠️ WAŻNE:** Bez tego płatności nie będą działać!

```bash
# 1. Zainstaluj Supabase CLI (jeśli jeszcze nie masz)
brew install supabase/tap/supabase
# lub
npm install -g supabase

# 2. Zaloguj się
supabase login

# 3. Połącz się z projektem
cd /Users/dawidbubnow/Downloads/LinguaLab-Cursor-main
supabase link --project-ref krvwypyvurjfsmcfndav

# 4. Ustaw secrets (zmienne środowiskowe dla funkcji)
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
supabase secrets set SUPABASE_URL=https://krvwypyvurjfsmcfndav.supabase.co
supabase secrets set SUPABASE_ANON_KEY=eyJ...

# 5. Wdróż funkcje
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook
supabase functions deploy check-subscription
```

**Gdzie znaleźć wartości?**

**STRIPE_SECRET_KEY:**
- [Stripe Dashboard](https://dashboard.stripe.com) → Developers → API keys → Secret key

**SUPABASE_SERVICE_ROLE_KEY:**
- [Supabase Dashboard](https://app.supabase.com) → Settings → API → service_role key
- ⚠️ **UWAGA:** To jest sekretny klucz - nie udostępniaj go!

### Krok 2: Skonfiguruj Redirect URLs

1. Przejdź do [Supabase Dashboard](https://app.supabase.com)
2. Wybierz projekt → **Authentication** → **URL Configuration**
3. W sekcji **Redirect URLs** dodaj:
   ```
   https://twoja-domena.vercel.app/**
   https://twoj-projekt.vercel.app/**
   ```
4. Ustaw **Site URL** na:
   ```
   https://twoja-domena.vercel.app
   ```
5. Kliknij **Save**

### Krok 3: Sprawdź migracje bazy danych

Upewnij się, że wszystkie migracje są wdrożone:

1. Przejdź do [Supabase Dashboard](https://app.supabase.com)
2. Wybierz projekt → **SQL Editor**
3. Sprawdź czy wszystkie tabele istnieją:
   - `schools`
   - `profiles`
   - `user_roles`
   - `students`
   - `teachers`
   - `groups`
   - `lessons`
   - `payments`
   - `invitations`

Jeśli brakuje tabel, wykonaj migracje z folderu `supabase/migrations/`.

---

## Konfiguracja Stripe

### Krok 1: Utwórz konto Stripe

1. Przejdź do [stripe.com](https://stripe.com)
2. Utwórz konto (lub zaloguj się)
3. Przejdź do **Developers** → **API keys**

### Krok 2: Skonfiguruj produkty i ceny

1. Przejdź do **Products** → **Add product**
2. Utwórz produkty dla planów:
   - **Basic** (monthly i yearly)
   - **Pro** (monthly i yearly)
   - **Unlimited** (monthly i yearly)
3. Skopiuj **Price IDs** (zaczynają się od `price_`)

### Krok 3: Zaktualizuj Price IDs w kodzie

Edytuj `supabase/functions/create-checkout/index.ts`:

```typescript
const PLANS: Record<string, { monthly: string; yearly: string }> = {
  basic: { 
    monthly: "price_TWOJ_PRICE_ID_MIESIECZNY",
    yearly: "price_TWOJ_PRICE_ID_ROCZNY"
  },
  pro: { 
    monthly: "price_TWOJ_PRICE_ID_MIESIECZNY",
    yearly: "price_TWOJ_PRICE_ID_ROCZNY"
  },
  unlimited: {
    monthly: "price_TWOJ_PRICE_ID_MIESIECZNY",
    yearly: "price_TWOJ_PRICE_ID_ROCZNY"
  },
};
```

Następnie wdróż funkcję ponownie:
```bash
supabase functions deploy create-checkout
```

### Krok 4: Skonfiguruj Webhook

1. Przejdź do [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **Webhooks**
2. Kliknij **Add endpoint**
3. Endpoint URL: `https://krvwypyvurjfsmcfndav.supabase.co/functions/v1/stripe-webhook`
4. Wybierz eventy:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Kliknij **Add endpoint**
6. Skopiuj **Signing secret** (zaczyna się od `whsec_`)
7. Ustaw jako secret:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   ```

---

## Weryfikacja

### 1. Sprawdź czy aplikacja się buduje

```bash
# Lokalnie
npm run build

# Powinno zakończyć się sukcesem bez błędów
```

### 2. Sprawdź deployment na Vercel

1. Przejdź do [Vercel Dashboard](https://vercel.com/dashboard)
2. Wybierz projekt → **Deployments**
3. Sprawdź czy ostatni deployment ma status **Ready** (zielony)
4. Jeśli jest błąd, kliknij na deployment i sprawdź **Build Logs**

### 3. Przetestuj aplikację

1. Otwórz URL aplikacji: `https://twoj-projekt.vercel.app`
2. Sprawdź konsolę przeglądarki (F12) - nie powinno być błędów
3. Spróbuj się zarejestrować
4. Spróbuj się zalogować
5. Sprawdź czy dashboard się ładuje

### 4. Przetestuj płatności (Test Mode)

1. Zaloguj się jako admin
2. Przejdź do `/admin/subscription`
3. Wybierz plan i kliknij "Kup teraz"
4. Powinno przekierować do Stripe Checkout
5. Użyj testowej karty: `4242 4242 4242 4242`
6. Wypełnij dowolne dane i zapłać
7. Powinno przekierować z powrotem do aplikacji
8. Sprawdź czy subskrypcja jest aktywna

---

## Troubleshooting

### Problem: Błąd "supabaseUrl is required"

**Rozwiązanie:**
1. Sprawdź czy zmienne środowiskowe są ustawione na Vercel
2. Upewnij się, że są dla wszystkich środowisk (Production, Preview, Development)
3. Zrób redeploy po dodaniu zmiennych

### Problem: Błąd 404 przy płatności

**Rozwiązanie:**
1. Sprawdź czy funkcja `create-checkout` jest wdrożona:
   ```bash
   supabase functions list
   ```
2. Jeśli nie, wdróż ją:
   ```bash
   supabase functions deploy create-checkout
   ```

### Problem: Linki zaproszeń nie działają (404)

**Rozwiązanie:**
1. Sprawdź czy `vercel.json` jest w repozytorium
2. Upewnij się, że zawiera rewrites:
   ```json
   {
     "rewrites": [
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```
3. Zrób redeploy

### Problem: Email potwierdzający nie działa

**Rozwiązanie:**
1. Sprawdź czy `VITE_FRONTEND_URL` jest ustawione na Vercel
2. Sprawdź czy URL jest dodany w Supabase → Authentication → Redirect URLs
3. Zobacz: `SUPABASE_EMAIL_REDIRECT_SETUP.md`

### Problem: Webhook Stripe nie działa

**Rozwiązanie:**
1. Sprawdź czy funkcja `stripe-webhook` jest wdrożona
2. Sprawdź czy `STRIPE_WEBHOOK_SECRET` jest ustawione
3. Sprawdź logi funkcji w Supabase Dashboard → Edge Functions → stripe-webhook → Logs
4. Sprawdź czy endpoint URL w Stripe jest poprawny

### Problem: Build się nie powodzi

**Rozwiązanie:**
1. Sprawdź Build Logs na Vercel
2. Sprawdź czy wszystkie zależności są w `package.json`
3. Spróbuj zbudować lokalnie: `npm run build`
4. Sprawdź czy nie ma błędów TypeScript: `npm run lint`

---

## Checklist Deploymentu

Przed uznaniem deploymentu za zakończony, sprawdź:

### Vercel
- [ ] Projekt jest wdrożony i działa
- [ ] Wszystkie zmienne środowiskowe są ustawione
- [ ] Build kończy się sukcesem
- [ ] Aplikacja jest dostępna pod URL

### Supabase
- [ ] Edge Functions są wdrożone (`create-checkout`, `stripe-webhook`, `check-subscription`)
- [ ] Wszystkie secrets są ustawione
- [ ] Redirect URLs są skonfigurowane
- [ ] Site URL jest ustawiony
- [ ] Migracje bazy danych są wykonane

### Stripe
- [ ] Produkty i ceny są utworzone
- [ ] Price IDs są zaktualizowane w kodzie
- [ ] Webhook jest skonfigurowany
- [ ] Webhook secret jest ustawiony w Supabase

### Testy
- [ ] Rejestracja działa
- [ ] Logowanie działa
- [ ] Dashboard się ładuje
- [ ] Płatności działają (test mode)
- [ ] Webhook aktualizuje subskrypcję
- [ ] Linki zaproszeń działają
- [ ] Email potwierdzający działa

---

## Następne Kroki

Po udanym deploymentzie:

1. **Skonfiguruj domenę własną** (opcjonalnie):
   - Vercel Dashboard → Settings → Domains
   - Dodaj swoją domenę
   - Zaktualizuj `VITE_FRONTEND_URL` i Redirect URLs w Supabase

2. **Przełącz Stripe na Production Mode**:
   - Zmień `STRIPE_SECRET_KEY` z `sk_test_` na `sk_live_`
   - Zaktualizuj Price IDs na production prices
   - Przetestuj płatności w production mode

3. **Skonfiguruj monitoring**:
   - Vercel Analytics (wbudowane)
   - Supabase Logs (Edge Functions)
   - Stripe Dashboard (webhook events)

---

## Wsparcie

Jeśli masz problemy:
1. Sprawdź logi na Vercel (Deployments → Build Logs)
2. Sprawdź logi Supabase (Edge Functions → Logs)
3. Sprawdź konsolę przeglądarki (F12)
4. Zobacz dokumentację:
   - `VERCEL_SETUP.md` - konfiguracja Vercel
   - `STRIPE_CHECKOUT_FIX.md` - naprawa płatności
   - `SUPABASE_EMAIL_REDIRECT_SETUP.md` - konfiguracja email

---

**Powodzenia z deploymentem! 🚀**
