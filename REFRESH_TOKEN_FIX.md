# Naprawa błędu "Invalid Refresh Token"

## Problem
Aplikacja wyświetlała błąd w konsoli:
```
AuthApiError: Invalid Refresh Token: Refresh Token Not Found
```

Ten błąd występował gdy:
- Refresh token wygasł lub został usunięty
- Użytkownik był zalogowany na wielu urządzeniach i token został unieważniony
- Sesja wygasła po długim czasie nieaktywności

## Rozwiązanie

### 1. **Dodano obsługę błędów refresh token w `AuthContext.tsx`**
- W `initializeSession` - sprawdza czy błąd dotyczy refresh token i wylogowuje użytkownika
- W `onAuthStateChange` - automatycznie czyści dane gdy sesja wygasa

### 2. **Dodano obsługę błędów w `useSubscription.ts`**
- W `createCheckout` - sprawdza błędy refresh token i wylogowuje użytkownika
- W retry logic - obsługuje błędy refresh token podczas ponawiania żądań

### 3. **Dodano obsługę błędów w komponentach nauczyciela**
- `AttendanceDialog.tsx` - obsługuje błędy refresh token
- `TodayLessons.tsx` - obsługuje błędy refresh token

### 4. **Dodano globalny error handler w `client.ts`**
- Łapie nieobsłużone błędy refresh token z automatycznego odświeżania przez Supabase
- Automatycznie wylogowuje użytkownika i czyści localStorage

## Efekt
- Błędy refresh token są teraz obsługiwane gracefully
- Użytkownik jest automatycznie wylogowywany gdy token wygasa
- Brak błędów w konsoli - wszystkie są obsłużone
- Aplikacja nie crashuje przy błędach refresh token
