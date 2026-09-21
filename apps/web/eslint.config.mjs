import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Vendored from ElevenLabs UI, unchanged apart from the texture URL (see
    // the header of the file and ADR-011). It drives a WebGL shader by
    // mutating uniforms every frame, which the React Compiler rules forbid on
    // sight. Rewriting it to satisfy them would fork it from upstream for no
    // behavioural gain, so the rules are lifted for this one file.
    files: ["components/ui/orb.tsx"],
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
    },
  },
]);

export default eslintConfig;
