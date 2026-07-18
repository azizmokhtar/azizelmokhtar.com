---
title: Setting Up UnoCSS with Radix Colors
description: How to integrate UnoCSS with unocss-preset-radix-colors for a complete light/dark mode theming system, including how to handle peer dependency conflicts.
tags:
  - UnoCSS
  - Astro
  - CSS
order: 0
---

When I built this portfolio, I wanted Radix Colors — a set of beautifully designed color scales with baked-in light and dark mode support. UnoCSS's preset system made it possible, but the setup wasn't straightforward.

## Why Radix Colors

Radix Colors provides 18 color scales (gray, green, red, blue, etc.) where each scale has 12 steps. The key feature is the `-dark` variants — Radix tokens automatically switch to their dark mode values when the parent element has a `dark` class.

```
Step 1 (background): Almost white in light mode, almost black in dark mode
Step 12 (foreground): Almost black in light mode, almost white in dark mode
```

This means you can write `bg-gray-1` and get the correct background color in both themes without any manual toggle logic.

## The Peer Dependency Problem

UnoCSS v65 and `unocss-preset-radix-colors` have conflicting peer dependency requirements. The preset was built for an earlier UnoCSS version, and npm's strict peer dependency resolution will reject the install.

```bash
# This will fail with peer dependency errors
npm install unocss unocss-preset-radix-colors

# Use --legacy-peer-deps to bypass the conflict
npm install unocss unocss-preset-radix-colors --legacy-peer-deps
```

The `--legacy-peer-deps` flag tells npm to use the older (pre-v7) resolution algorithm, which installs packages even when peer dependency ranges don't match perfectly. The actual API surface hasn't changed — the preset works correctly with the latest UnoCSS.

## Configuration

### 1. UnoCSS Config

In `uno.config.ts`, import the Radix preset and configure it alongside the base Wind preset:

```ts
import { defineConfig, presetWind, transformerDirectives } from "unocss";
import { presetRadixColors } from "unocss-preset-radix-colors";

export default defineConfig({
  transformers: [transformerDirectives()],
  presets: [
    presetWind({ dark: "class" }),
    presetRadixColors({
      prefix: "",               // Use bare names like "bg-gray-1"
      lightSelector: ".light",  // Match your light mode class
      darkSelector: ".dark",    // Match your dark mode class
      colors: ["gray", "green", "red", "yellow", "orange", "blue"],
    }),
  ],
});
```

The key settings:

- **`prefix: ""`** — Without a prefix, you write `bg-gray-1` instead of `bg-radix-gray-1`
- **`lightSelector` / `darkSelector`** — Must match the classes you use on `<html>`. Since UnoCSS is configured with `dark: "class"`, the preset needs to know which selectors represent each mode
- **`colors`** — Only include the color scales you actually use. Each scale generates hundreds of utility classes

### 2. Astro Integration

In `astro.config.mjs`, add UnoCSS as an integration:

```ts
import { defineConfig } from "astro/config";
import unocss from "unocss/astro";

export default defineConfig({
  integrations: [unocss({ injectReset: true })],
});
```

The `injectReset: true` option adds a CSS reset (based on Tailwind's preflight) automatically.

### 3. Theme Toggle

Since Radix colors depend on a class on `<html>`, the theme toggle needs to swap between `.light` and `.dark`:

```astro
<script>
  const toggle = document.getElementById("theme-toggle");
  toggle.addEventListener("click", () => {
    const root = document.documentElement;
    const isDark = root.classList.toggle("dark");
    root.classList.toggle("light", !isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  });
</script>
```

To prevent a flash of the wrong theme on page load, the theme restoration script must run synchronously in the `<head>`:

```astro
<script is:inline>
  if (localStorage.getItem("theme") === "dark") {
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
  }
</script>
```

## Usage

Once configured, Radix color utilities work throughout your templates:

```astro
<!-- Light mode: white background, dark text -->
<!-- Dark mode: near-black background, light text -->
<body class="bg-gray-1 text-gray-12">

<!-- Accent colors work identically -->
<button class="bg-green-9 text-white hover:bg-green-10">
  Click me
</button>

<!-- Subtle backgrounds -->
<span class="bg-gray-3 text-gray-11">
  Muted label
</span>
```

The `-a` suffix variants (e.g., `bg-green-5a`) produce alpha-blended versions useful for lightbox overlays or modal backdrops.

## Custom Fonts

You can combine UnoCSS's custom font configuration with Radix tokens:

```ts
const fontFamily = {
  sans: ["Geist", "'Geist Fallback'", systemFonts.sans].join(", "),
  serif: ["'Source Serif 4 Variable'", "'Source Serif 4 Fallback'", systemFonts.serif].join(", "),
};

export default defineConfig({
  theme: { fontFamily },
  presets: [presetWind({ dark: "class" }), presetRadixColors({...})],
});
```

Now `font-sans` and `font-serif` use your custom fonts, while `text-gray-11` and `bg-green-9` come from Radix.

## Key Takeaways

- Use `--legacy-peer-deps` for the initial install — the preset works fine with latest UnoCSS despite the version mismatch
- Match `lightSelector`/`darkSelector` exactly to your theme classes, or the colors won't switch
- Only include the color scales you need to keep the generated CSS small
- The synchronous theme script in `<head>` is essential — without it, users see a flash of the wrong theme before hydration
