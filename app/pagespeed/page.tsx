"use client";
import { useState } from "react";

const S = {
  bg: "#0a0e17", surfaceAlt: "#1a2236", border: "#1e2a42",
  text: "#e2e8f0", dim: "#64748b", accent: "#3b82f6",
  green: "#22c55e", yellow: "#eab308", red: "#ef4444",
  mono: "'IBM Plex Mono', monospace", sans: "'DM Sans', system-ui, sans-serif",
};
const label: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: S.dim, fontFamily: S.sans, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6, display: "block" };
const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "10px 12px", fontFamily: S.mono, fontSize: 13, background: S.surfaceAlt, border: `1px solid ${S.border}`, borderRadius: 6, color: S.text, outline: "none" };

function scoreColor(score: number) {
  if (score >= 0.9) return S.green;
  if (score >= 0.5) return S.yellow;
  return S.red;
}

function ScoreGauge({ score, label: lbl }: { score: number; label: string }) {
  const pct = Math.round(score * 100);
  const color = scoreColor(score);
  const circumference = 2 * Math.PI * 54;
  const offset = circumference * (1 - score);

  return (
    <div style={{ textAlign: "center" }}>
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" fill="none" stroke={S.border} strokeWidth="8" />
        <circle cx="60" cy="60" r="54" fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 60 60)"
          style={{ transition: "stroke-dashoffset 0.8s ease" }} />
        <text x="60" y="60" textAnchor="middle" dominantBaseline="central"
          style={{ fontSize: 28, fontWeight: 800, fill: color, fontFamily: S.sans }}>{pct}</text>
      </svg>
      <div style={{ fontSize: 12, fontWeight: 700, color: S.dim, marginTop: 4, fontFamily: S.sans, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {lbl}
      </div>
    </div>
  );
}

function MetricCard({ name, value, unit, rating }: { name: string; value: string; unit: string; rating: string }) {
  const color = rating === "FAST" || rating === "AVERAGE" && parseFloat(value) < 2.5 ? S.green : rating === "AVERAGE" ? S.yellow : S.red;
  return (
    <div style={{ padding: 16, background: S.surfaceAlt, borderRadius: 8, border: `1px solid ${S.border}`, borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: 12, color: S.dim, fontFamily: S.sans, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>{name}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color, fontFamily: S.sans }}>
        {value} <span style={{ fontSize: 14, fontWeight: 500 }}>{unit}</span>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractMetrics(data: any) {
  const lhr = data.lighthouseResult;
  if (!lhr) return null;

  const categories = lhr.categories || {};
  const audits = lhr.audits || {};

  const scores = {
    performance: categories.performance?.score ?? 0,
    accessibility: categories.accessibility?.score ?? 0,
    bestPractices: categories["best-practices"]?.score ?? 0,
    seo: categories.seo?.score ?? 0,
  };

  const cwv = {
    lcp: {
      value: audits["largest-contentful-paint"]?.numericValue,
      display: audits["largest-contentful-paint"]?.displayValue || "N/A",
      rating: audits["largest-contentful-paint"]?.numericValue < 2500 ? "FAST" : audits["largest-contentful-paint"]?.numericValue < 4000 ? "AVERAGE" : "SLOW",
    },
    fid: {
      value: audits["max-potential-fid"]?.numericValue,
      display: audits["max-potential-fid"]?.displayValue || "N/A",
      rating: audits["max-potential-fid"]?.numericValue < 100 ? "FAST" : audits["max-potential-fid"]?.numericValue < 300 ? "AVERAGE" : "SLOW",
    },
    cls: {
      value: audits["cumulative-layout-shift"]?.numericValue,
      display: audits["cumulative-layout-shift"]?.displayValue || "N/A",
      rating: audits["cumulative-layout-shift"]?.numericValue < 0.1 ? "FAST" : audits["cumulative-layout-shift"]?.numericValue < 0.25 ? "AVERAGE" : "SLOW",
    },
    fcp: {
      value: audits["first-contentful-paint"]?.numericValue,
      display: audits["first-contentful-paint"]?.displayValue || "N/A",
      rating: audits["first-contentful-paint"]?.numericValue < 1800 ? "FAST" : audits["first-contentful-paint"]?.numericValue < 3000 ? "AVERAGE" : "SLOW",
    },
    ttfb: {
      value: audits["server-response-time"]?.numericValue,
      display: audits["server-response-time"]?.displayValue || "N/A",
      rating: audits["server-response-time"]?.numericValue < 800 ? "FAST" : audits["server-response-time"]?.numericValue < 1800 ? "AVERAGE" : "SLOW",
    },
    si: {
      value: audits["speed-index"]?.numericValue,
      display: audits["speed-index"]?.displayValue || "N/A",
      rating: audits["speed-index"]?.numericValue < 3400 ? "FAST" : audits["speed-index"]?.numericValue < 5800 ? "AVERAGE" : "SLOW",
    },
    tbt: {
      value: audits["total-blocking-time"]?.numericValue,
      display: audits["total-blocking-time"]?.displayValue || "N/A",
      rating: audits["total-blocking-time"]?.numericValue < 200 ? "FAST" : audits["total-blocking-time"]?.numericValue < 600 ? "AVERAGE" : "SLOW",
    },
  };

  // Get opportunities
  const opportunities = Object.values(audits)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((a: any) => a.details?.type === "opportunity" && a.numericValue > 0)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .sort((a: any, b: any) => (b.numericValue || 0) - (a.numericValue || 0))
    .slice(0, 8)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((a: any) => ({
      title: a.title,
      description: a.description,
      savings: a.displayValue || "",
      score: a.score ?? 1,
    }));

  return { scores, cwv, opportunities, finalUrl: lhr.finalUrl || "" };
}

export default function PageSpeedPage() {
  const [url, setUrl] = useState("");
  const [strategy, setStrategy] = useState("mobile");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [results, setResults] = useState<any>(null);

  const run = async () => {
    if (!url.trim()) return;
    setError(""); setLoading(true); setResults(null);
    try {
      const res = await fetch(`/api/pagespeed?url=${encodeURIComponent(url.trim())}&strategy=${strategy}`);
      const data = await res.json();
      if (data.error) { setError(data.error); }
      else {
        const metrics = extractMetrics(data);
        if (!metrics) setError("Could not parse results");
        else setResults(metrics);
      }
    } catch { setError("Network error"); }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "32px 24px 48px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>⚡ PageSpeed Insights</h1>
      <p style={{ fontSize: 13, color: S.dim, margin: "0 0 24px", lineHeight: 1.5 }}>
        Analyze page performance, Core Web Vitals, and SEO scores using Google&apos;s Lighthouse engine.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input value={url} onChange={e => setUrl(e.target.value)} style={{ ...input, flex: 1 }}
          placeholder="https://example.com" onKeyDown={e => e.key === "Enter" && run()} />
        <select value={strategy} onChange={e => setStrategy(e.target.value)}
          style={{ ...input, width: 120, cursor: "pointer" }}>
          <option value="mobile">📱 Mobile</option>
          <option value="desktop">🖥️ Desktop</option>
        </select>
        <button onClick={run} disabled={loading}
          style={{ padding: "10px 24px", background: S.accent, color: "#fff", border: "none", borderRadius: 8,
            fontFamily: S.sans, fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
            opacity: loading ? 0.6 : 1 }}>
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      {loading && (
        <div style={{ padding: 40, textAlign: "center", color: S.dim, fontFamily: S.sans }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <div>Running Lighthouse audit... this takes 15-30 seconds.</div>
        </div>
      )}

      {error && <div style={{ padding: 16, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 8, color: S.red, fontFamily: S.mono, fontSize: 13 }}>{error}</div>}

      {results && (
        <div style={{ display: "flex", flexDirection: "column", gap: 28, marginTop: 24 }}>
          {/* Score Gauges */}
          <div>
            <label style={label}>Scores</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
              <ScoreGauge score={results.scores.performance} label="Performance" />
              <ScoreGauge score={results.scores.accessibility} label="Accessibility" />
              <ScoreGauge score={results.scores.bestPractices} label="Best Practices" />
              <ScoreGauge score={results.scores.seo} label="SEO" />
            </div>
          </div>

          {/* Core Web Vitals */}
          <div>
            <label style={label}>Core Web Vitals &amp; Metrics</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              <MetricCard name="Largest Contentful Paint" value={results.cwv.lcp.display} unit="" rating={results.cwv.lcp.rating} />
              <MetricCard name="Total Blocking Time" value={results.cwv.tbt.display} unit="" rating={results.cwv.tbt.rating} />
              <MetricCard name="Cumulative Layout Shift" value={results.cwv.cls.display} unit="" rating={results.cwv.cls.rating} />
              <MetricCard name="First Contentful Paint" value={results.cwv.fcp.display} unit="" rating={results.cwv.fcp.rating} />
              <MetricCard name="Speed Index" value={results.cwv.si.display} unit="" rating={results.cwv.si.rating} />
              <MetricCard name="Server Response (TTFB)" value={results.cwv.ttfb.display} unit="" rating={results.cwv.ttfb.rating} />
            </div>
          </div>

          {/* Opportunities */}
          {results.opportunities.length > 0 && (
            <div>
              <label style={label}>Opportunities to Improve</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {results.opportunities.map((opp: any, i: number) => (
                  <div key={i} style={{
                    padding: "12px 16px", background: S.surfaceAlt, borderRadius: 8,
                    border: `1px solid ${S.border}`,
                    borderLeft: `3px solid ${opp.score < 0.5 ? S.red : opp.score < 0.9 ? S.yellow : S.green}`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: S.text }}>{opp.title}</span>
                      {opp.savings && <span style={{ fontSize: 12, fontFamily: S.mono, color: S.yellow }}>{opp.savings}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ padding: 16, background: S.surfaceAlt, borderRadius: 8, border: `1px solid ${S.border}`, fontSize: 12, color: S.dim, fontFamily: S.mono }}>
            Analyzed: {results.finalUrl} | Strategy: {strategy} | Powered by Google Lighthouse
          </div>
        </div>
      )}
    </div>
  );
}
