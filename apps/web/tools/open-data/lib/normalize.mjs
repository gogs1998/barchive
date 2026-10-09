/**
 * Turn an IBA ingredient line into the bar vocabulary used by
 * onboarding-ingredients.ts (exact names, so "What can I make?" matches).
 * Amounts stay in the units the app already parses: ml, oz, tsp, tbsp, dash.
 */

import { parseAmount } from "./dietary.mjs";

export function nameKey(s) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’‘]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Published wording → starter / curated vocabulary. */
const ALIASES = {
  gin: "Gin",
  "dry gin": "Gin",
  "london dry gin": "Gin",
  "old tom gin": "Old Tom Gin",
  vodka: "Vodka",
  "smirnoff vodka": "Vodka",
  "vodka citron": "Citrus Vodka",
  "vodka vanilla": "Vanilla Vodka",
  "vanilla vodka": "Vanilla Vodka",
  "white rum": "Light White Rum",
  "white cuban ron": "Light White Rum",
  "cuban rum": "Light White Rum",
  rum: "Light White Rum",
  "jamaican rum": "Aged Rum (6-10yr)",
  "jamaican dark rum": "Aged Rum (6-10yr)",
  "amber jamaican rum": "Aged Rum (6-10yr)",
  "gold jamaican rum": "Aged Rum (6-10yr)",
  "gold puerto rican rum": "Aged Rum (6-10yr)",
  "demerara rum": "Aged Rum (6-10yr)",
  "aged rum": "Aged Rum (6-10yr)",
  "blended aged rum": "Aged Rum (6-10yr)",
  "dark rum": "Aged Rum (6-10yr)",
  "blackstrap rum": "Blackstrap Rum",
  "goslings rum": "Aged Rum (6-10yr)",
  "ron profundo havana club": "Aged Rum (6-10yr)",
  "ron smoky havana club": "Smoked Rum",
  "jamaica overproof white rum": "Overproof Rum",
  "martinique molasses rhum": "Aged Rum (6-10yr)",
  "rhum martinique agricole": "Agricole Rhum",
  cachaca: "Cachaça",
  "cuban aguardiente": "Aguardiente",
  tequila: "Blanco Tequila",
  "tequila 100 agave": "Blanco Tequila",
  "100 agave tequila": "Blanco Tequila",
  mezcal: "Mezcal",
  "espadin mezcal": "Mezcal",
  "bourbon whiskey": "Bourbon Whiskey",
  bourbon: "Bourbon Whiskey",
  "rye whiskey": "Rye Whiskey 50% Abv",
  rye: "Rye Whiskey 50% Abv",
  "bourbon or rye whiskey": "Bourbon Whiskey",
  "rye whiskey or bourbon": "Rye Whiskey 50% Abv",
  "scotch whisky": "Scotch Whisky",
  "blended scotch whisky": "Scotch Whisky",
  "lagavulin 16y": "Islay Scotch Whisky",
  "irish whiskey": "Irish Whiskey",
  cognac: "Cognac (Brandy)",
  brandy: "Cognac (Brandy)",
  "cognac or brandy": "Cognac (Brandy)",
  calvados: "Calvados",
  pisco: "Pisco",
  "white smooth grappa": "Grappa",
  grappa: "Grappa",
  absinthe: "Absinthe",
  pernod: "Absinthe",
  "bitter campari": "Red Bitter Liqueur",
  campari: "Red Bitter Liqueur",
  aperol: "Aperol",
  "sweet red vermouth": "Rosso/Sweet Vermouth",
  "sweet vermouth": "Rosso/Sweet Vermouth",
  "sweet vermouth cinzano rosso": "Rosso/Sweet Vermouth",
  "dry vermouth": "Dry Vermouth",
  "lillet blanc": "Lillet Blanc",
  "triple sec": "Triple Sec",
  cointreau: "Triple Sec",
  "orange curacao": "Orange Curaçao",
  curacao: "Orange Curaçao",
  "maraschino luxardo": "Maraschino Liqueur",
  maraschino: "Maraschino Liqueur",
  "green chartreuse": "Chartreuse Green",
  "yellow chartreuse": "Chartreuse Yellow",
  "grand marnier": "Grand Marnier",
  amaretto: "Amaretto Liqueur",
  "licor amaretto": "Amaretto Liqueur",
  "kahlua": "Coffee Liqueur",
  "coffee liqueur": "Coffee Liqueur",
  "apricot brandy": "Apricot Liqueur",
  "creme de cassis": "Crème de Cassis",
  "creme de mure": "Crème de Mûre",
  "creme de cacao white": "Crème de Cacao (white)",
  "creme de cacao brown": "Crème de Cacao (dark)",
  "creme de cacao dark": "Crème de Cacao (dark)",
  "creme de menthe green": "Crème de Menthe (green)",
  "white creme de menthe": "Crème de Menthe (white)",
  "creme de menthe white": "Crème de Menthe (white)",
  "creme de violette": "Crème de Violette",
  benedictine: "Bénédictine",
  "dom benedictine": "Bénédictine",
  drambuie: "Drambuie",
  falernum: "Falernum",
  fernet: "Fernet-Branca",
  "fernet branca": "Fernet-Branca",
  "licor frangelico": "Frangelico",
  frangelico: "Frangelico",
  "cherry brandy luxardo": "Cherry Liqueur",
  "cherry sangue morlacco": "Cherry Liqueur",
  "peach schnapps": "Peach Schnapps",
  "peach brandy": "Peach Schnapps",
  "passion fruit liqueur": "Passionfruit Liqueur",
  "raspberry liqueur": "Raspberry Liqueur",
  "elderflower cordial": "Elderflower Cordial",
  cynar: "Cynar",
  "amaro nonino": "Amaro Nonino",
  "allspice saint elizabeth": "Allspice Dram",
  "honey syrup": "Honey And Water Syrup",
  "honey mix": "Honey And Water Syrup",
  "monin honey syrup": "Honey And Water Syrup",
  "raw honey": "Honey",
  "simple syrup": "Sugar Syrup (2:1)",
  "sugar syrup": "Sugar Syrup (2:1)",
  "demerara sugar syrup": "Demerara Syrup",
  "agave nectar": "Agave Syrup",
  "orgeat syrup": "Orgeat Syrup",
  "orgeat syrup almond": "Orgeat Syrup",
  "grenadine syrup": "Grenadine Syrup",
  grenadine: "Grenadine Syrup",
  "passion fruit syrup": "Passionfruit Syrup",
  "raspberry syrup": "Raspberry Syrup",
  "sugar cane juice": "Sugar Cane Juice",
  "donns mix": "Donn's Mix",
  "white cane sugar": "Caster Sugar",
  sugar: "Caster Sugar",
  "powdered sugar": "Caster Sugar",
  "superfine sugar": "Caster Sugar",
  "superfine sugar or granulated": "Caster Sugar",
  "vanilla sugar": "Vanilla Sugar",
  "sugar cube": "Sugar Cube",
  water: "Water",
  "plain water": "Water",
  "soda water": "Soda (Club Soda) Water",
  "ginger beer": "Ginger Beer",
  "ginger ale": "Ginger Ale",
  cola: "Cola",
  prosecco: "Prosecco",
  champagne: "Champagne",
  "brut champagne or prosecco": "Champagne",
  "sparkling wine": "Sparkling Wine",
  "chilled champagne": "Champagne",
  "cranberry juice": "Cranberry Juice",
  "pineapple juice": "Pineapple Juice",
  "fresh pineapple juice": "Pineapple Juice",
  "orange juice": "Orange Juice",
  "fresh orange juice": "Orange Juice",
  "freshly squeezed orange juice": "Orange Juice",
  "grapefruit juice": "Pink Grapefruit Juice",
  "pink grapefruit soda": "Pink Grapefruit Soda",
  "tomato juice": "Tomato Juice",
  "lemon juice": "Lemon Juice",
  "fresh lemon juice": "Lemon Juice",
  "fresh squeezed lemon juice": "Lemon Juice",
  "freshly squeezed lemon juice": "Lemon Juice",
  "lime juice": "Lime Juice",
  "fresh lime juice": "Lime Juice",
  "fresh squeezed lime juice": "Lime Juice",
  "freshly squeezed lime juice": "Lime Juice",
  "fresh lime": "Lime Juice",
  cream: "Whipping Cream",
  "fresh cream": "Whipping Cream",
  "fresh cream chilled": "Whipping Cream",
  "egg white": "Egg White (Pasteurised)",
  "raw whole egg white": "Egg White (Pasteurised)",
  "egg yolk": "Egg Yolk",
  "mint leaves": "Mint Leaves",
  "mint sprigs": "Mint Leaves",
  "fresh mint sprigs": "Mint Leaves",
  "italian basil leaves": "Basil Leaves",
  "basil leaves": "Basil Leaves",
  "fresh ginger": "Fresh Ginger",
  "gengibre slice": "Fresh Ginger",
  ginger: "Fresh Ginger",
  "red chili pepper": "Red Chili",
  "red chili": "Red Chili",
  "pineapple chunks": "Pineapple",
  pineapple: "Pineapple",
  "lemon wheel": "Lemon Wheel",
  "orange wheel": "Orange Wheel",
  "lime cut into small wedges": "Lime Wedges",
  "lime wedges": "Lime Wedges",
  cloves: "Cloves",
  salt: "Salt",
  "worcestershire sauce": "Worcestershire Sauce",
  tabasco: "Hot Sauce",
  "celery salt": "Celery Salt",
  pepper: "Black Pepper",
  "angostura bitters": "Aromatic Bitters",
  angostura: "Aromatic Bitters",
  "aromatic bitters": "Aromatic Bitters",
  "orange bitters": "Orange Bitters",
  "peychauds bitters": "Peychaud's Bitters",
  "orange flower water": "Orange Flower Water",
  "vanilla extract": "Vanilla Extract",
  espresso: "Espresso",
  "strong espresso": "Espresso",
  "hot coffee": "Hot Coffee",
  coffee: "Hot Coffee",
  "red wine": "Dry Red Wine",
  "dry red wine": "Dry Red Wine",
  "red tawny port wine": "Tawny Port",
  "tawny port": "Tawny Port",
  "dry white wine": "Dry White Wine",
  "amontillado sherry": "Amontillado Sherry",
  "palo cortado": "Palo Cortado",
  "coconut cream": "Coconut Cream",
  "white peach puree": "White Peach Purée",
  "passion fruit puree": "Passionfruit Purée",
  "chamomile cordial": "Chamomile Cordial",
  "maraschino cherry": "Maraschino Cherry",
};

