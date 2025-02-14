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
      // Disable unused vars warnings for specific cases
      "@typescript-eslint/no-unused-vars": ["error", { 
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "ignoreRestSiblings": true 
      }],
      // Allow any type in specific cases where it's needed
      "@typescript-eslint/no-explicit-any": "warn",
      // Disable react/no-unescaped-entities for better readability
      "react/no-unescaped-entities": "off",
      // Configure react-hooks/exhaustive-deps to be a warning instead of error
      "react-hooks/exhaustive-deps": "warn"
    },
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/public/**"
    ]
  }
];

export default eslintConfig;
