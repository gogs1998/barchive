/**
 * Static curated ingredient substitution data for BarIQ.
 * Phase A — no backend required; lookup by canonical ingredient name.
 */

export interface SubstituteEntry {
  name: string;
  note: string;
  parity: "equal" | "close" | "different";
}

/**
 * Map of canonical ingredient name → array of substitutes.
 * Keys are lowercase-normalised for consistent lookup.
 */
export const SUBSTITUTIONS: Record<string, SubstituteEntry[]> = {
  Cointreau: [
    {
      name: "Triple Sec",
      note: "Use equal amount; slightly less refined",
      parity: "close",
    },
    {
      name: "Grand Marnier",
      note: "Add 0.25 oz cognac base; richer, slightly sweeter",
      parity: "close",
    },
    {
      name: "Orange Curaçao",
      note: "Use equal amount",
      parity: "close",
    },
  ],

  "Simple Syrup": [
    {
      name: "Agave Syrup",
      note: "Use 0.75x amount; sweeter and thinner",
      parity: "close",
    },
    {
      name: "Honey Syrup",
      note: "Use 0.75x amount; floral notes",
      parity: "different",
    },
    {
      name: "Demerara Syrup",
      note: "Use equal amount; richer, molasses notes",
      parity: "close",
    },
  ],

  "Dry Vermouth": [
    {
      name: "Lillet Blanc",
      note: "Use equal amount; slightly sweeter",
      parity: "close",
    },
    {
      name: "Dry Sherry",
      note: "Use equal amount; nuttier",
      parity: "different",
    },
  ],

  "Sweet Vermouth": [
    {
      name: "Carpano Antica (sweet vermouth)",
      note: "Premium upgrade; use equal amount",
      parity: "equal",
    },
    {
      name: "Port",
      note: "Use 0.75x amount; sweeter, less herbal",
      parity: "different",
    },
  ],

  Campari: [
    {
      name: "Aperol",
      note: "Less bitter, more orange; use equal amount",
      parity: "close",
    },
    {
      name: "Gran Classico",
      note: "Similar bitterness; use equal amount",
      parity: "equal",
    },
  ],

  "Angostura Bitters": [
    {
      name: "Peychaud's Bitters",
      note: "More floral, less spice; use equal dashes",
      parity: "close",
    },
    {
      name: "Orange Bitters",
      note: "Citrus-forward; changes character",
      parity: "different",
    },
  ],

  "Fresh Lime Juice": [
    {
      name: "Fresh Lemon Juice",
      note: "Use equal amount; brighter, less tart",
      parity: "close",
    },
  ],

  "Fresh Lemon Juice": [
    {
      name: "Fresh Lime Juice",
      note: "Use equal amount; more tart, tropical",
      parity: "close",
    },
  ],

  Bourbon: [
    {
      name: "Rye Whiskey",
      note: "Spicier, drier; use equal amount",
      parity: "close",
    },
    {
      name: "Irish Whiskey",
      note: "Lighter, smoother; changes character",
      parity: "different",
    },
  ],

  "Rye Whiskey": [
    {
      name: "Bourbon",
      note: "Sweeter, less spice; use equal amount",
      parity: "close",
    },
  ],

  Cognac: [
    {
      name: "Armagnac",
      note: "Earthier; use equal amount",
      parity: "close",
    },
    {
      name: "Bourbon",
      note: "Grain-based but works in many cognac drinks",
      parity: "different",
    },
  ],

  Gin: [
    {
      name: "Vodka",
      note: "Neutral; loses botanical character",
      parity: "different",
    },
    {
      name: "Genever",
      note: "Maltier, rounder; use equal amount",
      parity: "close",
    },
  ],

  "Kahlúa": [
    {
      name: "Tia Maria",
      note: "Lighter coffee flavour; use equal amount",
      parity: "close",
    },
    {
      name: "Cold brew concentrate + simple syrup",
      note: "1 oz cold brew + 0.5 oz simple syrup per 1 oz Kahlúa",
      parity: "close",
    },
  ],

  Orgeat: [
    {
      name: "Almond syrup",
      note: "Less complex; use equal amount",
      parity: "close",
    },
    {
      name: "Falernum",
      note: "Adds lime and clove; changes character",
      parity: "different",
    },
  ],

  Grenadine: [
    {
      name: "Pomegranate syrup",
      note: "Use equal amount",
      parity: "equal",
    },
    {
      name: "Raspberry syrup",
      note: "Different berry; use equal amount",
      parity: "close",
    },
  ],

  Champagne: [
    {
      name: "Prosecco",
      note: "Slightly sweeter, bigger bubbles; use equal amount",
      parity: "close",
    },
    {
      name: "Cava",
      note: "Drier and more structured; use equal amount",
      parity: "close",
    },
  ],

  "Egg White": [
    {
      name: "Aquafaba",
      note: "Chickpea water; use 1 oz per egg white; vegan",
      parity: "equal",
    },
  ],
};
