import { useEffect, useState } from "react";
import * as api from "../api.js";
import BookingModal from "../components/BookingModal.jsx";
import Header from "../components/Header.jsx";
import Price from "../components/Price.jsx";
import { useI18n } from "../i18n/index.jsx";
import { useMeta } from "../lib/meta.jsx";
import { Link } from "../lib/router.jsx";
import { requireLogin, useSession } from "../lib/session.js";
import { useAsync } from "../lib/useAsync.js";
import { localToday } from "../lib/dates.js";


function Stop({ item, onUpdate, onRemove, onBook }) {
  const { t } = useI18n();
  const { place } = item;
  return (
    <div className="trip-stop">
      <div className="trip-stop-time">
        {item.start_time ? <strong>≈ {item.start_time}</strong> : <span>{t("itinerary.anyTime")}</span>}
      </div>
      <div className="trip-stop-card">
        <img src={api.mediaUrl(place.main_photo_url)} alt="" />
        <div className="trip-stop-body">
          <Link href={`/district/${place.region}`}><strong>{place.name}</strong></Link>
          <span>{t(`regions.${place.region}.label`)} · {t(`categories.${place.category}`)} · <Price azn={place.cost} /></span>
          <div className="trip-stop-fields">
            <label>
              <span>{t("itinerary.dateLabel")}</span>
              <input type="date" min={localToday()} value={item.visit_date || ""} onChange={(event) => onUpdate({ date: event.target.value || null })} />
            </label>
            <label>
              <span>{t("itinerary.timeLabel")}</span>
              <input type="time" step="900" value={item.start_time || ""} onChange={(event) => onUpdate({ time: event.target.value || null })} />
            </label>
          </div>
          <input
            className="itinerary-note"
            defaultValue={item.note || ""}
            maxLength="500"
            placeholder={t("itinerary.notePlaceholder")}
            onBlur={(event) => event.target.value !== (item.note || "") && onUpdate({ note: event.target.value })}
          />
          <div className="row-actions">
            {place.is_bookable && <button type="button" className="pill-button" onClick={onBook}>{t("place.book")} →</button>}
            <button type="button" className="link-button danger" onClick={onRemove}>{t("common.remove")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Itinerary() {
  const { t, errorText, formatDay } = useI18n();
  const { loggedIn } = useSession();
  const meta = useMeta();
  const items = useAsync(() => (loggedIn ? api.getItinerary() : Promise.resolve([])), [loggedIn]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    if (!loggedIn) requireLogin();
  }, [loggedIn]);

  const run = async (action) => {
    setError("");
    try {
      await action();
      items.reload();
    } catch (err) {
      setError(errorText(err));
    }
  };

  const list = items.data || [];
  const dates = [...new Set(list.map((item) => item.visit_date || ""))]; // already sorted by the API, unscheduled last
  const scheduled = list.filter((item) => item.visit_date).map((item) => item.visit_date);
  const total = list.reduce((sum, item) => sum + Number(item.place.cost || 0), 0);

  return (
    <div className="page-shell profile-page">
      <Header active="itinerary" />
      <main className="profile-main">
        <section className="profile-hero glass">
          <div className="profile-avatar" aria-hidden="true">✦</div>
          <div>
            <span className="eyebrow mono">{t("itinerary.eyebrow")}</span>
            <h1>{t("itinerary.title")}</h1>
            <p>
              {scheduled.length
                ? t("itinerary.range", { from: formatDay(scheduled[0]), to: formatDay(scheduled[scheduled.length - 1]) })
                : t("itinerary.text")}
            </p>
          </div>
          {list.length > 0 && <span className="profile-explore-link is-static">{t("itinerary.estimate")}: <Price azn={total} /></span>}
        </section>
        {error && <p role="alert" className="form-error">{error}</p>}
        {notice && <p role="status" className="notice">{notice}</p>}
        {!loggedIn && <p>{t("itinerary.signIn")}</p>}
        {loggedIn && !items.loading && !list.length && (
          <div className="profile-empty profile-panel glass">
            <span>✦</span>
            <p>{t("itinerary.empty")}</p>
            <Link href="/dashboard">{t("itinerary.browse")} →</Link>
            {meta?.ai?.enabled && <Link href="/plan">✦ {t("itinerary.planWithAi")} →</Link>}
          </div>
        )}
        {dates.map((date) => {
          const stops = list.filter((item) => (item.visit_date || "") === date);
          return (
            <section className="profile-panel glass trip-day" key={date || "unscheduled"}>
              <div className="profile-panel-heading">
                <div>
                  <span className="eyebrow mono">{t("itinerary.stops", { count: stops.length })}</span>
                  <h2>{date ? formatDay(date) : t("itinerary.unscheduled")}</h2>
                </div>
              </div>
              {stops.map((item) => (
                <Stop
                  key={item.id}
                  item={item}
                  onUpdate={(fields) => run(() => api.updateItineraryItem(item.id, fields))}
                  onRemove={() => run(() => api.removeFromItinerary(item.id))}
                  onBook={() => setBooking({ ...item.place, initialDate: item.visit_date })}
                />
              ))}
            </section>
          );
        })}
      </main>
      {booking && (
        <BookingModal
          place={booking}
          initialDate={booking.initialDate}
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