const OR_NOTES = {
  "bourbon or rye whiskey": "The published spec allows rye whiskey in place of bourbon.",
  "rye whiskey or bourbon": "The published spec allows bourbon in place of rye.",
  "cognac or brandy": "The published spec allows brandy in place of cognac.",
  "brut champagne or prosecco": "The published spec allows prosecco in place of champagne.",
  pernod: "Published as Pernod. Mapped to Absinthe, the matching anise bottle in the bar list.",
  "goslings rum": "Published as Gosling's rum. Mapped to Aged Rum (6-10yr) so the starter bar matches. The IBA name of the drink is a Gosling's trademark.",
  "bitter campari": "Published as Campari. Mapped to Red Bitter Liqueur, the starter-bar name.",
  campari: "Published as Campari. Mapped to Red Bitter Liqueur, the starter-bar name.",
  cointreau: "Published as Cointreau. Mapped to Triple Sec, the starter-bar name.",
  "simple syrup": "Published as simple syrup, usually 1:1. Named Sugar Syrup (2:1) so the starter bar matches.",
  "sugar syrup": "Published as sugar syrup. Named Sugar Syrup (2:1) so the starter bar matches.",
  "honey syrup": "Published as honey syrup. Named Honey And Water Syrup so the starter bar matches.",
  "honey mix": "Published as honey mix. Named Honey And Water Syrup so the starter bar matches.",
  "monin honey syrup": "Published as Monin honey syrup. Named Honey And Water Syrup.",
  "grapefruit juice": "Published as grapefruit juice. Named Pink Grapefruit Juice, the starter-bar juice.",
  "rye whiskey": "Named Rye Whiskey 50% Abv so the starter bar matches. ABV maths uses 50% for that bottle.",
  "lagavulin 16y": "Published as Lagavulin 16. Named Islay Scotch Whisky.",
  "kahlua": "Published as Kahlúa. Mapped to Coffee Liqueur.",
  "creme de cacao brown": "Published as brown crème de cacao.",
  "creme de cacao white": "Published as white crème de cacao.",
  "cherry sangue morlacco": "Published as Cherry Sangue Morlacco. Named Cherry Liqueur.",
  "allspice saint elizabeth": "Published as Allspice (St. Elizabeth). Named Allspice Dram.",
  "martinique molasses rhum": "Published as Martinique molasses rum, which the IBA note says is not agricole.",
  "ron profundo havana club": "Published as Ron Profundo Havana Club. Named Aged Rum (6-10yr).",
  "ron smoky havana club": "Published as Ron Smoky Havana Club. Kept as Smoked Rum.",
  "tequila 100 agave": "Published as 100% agave tequila. Named Blanco Tequila.",
  "100 agave tequila": "Published as 100% agave tequila. Named Blanco Tequila.",
  tequila: "Published as tequila. Named Blanco Tequila.",
  "white cuban ron": "Published as white Cuban rum. Named Light White Rum.",
  "fresh lime": "A measured millilitre amount of fresh lime was read as lime juice.",
};

