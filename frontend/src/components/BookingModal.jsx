import { useState } from "react";
import * as api from "../api.js";
import { useI18n } from "../i18n/index.jsx";
import { useSession } from "../lib/session.js";
import { readTripDraft } from "../lib/tripDraft.js";
import Field from "./Field.jsx";
import Modal from "./Modal.jsx";
import Price from "./Price.jsx";
import { localToday } from "../lib/dates.js";


// Use a known check-out date only when it comes after the chosen check-in
function pickCheckOut(checkIn, candidates) {
  const checkOut = checkIn && candidates.find((d) => d && d > checkIn);
  return checkOut ? { check_out: checkOut } : {};
}

function nightsBetween(start, end) {
  if (!start || !end) return 0;
  return Math.round((new Date(end) - new Date(start)) / 86400000);
}

export default function BookingModal({ place, initialDate, initialCheckOut, onClose, onBooked }) {
  const { t, errorText } = useI18n();
  const { user } = useSession();
  const draft = readTripDraft();
  const isHotel = place?.category === "hotel";
  const [form, setForm] = useState(() => ({
    guests: draft.guests || 2,
    check_in: [initialDate, draft.checkIn].find((d) => d && d >= localToday()) || "",
    check_out: "",
    ...pickCheckOut([initialDate, draft.checkIn].find((d) => d && d >= localToday()), [initialCheckOut, draft.checkOut]),
    contact_phone: "",
    message: "",
    use_kx: false,
  }));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!place) return null;

  const set = (key) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
  };
  const units = isHotel ? nightsBetween(form.check_in, form.check_out) : Number(form.guests) || 0;
  const total = units > 0 ? Number(place.cost) * units : 0;
  const balance = user?.kx_count || 0;
  const coins = form.use_kx ? Math.min(balance, Math.floor(total)) : 0;

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.submitBookingRequest({
        place_id: place.id,
        check_in: form.check_in,
        check_out: isHotel ? form.check_out : undefined,
        guests: Number(form.guests) || 1,
        contact_phone: form.contact_phone,
        message: form.message,
        use_kx: form.use_kx,
      });
      api.refreshMe().catch(() => {});
      onBooked?.();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open onClose={onClose} labelledBy="booking-title" className="booking-card">
      <span className="eyebrow mono auth-eyebrow">{t("booking.eyebrow")} •</span>
      <h2 id="booking-title" className="auth-title-enhanced">{t("booking.title", { name: place.name })}</h2>
      <p className="auth-subtitle-enhanced">{t("booking.subtitle")}</p>
      <form className="auth-form-enhanced" onSubmit={submit}>
        <div className="form-row">
          <Field id="booking-start" label={isHotel ? t("booking.checkIn") : t("booking.date")}>
            <input id="booking-start" type="date" min={localToday()} value={form.check_in} onChange={set("check_in")} required />
          </Field>
          {isHotel && (
            <Field id="booking-end" label={t("booking.checkOut")}>
              <input id="booking-end" type="date" min={form.check_in || localToday()} value={form.check_out} onChange={set("check_out")} required />
            </Field>
          )}
        </div>
        <Field id="booking-guests" label={t("booking.guests")}>
          <input id="booking-guests" type="number" min="1" max="50" value={form.guests} onChange={set("guests")} required />
        </Field>
        <Field id="booking-phone" label={t("booking.phone")} hint={t("booking.phoneHint")}>
          <input id="booking-phone" type="tel" maxLength="50" placeholder="+994 50 000 00 00" value={form.contact_phone} onChange={set("contact_phone")} />
        </Field>
        <Field id="booking-message" label={t("booking.message")}>
          <textarea id="booking-message" rows="3" maxLength="1000" placeholder={t("booking.messagePlaceholder")} value={form.message} onChange={set("message")} />
        </Field>
        {balance > 0 && (
          <label className="checkbox-row">
            <input type="checkbox" checked={form.use_kx} onChange={set("use_kx")} />
            <span>{t("booking.useCoins", { balance })}</span>
          </label>
        )}
        <div className="booking-total">
          <span>{t("booking.estimate")}</span>
          <strong>
            {total ? <Price azn={total - coins} /> : "—"}
          </strong>
          {coins > 0 && <small>{t("booking.coinsApplied", { coins })}</small>}
        </div>
        {error && <p role="alert" className="form-error">{error}</p>}
        <button className="button-auth-submit" type="submit" disabled={submitting}>
          <span>{submitting ? t("common.wait") : t("booking.send")}</span>
          <span className="button-arrow">→</span>
        </button>
      </form>
    </Modal>
  );
}
