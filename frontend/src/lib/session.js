import { useEffect, useState } from "react";

const TOKEN_KEY = "karabakhToken";
const USER_KEY = "karabakhUser";

function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // storage blocked (private mode): the session just won't survive a reload
  }
}

export const getToken = () => read(TOKEN_KEY);

export function getUser() {
  try {
    return JSON.parse(read(USER_KEY) || "null");
  } catch {
    return null;
  }
}

export const isLoggedIn = () => Boolean(getToken());

export function startSession(token, user) {
  write(TOKEN_KEY, token);
  write(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("auth:changed"));
}

export function updateUser(user) {
  write(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("auth:changed"));
}

export function endSession() {
  write(TOKEN_KEY, null);
  write(USER_KEY, null);
  window.dispatchEvent(new Event("auth:changed"));
}

// Ask the auth modal to open; `onSuccess` runs after the user signs in.
export function requireLogin(onSuccess) {
  window.dispatchEvent(new CustomEvent("auth:open", { detail: { onSuccess } }));
}

export function useSession() {
  const [state, setState] = useState(() => ({ user: getUser(), loggedIn: isLoggedIn() }));
  useEffect(() => {
    const sync = () => setState({ user: getUser(), loggedIn: isLoggedIn() });
    window.addEventListener("auth:changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("auth:changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return state;
}
