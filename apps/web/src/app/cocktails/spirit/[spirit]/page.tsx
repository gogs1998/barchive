import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd, getSpiritHub, getSpiritHubs, spiritPath } from "@/lib/seo";
import styles from "../../directory.module.css";

interface Props {
  params: { spirit: string };
}

export async function generateStaticParams() {
  return getSpiritHubs().map((h) => ({ spirit: h.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const hub = getSpiritHub(params.spirit);
  if (!hub) return {};
  const n = hub.cocktails.length.toLocaleString("en-GB");
  return {
    title: `${hub.title}: ${n} Recipes — BarIQ`,
    description: `Every ${hub.category === "Mocktail" ? "alcohol-free" : hub.category.toLowerCase()} cocktail on BarIQ: ${n} recipes with measures, method and ingredient substitutions.`,
    alternates: { canonical: spiritPath(hub.category) },
  };
}

export default function SpiritHubPage({ params }: Props) {
  const hub = getSpiritHub(params.spirit);
  if (!hub) notFound();

  // Group A–Z so long hubs (1,000+ drinks) stay scannable.
  const groups = new Map<string, typeof hub.cocktails>();
  for (const c of hub.cocktails) {
    const first = c.name[0]?.toUpperCase() ?? "#";
    const letter = /[A-Z]/.test(first) ? first : "#";
    const list = groups.get(letter) ?? [];
    list.push(c);
    groups.set(letter, list);
  }
  const letters = [...groups.keys()].sort();

  return (
    <PageShell active="cocktails">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Cocktails", path: "/cocktails" },
          { name: hub.title, path: spiritPath(hub.category) },
        ])}
      />

      <Link href="/cocktails" className={styles.back}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        All Cocktails
      </Link>

      <h1 className={styles.title}>{hub.title}</h1>
      <p className={styles.intro}>
        {hub.cocktails.length.toLocaleString("en-GB")} recipes, A to Z.
      </p>

      {letters.map((letter) => (
        <section
          key={letter}
          className={styles.group}
          aria-labelledby={`letter-${letter}`}
        >
          <h2 id={`letter-${letter}`} className={styles.heading}>
            {letter}
          </h2>
          <ul className={styles.links} role="list">
            {groups.get(letter)!.map((c) => (
              <li key={c.slug}>
                <Link href={`/cocktails/${c.slug}`}>{c.name}</Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </PageShell>
  );
}
