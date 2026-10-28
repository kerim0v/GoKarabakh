import { useI18n } from "../i18n/index.jsx";

export default function Stars({ rating, count }) {
  const { t } = useI18n();
  if (!count) return <span className="stars stars-empty">{t("reviews.none")}</span>;
  const rounded = Math.round(rating);
  return (
    <span className="stars" aria-label={t("reviews.ratingLabel", { rating, count })}>
      <span aria-hidden="true">{"★".repeat(rounded)}{"☆".repeat(5 - rounded)}</span>
      <small>{rating} ({count})</small>
    </span>
  );
}
