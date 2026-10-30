import { useEffect, useState } from "react";
import * as api from "../api.js";
import Field from "../components/Field.jsx";
import Header from "../components/Header.jsx";
import PageBackdrop from "../components/PageBackdrop.jsx";
import PartnerApplicationModal from "../components/PartnerApplicationModal.jsx";
import Price from "../components/Price.jsx";
import ReviewsModal from "../components/ReviewsModal.jsx";
import { useI18n } from "../i18n/index.jsx";
import { Link, navigate } from "../lib/router.jsx";
import { requireLogin, useSession } from "../lib/session.js";
import { useAsync } from "../lib/useAsync.js";
import { localToday } from "../lib/dates.js";


// Coin reasons come from the API in English; known ones are shown translated
const REASONS = [
  [/^Welcome bonus$/, "welcome"],
  [/^Shared your first community trace$/, "firstTrace"],
  [/^Used on booking (.+)$/, "used"],
  [/^Booked (.+)$/, "booked"],
  [/^Refund for (.+)$/, "refund"],
  [/^Cancelled (.+)$/, "cancelled"],
];

function reasonText(reason, t) {
  for (const [pattern, key] of REASONS) {
    const match = reason.match(pattern);
    if (match) return t(`coinReasons.${key}`, { name: match[1] });
  }
  return reason;
}

function Booking({ booking, onCancel, onReview }) {
  const { t, formatDate } = useI18n();
  const dates = formatDate(booking.check_in) + (booking.check_out ? ` – ${formatDate(booking.check_out)}` : "");
  const canCancel = booking.status === "pending" || (booking.status === "confirmed" && booking.check_in > localToday());
  const canReview = booking.status === "confirmed" && booking.check_in <= localToday();
  return (
    <div className="profile-booking">
      <img src={api.mediaUrl(booking.place_photo_url)} alt="" />
      <div>
        <strong>{booking.place_name}</strong>
        <span>{t("profile.guests", { count: booking.guests })} · {dates} · <Price azn={booking.total_cost} /></span>
        {booking.partner_email && (
          <small className="partner-contact">
            {t("profile.partnerContact")}: {booking.partner_name} · <a href={`mailto:${booking.partner_email}`}>{booking.partner_email}</a>
            {booking.partner_phone && <> · <a href={`tel:${booking.partner_phone}`}>{booking.partner_phone}</a></>}
          </small>
        )}
        <div className="row-actions">
          {canReview && <button type="button" className="link-button" onClick={onReview}>{t("profile.writeReview")}</button>}
          {canCancel && <button type="button" className="link-button danger" onClick={onCancel}>{t("profile.cancelBooking")}</button>}
        </div>
      </div>
      <b className={`status status-${booking.status}`}>{t(`status.${booking.status}`)}</b>
    </div>
  );
}

