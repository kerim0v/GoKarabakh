import { endSession, getToken, requireLogin, startSession, updateUser } from "./lib/session.js";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Photos uploaded through the API live on the backend; everything else is a frontend asset or a full URL.
export function mediaUrl(path) {
  if (!path) return "";
  if (path.startsWith("/uploads/")) return `${API_BASE}${path}`;
  return encodeURI(path);
}

async function request(path, options = {}) {
  const token = getToken();
  const isForm = options.body instanceof FormData;
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...(isForm ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new ApiError("Network error", 0, "network");
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    // no JSON body
  }
  if (res.status === 401 && token && data?.code?.startsWith("token")) {
    // The session expired or is invalid: sign out and ask the user to sign in again
    endSession();
    requireLogin();
  }
  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status, data?.code);
  }
  return data;
}

const post = (path, body) => request(path, { method: "POST", body: JSON.stringify(body ?? {}) });
const put = (path, body) => request(path, { method: "PUT", body: JSON.stringify(body) });
const del = (path) => request(path, { method: "DELETE" });
const query = (params) => {
  const search = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""));
  return search.toString() ? `?${search}` : "";
};

// Auth & account

export function signup({ name, email, password }) {
  return post("/api/v1/users/create", { email, password, about_me: { name } });
}

export async function login({ email, password }) {
  const data = await post("/api/v1/auth/login", { email, password });
  startSession(data.access_token, data.user);
  return data.user;
}

export const logout = () => endSession();
export const forgotPassword = (email) => post("/api/v1/auth/forgot-password", { email });
export const resetPassword = (token, password) => post("/api/v1/auth/reset-password", { token, password });
export const fetchMe = () => request("/api/v1/users/me");

// Reload the signed-in user (role, coin balance) into the session cache
export async function refreshMe() {
  const me = await fetchMe();
  updateUser(me);
  return me;
}
export const updateMe = (fields) => put("/api/v1/users/update", fields);
export const changePassword = (current_password, new_password) =>
  post("/api/v1/users/change-password", { current_password, new_password });
export const deleteAccount = (password) => post("/api/v1/users/delete", { password });
export const leavePartnership = () => post("/api/v1/users/leave-partnership");
export const getKxTransactions = () => request("/api/v1/users/kx_transactions");
export const getMeta = () => request("/api/v1/meta");

// Places

export const getPlaces = (params = {}) => request(`/api/v1/places/get${query(params)}`);
export const getPlace = (id) => request(`/api/v1/places/get_id${query({ id })}`);
export const getMyPlaces = () => request("/api/v1/places/mine");
export const createPlace = (payload) => post("/api/v1/places/create", payload);
export const updatePlace = (payload) => put("/api/v1/places/update", payload);
export const deletePlace = (id) => post("/api/v1/places/delete", { id });
export const getOwnerStats = () => request("/api/v1/places/stats");

// Bookings

export const submitBookingRequest = (payload) => post("/api/v1/places/book_request", payload);
export const getOwnerBookingRequests = () => request("/api/v1/places/book_requests");
export const getMyBookingRequests = () => request("/api/v1/places/my_book_requests");
export const confirmBookingRequest = (id) => post(`/api/v1/places/book_requests/${id}/confirm`);
export const declineBookingRequest = (id) => post(`/api/v1/places/book_requests/${id}/decline`);
export const cancelBookingRequest = (id) => post(`/api/v1/places/book_requests/${id}/cancel`);

// Reviews

export const getReviews = (placeId) => request(`/api/v1/places/${placeId}/reviews`);
export const createReview = (placeId, rating, comment) => post(`/api/v1/places/${placeId}/reviews`, { rating, comment });
export const deleteReview = (id) => del(`/api/v1/reviews/${id}`);

// Itinerary

export const getItinerary = () => request("/api/v1/itinerary");
export const addToItinerary = (place_id, date, time) => post("/api/v1/itinerary", { place_id, date, time });
export const updateItineraryItem = (id, fields) => put(`/api/v1/itinerary/${id}`, fields);
export const removeFromItinerary = (id) => del(`/api/v1/itinerary/${id}`);

// AI planner

export const planTrip = (payload) => post("/api/v1/ai/plan", payload);

// Partners & admin

export const submitPartnerApplication = (payload) => post("/api/v1/partner-applications", payload);
export const getPartnerApplications = () => request("/api/v1/partner-applications");
export const approvePartnerApplication = (id, note, checks = {}) => post(`/api/v1/partner-applications/${id}/approve`, { note, ...checks });
export const rejectPartnerApplication = (id, note) => post(`/api/v1/partner-applications/${id}/reject`, { note });
export const getAdminOverview = () => request("/api/v1/admin/overview");
export const getAdminUsers = (q) => request(`/api/v1/admin/users${query({ q })}`);
export const setUserRole = (id, role) => put(`/api/v1/admin/users/${id}/role`, { role });
export const setVerification = (id, checks) => put(`/api/v1/admin/users/${id}/verification`, checks);
export const getAdminPlaces = (q) => request(`/api/v1/admin/places${query({ q })}`);

// Community & uploads

export const getCommunityTraces = (region) => request(`/api/v1/community/traces${query({ region })}`);
export const createCommunityTrace = (payload) => post("/api/v1/community/traces", payload);
export const deleteCommunityTrace = (id) => del(`/api/v1/community/traces/${id}`);

export async function uploadImage(blob, name = "photo.jpg") {
  const form = new FormData();
  form.append("file", blob, name);
  const data = await request("/api/v1/uploads", { method: "POST", body: form });
  return data.url;
}
