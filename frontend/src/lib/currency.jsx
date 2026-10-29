import { createContext, useContext, useMemo, useState } from "react";
import { useMeta } from "./meta.jsx";

// Prices are stored and charged in AZN; USD and EUR are shown as approximations.
export const CURRENCIES = { AZN: "AZN", USD: "$", EUR: "€" };
const FALLBACK_RATES = { AZN: 1, USD: 0.588, EUR: 0.505 };
const STORAGE_KEY = "gk.currency";

const CurrencyContext = createContext({ currency: "AZN", rates: FALLBACK_RATES, setCurrency: () => {} });

function savedCurrency() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return CURRENCIES[saved] ? saved : "AZN";
  } catch {
    return "AZN";
  }
}

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(savedCurrency);
  const meta = useMeta();
  const rates = useMemo(() => ({ ...FALLBACK_RATES, ...meta?.currency?.rates }), [meta]);

  const value = useMemo(() => ({
    currency,
    rates,
    setCurrency: (next) => {
      setCurrencyState(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // storage blocked
      }
    },
  }), [currency, rates]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export const useCurrency = () => useContext(CurrencyContext);
