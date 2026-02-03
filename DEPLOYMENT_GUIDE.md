# Przewodnik wdrożenia funkcji Supabase Edge Functions

## Funkcje krytyczne (MUSZĄ być wdrożone)

### 1. `create-checkout` - **WYMAGANE**
**Dlaczego:** Używana do tworzenia sesji płatności Stripe. Bez niej użytkownicy nie mogą kupować pakietów.

**Jak wdrożyć:**
```bash
supabase functions deploy create-checkout
```

**Wymagane zmienne środowiskowe:**
- `STRIPE_SECRET_KEY` - Twój klucz sekretny Stripe
- `SUPABASE_URL` - URL projektu Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key Supabase

---

### 2. `stripe-webhook` - **WYMAGANE**
**Dlaczego:** Aktualizuje status subskrypcji w bazie danych po udanej płatności. Bez niej płatności nie będą aktywować subskrypcji.

**Jak wdrożyć:**
```bash
supabase functions deploy stripe-webhook
```

**Wymagane zmienne środowiskowe:**
- `STRIPE_SECRET_KEY` - Twój klucz sekretny Stripe
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret z Stripe Dashboard
- `SUPABASE_URL` - URL projektu Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key Supabase

**Konfiguracja w Stripe Dashboard:**
1. Przejdź do [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Dodaj endpoint: `https://[YOUR_PROJECT_REF].supabase.co/functions/v1/stripe-webhook`
3. Wybierz eventy:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Skopiuj **Signing secret** (zaczyna się od `whsec_`)
5. Ustaw jako secret: `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`

---

### 3. `check-subscription` - **OPCJONALNE** (ma fallback)
**Dlaczego:** Używana do sprawdzania statusu subskrypcji. Ma fallback do bezpośredniego odczytu z bazy danych, więc aplikacja będzie działać bez niej, ale może być wolniejsza.

**Jak wdrożyć:**
```bash
supabase functions deploy check-subscription
```

**Wymagane zmienne środowiskowe:**
- `SUPABASE_URL` - URL projektu Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key Supabase

---

## Funkcje opcjonalne (nie są krytyczne)

### 4. `bootstrap-user` - **OPCJONALNE**
**Dlaczego:** Tworzy profil i szkołę dla nowych użytkowników. Błędy są ignorowane, aplikacja działa bez niej (używa migracji zamiast tego).

**Jak wdrożyć (jeśli chcesz):**
```bash
supabase functions deploy bootstrap-user
```

---

### 5. `customer-portal` - **OPCJONALNE**
**Dlaczego:** Używana tylko do zarządzania subskrypcją przez Stripe Customer Portal. Nie jest wymagana do podstawowego działania.

**Jak wdrożyć (jeśli chcesz):**
```bash
supabase functions deploy customer-portal
```

---

### 6. `sync-subscription` - **OPCJONALNE**
**Dlaczego:** Używana do ręcznej synchronizacji subskrypcji z Stripe. Nie jest wymagana do podstawowego działania.

**Jak wdrożyć (jeśli chcesz):**
```bash
supabase functions deploy sync-subscription
```

---

### 7. `apply-package-usage` - **OPCJONALNE**
**Dlaczego:** Używana do rozliczania pakietów lekcji. Nie jest wymagana do podstawowego działania subskrypcji.

**Jak wdrożyć (jeśli chcesz):**
```bash
supabase functions deploy apply-package-usage
```

---

## Migracje bazy danych - **WYMAGANE**

Musisz wdrożyć migracje do bazy danych Supabase:

```bash
# Jeśli używasz Supabase CLI lokalnie:
supabase db push

# Lub zaimportuj migracje przez Supabase Dashboard:
# 1. Przejdź do SQL Editor w Supabase Dashboard
# 2. Otwórz plik: supabase/migrations/20260202000001_fix_trial_on_signup.sql
# 3. Wykonaj migrację
```

**Wymagane migracje:**
- `20260202000001_fix_trial_on_signup.sql` - Ustawia trial na 7 dni przy rejestracji

---

## Podsumowanie - Minimum do działania

**Aby aplikacja działała poprawnie, MUSISZ wdrożyć:**

1. ✅ **Migracje bazy danych** (wymagane)
2. ✅ **`create-checkout`** (wymagane - do zakupu pakietów)
3. ✅ **`stripe-webhook`** (wymagane - do aktywacji subskrypcji po płatności)

**Reszta funkcji jest opcjonalna** - aplikacja będzie działać bez nich, ale niektóre funkcje mogą nie być dostępne.

---

## Szybki start - Wszystkie wymagane funkcje

```bash
# 1. Wdroż migracje
supabase db push

# 2. Wdroż funkcje krytyczne
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook

# 3. Ustaw secrets (jeśli jeszcze nie są ustawione)
supabase secrets set STRIPE_SECRET_KEY=sk_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...

# 4. Skonfiguruj webhook w Stripe Dashboard (patrz wyżej)
```

---

## Weryfikacja

Po wdrożeniu sprawdź czy funkcje działają:

1. **Test create-checkout:**
   - Zaloguj się jako admin
   - Spróbuj kupić pakiet
   - Powinno przekierować do Stripe Checkout

2. **Test stripe-webhook:**
   - Po udanej płatności sprawdź w bazie danych:
   ```sql
   SELECT subscription_status, subscription_plan 
   FROM schools 
   WHERE id = 'YOUR_SCHOOL_ID';
   ```
   - Powinno pokazać `subscription_status = 'active'`

3. **Test check-subscription:**
   - Jeśli funkcja nie jest wdrożona, aplikacja użyje fallback do bazy danych
   - Dashboard powinien pokazywać poprawny status subskrypcji
