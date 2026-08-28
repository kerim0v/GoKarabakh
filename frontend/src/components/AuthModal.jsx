import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createUser, userLogin } from "../js/user";

const rewardText =
  "Welcome! +100 KarabakhCoins have been added to your account.";

export default function AuthModal({ open, onClose, onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [notice, setNotice] = useState("");
  const [coins, setCoins] = useState([]);
  const [focusedField, setFocusedField] = useState(null);

  useEffect(() => {
    if (!open) return undefined;
    setNotice("");
    return undefined;
  }, [open]);

  const submit = async (event) => {
    event.preventDefault();
    const isNewAccount = mode === "signup";
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem(
      "karabakhUser",
      JSON.stringify({
        email: event.currentTarget.email.value,
        createdAt: Date.now(),
      }),
    );
    window.dispatchEvent(new CustomEvent("auth:changed"));
    if (isNewAccount && !localStorage.getItem("signupRewardClaimed")) {
      localStorage.setItem("signupRewardClaimed", "true");
      setNotice(rewardText);
      setCoins(
        Array.from({ length: 30 }, (_, index) => ({
          id: `${Date.now()}-${index}`,
          x: Math.random() * 100,
          y: Math.random() * 100,
          delay: Math.random() * 0.35,
          rotate: Math.random() * 360,
        })),
      );
      const ok = await createUser(
        event.currentTarget.name.value,
        event.currentTarget.email.value,
        event.currentTarget.password.value);
      if (ok) {
        console.debug("Created user successfully");
        setCoins([]);
        onAuthenticated?.();
      } else {
        alert("The input is invalid, try again.");
        console.error("User creation failed");
      }
    } else {
      const auth = await userLogin(
        event.currentTarget.email.value,
        event.currentTarget.password.value);
      if (auth) {
        // userLogin sets local db
        onAuthenticated?.();
      } else {
        alert("Invalid email or password, please try again.");
      }
    }
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
            className="auth-card-enhanced glass"
            layout
            style={{ transformOrigin: "center center" }}
            transformTemplate={(latest, generated) => `perspective(1000px) rotateX(2deg) ${generated}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-title"
            initial={{
              opacity: 0,
              y: 40,
              rotateX: 15,
              rotateY: 8,
              scale: 0.2,
            }}
            animate={{ opacity: 1, y: 0, rotateX: 0, rotateY: 0, scale: 1 }}
            exit={{ opacity: 0, y: 25, scale: 0.2 }}
            transition={{
              duration: 0.65,
              ease: [0.34, 1.56, 0.64, 1],
              delay: 0.05,
            }}
          >
            <motion.button
              className="button-auth-close"
              onClick={onClose}
              type="button"
              aria-label="Close authentication modal"
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
                alt="Khari Bulbul"
                initial={{ scale: 0.8, rotateZ: -8 }}
                animate={{ scale: 1, rotateZ: 0 }}
                transition={{
                  delay: 0.15,
                  type: "spring",
                  stiffness: 180,
                  damping: 22,
                }}
              />
            </div>
            <motion.span
              className="eyebrow mono auth-eyebrow"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              KARABAKH PASSPORT •
            </motion.span>
            <div className="auth-content-enhanced">
            <motion.h2
              id="auth-title"
              className="auth-title-enhanced"
              key={`${mode}-title`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              {mode === "login" ? "Welcome back." : "Claim Your Passport."}
            </motion.h2>
            <motion.p
              className="auth-subtitle-enhanced"
              key={`${mode}-subtitle`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {mode === "login"
                ? "Keep your routes, rewards, and favorite places together."
                : "Unlock custom routes, personal bookmarks, and local stories."}
            </motion.p>
            <motion.div
              className="auth-switch-enhanced"
              role="tablist"
              aria-label="Authentication mode"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
            >
              <button
                className={`auth-switch-button ${mode === "login" ? "selected" : ""}`}
                onClick={() => setMode("login")}
                type="button"
                role="tab"
                aria-selected={mode === "login"}
              >
                <span>Sign In</span>
                {mode === "login" && (
                  <motion.div
                    className="switch-indicator"
                    layoutId="auth-indicator"
                  />
                )}
              </button>
              <button
                className={`auth-switch-button ${mode === "signup" ? "selected" : ""}`}
                onClick={() => setMode("signup")}
                type="button"
                role="tab"
                aria-selected={mode === "signup"}
              >
                <span>Sign Up</span>
                {mode === "signup" && (
                  <motion.div
                    className="switch-indicator"
                    layoutId="auth-indicator"
                  />
                )}
              </button>
            </motion.div>
            <motion.form
              className="auth-form-enhanced"
              key={mode}
              onSubmit={submit}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {mode === "signup" && (
                <motion.div
                  className="form-group"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  <label htmlFor="name-input" className="form-label">
                    <span>FULL NAME •</span>
                    <span className="label-accent" />
                  </label>
                  <div className="input-wrapper">
                    <input
                      id="name-input"
                      name="name"
                      type="text"
                      placeholder="e.g. Nizami Ganjavi"
                      onFocus={() => setFocusedField("name")}
                      onBlur={() => setFocusedField(null)}
                      required={mode === "signup"}
                    />
                    {focusedField === "name" && (
                      <div className="input-focus-glow" aria-hidden="true" />
                    )}
                  </div>
                </motion.div>
              )}
              <div className="form-group">
                <label htmlFor="email-input" className="form-label">
                    <span>EMAIL •</span>
                  <span className="label-accent" />
                </label>
                <div className="input-wrapper">
                  <input
                    id="email-input"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    required
                  />
                  {focusedField === "email" && (
                    <div className="input-focus-glow" aria-hidden="true" />
                  )}
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="password-input" className="form-label">
                    <span>PASSWORD •</span>
                  <span className="label-accent" />
                </label>
                <div className="input-wrapper">
                  <input
                    id="password-input"
                    name="password"
                    type="password"
                    placeholder={mode === "login" ? "••••••••" : "At least 8 characters"}
                    minLength="8"
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    required
                  />
                  {focusedField === "password" && (
                    <div className="input-focus-glow" aria-hidden="true" />
                  )}
                </div>
              </div>
              <motion.button
                className="button-auth-submit"
                type="submit"
                whileHover={{
                  scale: 1.02,
                  boxShadow: "0 12px 40px rgba(56, 189, 248, 0.35)",
                }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <span>{mode === "login" ? "Sign In" : "Create Passport"}</span>
                <span className="button-arrow">↗</span>
              </motion.button>
            </motion.form>
            </div>
            {notice && (
              <motion.div
                className="auth-notice-enhanced"
                role="status"
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 5, scale: 0.95 }}
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
                  initial={{
                    opacity: 0,
                    x: "50vw",
                    y: "38vh",
                    scale: 0.2,
                    rotate: 0,
                  }}
                  animate={{
                    opacity: [1, 1, 0],
                    x: `calc(50vw + ${(coin.x - 50) * 100}px)`,
                    y: `calc(38vh + ${(coin.y - 50) * 120}px)`,
                    scale: 1,
                    rotate: coin.rotate,
                  }}
                  transition={{
                    duration: 1.6,
                    delay: coin.delay,
                    ease: "easeOut",
                  }}
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
