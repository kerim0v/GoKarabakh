import { createContext, useContext, useEffect, useState } from "react";
import * as api from "../api.js";

// Site settings from /api/v1/meta (currency rates, whether the AI planner is on), loaded once.
const MetaContext = createContext(null);

export function MetaProvider({ children }) {
  const [meta, setMeta] = useState(null);
  useEffect(() => {
    api.getMeta().then(setMeta).catch(() => setMeta({}));
  }, []);
  return <MetaContext.Provider value={meta}>{children}</MetaContext.Provider>;
}

// null while loading
export const useMeta = () => useContext(MetaContext);
