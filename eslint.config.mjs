import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-require-imports": "off",
      "react/no-unescaped-entities": ["warn", { forbid: [">", "}"] }],
      // Disable new strict react-hooks rules from Next.js 16
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/exhaustive-deps": "warn",
      // Downgrade img warning
      "@next/next/no-img-element": "warn",
      "import/no-anonymous-default-export": "warn",
    },
  },
  {
    ignores: ["public/sw.js", "public/workbox-*.js", "scripts/**", "cloudflare-worker/**"],
  },
];

export default eslintConfig;
