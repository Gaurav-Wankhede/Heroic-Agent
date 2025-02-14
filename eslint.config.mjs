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
      // Handle unused variables
      "@typescript-eslint/no-unused-vars": ["error", {
        "varsIgnorePattern": "^_",
        "argsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_",
        "destructuredArrayIgnorePattern": "^_",
        "ignoreRestSiblings": true,
        "args": "after-used"
      }],
      
      // Handle any type usage
      "@typescript-eslint/no-explicit-any": ["warn", {
        "ignoreRestArgs": true,
        "fixToUnknown": false
      }],
      
      // Handle non-null assertions
      "@typescript-eslint/no-non-null-assertion": "off",
      
      // Disable react/no-unescaped-entities for better readability
      "react/no-unescaped-entities": "off",
      
      // Configure react-hooks/exhaustive-deps to be a warning
      "react-hooks/exhaustive-deps": ["warn", {
        "additionalHooks": "(useAsync|useAsyncCallback)"
      }],
      
      // Additional TypeScript rules
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-use-before-define": "off",
      "@typescript-eslint/no-empty-interface": ["warn", {
        "allowSingleExtends": true
      }],
      "@typescript-eslint/ban-ts-comment": ["warn", {
        "ts-ignore": "allow-with-description",
        "ts-expect-error": "allow-with-description"
      }],
      "@typescript-eslint/consistent-type-imports": ["error", {
        "prefer": "type-imports",
        "fixStyle": "separate-type-imports",
        "disallowTypeAnnotations": false
      }]
    },
    settings: {
      next: {
        rootDir: "."
      }
    }
  }
];

export default eslintConfig;
