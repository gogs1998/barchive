"use client";

import styles from "./PasswordStrengthMeter.module.css";

interface Props {
  password: string;
}

export function getPasswordStrength(pw: string): 0 | 1 | 2 | 3 | 4 {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score as 0 | 1 | 2 | 3 | 4;
}

const LABELS = ["", "Weak", "Fair", "Good", "Strong"] as const;
const COLORS = ["", "#E05C5C", "#E08B3C", "#C89B5C", "#4CAF82"] as const;

export function PasswordStrengthMeter({ password }: Props) {
  const strength = getPasswordStrength(password);
  const label = LABELS[strength];

  if (!password) return null;

  return (
    <div className={styles.wrapper} aria-live="polite" aria-atomic="true">
      <div className={styles.segments} role="img" aria-label={`Password strength: ${label}`}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={styles.segment}
            style={{
              backgroundColor: i <= strength ? COLORS[strength] : "var(--color-border)",
            }}
          />
        ))}
      </div>
      {label && (
        <span className={styles.label} style={{ color: COLORS[strength] }}>
          {label}
        </span>
      )}
    </div>
  );
}
