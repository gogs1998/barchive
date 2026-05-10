import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Barchive — The Bartender's Companion",
  description: "Search, browse, and mix cocktail recipes",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