function roundQty(n) {
  return Math.round(n * 1000) / 1000;
}

function measured(qty, unit) {
  const amount = `${qty} ${unit}`;
  const parsed = parseAmount(amount);
  return { amount, qty: parsed.qty, unit: parsed.unit };
}

function counted(amount, name, notes, raw) {
  return { name, amount, qty: null, unit: null, notes, raw, ml: 0 };
}

function fromMeasure(qty, unit, name, notes, raw) {
  const m = measured(qty, unit);
  return { name, ...m, notes, raw, ml: toMl(m.qty, m.unit) };
}

export function toMl(qty, unit) {
  if (qty == null) return 0;
  if (unit === "ml") return qty;
  if (unit === "cl") return qty * 10;
  if (unit === "oz") return qty * 29.5735;
  if (unit === "tsp") return qty * 5;
  if (unit === "tbsp") return qty * 15;
  if (unit === "dash") return qty;
  return 0;
}

function canonical(rawName, notes) {
  const key = nameKey(rawName);
  const name = ALIASES[key];
  if (!name) return { name: null, key, notes };
  const extra = OR_NOTES[key];
  if (extra && !notes.includes(extra)) notes = notes.concat(extra);
  return { name, key, notes };
}

function withName(qty, unit, rawName, notes, raw, amountOverride) {
  const c = canonical(rawName, notes);
  if (!c.name) {
    return { error: `unmapped ingredient "${rawName}"`, key: c.key, raw };
  }
  if (amountOverride) {
    return { name: c.name, amount: amountOverride, qty: null, unit: null, notes: c.notes, raw, ml: 0 };
  }
  if (unit == null) {
    return { name: c.name, amount: String(qty), qty: null, unit: null, notes: c.notes, raw, ml: 0 };
  }
  const row = fromMeasure(qty, unit, c.name, c.notes, raw);
  row.notes = c.notes;
  return row;
}

