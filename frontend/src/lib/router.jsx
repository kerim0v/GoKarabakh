import { useEffect, useState } from "react";

const ROUTE_EVENT = "route:changed";

export function navigate(path, { replace = false } = {}) {
  if (replace) window.history.replaceState({}, "", path);
  else window.history.pushState({}, "", path);
  window.scrollTo(0, 0);
  window.dispatchEvent(new Event(ROUTE_EVENT));
}

export function useLocation() {
  const read = () => ({ path: window.location.pathname.replace(/\/$/, "") || "/", hash: window.location.hash, search: window.location.search });
  const [location, setLocation] = useState(read);
  useEffect(() => {
    const sync = () => setLocation(read());
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    window.addEventListener(ROUTE_EVENT, sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
      window.removeEventListener(ROUTE_EVENT, sync);
    };
  }, []);
  return location;
}

// A plain <a> that navigates without a page reload; modifier-clicks still open new tabs.
export function Link({ href, onClick, ...props }) {
  const handleClick = (event) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    navigate(href);
  };
  return <a href={href} onClick={handleClick} {...props} />;
}
