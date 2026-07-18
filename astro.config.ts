import { defineConfig } from "astro/config";
import icon from "astro-icon";
import unocss from "unocss/astro";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://azizmokhtar.github.io",
  base: "/azizelmokhtar.com",
  trailingSlash: "never",
  devToolbar: { enabled: false },
  integrations: [icon(), unocss({ injectReset: true }), sitemap()],
});
