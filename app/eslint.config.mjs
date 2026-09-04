import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: [
      "components/add-position-modal.tsx",
      "components/asset-detail.tsx",
      "components/asset-views.tsx",
      "components/charts.tsx",
      "components/market-view.tsx",
      "components/overview.tsx",
      "components/portfolio-view.tsx",
      "components/search-palette.tsx",
      "components/set-detail.tsx",
      "components/sets-view.tsx",
      "components/watchlist-view.tsx",
      "lib/data.ts",
      "lib/store.tsx",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/rules-of-hooks": "off",
      "react-hooks/preserve-manual-memoization": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
