# LinguaLab - System Zarządzania Szkołą Językową

## O projekcie

LinguaLab to kompleksowe oprogramowanie do zarządzania szkołą językową. System CRM dla szkół językowych z planowaniem zajęć, zarządzaniem uczniami, płatnościami i zaawansowanymi statystykami.

## Technologie

Projekt zbudowany z użyciem:

- **Vite** - Build tool i dev server
- **TypeScript** - Typowany JavaScript
- **React** - Biblioteka UI
- **shadcn-ui** - Komponenty UI
- **Tailwind CSS** - Framework CSS
- **Supabase** - Backend-as-a-Service (baza danych, autentykacja, Edge Functions)
- **Stripe** - System płatności
- **React Query** - Zarządzanie stanem serwera

## Instalacja i uruchomienie

### Wymagania

- Node.js (wersja 18 lub wyższa)
- npm lub yarn
- Konto Supabase
- Konto Stripe (dla płatności)

### Kroki instalacji

```sh
# Krok 1: Sklonuj repozytorium
git clone <YOUR_GIT_URL>

# Krok 2: Przejdź do katalogu projektu
cd LinguaLab-Cursor-main

# Krok 3: Zainstaluj zależności
npm install

# Krok 4: Skonfiguruj zmienne środowiskowe
# Utwórz plik .env.local z następującymi zmiennymi:
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Krok 5: Uruchom serwer deweloperski
npm run dev
```

Aplikacja będzie dostępna pod adresem `http://localhost:8080`

## Budowanie dla produkcji

```sh
npm run build
```

Zbudowane pliki znajdziesz w katalogu `dist/`

## Struktura projektu

```
├── src/
│   ├── components/     # Komponenty React
│   ├── pages/         # Strony aplikacji
│   ├── hooks/         # React hooks
│   ├── lib/           # Funkcje pomocnicze
│   ├── contexts/      # React contexts
│   └── integrations/  # Integracje zewnętrzne (Supabase)
├── supabase/
│   ├── functions/     # Edge Functions
│   └── migrations/    # Migracje bazy danych
├── public/            # Pliki statyczne
└── index.html         # Główny plik HTML
```

## Funkcje

- ✅ Zarządzanie uczniami
- ✅ Zarządzanie nauczycielami
- ✅ Grupy i harmonogram zajęć
- ✅ System obecności
- ✅ Płatności i pakiety lekcji
- ✅ Dashboard i statystyki
- ✅ System subskrypcji (Starter, Growth, Unlimited)
- ✅ Okres próbny (7 dni)
- ✅ Integracja z Stripe

## Wsparcie

W razie pytań lub problemów, skontaktuj się z nami:
- Email: kontakt@lingualab.pl

## Licencja

Wszystkie prawa zastrzeżone © 2026 LinguaLab
