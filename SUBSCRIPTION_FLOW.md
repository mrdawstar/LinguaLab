# Flow Subskrypcji Stripe - Dokumentacja

## Przegląd

System subskrypcji używa **Stripe Webhooks jako źródła prawdy**. Po udanej płatności webhook automatycznie aktualizuje bazę danych, a wszystkie użytkownicy przypisani do szkoły otrzymują dostęp.

## Kompletny Flow

### 1. Inicjacja Zakupu (Admin)

**Lokalizacja:** `SubscriptionGuard.tsx` → `createCheckout('basic' | 'pro')`

**Proces:**
- Tylko użytkownicy z rolą `admin` mogą kliknąć przycisk zakupu
- Frontend wywołuje Edge Function `create-checkout`
- Funkcja:
  - ✅ Weryfikuje rolę admin (`user_roles.role = 'admin'`)
  - ✅ Pobiera `school_id` z `profiles`
  - ✅ Tworzy/znajduje Stripe Customer
  - ✅ Zapisuje `stripe_customer_id` w tabeli `schools`
  - ✅ Tworzy Stripe Checkout Session z metadata:
    ```json
    {
      "user_id": "...",
      "school_id": "...",
      "plan": "basic" | "pro"
    }
    ```
  - ✅ Przekierowuje do Stripe Checkout

**Plik:** `supabase/functions/create-checkout/index.ts`

---

### 2. Płatność w Stripe

**Proces:**
- Użytkownik płaci w Stripe Checkout
- Stripe przetwarza płatność
- Po sukcesie Stripe wysyła webhook `checkout.session.completed`

---

### 3. Webhook Aktualizuje Bazę Danych

**Lokalizacja:** `supabase/functions/stripe-webhook/index.ts`

**Event:** `checkout.session.completed`

**Proces:**
1. Webhook otrzymuje event z Stripe
2. Weryfikuje signature (`STRIPE_WEBHOOK_SECRET`)
3. Pobiera `school_id` z `session.metadata.school_id`
4. Pobiera `subscription` z Stripe API
5. **Aktualizuje tabelę `schools`:**
   ```sql
   UPDATE schools SET
     stripe_customer_id = 'cus_...',
     subscription_status = 'active',
     subscription_plan = 'basic' | 'pro',
     subscription_ends_at = '2025-02-28T00:00:00Z',
     updated_at = NOW()
   WHERE id = 'school_id';
   ```

**Aktualizowane pola:**
- ✅ `stripe_customer_id` - ID klienta Stripe
- ✅ `subscription_status` - `"active"` (lub status z Stripe)
- ✅ `subscription_plan` - `"basic"` lub `"pro"`
- ✅ `subscription_ends_at` - data końca okresu rozliczeniowego
- ✅ `updated_at` - timestamp aktualizacji

**Dodatkowe eventy obsługiwane:**
- `customer.subscription.created` - nowa subskrypcja
- `customer.subscription.updated` - zmiana subskrypcji
- `customer.subscription.deleted` - anulowanie (status → `"expired"`)
- `invoice.payment_succeeded` - udana płatność
- `invoice.payment_failed` - nieudana płatność

---

### 4. Redirect do Aplikacji

**Lokalizacja:** `src/pages/SubscriptionSuccess.tsx`

**Proces:**
- Stripe przekierowuje do `/subscription-success?plan=basic`
- Komponent:
  1. ✅ Czyści cache subskrypcji (`sessionStorage`)
  2. ✅ Wymusza odświeżenie (`checkSubscription(true)`)
  3. ✅ Czeka 2 sekundy (na przetworzenie webhooka)
  4. ✅ Przekierowuje do `/admin`

---

### 5. Sprawdzanie Dostępu

**Lokalizacja:** `SubscriptionGuard.tsx` → `useSubscription()`

**Proces:**
- Hook `useSubscription()` wywołuje `check-subscription`
- Edge Function `check-subscription`:
  - ✅ **Czyta TYLKO z bazy danych** (nie używa Stripe API)
  - ✅ Sprawdza `schools.subscription_status === "active"`
  - ✅ Sprawdza `schools.subscription_ends_at > NOW()`
  - ✅ Sprawdza trial: `trial_ends_at > NOW()`
  - ✅ Zwraca `access_allowed = subscribed || trial_active`

**Plik:** `supabase/functions/check-subscription/index.ts`

**Logika dostępu:**
```typescript
const accessAllowed = 
  (subscription_status === "active" && subscription_ends_at > now) || 
  (trial_ends_at > now);
```

---

## Kluczowe Punkty

### ✅ Webhook jest źródłem prawdy
- Baza danych jest aktualizowana przez webhook
- Frontend **NIE** aktualizuje statusu subskrypcji
- `check-subscription` **NIE** używa Stripe API

