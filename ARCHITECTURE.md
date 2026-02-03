# 📚 LinguaLab - Szczegółowa Dokumentacja Architektury

## Spis Treści
1. [Przegląd Ogólny](#przegląd-ogólny)
2. [Start Aplikacji](#start-aplikacji)
3. [Autentykacja i Autoryzacja](#autentykacja-i-autoryzacja)
4. [Routing i Nawigacja](#routing-i-nawigacja)
5. [Integracja z Supabase](#integracja-z-supabase)
6. [System Subskrypcji](#system-subskrypcji)
7. [Role Użytkowników](#role-użytkowników)
8. [Przepływ Danych](#przepływ-danych)
9. [Komponenty i Strony](#komponenty-i-strony)
10. [Edge Functions](#edge-functions)

---

## Przegląd Ogólny

### Co to jest LinguaLab?
LinguaLab to **CRM (Customer Relationship Management)** dla szkół językowych. Umożliwia zarządzanie:
- Uczniami
- Nauczycielami
- Grupami i zajęciami
- Płatnościami i pakietami lekcji
- Subskrypcjami szkoły

### Technologie
- **Frontend**: React 18 + TypeScript + Vite
- **UI**: shadcn/ui (komponenty Radix UI) + Tailwind CSS
- **Routing**: React Router v6
- **State Management**: 
  - React Query (dane z serwera)
  - Zustand (stan lokalny)
  - Context API (autentykacja, motyw)
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Płatności**: Stripe
- **Build**: Vite

---

## Start Aplikacji

### 1. Entry Point: `main.tsx`

```typescript
// src/main.tsx
createRoot(document.getElementById("root")!).render(<App />);
```

To jest **punkt wejścia** aplikacji. React renderuje komponent `<App />` do elementu `#root` w `index.html`.

### 2. Główny Komponent: `App.tsx`

`App.tsx` to **rdzeń aplikacji** - tutaj konfigurujemy wszystkie dostawcy (providers) i routing.

#### Hierarchia Providerów (od zewnątrz do wewnątrz):

```
ErrorBoundary
  └─ QueryClientProvider (React Query - cache i synchronizacja danych)
      └─ AuthProvider (autentykacja użytkownika)
          └─ ThemeProvider (motyw jasny/ciemny)
              └─ UserPreferencesLoader (ładowanie preferencji użytkownika)
                  └─ TooltipProvider (tooltips)
                      └─ BrowserRouter (routing)
                          └─ Routes (definicje ścieżek)
```

**Dlaczego taka kolejność?**
- `ErrorBoundary` na zewnątrz - łapie wszystkie błędy
- `QueryClientProvider` - potrzebny dla cache danych
- `AuthProvider` - potrzebuje QueryClient do cache'owania
- `ThemeProvider` - potrzebuje AuthContext (użytkownik może mieć preferencje motywu)
- `BrowserRouter` - routing działa tylko wewnątrz providerów

#### ScrollToTop Component

```typescript
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);
  return null;
};
```

**Co robi?** Przy każdej zmianie ścieżki (np. `/admin` → `/admin/students`) przewija stronę na górę.

---

## Autentykacja i Autoryzacja

### 1. Supabase Auth Client (`src/integrations/supabase/client.ts`)

```typescript
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,        // Gdzie przechowywać sesję
    persistSession: true,         // Zapamiętaj sesję po odświeżeniu
    autoRefreshToken: true,       // Automatycznie odświeżaj token
    detectSessionInUrl: false,    // Nie wykrywaj sesji z URL
  },
});
```

**Co to robi?**
- Tworzy klienta Supabase do komunikacji z backendem
- Konfiguruje autentykację (logowanie, rejestracja, tokeny)
- Tokeny są przechowywane w `localStorage`
- Tokeny są automatycznie odświeżane przed wygaśnięciem

### 2. AuthContext (`src/contexts/AuthContext.tsx`)

**To jest serce autentykacji** - zarządza stanem użytkownika w całej aplikacji.

#### Stan w AuthContext:
```typescript
- user: User | null              // Dane użytkownika z Supabase Auth
- session: Session | null        // Sesja z tokenami
- profile: Profile | null        // Profil z tabeli profiles
- role: 'admin' | 'teacher' | 'manager' | null
- schoolId: string | null       // ID szkoły użytkownika
- isLoading: boolean            // Czy trwa ładowanie danych
```

#### Jak działa inicjalizacja?

1. **onAuthStateChange** - nasłuchuje zmian w autentykacji:
   ```typescript
   supabase.auth.onAuthStateChange(async (event, nextSession) => {
     // event może być: SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED
     // nextSession - nowa sesja (lub null jeśli wylogowano)
   })
   ```

2. **initializeSession** - sprawdza czy jest aktywna sesja:
   ```typescript
   const { data: { session } } = await supabase.auth.getSession();
   // Jeśli jest sesja, pobiera dane użytkownika
   ```

3. **fetchUserData** - pobiera profil i role:
   ```typescript
   // Pobiera profil z tabeli profiles
   const { data: profile } = await supabase
     .from('profiles')
     .select('*')
     .eq('id', userId);
   
   // Pobiera role z tabeli user_roles
   const { data: roles } = await supabase
     .from('user_roles')
     .select('role')
     .eq('user_id', userId);
   ```

#### Funkcje AuthContext:

**login(email, password)**
```typescript
const { error } = await supabase.auth.signInWithPassword({ email, password });
```
- Loguje użytkownika przez Supabase Auth
- Automatycznie wywołuje `onAuthStateChange` → `fetchUserData`

**signup(email, password, fullName, schoolName)**
```typescript
await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { full_name: fullName, school_name: schoolName },
    emailRedirectTo: getEmailRedirectUrl(),
  },
});
```
- Rejestruje użytkownika
- Trigger w bazie (`handle_new_user`) tworzy:
  - Szkołę (jeśli `schoolName` podane)
  - Profil użytkownika
  - Rolę `admin`
  - Ustawienia szkoły

**logout()**
```typescript
await supabase.auth.signOut();
queryClient.clear(); // Czyści cache React Query
```
- Wylogowuje użytkownika
- Czyści wszystkie dane z cache

### 3. Struktura Bazy Danych - Autentykacja

#### Tabela `auth.users` (Supabase Auth)
```
id: UUID (primary key)
email: TEXT
encrypted_password: TEXT
...
```
- Zarządzana przez Supabase
- Nie mamy bezpośredniego dostępu

#### Tabela `profiles`
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  school_id UUID REFERENCES schools(id),
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```
- Rozszerza dane użytkownika
- Łączy użytkownika ze szkołą

#### Tabela `user_roles`
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  role app_role NOT NULL,  -- 'admin', 'teacher', 'manager'
  UNIQUE (user_id, role)
);
```
- Przechowuje role użytkownika
- Jeden użytkownik może mieć wiele ról (ale aplikacja używa najwyższej)

#### Tabela `schools`
```sql
CREATE TABLE schools (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  primary_color TEXT,
  secondary_color TEXT,
  subscription_status TEXT,  -- 'active', 'canceled', 'trialing'
  subscription_plan TEXT,   -- 'basic', 'pro', 'unlimited'
  trial_ends_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  ...
);
```

### 4. Row Level Security (RLS)

Supabase używa **RLS** do bezpieczeństwa - użytkownik widzi tylko swoje dane.

**Przykład polityki:**
```sql
CREATE POLICY "Users can view their own school"
  ON schools FOR SELECT
  USING (id = get_user_school_id(auth.uid()));
```

**Co to znaczy?**
- Użytkownik może SELECTować tylko szkołę, której `id` = jego `school_id`
- `auth.uid()` zwraca ID zalogowanego użytkownika
- Automatycznie filtruje zapytania

---

## Routing i Nawigacja

### React Router Configuration

```typescript
<BrowserRouter>
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/auth" element={<Auth />} />
    <Route path="/admin" element={<SubscriptionGuard><AdminDashboard /></SubscriptionGuard>} />
    ...
  </Routes>
</BrowserRouter>
```

### Chronione Trasy

Wszystkie trasy admin/manager/teacher są opakowane w `<SubscriptionGuard>`:

```typescript
<Route path="/admin" element={
  <SubscriptionGuard>
    <AdminDashboard />
  </SubscriptionGuard>
} />
```

**Co robi SubscriptionGuard?**
1. Sprawdza czy użytkownik jest zalogowany
2. Sprawdza czy szkoła ma aktywną subskrypcję lub trial
3. Jeśli nie - pokazuje ekran z informacją o wygaśnięciu
4. Jeśli tak - renderuje zawartość

### ProtectedRoute (nieużywany obecnie)

Istnieje komponent `ProtectedRoute`, ale nie jest używany - zamiast tego używa się `SubscriptionGuard`.

---

## Integracja z Supabase

### 1. Klient Supabase

**Lokalizacja**: `src/integrations/supabase/client.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

**Użycie:**
```typescript
// Pobierz dane
const { data, error } = await supabase
  .from('students')
  .select('*')
  .eq('school_id', schoolId);

// Wstaw dane
await supabase
  .from('students')
  .insert({ name: 'Jan', school_id: schoolId });

// Aktualizuj
await supabase
  .from('students')
  .update({ name: 'Jan Kowalski' })
  .eq('id', studentId);
```

### 2. React Query Integration

**Dlaczego React Query?**
- Automatyczny cache
- Refetch w tle
- Optimistic updates
- Loading/error states

**Przykład hooka:**
```typescript
// src/hooks/useStudents.ts
export function useStudents() {
  const { schoolId } = useAuth();
  
  return useQuery({
    queryKey: ['students', schoolId],
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', schoolId);
      return data;
    },
    enabled: !!schoolId, // Tylko jeśli schoolId istnieje
  });
}
```

**Użycie w komponencie:**
```typescript
const { data: students, isLoading, error } = useStudents();
```

### 3. Real-time Subscriptions

Supabase obsługuje **real-time** - zmiany w bazie są automatycznie synchronizowane.

**Przykład:**
```typescript
useEffect(() => {
  const channel = supabase
    .channel('students-changes')
    .on('postgres_changes', {
      event: '*',  // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'students',
      filter: `school_id=eq.${schoolId}`,
    }, (payload) => {
      // Zaktualizuj cache React Query
      queryClient.invalidateQueries(['students', schoolId]);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [schoolId]);
```

---

## System Subskrypcji

### 1. Struktura Subskrypcji

**Plany:**
- **Starter** (trial) - 7 dni za darmo
- **Basic** - podstawowy plan
- **Pro** - zaawansowany plan
- **Unlimited** - pełny dostęp

**Statusy:**
- `trialing` - okres próbny aktywny
- `active` - aktywna subskrypcja
- `canceled` - anulowana
- `past_due` - zaległa płatność

### 2. useSubscription Hook

**Lokalizacja**: `src/hooks/useSubscription.ts`

**Co robi?**
1. Pobiera status subskrypcji szkoły
2. Sprawdza trial (7 dni od utworzenia szkoły)
3. Zwraca informacje o dostępie

**Przepływ:**
```typescript
fetchSubscriptionStatus()
  ↓
  Wywołuje Edge Function: check-subscription
    ↓ (jeśli nie działa)
  Fallback: bezpośrednio z bazy danych
    ↓
  Zwraca: {
    subscribed: boolean,
    trial_active: boolean,
    trial_days_left: number,
    subscription_plan: string,
    access_allowed: boolean
  }
```

### 3. SubscriptionGuard

**Lokalizacja**: `src/components/layout/SubscriptionGuard.tsx`

**Logika:**
```typescript
if (!isAuthenticated) {
  return <Navigate to="/auth" />;
}

if (!access_allowed) {
  return <ExpiredSubscriptionScreen />; // Ekran z informacją o wygaśnięciu
}

return children; // Renderuj zawartość
```

### 4. Integracja ze Stripe

**Tworzenie checkout:**
```typescript
// src/hooks/useSubscription.ts - createCheckout()
const response = await fetch(
  `${supabaseUrl}/functions/v1/create-checkout`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ plan: 'basic', billingCycle: 'monthly' }),
  }
);

const { url } = await response.json();
window.location.href = url; // Przekieruj do Stripe Checkout
```

**Webhook Stripe:**
- Po udanej płatności Stripe wysyła webhook
- Edge Function `stripe-webhook` aktualizuje `schools.subscription_status`
- Aplikacja automatycznie odświeża status

---

## Role Użytkowników

### Role i Uprawnienia

| Rola | Uprawnienia |
|------|-------------|
| **admin** | Wszystko: uczniowie, nauczyciele, grupy, zajęcia, płatności, ustawienia, subskrypcja |
| **manager** | Uczniowie, grupy, zajęcia, płatności (bez ustawień i subskrypcji) |
| **teacher** | Własne zajęcia, obecność, uczniowie w swoich grupach |

### Jak działa przypisywanie ról?

**1. Rejestracja Admina:**
```typescript
// Użytkownik podaje schoolName
await supabase.auth.signUp({
  email, password,
  options: { data: { school_name: schoolName } }
});

// Trigger handle_new_user():
// - Tworzy szkołę
// - Tworzy profil z school_id
// - Przypisuje rolę 'admin'
```

**2. Zaproszenie (Invitation):**
```typescript
// Admin tworzy zaproszenie
await supabase.from('invitations').insert({
  email: 'teacher@example.com',
  role: 'teacher',
  school_id: schoolId,
  token: generateToken(),
});

// Użytkownik klika link: /auth?token=...
// Rejestruje się z invitation_token w metadata
// Trigger przypisuje rolę z zaproszenia
```

### Sprawdzanie Ról

**W komponencie:**
```typescript
const { role } = useAuth();

if (role === 'admin') {
  // Pokaż opcje admina
}
```

**W bazie (RLS):**
```sql
-- Tylko admin może aktualizować szkołę
CREATE POLICY "Admins can update school"
  ON schools FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));
```

---

## Przepływ Danych

### 1. Pobieranie Danych

```
Komponent
  ↓ używa hooka
useStudents() / useTeachers() / useGroups()
  ↓ używa React Query
useQuery({ queryKey, queryFn })
  ↓ wykonuje zapytanie
supabase.from('table').select()
  ↓ przez RLS
Baza danych PostgreSQL
  ↓ zwraca dane
React Query cache
  ↓ renderuje
Komponent
```

### 2. Aktualizacja Danych

```
Użytkownik klika "Zapisz"
  ↓
Komponent wywołuje mutation
  ↓
supabase.from('table').update()
  ↓
Baza danych aktualizuje
  ↓
Real-time subscription wykrywa zmianę
  ↓
React Query invalidateQueries()
  ↓
Automatyczny refetch
  ↓
Komponent się aktualizuje
```

### 3. Cache React Query

**Klucze cache:**
```typescript
['students', schoolId]
['teachers', schoolId]
['groups', schoolId]
['subscription-status', userId, schoolId]
```

**Invalidacja:**
```typescript
// Po dodaniu ucznia
await supabase.from('students').insert(...);
queryClient.invalidateQueries(['students', schoolId]);
// Automatycznie refetchuje dane
```

---

## Komponenty i Strony

### Struktura Komponentów

```
src/
├── components/
│   ├── admin/          # Komponenty specyficzne dla admina
│   ├── dashboard/      # Komponenty dashboardu
│   ├── layout/         # Layout (Sidebar, Topbar, Guards)
│   ├── payments/       # Komponenty płatności
│   ├── subscription/   # Komponenty subskrypcji
│   ├── teacher/        # Komponenty dla nauczyciela
│   └── ui/             # Komponenty UI (shadcn/ui)
├── pages/
│   ├── admin/          # Strony admina
│   ├── manager/        # Strony managera
│   ├── teacher/        # Strony nauczyciela
│   └── Auth.tsx        # Strona logowania/rejestracji
└── hooks/              # Custom hooks
```

### Przykład: Strona Uczniów

**Lokalizacja**: `src/pages/admin/StudentsPage.tsx`

**Przepływ:**
1. Komponent renderuje się
2. `useStudents()` pobiera listę uczniów
3. Wyświetla tabelę z danymi
4. `StudentDialog` - dialog do dodania/edycji
5. Po zapisaniu - invalidacja cache → automatyczny refetch

### Przykład: Dashboard

**Lokalizacja**: `src/pages/admin/AdminDashboard.tsx`

**Komponenty:**
- `StatCard` - karty ze statystykami
- `RevenueChart` - wykres przychodów
- `AttendanceChart` - wykres obecności
- `UpcomingLessons` - nadchodzące zajęcia

**Dane:**
- Pobierane przez React Query hooks
- Cache'owane na 5 minut
- Automatyczny refetch w tle

---

## Edge Functions

### Co to są Edge Functions?

To funkcje JavaScript/TypeScript uruchamiane na serwerze Supabase (Deno runtime).

### Funkcje w Projekcie

#### 1. `create-checkout`
**Lokalizacja**: `supabase/functions/create-checkout/index.ts`

**Co robi?**
1. Weryfikuje autoryzację użytkownika
2. Sprawdza czy użytkownik jest adminem
3. Tworzy lub pobiera Stripe Customer
4. Tworzy Stripe Checkout Session
5. Zwraca URL do przekierowania

**Wywołanie:**
```typescript
POST /functions/v1/create-checkout
Headers: { Authorization: Bearer TOKEN }
Body: { plan: 'basic', billingCycle: 'monthly' }
```

#### 2. `stripe-webhook`
**Lokalizacja**: `supabase/functions/stripe-webhook/index.ts`

**Co robi?**
1. Odbiera webhook od Stripe
2. Weryfikuje podpis webhooka
3. Aktualizuje status subskrypcji w bazie
4. Obsługuje różne eventy: `checkout.session.completed`, `customer.subscription.updated`, etc.

**Konfiguracja Stripe:**
- Endpoint: `https://PROJECT.supabase.co/functions/v1/stripe-webhook`
- Events: checkout.session.completed, customer.subscription.*

#### 3. `check-subscription`
**Lokalizacja**: `supabase/functions/check-subscription/index.ts`

**Co robi?**
- Sprawdza status subskrypcji szkoły
- Zwraca informacje o trial i subskrypcji
- Używane przez `useSubscription` hook

#### 4. `send-invitation-email`
**Lokalizacja**: `supabase/functions/send-invitation-email/index.ts`

**Co robi?**
- Wysyła email z zaproszeniem przez Resend API
- Tworzy token zaproszenia
- Link: `https://app.com/auth?token=...`

---

## Kluczowe Koncepcje

### 1. Single Page Application (SPA)

Aplikacja działa jako SPA:
- Jeden plik HTML (`index.html`)
- React Router zarządza routingiem po stronie klienta
- Vercel `vercel.json` przekierowuje wszystkie requesty do `index.html`

### 2. Serverless Backend

Supabase to **Backend-as-a-Service**:
- Baza danych PostgreSQL (hostowana)
- Autentykacja (wbudowana)
- Edge Functions (serverless)
- Real-time subscriptions
- Storage (nieużywany w tym projekcie)

### 3. Security Model

**Row Level Security (RLS):**
- Każda tabela ma polityki bezpieczeństwa
- Użytkownik widzi tylko swoje dane
- Automatyczna filtracja zapytań

**Autoryzacja:**
- Token JWT w każdym requestcie
- Edge Functions weryfikują token
- RLS sprawdza uprawnienia

### 4. State Management

**Trzy warstwy stanu:**

1. **React Query** - dane z serwera (cache, synchronizacja)
2. **Context API** - globalny stan (auth, theme)
3. **Local State** - stan komponentu (useState)

### 5. Error Handling

**ErrorBoundary:**
- Łapie błędy React
- Pokazuje przyjazny komunikat

**Try-catch w async:**
- Wszystkie async funkcje mają error handling
- Toast notifications dla błędów

---

## Przepływ Typowego Użycia

### Scenariusz: Admin dodaje ucznia

1. **Użytkownik klika "Dodaj ucznia"**
   - Otwiera się `StudentDialog`

2. **Wypełnia formularz**
   - Walidacja przez Zod schema
   - Real-time walidacja emaila

3. **Klika "Zapisz"**
   ```typescript
   await supabase.from('students').insert({
     name: 'Jan',
     email: 'jan@example.com',
     school_id: schoolId,
   });
   ```

4. **Baza danych zapisuje**
   - RLS sprawdza uprawnienia
   - Trigger może wykonać dodatkowe akcje

5. **Real-time subscription wykrywa zmianę**
   ```typescript
   supabase.channel('students-changes')
     .on('postgres_changes', ...)
   ```

6. **React Query invaliduje cache**
   ```typescript
   queryClient.invalidateQueries(['students', schoolId]);
   ```

7. **Automatyczny refetch**
   - Komponent się aktualizuje
   - Nowy uczeń pojawia się na liście

---

## Konfiguracja Środowiska

### Zmienne Środowiskowe

**Lokalnie (`.env`):**
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_FRONTEND_URL=http://localhost:8080
```

**Na Vercel:**
- Settings → Environment Variables
- Te same zmienne dla Production/Preview/Development

**W Edge Functions (Supabase Secrets):**
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## Podsumowanie

### Kluczowe Punkty:

1. **React** renderuje UI, **Supabase** dostarcza backend
2. **React Query** zarządza danymi z serwera
3. **AuthContext** zarządza autentykacją
4. **RLS** zapewnia bezpieczeństwo danych
5. **Edge Functions** obsługują płatności i webhooki
6. **SubscriptionGuard** chroni trasy przed nieautoryzowanym dostępem
7. **Real-time** synchronizuje zmiany automatycznie

### Architektura w Pigułce:

```
[Użytkownik]
    ↓
[React UI] ←→ [React Query] ←→ [Supabase Client]
                                    ↓
                            [Supabase Backend]
                                ├─ PostgreSQL (RLS)
                                ├─ Auth
                                └─ Edge Functions ←→ [Stripe]
```

---

## Dalsze Kroki

Aby lepiej zrozumieć kod:

1. **Zacznij od**: `src/main.tsx` → `src/App.tsx`
2. **Zobacz autentykację**: `src/contexts/AuthContext.tsx`
3. **Sprawdź routing**: `src/App.tsx` (Routes)
4. **Zobacz przykładową stronę**: `src/pages/admin/StudentsPage.tsx`
5. **Sprawdź hook**: `src/hooks/useStudents.ts`
6. **Zobacz Edge Function**: `supabase/functions/create-checkout/index.ts`

---

**Masz pytania?** Sprawdź kod - wszystko jest dobrze skomentowane! 🚀
