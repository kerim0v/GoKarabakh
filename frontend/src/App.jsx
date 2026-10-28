import { Suspense, lazy, useEffect, useState } from "react";
import * as api from "./api.js";
import AuthModal from "./components/AuthModal.jsx";
import { I18nProvider } from "./i18n/index.jsx";
import { CurrencyProvider } from "./lib/currency.jsx";
import { useLocation } from "./lib/router.jsx";
import { isLoggedIn } from "./lib/session.js";

const Admin = lazy(() => import("./pages/Admin.jsx"));
const Community = lazy(() => import("./pages/Community.jsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const District = lazy(() => import("./pages/District.jsx"));
const Itinerary = lazy(() => import("./pages/Itinerary.jsx"));
const Landing = lazy(() => import("./pages/Landing.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));
const PartnerWorkspace = lazy(() => import("./pages/PartnerWorkspace.jsx"));
const Profile = lazy(() => import("./pages/Profile.jsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));

const ROUTES = {
  "/": Landing,
  "/dashboard": Dashboard,
  "/community": Community,
  "/profile": Profile,
  "/itinerary": Itinerary,
  "/admin": Admin,
  "/reset-password": ResetPassword,
  "/owner-dashboard": () => <PartnerWorkspace role="owner" />,
  "/guide-dashboard": () => <PartnerWorkspace role="guide" />,
};

function Page() {
  const { path, hash } = useLocation();
  // Old links used /#community
  if (path === "/" && (hash === "#community" || hash === "#inter-karabakh")) return <Community />;
  if (path.startsWith("/district/")) return <District key={path} slug={decodeURIComponent(path.slice("/district/".length))} />;
  const Component = ROUTES[path] || NotFound;
  return <Component />;
}

// Hosts the sign-in modal for the whole app; pages open it with requireLogin().
function AuthShell({ children }) {
  const [open, setOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    const openAuth = (event) => {
      setPendingAction(() => event.detail?.onSuccess || null);
      setOpen(true);
    };
    window.addEventListener("auth:open", openAuth);
    if (isLoggedIn()) api.refreshMe().catch(() => {});
    return () => window.removeEventListener("auth:open", openAuth);
  }, []);

  const close = () => {
    setOpen(false);
    setPendingAction(null);
  };

  return (
    <>
      {children}
      <AuthModal
        open={open}
        onClose={close}
        onAuthenticated={() => {
          const action = pendingAction;
          close();
          action?.();
        }}
      />
    </>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <CurrencyProvider>
        <AuthShell>
          <Suspense fallback={<div className="page-loading" aria-busy="true" />}>
            <Page />
          </Suspense>
        </AuthShell>
      </CurrencyProvider>
    </I18nProvider>
  );
}
