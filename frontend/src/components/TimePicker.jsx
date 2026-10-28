import { useI18n } from "../i18n/index.jsx";

// Every 15 minutes from 06:00 to 23:45, always shown as 24-hour time (native time inputs follow the OS: 03:00 PM)
const TIMES = Array.from({ length: 72 }, (_, i) => {
  const minutes = 6 * 60 + i * 15;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

export default function TimePicker({ id, value, onChange, label }) {
  const { t } = useI18n();
  const options = value && !TIMES.includes(value) ? [value, ...TIMES] : TIMES;
  return (
    <select id={id} className="time-picker" value={value || ""} onChange={(event) => onChange(event.target.value)} aria-label={label}>
      <option value="">{t("itinerary.anyTime")}</option>
      {options.map((time) => <option key={time} value={time}>{time}</option>)}
    </select>
  );
}
