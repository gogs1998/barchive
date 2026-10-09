/**
 * Mirrors deriveDietary() in apps/web/src/lib/cocktails.ts.
 * Kept here so the open dataset flags drinks the same way. Do not drift.
 */

const VEGAN_ALLOW = /\b(coconut|almond|soy|soya|oat|cashew|rice|hemp|pea)\b/;
const VEGAN_BLOCK =
  /\b(egg|eggs|yolk|yolks|albumen|cream|creamer|milk|buttermilk|butter|dairy|honey|yogh?urt|whey|custard|gelati?n|half.and.half|condensed|evaporated|baileys|irish cream|advocaat|falernum)\b/;

function isNonVeganIngredient(name) {
  const n = name.toLowerCase();
  if (VEGAN_ALLOW.test(n) && /\b(cream|milk)\b/.test(n)) return false;
  if (/cream soda|cream sherry/.test(n)) return false;
  if (/\begg\b|\beggs\b|\byolks?\b|\balbumen\b/.test(n)) return true;
  return VEGAN_BLOCK.test(n);
}

const GLUTEN_BLOCK = /\b(beer|lager|stout|porter|ale|malt|wheat|barley|rye bread)\b/;
function isNonGlutenFreeIngredient(name) {
  const n = name.toLowerCase();
  if (/ginger ale|ginger beer|root beer|cream soda|pale ale syrup/.test(n)) return false;
  return GLUTEN_BLOCK.test(n);
}

export function deriveDietary(names) {
  return {
    vegan: !names.some(isNonVeganIngredient),
    glutenFree: !names.some(isNonGlutenFreeIngredient),
  };
}

/** Same amount parser as cocktails.ts parseAmount(), copied so qty/unit match. */
export function parseAmount(amount) {
  const s = amount.trim().toLowerCase();
  const match = s.match(/^(\d+(?:\.\d+)?|\d+\/\d+)\s*(oz|ml|cl|tsp|tbsp|dashes?|dash)$/);
  if (!match) return { qty: null, unit: null };
  const [, numStr, rawUnit] = match;
  let qty;
  if (numStr.includes("/")) {
    const [num, den] = numStr.split("/").map(Number);
    qty = num / den;
  } else {
    qty = parseFloat(numStr);
  }
  const unit = rawUnit === "dashes" ? "dash" : rawUnit;
  return { qty, unit };
}