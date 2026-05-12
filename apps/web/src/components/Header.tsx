"use client";

import Link from "next/link";
import styles from "./Header.module.css";
import { HeaderSearch } from "./HeaderSearch";
import { useAuth } from "@/lib/auth-context";

interface HeaderProps {
  active?: "home" | "cocktails" | "ingredients" | "bar" | "my-bar";
}

const BASE_NAV_ITEMS = [
  { href: "/", label: "Home", key: "home", pill: false },
  { href: "/cocktails", label: "Cocktails", key: "cocktails", pill: false },
  { href: "/bar", label: "Bar Mode", key: "bar", pill: true },
  { href: "/ingredients", label: "Ingredients", key: "ingredients", pill: false },
] as const;

export function Header({ active }: HeaderProps) {
  const { user, openAuthModal, logout } = useAuth();

  const navItems = user
    ? [
        { href: "/", label: "Home", key: "home", pill: false },
        { href: "/cocktails", label: "Cocktails", key: "cocktails", pill: false },
        { href: "/bar", label: "Bar Mode", key: "bar", pill: true },
        { href: "/my-bar", label: "My Bar ★", key: "my-bar", pill: false },
      ]
    : [...BASE_NAV_ITEMS];

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
            {navItems.map(({ href, label, key, pill }) => (
              <li key={key}>
                <Link
                  href={href}
                  className={`${styles.navLink} ${active === key ? styles.navLinkActive : ""} ${pill ? styles.navLinkPill : ""}`}
                  aria-current={active === key ? "page" : undefined}
                >
                  {pill && (
                    <svg
                      aria-hidden="true"
                      width="16" height="16" viewBox="0 0 16 16" fill="none"
                      className={styles.pillIcon}
                    >
                      <rect x="1.5" y="1.5" width="5" height="5" rx="0.5" stroke="#C89B5C" strokeWidth="1.25"/>
                      <rect x="9.5" y="1.5" width="5" height="5" rx="0.5" stroke="#C89B5C" strokeWidth="1.25"/>
                      <rect x="1.5" y="9.5" width="5" height="5" rx="0.5" stroke="#C89B5C" strokeWidth="1.25"/>
                      <rect x="9.5" y="9.5" width="5" height="5" rx="0.5" stroke="#C89B5C" strokeWidth="1.25"/>
                    </svg>
                  )}
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Auth controls + search */}
        <div className={styles.rightControls}>
          <HeaderSearch />
          {user ? (
            <div className={styles.userMenu}>
              <span className={styles.userName}>{user.displayName}</span>
              <button
                type="button"
                className={styles.signOutBtn}
                onClick={logout}
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={styles.signInBtn}
              onClick={() => openAuthModal("login")}
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
