import type { Metadata } from "next";

// Account page: rendered client-side and personal, so keep it out of search.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
