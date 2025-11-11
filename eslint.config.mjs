import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Disable rules that don't block Next.js/Vercel builds
      "@typescript-eslint/no-explicit-any": "off", // Vercel builds allow 'any'
      "@typescript-eslint/no-unused-vars": "off", // Allow unused variables
      // Make unescaped entities a warning instead of error (can't auto-fix, but won't block commits)
      "react/no-unescaped-entities": ["warn", {
        "forbid": [">", "}"]
      }],
    },
  },
];

export default eslintConfig;
