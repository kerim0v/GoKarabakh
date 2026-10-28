import { LANGUAGES, useI18n } from "../i18n/index.jsx";
import { CURRENCIES, useCurrency } from "../lib/currency.jsx";

// Language and display-currency pickers shown in the header.
export default function Switchers() {
  const { t, lang, setLang } = useI18n();
  const { currency, setCurrency } = useCurrency();
  return (
    <div className="header-switchers">
      <select value={lang} onChange={(event) => setLang(event.target.value)} aria-label={t("header.language")} title={t("header.language")}>
        {Object.entries(LANGUAGES).map(([code, { label, name }]) => (
          <option key={code} value={code} title={name}>{label}</option>
        ))}
      </select>
      <select value={currency} onChange={(event) => setCurrency(event.target.value)} aria-label={t("header.currency")} title={t("header.currency")}>
        {Object.keys(CURRENCIES).map((code) => <option key={code} value={code}>{code}</option>)}
      </select>
    </div>
  );
}
