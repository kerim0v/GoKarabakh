import { useState } from "react";
import * as api from "../api.js";
import Field from "../components/Field.jsx";
import Header from "../components/Header.jsx";
import { useI18n } from "../i18n/index.jsx";
import { requireLogin } from "../lib/session.js";

export default function ResetPassword() {
  const { t, errorText } = useI18n();
  const token = new URLSearchParams(window.location.search).get("token") || "";
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setError("");
    if (form.password.value !== form.confirm.value) {
      setError(t("reset.mismatch"));
      return;
    }
    setSubmitting(true);
    try {
      await api.resetPassword(token, form.password.value);
      setDone(true);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-shell profile-page">
      <Header />
      <main className="profile-main narrow-main">
        <section className="profile-panel glass">
          <span className="eyebrow mono">{t("auth.eyebrow")}</span>
          <h1>{t("reset.title")}</h1>
          {done ? (
            <>
              <p role="status" className="notice">{t("reset.done")}</p>
              <button type="button" className="profile-explore-link" onClick={() => requireLogin()}>{t("auth.signIn")} →</button>
            </>
          ) : (
            <form className="auth-form-enhanced" onSubmit={submit}>
              <Field id="reset-password" label={t("profile.newPassword")}>
                <input id="reset-password" name="password" type="password" minLength="8" autoComplete="new-password" required />
              </Field>
              <Field id="reset-confirm" label={t("reset.confirm")}>
                <input id="reset-confirm" name="confirm" type="password" minLength="8" autoComplete="new-password" required />
              </Field>
              {!token && <p className="form-error">{t("errors.invalid_token")}</p>}
              {error && <p role="alert" className="form-error">{error}</p>}
              <button className="button-auth-submit" type="submit" disabled={submitting || !token}>
                <span>{submitting ? t("common.wait") : t("reset.submit")}</span>
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
