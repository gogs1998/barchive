"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import { PasswordStrengthMeter } from "@/components/PasswordStrengthMeter";
import styles from "./page.module.css";
import formStyles from "@/components/AuthForm.module.css";

function ResetPasswordContent() {
  const params = useSearchParams();
  const token = params.get("token");
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const expired = !token || token === "expired";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!password || password.length < 8) errs.password = "Password must be at least 8 characters";
    if (password !== confirm) errs.confirm = "Passwords do not match";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    // TODO: call real reset-password API endpoint
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    setDone(true);
    setTimeout(() => router.push("/"), 2000);
  };

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        {expired ? (
          <>
            <div className={styles.icon} aria-hidden="true">⏰</div>
            <h1 className={styles.heading}>Link has expired</h1>
            <p className={styles.message}>Request a new password reset link.</p>
            <a href="/?forgot=1" className={styles.cta}>Request new link</a>
          </>
        ) : done ? (
          <>
            <div className={styles.icon} aria-hidden="true">✅</div>
            <h1 className={styles.heading}>Password updated</h1>
            <p className={styles.message}>Redirecting you home…</p>
          </>
        ) : (
          <form onSubmit={handleSubmit} noValidate className={formStyles.form} style={{ width: "100%" }}>
            <h1 className={formStyles.heading} id="reset-pw-title">Create a new password</h1>

            <div className={formStyles.field}>
              <label htmlFor="new-pw" className={formStyles.label}>New password</label>
              <div className={formStyles.inputWrap}>
                <input
                  id="new-pw"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${formStyles.input} ${errors.password ? formStyles.inputError : ""}`}
                  autoComplete="new-password"
                  aria-describedby={errors.password ? "new-pw-error" : undefined}
                />
                <button
                  type="button"
                  className={formStyles.showPw}
                  onClick={() => setShowPw((p) => !p)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                    <path d="M2 9C3.5 5.5 6 4 9 4s5.5 1.5 7 5c-1.5 3.5-4 5-7 5S3.5 12.5 2 9z" stroke="currentColor" strokeWidth="1.4"/>
                    <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
                  </svg>
                </button>
              </div>
              {errors.password && <span id="new-pw-error" role="alert" className={formStyles.error}>{errors.password}</span>}
            </div>

            <PasswordStrengthMeter password={password} />

            <div className={formStyles.field}>
              <label htmlFor="confirm-pw" className={formStyles.label}>Confirm new password</label>
              <input
                id="confirm-pw"
                type={showPw ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={`${formStyles.input} ${errors.confirm ? formStyles.inputError : ""}`}
                autoComplete="new-password"
                aria-describedby={errors.confirm ? "confirm-pw-error" : undefined}
              />
              {errors.confirm && <span id="confirm-pw-error" role="alert" className={formStyles.error}>{errors.confirm}</span>}
            </div>

            <button type="submit" className={formStyles.primaryBtn} disabled={loading} aria-busy={loading}>
              {loading ? "Saving…" : "Save new password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className={styles.main}><div className={styles.card} /></main>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
