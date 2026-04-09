"use client";
import { useState, useMemo } from "react";

interface Rule { type: string; path: string; line: number }
interface Group { agents: string[]; rules: Rule[]; lineStart: number }
interface Warning { line: number; msg: string }
interface ParseResult { groups: Group[]; sitemaps: string[]; warnings: Warning[] }
interface TestResult { allowed: boolean; reason: string; matchedRule: Rule | null; group: Group | null }
interface BuilderRule { type: string; path: string }
interface BuilderGroup { agent: string; rules: BuilderRule[] }

const BOTS = [
  { name: "Googlebot", label: "Googlebot (Web)" },
  { name: "Googlebot-Image", label: "Googlebot Image" },
  { name: "Googlebot-News", label: "Googlebot News" },
  { name: "Googlebot-Video", label: "Googlebot Video" },
  { name: "Storebot-Google", label: "Storebot (Google)" },
  { name: "Google-InspectionTool", label: "Google Inspection Tool" },
  { name: "GoogleOther", label: "GoogleOther" },
  { name: "Google-Extended", label: "Google-Extended (AI training)" },
  { name: "Bingbot", label: "Bingbot" },
  { name: "Slurp", label: "Yahoo Slurp" },
  { name: "DuckDuckBot", label: "DuckDuckBot" },
  { name: "Baiduspider", label: "Baiduspider" },
  { name: "YandexBot", label: "YandexBot" },
  { name: "facebot", label: "Facebook" },
  { name: "Twitterbot", label: "Twitter / X" },
  { name: "GPTBot", label: "GPTBot (OpenAI)" },
  { name: "ChatGPT-User", label: "ChatGPT-User" },
  { name: "anthropic-ai", label: "Anthropic AI" },
  { name: "ClaudeBot", label: "ClaudeBot" },
  { name: "CCBot", label: "CCBot (Common Crawl)" },
  { name: "Applebot", label: "Applebot" },
  { name: "*", label: "All bots (*)" },
];

const S = {
  bg: "#0a0e17", surface: "#111827", surfaceAlt: "#1a2236",
  border: "#1e2a42", text: "#e2e8f0", dim: "#64748b",
  accent: "#3b82f6", green: "#22c55e", red: "#ef4444", yellow: "#eab308",
  mono: "'IBM Plex Mono', monospace", sans: "'DM Sans', system-ui, sans-serif",
};
const label: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: S.dim, fontFamily: S.sans, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 8, display: "block" };
const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "10px 12px", fontFamily: S.mono, fontSize: 13, background: S.surfaceAlt, border: `1px solid ${S.border}`, borderRadius: 6, color: S.text, outline: "none" };
const btn: React.CSSProperties = { padding: "6px 14px", fontSize: 12, fontWeight: 600, fontFamily: S.sans, borderRadius: 6, border: `1px solid ${S.border}`, background: S.surfaceAlt, color: S.text, cursor: "pointer" };

function parse(raw: string): ParseResult {
  const lines = raw.split(/\r?\n/);
  const groups: Group[] = []; const sitemaps: string[] = []; const warnings: Warning[] = [];
  let cur: Group | null = null;
  lines.forEach((orig, idx) => {
    const ci = orig.indexOf("#");
    const line = (ci >= 0 ? orig.slice(0, ci) : orig).trim();
    if (!line) return;
    const m = line.match(/^([a-z\-]+)\s*:\s*(.*)/i);
    if (!m) { warnings.push({ line: idx + 1, msg: `Invalid syntax: "${orig.trim()}"` }); return; }
    const f = m[1].toLowerCase(), v = m[2].trim();
    if (f === "user-agent") {
      if (cur && cur.rules.length === 0) cur.agents.push(v.toLowerCase());
      else { cur = { agents: [v.toLowerCase()], rules: [], lineStart: idx + 1 }; groups.push(cur); }
    } else if (f === "allow" || f === "disallow") {
      if (!cur) { warnings.push({ line: idx + 1, msg: `"${f}" before any User-agent` }); return; }
      cur.rules.push({ type: f, path: v, line: idx + 1 });
    } else if (f === "sitemap") { sitemaps.push(v); }
    else if (f === "crawl-delay") { warnings.push({ line: idx + 1, msg: `"Crawl-delay" ignored by Google (Bing/Yandex support it)` }); }
    else if (f === "host") { /* valid Yandex directive, ignore silently */ }
    else { warnings.push({ line: idx + 1, msg: `Unknown directive: "${f}"` }); }
  });
  groups.forEach(g => {
    if (g.rules.some(r => r.type === "disallow" && r.path === "/") && !g.rules.some(r => r.type === "allow"))
      warnings.push({ line: g.lineStart, msg: `⚠️ Blocking ALL crawling for "${g.agents.join(", ")}". Does NOT prevent indexing — use noindex.` });
  });
  return { groups, sitemaps, warnings };
}

