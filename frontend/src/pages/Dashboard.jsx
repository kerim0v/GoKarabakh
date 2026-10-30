import { useEffect, useState } from "react";
import * as api from "../api.js";
import AtlasMap from "../components/AtlasMap.jsx";
import BookingModal from "../components/BookingModal.jsx";
import Badges from "../components/Badges.jsx";
import Header from "../components/Header.jsx";
import Price from "../components/Price.jsx";
import Stars from "../components/Stars.jsx";
import { REGIONS } from "../data/regions.js";
import { useI18n } from "../i18n/index.jsx";
import { useMeta } from "../lib/meta.jsx";
import { Link, navigate } from "../lib/router.jsx";
import { requireLogin, useSession } from "../lib/session.js";
import { readTripDraft, saveTripDraft } from "../lib/tripDraft.js";
import { useAsync } from "../lib/useAsync.js";
import { addDays, localToday } from "../lib/dates.js";
import DatePicker from "../components/DatePicker.jsx";

const BACKGROUNDS = ["/cidir-1.jpg", "/cidir-2.jpg", "/cidir-3.jpg"];
const TABS = [
  ["stays", "🏠"],
  ["routes", "🏔️"],
  ["guides", "🚩"],
];

function nightsBetween(checkIn, checkOut) {
  return checkIn && checkOut ? Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000) : 0;
}

// `trip` is the search that produced the result: with dates and guests it shows the total for the whole stay.
function ResultCard({ place, trip, onBook }) {
  const { t } = useI18n();
  let total = null;
  if (trip?.nights && place.category === "hotel") total = [place.cost * trip.nights, t("trip.forNights", { count: trip.nights })];
  else if (trip?.guests && place.category !== "hotel" && Number(place.cost)) total = [place.cost * trip.guests, t("trip.forGuests", { count: trip.guests })];
  return (
    <article className="result-card">
      <Link href={`/district/${place.region}`} className="result-card-link">
        <div className="result-card-image" style={{ backgroundImage: `url("${api.mediaUrl(place.main_photo_url)}")` }} />
      </Link>
      <div className="result-card-body">
        <Link href={`/district/${place.region}`}><strong>{place.name}</strong></Link>
        <span>{t(`regions.${place.region}.label`)} · {t(`categories.${place.category}`)}</span>
        <Badges place={place} />
        <div className="result-card-facts">
          {total ? (
            <span className="result-total"><Price azn={total[0]} /> <small>{total[1]}</small></span>
          ) : (
            <Price azn={place.cost} />
          )}
          <Stars rating={place.avg_rating} count={place.review_count} />
        </div>
        {onBook && place.is_bookable && (
          <button type="button" className="pill-button result-book" onClick={() => onBook(place)}>{t("place.book")} →</button>
        )}
      </div>
    </article>
  );
}