function AccountSettings({ user }) {
  const { t, errorText } = useI18n();
  const [message, setMessage] = useState({});

  const run = (key, action) => async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setMessage({});
    try {
      await action(new FormData(form));
      form.reset();
      setMessage({ [key]: { ok: true, text: t("profile.saved") } });
    } catch (err) {
      setMessage({ [key]: { ok: false, text: errorText(err) } });
    }
  };
  const feedback = (key) => message[key] && (
    <p role={message[key].ok ? "status" : "alert"} className={message[key].ok ? "notice" : "form-error"}>{message[key].text}</p>
  );

  return (
    <article className="profile-panel glass settings-panel">
      <div className="profile-panel-heading">
        <div>
          <span className="eyebrow mono">{t("profile.settingsEyebrow")}</span>
          <h2>{t("profile.settingsTitle")}</h2>
        </div>
      </div>
      <form className="auth-form-enhanced" onSubmit={run("name", async (form) => {
        await api.updateMe({ name: form.get("name") });
        await api.refreshMe();
      })}>
        <Field id="settings-name" label={t("auth.name")}>
          <input id="settings-name" name="name" defaultValue={user.name} maxLength="255" required />
        </Field>
        <button className="button-auth-submit" type="submit"><span>{t("profile.saveName")}</span></button>
        {feedback("name")}
      </form>
      <form className="auth-form-enhanced" onSubmit={run("password", (form) => api.changePassword(form.get("current"), form.get("next")))}>
        <Field id="settings-current" label={t("profile.currentPassword")}>
          <input id="settings-current" name="current" type="password" autoComplete="current-password" required />
        </Field>
        <Field id="settings-next" label={t("profile.newPassword")}>
          <input id="settings-next" name="next" type="password" minLength="8" autoComplete="new-password" required />
        </Field>
        <button className="button-auth-submit" type="submit"><span>{t("profile.changePassword")}</span></button>
        {feedback("password")}
      </form>
      <form className="auth-form-enhanced danger-zone" onSubmit={run("delete", async (form) => {
        if (!window.confirm(t("profile.deleteConfirm"))) throw new Error(t("profile.deleteCancelled"));
        await api.deleteAccount(form.get("password"));
        api.logout();
        navigate("/");
      })}>
        <p>{t("profile.deleteText")}</p>
        <Field id="settings-delete" label={t("auth.password")}>
          <input id="settings-delete" name="password" type="password" autoComplete="current-password" required />
        </Field>
        <button className="button-danger" type="submit">{t("profile.deleteAccount")}</button>
        {feedback("delete")}
      </form>
    </article>
  );
}

