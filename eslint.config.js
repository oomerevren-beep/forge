// ESLint flat config — strict for CI (`npm run lint` uses --max-warnings 0).
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", ".cache/**", "registry-content/**"] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    rules: {
      // Fail-closed style: surface sloppy code before it ships.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-console": "off",
      "eqeqeq": ["error", "always"],
    },
  },
);