function pathRe(p: string) {
  let r = "";
  for (let i = 0; i < p.length; i++) {
    const c = p[i];
    if (c === "*") r += ".*";
    else if (c === "$" && i === p.length - 1) r += "$";
    else r += c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp("^" + r);
}

// FIXED: User-agent matching per Google's spec (RFC 9309)
// The crawler's user-agent is matched against the robots.txt user-agent tokens.
// The most specific token that is a CASE-INSENSITIVE PREFIX of the crawler's
// full user-agent string wins. Wildcard (*) has lowest priority.
// "Googlebot" matches group "googlebot" but NOT "googlebot-image".
// "Googlebot-Image" matches "googlebot-image" first, then "googlebot", then "*".
function findMatchingGroup(parsed: ParseResult, crawlerUA: string): Group | null {
  const ua = crawlerUA.toLowerCase();
  let bestGroup: Group | null = null;
  let bestLen = -1;

  for (const g of parsed.groups) {
    for (const agent of g.agents) {
      if (agent === "*") {
        if (bestLen < 0) { bestGroup = g; bestLen = 0; }
      } else {
        // Per spec: the agent token must be a prefix substring of the crawler UA
        // AND the crawler UA must start with or equal the agent token.
        // "googlebot" matches crawler "googlebot" and "googlebot/2.1"
        // "googlebot" does NOT match crawler "googlebot-image"
        // "googlebot-image" matches crawler "googlebot-image"
        const matches = ua === agent || ua.startsWith(agent + "/") || ua.startsWith(agent + " ");
        // Also check: does the agent exactly equal the ua?
        // For cases like "googlebot-news" matching ua "googlebot-news"
        if (matches || ua === agent) {
          if (agent.length > bestLen) {
            bestGroup = g;
            bestLen = agent.length;
          }
        }
      }
    }
  }
  return bestGroup;
}

function testUrl(parsed: ParseResult, ua: string, path: string): TestResult {
  const group = findMatchingGroup(parsed, ua);

  if (!group || group.rules.length === 0) {
    return { allowed: true, reason: "No matching rules — allowed by default.", matchedRule: null, group };
  }

  let bestRule: Rule | null = null;
  let bestLen = -1;

  for (const r of group.rules) {
    if (r.type === "disallow" && r.path === "") continue;
    if (!r.path) continue;
    if (pathRe(r.path).test(path)) {
      const sp = r.path.replace(/\*/g, "").length;
      if (sp > bestLen) { bestLen = sp; bestRule = r; }
      else if (sp === bestLen && r.type === "allow") { bestRule = r; }
    }
  }

  if (!bestRule) {
    return { allowed: true, reason: "No rules match this path — allowed by default.", matchedRule: null, group };
  }

  return {
    allowed: bestRule.type === "allow",
    reason: `Matched "${bestRule.type}: ${bestRule.path}" on line ${bestRule.line}`,
    matchedRule: bestRule,
    group,
  };
}

function generate(groups: BuilderGroup[], sitemaps: string[]) {
  let o = "";
  groups.forEach((g, i) => { if (i) o += "\n"; o += `User-agent: ${g.agent}\n`; g.rules.forEach(r => o += `${r.type === "allow" ? "Allow" : "Disallow"}: ${r.path}\n`); });
  if (sitemaps.some(s => s.trim())) { o += "\n"; sitemaps.forEach(s => { if (s.trim()) o += `Sitemap: ${s.trim()}\n`; }); }
  return o;
}

function Validator() {
  const [txt, setTxt] = useState("User-agent: *\nDisallow: /admin/\nDisallow: /private/\nAllow: /admin/public/\n\nUser-agent: GPTBot\nDisallow: /\n\nSitemap: https://example.com/sitemap.xml");
  const [fetchUrl, setFetchUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchErr, setFetchErr] = useState("");
  const [ua, setUa] = useState("Googlebot");
  const [tp, setTp] = useState("/admin/public/page.html");
  const [result, setResult] = useState<TestResult | null>(null);
  const parsed = useMemo(() => parse(txt), [txt]);

  const doFetch = async () => {
    setFetchErr(""); if (!fetchUrl.trim()) return;
    setFetching(true);
    try {
      const res = await fetch(`/api/fetch-robots?url=${encodeURIComponent(fetchUrl.trim())}`);
      const data = await res.json();
      if (data.error) setFetchErr(data.error);
      else { setTxt(data.content); setResult(null); }
    } catch { setFetchErr("Network error"); }
    setFetching(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "24px 0" }}>
      <div>
        <label style={label}>Fetch robots.txt from a URL</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={fetchUrl} onChange={e => setFetchUrl(e.target.value)} style={{ ...input, flex: 1 }}
            placeholder="example.com" onKeyDown={e => e.key === "Enter" && doFetch()} />
          <button onClick={doFetch} disabled={fetching}
            style={{ ...btn, background: S.accent, color: "#fff", borderColor: S.accent, padding: "10px 20px", opacity: fetching ? 0.6 : 1 }}>
            {fetching ? "Fetching..." : "Fetch"}
          </button>
        </div>
        {fetchErr && <div style={{ fontSize: 12, color: S.yellow, fontFamily: S.mono, marginTop: 6 }}>{fetchErr}</div>}
        <div style={{ fontSize: 11, color: S.dim, marginTop: 6 }}>Or paste robots.txt content directly below ↓</div>
      </div>
      <div>
        <label style={label}>robots.txt content</label>
        <textarea value={txt} onChange={e => { setTxt(e.target.value); setResult(null); }}
          rows={10} style={{ ...input, resize: "vertical" as const, lineHeight: 1.7 }} spellCheck={false} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div><label style={label}>User-Agent</label>
          <select value={ua} onChange={e => { setUa(e.target.value); setResult(null); }} style={{ ...input, cursor: "pointer" }}>
            {BOTS.filter(b => b.name !== "*").map(b => <option key={b.name} value={b.name}>{b.label}</option>)}
          </select>
        </div>
        <div><label style={label}>URL Path to Test</label>
          <input value={tp} onChange={e => { setTp(e.target.value); setResult(null); }} style={input} placeholder="/example/path" />
        </div>
      </div>
      <button onClick={() => setResult(testUrl(parsed, ua, tp))} style={{
        padding: "12px 24px", background: S.accent, color: "#fff", border: "none", borderRadius: 8,
        fontFamily: S.sans, fontSize: 14, fontWeight: 700, cursor: "pointer",
      }}>Test URL</button>
      {result && (
        <div style={{ padding: 20, background: result.allowed ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
          border: `1px solid ${result.allowed ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}`, borderRadius: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <span style={{ padding: "6px 16px", borderRadius: 6, fontSize: 14, fontWeight: 700, fontFamily: S.sans,
              background: result.allowed ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
              color: result.allowed ? S.green : S.red,
              border: `1px solid ${result.allowed ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}` }}>
              {result.allowed ? "✓ ALLOWED" : "✕ BLOCKED"}
            </span>
            <span style={{ fontFamily: S.mono, fontSize: 13, color: S.dim }}>{ua}</span>
          </div>
          <div style={{ fontSize: 13, fontFamily: S.mono, color: S.text }}>{result.reason}</div>
          {result.group && <div style={{ fontSize: 12, fontFamily: S.mono, color: S.dim, marginTop: 8 }}>Matched group: User-agent: {result.group.agents.join(", ")}</div>}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[["Groups Found", parsed.groups.length], ["Sitemaps", parsed.sitemaps.length]].map(([l, v]) => (
          <div key={l as string} style={{ padding: 16, background: S.surfaceAlt, borderRadius: 8, border: `1px solid ${S.border}` }}>
            <div style={{ ...label, marginBottom: 8 }}>{l as string}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: S.accent, fontFamily: S.sans }}>{v as number}</div>
          </div>
        ))}
      </div>
      {parsed.sitemaps.length > 0 && <div style={{ fontSize: 13, fontFamily: S.mono, color: S.dim }}>{parsed.sitemaps.map((s, i) => <div key={i}>📄 {s}</div>)}</div>}
      {parsed.warnings.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ ...label, color: S.yellow }}>Warnings &amp; Notes</div>
          {parsed.warnings.map((w, i) => (
            <div key={i} style={{ fontSize: 13, fontFamily: S.mono, padding: "8px 12px", background: "rgba(234,179,8,0.08)",
              borderLeft: `3px solid ${S.yellow}`, borderRadius: "0 4px 4px 0", color: S.text }}>
              <span style={{ color: S.dim }}>Line {w.line}:</span> {w.msg}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Builder() {
  const [groups, setGroups] = useState<BuilderGroup[]>([{ agent: "*", rules: [{ type: "disallow", path: "/admin/" }] }]);
  const [sitemaps, setSitemaps] = useState([""]);
  const [copied, setCopied] = useState(false);
  const output = useMemo(() => generate(groups, sitemaps), [groups, sitemaps]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "24px 0" }}>
      {groups.map((g, gi) => (
        <div key={gi} style={{ padding: 16, background: S.surfaceAlt, border: `1px solid ${S.border}`, borderRadius: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <label style={{ ...label, marginBottom: 0, whiteSpace: "nowrap" }}>User-Agent</label>
            <select value={g.agent} onChange={e => { const n = [...groups]; n[gi] = { ...n[gi], agent: e.target.value }; setGroups(n); }}
              style={{ ...input, flex: 1, cursor: "pointer" }}>
              {BOTS.map(b => <option key={b.name} value={b.name}>{b.label}</option>)}
            </select>
            {groups.length > 1 && <button onClick={() => setGroups(groups.filter((_, i) => i !== gi))} style={{ ...btn, color: S.red }}>✕</button>}
          </div>
          {g.rules.map((r, ri) => (
            <div key={ri} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
              <select value={r.type} onChange={e => { const n = [...groups]; const nr = [...n[gi].rules]; nr[ri] = { ...nr[ri], type: e.target.value }; n[gi] = { ...n[gi], rules: nr }; setGroups(n); }}
                style={{ ...input, width: 120, cursor: "pointer" }}>
                <option value="disallow">Disallow</option><option value="allow">Allow</option>
              </select>
              <input value={r.path} onChange={e => { const n = [...groups]; const nr = [...n[gi].rules]; nr[ri] = { ...nr[ri], path: e.target.value }; n[gi] = { ...n[gi], rules: nr }; setGroups(n); }}
                style={{ ...input, flex: 1 }} placeholder="/path/" />
              <button onClick={() => { const n = [...groups]; n[gi] = { ...n[gi], rules: n[gi].rules.filter((_, i) => i !== ri) }; setGroups(n); }}
                style={{ ...btn, color: S.red, padding: "6px 10px" }}>✕</button>
            </div>
          ))}
          <button onClick={() => { const n = [...groups]; n[gi] = { ...n[gi], rules: [...n[gi].rules, { type: "disallow", path: "/" }] }; setGroups(n); }}
            style={{ ...btn, marginTop: 6 }}>+ Add Rule</button>
        </div>
      ))}
      <button onClick={() => setGroups([...groups, { agent: "*", rules: [] }])} style={{ ...btn, borderColor: S.accent, color: S.accent }}>+ Add Bot Group</button>
      <div>
        <label style={label}>Sitemaps</label>
        {sitemaps.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
            <input value={s} onChange={e => { const n = [...sitemaps]; n[i] = e.target.value; setSitemaps(n); }}
              style={{ ...input, flex: 1 }} placeholder="https://example.com/sitemap.xml" />
            {sitemaps.length > 1 && <button onClick={() => setSitemaps(sitemaps.filter((_, j) => j !== i))} style={{ ...btn, color: S.red, padding: "6px 10px" }}>✕</button>}
          </div>
        ))}
        <button onClick={() => setSitemaps([...sitemaps, ""])} style={btn}>+ Add Sitemap</button>
      </div>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <label style={label}>Generated robots.txt</label>
          <button onClick={() => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            style={{ ...btn, color: copied ? S.green : S.accent, borderColor: copied ? "rgba(34,197,94,0.3)" : S.accent }}>
            {copied ? "✓ Copied!" : "Copy"}
          </button>
        </div>
        <pre style={{ fontFamily: S.mono, fontSize: 13, lineHeight: 1.7, padding: 16, background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8, color: S.green, whiteSpace: "pre-wrap", margin: 0 }}>
          {output}
        </pre>
      </div>
    </div>
  );
}

export default function RobotsTxtPage() {
  const [tab, setTab] = useState("validator");
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px 48px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>robots.txt Tool</h1>
      <p style={{ fontSize: 13, color: S.dim, margin: "0 0 20px" }}>Validate, test, and build robots.txt files — following Google&apos;s specification (RFC 9309).</p>
      <div style={{ display: "flex", borderBottom: `1px solid ${S.border}` }}>
        {["Validator", "Builder"].map(t => (
          <button key={t} onClick={() => setTab(t.toLowerCase())} style={{
            fontFamily: S.sans, fontSize: 14, fontWeight: tab === t.toLowerCase() ? 700 : 500,
            padding: "12px 28px", background: "transparent", color: tab === t.toLowerCase() ? S.accent : S.dim,
            border: "none", borderBottom: tab === t.toLowerCase() ? `2px solid ${S.accent}` : "2px solid transparent", cursor: "pointer",
          }}>{t === "Validator" ? "🔍 " : "🔧 "}{t}</button>
        ))}
      </div>
      {tab === "validator" ? <Validator /> : <Builder />}
      <div style={{ marginTop: 32, padding: 16, background: S.surfaceAlt, borderRadius: 8, border: `1px solid ${S.border}`, fontSize: 12, color: S.dim, fontFamily: S.mono, lineHeight: 1.6 }}>
        <strong style={{ color: S.text }}>Key spec notes:</strong> robots.txt manages crawler access, NOT indexing. Use <code>noindex</code> to prevent indexing.
        Path matching is case-sensitive. Longest path wins; ties go to Allow. Google ignores <code>crawl-delay</code>. Max 500 KiB, UTF-8, served at root.
      </div>
    </div>
  );
}
