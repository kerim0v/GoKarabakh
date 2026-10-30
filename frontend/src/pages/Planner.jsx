import { useState } from "react";
import * as api from "../api.js";
import BookingModal from "../components/BookingModal.jsx";
import DatePicker from "../components/DatePicker.jsx";
import Field from "../components/Field.jsx";
import Header from "../components/Header.jsx";
import PageBackdrop from "../components/PageBackdrop.jsx";
import Price from "../components/Price.jsx";
import { useI18n } from "../i18n/index.jsx";
import { useMeta } from "../lib/meta.jsx";
import { Link } from "../lib/router.jsx";
import { requireLogin, useSession } from "../lib/session.js";
import { readTripDraft, saveTripDraft } from "../lib/tripDraft.js";
import { localToday } from "../lib/dates.js";

const IDEAS = ["history", "nature", "food", "family"];
const BUDGETS = ["economy", "balanced", "premium"];

function PlanForm({ onPlan, busy }) {
  const { t } = useI18n();
  const draft = readTripDraft();
  const [form, setForm] = useState(() => ({
    wishes: "",
    start_date: draft.checkIn && draft.checkIn >= localToday() ? draft.checkIn : localToday(),
    days: 2,
    guests: draft.guests || 2,
    budget: "balanced",
  }));
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const addIdea = (idea) => setForm((current) => ({
    ...current,
    wishes: [current.wishes.trim(), t(`planner.ideas.${idea}`)].filter(Boolean).join(", "),
  }));

  return (
    <form className="auth-form-enhanced planner-form" onSubmit={(event) => { event.preventDefault(); onPlan(form); }}>
      <Field id="plan-wishes" label={t("planner.wishes")}>
        <textarea id="plan-wishes" rows="3" maxLength="1000" placeholder={t("planner.wishesPlaceholder")} value={form.wishes} onChange={set("wishes")} />
      </Field>
      <div className="planner-ideas">
        {IDEAS.map((idea) => (
          <button key={idea} type="button" onClick={() => addIdea(idea)}>+ {t(`planner.ideas.${idea}`)}</button>
        ))}
      </div>
      <div className="form-row">
        <Field id="plan-start" label={t("planner.startDate")}>
          <DatePicker id="plan-start" value={form.start_date} min={localToday()} required label={t("planner.startDate")}
            onChange={(day) => setForm((current) => ({ ...current, start_date: day }))} />
        </Field>
        <Field id="plan-days" label={t("planner.days")}>
          <select id="plan-days" value={form.days} onChange={set("days")}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{t("planner.daysOption", { count: n })}</option>)}
          </select>
        </Field>
        <Field id="plan-guests" label={t("booking.guests")}>
          <input id="plan-guests" type="number" min="1" max="20" value={form.guests} onChange={set("guests")} required />
        </Field>
      </div>
      <div className="planner-budget" role="radiogroup" aria-label={t("planner.budget")}>
        {BUDGETS.map((budget) => (
          <button key={budget} type="button" role="radio" aria-checked={form.budget === budget}
            className={form.budget === budget ? "is-active" : ""} onClick={() => setForm((c) => ({ ...c, budget }))}>
            {t(`planner.budgets.${budget}`)}
          </button>
        ))}
      </div>
      <button className="button-auth-submit" type="submit" disabled={busy}>
        <span>{busy ? t("planner.planning") : t("planner.submit")}</span>
        <span className="button-arrow">✦</span>
      </button>
      {busy && <p className="muted planner-wait">{t("planner.wait")}</p>}
    </form>
  );
}

export default function Planner() {
  const { t, lang, errorText, formatDay } = useI18n();
  const { loggedIn } = useSession();
  const meta = useMeta();
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [booking, setBooking] = useState(null);

  const makePlan = async (form) => {
    if (!loggedIn) {
      requireLogin(() => makePlan(form));
      return;
    }
    setError("");
    setNotice("");
    setBusy(true);
    saveTripDraft({ checkIn: form.start_date, guests: Number(form.guests) || 1 });
    try {
      setPlan(await api.planTrip({ ...form, days: Number(form.days), guests: Number(form.guests), language: lang }));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const saveAll = async () => {
    setSaving(true);
    setError("");
    try {
      for (const day of plan.days) {
        for (const stop of day.stops) {
          await api.addToItinerary(stop.place_id, day.date, stop.time);
        }
      }
      setNotice(t("planner.saved"));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  };


  return (
    <div className="page-shell profile-page has-backdrop">
      <PageBackdrop image="/zengilan/zengilan.jpeg" />
      <Header active="plan" />
      <main className="profile-main">
        <section className="profile-hero glass">
          <div className="profile-avatar" aria-hidden="true">✦</div>
          <div>
            <span className="eyebrow mono">{t("planner.eyebrow")}</span>
            <h1>{t("planner.title")}</h1>
            <p>{t("planner.text")}</p>
          </div>
        </section>

        <section className="profile-panel glass">
          {meta?.ai?.mode === "demo" && <p className="planner-mode">{t("planner.demoMode")}</p>}
          <PlanForm onPlan={makePlan} busy={busy} />
        </section>
        {error && <p role="alert" className="form-error">{error}</p>}
        {notice && <p role="status" className="notice">{notice} <Link href="/itinerary">{t("planner.openItinerary")} →</Link></p>}

        {plan && (
          <section className="planner-result" aria-live="polite">
            <article className="profile-panel glass">
              <div className="profile-panel-heading">
                <div>
                  <span className="eyebrow mono">{plan.mode === "demo" ? t("planner.demoEyebrow") : t("planner.resultEyebrow")}</span>
                  <h2>{t("planner.resultTitle")}</h2>
                </div>
                <button type="button" className="profile-explore-link" onClick={saveAll} disabled={saving}>
                  {saving ? t("common.wait") : t("planner.saveAll")}
                </button>
              </div>
              {plan.summary && <p className="planner-summary">{plan.summary}</p>}
              {plan.tips?.length > 0 && (
                <ul className="planner-tips">{plan.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul>
              )}
              <small className="muted">
                {plan.mode === "demo"
                  ? t(plan.fallback ? "planner.fallbackNote" : "planner.demoNote")
                  : t("planner.disclaimer", { count: plan.remaining_today })}
              </small>
            </article>
            {plan.days.map((day) => (
              <article className="profile-panel glass trip-day" key={day.date}>
                <div className="profile-panel-heading">
                  <div>
                    <span className="eyebrow mono">{formatDay(day.date)}</span>
                    <h2>{day.title}</h2>
                  </div>
                </div>
                {day.stops.map((stop) => (
                  <div className="trip-stop" key={stop.place_id}>
                    <div className="trip-stop-time">{stop.time ? <strong>≈ {stop.time}</strong> : <span>{t("itinerary.anyTime")}</span>}</div>
                    <div className="trip-stop-card">
                      <img src={api.mediaUrl(stop.place.main_photo_url)} alt="" />
                      <div className="trip-stop-body">
                        <Link href={`/district/${stop.place.region}`}><strong>{stop.place.name}</strong></Link>
                        <span>{t(`regions.${stop.place.region}.label`)} · {t(`categories.${stop.place.category}`)} · <Price azn={stop.place.cost} /></span>
                        <p className="planner-reason">{stop.reason}</p>
                        {stop.place.is_bookable && (
                          <div className="row-actions">
                            <button type="button" className="pill-button" onClick={() => setBooking({ ...stop.place, initialDate: day.date })}>
                              {t("place.book")} →
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </article>
            ))}
          </section>
        )}
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
