import { useState } from "react";
import * as api from "../api.js";
import { useI18n } from "../i18n/index.jsx";
import Field from "./Field.jsx";
import Modal from "./Modal.jsx";

export default function PartnerApplicationModal({ open, onClose, onSubmitted }) {
  const { t, errorText } = useI18n();
  const [role, setRole] = useState("owner");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isBusiness = role === "owner";

  const submit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    setSubmitting(true);
    try {
      await api.submitPartnerApplication({
        target_role: role,
        company_name: form.get("company_name") || "",
        tax_id: form.get("tax_id") || "",
        phone: form.get("phone"),
        languages: form.get("languages"),
        bio: form.get("bio"),
      });
      onSubmitted?.();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="partner-title" className="partner-application-card" wide>
      <span className="eyebrow mono auth-eyebrow">{t("partner.eyebrow")} •</span>
      <h2 id="partner-title" className="auth-title-enhanced">{t("partner.title")}</h2>
      <p className="auth-subtitle-enhanced">{t("partner.subtitle")}</p>
      <form className="auth-form-enhanced" onSubmit={submit}>
        <Field id="partner-role" label={t("partner.role")}>
          <select id="partner-role" value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="owner">{t("roles.owner")}</option>
            <option value="guide">{t("roles.guide")}</option>
          </select>
        </Field>
        {isBusiness && (
          <>
            <Field id="company-name" label={t("partner.company")}>
              <input id="company-name" name="company_name" maxLength="255" placeholder={t("partner.companyPlaceholder")} required />
            </Field>
            <Field id="tax-id" label={t("partner.taxId")}>
              <input id="tax-id" name="tax_id" maxLength="100" placeholder={t("partner.taxIdPlaceholder")} required />
            </Field>
          </>
        )}
        <Field id="partner-phone" label={t("partner.phone")} hint={t("partner.phoneHint")}>
          <input id="partner-phone" name="phone" type="tel" maxLength="50" placeholder="+994 50 000 00 00" required />
        </Field>
        <Field id="partner-languages" label={t("partner.languages")}>
          <input id="partner-languages" name="languages" maxLength="255" placeholder={t("partner.languagesPlaceholder")} required />
        </Field>
        <Field id="partner-bio" label={t("partner.bio")}>
          <textarea id="partner-bio" name="bio" rows="4" maxLength="2000" placeholder={t("partner.bioPlaceholder")} required />
        </Field>
        {error && <p role="alert" className="form-error">{error}</p>}
        <button className="button-auth-submit" type="submit" disabled={submitting}>
          <span>{submitting ? t("common.wait") : t("partner.submit")}</span>
          <span className="button-arrow">↗</span>
        </button>
      </form>
    </Modal>
  );
}
