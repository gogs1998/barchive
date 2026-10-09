/**
 * Original preparation wording. The IBA method is used only to choose a
 * technique (stir, shake, build, and so on). Sentences from the source are
 * not copied.
 */

const GLASS = {
  Rocks: "rocks glass",
  Coupe: "chilled coupe",
  Martini: "chilled martini glass",
  Highball: "highball glass",
  Collins: "collins glass",
  Flute: "flute",
  Wine: "wine glass",
  "Copper Mug": "copper mug",
  Hurricane: "hurricane glass",
  "Tiki Mug": "tiki mug",
  "Julep Tin": "julep cup",
  "Heatproof Mug": "heatproof glass",
  Pint: "pint glass",
  Shot: "shot glass",
};

export function glassPhrase(glass) {
  return GLASS[glass] || glass.toLowerCase();
}

export function detectGlass(method, name) {
  const m = method.toLowerCase().replace(/\s+/g, " ");
  const n = name.toLowerCase();
  if (/pina colada|piña colada/.test(n)) return "Hurricane";
  if (/irish coffee|preheated/.test(m)) return "Heatproof Mug";
  if (/copper|mule mug|mule cup/.test(m) || /\bmule\b/.test(n)) return "Copper Mug";
  if (/julep/.test(m) || /julep/.test(n)) return "Julep Tin";
  if (/hurricane/.test(m)) return "Hurricane";
  if (/tiki glass|tiki mug/.test(m) || /^iba tiki/.test(n)) return "Tiki Mug";
  if (/flute|champagne glass/.test(m)) return "Flute";
  // Word boundary: "Martinique" is not a martini glass.
  if (/\bmartini\b/.test(m) || /\bmartini\b/.test(n)) return "Martini";
  if (/wine glass/.test(m) || /\bspritz\b/.test(n) || /^kir$/.test(n)) return "Wine";
  if (/goblet/.test(m) && /chilled/.test(m) && !/crushed|pebble/.test(m)) return "Coupe";
  if (/copo/.test(m)) return "Rocks";
  if (/goblet/.test(m)) return "Wine";
  if (/cobbler glass/.test(m)) return "Coupe";
  if (/collins/.test(m)) return "Collins";
  if (/highball|tall glass|tall tumbler|double rocks|rocks glass|old-fashioned|old fashioned/.test(m)) {
    if (/highball|tall glass|tall tumbler/.test(m) && !/double rocks|rocks glass|old-fashioned|old fashioned/.test(m)) return "Highball";
    if (/double rocks|rocks glass|old-fashioned|old fashioned/.test(m)) return "Rocks";
    return "Highball";
  }
  if (/cocktail glass|coupe/.test(m)) return "Coupe";
  if (/shake/.test(m) && /strain/.test(m)) return "Coupe";
  if (/stir/.test(m) && /strain/.test(m)) return "Coupe";
  if (/muddle/.test(m) || /soda|ginger|cola/.test(m)) return "Highball";
  return "Rocks";
}

const TOP_NAMES = new Set([
  "Soda (Club Soda) Water",
  "Ginger Beer",
  "Ginger Ale",
  "Cola",
  "Champagne",
  "Prosecco",
  "Sparkling Wine",
  "Tonic Water",
]);

const FLOATABLE = /wine|sherry|port|champagne|prosecco|scotch|rum|whiskey|whisky|brandy|cognac|absinthe|fernet|amaro|chartreuse|mure|mûre/i;

function aliases(item) {
  const n = item.name.toLowerCase();
  const out = [n];
  if (n.includes("mure") || n.includes("mûre")) out.push("mure", "mûre", "blackberry");
  if (n.includes("islay")) out.push("islay", "single malt");
  if (n.includes("wine") || n.includes("champagne") || n.includes("prosecco") || n.includes("sparkling")) out.push("wine", "sparkling");
  if (n.includes("ginger beer")) out.push("ginger beer");
  if (n.includes("ginger ale")) out.push("ginger ale");
  if (n.includes("soda")) out.push("soda");
  if (n.includes("cola")) out.push("cola");
  return out;
}

function mentions(item, text) {
  const hay = " " + text.toLowerCase() + " ";
  return aliases(item).some((a) => {
    const needle = a.toLowerCase();
    let from = 0;
    while (from < hay.length) {
      const i = hay.indexOf(needle, from);
      if (i < 0) return false;
      const before = hay[i - 1];
      const after = hay[i + needle.length];
      const edge = (ch) => /[^a-z0-9\u00c0-\u024f]/i.test(ch);
      if (edge(before) && edge(after)) return true;
      from = i + 1;
    }
    return false;
  });
}

