# Naprawa błędu "useAuth must be used within an AuthProvider"

## Problem
Błąd występował podczas Hot Module Replacement (HMR) w Vite:
```
Uncaught Error: useAuth must be used within an AuthProvider
    at useAuth (AuthContext.tsx:290:11)
    at ThemeProvider (ThemeContext.tsx:16:20)
```

## Przyczyna
`ThemeProvider` używał hooka `useAuth()`, który wymaga `AuthProvider` w drzewie komponentów. Podczas HMR komponenty mogą być renderowane w złej kolejności lub `AuthProvider` może nie być jeszcze gotowy.

## Rozwiązanie

### 1. **Eksport `AuthContext` z `AuthContext.tsx`**
- Zmieniono `const AuthContext` na `export const AuthContext`
- Umożliwia bezpośrednie użycie `useContext(AuthContext)` zamiast hooka `useAuth()`

### 2. **Bezpieczne użycie `AuthContext` w `ThemeProvider`**
- Zamiast `useAuth()` użyto `useContext(AuthContext)` z try-catch
- Jeśli `AuthProvider` nie jest dostępny (np. podczas HMR), `user` jest `null`
- `ThemeProvider` może działać bez `user` - używa domyślnego motywu

## Efekt
- Brak błędów podczas HMR
- `ThemeProvider` działa poprawnie nawet gdy `AuthProvider` nie jest jeszcze gotowy
- Aplikacja nie crashuje podczas hot reload
