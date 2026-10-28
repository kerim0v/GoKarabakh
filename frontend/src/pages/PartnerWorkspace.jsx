import { useEffect, useState } from "react";
import * as api from "../api.js";
import Field from "../components/Field.jsx";
import Header from "../components/Header.jsx";
import Price from "../components/Price.jsx";
import { CATEGORIES, REGIONS } from "../data/regions.js";
import { useI18n } from "../i18n/index.jsx";
import { compressImageFile } from "../lib/images.js";
import { Link, navigate } from "../lib/router.jsx";
import { requireLogin, useSession } from "../lib/session.js";
import { useAsync } from "../lib/useAsync.js";
import { localToday } from "../lib/dates.js";

const EMPTY = { name: "", region: "shusha", category: "hotel", cost: "", subtitle: "", badge: "", description: "", main_photo_url: "" };

function ListingForm({ role, editing, onSaved, onCancel }) {
  const { t, errorText } = useI18n();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    setForm(editing ? { ...EMPTY, ...editing, subtitle: editing.subtitle || "", badge: editing.badge || "" } : { ...EMPTY, category: role === "guide" ? "tour" : "hotel" });
    setError("");
  }, [editing, role]);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const pickPhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setBusy("upload");
    try {
      const url = await api.uploadImage(await compressImageFile(file));
      setForm((current) => ({ ...current, main_photo_url: url }));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy("");
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy("save");
    const payload = {
      name: form.name, region: form.region, category: form.category, cost: form.cost,
      subtitle: form.subtitle, badge: form.badge, description: form.description, main_photo_url: form.main_photo_url,
    };
    try {
      if (editing) await api.updatePlace({ id: editing.id, ...payload });
      else await api.createPlace(payload);
      onSaved(editing ? t("workspace.updated") : t("workspace.published"));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy("");
    }
  };

  return (
    <form className="auth-form-enhanced" onSubmit={submit}>
      <Field id="listing-name" label={t("workspace.name")}>
        <input id="listing-name" value={form.name} onChange={set("name")} maxLength="255" required />
      </Field>
      <div className="form-row">
        <Field id="listing-region" label={t("workspace.region")}>
          <select id="listing-region" value={form.region} onChange={set("region")}>
            {REGIONS.map((r) => <option key={r.slug} value={r.slug}>{t(`regions.${r.slug}.label`)}</option>)}
          </select>
        </Field>
        <Field id="listing-category" label={t("workspace.category")}>
          <select id="listing-category" value={form.category} onChange={set("category")} disabled={role === "guide"}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{t(`categories.${c}`)}</option>)}
          </select>
        </Field>
      </div>
      <div className="form-row">
        <Field id="listing-cost" label={t("workspace.price")} hint={t(`workspace.priceHint.${form.category}`)}>
          <input id="listing-cost" type="number" min="0" step="0.01" value={form.cost} onChange={set("cost")} required />
        </Field>
        <Field id="listing-badge" label={t("workspace.badge")}>
          <input id="listing-badge" value={form.badge} onChange={set("badge")} maxLength="100" placeholder={t("workspace.badgePlaceholder")} />
        </Field>
      </div>
      <Field id="listing-subtitle" label={t("workspace.subtitle")}>
        <input id="listing-subtitle" value={form.subtitle} onChange={set("subtitle")} maxLength="255" placeholder={t("workspace.subtitlePlaceholder")} />
      </Field>
      <Field id="listing-photo" label={t("workspace.photo")} hint={t("workspace.photoHint")}>
        <div className="photo-picker">
          {form.main_photo_url && <img src={api.mediaUrl(form.main_photo_url)} alt="" />}
          <input id="listing-photo" type="file" accept="image/*" onChange={pickPhoto} />
        </div>
      </Field>
      <Field id="listing-description" label={t("workspace.description")}>
        <textarea id="listing-description" rows="4" maxLength="5000" value={form.description} onChange={set("description")} placeholder={t("workspace.descriptionPlaceholder")} required />
      </Field>
      {error && <p role="alert" className="form-error">{error}</p>}
      <div className="row-actions">
        <button className="button-auth-submit" type="submit" disabled={Boolean(busy) || !form.main_photo_url}>
          <span>{busy === "upload" ? t("workspace.uploading") : busy === "save" ? t("common.wait") : editing ? t("workspace.saveChanges") : t("workspace.publish")}</span>
        </button>
        {editing && <button type="button" className="link-button" onClick={onCancel}>{t("common.cancel")}</button>}
      </div>
    </form>
  );
}

