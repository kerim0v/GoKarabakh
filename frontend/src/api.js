const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

function authHeaders() {
  const token = localStorage.getItem("karabakhToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    // no JSON body
  }
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export function signup({ name, email, password }) {
  return request("/api/v1/users/create", {
    method: "POST",
    body: JSON.stringify({ email, password, about_me: { name } }),
  });
}

export async function login({ email, password }) {
  const data = await request("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem("karabakhToken", data.access_token);
  return data.user;
}

export function logout() {
  localStorage.removeItem("karabakhToken");
}

export function fetchMe() {
  return request("/api/v1/users/me");
}

export function getBookingHistory() {
  return request("/api/v1/users/bookings");
}

export function getOwnerStats() {
  return request("/api/v1/places/stats");
}

export function getPlaces() {
  return request("/api/v1/places/get");
}

export function createPlace(payload) {
  return request("/api/v1/places/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function bookPlace(payload) {
  return request("/api/v1/places/book", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function submitPartnerApplication(payload) {
  return request("/api/v1/partner-applications", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getMyPartnerApplications() {
  return request("/api/v1/partner-applications");
}

export function submitBookingRequest(payload) {
  return request("/api/v1/places/book_request", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getOwnerBookingRequests() {
  return request("/api/v1/places/book_requests");
}

export function getMyBookingRequests() {
  return request("/api/v1/places/my_book_requests");
}

export function confirmBookingRequest(id) {
  return request(`/api/v1/places/book_requests/${id}/confirm`, { method: "POST" });
}

export function declineBookingRequest(id) {
  return request(`/api/v1/places/book_requests/${id}/decline`, { method: "POST" });
}
