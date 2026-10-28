import { useI18n } from "../i18n/index.jsx";

// Checks an admin did on the partner behind a listing
export default function Badges({ place }) {
  const { t } = useI18n();
  if (!place.owner_verified && !place.owner_licensed) return null;
  return (
    <span className="badges">
      {place.owner_verified && <span className="badge" title={t("badges.verifiedHint")}>✓ {t("badges.verified")}</span>}
      {place.owner_licensed && <span className="badge badge-gold" title={t("badges.licensedHint")}>🧭 {t("badges.licensed")}</span>}
    </span>
  );
}
