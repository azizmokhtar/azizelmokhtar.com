---
title: This Site
kind: software
year: 2026
order: 0
description: Personal portfolio built with Astro, UnoCSS, and markdown content
tech:
  - Astro
  - UnoCSS
  - TypeScript
  - Markdown
related:
  - title: Setting Up UnoCSS with Radix Colors
    url: /tutorials/unocss-radix-setup
---

### Overview

My personal portfolio website, rebuilt from scratch with Astro 5 and UnoCSS.
The entire content layer is driven by markdown files — I can edit my
experience, projects, and site metadata without touching any code.

### Why Astro?

I wanted something that could be fully static (fast), content-driven (markdown
collections), and beautiful (UnoCSS with Radix colors) without the overhead of
a JavaScript framework. Astro delivered all three.

### Why UnoCSS over Tailwind

I'd used Tailwind CSS on previous projects (like Attar Dienstleistungen) and liked the utility-first workflow. UnoCSS offers the same developer experience but with:

- **On-demand generation** — only the CSS you actually use is emitted, leading to smaller bundles
- **Preset system** — composable presets instead of a monolithic config
- **`@apply` directives** — extract repeated utility patterns into custom CSS classes
- **Better Radix integration** — `unocss-preset-radix-colors` maps seamlessly to UnoCSS's preset architecture

### Design Decisions

- **Editorial typography**: Source Serif 4 for body text, Geist for headings
- **Light/dark mode**: Radix color tokens with system preference detection. The theme script runs synchronously (`is:inline`) in the `<head>` so there's no flash of wrong theme
- **Content-first**: All data lives in markdown files, not hardcoded in components. Adding a new project means creating a `.md` file — no routing or layout changes needed
- **Dashed lists**: Inspired by brianlovin.com and kyswtn.com, implemented with flex layout and CSS border dashes
- **Avatar as SVG**: Two SVGs (`me_black.svg` / `me_white.svg`) with inverted fills, trimmed viewBox to remove empty space

### Challenges

#### UnoCSS with Radix Colors

The trickiest part of the setup was resolving peer dependency conflicts between `unocss` v65 and `unocss-preset-radix-colors`. The preset hasn't been updated for the latest UnoCSS release, which means `npm install` fails unless you use `--legacy-peer-deps`.

After getting past the install, the configuration needs careful attention to selector matching — the preset needs explicit `.light` and `.dark` selectors to match UnoCSS's class-based dark mode.

#### Content Rendering

Getting Astro's content collections to render markdown on dynamic pages required understanding the `render()` API and how content entries work with `getStaticPaths`. The `[...slug].astro` pattern with `getStaticPaths` was new to me.

#### Avatar Image Handling

Dark mode images required two separate SVG files — one with black fills (light mode) and one with white fills (dark mode). The `dark:hidden` / `hidden dark:block` pattern handles the swap, but the SVG viewBox had to be trimmed to avoid empty space.

### Screenshots

*Screenshot placeholder*

### Lessons Learned

Astro is an excellent choice for content-driven sites. The developer experience is smooth, the build output is tiny, and markdown-based editing means I can update my portfolio from any device.

The UnoCSS + Radix combo is powerful once set up, but the peer dependency issue means you need to pin versions or accept `--legacy-peer-deps`. The Radix color tokens themselves are fantastic — they make light/dark mode theming trivial with CSS custom properties.

The biggest architectural win was the markdown content layer. Having projects, experience, and tutorials all as content collections means the site practically writes itself as I add new work.
