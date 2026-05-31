/**
 * Web Vitals tracking utility.
 *
 * Tracks Core Web Vitals and reports them via the application logger.
 * In production this data can be forwarded to an analytics service.
 *
 * Supported metrics:
 *   CLS  – Cumulative Layout Shift
 *   FID  – First Input Delay
 *   FCP  – First Contentful Paint
 *   LCP  – Largest Contentful Paint
 *   TTFB – Time to First Byte
 *   INP  – Interaction to Next Paint (newer metric replacing FID)
 */

export interface WebVitalMetric {
  /** Metric identifier, e.g. "CLS", "LCP" */
  name: string;
  /** Metric value (milliseconds for time-based metrics, unitless for CLS) */
  value: number;
  /** Navigation entry id that the metric is associated with */
  id: string;
  /** Rating: "good" | "needs-improvement" | "poor" */
  rating?: "good" | "needs-improvement" | "poor";
  /** Navigation type: "navigate" | "reload" | "back-forward" | "prerender" */
  navigationType?: string;
}

/**
 * Thresholds for Core Web Vitals ratings.
 * Source: https://web.dev/vitals/
 */
const THRESHOLDS: Record<string, { good: number; poor: number }> = {
  CLS:  { good: 0.1,   poor: 0.25 },
  FID:  { good: 100,   poor: 300 },
  FCP:  { good: 1800,  poor: 3000 },
  LCP:  { good: 2500,  poor: 4000 },
  TTFB: { good: 800,   poor: 1800 },
  INP:  { good: 200,   poor: 500 },
};

/**
 * Derive a rating for a metric value based on standard thresholds.
 */
function getRating(name: string, value: number): "good" | "needs-improvement" | "poor" {
  const threshold = THRESHOLDS[name];
  if (!threshold) return "good";
  if (value <= threshold.good) return "good";
  if (value <= threshold.poor) return "needs-improvement";
  return "poor";
}

/**
 * Report a Web Vitals metric.
 *
 * Logs the metric to the console (structured JSON in production, readable text
 * in development) and can be extended to forward data to an analytics endpoint.
 *
 * Usage in Next.js App Router – add to a client component or layout:
 *
 * ```tsx
 * import { useReportWebVitals } from 'next/web-vitals'
 * import { reportWebVitals } from '@/utils/webVitals'
 *
 * export function WebVitalsReporter() {
 *   useReportWebVitals(reportWebVitals)
 *   return null
 * }
 * ```
 */
export function reportWebVitals(metric: WebVitalMetric): void {
  const rating = metric.rating ?? getRating(metric.name, metric.value);

  const entry = {
    metric: metric.name,
    value: metric.value,
    id: metric.id,
    rating,
    navigationType: metric.navigationType,
  };

  // Use structured output consistent with the application logger
  if (process.env.NODE_ENV === "production") {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "info",
        message: "web_vital",
        data: entry,
      })
    );
  } else {
    const ratingColor =
      rating === "good" ? "\x1b[32m" :
      rating === "needs-improvement" ? "\x1b[33m" :
      "\x1b[31m";
    const reset = "\x1b[0m";
    console.log(
      `\x1b[36m[WebVitals]\x1b[0m ${metric.name} = ${metric.value.toFixed(2)} ` +
      `${ratingColor}(${rating})${reset} [id: ${metric.id}]`
    );
  }

  // Forward to analytics endpoint in production (extend as needed)
  if (process.env.NODE_ENV === "production" && typeof window !== "undefined") {
    const body = JSON.stringify(entry);
    // Use sendBeacon when available for non-blocking delivery
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics/vitals", body);
    } else {
      fetch("/api/analytics/vitals", {
        method: "POST",
        body,
        keepalive: true,
        headers: { "Content-Type": "application/json" },
      }).catch(() => {
        // Silently ignore – vitals reporting is best-effort
      });
    }
  }
}
