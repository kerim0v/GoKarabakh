import { useI18n } from "../i18n/index.jsx";

// Prices are stored in AZN.
export default function Price({ azn, suffix }) {
  const { t, formatNumber } = useI18n();
  if (!Number(azn)) return <span className="price">{t("common.free")}</span>;
  return (
    <span className="price">
      {formatNumber(Number(azn), { maximumFractionDigits: 2 })} AZN
      {suffix && <small> {suffix}</small>}
    </span>
  );
}
