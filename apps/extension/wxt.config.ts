import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "wxt";

/**
 * Public key that pins the extension id to `iciahkakhljbapmhkjjgopacegifndha`
 * (ADR-034 §1). The API lists `chrome-extension://<id>` in MCP_ALLOWED_ORIGINS,
 * and the OAuth redirect is `https://<id>.chromiumapp.org/`. When the Chrome
 * Web Store listing exists (US-201), replace it with the store's public key.
 */
const MANIFEST_KEY =
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAruN4vm0AYF8Ku/OKXI0h12eP9S0hxltC+kJUtlPHDE6s09mfLnmOcVN+WYNisRyC9hqwOJlM1dBPbmw5XpeJL2BzD8YWmFuafgderUvpDn6Biyx+RHBLuRwUMzL97A4VPpim9UGpDlCvLKliSqG86JZd8YaNkObOF9G0CWkJ7fq4nGg7zPWaOb5IT6DZ/oyBgeH9SRlquKGPBNAvupqnNdE41k7+O1mKVv8ifFSEH+il7lL01YgA+d91Oa4inGX8AMIw7v5Pdr/d3N9BePvgGZ6mG1dJbVixF+crlAJEW7h8hnunwmfa3N785Y5nzrSGQpOYnyb/H/8mwEztx5lRhQIDAQAB";

/** API hosts the service worker may call (MCP, OAuth, signed files). */
const API_HOSTS = [
  "https://jobspark-api.koklo.dev/*",
  "https://jobspark-api-staging.koklo.dev/*",
  "http://localhost:3001/*",
];

export default defineConfig({
  srcDir: "src",
  manifest: {
    name: "JobSpark",
    description:
      "JobSpark prépare et remplit vos candidatures sur les sites des recruteurs.",
    key: MANIFEST_KEY,
    permissions: ["storage", "identity", "sidePanel"],
    host_permissions: API_HOSTS,
    action: { default_title: "Ouvrir JobSpark" },
  },
  // @vitejs/plugin-react 5 (vite 7) rather than @wxt-dev/module-react, whose
  // plugin-react 6 needs vite 8.
  vite: () => ({
    plugins: [react(), tailwindcss()],
    // packages/types ships CommonJS in dist/; bundle its TypeScript source.
    resolve: {
      alias: {
        "@cvforge/types": fileURLToPath(
          new URL("../../packages/types/src/index.ts", import.meta.url),
        ),
      },
    },
  }),
});
