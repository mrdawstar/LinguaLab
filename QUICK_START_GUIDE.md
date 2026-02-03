# 🚀 LinguaLab - Przewodnik Szybkiego Startu

## Jak Działa Aplikacja - W Pigułce

### 1. Start Aplikacji (30 sekund)

```
1. Użytkownik otwiera https://lingualab.cloud
   ↓
2. Browser ładuje index.html
   ↓
3. React renderuje <App />
   ↓
4. AuthProvider sprawdza czy jest sesja w localStorage
   ↓
5. Jeśli tak → pobiera dane użytkownika
   Jeśli nie → pokazuje LandingPage
```

### 2. Logowanie (1 minuta)

```
1. Użytkownik wchodzi na /auth
   ↓
2. Wypełnia email i hasło
   ↓
3. Klika "Zaloguj się"
   ↓
4. supabase.auth.signInWithPassword()
   ↓
5. Supabase weryfikuje dane
   ↓
6. Zwraca token JWT
   ↓
7. AuthContext pobiera profil i role z bazy
   ↓
8. Przekierowuje do /admin, /manager lub /teacher
```

### 3. Rejestracja Admina (2 minuty)

```
1. Użytkownik wypełnia formularz rejestracji
   - Email, hasło, imię, nazwa szkoły
   ↓
2. supabase.auth.signUp()
   ↓
3. Supabase tworzy użytkownika w auth.users
   ↓
4. Trigger handle_new_user() wykonuje się:
   - Tworzy szkołę w schools
   - Tworzy profil w profiles
   - Przypisuje rolę 'admin' w user_roles
   - Tworzy ustawienia w school_settings
   - Ustawia trial_ends_at = created_at + 7 dni
   ↓
5. Supabase wysyła email z potwierdzeniem
   ↓
6. Użytkownik klika link → potwierdza email
   ↓
7. Może się zalogować
```

### 4. Zaproszenie Nauczyciela (2 minuty)

```
1. Admin wchodzi na /admin/invitations
   ↓
2. Klika "Wyślij zaproszenie"
   ↓
3. Wypełnia email i wybiera rolę (teacher/manager)
   ↓
4. Aplikacja wywołuje Edge Function send-invitation-email
   ↓
5. Funkcja:
   - Tworzy rekord w invitations (z tokenem)
   - Wysyła email przez Resend API
   ↓
6. Nauczyciel otrzymuje email z linkiem:
   https://lingualab.cloud/auth?token=abc123...
   ↓
7. Klika link → otwiera się /auth z tokenem
   ↓
8. Auth.tsx wykrywa token → ładuje dane zaproszenia
   ↓
9. Nauczyciel wypełnia formularz (email już wypełniony)
   ↓
10. Rejestruje się z invitation_token w metadata
    ↓
11. Trigger handle_new_user() wykrywa invitation_token:
    - Przypisuje school_id z zaproszenia
    - Przypisuje rolę z zaproszenia
    - Jeśli teacher → tworzy rekord w teachers
    - Oznacza zaproszenie jako accepted
```

### 5. Dodanie Ucznia (1 minuta)

```
1. Admin wchodzi na /admin/students
   ↓
2. Klika "Dodaj ucznia"
   ↓
3. Wypełnia formularz (StudentDialog)
   ↓
4. Klika "Zapisz"
   ↓
5. supabase.from('students').insert({ ... })
   ↓
6. RLS sprawdza czy użytkownik ma dostęp do school_id
   ↓
7. Baza zapisuje rekord
   ↓
8. Real-time subscription wykrywa zmianę
   ↓
9. React Query invaliduje cache ['students', schoolId]
   ↓
10. Automatyczny refetch → lista się aktualizuje
```

### 6. Zakup Subskrypcji (3 minuty)

```
1. Admin wchodzi na /admin/subscription
   ↓
2. Wybiera plan (Basic/Pro/Unlimited)
   ↓
3. Klika "Kup teraz"
   ↓
4. createCheckout() wywołuje Edge Function create-checkout
   ↓
5. Funkcja:
   - Weryfikuje autoryzację
   - Sprawdza czy użytkownik jest adminem
   - Tworzy/pobiera Stripe Customer
   - Tworzy Stripe Checkout Session
   - Zwraca URL checkout
   ↓
6. Aplikacja przekierowuje do Stripe Checkout
   ↓
7. Użytkownik płaci przez Stripe
   ↓
8. Stripe wysyła webhook do stripe-webhook
   ↓
9. Funkcja webhook:
   - Weryfikuje podpis webhooka
   - Aktualizuje schools.subscription_status = 'active'
   - Aktualizuje schools.subscription_plan
   - Aktualizuje schools.stripe_customer_id
   ↓
10. Stripe przekierowuje do /subscription-success
    ↓
11. Aplikacja odświeża status subskrypcji
    ↓
12. SubscriptionGuard pozwala na dostęp
```

### 7. Sprawdzenie Subskrypcji (każde wejście)

