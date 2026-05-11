import Link from "next/link";
import styles from "./Header.module.css";

interface HeaderProps {
  /** Active nav item key */
  active?: "home" | "cocktails" | "ingredients" | "bar";
}

const NAV_ITEMS = [
  { href: "/", label: "Home", key: "home" },
  { href: "/cocktails", label: "Cocktails", key: "cocktails" },
  { href: "/ingredients", label: "Ingredients", key: "ingredients" },
  { href: "/bar", label: "Bar Mode", key: "bar" },
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
            {NAV_ITEMS.map(({ href, label, key }) => (
              <li key={key}>
                <Link
                  href={href}
                  className={`${styles.navLink} ${active === key ? styles.navLinkActive : ""}`}
                  aria-current={active === key ? "page" : undefined}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
