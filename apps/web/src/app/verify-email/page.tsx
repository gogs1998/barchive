"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import styles from "./page.module.css";

type State = "verifying" | "success" | "expired";

function VerifyEmailContent() {
  const params = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>("verifying");

  useEffect(() => {
    if (!token) { setState("expired"); return; }
    // TODO: call real verify-email API endpoint
    const timer = setTimeout(() => {
      // Stub: token "expired" simulates an expired link; any other value = success
      setState(token === "expired" ? "expired" : "success");
    }, 1200);
    return () => clearTimeout(timer);
  }, [token]);

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        {state === "verifying" && (
          <>
            <div className={styles.spinner} aria-hidden="true" />
            <p className={styles.message}>Verifying your email…</p>
          </>
        )}
        {state === "success" && (
          <>
            <div className={styles.icon} aria-hidden="true">🍸</div>
            <h1 className={styles.heading}>Email verified!</h1>
            <p className={styles.message}>Your bar is ready. Start adding ingredients.</p>
            <Link href="/my-bar" className={styles.cta}>Go to My Bar</Link>
          </>
        )}
        {state === "expired" && (
          <>
            <div className={styles.icon} aria-hidden="true">⏰</div>
            <h1 className={styles.heading}>This link has expired</h1>
            <p className={styles.message}>Verification links are valid for 24 hours. Request a new one below.</p>
            <Link href="/?verify=resend" className={styles.cta}>Request new link</Link>
          </>
        )}
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className={styles.main}><div className={styles.card}><div className={styles.spinner} /></div></main>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
