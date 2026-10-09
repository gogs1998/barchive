/**
 * Small HTTP helper for the open-data pipeline.
 * Wikimedia asks for a descriptive User-Agent; IBA is fetched slowly.
 */

export const UA =
  "BarIQOpenData/1.0 (open-licence cocktail dataset for bariq.co.uk; facts only, no republished prose)";

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getText(url, { retries = 4, accept = "*/*" } = {}) {
  let last = "no response";
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: accept },
    });
    if (res.status === 429 || res.status >= 500) {
      last = `${res.status} ${url}`;
      await sleep(800 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return await res.text();
  }
  throw new Error(last);
}

export async function getJson(url) {
  const text = await getText(url, { accept: "application/json" });
  return JSON.parse(text);
}

export async function getBuffer(url) {
  let last = "no response";
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.status === 429 || res.status >= 500) {
      last = `${res.status} ${url}`;
      await sleep(800 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error(last);
}