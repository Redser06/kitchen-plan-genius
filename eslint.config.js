import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", ".output", ".vinxi"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
        },
      ],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  eslintPluginPrettier,
  {
    // Written before prettier and no-explicit-any were enforced. Kept out of
    // those two rules so `eslint .` can pass without reformatting the planner UI.
    files: [
      "src/components/BottomBar.tsx",
      "src/components/BottomSheet.tsx",
      "src/components/ContextPanel.tsx",
      "src/components/ExportPanel.tsx",
      "src/components/KitchenCanvas.tsx",
      "src/components/RoomShapeDesigner.tsx",
      "src/domain/geometry.ts",
      "src/domain/geometry.test.ts",
      "src/domain/types.ts",
      "src/features/kitchenplan/App.tsx",
      "src/features/kitchenplan/resizeRoom.ts",
      "src/routes/__root.tsx",
      "src/store/useStore.ts",
    ],
    rules: {
      "prettier/prettier": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
