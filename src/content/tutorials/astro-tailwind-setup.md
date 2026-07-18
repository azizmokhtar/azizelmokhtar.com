---
title: Setting Up Astro 5 with Tailwind CSS v4
description: A practical guide to integrating Tailwind CSS v4 into an Astro 5 project, covering the new CSS-first configuration approach.
tags:
  - Astro
  - Tailwind CSS
  - TypeScript
order: 0
---

When I started the Attar Dienstleistungen project, Astro 5 and Tailwind CSS v4 were both recently released. The integration is different from previous versions.

## Installation

```bash
npm create astro@latest my-project -- --template minimal
cd my-project
npm install @tailwindcss/vite tailwindcss
```

## Configuration

In `astro.config.mjs`, add the Tailwind Vite plugin:

```js
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import vercel from "@astrojs/vercel";

export default defineConfig({
  output: "server",
  adapter: vercel(),
  vite: {
    plugins: [tailwindcss()],
  },
});
```

## Global CSS

In Astro 5, the Tailwind v4 approach uses CSS-first configuration. Instead of `tailwind.config.js`, you define your theme in `global.css`:

```css
@import "tailwindcss";

@theme {
  --color-brand: #ff5f00;
  --color-brand-dark: #cc4c00;
}

/* Now I can use bg-brand, text-brand-dark, etc. */
```

## Custom Font Sizing

Tailwind v4 uses a different approach for fluid typography. I needed to fix an iOS font-sizing issue:

```css
/* Prevent iOS from auto-adjusting font sizes */
body {
  -webkit-text-size-adjust: 100%;
}
```

## Key Differences from Tailwind v3

- **No `tailwind.config.js`** — everything goes in your CSS file via `@theme`
- **New `@theme` directive** — replaces `theme.extend` in JavaScript config
- **No `@tailwind` directives** — just `@import "tailwindcss"` is enough
- **Some utility class names changed** — always check the v4 migration guide
- **Better performance** — the new engine is significantly faster in dev mode
