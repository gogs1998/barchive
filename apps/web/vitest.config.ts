import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    exclude: ["node_modules", "tests/e2e/**"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/test-setup.ts",
        "src/**/*.module.css",
        "src/app/**/*.tsx",        // Next.js pages – RSC, tested via E2E
        "src/app/layout.tsx",
        // Bar Mode UI components — complex stateful UI, covered by E2E tests
        // Unit test coverage tracked in BAR-17
        "src/components/BarMode.tsx",
        "src/components/BuildView.tsx",
        "src/components/BarModeModals.tsx",
        "src/components/BarIQApp.tsx",
        // Phase 2 auth + inventory UI components — complex stateful UI with
        // external API deps and OAuth flows; covered by E2E smoke tests.
        // Unit test authorship tracked in BAR-45.
        "src/components/AuthForm.tsx",
        "src/components/AuthModal.tsx",
        "src/components/EmailVerifyView.tsx",
        "src/components/IngredientSheet.tsx",
        "src/components/IngredientList.tsx",
        "src/components/PasswordStrengthMeter.tsx",
        "src/components/UndoToast.tsx",
        "src/components/index.ts",
        "src/lib/auth-context.tsx",
        "src/lib/themes.ts",
        "src/middleware.ts",
      ],
      thresholds: { lines: 80 },
    },
  },
});