// Dates a listing can't take guests; it's hidden from searches for those dates and can't be booked.
function ClosedDates({ place }) {
  const { t, errorText, formatDate } = useI18n();
  const periods = useAsync(() => api.getClosedPeriods(place.id), [place.id]);
  const [form, setForm] = useState({ start_date: "", end_date: "", note: "" });
  const [error, setError] = useState("");

  const add = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await api.addClosedPeriod(place.id, { ...form, end_date: form.end_date || form.start_date });
      setForm({ start_date: "", end_date: "", note: "" });
      periods.reload();
    } catch (err) {
      setError(errorText(err));
    }
  };

  const remove = async (id) => {
    try {
      await api.deleteClosedPeriod(id);
      periods.reload();
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <div className="closed-dates">
      {periods.data?.length ? (
        <ul>
          {periods.data.map((period) => (
            <li key={period.id}>
              {formatDate(period.start_date)}{period.end_date !== period.start_date && ` – ${formatDate(period.end_date)}`}
              {period.note && <em> · {period.note}</em>}
              <button type="button" className="link-button danger" onClick={() => remove(period.id)}>{t("workspace.reopen")}</button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">{t("workspace.noClosedDates")}</p>
      )}
      <form onSubmit={add} className="closed-dates-form">
        <input type="date" min={localToday()} value={form.start_date} aria-label={t("workspace.closedFrom")}
          onChange={(event) => setForm((c) => ({ ...c, start_date: event.target.value }))} required />
        <input type="date" min={form.start_date || localToday()} value={form.end_date} aria-label={t("workspace.closedTo")}
          onChange={(event) => setForm((c) => ({ ...c, end_date: event.target.value }))} />
        <input maxLength="200" placeholder={t("workspace.closedNote")} value={form.note}
          onChange={(event) => setForm((c) => ({ ...c, note: event.target.value }))} />
        <button type="submit" className="profile-explore-link">{t("workspace.closeDates")}</button>
      </form>
      {error && <p role="alert" className="form-error">{error}</p>}
    </div>
  );
}

export default function PartnerWorkspace({ role }) {
  const { t, errorText, formatDate, formatNumber } = useI18n();
  const { user, loggedIn } = useSession();
  const allowed = loggedIn && user?.role === role;
  const listings = useAsync(() => (allowed ? api.getMyPlaces() : Promise.resolve([])), [allowed]);
  const requests = useAsync(() => (allowed ? api.getOwnerBookingRequests() : Promise.resolve([])), [allowed]);
  const stats = useAsync(() => (allowed ? api.getOwnerStats() : Promise.resolve(null)), [allowed]);
  const [editing, setEditing] = useState(null);
  const [closedFor, setClosedFor] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loggedIn) requireLogin();
    else api.refreshMe().catch(() => {});
  }, [loggedIn]);

  if (!allowed) {
    return (
      <div className="page-shell profile-page">
        <Header active="profile" />
        <main className="profile-main">
          <section className="profile-panel glass">
            <h1>{t("workspace.accessTitle")}</h1>
            <p>{t(`workspace.accessText.${role}`)}</p>
            <Link className="profile-explore-link" href="/profile">{t("workspace.goProfile")} →</Link>
          </section>
        </main>
      </div>
    );
  }

  const act = async (action, message) => {
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(message);
      requests.reload();
      stats.reload();
      listings.reload();
    } catch (err) {
      setError(errorText(err));
    }
  };

  const remove = (place) => window.confirm(t("workspace.deleteConfirm", { name: place.name })) &&
    act(() => api.deletePlace(place.id), t("workspace.deleted"));

  const leave = async () => {
    if (!window.confirm(t("workspace.leaveConfirm"))) return;
    try {
      await api.leavePartnership();
      await api.refreshMe();
      navigate("/profile");
    } catch (err) {
      setError(errorText(err));
    }
  };

  const title = t(role === "owner" ? "workspace.titleOwner" : "workspace.titleGuide");
  const pending = (requests.data || []).filter((r) => r.status === "pending");
  const decided = (requests.data || []).filter((r) => r.status !== "pending");

  return (
    <div className="page-shell profile-page">
      <Header active="profile" />
      <main className="profile-main">
        <section className="profile-hero glass">
          <div className="profile-avatar" aria-hidden="true">{role === "owner" ? "O" : "G"}</div>
          <div>
            <span className="eyebrow mono">{t("workspace.eyebrow")}</span>
            <h1>{title}</h1>
            <p>{t("workspace.text")}</p>
          </div>
          <div className="hero-actions">
            <Link className="profile-explore-link" href="/profile">{t("header.profile")} →</Link>
            <button className="button-danger" type="button" onClick={leave}>{t("workspace.leave")}</button>
          </div>
        </section>
        {notice && <p role="status" className="notice">{notice}</p>}
        {error && <p role="alert" className="form-error">{error}</p>}

        {stats.data && (
          <section className="profile-stats">
            <article className="profile-stat"><span className="mono">{t("workspace.statPending")}</span><strong>{stats.data.total_pending}</strong></article>
            <article className="profile-stat"><span className="mono">{t("workspace.statConfirmed")}</span><strong>{stats.data.total_bookings}</strong></article>
            <article className="profile-stat"><span className="mono">{t("workspace.statRevenue")}</span><strong>{formatNumber(stats.data.total_revenue)} <small>AZN</small></strong></article>
          </section>
        )}

        <section className="profile-panel glass">
          <div className="profile-panel-heading">
            <div>
              <span className="eyebrow mono">{t("workspace.inboxEyebrow")}</span>
              <h2>{t("workspace.inboxTitle")}</h2>
            </div>
          </div>
          {requests.data?.length ? (
            <div className="profile-bookings">
              {[...pending, ...decided].map((request) => (
                <div className="profile-booking" key={request.id}>
                  <img src={api.mediaUrl(request.place_photo_url)} alt="" />
                  <div>
                    <strong>{request.place_name}</strong>
                    <span>
                      {request.traveller_name} · {t("profile.guests", { count: request.guests })} · {formatDate(request.check_in)}
                      {request.check_out && ` – ${formatDate(request.check_out)}`} · <Price azn={request.total_cost} />
                    </span>
                    <small className="partner-contact">
                      <a href={`mailto:${request.traveller_email}`}>{request.traveller_email}</a>
                      {request.contact_phone && <> · <a href={`tel:${request.contact_phone}`}>{request.contact_phone}</a></>}
                    </small>
                    {request.message && <small className="request-message">“{request.message}”</small>}
                  </div>
                  {request.status === "pending" ? (
                    <div className="row-actions">
                      <button type="button" className="profile-explore-link" onClick={() => act(() => api.confirmBookingRequest(request.id), t("workspace.confirmed"))}>{t("workspace.confirm")}</button>
                      <button type="button" className="profile-explore-link is-quiet" onClick={() => act(() => api.declineBookingRequest(request.id), t("workspace.declined"))}>{t("workspace.decline")}</button>
                    </div>
                  ) : (
                    <b className={`status status-${request.status}`}>{t(`status.${request.status}`)}</b>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="profile-empty"><span>⌂</span><p>{t("workspace.noRequests")}</p><small>{t("workspace.noRequestsHint")}</small></div>
          )}
        </section>

        <section className="profile-grid workspace-grid">
          <article className="profile-panel glass">
            <div className="profile-panel-heading">
              <div>
                <span className="eyebrow mono">{editing ? t("workspace.editEyebrow") : t("workspace.newEyebrow")}</span>
                <h2>{editing ? editing.name : t(role === "owner" ? "workspace.newListing" : "workspace.newTour")}</h2>
              </div>
            </div>
            <ListingForm
              role={role}
              editing={editing}
              onCancel={() => setEditing(null)}
              onSaved={(message) => {
                setEditing(null);
                setNotice(message);
                listings.reload();
              }}
            />
          </article>
          <article className="profile-panel glass">
            <div className="profile-panel-heading">
              <div>
                <span className="eyebrow mono">{t("workspace.publishedEyebrow")}</span>
                <h2>{title}</h2>
              </div>
            </div>
            {listings.data?.length ? (
              <div className="profile-transactions listing-list">
                {listings.data.map((place) => (
                  <div className="profile-transaction" key={place.id}>
                    <span>{place.is_active ? "✓" : "–"}</span>
                    <div>
                      <strong>{place.name}</strong>
                      <small>{t(`regions.${place.region}.label`)} · {t(`categories.${place.category}`)} · <Price azn={place.cost} /> · {t("workspace.bookingsCount", { count: place.bookings_count || 0 })}</small>
                      <div className="row-actions">
                        <button type="button" className="link-button" onClick={() => setEditing(place)}>{t("common.edit")}</button>
                        <button type="button" className="link-button" aria-expanded={closedFor === place.id}
                          onClick={() => setClosedFor((id) => (id === place.id ? null : place.id))}>{t("workspace.closedDates")}</button>
                        <button type="button" className="link-button danger" onClick={() => remove(place)}>{t("common.delete")}</button>
                      </div>
                      {closedFor === place.id && <ClosedDates place={place} />}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="profile-empty"><span>+</span><p>{t("workspace.noListings")}</p><small>{t("workspace.noListingsHint")}</small></div>
            )}
          </article>
        </section>
      </main>
    </div>
  );
}
