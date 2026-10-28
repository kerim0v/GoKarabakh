import { useState } from "react";
import * as api from "../api.js";
import BookingModal from "../components/BookingModal.jsx";
import PlaceCard from "../components/PlaceCard.jsx";
import ReviewsModal from "../components/ReviewsModal.jsx";
import { findRegion } from "../data/regions.js";
import { useI18n } from "../i18n/index.jsx";
import { Link } from "../lib/router.jsx";
import { requireLogin, useSession } from "../lib/session.js";
import { useAsync } from "../lib/useAsync.js";
import { useItinerary } from "../lib/useItinerary.js";
import NotFound from "./NotFound.jsx";
import Switchers from "../components/Switchers.jsx";

const TABS = [
  ["hotel", "🏨"],
  ["attraction", "🏛️"],
  ["restaurant", "🍽️"],
  ["tour", "🥾"],
  ["popular", "🔥"],
];

export default function District({ slug }) {
  const { t, errorText } = useI18n();
  const { loggedIn } = useSession();
  const region = findRegion(slug);
  const [tab, setTab] = useState("hotel");
  const [showPlan, setShowPlan] = useState(false);
  const [booking, setBooking] = useState(null);
  const [reviewsFor, setReviewsFor] = useState(null);
  const [notice, setNotice] = useState("");
  const itinerary = useItinerary();
  const places = useAsync(
    () => api.getPlaces(tab === "popular" ? { region: slug, sort: "popular", limit: 6 } : { region: slug, category: tab }),
    [slug, tab],
  );

  if (!region) return <NotFound />;

  const name = t(`regions.${slug}.label`);
  const spots = t(`regions.${slug}.spots`);
  const openBooking = (place) => {
    setNotice("");
    if (loggedIn) setBooking(place);
    else requireLogin(() => setBooking(place));
  };

  return (
    <div className="district-page">
      <section className="district-hero">
        <div className="district-hero-overlay" aria-hidden="true" />
        <div className="district-hero-inner">
          <div className="district-topline">
            <Link className="back-link" href="/dashboard">← {t("district.back")}</Link>
            <Switchers />
          </div>
          <p className="mono district-crumb">{t("district.crumb", { name })}</p>
          <h1>{name}</h1>
          <p className="district-tagline">{t(`regions.${slug}.tagline`)}</p>
          <button className="shusha-plan-trigger" type="button" onClick={() => setShowPlan((open) => !open)} aria-expanded={showPlan}>
            ✦ {t("district.planTitle")} <span aria-hidden="true">{showPlan ? "−" : "+"}</span>
          </button>
          {showPlan && (
            <section className="shusha-route-postcard" aria-label={t("district.planTitle")}>
              <div className="shusha-route-image">
                <img src={encodeURI(region.photos[0])} alt={`${spots[0]}, ${name}`} />
                <div className="shusha-route-image-copy">
                  <span>{t("district.dayOneHighlight")}</span>
                  <strong>{spots[0]}</strong>
                  <p>{t("district.highlightNote")}</p>
                </div>
              </div>
              <div className="shusha-route-days">
                <article>
                  <span>{t("district.day", { n: "01" })}</span>
                  <h3>{t("district.dayOneTitle", { spot: spots[0] })}</h3>
                  <p>{t("district.dayOneText", { spot: spots[0] })}</p>
                </article>
                <article>
                  <span>{t("district.day", { n: "02" })}</span>
                  <h3>{t("district.dayTwoTitle", { spot: spots[1] })}</h3>
                  <p>{t("district.dayTwoText", { first: spots[1], second: spots[2] })}</p>
                </article>
              </div>
            </section>
          )}
        </div>
      </section>

      <main className="district-main">
        <nav className="category-tabs" aria-label={t("district.categoriesLabel", { name })}>
          {TABS.map(([key, icon]) => (
            <button key={key} type="button" className={tab === key ? "is-active" : ""} aria-pressed={tab === key} onClick={() => setTab(key)}>
              <span className="category-icon">{icon}</span>
              <span>{t(`district.tabs.${key}`)}</span>
            </button>
          ))}
        </nav>

        {notice && <p role="status" className="notice">{notice}</p>}
        {itinerary.error && <p role="alert" className="form-error">{errorText(itinerary.error)}</p>}

        <section className="district-card-section" aria-live="polite">
          <div className="district-card-heading">
            <div>
              <span className="eyebrow mono">{t("district.explore", { name: name.toUpperCase() })}</span>
              <h2>{t(`district.tabs.${tab}`)}</h2>
            </div>
            <p>{t(`district.tabText.${tab}`)}</p>
          </div>
          {places.loading && <p className="muted">{t("common.loading")}</p>}
          {places.error && <p role="alert" className="form-error">{errorText(places.error)}</p>}
          {places.data && !places.data.length && <p className="muted">{t("district.empty")}</p>}
          {places.data?.length > 0 && (
            <div className="district-card-grid">
              {places.data.map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  saved={itinerary.isSaved(place.id)}
                  onToggleSave={() => itinerary.toggle(place)}
                  onBook={() => openBooking(place)}
                  onShowReviews={() => setReviewsFor(place)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {booking && (
        <BookingModal
          place={booking}
          onClose={() => setBooking(null)}
          onBooked={() => {
            setBooking(null);
            setNotice(t("booking.sent"));
          }}
        />
      )}
      {reviewsFor && <ReviewsModal place={reviewsFor} onClose={() => setReviewsFor(null)} />}
    </div>
  );
}
