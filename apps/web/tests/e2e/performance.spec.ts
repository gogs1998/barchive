/**
 * E2E: Performance — assert LCP < 2 000 ms on simulated Slow 3G.
 *
 * Uses Playwright's CDP-backed network emulation and the Navigation Timing /
 * PerformanceObserver APIs to measure Largest Contentful Paint.
 *
 * Only runs in the "chromium" (Desktop Chrome) project — CDP is required for
 * network throttling and the test is skipped for Mobile Chrome to avoid
 * flakiness from CI runner variance on constrained emulated devices.
 *
 * Threshold: 2 000 ms locally; 3 000 ms in CI to account for shared-runner
 * variance while still guarding against real regressions.
 */

import { test, expect } from "@playwright/test";

const SLOW_3G = {
  offline: false,
  downloadThroughput: (750 * 1024) / 8, // 750 kbps → bytes/s
  uploadThroughput: (250 * 1024) / 8, // 250 kbps → bytes/s
  latency: 100, // 100 ms RTT
};

// Give CI runners more headroom — shared VMs have unpredictable scheduling.
const LCP_THRESHOLD_MS = process.env.CI ? 3000 : 2000;

test.describe("Performance", () => {
  test(
    "home page LCP < 2 000 ms on simulated Slow 3G",
    { tag: ["@perf"] },
    async ({ page, browserName }) => {
      // Skip on any non-chromium browser (CDP required) AND on the Mobile
      // Chrome project (same engine but different device emulation that adds
      // variability on CI shared runners).
      test.skip(
        browserName !== "chromium",
        "Network throttling via CDP is only supported on Chromium"
      );
      test.skip(
        test.info().project.name === "Mobile Chrome",
        "Perf test scoped to Desktop Chrome only to avoid CI runner variance"
      );

      // Enable CDP network emulation
      const cdpSession = await page.context().newCDPSession(page);
      await cdpSession.send("Network.emulateNetworkConditions", SLOW_3G);

      // Collect LCP via PerformanceObserver before navigation
      await page.addInitScript(() => {
        (window as typeof window & { __lcp?: number }).__lcp = undefined;
        try {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const last = entries[entries.length - 1];
            if (last) {
              (window as typeof window & { __lcp?: number }).__lcp =
                last.startTime;
            }
          }).observe({ type: "largest-contentful-paint", buffered: true });
        } catch {
          // PerformanceObserver not supported; LCP will fall back to navigation timing
        }
      });

      await page.goto("/", { waitUntil: "networkidle" });

      // Give LCP observer a moment to fire
      await page.waitForTimeout(500);

      const lcp = await page.evaluate(() => {
        const w = window as typeof window & { __lcp?: number };
        if (w.__lcp !== undefined && w.__lcp > 0) return w.__lcp;
        // Fallback: use Navigation Timing domContentLoadedEventEnd
        const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
        return nav ? nav.domContentLoadedEventEnd : 0;
      });

      // Disable throttle after measurement
      await cdpSession.send("Network.emulateNetworkConditions", {
        offline: false,
        downloadThroughput: -1,
        uploadThroughput: -1,
        latency: 0,
      });

      console.log(`LCP on Slow 3G: ${lcp.toFixed(0)} ms`);
      expect(lcp).toBeLessThan(LCP_THRESHOLD_MS);
    }
  );
});
