import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/index.jsx";
import { addDays, fromIsoDate, localToday, toIsoDate } from "../lib/dates.js";

/**
 * Date field that follows the site's language. Native date inputs use the visitor's operating-system
 * language and format and accept 5-digit years, so this shows its own calendar instead.
 * `value`, `min` and `max` are "YYYY-MM-DD" strings ("" = no date).
 */
export default function DatePicker({ id, value, onChange, min, max, required = false, clearable = false, placeholder, label }) {
  const { t, formatDate, formatMonth, weekdayNames } = useI18n();
  const [open, setOpen] = useState(false);
  const [shift, setShift] = useState(0);
  const [month, setMonth] = useState(() => fromIsoDate(value || min || localToday()));
  const rootRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setMonth(fromIsoDate(value || min || localToday()));
    // Keep the calendar on screen: move it left when it would run past the right edge
    const left = rootRef.current.getBoundingClientRect().left;
    const width = Math.min(292, window.innerWidth - 32);
    setShift(Math.min(0, window.innerWidth - 16 - width - left));
    const close = (event) => !rootRef.current?.contains(event.target) && setOpen(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const weekdays = weekdayNames();

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstWeekday = (new Date(year, monthIndex, 1).getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => toIsoDate(new Date(year, monthIndex, i + 1)))];
  const today = localToday();
  const isDisabled = (day) => (min && day < min) || (max && day > max);
  const canGoBack = !min || toIsoDate(new Date(year, monthIndex, 0)) >= min;

  const choose = (day) => {
    onChange(day);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onKeyDown = (event) => {
    if (event.key === "Escape" && open) {
      event.stopPropagation(); // don't close a surrounding modal
      setOpen(false);
      buttonRef.current?.focus();
    }
  };

  return (
    <div className="date-picker" ref={rootRef} onKeyDown={onKeyDown}>
      <button
        id={id}
        ref={buttonRef}
        type="button"
        className={`date-picker-button${value ? "" : " is-empty"}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label ? `${label}: ${value ? formatDate(value) : t("datePicker.choose")}` : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{value ? formatDate(value) : placeholder || t("datePicker.choose")}</span>
        <svg className="date-picker-icon" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      </button>
      {/* Lets the browser's own "please fill in this field" check work on required dates */}
      {required && <input className="date-picker-proxy" tabIndex={-1} aria-hidden="true" required value={value || ""} onChange={() => {}} />}
      {open && (
        <div className="date-picker-popover" style={{ left: shift }} role="dialog" aria-label={label || t("datePicker.choose")}>
          <div className="date-picker-head">
            <button type="button" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))} disabled={!canGoBack} aria-label={t("datePicker.previous")}>‹</button>
            <strong>{formatMonth(month)}</strong>
            <button type="button" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))} aria-label={t("datePicker.next")}>›</button>
          </div>
          <div className="date-picker-grid">
            {weekdays.map((name) => <span key={name} className="date-picker-weekday">{name}</span>)}
            {cells.map((day, index) =>
              day ? (
                <button
                  key={day}
                  type="button"
                  disabled={isDisabled(day)}
                  className={`${day === value ? "is-selected" : ""}${day === today ? " is-today" : ""}`}
                  aria-pressed={day === value}
                  aria-label={formatDate(day)}
                  onClick={() => choose(day)}
                >
                  {Number(day.slice(8))}
                </button>
              ) : (
                <span key={`blank-${index}`} />
              ),
            )}
          </div>
          <div className="date-picker-foot">
            {!isDisabled(today) && <button type="button" onClick={() => choose(today)}>{t("datePicker.today")}</button>}
            {!isDisabled(addDays(today, 1)) && <button type="button" onClick={() => choose(addDays(today, 1))}>{t("datePicker.tomorrow")}</button>}
            {clearable && value && <button type="button" onClick={() => choose("")}>{t("datePicker.clear")}</button>}
          </div>
        </div>
      )}
    </div>
  );
}
