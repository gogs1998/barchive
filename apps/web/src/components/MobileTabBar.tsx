"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import styles from "./MobileTabBar.module.css";

interface MobileTabBarProps {
  active?: "home" | "cocktails" | "bar" | "ingredients" | "my-bar";
}

const BASE_TABS = [
  {
    key: "home",
    href: "/",
    label: "Home",
    icon: (
      <svg aria-hidden="true" width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M3 9.5L11 3l8 6.5V19a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M8 20v-8h6v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    key: "cocktails",
    href: "/cocktails",
    label: "Search",
    icon: (
      <svg aria-hidden="true" width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M15 15l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    key: "bar",
    href: "/bar",
    label: "Bar Mode",
    icon: (
      <svg aria-hidden="true" width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="2.5" y="2.5" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="12.5" y="2.5" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="2.5" y="12.5" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="12.5" y="12.5" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
    gold: true,
  },
  {
    key: "ingredients",
    href: "/ingredients",
    label: "Ingredients",
    icon: (
      <svg aria-hidden="true" width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 2C11 2 5 7 5 12a6 6 0 0012 0c0-5-6-10-6-10z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M11 14v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
] as const;

const MY_BAR_TAB = {
  key: "my-bar",
  href: "/my-bar",
  label: "My Bar",
  icon: (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M11 2C11 2 5 7 5 12a6 6 0 0012 0c0-5-6-10-6-10z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  gold: false,
} as const;

export function MobileTabBar({ active }: MobileTabBarProps) {
  const { user } = useAuth();

  const tabs = user
    ? [...BASE_TABS.filter((t) => t.key !== "ingredients"), MY_BAR_TAB]
    : [...BASE_TABS];

  return (
    <nav className={styles.tabBar} aria-label="Mobile navigation">
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        const isGold = "gold" in tab && tab.gold;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={`${styles.tab} ${isActive ? styles.tabActive : ""} ${isGold ? styles.tabGold : ""}`}
            aria-label={tab.label}
            aria-current={isActive ? "page" : undefined}
          >
            <span className={styles.tabIcon}>{tab.icon}</span>
            {isActive && <span className={styles.tabLabel}>{tab.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
