import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import * as api from "../api.js";
import { useI18n } from "../i18n/index.jsx";

const MODES = ["login", "signup"];

export default function AuthModal({ open, onClose, onAuthenticated }) {
  const { t, errorText } = useI18n();
  const [mode, setMode] = useState("login");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [coins, setCoins] = useState([]);
  const [focusedField, setFocusedField] = useState(null);

  useEffect(() => {
    if (!open) return undefined;
    setNotice("");
    setError("");
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const switchMode = (next) => {
    setMode(next);
    setError("");
    setNotice("");
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    const email = form.email.value;

    setSubmitting(true);
    try {
      if (mode === "forgot") {
        await api.forgotPassword(email);
        setNotice(t("auth.resetSent"));
        return;
      }
      const password = form.password.value;
      if (mode === "signup") {
        await api.signup({ name: form.name.value, email, password });
      }
      await api.login({ email, password });

      if (mode === "signup") {
        setNotice(t("auth.welcomeReward"));
        setCoins(
          Array.from({ length: 30 }, (_, index) => ({
            id: `${Date.now()}-${index}`,
            x: Math.random() * 100,
            y: Math.random() * 100,
            delay: Math.random() * 0.35,
            rotate: Math.random() * 360,
          })),
        );
        window.setTimeout(() => {
          setCoins([]);
          onAuthenticated?.();
        }, 1600);
      } else {
        onAuthenticated?.();
      }
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSubmitting(false);
    }
  };

  const field = (name, type, label, placeholder, extra = {}) => (
    <div className="form-group">
      <label htmlFor={`${name}-input`} className="form-label">
        <span>{label} •</span>
        <span className="label-accent" />
      </label>
      <div className="input-wrapper">
        <input
          id={`${name}-input`}
          name={name}
          type={type}
          placeholder={placeholder}
          onFocus={() => setFocusedField(name)}
          onBlur={() => setFocusedField(null)}
          required
          {...extra}
        />
        {focusedField === name && <div className="input-focus-glow" aria-hidden="true" />}
      </div>
    </div>
  );

  const titles = {
    login: [t("auth.loginTitle"), t("auth.loginSubtitle")],
    signup: [t("auth.signupTitle"), t("auth.signupSubtitle")],
    forgot: [t("auth.forgotTitle"), t("auth.forgotSubtitle")],
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="auth-backdrop-enhanced"
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 1, backdropFilter: "blur(28px)" }}
          exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
          transition={{ duration: 0.4 }}
          onClick={(event) => event.target === event.currentTarget && onClose()}
        >
          <motion.div
            className="auth-card-enhanced glass auth-card-origin"
            layout
            transformTemplate={(latest, generated) => `perspective(1000px) rotateX(2deg) ${generated}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-title"
            initial={{ opacity: 0, y: 40, rotateX: 15, rotateY: 8, scale: 0.2 }}
            animate={{ opacity: 1, y: 0, rotateX: 0, rotateY: 0, scale: 1 }}
            exit={{ opacity: 0, y: 25, scale: 0.2 }}
            transition={{ duration: 0.65, ease: [0.34, 1.56, 0.64, 1], delay: 0.05 }}
          >
            <motion.button
              className="button-auth-close"
              onClick={onClose}
              type="button"
              aria-label={t("common.close")}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              ✕
            </motion.button>
            <div className="auth-symbol-container">
              <motion.img
                className="modal-khari-bulbul"
                src="/lacin/khari-bulbul1.png"
                alt=""
                initial={{ scale: 0.8, rotateZ: -8 }}
                animate={{ scale: 1, rotateZ: 0 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 180, damping: 22 }}
              />
            </div>
            <span className="eyebrow mono auth-eyebrow">{t("auth.eyebrow")} •</span>
            <div className="auth-content-enhanced">
              <motion.h2 id="auth-title" className="auth-title-enhanced" key={`${mode}-title`} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
                {titles[mode][0]}
              </motion.h2>
              <p className="auth-subtitle-enhanced">{titles[mode][1]}</p>
              {mode !== "forgot" && (
                <div className="auth-switch-enhanced" role="tablist" aria-label={t("auth.modeLabel")}>
                  {MODES.map((item) => (
                    <button
                      key={item}
                      className={`auth-switch-button ${mode === item ? "selected" : ""}`}
                      onClick={() => switchMode(item)}
                      type="button"
                      role="tab"
                      aria-selected={mode === item}
                    >
                      <span>{item === "login" ? t("auth.signIn") : t("auth.signUp")}</span>
                      {mode === item && <motion.div className="switch-indicator" layoutId="auth-indicator" />}
                    </button>
                  ))}
                </div>
              )}
              <form className="auth-form-enhanced" key={mode} onSubmit={submit}>
                {mode === "signup" && field("name", "text", t("auth.name"), t("auth.namePlaceholder"), { maxLength: 255 })}
                {field("email", "email", t("auth.email"), "you@example.com", { autoComplete: "email" })}
                {mode !== "forgot" &&
                  field("password", "password", t("auth.password"), mode === "login" ? "••••••••" : t("auth.passwordHint"), {
                    minLength: 8,
                    autoComplete: mode === "login" ? "current-password" : "new-password",
                  })}
                {error && <p role="alert" className="form-error">{error}</p>}
                <motion.button
                  className="button-auth-submit"
                  type="submit"
                  disabled={submitting}
                  whileHover={{ scale: 1.02, boxShadow: "0 12px 40px rgba(56, 189, 248, 0.35)" }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <span>
                    {submitting ? t("common.wait") : { login: t("auth.signIn"), signup: t("auth.createPassport"), forgot: t("auth.sendLink") }[mode]}
                  </span>
                  <span className="button-arrow">↗</span>
                </motion.button>
                {mode === "login" && (
                  <button type="button" className="link-button" onClick={() => switchMode("forgot")}>
                    {t("auth.forgotLink")}
                  </button>
                )}
                {mode === "forgot" && (
                  <button type="button" className="link-button" onClick={() => switchMode("login")}>
                    ← {t("auth.backToSignIn")}
                  </button>
                )}
              </form>
            </div>
            {notice && (
              <motion.div
                className="auth-notice-enhanced"
                role="status"
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <span className="notice-icon">✓</span>
                {notice}
              </motion.div>
            )}
            <div className="auth-coins-container" aria-hidden="true">
              {coins.map((coin) => (
                <motion.span
                  key={coin.id}
                  className="floating-coin"
                  initial={{ opacity: 0, x: "50vw", y: "38vh", scale: 0.2, rotate: 0 }}
                  animate={{
                    opacity: [1, 1, 0],
                    x: `calc(50vw + ${(coin.x - 50) * 100}px)`,
                    y: `calc(38vh + ${(coin.y - 50) * 120}px)`,
                    scale: 1,
                    rotate: coin.rotate,
                  }}
                  transition={{ duration: 1.6, delay: coin.delay, ease: "easeOut" }}
                >
                  ◈
                </motion.span>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
