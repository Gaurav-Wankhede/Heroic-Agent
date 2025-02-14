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
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/public/**"
    ],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        ecmaVersion: "latest",
        sourceType: "module"
      }
    },
    rules: {
      // Handle unused variables - changed to warn
      "@typescript-eslint/no-unused-vars": ["warn", {
        "varsIgnorePattern": ".*",
        "argsIgnorePattern": ".*",
        "caughtErrorsIgnorePattern": ".*",
        "destructuredArrayIgnorePattern": ".*",
        "ignoreRestSiblings": true,
        "args": "none"
      }],
      
      // Handle any type usage - changed to off
      "@typescript-eslint/no-explicit-any": "off",
      
      // Handle non-null assertions
      "@typescript-eslint/no-non-null-assertion": "off",
      
      // Disable react/no-unescaped-entities
      "react/no-unescaped-entities": "off",
      
      // Configure react-hooks/exhaustive-deps to be warning
      "react-hooks/exhaustive-deps": "warn",
      
      // Additional TypeScript rules - all warnings or off
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-use-before-define": "off",
      "@typescript-eslint/no-empty-interface": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/consistent-type-imports": "warn"
    },
    settings: {
      next: {
        rootDir: "."
      }
    }
  }
];

export default eslintConfig;
