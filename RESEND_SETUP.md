# Konfiguracja Resend dla wysyłania emaili z zaproszeniami

## Krok 1: Ustawienie klucza API Resend w Supabase

Aby wysyłanie emaili działało, musisz ustawić klucz API Resend jako secret w Supabase:

```bash
# Zainstaluj Supabase CLI (jeśli jeszcze nie masz)
brew install supabase/tap/supabase
# lub
npm install -g supabase

# Zaloguj się
supabase login

# Połącz się z projektem
cd /Users/dawidbubnow/Downloads/LinguaLab-Cursor-main
supabase link --project-ref krvwypyvurjfsmcfndav

# Ustaw klucz API Resend
supabase secrets set RESEND_API_KEY=re_d5U2PxjP_PbsmfyNNVGfex75dBP24igyt
```

## Krok 2: Ustawienie dodatkowych secrets (opcjonalne, ale zalecane)

Jeśli chcesz, aby nazwa szkoły była automatycznie pobierana z bazy danych:

```bash
# Ustaw Service Role Key (opcjonalne - funkcja działa też bez tego)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Gdzie znaleźć Service Role Key?**
- Przejdź do [Supabase Dashboard](https://app.supabase.com)
- Wybierz projekt → Settings → API
- Skopiuj **service_role** key (nie anon key!)

## Krok 3: Wdrożenie funkcji send-invitation-email

```bash
# Wdróż funkcję wysyłania emaili
supabase functions deploy send-invitation-email
```

**Uwaga:** Jeśli funkcja już istnieje, użyj tej samej komendy - nadpisze istniejącą wersję.

## Krok 4: Weryfikacja

Po wdrożeniu:

1. Zaloguj się do aplikacji jako admin lub manager
2. Przejdź do sekcji "Zaproszenia" (`/admin/invitations`)
3. Kliknij "Wyślij zaproszenie"
4. Wprowadź email i wybierz rolę (Nauczyciel lub Manager)
5. Kliknij "Wyślij zaproszenie"

Email powinien zostać wysłany przez Resend do podanego adresu email.

## Uwagi

- **Adres nadawcy**: Używany jest `LinguaLab <noreply@lingualab.cloud>` (zweryfikowana domena lingualab.cloud)
- **Weryfikacja domeny**: Domena `lingualab.cloud` jest zweryfikowana w Resend Dashboard
- **Limity**: Resend ma limit 100 emaili/dzień w planie darmowym

## Troubleshooting

### Email nie został wysłany

1. Sprawdź czy secret jest ustawiony:
   ```bash
   supabase secrets list
   ```
   Powinieneś zobaczyć `RESEND_API_KEY` na liście.

2. Sprawdź logi funkcji:
   ```bash
   supabase functions logs send-invitation-email
   ```

3. Sprawdź czy klucz API jest poprawny w [Resend Dashboard](https://resend.com/api-keys)

### Błąd "RESEND_API_KEY is not configured"

Upewnij się, że ustawiłeś secret:
```bash
supabase secrets set RESEND_API_KEY=re_d5U2PxjP_PbsmfyNNVGfex75dBP24igyt
```

Po ustawieniu secret, **musisz wdrożyć funkcję ponownie**:
```bash
supabase functions deploy send-invitation-email
```

### Błąd 500 (Internal Server Error)

1. **Sprawdź czy funkcja jest wdrożona:**
   ```bash
   supabase functions list
   ```
   Powinieneś zobaczyć `send-invitation-email` na liście.

2. **Sprawdź czy wszystkie secrets są ustawione:**
   ```bash
   supabase secrets list
   ```
   Powinieneś zobaczyć przynajmniej `RESEND_API_KEY`.

3. **Wdróż funkcję ponownie:**
   ```bash
   supabase functions deploy send-invitation-email
   ```

4. **Sprawdź logi funkcji w Supabase Dashboard:**
   - Przejdź do [Supabase Dashboard](https://app.supabase.com)
   - Wybierz projekt → Edge Functions → `send-invitation-email`
   - Kliknij "Logs" aby zobaczyć szczegóły błędów

### Email trafia do spamu

- Użyj zweryfikowanej domeny w Resend
- Dodaj SPF i DKIM rekordy dla swojej domeny
- Unikaj słów kluczowych typu "zaproszenie", "dołącz" w treści (obecnie używamy ich, ale można to zmienić)
