/**
 * Fix Vercel path-to-regexp error:
 *   Can not repeat "path" without a prefix and suffix
 * Replace :path* with (.*) / $1 in vercel.json rewrites & redirects.
 */
import fs from "fs";

const p = "vercel.json";
const j = JSON.parse(fs.readFileSync(p, "utf8"));
const before = JSON.stringify(j).split(":path*").length - 1;

function fixSource(s) {
  if (typeof s !== "string") return s;
  if (s === "/:path*") return "/(.*)";
  return s.replace(/\/:path\*$/g, "/(.*)").replace(/:path\*/g, "(.*)");
}

function fixDest(d) {
  if (typeof d !== "string") return d;
  return d.replace(/:path\*/g, "$1");
}

for (const key of ["rewrites", "redirects", "headers"]) {
  if (!Array.isArray(j[key])) continue;
  for (const rule of j[key]) {
    if (rule.source) rule.source = fixSource(rule.source);
    if (rule.destination) rule.destination = fixDest(rule.destination);
  }
}

fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
const after = JSON.stringify(j).split(":path*").length - 1;
console.log({ before, after, rewrites: j.rewrites?.length, redirects: j.redirects?.length });
console.log("sample rewrite", j.rewrites[0]);
console.log("sample redirect", j.redirects.find((r) => r.has));