/** Split a CMS glitch where two measures were jammed into one <li>. */
export function splitGlued(line) {
  return line
    .split(/(?<=[A-Za-z])(?=\d+(?:[./]\d+)?\s*ml\b)/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

function prepName(input) {
  let s = input.replace(/\*/g, " ").replace(/\s+/g, " ").trim();
  const notes = [];
  let shade = "";
  s = s.replace(/\(([^)]*)\)/g, (_, inner) => {
    const n = inner.trim();
    if (/optional/i.test(n)) notes.push("optional");
    if (/brown|dark/i.test(n)) shade = "dark";
    else if (/white/i.test(n)) shade = "white";
    else if (/green/i.test(n)) shade = "green";
    else if (!/optional/i.test(n)) notes.push(n);
    return " ";
  });
  s = s.replace(/\boptional\b/gi, " ").replace(/\s+/g, " ").trim();
  s = s.replace(/to serve on the side/i, () => {
    notes.push("serve on the side");
    return " ";
  }).replace(/\s+/g, " ").trim();
  if (shade) s = `${s} ${shade}`;
  return { s, notes };
}

function fractionQty(num, den) {
  return roundQty(Number(num) / Number(den));
}

/**
 * Parse one published ingredient line into one or more normalised ingredients.
 * Returns { items, errors }.
 */
export function parseIngredientLine(rawLine) {
  const errors = [];
  const items = [];
  const raw = rawLine.trim();

  if (/^tabasco,/i.test(raw)) {
    for (const part of ["Hot Sauce", "Celery Salt", "Black Pepper"]) {
      items.push({ name: part, amount: "to taste", qty: null, unit: null, notes: ["published as one to-taste line"], raw, ml: 0 });
    }
    return { items, errors };
  }

  const { s, notes } = prepName(raw);
  let m;

  if ((m = /^(?:top(?:\s+up)?|fill(?:\s+up)?)\s+(?:with\s+)?(.+)$/i.exec(s))) {
    const row = withName(null, null, m[1], notes, raw, "top");
    if (row.error) errors.push(row.error);
    else {
      row.ml = 60;
      row.role = "top";
      items.push(row);
    }
    return { items, errors };
  }
  if ((m = /^(?:a\s+)?splash\s+of\s+(.+)$/i.exec(s))) {
    const row = withName(null, null, m[1], notes, raw, "splash");
    if (row.error) errors.push(row.error);
    else {
      row.ml = 15;
      row.role = "top";
      items.push(row);
    }
    return { items, errors };
  }
  if ((m = /^(?:a\s+)?pinch\s+of\s+(.+)$/i.exec(s))) {
    const row = withName(null, null, m[1], notes, raw, "pinch");
    if (row.error) errors.push(row.error);
    else items.push(row);
    return { items, errors };
  }
  if ((m = /^(?:a\s+)?dash\s+of\s+(.+)$/i.exec(s))) {
    const row = withName(1, "dash", m[1], notes, raw);
    if (row.error) errors.push(row.error);
    else items.push(row);
    return { items, errors };
  }
  if ((m = /^(?:a\s+)?few\s+(dashes|drops)\s+(?:of\s+)?(.+)$/i.exec(s))) {
    if (/dash/i.test(m[1])) {
      const row = withName(2, "dash", m[2], notes.concat("published as a few dashes"), raw);
      if (row.error) errors.push(row.error);
      else items.push(row);
    } else {
      const row = withName(null, null, m[2], notes.concat("published as a few drops"), raw, "few drops");
      if (row.error) errors.push(row.error);
      else items.push(row);
    }
    return { items, errors };
  }
  if ((m = /^(\d+)\s+to\s+(\d+)\s+pcs?\s+(.+)$/i.exec(s))) {
    const row = withName(null, null, m[3], notes.concat(`published as ${m[1]} to ${m[2]}`), raw, `${m[2]} pieces`);
    if (row.error) errors.push(row.error);
    else items.push(row);
    return { items, errors };
  }
  if ((m = /^(\d+)\s+(?:thin\s+)?slices?\s+(.+)$/i.exec(s))) {
    const row = withName(null, null, m[2], notes, raw, `${m[1]} slices`);
    if (row.error) errors.push(row.error);
    else items.push(row);
    return { items, errors };
  }
  if ((m = /^(\d+)\s*-\s*(\d+)\s+(.+)$/i.exec(s))) {
    const row = withName(null, null, "Fresh Ginger", notes.concat(`published as ${raw}`), raw, `${m[2]} slices`);
    if (/chili|chilli/i.test(m[3])) row.name = "Red Chili";
    if (row.error) errors.push(row.error);
    else items.push(row);
    return { items, errors };
  }

  // European count range: "5/6 Mint leaves", "6/8 pcs Mint Leaves".
  if ((m = /^(\d+)\s*\/\s*(\d+)\s+(?:pcs?\s+)?(.+)$/i.exec(s))) {
    const rest = m[3];
    const unitLead = /^(bar\s*spoons?|teaspoons?|tablespoons?|tsp|tbsp|oz|ml|dash(?:es)?|drop(?:s)?)\b/i.test(rest);
    if (!unitLead && Number(m[2]) > 4) {
      const row = withName(null, null, rest, notes.concat(`published as ${m[1]}/${m[2]}`), raw, `${m[2]} leaves`);
      if (row.error) errors.push(row.error);
      else items.push(row);
      return { items, errors };
    }
    if (!unitLead) {
      const label = /wheel/i.test(rest) ? "wheel" : "piece";
      const row = withName(null, null, rest, notes, raw, `${m[1]}/${m[2]} ${label}`);
      if (row.error) errors.push(row.error);
      else items.push(row);
      return { items, errors };
    }
  }

  if ((m = /^(\d+)\s*\/\s*(\d+)\s+(bar\s*spoons?|teaspoons?|tablespoons?|tsp|tbsp|oz|ml)\s+(?:of\s+)?(.+)$/i.exec(s))) {
    const qty = fractionQty(m[1], m[2]);
    const unitWord = m[3].toLowerCase();
    let unit = "tsp";
    let note = null;
    if (/bar/.test(unitWord)) note = "1 bar spoon read as 1 tsp (5 ml)";
    else if (/table/.test(unitWord)) unit = "tbsp";
    else if (unitWord === "oz" || unitWord === "ml") unit = unitWord;
    const row = withName(qty, unit, m[4], note ? notes.concat(note) : notes, raw);
    if (row.error) errors.push(row.error);
    else items.push(row);
    return { items, errors };
  }

  if ((m = /^(\d+(?:\.\d+)?)\s*(bar\s*spoons?|tablespoons?|teaspoons?|tsp|tbsp|dash(?:es)?|drop(?:s)?|ml|cl|oz|pcs?|pieces?)\s+(?:of\s+)?(.+)$/i.exec(s))) {
    const qty = Number(m[1]);
    const unitWord = m[2].toLowerCase();
    const rest = m[3];
    if (/^drop(?:s)?$/.test(unitWord)) {
      const row = withName(null, null, rest, notes, raw, `${qty} drops`);
      if (row.error) errors.push(row.error);
      else items.push(row);
      return { items, errors };
    }
    if (/^pcs?$|^pieces?$/.test(unitWord)) {
      const label = /sprig/i.test(rest) ? (qty === 1 ? "sprig" : "sprigs") : /slice/i.test(rest) ? (qty === 1 ? "slice" : "slices") : /leaf|leaves/i.test(rest) ? (qty === 1 ? "leaf" : "leaves") : (qty === 1 ? "piece" : "pieces");
      const row = withName(null, null, rest, notes, raw, `${qty} ${label}`);
      if (row.error) errors.push(row.error);
      else items.push(row);
      return { items, errors };
    }
    let unit = unitWord;
    const rowNotes = notes.slice();
    if (/bar/.test(unitWord)) {
      unit = "tsp";
      rowNotes.push("1 bar spoon read as 1 tsp (5 ml)");
    } else if (/tablespoon/.test(unitWord)) unit = "tbsp";
    else if (/teaspoon/.test(unitWord)) unit = "tsp";
    else if (/dash/.test(unitWord)) unit = "dash";
    const row = withName(qty, unit, rest, rowNotes, raw);
    if (row.error) errors.push(row.error);
    else items.push(row);
    return { items, errors };
  }

  if ((m = /^(\d+(?:\.\d+)?)\s+(.+)$/i.exec(s))) {
    const qty = Number(m[1]);
    const rest = m[2];
    if (/sugar cube/i.test(rest)) {
      const row = withName(null, null, "Sugar Cube", notes, raw, `${qty} cube`);
      if (row.error) errors.push(row.error);
      else items.push(row);
      return { items, errors };
    }
    if (/wheel$/i.test(rest)) {
      const row = withName(null, null, rest, notes, raw, `${qty} wheel`);
      if (row.error) errors.push(row.error);
      else items.push(row);
      return { items, errors };
    }
    if (/^lime cut/i.test(rest)) {
      const row = withName(null, null, rest, notes, raw, `${qty} lime`);
      if (row.error) errors.push(row.error);
      else items.push(row);
      return { items, errors };
    }
    if (/egg white/i.test(rest)) {
      const row = withName(null, null, "Egg White", notes, raw, `${qty} white`);
      if (row.error) errors.push(row.error);
      else items.push(row);
      return { items, errors };
    }
    if (/espresso/i.test(rest)) {
      const row = withName(30, "ml", "Espresso", notes.concat("published as 1 strong espresso; counted as 30 ml"), raw);
      if (row.error) errors.push(row.error);
      else items.push(row);
      return { items, errors };
    }
    // A bare number of 5 or more in an IBA list is almost always millilitres with the unit dropped.
    if (qty >= 5) {
      const row = withName(qty, "ml", rest, notes.concat("millilitres assumed; the page omitted the unit"), raw);
      if (row.error) errors.push(row.error);
      else items.push(row);
      return { items, errors };
    }
    const row = withName(null, null, rest, notes, raw, String(qty));
    if (row.error) errors.push(row.error);
    else items.push(row);
    return { items, errors };
  }

  // Bare "Soda Water" and similar: a top-up with no measure.
  const bare = withName(null, null, s, notes, raw, "top");
  if (bare.error) errors.push(bare.error);
  else {
    bare.ml = 60;
    bare.role = "top";
    items.push(bare);
  }
  return { items, errors };
}

export function parseIngredientList(lines) {
  const items = [];
  const errors = [];
  const notes = [];
  for (const line of lines) {
    const parts = splitGlued(line);
    if (parts.length > 1) notes.push(`Split a joined line into: ${parts.join(" | ")}`);
    for (const part of parts) {
      const parsed = parseIngredientLine(part);
      errors.push(...parsed.errors);
      for (const item of parsed.items) {
        items.push(item);
        for (const n of item.notes || []) {
          if (!notes.includes(n)) notes.push(n);
        }
      }
    }
  }

  // Donn's Mix is defined on the IBA page as 2 parts grapefruit to 1 part cinnamon syrup.
  const expanded = [];
  for (const item of items) {
    if (item.name === "Donn's Mix" && item.qty) {
      const juice = roundQty(item.qty * (2 / 3));
      const syrup = roundQty(item.qty - juice);
      expanded.push(fromMeasure(juice, "ml", "Pink Grapefruit Juice", [], item.raw));
      expanded.push({
        name: "Cinnamon Syrup",
        amount: `${syrup} ml`,
        qty: syrup,
        unit: "ml",
        notes: [],
        raw: item.raw,
        ml: syrup,
      });
      notes.push("Donn's Mix expanded using the IBA note: 2 parts grapefruit juice to 1 part cinnamon syrup.");
    } else {
      expanded.push(item);
    }
  }
  return { items: expanded, errors, notes };
}