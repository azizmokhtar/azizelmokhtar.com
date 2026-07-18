---
title: Building a Bilingual Astro Site with Native Slugs and Locale Architecture
description: How to structure a multilingual Astro site with the default language at root, native slugs per locale, TypeScript-enforced content parity, and correct hreflang alternates.
tags:
  - Astro
  - i18n
  - TypeScript
  - SEO
order: 6
---

When building a bilingual site where both languages matter for organic search, the locale architecture is a one-way door. Change it after launch and you're managing 301 migrations, hreflang corrections, and re-indexing cycles.

This tutorial walks through the pattern I built for SEO216 — a German/English site where German lives at the root (`/leistungen`) and English under `/en/services`, with native slugs per locale and TypeScript-enforced content parity.

## The Architecture in One Breath

- **Default locale (DE)** at root: `/kontakt`, `/leistungen`, `/ueber-uns`
- **Secondary locale (EN)** under `/en`: `/en/contact`, `/en/services`, `/en/about`
- **Native slugs per locale**: DE pages use German words in the URL, EN pages use English
- **Canonical paths** are English (e.g. `/contact`, `/services`, `/about`) — the locale helpers translate them
- **TypeScript enforces parity**: every page exists fully in both locales, or it declares itself single-locale

## Step 1 — Define the Locale System

Start with the core types and helpers in a single `i18n/index.ts`:

```typescript
export type Locale = 'de' | 'en';
export const locales: Locale[] = ['de', 'en'];
```

German is the default locale served at root. English lives under `/en`. This decision is based on the primary market — for a DACH business, DE pages carry the link equity where it matters most.

## Step 2 — Map Native Slugs

The canonical path (in English) needs to map to native German URLs. Use a prefix-matching map so child paths follow automatically:

```typescript
const DE_SLUG_OVERRIDES: Record<string, string> = {
  '/services': '/leistungen',
  '/contact': '/kontakt',
  '/projects': '/projekte',
  '/about': '/ueber-uns',
  '/process': '/methode',
  '/resources/glossary': '/ressourcen/glossar',
  '/resources': '/ressourcen',
};
```

Order matters — more specific entries must come before their parent (`/resources/glossary` before `/resources`), because the matcher returns on the first match.

```typescript
function applyDeOverride(p: string): string {
  for (const [from, to] of Object.entries(DE_SLUG_OVERRIDES)) {
    if (p === from || p.startsWith(from + '/'))
      return to + p.slice(from.length);
  }
  return p;
}
```

This means `/services/build` automatically becomes `/leistungen/build` without an explicit mapping.

## Step 3 — Build the Path Localizer

The `localizePath` function turns a canonical path into the locale-correct URL:

```typescript
export function localizePath(path: string, locale: Locale): string {
  const clean = '/' + path.replace(/^\/+/, '').replace(/\/+$/, '');
  const base = clean === '/' ? '' : clean;
  if (locale === 'de') {
    return applyDeOverride(base) || '/';
  }
  return `/en${base}` || '/en';
}
```

For the English side, paths are simply prefixed with `/en` — no slug overrides needed since the canonical paths are already English.

Build the inverse function for hreflang computation:

```typescript
export function delocalizePath(p: string): string {
  let clean = '/' + p.replace(/^\/+/, '').replace(/\/+$/, '');
  if (clean === '/en') return '/';
  if (clean.startsWith('/en/')) return clean.slice(3);
  // Reverse DE slug overrides
  for (const [from, to] of Object.entries(DE_SLUG_OVERRIDES)) {
    if (clean === to || clean.startsWith(to + '/'))
      return from + clean.slice(to.length);
  }
  return clean || '/';
}
```

## Step 4 — Wire It Into Astro Config

The sitemap integration needs to produce hreflang alternates for every page:

```typescript
// astro.config.mjs
export default defineConfig({
  site: 'https://example.com',
  trailingSlash: 'never',  // ONE shape: no trailing slash
  integrations: [
    sitemap({
      serialize(item) {
        const url = stripSlash(item.url);
        const path = url.replace(SITE, '') || '/';
        const canonical = delocalizePath(path);
        const links = locales.map((lang) => ({
          lang,
          url: SITE + localizePath(canonical, lang),
        }));
        links.push({ lang: 'x-default', url: SITE + localizePath(canonical, 'de') });
        return { ...item, url, links };
      },
    }),
  ],
});
```