### ✅ Wszyscy użytkownicy szkoły mają dostęp
- Status subskrypcji jest na poziomie szkoły (`schools` table)
- Wszyscy użytkownicy z `profiles.school_id = X` mają ten sam dostęp
- `SubscriptionGuard` sprawdza status szkoły użytkownika

### ✅ Cache jest czyszczony po redirectcie
- `SubscriptionSuccess` czyści `sessionStorage`
- Wymusza odświeżenie przed przekierowaniem
- Zapewnia natychmiastowy dostęp po płatności

### ✅ Działa w TEST i LIVE mode
- Webhook używa `STRIPE_SECRET_KEY` (automatycznie rozpoznaje test/live)
- Webhook secret jest ustawiany w Stripe Dashboard dla każdego endpointu
- Logi pokazują `livemode: true/false`

---

## Struktura Bazy Danych

### Tabela `schools`
```sql
CREATE TABLE schools (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  stripe_customer_id TEXT,              -- ID klienta Stripe
  subscription_status TEXT DEFAULT 'trial', -- 'trial' | 'active' | 'expired'
  subscription_plan TEXT,                -- 'basic' | 'pro'
  subscription_ends_at TIMESTAMPTZ,       -- Data końca okresu rozliczeniowego
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Tabela `profiles`
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  school_id UUID REFERENCES schools(id),
  email TEXT NOT NULL,
  ...
);
```

### Tabela `user_roles`
```sql
CREATE TABLE user_roles (
  user_id UUID REFERENCES auth.users(id),
  role app_role NOT NULL, -- 'admin' | 'teacher' | 'manager'
  ...
);
```

---

## Testowanie

### 1. Test Lokalny z Stripe CLI

```bash
# Forward webhooks do lokalnego serwera
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook

# W innym terminalu - trigger test event
stripe trigger checkout.session.completed
```

### 2. Weryfikacja w Bazie Danych

```sql
-- Sprawdź status subskrypcji szkoły
SELECT 
  id, 
  name, 
  subscription_status, 
  subscription_plan, 
  subscription_ends_at,
  stripe_customer_id
FROM schools 
WHERE subscription_status = 'active';
```

### 3. Sprawdź Logi

```bash
# Logi webhooka
supabase functions logs stripe-webhook

# Logi check-subscription
supabase functions logs check-subscription
```

---

## Rozwiązywanie Problemów

### Problem: "Okres próbny wygasł" po płatności

**Przyczyny:**
1. Webhook nie został wywołany
2. Webhook nie znalazł `school_id` w metadata
3. Cache nie został wyczyszczony

**Rozwiązanie:**
1. Sprawdź logi webhooka: `supabase functions logs stripe-webhook`
2. Sprawdź czy `school_id` jest w `session.metadata`
3. Sprawdź czy `subscription_status = 'active'` w bazie danych
4. Wyczyść cache ręcznie: `sessionStorage.removeItem('subscription_status')`

### Problem: Webhook nie aktualizuje bazy danych

**Sprawdź:**
1. Czy `STRIPE_WEBHOOK_SECRET` jest ustawiony poprawnie
2. Czy webhook endpoint jest dodany w Stripe Dashboard
3. Czy eventy są wybrane w Stripe Dashboard
4. Czy `SUPABASE_SERVICE_ROLE_KEY` ma uprawnienia do zapisu

### Problem: Użytkownicy nie mają dostępu

**Sprawdź:**
1. Czy `profiles.school_id` jest ustawiony
2. Czy `schools.subscription_status = 'active'`
3. Czy `subscription_ends_at > NOW()`
4. Czy trial nie wygasł: `trial_ends_at > NOW()`

---

## Konfiguracja

### Environment Variables (Supabase Secrets)

```bash
STRIPE_SECRET_KEY=sk_test_... # lub sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Stripe Dashboard

1. **Webhooks** → **Add endpoint**
2. URL: `https://[PROJECT].supabase.co/functions/v1/stripe-webhook`
3. Events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Skopiuj **Signing secret** → ustaw jako `STRIPE_WEBHOOK_SECRET`

---

## Podsumowanie

1. ✅ **Admin** klika "Kup plan" → `create-checkout`
2. ✅ **Stripe** przetwarza płatność → webhook `checkout.session.completed`
3. ✅ **Webhook** aktualizuje `schools` → `subscription_status = 'active'`
4. ✅ **Redirect** do `/subscription-success` → czyści cache
5. ✅ **SubscriptionGuard** sprawdza bazę danych → `access_allowed = true`
6. ✅ **Wszyscy użytkownicy** szkoły mają dostęp po zalogowaniu

**Źródło prawdy:** Stripe Webhooks → Supabase Database → Frontend
