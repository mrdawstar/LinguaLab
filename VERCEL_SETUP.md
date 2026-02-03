# Konfiguracja Vercel dla LinguaLab

## Problem: "supabaseUrl is required"

Ten błąd występuje, gdy zmienne środowiskowe Supabase nie są skonfigurowane na Vercel.

## Rozwiązanie: Dodaj zmienne środowiskowe na Vercel

### Krok 1: Przejdź do ustawień projektu na Vercel

1. Zaloguj się do [Vercel Dashboard](https://vercel.com/dashboard)
2. Wybierz swój projekt **LinguaLab**
3. Przejdź do zakładki **Settings**
4. Kliknij **Environment Variables** w menu po lewej stronie

### Krok 2: Dodaj wymagane zmienne środowiskowe

Dodaj następujące zmienne środowiskowe (dla wszystkich środowisk: Production, Preview, Development):

| Nazwa zmiennej | Wartość | Przykład |
|----------------|---------|----------|
| `VITE_SUPABASE_URL` | Twój URL projektu Supabase | `https://krvwypyvurjfsmcfndav.supabase.co` |
| `VITE_SUPABASE_PROJECT_ID` | ID projektu Supabase | `krvwypyvurjfsmcfndav` |
| `VITE_SUPABASE_ANON_KEY` | Twój klucz anon (publiczny) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

### Krok 3: Gdzie znaleźć wartości?

**VITE_SUPABASE_URL i VITE_SUPABASE_PROJECT_ID:**
1. Przejdź do [Supabase Dashboard](https://app.supabase.com)
2. Wybierz swój projekt
3. Przejdź do **Settings** → **API**
4. Skopiuj **Project URL** (to jest `VITE_SUPABASE_URL`)
5. Skopiuj **Project ID** (to jest `VITE_SUPABASE_PROJECT_ID`)

**VITE_SUPABASE_ANON_KEY:**
1. W tym samym miejscu (Settings → API)
2. Skopiuj **anon/public** key (to jest `VITE_SUPABASE_ANON_KEY`)

### Krok 4: Zapisz i wdróż ponownie

1. Kliknij **Save** po dodaniu wszystkich zmiennych
2. Przejdź do zakładki **Deployments**
3. Kliknij **Redeploy** na najnowszym deploymentcie
4. Wybierz **Use existing Build Cache** i kliknij **Redeploy**

### Krok 5: Weryfikacja

Po redeploy sprawdź czy aplikacja działa:
- Otwórz URL aplikacji na Vercel
- Sprawdź konsolę przeglądarki (F12) - nie powinno być błędów o `supabaseUrl`
- Spróbuj się zalogować

## Alternatywnie: Użyj Vercel CLI

Możesz też dodać zmienne przez CLI:

```bash
# Zainstaluj Vercel CLI (jeśli jeszcze nie masz)
npm i -g vercel

# Zaloguj się
vercel login

# Dodaj zmienne środowiskowe
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_PROJECT_ID production
vercel env add VITE_SUPABASE_ANON_KEY production

# Dodaj też dla preview i development (opcjonalnie)
vercel env add VITE_SUPABASE_URL preview
vercel env add VITE_SUPABASE_PROJECT_ID preview
vercel env add VITE_SUPABASE_ANON_KEY preview
```

## Ważne uwagi

⚠️ **Nigdy nie commituj pliku `.env` do repozytorium!**
- Plik `.env` jest już w `.gitignore`
- Używaj tylko `.env.example` jako szablonu

✅ **Zmienne z prefiksem `VITE_` są dostępne w przeglądarce**
- To jest wymagane przez Vite
- Te zmienne będą widoczne w kodzie klienta (są publiczne)
- Dlatego używamy tylko **anon key**, nie service role key!

## Dodatkowe zmienne (opcjonalne)

Jeśli używasz innych funkcji, możesz dodać:

- `HF_API_KEY` - Jeśli używasz Hugging Face API (opcjonalne)

## Troubleshooting

### Błąd nadal występuje po dodaniu zmiennych?

1. **Sprawdź czy zmienne są dodane dla właściwego środowiska**
   - Production, Preview, Development - dodaj dla wszystkich

2. **Redeploy po dodaniu zmiennych**
   - Zmienne środowiskowe są wczytywane podczas builda
   - Musisz zrobić nowy deployment

3. **Sprawdź czy nazwy zmiennych są dokładnie takie same**
   - `VITE_SUPABASE_URL` (z prefiksem `VITE_`)
   - Nie `SUPABASE_URL` (bez prefiksu)

4. **Sprawdź konsolę przeglądarki**
   - Otwórz DevTools (F12)
   - Sprawdź zakładkę Console
   - Powinien być bardziej szczegółowy komunikat błędu

### Jak sprawdzić czy zmienne są dostępne?

Po redeploy, możesz sprawdzić w kodzie:
```javascript
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Anon Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Missing');
```

## Wsparcie

Jeśli nadal masz problemy:
1. Sprawdź logi builda na Vercel (Deployments → wybierz deployment → Build Logs)
2. Sprawdź Runtime Logs (Deployments → wybierz deployment → Runtime Logs)
3. Sprawdź czy projekt buduje się lokalnie: `npm run build`