function exceptedItems(method, ingredients) {
  const m = method.toLowerCase();
  const clause = m.split(/except/).slice(1).join(" ");
  if (!clause) return [];
  return ingredients.filter((item) => mentions(item, clause));
}

export function classify(rec, ingredients) {
  const method = rec.methodRaw || "";
  const m = method.toLowerCase().replace(/\s+/g, " ");
  const glass = detectGlass(method, rec.name);
  let technique = "build";
  if (/\bblend/.test(m)) technique = "blend";
  else if (/swizzle/.test(m)) technique = "swizzle";
  else if (/hot coffee|preheated|irish coffee/.test(m)) technique = "hot";
  else if (/muddle/.test(m) && /shake/.test(m)) technique = "muddle-shake";
  else if (/muddle/.test(m)) technique = "muddle";
  else if (/mix mint|mint springs/.test(m) && !/shaker|mixing glass/.test(m)) technique = "muddle";
  else if (/shake/.test(m)) technique = "shake";
  else if (/stir/.test(m) || (/mixing glass/.test(m) && /strain/.test(m))) technique = "stir";

  // Built in the serving glass. A stir that never mentions a mixing glass is one of these.
  if (technique === "stir" && !/mixing glass/.test(m) && !/\bstrain\b/.test(m)) technique = "build";

  const rinse = /\brinse/.test(m);
  const hasEgg = ingredients.some((i) => /egg/i.test(i.name));
  const longShake = /two minutes|one minute|hard shake without ice/.test(m);
  const side = ingredients.filter((i) => (i.notes || []).some((n) => /serve on the side/.test(n)));
  const held = exceptedItems(method, ingredients);

  let toppers = ingredients.filter((i) => i.role === "top");
  if (/top up|top with|except champagne|except soda/.test(m)) {
    for (const item of ingredients) {
      if (TOP_NAMES.has(item.name) && !toppers.includes(item) && !side.includes(item)) toppers.push(item);
    }
  }
  if (/top up with/.test(m)) {
    for (const item of ingredients) {
      if (/wine|champagne|prosecco|sparkling/i.test(item.name) && !toppers.includes(item) && !side.includes(item)) toppers.push(item);
    }
  }

  let floatName = "";
  if (/float|over the top|\bon top\b/.test(m)) {
    const ginger = ingredients.find((i) => i.name === "Ginger Beer");
    const rum = ingredients.find((i) => /rum/i.test(i.name));
    if (ginger && rum && (ginger.ml || 0) >= (rum.ml || 0) && /float/.test(m)) floatName = rum.name;
    else {
      const fromHeld = held.find((i) => !TOP_NAMES.has(i.name));
      if (fromHeld) floatName = fromHeld.name;
      else {
        const cands = ingredients.filter((i) => i.ml > 0 && i.ml <= 40 && FLOATABLE.test(i.name) && !toppers.includes(i));
        cands.sort((a, b) => a.ml - b.ml);
        if (cands[0]) floatName = cands[0].name;
      }
    }
  }

  for (const item of held) {
    if (item.name === floatName) continue;
    if (!toppers.includes(item) && !side.includes(item)) toppers.push(item);
  }
  if (floatName) toppers = toppers.filter((t) => t.name !== floatName);

  const destClause = (m.match(/strain into[^.]*/)?.[0] || "");
  const unstrained = /unstrained/.test(m) || (
    technique === "shake"
    && /pour into/.test(m)
    && !/\bstrain\b/.test(m)
    && !/cocktail glass|coupe|\bmartini\b|flute/.test(m)
    && !/serve without ice/.test(m)
  );

  let service = "ice";
  if (technique === "hot") service = "hot";
  else if (/discard the ice/.test(m)) service = "neat";
  else if (/serve without ice/.test(m)) service = "up";
  else if (technique === "shake" && /highball|collins|tumbler/.test(destClause) && !/ice/.test(destClause)) service = "up";
  else if (/pebble|crushed ice|cracked ice/.test(m) && glass !== "Coupe" && glass !== "Martini" && glass !== "Flute") service = "crushed";
  else if (glass === "Coupe" || glass === "Martini" || glass === "Flute") service = "up";
  else if (glass === "Wine" && !/\bice\b/.test(m)) service = "up";
  else if (glass === "Heatproof Mug") service = "hot";

  return { glass, technique, rinse, hasEgg, longShake, toppers, side, floatName, service, unstrained };
}

