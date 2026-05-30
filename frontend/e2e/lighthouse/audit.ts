import { playAudit } from 'playwright-lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import type { Page } from '@playwright/test';

/**
 * Two gate profiles share these specs, selected by the LH_PERF env var:
 *
 *  - Default (E2E suite, dev server, BLOCKING): accessibility + best-practices.
 *    These are stable on the unminified dev server. Performance and SEO are NOT
 *    gated here — performance is dominated by dev-server delivery (no minify/gzip)
 *    and SEO isn't relevant for this authenticated app.
 *
 *  - LH_PERF (prod Docker stack, NON-BLOCKING workflow): adds the performance gate,
 *    measured against the production build (nginx, minified + gzipped) where the
 *    number is meaningful. Run by .github/workflows/lighthouse-perf.yml.
 *
 * playwright-lighthouse only runs the categories it gates, so the HTML/JSON reports
 * contain exactly the categories listed here.
 */
export const THRESHOLDS: Record<string, number> = process.env.LH_PERF
  ? { performance: 90, accessibility: 100, 'best-practices': 90 }
  : { accessibility: 100, 'best-practices': 90 };

/** Must match the `--remote-debugging-port` of the `lighthouse` project. */
const PORT = 9222;

/**
 * Audits the page's current URL against THRESHOLDS and writes an HTML + JSON
 * report to `lighthouse-report/<name>.*`. Throws (failing the test) on a miss.
 */
export async function auditPage(page: Page, name: string) {
  await playAudit({
    page,
    port: PORT,
    thresholds: THRESHOLDS,
    // Audit as desktop (no CPU/network throttling) to match the suite's Desktop
    // Chrome project. The default mobile preset throttles 4x CPU + slow network,
    // which unfairly tanks a JS-heavy SPA that targets the desktop.
    config: desktopConfig,
    // Lighthouse wipes storage before a run by default; that clears the JWT in
    // localStorage and breaks authenticated routes. Keep it so audited pages
    // load in the same signed-in state the suite set up.
    opts: { disableStorageReset: true },
    reports: {
      formats: { html: true, json: true },
      directory: 'lighthouse-report',
      name,
    },
  });
}
