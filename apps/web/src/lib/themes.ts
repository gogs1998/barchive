/**
 * BarIQ theme definitions — mirrors the standalone app aesthetic.
 */

export interface Theme {
  name: string;
  bg: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentSoft: string;
  display: string;
  ui: string;
  mono: string;
}

export const THEMES: Record<string, Theme> = {
  dark: {
    name: "Dark",
    bg: "#0E0D0B",
    surface: "#17140F",
    border: "rgba(245,238,224,0.09)",
    text: "#F5EEE0",
    muted: "#8B867E",
    accent: "#C89B5C",
    accentSoft: "rgba(200,155,92,0.12)",
    display: '"Instrument Serif", Georgia, serif',
    ui: 'Geist, "Inter", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
  },
  cream: {
    name: "Cream",
    bg: "#F5EFE2",
    surface: "#EDE5D3",
    border: "rgba(40,30,20,0.12)",
    text: "#1E1A14",
    muted: "#807868",
    accent: "#8B4513",
    accentSoft: "rgba(139,69,19,0.1)",
    display: '"Instrument Serif", Georgia, serif',
    ui: 'Geist, "Inter", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
  },
  navy: {
    name: "Navy",
    bg: "#0B1220",
    surface: "#131D30",
    border: "rgba(180,200,230,0.1)",
    text: "#E8ECF5",
    muted: "#7A85A0",
    accent: "#7FB3E8",
    accentSoft: "rgba(127,179,232,0.12)",
    display: '"Instrument Serif", Georgia, serif',
    ui: 'Geist, "Inter", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
  },
};

export const DEFAULT_THEME: Theme = THEMES.dark;

export type ThemeKey = keyof typeof THEMES;
