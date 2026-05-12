"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth, type AuthView } from "@/lib/auth-context";
import { LoginForm, RegisterForm, ForgotPasswordForm, ResetSentView } from "./AuthForm";
import { EmailVerifyView } from "./EmailVerifyView";
import styles from "./AuthModal.module.css";

export function AuthModal() {
  const { modalOpen, modalView, setModalView, closeAuthModal, openAuthModal, pendingEmail, setPendingEmail } = useAuth();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchParams = useSearchParams();

  // Auto-open when redirected from middleware with ?auth=login
  useEffect(() => {
    const authParam = searchParams.get("auth");
    if (authParam === "login" || authParam === "register") {
      openAuthModal(authParam as AuthView);
    }
  }, [searchParams, openAuthModal]);

  // Open/close the native dialog
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (modalOpen && !dialog.open) {
      dialog.showModal();
    } else if (!modalOpen && dialog.open) {
      dialog.close();
    }
  }, [modalOpen]);

  // Escape key handled natively by <dialog>; also sync state
  const handleClose = useCallback(() => {
    closeAuthModal();
  }, [closeAuthModal]);

  // Focus trap: handled by native <dialog> showModal()
  // Backdrop click closes modal
  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) closeAuthModal();
  }, [closeAuthModal]);

  const switchView = (view: AuthView) => setModalView(view);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="auth-modal-title"
      aria-modal="true"
      onClose={handleClose}
      onClick={handleBackdropClick}
    >
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button
          type="button"
          className={styles.closeBtn}
          onClick={closeAuthModal}
          aria-label="Close"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Wordmark */}
        <p className={styles.wordmark} aria-hidden="true">BarIQ</p>

        {/* Swappable content */}
        {modalView === "login" && (
          <LoginForm
            onSuccess={closeAuthModal}
            onForgotPassword={() => switchView("forgot-password")}
            onRegister={() => switchView("register")}
          />
        )}
        {modalView === "register" && (
          <RegisterForm
            onSuccess={(email) => {
              setPendingEmail(email);
              switchView("verify-email");
            }}
            onLogin={() => switchView("login")}
          />
        )}
        {modalView === "verify-email" && (
          <EmailVerifyView
            email={pendingEmail}
            onDismiss={closeAuthModal}
            onChangeEmail={() => switchView("register")}
          />
        )}
        {modalView === "forgot-password" && (
          <ForgotPasswordForm
            onSent={(email) => {
              setPendingEmail(email);
              switchView("reset-sent");
            }}
            onBack={() => switchView("login")}
          />
        )}
        {modalView === "reset-sent" && (
          <ResetSentView
            email={pendingEmail}
            onBack={() => switchView("login")}
          />
        )}
      </div>
    </dialog>
  );
}
