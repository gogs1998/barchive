import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer} role="contentinfo">
      <div className={styles.inner}>
        <span className={styles.wordmark}>BarIQ</span>
        <span className={styles.copy}>
          The bartender&apos;s companion. Drink responsibly.
        </span>
      </div>
    </footer>
  );
}
