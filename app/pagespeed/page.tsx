"use client";
import { useState } from "react";

const S = {
  bg: "#0a0e17", surface: "#111827", surfaceAlt: "#1a2236", border: "#1e2a42",
  text: "#e2e8f0", dim: "#64748b", accent: "#3b82f6",
  green: "#22c55e", yellow: "#eab308", red: "#ef4444", purple: "#8b5cf6",
  mono: "'IBM Plex Mono', monospace", sans: "'DM Sans', system-ui, sans-serif",
};
const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: S.dim, fontFamily: S.sans, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8, display: "block" };
const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "10px 12px", fontFamily: S.mono, fontSize: 13, background: S.surfaceAlt, border: `1px solid ${S.border}`, borderRadius: 6, color: S.text, outline: "none" };

const THRESHOLDS = {
  lcp: { good: 2500, poor: 4000, unit: "s", divisor: 1000 },
  inp: { good: 200, poor: 500, unit: "ms", divisor: 1 },
  cls: { good: 0.1, poor: 0.25, unit: "", divisor: 1 },
  fcp: { good: 1800, poor: 3000, unit: "s", divisor: 1000 },
  ttfb: { good: 800, poor: 1800, unit: "ms", divisor: 1 },
};

function rating(metric: keyof typeof THRESHOLDS, value: number) {
  const t = THRESHOLDS[metric];
  if (value <= t.good) return "good";
  if (value <= t.poor) return "ni";
  return "poor";
}

function ratingColor(r: string) {
  if (r === "good") return S.green;
  if (r === "ni") return S.yellow;
  return S.red;
}

function formatValue(metric: keyof typeof THRESHOLDS, value: number) {
  const t = THRESHOLDS[metric];
  if (metric === "cls") return value.toFixed(3);
  if (t.unit === "s") return (value / t.divisor).toFixed(2) + "s";
  return Math.round(value) + t.unit;
}

