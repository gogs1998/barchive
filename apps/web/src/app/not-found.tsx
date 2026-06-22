import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import styles from "./not-found.module.css";

export const metadata = {
  title: "Page not found — BarIQ",
  description: "We couldn't find that page. Browse cocktails or head back home.",
};

export default function NotFound() {
  return (
    <PageShell>
      <div className={styles.root} role="alert">
        <p className={styles.code}>404</p>
        <h1 className={styles.title}>That page is off the menu</h1>
        <p className={styles.body}>
          The page you&rsquo;re looking for doesn&rsquo;t exist or may have moved.
          Let&rsquo;s pour you something else.
        </p>
        <div className={styles.actions}>
          <Link href="/" className={styles.primary}>
            Back to home
          </Link>
          <Link href="/cocktails" className={styles.secondary}>
            Browse cocktails
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