function articlePhrase(text) {
  const lower = text.charAt(0).toLowerCase() + text.slice(1);
  if (/^(a|an|the|\d+)/i.test(text)) return lower;
  if (/^(sprigs|slices|leaves|wheels|berries|mint)\b/i.test(lower)) return lower;
  const article = /^[aeiou]/i.test(lower) ? "an" : "a";
  return `${article} ${lower}`;
}

export function garnishStep(raw) {
  if (!raw) return null;
  let s = raw.replace(/\s+/g, " ").trim();
  s = s.split(/\.st0|MOST VIEWED|Are you over 18/i)[0].trim();
  if (!s) return null;
  if (/^n\/?a\b/i.test(s)) {
    const opt = s.match(/optional(?:ly)?[:,]?\s+(.*)/i);
    if (!opt) return null;
    s = opt[1];
  }
  s = s.replace(/\.$/, "").trim();
  if (/squeeze oil|oil from .* peel/i.test(s)) {
    return "Twist a citrus peel over the drink so the oils land on top.";
  }
  if (/sprinkle|nutmeg/i.test(s)) return "Grate a little nutmeg over the top.";
  if (/salt rim/i.test(s)) return null;
  if (/dip it in/i.test(s) && /sugar/i.test(s)) return "Set a long strip of citrus peel inside the glass.";
  if (/bitters on top|dashes of .* bitters on top/i.test(s)) return "Dash a little aromatic bitters across the foam.";
  s = s
    .replace(/^(?:optionally\s+)?garnish(?:ed)?\s+(?:optionally\s+)?with\s+/i, "")
    .replace(/\(\s*optional\s*\)/gi, "")
    .replace(/\boptionally\b/gi, "")
    .replace(/\boptional\b/gi, "")
    .replace(/\bsprings\b/gi, "sprigs")
    .replace(/\bspring\b/gi, "sprig")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.,]$/, "");
  if (!s || /^n\/?a$/i.test(s)) return null;
  return `Finish with ${articlePhrase(s)}.`;
}

export function saltRim(garnish, method) {
  return /salt rim/i.test(garnish || "") || /rim the [^.]{0,40}salt/i.test(method || "");
}

export function sugarRim(garnish) {
  return /dip it in/i.test(garnish || "") && /sugar/i.test(garnish || "");
}

