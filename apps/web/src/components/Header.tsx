import Link from "next/link";
import styles from "./Header.module.css";
import { HeaderSearch } from "./HeaderSearch";

interface HeaderProps {
  /** Active nav item key */
  active?: "home" | "cocktails" | "ingredients" | "bar";
}

const NAV_ITEMS = [
  { href: "/", label: "Home", key: "home", pill: false },
  { href: "/cocktails", label: "Cocktails", key: "cocktails", pill: false },
  { href: "/bar", label: "Bar Mode", key: "bar", pill: true },
  { href: "/ingredients", label: "Ingredients", key: "ingredients", pill: false },
] as const;

export function Header({ active }: HeaderProps) {
  return (
    <header className={styles.header} role="banner">
      <div className={styles.inner}>
        {/* Wordmark */}
        <Link href="/" className={styles.wordmark} aria-label="BarIQ — Home">
          BarIQ
        </Link>

        {/* Navigation */}
        <nav className={styles.nav} aria-label="Primary navigation">
          <ul className={styles.navList} role="list">
            {NAV_ITEMS.map(({ href, label, key, pill }) => (
              <li key={key}>
                <Link
                  href={href}
                  className={`${styles.navLink} ${active === key ? styles.navLinkActive : ""} ${pill ? styles.navLinkPill : ""}`}
                  aria-current={active === key ? "page" : undefined}
                >
                  {pill && (
                    <svg
                      aria-hidden="true"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className={styles.pillIcon}
                    >
                      <rect x="1.5" y="1.5" width="5" height="5" rx="0.5" stroke="#C89B5C" strokeWidth="1.25" />
                      <rect x="9.5" y="1.5" width="5" height="5" rx="0.5" stroke="#C89B5C" strokeWidth="1.25" />
                      <rect x="1.5" y="9.5" width="5" height="5" rx="0.5" stroke="#C89B5C" strokeWidth="1.25" />
                      <rect x="9.5" y="9.5" width="5" height="5" rx="0.5" stroke="#C89B5C" strokeWidth="1.25" />
                    </svg>
                  )}
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Persistent search — visible on all routes */}
        <HeaderSearch />
      </div>
    </header>
  );
}