```
1. Użytkownik wchodzi na chronioną stronę (/admin/*)
   ↓
2. SubscriptionGuard sprawdza dostęp
   ↓
3. Wywołuje useSubscription()
   ↓
4. Hook próbuje wywołać Edge Function check-subscription
   ↓
5. Jeśli funkcja nie działa → fallback do bazy:
   SELECT subscription_status, trial_ends_at, ...
   FROM schools WHERE id = schoolId
   ↓
6. Oblicza:
   - trial_active = (trial_ends_at > now) AND (subscription_status != 'active')
   - trial_days_left = ...
   - access_allowed = subscribed OR trial_active
   ↓
7. Jeśli access_allowed = false → pokazuje ExpiredSubscriptionScreen
   Jeśli access_allowed = true → renderuje zawartość
```

## Kluczowe Pliki do Zrozumienia

### Dla Początkujących:

1. **`src/main.tsx`** - Start aplikacji
2. **`src/App.tsx`** - Routing i providers
3. **`src/contexts/AuthContext.tsx`** - Autentykacja
4. **`src/pages/Auth.tsx`** - Strona logowania
5. **`src/pages/admin/StudentsPage.tsx`** - Przykładowa strona

### Dla Zaawansowanych:

1. **`src/hooks/useSubscription.ts`** - Logika subskrypcji
2. **`src/components/layout/SubscriptionGuard.tsx`** - Ochrona tras
3. **`supabase/functions/create-checkout/index.ts`** - Integracja Stripe
4. **`supabase/migrations/*.sql`** - Schemat bazy danych

## Najczęstsze Pytania

### Q: Gdzie są przechowywane dane użytkownika?
**A:** 
- Dane autentykacji: `auth.users` (Supabase Auth)
- Profil: `profiles` (nasza tabela)
- Role: `user_roles` (nasza tabela)

### Q: Jak działa bezpieczeństwo?
**A:** 
- **RLS (Row Level Security)** - automatyczna filtracja zapytań
- **JWT Tokens** - każdy request wymaga tokena
- **Polityki RLS** - użytkownik widzi tylko swoje dane

### Q: Jak działa cache?
**A:** 
- **React Query** cache'uje dane z serwera
- Klucze: `['students', schoolId]`, `['teachers', schoolId]`, etc.
- Automatyczny refetch po invalidacji

### Q: Co się dzieje po odświeżeniu strony?
**A:** 
1. React ładuje się ponownie
2. AuthContext sprawdza `localStorage` dla sesji
3. Jeśli jest sesja → `supabase.auth.getSession()`
4. Jeśli token ważny → pobiera dane użytkownika
5. Jeśli token wygasł → próbuje odświeżyć
6. Jeśli nie można odświeżyć → wylogowuje

### Q: Jak działa real-time?
**A:** 
- Supabase używa WebSockets
- Subskrypcje nasłuchują zmian w tabelach
- Po zmianie → automatyczna invalidacja cache React Query
- Komponenty się aktualizują automatycznie

### Q: Gdzie są logi błędów?
**A:** 
- Konsola przeglądarki (F12)
- Supabase Dashboard → Logs (dla Edge Functions)
- Vercel Dashboard → Logs (dla aplikacji)

## Diagram Przepływu Danych

```
┌─────────────┐
│  Użytkownik │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  React UI       │
│  (Komponenty)   │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐      ┌──────────────┐
│  React Query    │◄─────►│  Supabase    │
│  (Cache)        │       │  Client      │
└──────┬──────────┘       └──────┬───────┘
       │                         │
       │                         ▼
       │                  ┌──────────────┐
       │                  │  Supabase    │
       │                  │  Backend     │
       │                  │              │
       │                  │  ┌──────────┐│
       │                  │  │PostgreSQL││
       │                  │  │  (RLS)   ││
       │                  │  └──────────┘│
       │                  │              │
       │                  │  ┌──────────┐│
       │                  │  │   Auth   ││
       │                  │  └──────────┘│
       │                  │              │
       │                  │  ┌──────────┐│
       │                  └─►│  Edge    ││
       │                     │Functions ││
       │                     └─────┬──────┘
       │                           │
       │                           ▼
       │                     ┌──────────┐
       └─────────────────────►│ Stripe  │
                              └──────────┘
```

## Najważniejsze Koncepcje

### 1. **Single Source of Truth**
- React Query jest jedynym źródłem danych z serwera
- Komponenty nie przechowują danych lokalnie (oprócz formularzy)

### 2. **Optimistic Updates**
- Niektóre akcje aktualizują UI przed potwierdzeniem z serwera
- Jeśli akcja się nie powiedzie → rollback

### 3. **Error Boundaries**
- Łapią błędy React
- Pokazują przyjazny komunikat zamiast crashować aplikację

### 4. **Lazy Loading**
- Komponenty ładują się tylko gdy są potrzebne
- React.lazy() dla dużych komponentów

### 5. **Type Safety**
- TypeScript zapewnia bezpieczeństwo typów
- Supabase generuje typy z bazy danych

---

**Gotowy do kodowania?** Zacznij od `src/main.tsx` i przejdź przez kod krok po kroku! 🎯
