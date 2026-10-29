// Dates are passed around as "YYYY-MM-DD" strings in the visitor's own time zone.

export function toIsoDate(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromIsoDate(value) {
  return new Date(`${value}T00:00:00`);
}

// Today's date in the visitor's own time zone (toISOString would give the UTC date)
export function localToday() {
  return toIsoDate(new Date());
}

export function addDays(value, days) {
  const date = fromIsoDate(value);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}
