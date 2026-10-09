/** Decode the small slice of HTML this pipeline actually sees. */

export function decodeHtml(input) {
  let s = String(input);
  for (let i = 0; i < 2; i++) {
    s = s
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&quot;/gi, '"')
      .replace(/&#0?39;|&apos;/gi, "'")
      .replace(/&#8217;|&#x2019;|&rsquo;/gi, "'")
      .replace(/&#8216;|&lsquo;/gi, "'")
      .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/gi, '"')
      .replace(/&#8211;|&ndash;/gi, "-")
      .replace(/&#8212;|&mdash;/gi, "-")
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
      .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
      .replace(/&amp;/gi, "&");
  }
  return s.replace(/\u00a0/g, " ");
}

export function collapse(s) {
  return decodeHtml(s)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** Text of the first section whose h4 equals `heading`, up to the next h4. */
export function sectionAfter(html, heading) {
  const re = new RegExp(
    `<h4[^>]*>\\s*${heading}\\s*</h4>([\\s\\S]*?)(?=<h4\\b|$)`,
    "i",
  );
  const m = html.match(re);
  return m ? m[1] : "";
}