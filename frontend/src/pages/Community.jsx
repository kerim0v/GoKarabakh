import { useState } from "react";
import * as api from "../api.js";
import Header from "../components/Header.jsx";
import { CURATED_PHOTOS, REGIONS } from "../data/regions.js";
import { useI18n } from "../i18n/index.jsx";
import { compressImageFile } from "../lib/images.js";
import { Link } from "../lib/router.jsx";
import { requireLogin, useSession } from "../lib/session.js";
import { useAsync } from "../lib/useAsync.js";

const FIRST_TRACE_REASON = "Shared your first community trace";

export default function Community() {
  const { t, errorText, formatDate } = useI18n();
  const { user, loggedIn } = useSession();
  const traces = useAsync(() => api.getCommunityTraces(), []);
  const rewardHistory = useAsync(() => (loggedIn ? api.getKxTransactions() : Promise.resolve([])), [loggedIn]);
  const [formOpen, setFormOpen] = useState(false);
  const [region, setRegion] = useState("shusha");
  const [caption, setCaption] = useState("");
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [coins, setCoins] = useState([]);

  const list = traces.data || [];
  const rewardClaimed = (rewardHistory.data || []).some((tx) => tx.reason === FIRST_TRACE_REASON);
  // Travellers' own photos first; the curated set fills the wall until there are enough
  const wall = [
    ...list.filter((trace) => trace.photo_url).slice(0, 6).map((trace) => ({
      id: trace.id, src: api.mediaUrl(trace.photo_url), region: trace.region_slug, caption: trace.caption, author: trace.author_name,
    })),
    ...CURATED_PHOTOS.map((photoItem) => ({
      id: photoItem.src, src: photoItem.src, region: photoItem.region,
      caption: t(`community.curated.${photoItem.region}`), author: t("community.curatedAuthor"),
    })),
  ].slice(0, 6);

  const pickPhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setBusy("compressing");
    try {
      setPhoto(await compressImageFile(file));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy("");
    }
  };

  const share = async (event) => {
    event.preventDefault();
    if (!caption.trim()) return;
    setError("");
    setBusy("sharing");
    try {
      const photo_url = photo ? await api.uploadImage(photo) : undefined;
      await api.createCommunityTrace({ region_slug: region, caption: caption.trim(), photo_url });
      if (!rewardClaimed) {
        setCoins(Array.from({ length: 34 }, (_, index) => ({
          id: `${Date.now()}-${index}`, left: Math.random() * 100, delay: Math.random() * 0.7, drift: (Math.random() - 0.5) * 180,
        })));
        window.setTimeout(() => setCoins([]), 2800);
      }
      api.refreshMe().catch(() => {});
      rewardHistory.reload();
      traces.reload();
      setCaption("");
      setPhoto(null);
      setFormOpen(false);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy("");
    }
  };

  const remove = async (id) => {
    try {
      await api.deleteCommunityTrace(id);
      traces.reload();
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <div className="page-shell memory-page">
      <Header active="community" />
      <main className="memory-world-shell">
        <section className="memory-world" aria-label={t("community.worldLabel")}>
          <div className="memory-intro">
            <span className="eyebrow mono">{t("community.eyebrow")}</span>
            <h1>
              {t("community.titleTop")}
              <br />
              <em>{t("community.titleAccent")}</em>
            </h1>
            <p>{t("community.text")}</p>
          </div>
          <section className="partner-memory-grid" aria-label={t("community.wallLabel")}>
            {wall.map((memory) => (
              <article className="partner-memory-card" key={memory.id}>
                <img src={memory.src} alt={memory.caption} loading="lazy" />
                <div className="partner-memory-copy">
                  <span className="mono">{t(`regions.${memory.region}.label`)}</span>
                  <p>“{memory.caption}”</p>
                  <small>{memory.author}</small>
                </div>
              </article>
            ))}
          </section>
          <button
            className={`trace-entry ${formOpen ? "is-open" : ""}`}
            type="button"
            onClick={() => (loggedIn ? setFormOpen((open) => !open) : requireLogin(() => setFormOpen(true)))}
          >
            <span className="trace-entry-dot" />
            {t("community.leaveTrace")} <b>{formOpen ? "×" : "↗"}</b>
          </button>
          {formOpen && loggedIn && (
            <aside className="trace-form-space glass">
              <span className="eyebrow mono">{t("community.formEyebrow")}</span>
              <h3>{t("community.formTitle")}</h3>
              <p>{rewardClaimed ? t("community.formTextAgain") : t("community.formTextReward")}</p>
              <form className="share-form" onSubmit={share}>
                <select value={region} onChange={(event) => setRegion(event.target.value)} aria-label={t("community.regionLabel")}>
                  {REGIONS.map((r) => <option key={r.slug} value={r.slug}>{t(`regions.${r.slug}.label`)}</option>)}
                </select>
                <label className="upload-drop" htmlFor="trace-photo-input">
                  <span>＋</span>
                  <span>{busy === "compressing" ? t("community.compressing") : photo ? t("community.photoAttached") : t("community.addPhoto")}</span>
                </label>
                <input id="trace-photo-input" type="file" accept="image/*" onChange={pickPhoto} />
                <input value={caption} onChange={(event) => setCaption(event.target.value)} type="text" maxLength="500"
                  placeholder={t("community.captionPlaceholder")} aria-label={t("community.captionPlaceholder")} required />
                {error && <p role="alert" className="form-error">{error}</p>}
                <button className="button button-primary" type="submit" disabled={Boolean(busy)}>
                  {busy === "sharing" ? t("community.sharing") : rewardClaimed ? `${t("community.share")} ↗` : `${t("community.shareEarn")} ↗`}
                </button>
              </form>
            </aside>
          )}
        </section>

        <section className="traces-feed" aria-label={t("community.feedLabel")}>
          <span className="eyebrow mono eyebrow-sky">{t("community.feedEyebrow")}</span>
          <h2>{t("community.feedTitle")}</h2>
          {traces.error && <p role="alert" className="form-error">{errorText(traces.error)}</p>}
          {list.length ? (
            <div className="traces-row">
              {list.map((trace) => (
                <article key={trace.id} className="trace-card">
                  <Link href={`/district/${trace.region_slug}`}>
                    {trace.photo_url && <img src={api.mediaUrl(trace.photo_url)} alt="" loading="lazy" />}
                    <div className="trace-card-body">
                      <span className="mono">{t(`regions.${trace.region_slug}.label`)}</span>
                      <p>“{trace.caption}”</p>
                      <small>{trace.author_name} · {formatDate(trace.creation_date)}</small>
                    </div>
                  </Link>
                  {(user?.id === trace.user_id || user?.role === "admin") && (
                    <button type="button" className="trace-remove" onClick={() => remove(trace.id)}>{t("common.remove")}</button>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <p className="muted">{traces.loading ? t("common.loading") : t("community.empty")}</p>
          )}
        </section>
      </main>
      <div className="coin-rain" aria-hidden="true">
        {coins.map((coin) => (
          <span className="falling-coin" key={coin.id}
            style={{ left: `${coin.left}%`, animationDelay: `${coin.delay}s`, "--drift": `${coin.drift}px` }}>
            G
          </span>
        ))}
      </div>
    </div>
  );
}