export function writeSteps(rec, ingredients, info) {
  const glass = glassPhrase(info.glass);
  const steps = [];

  if (sugarRim(rec.garnishRaw)) {
    steps.push(`Wipe the rim of the ${glass} with citrus and press it into sugar.`);
  }
  if (saltRim(rec.garnishRaw, rec.methodRaw)) {
    steps.push(`Salt half the rim of the ${glass} before you pour.`);
  }
  if (info.rinse) {
    steps.push(`Rinse a chilled ${glass} with absinthe and tip out the excess.`);
  }

  const iceWord = info.service === "crushed" ? "crushed ice" : "ice";
  let dest;
  if (info.unstrained && info.service !== "up" && info.service !== "neat") dest = `Pour it, ice and all, into a ${glass}.`;
  else if (info.service === "up" || info.service === "neat") dest = `Strain into a ${glass}.`;
  else if (info.service === "crushed") dest = `Pour into a ${glass} packed with crushed ice.`;
  else dest = `Strain over fresh ice in a ${glass}.`;

  const heldNames = [info.floatName, ...info.toppers.map((t) => t.name)].filter(Boolean).map((n) => n.toLowerCase());
  const keepBack = heldNames.length ? ` Keep the ${heldNames.join(" and ")} out of the tin.` : "";

  if (info.technique === "hot") {
    steps.push("Warm a heatproof glass and tip out the water.");
    steps.push("Add the whiskey and sugar, pour in hot coffee, and stir until the sugar dissolves.");
    steps.push("Lay cold cream on top so it stays as its own layer.");
  } else if (info.technique === "blend") {
    steps.push("Put the ingredients in a blender with a scoop of crushed ice.");
    steps.push("Blend in short pulses until the ice is just broken up.");
    steps.push(`Pour into a ${glass} and add more crushed ice if the glass looks short.`);
  } else if (info.technique === "swizzle") {
    steps.push(`Pour the ingredients into a ${glass} and pack it with crushed ice.`);
    steps.push("Swizzle until the outside of the glass frosts, then pack the top again.");
  } else if (info.technique === "muddle-shake") {
    const muddle = ingredients.filter((i) => /Ginger|Mint|Basil|Chili|Lime Wedges|Caster Sugar|Sugar Cube/.test(i.name)).map((i) => i.name.toLowerCase());
    const what = muddle.length ? muddle.join(" and ") : "the aromatic ingredients";
    steps.push(`Muddle the ${what} in a shaker.`);
    steps.push(`Add the rest, fill with ice, and shake until the tin is frosty.${keepBack}`);
    steps.push(dest);
    if (info.floatName) steps.push(`Float the ${info.floatName.toLowerCase()} on top.`);
    if (info.toppers.length) steps.push(`Top with ${info.toppers.map((t) => t.name.toLowerCase()).join(" and ")}.`);
  } else if (info.technique === "muddle") {
    steps.push(`Muddle the solid ingredients in a ${glass} until the sugar or juice lets go.`);
    steps.push(`Fill the glass with ${iceWord}, add the spirit, and stir until it is cold.`);
    if (info.toppers.length) steps.push(`Top with ${info.toppers.map((t) => t.name.toLowerCase()).join(" and ")}.`);
  } else if (info.technique === "shake") {
    if (info.hasEgg) {
      steps.push(`Shake ${heldNames.length ? "the rest" : "the ingredients"} without ice first so the egg white foams.${keepBack}`);
      steps.push(info.longShake
        ? "Add ice and shake again until the drink is thick and very cold."
        : "Add ice and shake again until the tin frosts.");
    } else if (heldNames.length) {
      steps.push(`Shake the rest with ice until the tin frosts.${keepBack}`);
    } else {
      steps.push("Shake all the ingredients with ice until the tin frosts, about 12 seconds.");
    }
    steps.push(dest);
    if (info.floatName) steps.push(`Float the ${info.floatName.toLowerCase()} on top.`);
    if (info.toppers.length) steps.push(`Top with ${info.toppers.map((t) => t.name.toLowerCase()).join(" and ")}.`);
  } else if (info.technique === "stir") {
    const held = info.rinse ? "the remaining ingredients" : "the ingredients";
    steps.push(`Stir ${held} with ice in a mixing glass for 20 to 30 seconds.`);
    steps.push(info.service === "neat" || info.service === "up"
      ? `Strain into a ${glass}.`
      : `Strain onto a large cube in a ${glass}.`);
  } else if (info.service === "up" || info.service === "neat") {
    if (info.toppers.length) {
      steps.push(`Pour the other ingredients into a ${glass}.`);
      steps.push(`Top with ${info.toppers.map((t) => t.name.toLowerCase()).join(" and ")} and give it one short stir.`);
    } else if (info.floatName) {
      steps.push(`Pour everything except the ${info.floatName.toLowerCase()} into a ${glass}.`);
      steps.push(`Float the ${info.floatName.toLowerCase()} on top.`);
    } else {
      steps.push(`Pour the ingredients into a ${glass}.`);
      steps.push("Give it one short stir so it combines.");
    }
  } else if (info.floatName) {
    steps.push(`Pack a ${glass} with ${iceWord} and pour in everything except the ${info.floatName.toLowerCase()}.`);
    steps.push(`Float the ${info.floatName.toLowerCase()} on top.`);
  } else if (info.toppers.length) {
    steps.push(`Add the other ingredients over ${iceWord} in a ${glass}.`);
    steps.push(`Top with ${info.toppers.map((t) => t.name.toLowerCase()).join(" and ")} and give it one short stir.`);
  } else {
    steps.push(`Add the ingredients over ${iceWord} in a ${glass}.`);
    steps.push("Stir briefly so the drink is cold and combined.");
  }

  if (info.side.length) {
    steps.push(`Serve the ${info.side.map((t) => t.name.toLowerCase()).join(" and ")} in a small glass alongside.`);
  }

  const g = garnishStep(rec.garnishRaw);
  if (g) steps.push(g);

  if (steps.length < 3) steps.push("Serve straight away, while it is still cold.");
  return steps.slice(0, 6);
}