import { useEffect, useRef, useState } from "react";
import * as api from "../api.js";
import { useI18n } from "../i18n/index.jsx";
import { Link } from "../lib/router.jsx";
import { requireLogin, useSession } from "../lib/session.js";
import Switchers from "./Switchers.jsx";

export default function Header({ active }) {
  const { t } = useI18n();
  const { user, loggedIn } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (event) => !menuRef.current?.contains(event.target) && setMenuOpen(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [menuOpen]);

  const role = user?.role || "user";
  const links = [
    ["explore", "/", t("nav.explore")],
    ["trip", "/dashboard", t("nav.trip")],
    ["community", "/community", t("nav.community")],
    ...(loggedIn ? [["itinerary", "/itinerary", t("nav.itinerary")]] : []),
  ];

  return (
    <header className="topbar">
      <Link className="brand" href="/">
        <span className="brand-mark brand-mark-sky">G</span>
        <span>GOKARABAKH</span>
      </Link>
      <nav className="nav" aria-label={t("nav.label")}>
        {links.map(([key, href, label]) => (
          <Link key={key} className={active === key ? "active" : ""} href={href} aria-current={active === key ? "page" : undefined}>
            {label}
          </Link>
        ))}
      </nav>
      <div className="header-actions">
        <Switchers />
        {loggedIn && (
          <Link className="wallet" href="/profile" title={t("header.coinsTitle")}>
            <span className="wallet-icon wallet-icon-sky">◈</span>
            <b>{user?.kx_count ?? 0}</b>
            <span className="mono">{t("header.coins")}</span>
          </Link>
        )}
        <div className="account-control" ref={menuRef}>
          <button
            className="auth-trigger"
            type="button"
            onClick={() => (loggedIn ? setMenuOpen((open) => !open) : requireLogin())}
            aria-expanded={loggedIn ? menuOpen : undefined}
            aria-label={loggedIn ? t("header.openMenu") : t("header.signIn")}
            title={loggedIn ? t("header.account") : t("header.signIn")}
          >
            <img src="/lacin/khari-bulbul1.png" alt="" className="khari-bulbul-icon" />
          </button>
          {loggedIn && menuOpen && (
            <div className="account-menu" onClick={() => setMenuOpen(false)}>
              <Link href="/profile">{t("header.profile")}</Link>
              <Link href="/itinerary">{t("header.itinerary")}</Link>
              {role === "owner" && <Link href="/owner-dashboard">{t("header.listings")}</Link>}
              {role === "guide" && <Link href="/guide-dashboard">{t("header.tours")}</Link>}
              {role === "admin" && <Link href="/admin">{t("header.admin")}</Link>}
              <button type="button" onClick={api.logout}>{t("header.logout")}</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
