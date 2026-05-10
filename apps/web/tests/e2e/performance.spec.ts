/**
 * E2E: Performance — assert LCP < 2 000 ms on simulated Slow 3G.
 *
 * Uses Playwright's CDP-backed network emulation and the Navigation Timing /
 * PerformanceObserver APIs to measure Largest Contentful Paint.
 *
 * Only runs in the chromium project (CDP required for network throttling).
 */

import { test, expect, chromium } from "@playwright/test";

const SLOW_3G = {
  offline: false,
  downloadThroughput: (750 * 1024) / 8, // 750 kbps → bytes/s
  uploadThroughput: (250 * 1024) / 8, // 250 kbps → bytes/s
  latency: 100, // 100 ms RTT
};

const LCP_THRESHOLD_MS = 2000;

test.describe("Performance", () => {
  test(
    "home page LCP < 2 000 ms on simulated Slow 3G",
    { tag: ["@perf"] },
    async ({ page, browserName }) => {
      test.skip(
        browserName !== "chromium",
        "Network throttling via CDP is only supported on Chromium"
      );

      // Enable CDP network emulation
      const cdpSession = await page.context().newCDPSession(page);
      await cdpSession.send("Network.emulateNetworkConditions", SLOW_3G);

      // Collect LCP via PerformanceObserver before navigation
      await page.addInitScript(() => {
        (window as typeof window & { __lcp?: number }).__lcp = undefined;
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const last = entries[entries.length - 1];
          if (last) {
            (window as typeof window & { __lcp?: number }).__lcp =
              last.startTime;
          }
        }).observe({ type: "largest-contentful-paint", buffered: true });
      });

      await page.goto("/", { waitUntil: "networkidle" });

      // Give LCP observer a moment to fire
      await page.waitForTimeout(500);

      const lcp = await page.evaluate(
        () => (window as typeof window & { __lcp?: number }).__lcp ?? 0
      );

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
