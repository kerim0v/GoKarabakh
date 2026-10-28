import { useEffect, useState } from "react";
import * as api from "../api.js";
import Header from "../components/Header.jsx";
import Price from "../components/Price.jsx";
import { useI18n } from "../i18n/index.jsx";
import { Link } from "../lib/router.jsx";
import { requireLogin, useSession } from "../lib/session.js";
import { useAsync } from "../lib/useAsync.js";

const MAX_DAYS = 14;

export default function Itinerary() {
  const { t, errorText } = useI18n();
  const { loggedIn } = useSession();
  const items = useAsync(() => (loggedIn ? api.getItinerary() : Promise.resolve([])), [loggedIn]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loggedIn) requireLogin();
  }, [loggedIn]);

  const update = async (item, fields) => {
    setError("");
    try {
      await api.updateItineraryItem(item.id, fields);
      items.reload();
    } catch (err) {
      setError(errorText(err));
    }
  };

  const remove = async (item) => {
    setError("");
    try {
      await api.removeFromItinerary(item.id);
      items.reload();
    } catch (err) {
      setError(errorText(err));
    }
  };

  const list = items.data || [];
  const days = [...new Set(list.map((item) => item.day ?? 0))].sort((a, b) => (a || 99) - (b || 99));
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
            <p>{t("itinerary.text")}</p>
          </div>
          {list.length > 0 && <span className="profile-explore-link is-static">{t("itinerary.estimate")}: <Price azn={total} /></span>}
        </section>
        {error && <p role="alert" className="form-error">{error}</p>}
        {!loggedIn && <p>{t("itinerary.signIn")}</p>}
        {loggedIn && !items.loading && !list.length && (
          <div className="profile-empty profile-panel glass">
            <span>✦</span>
            <p>{t("itinerary.empty")}</p>
            <Link href="/dashboard">{t("itinerary.browse")} →</Link>
          </div>
        )}
        {days.map((day) => (
          <section className="profile-panel glass itinerary-day" key={day}>
            <div className="profile-panel-heading">
              <h2>{day ? t("itinerary.day", { n: day }) : t("itinerary.unplanned")}</h2>
            </div>
            {list.filter((item) => (item.day ?? 0) === day).map((item) => (
              <div className="profile-booking itinerary-item" key={item.id}>
                <img src={api.mediaUrl(item.place.main_photo_url)} alt="" />
                <div>
                  <Link href={`/district/${item.place.region}`}><strong>{item.place.name}</strong></Link>
                  <span>{t(`regions.${item.place.region}.label`)} · {t(`categories.${item.place.category}`)} · <Price azn={item.place.cost} /></span>
                  <input
                    className="itinerary-note"
                    defaultValue={item.note || ""}
                    maxLength="500"
                    placeholder={t("itinerary.notePlaceholder")}
                    onBlur={(event) => event.target.value !== (item.note || "") && update(item, { note: event.target.value })}
                  />
                </div>
                <div className="row-actions">
                  <select value={item.day ?? ""} onChange={(event) => update(item, { day: event.target.value || null })} aria-label={t("itinerary.dayLabel")}>
                    <option value="">{t("itinerary.unplanned")}</option>
                    {Array.from({ length: MAX_DAYS }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{t("itinerary.day", { n })}</option>
                    ))}
                  </select>
                  <button type="button" className="link-button danger" onClick={() => remove(item)}>{t("common.remove")}</button>
                </div>
              </div>
            ))}
          </section>
        ))}
      </main>
    </div>
  );
}