function ScoreGauge({ score, label: lbl }: { score: number; label: string }) {
  const pct = Math.round(score * 100);
  const color = score >= 0.9 ? S.green : score >= 0.5 ? S.yellow : S.red;
  const circumference = 2 * Math.PI * 48;
  const offset = circumference * (1 - score);

  return (
    <div style={{ textAlign: "center" }}>
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r="48" fill="none" stroke={S.border} strokeWidth="6" />
        <circle cx="55" cy="55" r="48" fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 55 55)"
          style={{ transition: "stroke-dashoffset 0.8s ease" }} />
        <text x="55" y="55" textAnchor="middle" dominantBaseline="central"
          style={{ fontSize: 28, fontWeight: 800, fill: color, fontFamily: S.sans }}>{pct}</text>
      </svg>
      <div style={{ fontSize: 11, fontWeight: 700, color: S.dim, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>{lbl}</div>
    </div>
  );
}

interface CruxMetric {
  histogram: { start: number; end?: number; density: number }[];
  percentiles: { p75: number };
}

function MetricBars({ histogram }: { histogram: CruxMetric["histogram"] }) {
  const [good, ni, poor] = histogram.map(h => h.density * 100);
  return (
    <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", background: S.border, marginTop: 8 }}>
      <div style={{ width: `${good}%`, background: S.green, transition: "width 0.6s" }} />
      <div style={{ width: `${ni}%`, background: S.yellow, transition: "width 0.6s" }} />
      <div style={{ width: `${poor}%`, background: S.red, transition: "width 0.6s" }} />
    </div>
  );
}

function FieldMetricCard({ metricKey, title, metric }: { metricKey: keyof typeof THRESHOLDS; title: string; metric: CruxMetric }) {
  const p75 = metric.percentiles.p75;
  const r = rating(metricKey, p75);
  const color = ratingColor(r);
  const [good, ni, poor] = metric.histogram.map(h => (h.density * 100).toFixed(0));

  return (
    <div style={{ padding: 16, background: S.surfaceAlt, borderRadius: 8, border: `1px solid ${S.border}`, borderLeft: `3px solid ${color}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: S.dim, textTransform: "uppercase", letterSpacing: "0.05em" }}>{title}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color, textTransform: "uppercase" }}>{r === "good" ? "Good" : r === "ni" ? "Needs improvement" : "Poor"}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color, fontFamily: S.sans, marginBottom: 2 }}>{formatValue(metricKey, p75)}</div>
      <div style={{ fontSize: 11, color: S.dim, fontFamily: S.mono }}>p75 from real users</div>
      <MetricBars histogram={metric.histogram} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: S.dim, marginTop: 4, fontFamily: S.mono }}>
        <span style={{ color: S.green }}>{good}% good</span>
        <span style={{ color: S.yellow }}>{ni}% ni</span>
        <span style={{ color: S.red }}>{poor}% poor</span>
      </div>
    </div>
  );
}

interface HistoryEntry {
  metricKey: keyof typeof THRESHOLDS;
  title: string;
  periods: string[];
  p75s: number[];
}

function HistoryChart({ entry }: { entry: HistoryEntry }) {
  const { metricKey, title, periods, p75s } = entry;
  const t = THRESHOLDS[metricKey];
  const width = 560, height = 140, pad = { l: 40, r: 12, t: 16, b: 24 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;

  const allVals = p75s.filter(v => v != null);
  if (!allVals.length) return null;
  const maxV = Math.max(...allVals, t.poor * 1.2);
  const minV = 0;

  const x = (i: number) => pad.l + (i / (p75s.length - 1 || 1)) * innerW;
  const y = (v: number) => pad.t + innerH - ((v - minV) / (maxV - minV)) * innerH;

  const pathD = p75s.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ");

  const latestP75 = p75s[p75s.length - 1];
  const latestR = rating(metricKey, latestP75);
  const latestColor = ratingColor(latestR);

  return (
    <div style={{ padding: 16, background: S.surfaceAlt, borderRadius: 8, border: `1px solid ${S.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: S.text, textTransform: "uppercase", letterSpacing: "0.05em" }}>{title}</span>
        <span style={{ fontSize: 16, fontWeight: 800, color: latestColor, fontFamily: S.sans }}>{formatValue(metricKey, latestP75)}</span>
      </div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
        <line x1={pad.l} y1={y(t.good)} x2={width - pad.r} y2={y(t.good)} stroke={S.green} strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
        <line x1={pad.l} y1={y(t.poor)} x2={width - pad.r} y2={y(t.poor)} stroke={S.red} strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
        <text x={pad.l - 4} y={y(t.good) + 3} textAnchor="end" fill={S.green} fontSize="9" fontFamily={S.mono}>{formatValue(metricKey, t.good)}</text>
        <text x={pad.l - 4} y={y(t.poor) + 3} textAnchor="end" fill={S.red} fontSize="9" fontFamily={S.mono}>{formatValue(metricKey, t.poor)}</text>
        <path d={pathD} stroke={S.accent} strokeWidth="2" fill="none" strokeLinejoin="round" />
        {p75s.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r="2.5" fill={ratingColor(rating(metricKey, v))} />
        ))}
        <text x={pad.l} y={height - 6} textAnchor="start" fill={S.dim} fontSize="9" fontFamily={S.mono}>{periods[0]?.slice(5) || ""}</text>
        <text x={width - pad.r} y={height - 6} textAnchor="end" fill={S.dim} fontSize="9" fontFamily={S.mono}>{periods[periods.length - 1]?.slice(5) || ""}</text>
      </svg>
    </div>
  );
}

interface Audit {
  id: string;
  title: string;
  description: string;
  score: number | null;
  displayValue?: string;
  numericValue?: number;
  details?: {
    type?: string;
    items?: Array<Record<string, unknown>>;
    overallSavingsMs?: number;
    overallSavingsBytes?: number;
  };
}

