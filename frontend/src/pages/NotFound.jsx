import Header from "../components/Header.jsx";
import { useI18n } from "../i18n/index.jsx";
import { Link } from "../lib/router.jsx";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="page-shell profile-page">
      <Header />
      <main className="profile-main narrow-main">
        <section className="profile-panel glass">
          <span className="eyebrow mono">404</span>
          <h1>{t("notFound.title")}</h1>
          <p>{t("notFound.text")}</p>
          <Link className="profile-explore-link" href="/dashboard">{t("notFound.back")} →</Link>
        </section>
      </main>
    </div>
  );
}