The `stripSlash` helper ensures canonical, hreflang, sitemap, and internal links all agree byte-for-byte:

```typescript
const stripSlash = (url) =>
  url.endsWith('/') && url !== `${SITE}/` ? url.slice(0, -1) : url;
```

## Step 5 — The Parity Contract

Every page must exist in both locales. The pattern: all copy lives in typed i18n files as `{ de: …, en: … }` objects:

```typescript
// i18n/home.ts
export const de = {
  title: 'SEO-Agentur für den Mittelstand',
  headline: 'Wir bauen Websites, die ranken.',
  // ...
};

export const en = {
  title: 'SEO Agency for Mid-Market Companies',
  headline: 'We build websites that rank.',
  // ...
};
```

TypeScript enforces the contract — a page missing a locale key fails the build. For pages that are genuinely single-locale (DE-only city pages), pass `localized={false}` to the layout, which omits hreflang entirely. Never point hreflang at a 404.

## Step 6 — The Layout Owns the `<head>`

One layout (`BaseLayout.astro`) emits every page's head tags — no page can forget a tag:

- `<title>` — `{pageTitle} · {brand}`, ≤60 chars
- `meta description` — unique per page, 120–160 chars
- `link canonical` — self-referencing, absolute, no trailing slash
- hreflang ×3 — `de`, `en`, `x-default` → DE
- OG + Twitter — full set with locale-correct `og:locale`
- JSON-LD `@graph` — Organization + WebSite + WebPage + BreadcrumbList

Pages pass props (`title`, `description`, `path`, `altPath`, `extraSchema`, `localized`) and the layout handles the rest.

```astro
<!-- BaseLayout.astro -->
<html lang={locale}>
<head>
  <title>{pageTitle} · SEO216</title>
  <meta name="description" content={description}>
  <link rel="canonical" href={canonicalUrl}>
  <!-- hreflang -->
  <link rel="alternate" hreflang="de" href={deUrl}>
  <link rel="alternate" hreflang="en" href={enUrl}>
  <link rel="alternate" hreflang="x-default" href={deUrl}>
  <!-- OG -->
  <meta property="og:locale" content={locale === 'de' ? 'de_DE' : 'en_US'}>
  <!-- JSON-LD -->
  <script type="application/ld+json" set:html={JSON.stringify(schemaGraph)} />
</head>
```

## Step 7 — Language Switcher

Language switching is a link, not a redirect. Never auto-detect language by IP or `Accept-Language` — Googlebot crawls from US IPs with no language header and would only ever see one version.

```astro
{otherLocales(locale).map((lang) => (
  <a href={localizePath(path, lang)} hreflang={lang}>
    {localeLabel[lang]}
  </a>
))}
```

## Common Pitfalls

### Trailing Slash Inconsistency

`Astro.site` stringifies with a trailing slash. Naïve concatenation produces `domain.de//page`, which invalidates every hreflang tag. Strip it once and enforce the same shape everywhere:

```typescript
const site = (Astro.site?.href ?? '').replace(/\/$/, '');
const canonical = `${site}${localizePath(path, locale)}`;
```

Check for this on every new build: `grep 'domain.de//' dist/client/index.html`.

### Slug Override Order

More specific paths must come before their parent. If `/resources` is checked before `/resources/glossary`, the glossary path matches `/resources` first and becomes `/ressourcen` instead of `/ressourcen/glossar`.

### Redirects for Pre-Launch Slugs

If you launch with English slugs on DE pages and migrate later, you need 301s. Better to decide slugs before launch. But if you must migrate:

```typescript
redirects: {
  '/contact': '/kontakt',
  '/about': '/ueber-uns',
  // ...
}
```

## Key Takeaways

- Default locale at root, secondary under `/en` — root pages carry the link equity
- Native slugs per locale via a prefix-matched override map — child paths follow automatically
- TypeScript-enforced parity — missing a locale key fails the build
- One layout owns every head tag — no page can forget canonical, hreflang, or schema
- Trailing slashes must be consistent across canonical, hreflang, sitemap, and internal links
- Language switching is a link, not a redirect — never auto-detect
