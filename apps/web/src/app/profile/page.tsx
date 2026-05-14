"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { PageShell } from "@/components/PageShell";
import styles from "./page.module.css";

export default function ProfilePage() {
  const { user, loading, openAuthModal, logout } = useAuth();
  const router = useRouter();

  // Client-side guard in case middleware cookie check isn't conclusive
  useEffect(() => {
    if (!loading && !user) {
      openAuthModal("login");
    }
  }, [loading, user, openAuthModal]);

  if (loading) {
    return (
      <PageShell>
        <main className={styles.page}>
          <div className={styles.skeleton} aria-hidden="true" />
        </main>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <main className={styles.page}>
          <p className={styles.authPrompt}>Sign in to view your profile.</p>
        </main>
      </PageShell>
    );
  }

  const initials = user.displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <PageShell>
      <main className={styles.page}>
        <div className={styles.card}>
          {/* Avatar */}
          <div className={styles.avatar} aria-hidden="true">
            {initials}
          </div>

          <h1 className={styles.displayName}>{user.displayName}</h1>
          <p className={styles.email}>{user.email}</p>

          {!user.emailVerified && (
            <p className={styles.unverifiedBadge} role="status">
              Email not verified — check your inbox
            </p>
          )}

          {/* Actions */}
          <nav className={styles.actions} aria-label="Profile actions">
            <a href="/?auth=forgot-password" className={styles.actionLink}>
              Change password
            </a>
            <button
              type="button"
              className={styles.logoutBtn}
              onClick={handleLogout}
            >
              Sign out
            </button>
          </nav>
        </div>
      </main>
    </PageShell>
  );
}