export default function Profile() {
  const { t, errorText, formatDate, formatNumber } = useI18n();
  const { user, loggedIn } = useSession();
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [reviewPlace, setReviewPlace] = useState(null);
  const [error, setError] = useState("");
  const bookings = useAsync(() => (loggedIn ? api.getMyBookingRequests() : Promise.resolve([])), [loggedIn]);
  const transactions = useAsync(() => (loggedIn ? api.getKxTransactions() : Promise.resolve([])), [loggedIn]);
  const applications = useAsync(() => (loggedIn ? api.getPartnerApplications() : Promise.resolve([])), [loggedIn]);

  useEffect(() => {
    if (loggedIn) api.refreshMe().catch(() => {});
    else requireLogin();
  }, [loggedIn]);

  if (!loggedIn || !user) {
    return (
      <div className="page-shell profile-page has-backdrop">
        <PageBackdrop tone="light" />
        <Header />
        <main className="profile-main"><p>{t("profile.signInPrompt")}</p></main>
      </div>
    );
  }

  const txs = transactions.data || [];
  const earned = txs.filter((tx) => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0);
  const spent = Math.abs(txs.filter((tx) => tx.amount < 0).reduce((sum, tx) => sum + tx.amount, 0));
  const latestApplication = (applications.data || [])[0];
  const role = user.role || "user";
  const workspace = role === "owner" ? "/owner-dashboard" : role === "guide" ? "/guide-dashboard" : null;

  const cancel = async (id) => {
    if (!window.confirm(t("profile.cancelConfirm"))) return;
    setError("");
    try {
      await api.cancelBookingRequest(id);
      bookings.reload();
      transactions.reload();
      api.refreshMe().catch(() => {});
    } catch (err) {
      setError(errorText(err));
    }
  };

  let partnerAction = null;
  if (workspace) partnerAction = <Link className="profile-explore-link" href={workspace}>{t(role === "owner" ? "profile.openListings" : "profile.openTours")} →</Link>;
  else if (role === "admin") partnerAction = <Link className="profile-explore-link" href="/admin">{t("header.admin")} →</Link>;
  else if (latestApplication?.status === "pending") partnerAction = <span className="profile-explore-link is-static">{t("profile.applicationPending")}</span>;
  else partnerAction = <button className="profile-explore-link" type="button" onClick={() => setPartnerOpen(true)}>{t("profile.becomePartner")} →</button>;

  return (
    <div className="page-shell profile-page has-backdrop">
      <PageBackdrop tone="light" />
      <Header active="profile" />
      <main className="profile-main">
        <section className="profile-hero glass">
          <div className="profile-avatar" aria-hidden="true">{(user.name || "?").charAt(0).toUpperCase()}</div>
          <div>
            <span className="eyebrow mono">{t("profile.eyebrow")}</span>
            <h1>{user.name}</h1>
            <p>{user.email}</p>
            <span className="mono role-tag">{t("profile.role")}: {t(`roles.${role}`)}</span>
          </div>
          {partnerAction}
        </section>
        {latestApplication?.status === "rejected" && (
          <p className="notice">
            {t("profile.applicationRejected")}
            {latestApplication.admin_note && <> — “{latestApplication.admin_note}”</>}
          </p>
        )}
        {error && <p role="alert" className="form-error">{error}</p>}

        <section className="profile-stats" aria-label={t("profile.coinSummary")}>
          <article className="profile-stat profile-balance">
            <span className="mono">{t("profile.balance")}</span>
            <strong>{formatNumber(user.kx_count || 0)} <small>{t("header.coins")}</small></strong>
            <p>{t("profile.balanceText")}</p>
          </article>
          <article className="profile-stat">
            <span className="mono">{t("profile.earned")}</span>
            <strong>+{formatNumber(earned)}</strong>
            <p>{t("profile.earnedText")}</p>
          </article>
          <article className="profile-stat">
            <span className="mono">{t("profile.spent")}</span>
            <strong>-{formatNumber(spent)}</strong>
            <p>{t("profile.spentText")}</p>
          </article>
        </section>

        <section className="profile-grid">
          <article className="profile-panel glass">
            <div className="profile-panel-heading">
              <div>
                <span className="eyebrow mono">{t("profile.bookingsEyebrow")}</span>
                <h2>{t("profile.bookingsTitle")}</h2>
              </div>
              <Link href="/dashboard">{t("profile.explore")} →</Link>
            </div>
            {bookings.data?.length ? (
              <div className="profile-bookings">
                {bookings.data.map((booking) => (
                  <Booking
                    key={booking.id}
                    booking={booking}
                    onCancel={() => cancel(booking.id)}
                    onReview={() => setReviewPlace({ id: booking.place_id, name: booking.place_name })}
                  />
                ))}
              </div>
            ) : (
              <div className="profile-empty"><span>⌂</span><p>{t("profile.noBookings")}</p><small>{t("profile.noBookingsHint")}</small></div>
            )}
          </article>
          <article className="profile-panel glass">
            <div className="profile-panel-heading">
              <div>
                <span className="eyebrow mono">{t("profile.coinsEyebrow")}</span>
                <h2>{t("profile.activity")}</h2>
              </div>
            </div>
            {txs.length ? (
              <div className="profile-transactions">
                {txs.slice(0, 8).map((tx) => (
                  <div className="profile-transaction" key={tx.id}>
                    <span className={tx.amount > 0 ? "coin-positive" : "coin-negative"}>{tx.amount > 0 ? "+" : ""}{tx.amount}</span>
                    <div><strong>{reasonText(tx.reason, t)}</strong><small>{formatDate(tx.creation_date)}</small></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="profile-empty"><span>◈</span><p>{t("profile.noCoins")}</p><small>{t("profile.noCoinsHint")}</small></div>
            )}
          </article>
        </section>

        <section className="profile-grid settings-grid">
          <AccountSettings user={user} />
        </section>
      </main>
      <PartnerApplicationModal
        open={partnerOpen}
        onClose={() => setPartnerOpen(false)}
        onSubmitted={() => {
          setPartnerOpen(false);
          applications.reload();
        }}
      />
      {reviewPlace && <ReviewsModal place={reviewPlace} canReview onClose={() => setReviewPlace(null)} />}
    </div>
  );
}
