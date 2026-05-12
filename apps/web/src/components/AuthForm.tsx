"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { PasswordStrengthMeter, getPasswordStrength } from "./PasswordStrengthMeter";
import styles from "./AuthForm.module.css";

// ─── Shared field component ──────────────────────────────────────────────────

interface FieldProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  autoComplete?: string;
  helper?: string;
}

function Field({ id, label, type = "text", value, onChange, error, autoComplete, helper }: FieldProps) {
  const [showPw, setShowPw] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && showPw ? "text" : type;

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      {helper && <span className={styles.helper}>{helper}</span>}
      <div className={styles.inputWrap}>
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${styles.input} ${error ? styles.inputError : ""}`}
          autoComplete={autoComplete}
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={error ? "true" : undefined}
        />
        {isPassword && (
          <button
            type="button"
            className={styles.showPw}
            onClick={() => setShowPw((p) => !p)}
            aria-label={showPw ? "Hide password" : "Show password"}
          >
            {showPw ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M2 9C3.5 5.5 6 4 9 4s5.5 1.5 7 5c-1.5 3.5-4 5-7 5S3.5 12.5 2 9z" stroke="currentColor" strokeWidth="1.4"/>
                <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
                <line x1="3" y1="3" x2="15" y2="15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M2 9C3.5 5.5 6 4 9 4s5.5 1.5 7 5c-1.5 3.5-4 5-7 5S3.5 12.5 2 9z" stroke="currentColor" strokeWidth="1.4"/>
                <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
              </svg>
            )}
          </button>
        )}
      </div>
      {error && (
        <span id={`${id}-error`} role="alert" className={styles.error}>
          {error}
        </span>
      )}
    </div>
  );
}

// ─── Login Form ──────────────────────────────────────────────────────────────

interface LoginFormProps {
  onSuccess: () => void;
  onForgotPassword: () => void;
  onRegister: () => void;
}

export function LoginForm({ onSuccess, onForgotPassword, onRegister }: LoginFormProps) {
  const { login, startGoogleOAuth } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = useCallback(() => {
    const errs: Record<string, string> = {};
    if (!email) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = "Enter a valid email address";
    if (!password) errs.password = "Password is required";
    return errs;
  }, [email, password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setApiError("");
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.error) {
      setErrors({ password: result.error });
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className={styles.form}>
      <h2 className={styles.heading} id="auth-modal-title">Sign in to your bar</h2>

      {apiError && <p role="alert" className={styles.apiError}>{apiError}</p>}

      <Field id="login-email" label="Email address" type="email" value={email}
        onChange={setEmail} error={errors.email} autoComplete="email" />
      <Field id="login-password" label="Password" type="password" value={password}
        onChange={setPassword} error={errors.password} autoComplete="current-password" />

      <button type="button" className={styles.forgotLink} onClick={onForgotPassword}>
        Forgot password?
      </button>

      <button type="submit" className={styles.primaryBtn} disabled={loading} aria-busy={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </button>

      <div className={styles.divider} aria-hidden="true"><span>or</span></div>

      <button type="button" className={styles.socialBtn} onClick={() => startGoogleOAuth()}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M16.51 9.18c0-.56-.05-1.1-.14-1.61H9v3.04h4.2a3.59 3.59 0 01-1.56 2.36v1.96h2.52c1.47-1.36 2.35-3.36 2.35-5.75z" fill="#4285F4"/>
          <path d="M9 17c2.1 0 3.86-.7 5.15-1.89l-2.52-1.96c-.7.47-1.59.74-2.63.74-2.02 0-3.73-1.37-4.34-3.2H2.06v2.02A8 8 0 009 17z" fill="#34A853"/>
          <path d="M4.66 10.69A4.8 4.8 0 014.4 9c0-.59.1-1.16.26-1.69V5.29H2.06A8.01 8.01 0 001 9c0 1.29.31 2.51.86 3.59l1.8-1.4.97-.5z" fill="#FBBC05"/>
          <path d="M9 3.58c1.14 0 2.16.39 2.96 1.16l2.22-2.22C12.85.89 11.09.1 9 .1A8 8 0 002.06 5.3L4.66 7.3C5.27 5.48 6.98 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      <p className={styles.switchPrompt}>
        {"Don't have an account? "}
        <button type="button" className={styles.switchLink} onClick={onRegister}>Register</button>
      </p>
    </form>
  );
}

// ─── Register Form ───────────────────────────────────────────────────────────

interface RegisterFormProps {
  onSuccess: (email: string) => void;
  onLogin: () => void;
}

export function RegisterForm({ onSuccess, onLogin }: RegisterFormProps) {
  const { register, startGoogleOAuth } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = useCallback(() => {
    const errs: Record<string, string> = {};
    if (!displayName || displayName.length < 2 || displayName.length > 40)
      errs.displayName = "Display name must be 2–40 characters";
    if (!email) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = "Enter a valid email address";
    if (!password) errs.password = "Password is required";
    else if (getPasswordStrength(password) < 2)
      errs.password = "Use 8+ characters, a number, and a symbol";
    if (password !== confirmPassword) errs.confirmPassword = "Passwords do not match";
    return errs;
  }, [displayName, email, password, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    const result = await register(displayName, email, password);
    setLoading(false);
    if (result.error) {
      setErrors({ email: result.error });
    } else {
      onSuccess(email);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className={styles.form}>
      <h2 className={styles.heading} id="auth-modal-title">Join BarIQ</h2>

      <Field id="reg-name" label="Display name" value={displayName} onChange={setDisplayName}
        error={errors.displayName} autoComplete="name"
        helper="This is how you'll appear on shared recipes" />
      <Field id="reg-email" label="Email address" type="email" value={email}
        onChange={setEmail} error={errors.email} autoComplete="email" />
      <Field id="reg-password" label="Password" type="password" value={password}
        onChange={setPassword} error={errors.password} autoComplete="new-password" />
      <PasswordStrengthMeter password={password} />
      <Field id="reg-confirm" label="Confirm password" type="password" value={confirmPassword}
        onChange={setConfirmPassword} error={errors.confirmPassword} autoComplete="new-password" />

      <label className={styles.checkboxLabel}>
        <input
          type="checkbox"
          checked={agreedToTerms}
          onChange={(e) => setAgreedToTerms(e.target.checked)}
          className={styles.checkbox}
          aria-required="true"
        />
        <span>
          I agree to the{" "}
          <a href="/terms" target="_blank" rel="noreferrer" className={styles.termsLink}>Terms</a>
          {" & "}
          <a href="/privacy" target="_blank" rel="noreferrer" className={styles.termsLink}>Privacy Policy</a>
        </span>
      </label>

      <button
        type="submit"
        className={styles.primaryBtn}
        disabled={loading || !agreedToTerms}
        aria-busy={loading}
      >
        {loading ? "Creating account…" : "Create my account"}
      </button>

      <div className={styles.divider} aria-hidden="true"><span>or</span></div>

      <button type="button" className={styles.socialBtn} onClick={() => startGoogleOAuth()}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M16.51 9.18c0-.56-.05-1.1-.14-1.61H9v3.04h4.2a3.59 3.59 0 01-1.56 2.36v1.96h2.52c1.47-1.36 2.35-3.36 2.35-5.75z" fill="#4285F4"/>
          <path d="M9 17c2.1 0 3.86-.7 5.15-1.89l-2.52-1.96c-.7.47-1.59.74-2.63.74-2.02 0-3.73-1.37-4.34-3.2H2.06v2.02A8 8 0 009 17z" fill="#34A853"/>
          <path d="M4.66 10.69A4.8 4.8 0 014.4 9c0-.59.1-1.16.26-1.69V5.29H2.06A8.01 8.01 0 001 9c0 1.29.31 2.51.86 3.59l1.8-1.4.97-.5z" fill="#FBBC05"/>
          <path d="M9 3.58c1.14 0 2.16.39 2.96 1.16l2.22-2.22C12.85.89 11.09.1 9 .1A8 8 0 002.06 5.3L4.66 7.3C5.27 5.48 6.98 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      <p className={styles.switchPrompt}>
        Already have an account?{" "}
        <button type="button" className={styles.switchLink} onClick={onLogin}>Sign in</button>
      </p>
    </form>
  );
}

// ─── Forgot Password Form ────────────────────────────────────────────────────

interface ForgotPasswordFormProps {
  onSent: (email: string) => void;
  onBack: () => void;
}

export function ForgotPasswordForm({ onSent, onBack }: ForgotPasswordFormProps) {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError("Email is required"); return; }
    setError("");
    setLoading(true);
    await sendPasswordReset(email);
    setLoading(false);
    onSent(email);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className={styles.form}>
      <h2 className={styles.heading} id="auth-modal-title">Reset your password</h2>
      <p className={styles.subtext}>Enter your email and we&apos;ll send you a reset link.</p>
      <Field id="forgot-email" label="Email address" type="email" value={email}
        onChange={setEmail} error={error} autoComplete="email" />
      <button type="submit" className={styles.primaryBtn} disabled={loading} aria-busy={loading}>
        {loading ? "Sending…" : "Send reset link"}
      </button>
      <button type="button" className={styles.backLink} onClick={onBack}>
        ← Back to sign in
      </button>
    </form>
  );
}

// ─── Reset Sent View ─────────────────────────────────────────────────────────

interface ResetSentViewProps {
  email: string;
  onBack: () => void;
}

export function ResetSentView({ email, onBack }: ResetSentViewProps) {
  const { sendPasswordReset } = useAuth();
  const [cooldown, setCooldown] = useState(0);

  const handleResend = async () => {
    setCooldown(60);
    await sendPasswordReset(email);
    const interval = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { clearInterval(interval); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  return (
    <div className={styles.form}>
      <h2 className={styles.heading} id="auth-modal-title">Check your inbox</h2>
      <p className={styles.subtext}>
        If an account exists for <strong>{email}</strong>, we&apos;ll send a reset link.
      </p>
      <button
        type="button"
        className={styles.ghostBtn}
        onClick={handleResend}
        disabled={cooldown > 0}
      >
        {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend"}
      </button>
      <button type="button" className={styles.backLink} onClick={onBack}>
        ← Back to sign in
      </button>
    </div>
  );
}
