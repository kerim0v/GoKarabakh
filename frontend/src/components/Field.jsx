// Label + control in the shared form style.
export default function Field({ id, label, children, hint }) {
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>
        <span>{label} •</span>
        <span className="label-accent" />
      </label>
      <div className="input-wrapper">{children}</div>
      {hint && <small className="field-hint">{hint}</small>}
    </div>
  );
}
