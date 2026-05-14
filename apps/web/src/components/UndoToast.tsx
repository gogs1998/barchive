"use client";

import styles from "./UndoToast.module.css";
import { useEffect, useState } from "react";

export interface UndoToastProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  durationMs?: number;
}

export function UndoToast({ message, onUndo, onDismiss, durationMs = 5000 }: UndoToastProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / durationMs) * 100);
      setProgress(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        onDismiss();
      }
    }, 50);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      onDismiss();
    }, durationMs);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [durationMs, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={styles.toast}
    >
      <div className={styles.progressBar} style={{ width: `${progress}%` }} />
      <div className={styles.content}>
        <span className={styles.message}>{message}</span>
        <button
          className={styles.undoBtn}
          onClick={() => { onUndo(); onDismiss(); }}
          aria-label="Undo action"
        >
          Undo
        </button>
      </div>
    </div>
  );
}
