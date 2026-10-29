// The date and group size typed into the trip search, reused to prefill booking forms.
const KEY = "gk.tripDraft";

export function readTripDraft() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveTripDraft(draft) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...readTripDraft(), ...draft }));
  } catch {
    // storage blocked
  }
}
