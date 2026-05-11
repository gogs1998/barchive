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
      ],
      thresholds: { lines: 80 },
    },
  },
});
