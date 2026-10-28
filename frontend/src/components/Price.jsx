import { useI18n } from "../i18n/index.jsx";
import { CURRENCIES, useCurrency } from "../lib/currency.jsx";

// Prices are stored in AZN; other currencies are shown as "≈" with the AZN amount in the tooltip.
export default function Price({ azn, suffix }) {
  const { t, formatNumber } = useI18n();
  const { currency, rates } = useCurrency();
  const amount = Number(azn);
  if (!amount) return <span className="price">{t("common.free")}</span>;

  const inAzn = `${formatNumber(amount, { maximumFractionDigits: 2 })} AZN`;
  const text = currency === "AZN"
    ? inAzn
    : `≈ ${CURRENCIES[currency]}${formatNumber(amount * rates[currency], { maximumFractionDigits: 0 })}`;
  return (
    <span className="price" title={currency === "AZN" ? undefined : inAzn}>
      {text}
      {suffix && <small> {suffix}</small>}
    </span>
  );
}
