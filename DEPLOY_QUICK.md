# ⚡ Szybki Deployment - Krok po Kroku

## 🎯 Najszybsza Metoda (5 minut)

### 1. Przygotuj kod

```bash
cd /Users/dawidbubnow/Downloads/LinguaLab-Cursor-main

# Sprawdź czy wszystko jest zacommitowane
git status

# Jeśli są zmiany, dodaj je
git add .
git commit -m "Przygotowanie do deploymentu"
git push
```

### 2. Wdróż na Vercel (przez Dashboard)

1. **Otwórz** [vercel.com](https://vercel.com) i zaloguj się przez GitHub
2. **Kliknij** "Add New Project"
3. **Wybierz** repozytorium `LinguaLab`
4. **Kliknij** "Import"

### 3. Dodaj zmienne środowiskowe (PRZED deploymentem!)

W sekcji **Environment Variables** dodaj:

```
VITE_SUPABASE_URL = https://krvwypyvurjfsmcfndav.supabase.co
VITE_SUPABASE_PROJECT_ID = krvwypyvurjfsmcfndav
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtydnd5cHl2dXJqZnNtY2ZuZGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3MjgzMjMsImV4cCI6MjA4NDMwNDMyM30.HpzvXRmpHHbXedCl6GzXrW3er55eB6HD4lFUEofDH0E
```

**Dla wszystkich środowisk:** Production, Preview, Development

### 4. Wdróż

1. **Kliknij** "Deploy"
2. **Poczekaj** 2-5 minut
3. **Gotowe!** Otrzymasz URL: `https://twoj-projekt.vercel.app`

---

## 🔧 Konfiguracja Supabase (10 minut)

### Wdróż Edge Functions

```bash
# 1. Zainstaluj Supabase CLI
brew install supabase/tap/supabase

# 2. Zaloguj się
supabase login

# 3. Połącz z projektem
cd /Users/dawidbubnow/Downloads/LinguaLab-Cursor-main
supabase link --project-ref krvwypyvurjfsmcfndav

# 4. Ustaw secrets (wklej wartości gdy zostaniesz poproszony)
supabase secrets set STRIPE_SECRET_KEY
supabase secrets set SUPABASE_SERVICE_ROLE_KEY
supabase secrets set SUPABASE_URL
supabase secrets set SUPABASE_ANON_KEY

# 5. Wdróż funkcje
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook
```

**Gdzie znaleźć wartości?**
- **STRIPE_SECRET_KEY**: [Stripe Dashboard](https://dashboard.stripe.com) → Developers → API keys
- **SUPABASE_SERVICE_ROLE_KEY**: [Supabase Dashboard](https://app.supabase.com) → Settings → API → service_role key

### Skonfiguruj Redirect URLs

1. [Supabase Dashboard](https://app.supabase.com) → Authentication → URL Configuration
2. Dodaj do **Redirect URLs**: `https://twoj-projekt.vercel.app/**`
3. Ustaw **Site URL**: `https://twoj-projekt.vercel.app`
4. **Zapisz**

---

## 💳 Konfiguracja Stripe (5 minut)

### 1. Utwórz produkty

[Stripe Dashboard](https://dashboard.stripe.com) → Products → Add product

Utwórz:
- Basic (monthly + yearly)
- Pro (monthly + yearly)  
- Unlimited (monthly + yearly)

### 2. Zaktualizuj Price IDs

Edytuj `supabase/functions/create-checkout/index.ts` i zamień Price IDs na swoje.

### 3. Skonfiguruj Webhook

1. [Stripe Dashboard](https://dashboard.stripe.com) → Developers → Webhooks → Add endpoint
2. URL: `https://krvwypyvurjfsmcfndav.supabase.co/functions/v1/stripe-webhook`
3. Events: `checkout.session.completed`, `customer.subscription.*`
4. Skopiuj **Signing secret** (`whsec_...`)
5. Ustaw: `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`

---

## ✅ Sprawdź czy działa

1. Otwórz URL aplikacji
2. Zarejestruj się
3. Zaloguj się
4. Spróbuj kupić pakiet (test mode)

---

## 🆘 Problemy?

### Błąd "supabaseUrl is required"
→ Sprawdź zmienne środowiskowe na Vercel i zrób redeploy

### Błąd 404 przy płatności
→ Wdróż funkcję: `supabase functions deploy create-checkout`

### Linki nie działają
→ Sprawdź czy `vercel.json` jest w repozytorium

**Więcej pomocy:** Zobacz `DEPLOYMENT_COMPLETE.md`

---

**Gotowe! 🎉**
