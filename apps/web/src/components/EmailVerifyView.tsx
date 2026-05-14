"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import styles from "./AuthForm.module.css";

interface Props {
  email: string;
  onDismiss: () => void;
  onChangeEmail: () => void;
}

export function EmailVerifyView({ email, onDismiss, onChangeEmail }: Props) {
  const { sendVerificationEmail } = useAuth();
  const [cooldown, setCooldown] = useState(60);

  const startCooldown = useCallback(() => {
    setCooldown(60);
    const interval = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { clearInterval(interval); return 0; }
        return c - 1;
      });
    }, 1000);
    return interval;
  }, []);

  useEffect(() => {
    const id = startCooldown();
    return () => clearInterval(id);
  }, [startCooldown]);

  const handleResend = async () => {
    await sendVerificationEmail();
    startCooldown();
  };

  return (
    <div className={styles.form}>
      <h2 className={styles.heading} id="auth-modal-title">Check your inbox</h2>
      <p className={styles.subtext}>
        We sent a link to <strong style={{ color: "var(--color-text-primary)" }}>{email}</strong>.
        Click the link to verify your account and start building your bar.
      </p>

      <button
        type="button"
        className={styles.ghostBtn}
        onClick={handleResend}
        disabled={cooldown > 0}
        aria-live="polite"
      >
        {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
      </button>

      <button type="button" className={styles.primaryBtn} onClick={onDismiss}>
        Continue browsing →
      </button>

      <p className={styles.switchPrompt}>
        Wrong email?{" "}
        <button type="button" className={styles.switchLink} onClick={onChangeEmail}>
          Change it
        </button>
      </p>
    </div>
  );
}
