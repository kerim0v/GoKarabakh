import { useEffect, useState } from "react";
import * as api from "../api.js";
import Header from "../components/Header.jsx";
import PageBackdrop from "../components/PageBackdrop.jsx";
import Price from "../components/Price.jsx";
import { useI18n } from "../i18n/index.jsx";
import { Link } from "../lib/router.jsx";
import { requireLogin, useSession } from "../lib/session.js";
import { useAsync } from "../lib/useAsync.js";

const ROLES = ["user", "owner", "guide", "admin"];
const TABS = ["applications", "users", "listings"];

function Applications({ onError, onChanged }) {
  const { t, formatDate } = useI18n();
  const applications = useAsync(() => api.getPartnerApplications(), []);
  const [notes, setNotes] = useState({});
  const [checks, setChecks] = useState({});
  const toggle = (id, key) => setChecks((current) => ({ ...current, [id]: { ...current[id], [key]: !current[id]?.[key] } }));

  const decide = async (id, approve) => {
    try {
      if (approve) await api.approvePartnerApplication(id, notes[id], checks[id]);
      else await api.rejectPartnerApplication(id, notes[id]);
      applications.reload();
      onChanged();
    } catch (err) {
      onError(err);
    }
  };

  const list = [...(applications.data || [])].sort((a, b) => (a.status === "pending" ? -1 : 0) - (b.status === "pending" ? -1 : 0));
  if (!list.length) return <p className="muted">{applications.loading ? t("common.loading") : t("admin.noApplications")}</p>;
  return (
    <div className="admin-list">
      {list.map((application) => (
        <article className="admin-card" key={application.id}>
          <header>
            <strong>{application.user_name}</strong> <a href={`mailto:${application.user_email}`}>{application.user_email}</a>
            <b className={`status status-${application.status}`}>{t(`status.${application.status}`)}</b>
          </header>
          <dl>
            <dt>{t("partner.role")}</dt><dd>{t(`roles.${application.target_role}`)}</dd>
            {application.company_name && <><dt>{t("partner.company")}</dt><dd>{application.company_name}</dd></>}
            {application.tax_id && <><dt>{t("partner.taxId")}</dt><dd>{application.tax_id}</dd></>}
            <dt>{t("partner.phone")}</dt><dd>{application.phone}</dd>
            <dt>{t("partner.languages")}</dt><dd>{application.languages}</dd>
            <dt>{t("partner.bio")}</dt><dd>{application.bio}</dd>
            <dt>{t("admin.submitted")}</dt><dd>{formatDate(application.creation_date)}</dd>
            {application.admin_note && <><dt>{t("admin.note")}</dt><dd>{application.admin_note}</dd></>}
          </dl>
          {application.status === "pending" && (
            <div className="admin-decision">
              <div className="admin-checks">
                <label><input type="checkbox" checked={Boolean(checks[application.id]?.id_verified)} onChange={() => toggle(application.id, "id_verified")} /> {t("badges.verified")}</label>
                {application.target_role === "guide" && (
                  <label><input type="checkbox" checked={Boolean(checks[application.id]?.licensed)} onChange={() => toggle(application.id, "licensed")} /> {t("badges.licensed")}</label>
                )}
              </div>
              <input placeholder={t("admin.notePlaceholder")} maxLength="1000" value={notes[application.id] || ""}
                onChange={(event) => setNotes((current) => ({ ...current, [application.id]: event.target.value }))} />
              <button type="button" className="profile-explore-link" onClick={() => decide(application.id, true)}>{t("admin.approve")}</button>
              <button type="button" className="profile-explore-link is-quiet" onClick={() => decide(application.id, false)}>{t("admin.reject")}</button>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

function Users({ me, onError }) {
  const { t, formatDate } = useI18n();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const users = useAsync(() => api.getAdminUsers(search), [search]);

  const verify = async (user, key) => {
    try {
      await api.setVerification(user.id, { [key]: !user[key] });
      users.reload();
    } catch (err) {
      onError(err);
    }
  };

  const changeRole = async (user, role) => {
    try {
      await api.setUserRole(user.id, role);
      users.reload();
    } catch (err) {
      onError(err);
    }
  };

  return (
    <>
      <form className="admin-search" onSubmit={(event) => { event.preventDefault(); setSearch(q); }}>
        <input value={q} onChange={(event) => setQ(event.target.value)} placeholder={t("admin.searchUsers")} />
        <button type="submit" className="profile-explore-link">{t("trip.search")}</button>
      </form>
      <table className="admin-table">
        <thead><tr><th>{t("auth.name")}</th><th>{t("auth.email")}</th><th>{t("header.coins")}</th><th>{t("admin.joined")}</th><th>{t("profile.role")}</th><th>{t("badges.verified")}</th><th>{t("badges.licensed")}</th></tr></thead>
        <tbody>
          {(users.data || []).map((user) => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.kx_count}</td>
              <td>{formatDate(user.creation_date)}</td>
              <td>
                <select value={user.role} disabled={user.id === me.id} onChange={(event) => changeRole(user, event.target.value)} aria-label={t("profile.role")}>
                  {ROLES.map((role) => <option key={role} value={role}>{t(`roles.${role}`)}</option>)}
                </select>
              </td>
              <td><input type="checkbox" checked={user.id_verified} onChange={() => verify(user, "id_verified")} aria-label={t("badges.verified")} /></td>
              <td><input type="checkbox" checked={user.licensed} onChange={() => verify(user, "licensed")} aria-label={t("badges.licensed")} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function Listings({ onError }) {
  const { t } = useI18n();
  const places = useAsync(() => api.getAdminPlaces(), []);
  const remove = async (place) => {
    if (!window.confirm(t("workspace.deleteConfirm", { name: place.name }))) return;
    try {
      await api.deletePlace(place.id);
      places.reload();
    } catch (err) {
      onError(err);
    }
  };
  return (
    <table className="admin-table">
      <thead><tr><th>{t("workspace.name")}</th><th>{t("workspace.region")}</th><th>{t("workspace.category")}</th><th>{t("workspace.price")}</th><th>{t("admin.bookings")}</th><th /></tr></thead>
      <tbody>
        {(places.data || []).map((place) => (
          <tr key={place.id} className={place.is_active ? "" : "is-inactive"}>
            <td><Link href={`/district/${place.region}`}>{place.name}</Link></td>
            <td>{t(`regions.${place.region}.label`)}</td>
            <td>{t(`categories.${place.category}`)}</td>
            <td><Price azn={place.cost} /></td>
            <td>{place.bookings_count}</td>
            <td><button type="button" className="link-button danger" onClick={() => remove(place)}>{t("common.delete")}</button></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Admin() {
  const { t, errorText } = useI18n();
  const { user, loggedIn } = useSession();
  const isAdmin = loggedIn && user?.role === "admin";
  const [tab, setTab] = useState("applications");
  const [error, setError] = useState("");
  const overview = useAsync(() => (isAdmin ? api.getAdminOverview() : Promise.resolve(null)), [isAdmin]);

  useEffect(() => {
    if (!loggedIn) requireLogin();
  }, [loggedIn]);

  if (!isAdmin) {
    return (
      <div className="page-shell profile-page has-backdrop">
        <PageBackdrop tone="light" />
        <Header />
        <main className="profile-main"><section className="profile-panel glass"><h1>{t("admin.accessTitle")}</h1><p>{t("admin.accessText")}</p></section></main>
      </div>
    );
  }

  const counts = overview.data || {};
  return (
    <div className="page-shell profile-page has-backdrop">
      <PageBackdrop tone="light" />
      <Header active="admin" />
      <main className="profile-main">
        <section className="profile-hero glass">
          <div className="profile-avatar" aria-hidden="true">A</div>
          <div>
            <span className="eyebrow mono">{t("admin.eyebrow")}</span>
            <h1>{t("admin.title")}</h1>
            <p>{t("admin.text")}</p>
          </div>
        </section>
        <section className="admin-counts">
          {["users", "partners", "places", "pending_applications", "pending_bookings", "confirmed_bookings", "traces", "reviews"].map((key) => (
            <div key={key}><strong>{counts[key] ?? "–"}</strong><span>{t(`admin.counts.${key}`)}</span></div>
          ))}
        </section>
        {error && <p role="alert" className="form-error">{error}</p>}
        <nav className="admin-tabs" role="tablist">
          {TABS.map((key) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? "is-active" : ""} onClick={() => setTab(key)}>
              {t(`admin.tabs.${key}`)}
            </button>
          ))}
        </nav>
        <section className="profile-panel glass admin-panel">
          {tab === "applications" && <Applications onError={(err) => setError(errorText(err))} onChanged={overview.reload} />}
          {tab === "users" && <Users me={user} onError={(err) => setError(errorText(err))} />}
          {tab === "listings" && <Listings onError={(err) => setError(errorText(err))} />}
        </section>
      </main>
    </div>
  );
}
