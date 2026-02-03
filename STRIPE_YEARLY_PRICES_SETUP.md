# Konfiguracja Rocznych Cen Stripe

## Instrukcje

Aby włączyć rozliczanie roczne z 20% rabatem, musisz utworzyć roczne ceny (yearly prices) w Stripe Dashboard dla każdego planu.

## Kroki

### 1. Utwórz roczne ceny w Stripe

1. Zaloguj się do [Stripe Dashboard](https://dashboard.stripe.com)
2. Przejdź do **Products** → wybierz produkt (lub utwórz nowy)
3. Dla każdego planu utwórz **nową cenę (Price)**:
   - **Billing period**: `Yearly`
   - **Price**: 
     - Basic: `950` PLN (99 zł/mies × 12 × 0.8 = 950.4 zł)
     - Pro: `1910` PLN (199 zł/mies × 12 × 0.8 = 1910.4 zł)
     - Unlimited: `3830` PLN (399 zł/mies × 12 × 0.8 = 3828.8 zł)
   - **Currency**: PLN
   - **Recurring**: Yes

### 2. Skopiuj Price IDs

Po utworzeniu każdej ceny, skopiuj jej **Price ID** (zaczyna się od `price_`).

### 3. Zaktualizuj kod

#### W `supabase/functions/create-checkout/index.ts`:

Zastąp placeholder price IDs rzeczywistymi wartościami:

```typescript
const PLANS: Record<string, { monthly: string; yearly: string }> = {
  basic: { 
    monthly: "price_1SviW7LwYIwynGrnKswUrs8d", // ✅ Już masz
    yearly: "price_XXXXXXXXXXXXX" // ⬅️ Wklej tutaj roczny Price ID dla Basic
  },
  pro: { 
    monthly: "price_1SviWhLwYIwynGrn1ZLMwTUh", // ✅ Już masz
    yearly: "price_YYYYYYYYYYYYY" // ⬅️ Wklej tutaj roczny Price ID dla Pro
  },
  unlimited: {
    monthly: "price_ZZZZZZZZZZZZZ", // ⬅️ Utwórz miesięczną cenę dla Unlimited i wklej tutaj
    yearly: "price_AAAAAAAAAAAAA" // ⬅️ Wklej tutaj roczny Price ID dla Unlimited
  },
};
```

#### W `src/pages/LandingPage.tsx`:

Zaktualizuj `PRICE_MAP` (używany tylko do referencji, backend używa `PLANS`):

```typescript
const PRICE_MAP: Record<string, { monthly: string; yearly: string }> = {
  basic: { 
    monthly: 'price_1SviW7LwYIwynGrnKswUrs8d', 
    yearly: 'price_XXXXXXXXXXXXX' // ⬅️ Ten sam co w backendzie
  },
  pro: { 
    monthly: 'price_1SviWhLwYIwynGrn1ZLMwTUh', 
    yearly: 'price_YYYYYYYYYYYYY' // ⬅️ Ten sam co w backendzie
  },
  unlimited: { 
    monthly: 'price_ZZZZZZZZZZZZZ', // ⬅️ Ten sam co w backendzie
    yearly: 'price_AAAAAAAAAAAAA' // ⬅️ Ten sam co w backendzie
  }
};
```

## Przykład Price ID

Price IDs wyglądają tak:
- `price_1SviW7LwYIwynGrnKswUrs8d` (miesięczny Basic)
- `price_1QmNp2RsTuVwXyZaBcDeFgHi` (przykładowy roczny Basic)

## Weryfikacja

Po skonfigurowaniu:
1. Przetestuj checkout z toggle "Rocznie"
2. Sprawdź czy w Stripe Dashboard pojawia się poprawna cena
3. Sprawdź czy webhook otrzymuje `billing_cycle: "yearly"` w metadata

## Uwagi

- **Unlimited plan**: Jeśli nie masz jeszcze planu Unlimited w Stripe, musisz najpierw utworzyć produkt i obie ceny (miesięczną i roczną)
- **Rabat**: Rabat 20% jest już wliczony w ceny roczne (950, 1910, 3830)
- **Test mode**: Upewnij się, że używasz odpowiednich Price IDs dla test/live mode
