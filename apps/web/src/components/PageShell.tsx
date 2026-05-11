import { Header } from "./Header";
import { Footer } from "./Footer";
import { MobileTabBar } from "./MobileTabBar";
import styles from "./PageShell.module.css";

interface PageShellProps {
  children: React.ReactNode;
  active?: "home" | "cocktails" | "bar" | "ingredients";
}

export function PageShell({ children, active }: PageShellProps) {
  return (
    <div className={styles.shell}>
      <Header active={active} />
      <main className={styles.main} id="main-content" tabIndex={-1}>
        {children}
      </main>
      <Footer />
      <MobileTabBar active={active} />
    </div>
  );
}