export default function Dashboard() {
  const { t, errorText, formatDate } = useI18n();
  const { loggedIn } = useSession();
  const draft = readTripDraft();
  const [tab, setTab] = useState("stays");
  const [query, setQuery] = useState("");
  const [checkIn, setCheckIn] = useState(draft.checkIn && draft.checkIn >= localToday() ? draft.checkIn : "");
  const [checkOut, setCheckOut] = useState(draft.checkOut && draft.checkOut > (draft.checkIn || "") ? draft.checkOut : "");
  const [guests, setGuests] = useState(draft.guests || 2);
  const [results, setResults] = useState(null);
  const [searchedTrip, setSearchedTrip] = useState(null);
  const [booking, setBooking] = useState(null);
  const [notice, setNotice] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [bgIndex, setBgIndex] = useState(0);
  const [focusRegion, setFocusRegion] = useState("all");
  const [hovered, setHovered] = useState(null);
  const meta = useMeta();
  const popular = useAsync(() => api.getPlaces({ sort: "popular", limit: 6 }), []);

  useEffect(() => {
    // Swap the Jidir Plain background as the page scrolls
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const fraction = max > 0 ? window.scrollY / max : 0;
      setBgIndex(fraction < 0.33 ? 0 : fraction < 0.66 ? 1 : 2);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isStay = tab === "stays";

  const changeCheckIn = (value) => {
    setCheckIn(value);
    // Keep check-out after check-in: default to one night
    if (value && (!checkOut || checkOut <= value)) setCheckOut(addDays(value, 1));
  };

  const search = async (event) => {
    event.preventDefault();
    setSearchError("");
    setNotice("");
    const groupSize = Number(guests) || 1;
    const stayEnd = isStay && checkIn ? checkOut : "";
    if (stayEnd && stayEnd <= checkIn) {
      setSearchError(t("errors.checkout_before_checkin"));
      return;
    }
    saveTripDraft({ checkIn, checkOut, guests: groupSize });
    setSearching(true);
    try {
      // Region names are matched in every language, so "Şuşa" or "Шуша" find Shusha
      const typed = query.trim().toLowerCase();
      const region = typed && REGIONS.find((r) => t(`regions.${r.slug}.label`).toLowerCase().startsWith(typed));
      const dates = checkIn ? { check_in: checkIn, check_out: stayEnd || undefined } : {};
      setResults(await api.getPlaces({ kind: tab, ...(region ? { region: region.slug } : { q: typed }), ...dates }));
      setSearchedTrip({ checkIn, checkOut: stayEnd, nights: nightsBetween(checkIn, stayEnd), guests: groupSize });
    } catch (err) {
      setSearchError(errorText(err));
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  // The info panel follows the pointer, or the region picked in the tabs
  const active = REGIONS.find((r) => r.slug === (hovered || (focusRegion !== "all" ? focusRegion : null)));

  return (
    <div className="trip-page">
      <div className="trip-backdrop" style={{ backgroundImage: `url(${BACKGROUNDS[bgIndex]})` }} aria-hidden="true" />
      <div className="page-shell">
        <Header active="trip" />
      </div>
      <main className="trip-main">
        <section className="trip-title reveal">
          <span className="eyebrow mono eyebrow-sky">{t("trip.eyebrow")}</span>
          <h1>{t("trip.title")}</h1>
          <p>{t("trip.text")}</p>
          <div className="trip-badges">
            <span>✔ {t("trip.badgeLocal")}</span>
            <span>✉ {t("trip.badgeRequest")}</span>
            <span>◈ {t("trip.badgeCoins")}</span>
          </div>
          {meta?.ai?.enabled && <Link className="ai-cta" href="/plan">✦ {t("trip.aiCta")}</Link>}
        </section>

        <form className="search-panel" onSubmit={search}>
          <div className="search-tabs" role="tablist">
            {TABS.map(([key, icon]) => (
              <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? "is-active" : ""} onClick={() => setTab(key)}>
                {icon} {t(`trip.tabs.${key}`)}
              </button>
            ))}
          </div>
          <div className={`search-fields${isStay ? " has-checkout" : ""}`}>
            <label className="search-field">
              <span>{t("trip.destination")}</span>
              <input type="text" placeholder={t("trip.destinationPlaceholder")} value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
            <div className="search-field">
              <span>{isStay ? t("booking.checkIn") : t("trip.date")}</span>
              <DatePicker value={checkIn} onChange={changeCheckIn} min={localToday()} clearable label={isStay ? t("booking.checkIn") : t("trip.date")} placeholder={t("datePicker.anyDate")} />
            </div>
            {isStay && (
              <div className="search-field">
                <span>{t("booking.checkOut")}</span>
                <DatePicker value={checkOut} onChange={setCheckOut} min={checkIn ? addDays(checkIn, 1) : addDays(localToday(), 1)} clearable label={t("booking.checkOut")} placeholder={t("datePicker.anyDate")} />
              </div>
            )}
            <label className="search-field search-field-small">
              <span>{t("trip.guests")}</span>
              <input type="number" min="1" max="50" value={guests} onChange={(event) => setGuests(event.target.value)} />
            </label>
            <button type="submit" className="search-button" disabled={searching}>
              {searching ? t("trip.searching") : `${t("trip.search")} ↗`}
            </button>
          </div>
          {searchError && <p role="alert" className="form-error">{searchError}</p>}
          {results && (
            <div className="search-results">
              <p className="search-count">
                {t("trip.results", { count: results.length })}
                {searchedTrip?.checkIn && ` · ${t("trip.openOn", { dates: searchedTrip.checkOut ? `${formatDate(searchedTrip.checkIn)} – ${formatDate(searchedTrip.checkOut)}` : formatDate(searchedTrip.checkIn) })}`}
              </p>
              {notice && <p role="status" className="notice notice-light">{notice}</p>}
              {results.length ? (
                <div className="result-grid">
                  {results.map((place) => (
                    <ResultCard
                      key={place.id}
                      place={place}
                      trip={searchedTrip}
                      onBook={(p) => (loggedIn ? setBooking(p) : requireLogin(() => setBooking(p)))}
                    />
                  ))}
                </div>
              ) : (
                <p className="muted-dark">{t("trip.noResults")}</p>
              )}
            </div>
          )}
        </form>

        <section className="atlas">
          <div className="atlas-heading">
            <div>
              <span className="eyebrow mono eyebrow-sky">{t("trip.atlasEyebrow")}</span>
              <h2>{t("trip.atlasTitle")}</h2>
            </div>
            <span className="atlas-count">{t("trip.regionsCount", { count: REGIONS.length })}</span>
          </div>
          <nav className="atlas-tabs" aria-label={t("trip.atlasTitle")}>
            {["all", ...REGIONS.map((r) => r.slug)].map((slug) => (
              <button key={slug} type="button" className={focusRegion === slug ? "is-active" : ""} onClick={() => setFocusRegion(slug)}>
                {slug === "all" ? t("trip.allRegions") : t(`regions.${slug}.label`)}
              </button>
            ))}
          </nav>
          <div className="atlas-layout">
            <AtlasMap
              focus={focusRegion}
              hovered={hovered}
              onHover={setHovered}
              onSelect={(slug) => navigate(`/district/${slug}`)}
            />
            <aside className={`atlas-info ${active ? "is-active" : ""}`} aria-live="polite">
              {active ? (
                <>
                  <img src={encodeURI(active.hero)} alt="" />
                  <span className="atlas-fact">{t(`regions.${active.slug}.fact`)}</span>
                  <h3>{t(`regions.${active.slug}.label`)}</h3>
                  <p>{t(`regions.${active.slug}.narrative`)}</p>
                  <Link className="atlas-link" href={`/district/${active.slug}`}>{t("trip.exploreButton")} ↗</Link>
                </>
              ) : (
                <p>{t("trip.mapHint")}</p>
              )}
            </aside>
          </div>
        </section>

        <section className="popular">
          <div className="atlas-heading">
            <div>
              <span className="eyebrow mono eyebrow-sky">{t("trip.popularEyebrow")}</span>
              <h2>{t("trip.popularTitle")}</h2>
            </div>
          </div>
          {popular.data?.length ? (
            <div className="result-grid">
              {popular.data.map((place) => <ResultCard key={place.id} place={place} />)}
            </div>
          ) : (
            <p className="muted">{popular.loading ? t("common.loading") : t("trip.noResults")}</p>
          )}
        </section>
      </main>
      {booking && (
        <BookingModal
          place={booking}
          initialDate={searchedTrip?.checkIn}
          initialCheckOut={searchedTrip?.checkOut}
          onClose={() => setBooking(null)}
          onBooked={() => {
            setBooking(null);
            setNotice(t("booking.sent"));
          }}
        />
      )}
    </div>
  );
}
