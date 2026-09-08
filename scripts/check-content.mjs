#!/usr/bin/env node
/**
 * Content parity check (design-system §6).
 *
 *  - content/site.en.json and content/site.ar.json must carry exactly the same
 *    key set, and arrays at the same path must have the same length.
 *  - content/projects.json and content/services.json must carry both `en` and
 *    `ar` for every bilingual field: `locales`, image `alt`, ledger `k`/`v`,
 *    `spec`, `features`, `deliverables`.
 *
 * Exits 1 with the offending paths listed; exits 0 silently otherwise.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL(".", import.meta.url).pathname, "..");
const read = (name) =>
  JSON.parse(fs.readFileSync(path.join(root, "content", name), "utf8"));

const problems = [];

/* ---- site.en ⇄ site.ar ---------------------------------------------------- */

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

function walk(a, b, at, aName, bName) {
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) {
      problems.push(`${at}: array in one locale, not in the other`);
      return;
    }
    if (a.length !== b.length) {
      problems.push(
        `${at}: array length ${a.length} (${aName}) vs ${b.length} (${bName})`
      );
    }
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) walk(a[i], b[i], `${at}[${i}]`, aName, bName);
    return;
  }
  if (isObj(a) || isObj(b)) {
    if (!isObj(a) || !isObj(b)) {
      problems.push(`${at}: object in one locale, not in the other`);
      return;
    }
    for (const k of Object.keys(a)) {
      if (!(k in b)) problems.push(`${at}.${k}: present in ${aName}, missing in ${bName}`);
    }
    for (const k of Object.keys(b)) {
      if (!(k in a)) problems.push(`${at}.${k}: present in ${bName}, missing in ${aName}`);
    }
    for (const k of Object.keys(a)) {
      if (k in b) walk(a[k], b[k], `${at}.${k}`, aName, bName);
    }
    return;
  }
  if (typeof a !== typeof b) {
    problems.push(`${at}: ${typeof a} in ${aName}, ${typeof b} in ${bName}`);
  }
}

walk(read("site.en.json"), read("site.ar.json"), "site", "en", "ar");

/* ---- projects.json / services.json bilingual fields ---------------------- */

const nonEmpty = (v) => typeof v === "string" && v.trim().length > 0;

function requireBi(v, at) {
  if (!isObj(v)) return problems.push(`${at}: expected { en, ar }`);
  if (!("en" in v)) problems.push(`${at}.en: missing`);
  if (!("ar" in v)) problems.push(`${at}.ar: missing`);
  return v;
}

function requireBiString(v, at) {
  const bi = requireBi(v, at);
  if (!bi) return;
  if ("en" in bi && !nonEmpty(bi.en)) problems.push(`${at}.en: empty`);
  if ("ar" in bi && !nonEmpty(bi.ar)) problems.push(`${at}.ar: empty`);
}

function requireBiStringArray(v, at, exact) {
  const bi = requireBi(v, at);
  if (!bi) return;
  for (const loc of ["en", "ar"]) {
    if (!(loc in bi)) continue;
    if (!Array.isArray(bi[loc])) {
      problems.push(`${at}.${loc}: expected an array`);
      continue;
    }
    if (exact !== undefined && bi[loc].length !== exact) {
      problems.push(`${at}.${loc}: expected ${exact} entries, got ${bi[loc].length}`);
    }
    bi[loc].forEach((s, i) => {
      if (!nonEmpty(s)) problems.push(`${at}.${loc}[${i}]: empty`);
    });
  }
  if (Array.isArray(bi.en) && Array.isArray(bi.ar) && bi.en.length !== bi.ar.length) {
    problems.push(`${at}: en has ${bi.en.length} entries, ar has ${bi.ar.length}`);
  }
}

function requireBiLocales(v, at) {
  const bi = requireBi(v, at);
  if (!bi) return;
  // Same key set in both locale objects, every value a non-empty string.
  if (isObj(bi.en) && isObj(bi.ar)) walk(bi.en, bi.ar, at, "en", "ar");
  for (const loc of ["en", "ar"]) {
    if (!isObj(bi[loc])) continue;
    for (const [k, s] of Object.entries(bi[loc])) {
      if (!nonEmpty(s)) problems.push(`${at}.${loc}.${k}: empty`);
    }
  }
}

const projects = read("projects.json");
if (!Array.isArray(projects)) problems.push("projects.json: expected an array");
else
  projects.forEach((p, i) => {
    const at = `projects[${i}]${p?.slug ? `(${p.slug})` : ""}`;
    requireBiLocales(p?.locales, `${at}.locales`);
    if (p?.media?.images) {
      if (!Array.isArray(p.media.images)) problems.push(`${at}.media.images: expected an array`);
      else
        p.media.images.forEach((img, j) =>
          requireBiString(img?.alt, `${at}.media.images[${j}].alt`)
        );
    }
    if (p?.ledger !== undefined) {
      if (!Array.isArray(p.ledger)) problems.push(`${at}.ledger: expected an array`);
      else
        p.ledger.forEach((row, j) => {
          requireBiString(row?.k, `${at}.ledger[${j}].k`);
          requireBiString(row?.v, `${at}.ledger[${j}].v`);
        });
    }
    if (p?.spec !== undefined) {
      const bi = requireBi(p.spec, `${at}.spec`);
      if (bi) {
        for (const loc of ["en", "ar"]) {
          if (!(loc in bi)) continue;
          if (!Array.isArray(bi[loc])) {
            problems.push(`${at}.spec.${loc}: expected an array`);
            continue;
          }
          bi[loc].forEach((row, j) => {
            if (!nonEmpty(row?.k)) problems.push(`${at}.spec.${loc}[${j}].k: empty`);
            if (!nonEmpty(row?.v)) problems.push(`${at}.spec.${loc}[${j}].v: empty`);
          });
        }
        if (Array.isArray(bi.en) && Array.isArray(bi.ar) && bi.en.length !== bi.ar.length) {
          problems.push(`${at}.spec: en has ${bi.en.length} rows, ar has ${bi.ar.length}`);
        }
      }
    }
    if (p?.features !== undefined) requireBiStringArray(p.features, `${at}.features`);
  });

const services = read("services.json");
if (!Array.isArray(services)) problems.push("services.json: expected an array");
else
  services.forEach((s, i) => {
    const at = `services[${i}]${s?.slug ? `(${s.slug})` : ""}`;
    requireBiLocales(s?.locales, `${at}.locales`);
    requireBiStringArray(s?.deliverables, `${at}.deliverables`, 3);
  });

/* ---- report --------------------------------------------------------------- */

if (problems.length) {
  console.error(`check:content — ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  · ${p}`);
  process.exit(1);
}
console.log("check:content — ok");