function AuditItem({ audit }: { audit: Audit }) {
  const [open, setOpen] = useState(false);
  const score = audit.score ?? 1;
  const color = score < 0.5 ? S.red : score < 0.9 ? S.yellow : S.green;
  const icon = score < 0.5 ? "▲" : score < 0.9 ? "■" : "○";

  return (
    <div style={{ borderRadius: 8, border: `1px solid ${S.border}`, background: S.surfaceAlt, overflow: "hidden" }}>
      <button onClick={() => setOpen(!open)} style={{
        width: "100%", padding: "12px 16px", background: "transparent", border: "none",
        cursor: "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "left" as const,
      }}>
        <span style={{ fontSize: 12, color, width: 16 }}>{icon}</span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: S.text }}>{audit.title}</span>
        {audit.displayValue && <span style={{ fontSize: 11, fontFamily: S.mono, color, marginRight: 8 }}>{audit.displayValue}</span>}
        <span style={{ fontSize: 12, color: S.dim, transform: open ? "rotate(90deg)" : "rotate(0)", transition: "transform 0.2s" }}>▸</span>
      </button>
      {open && (
        <div style={{ padding: "4px 16px 14px 42px", fontSize: 12, color: S.dim, lineHeight: 1.6 }}>
          <div style={{ marginBottom: 8 }} dangerouslySetInnerHTML={{ __html: audit.description.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:#60a5fa;text-decoration:underline">$1</a>') }} />
          {audit.details?.items && audit.details.items.length > 0 && (
            <div style={{ marginTop: 10, padding: 10, background: S.bg, borderRadius: 6, fontFamily: S.mono, fontSize: 11 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: S.dim, marginBottom: 6, textTransform: "uppercase" }}>Affected resources ({audit.details.items.length})</div>
              {audit.details.items.slice(0, 5).map((item, i) => {
                const url = (item.url as string) || (item.source as { url?: string })?.url || "";
                const wasted = item.wastedBytes as number | undefined;
                const wastedMs = item.wastedMs as number | undefined;
                return (
                  <div key={i} style={{ padding: "4px 0", borderTop: i > 0 ? `1px solid ${S.border}` : "none", display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ color: S.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{url || "—"}</span>
                    {wasted !== undefined && <span style={{ color: S.yellow, flexShrink: 0 }}>{(wasted / 1024).toFixed(1)} KiB</span>}
                    {wastedMs !== undefined && <span style={{ color: S.yellow, flexShrink: 0 }}>{Math.round(wastedMs)} ms</span>}
                  </div>
                );
              })}
              {audit.details.items.length > 5 && <div style={{ paddingTop: 6, color: S.dim, fontSize: 10 }}>+ {audit.details.items.length - 5} more</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PageSpeedV2Page() {
  const [url, setUrl] = useState("");
  const [strategy, setStrategy] = useState<"mobile" | "desktop">("mobile");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"field" | "lab" | "history">("field");
  const [cruxLevel, setCruxLevel] = useState<"url" | "origin">("url");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [psi, setPsi] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [crux, setCrux] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [cruxHistory, setCruxHistory] = useState<any>(null);

  const run = async () => {
    if (!url.trim()) return;
    setError(""); setLoading(true);
    setPsi(null); setCrux(null); setCruxHistory(null);

    const formFactor = strategy === "mobile" ? "PHONE" : "DESKTOP";

    const [psiRes, cruxRes, histRes] = await Promise.allSettled([
      fetch(`/api/pagespeed?url=${encodeURIComponent(url.trim())}&strategy=${strategy}`).then(r => r.json()),
      fetch("/api/crux", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: url.trim(), formFactor, identifier: cruxLevel }) }).then(r => r.json()),
      fetch("/api/crux-history", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: url.trim(), formFactor, identifier: cruxLevel }) }).then(r => r.json()),
    ]);

    if (psiRes.status === "fulfilled" && !psiRes.value.error) setPsi(psiRes.value);
    if (cruxRes.status === "fulfilled") setCrux(cruxRes.value);
    if (histRes.status === "fulfilled") setCruxHistory(histRes.value);

    if (psiRes.status === "rejected" && cruxRes.status === "rejected") {
      setError("All data sources failed. Check the URL and try again.");
    }
    setLoading(false);
  };

  const lab = psi?.lighthouseResult;
  const labScores = lab?.categories ? {
    performance: lab.categories.performance?.score ?? 0,
    accessibility: lab.categories.accessibility?.score ?? 0,
    bestPractices: lab.categories["best-practices"]?.score ?? 0,
    seo: lab.categories.seo?.score ?? 0,
  } : null;

  const audits = lab?.audits || {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getAudits = (filter: (a: any) => boolean): Audit[] => Object.values(audits)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((a: any) => filter(a))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .sort((a: any, b: any) => (a.score ?? 1) - (b.score ?? 1))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((a: any) => a as Audit);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opportunities = getAudits((a: any) => a.details?.type === "opportunity" && a.numericValue > 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const diagnostics = getAudits((a: any) => a.details?.type === "table" && a.score !== null && a.score < 1);

  const fieldMetrics = crux?.hasData ? crux.record?.metrics : null;

  const history: HistoryEntry[] = [];
  if (cruxHistory?.hasData && cruxHistory.record?.metrics && cruxHistory.record?.collectionPeriods) {
    const periods = cruxHistory.record.collectionPeriods.map((p: { lastDate: { year: number; month: number; day: number } }) =>
      `${p.lastDate.year}-${String(p.lastDate.month).padStart(2, "0")}-${String(p.lastDate.day).padStart(2, "0")}`
    );
    const mapping: Array<[string, keyof typeof THRESHOLDS, string]> = [
      ["largest_contentful_paint", "lcp", "Largest Contentful Paint"],
      ["interaction_to_next_paint", "inp", "Interaction to Next Paint"],
      ["cumulative_layout_shift", "cls", "Cumulative Layout Shift"],
      ["first_contentful_paint", "fcp", "First Contentful Paint"],
      ["experimental_time_to_first_byte", "ttfb", "Time to First Byte"],
    ];
    for (const [apiKey, mKey, title] of mapping) {
      const m = cruxHistory.record.metrics[apiKey];
      if (m?.percentilesTimeseries?.p75s) {
        const p75s = m.percentilesTimeseries.p75s.map((v: string | number) =>
          mKey === "cls" ? parseFloat(String(v)) : Number(v)
        ).filter((v: number) => !isNaN(v));
        if (p75s.length > 0) history.push({ metricKey: mKey, title, periods, p75s });
      }
    }
  }

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px 24px 48px" }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 6px", fontFamily: S.sans }}>⚡ PageSpeed Insights</h1>
      <p style={{ fontSize: 13, color: S.dim, margin: "0 0 24px", lineHeight: 1.5 }}>
        Real-user field data (CrUX) + Lighthouse lab audit + 40-week performance history — all in one place.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <input value={url} onChange={e => setUrl(e.target.value)} style={{ ...input, flex: 1, minWidth: 240 }}
          placeholder="https://example.com" onKeyDown={e => e.key === "Enter" && run()} />
        <select value={strategy} onChange={e => setStrategy(e.target.value as "mobile" | "desktop")}
          style={{ ...input, width: 130, cursor: "pointer" }}>
          <option value="mobile">📱 Mobile</option>
          <option value="desktop">🖥️ Desktop</option>
        </select>
        <select value={cruxLevel} onChange={e => setCruxLevel(e.target.value as "url" | "origin")}
          style={{ ...input, width: 110, cursor: "pointer" }}>
          <option value="url">URL</option>
          <option value="origin">Origin</option>
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
          <div>Fetching field data, lab audit, and history...</div>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>Takes 15-30 seconds</div>
        </div>
      )}

      {error && <div style={{ padding: 16, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 8, color: S.red, fontFamily: S.mono, fontSize: 13 }}>{error}</div>}

      {(psi || crux || cruxHistory) && !loading && (
        <>
          <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${S.border}`, marginBottom: 24 }}>
            {[
              { id: "field", label: "🌐 Field Data", sub: "Real users" },
              { id: "lab", label: "🧪 Lab Data", sub: "Lighthouse" },
              { id: "history", label: "📈 History", sub: "40 weeks" },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as typeof tab)} style={{
                padding: "10px 18px", background: "transparent", border: "none", cursor: "pointer",
                borderBottom: tab === t.id ? `2px solid ${S.accent}` : "2px solid transparent",
                fontFamily: S.sans, fontSize: 13,
                color: tab === t.id ? S.accent : S.dim,
                fontWeight: tab === t.id ? 700 : 500,
              }}>
                {t.label} <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 4 }}>{t.sub}</span>
              </button>
            ))}
          </div>

          {tab === "field" && (
            <div>
              {!crux?.hasData ? (
                <div style={{ padding: 24, background: S.surfaceAlt, borderRadius: 8, border: `1px solid ${S.border}`, textAlign: "center" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                  <div style={{ fontSize: 14, color: S.text, marginBottom: 4 }}>No CrUX field data available</div>
                  <div style={{ fontSize: 12, color: S.dim, lineHeight: 1.6 }}>
                    {crux?.message || "CrUX needs enough real-user traffic to report metrics."}
                    {cruxLevel === "url" && <><br />Try switching to <strong>Origin</strong> level above.</>}
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ padding: "10px 14px", marginBottom: 16, borderRadius: 8, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)", fontSize: 12, color: S.dim, lineHeight: 1.5 }}>
                    <strong style={{ color: S.green }}>✓ Real-user data</strong> from the last 28 days • {cruxLevel === "origin" ? "Origin-level (all pages)" : "URL-level"} • Form factor: {strategy === "mobile" ? "Mobile" : "Desktop"}
                  </div>
                  <label style={label}>Core Web Vitals</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginBottom: 20 }}>
                    {fieldMetrics?.largest_contentful_paint && <FieldMetricCard metricKey="lcp" title="LCP" metric={fieldMetrics.largest_contentful_paint} />}
                    {fieldMetrics?.interaction_to_next_paint && <FieldMetricCard metricKey="inp" title="INP" metric={fieldMetrics.interaction_to_next_paint} />}
                    {fieldMetrics?.cumulative_layout_shift && <FieldMetricCard metricKey="cls" title="CLS" metric={fieldMetrics.cumulative_layout_shift} />}
                  </div>
                  <label style={label}>Other Metrics</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                    {fieldMetrics?.first_contentful_paint && <FieldMetricCard metricKey="fcp" title="FCP" metric={fieldMetrics.first_contentful_paint} />}
                    {fieldMetrics?.experimental_time_to_first_byte && <FieldMetricCard metricKey="ttfb" title="TTFB" metric={fieldMetrics.experimental_time_to_first_byte} />}
                  </div>
                </>
              )}
            </div>
          )}

          {tab === "lab" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {!psi && <div style={{ padding: 24, background: S.surfaceAlt, borderRadius: 8, border: `1px solid ${S.border}`, textAlign: "center", color: S.dim }}>Lab data unavailable for this URL.</div>}
              {labScores && (
                <>
                  <div>
                    <label style={label}>Lighthouse Scores</label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                      <ScoreGauge score={labScores.performance} label="Performance" />
                      <ScoreGauge score={labScores.accessibility} label="Accessibility" />
                      <ScoreGauge score={labScores.bestPractices} label="Best Practices" />
                      <ScoreGauge score={labScores.seo} label="SEO" />
                    </div>
                  </div>

                  {opportunities.length > 0 && (
                    <div>
                      <label style={label}>Opportunities ({opportunities.length})</label>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {opportunities.map(a => <AuditItem key={a.id} audit={a} />)}
                      </div>
                    </div>
                  )}

                  {diagnostics.length > 0 && (
                    <div>
                      <label style={label}>Diagnostics ({diagnostics.length})</label>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {diagnostics.map(a => <AuditItem key={a.id} audit={a} />)}
                      </div>
                    </div>
                  )}

                  <div style={{ padding: 12, background: S.surfaceAlt, borderRadius: 8, border: `1px solid ${S.border}`, fontSize: 11, color: S.dim, fontFamily: S.mono }}>
                    Final URL: {lab?.finalUrl} • Strategy: {strategy} • Lighthouse {lab?.lighthouseVersion}
                  </div>
                </>
              )}
            </div>
          )}

          {tab === "history" && (
            <div>
              {!cruxHistory?.hasData ? (
                <div style={{ padding: 24, background: S.surfaceAlt, borderRadius: 8, border: `1px solid ${S.border}`, textAlign: "center" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                  <div style={{ fontSize: 14, color: S.text, marginBottom: 4 }}>No CrUX history available</div>
                  <div style={{ fontSize: 12, color: S.dim, lineHeight: 1.6 }}>
                    {cruxHistory?.message || "Try switching to Origin level."}
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ padding: "10px 14px", marginBottom: 16, borderRadius: 8, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)", fontSize: 12, color: S.dim, lineHeight: 1.5 }}>
                    <strong style={{ color: "#60a5fa" }}>📊 p75 trend</strong> • Up to 40 weeks of 28-day rolling data • Dashed lines = Good / Poor thresholds
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {history.map(h => <HistoryChart key={h.metricKey} entry={h} />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
