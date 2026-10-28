import { mediaUrl } from "../api.js";
import { useI18n } from "../i18n/index.jsx";
import Price from "./Price.jsx";
import Stars from "./Stars.jsx";

const PRICE_UNIT = { hotel: "perNight", restaurant: "perPerson", tour: "perPerson" };

export default function PlaceCard({ place, saved, onToggleSave, onBook, onShowReviews }) {
  const { t } = useI18n();
  return (
    <article className="district-card">
      <div className="district-card-image" style={{ backgroundImage: `url("${mediaUrl(place.main_photo_url)}")` }}>
        {place.badge && <span>{place.badge}</span>}
      </div>
      <div className="district-card-content">
        {place.subtitle && <p className="district-card-meta">{place.subtitle}</p>}
        <h3>{place.name}</h3>
        <p>{place.description}</p>
        <div className="place-card-facts">
          <Price azn={place.cost} suffix={PRICE_UNIT[place.category] && t(`price.${PRICE_UNIT[place.category]}`)} />
          <button type="button" className="link-button" onClick={onShowReviews}>
            <Stars rating={place.avg_rating} count={place.review_count} />
          </button>
        </div>
        <div className="place-card-actions">
          <button type="button" onClick={onToggleSave} aria-pressed={saved}>
            {saved ? t("place.saved") : t("place.save")} <span aria-hidden="true">→</span>
          </button>
          {place.is_bookable && onBook && (
            <button type="button" className="pill-button" onClick={onBook}>
              {t("place.book")} →
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
