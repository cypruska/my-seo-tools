"use client";
import { useState, useMemo } from "react";

// ── Types ────────────────────────────────────────────────────────────────

interface Rule {
  type: string;
  path: string;
  line: number;
}

interface Group {
  agents: string[];
  rules: Rule[];
  lineStart: number;
}

interface Warning {
  line: number;
  msg: string;
}

interface ParseResult {
  groups: Group[];
  sitemaps: string[];
  warnings: Warning[];
}

interface TestResult {
  allowed: boolean;
  reason: string;
  matchedRule: Rule | null;
  group: Group | null;
}

interface BuilderRule {
  type: string;
  path: string;
}

interface BuilderGroup {
  agent: string;
  rules: BuilderRule[];
}

// ── Known Bots ───────────────────────────────────────────────────────────

const KNOWN_BOTS = [
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

// ── Parser Engine (Google spec / RFC 9309) ───────────────────────────────

function parseRobotsTxt(raw: string): ParseResult {
  const lines = raw.split(/\r?\n/);
  const groups: Group[] = [];
  const sitemaps: string[] = [];
  const warnings: Warning[] = [];
  let current: Group | null = null;

  lines.forEach((originalLine, idx) => {
    const commentIdx = originalLine.indexOf("#");
    const line = (commentIdx >= 0 ? originalLine.slice(0, commentIdx) : originalLine).trim();
    if (!line) return;

    const match = line.match(/^([a-z\-]+)\s*:\s*(.*)/i);
    if (!match) {
      warnings.push({ line: idx + 1, msg: `Invalid syntax: "${originalLine.trim()}"` });
      return;
    }

    const field = match[1].toLowerCase();
    const value = match[2].trim();

    if (field === "user-agent") {
      if (current && current.rules.length === 0 && current.agents.length > 0) {
        current.agents.push(value.toLowerCase());
      } else {
        current = { agents: [value.toLowerCase()], rules: [], lineStart: idx + 1 };
        groups.push(current);
      }
    } else if (field === "allow" || field === "disallow") {
      if (!current) {
        warnings.push({ line: idx + 1, msg: `"${field}" before any User-agent` });
        return;
      }
      current.rules.push({ type: field, path: value, line: idx + 1 });
    } else if (field === "sitemap") {
      sitemaps.push(value);
    } else if (field === "crawl-delay") {
      warnings.push({ line: idx + 1, msg: `"Crawl-delay" is ignored by Google (supported by Bing/Yandex)` });
    } else {
      warnings.push({ line: idx + 1, msg: `Unknown directive: "${field}"` });
    }
  });

  groups.forEach((g) => {
    const blocksAll = g.rules.some((r) => r.type === "disallow" && r.path === "/");
    const hasAllow = g.rules.some((r) => r.type === "allow");
    if (blocksAll && !hasAllow) {
      const names = g.agents.join(", ");
      warnings.push({
        line: g.lineStart,
        msg: `⚠️ Blocking ALL crawling for "${names}". This does NOT prevent indexing — use noindex instead.`,
      });
    }
  });

  return { groups, sitemaps, warnings };
}

function pathToRegex(pattern: string): RegExp {
  let re = "";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "*") {
      re += ".*";
    } else if (c === "$" && i === pattern.length - 1) {
      re += "$";
    } else {
      re += c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp("^" + re);
}

function testUrl(parsed: ParseResult, userAgent: string, urlPath: string): TestResult {
  const ua = userAgent.toLowerCase();
  let bestGroup: Group | null = null;
  let bestSpecificity = -1;

  parsed.groups.forEach((g) => {
    g.agents.forEach((agent) => {
      if (agent === "*") {
        if (bestSpecificity < 0) {
          bestGroup = g;
          bestSpecificity = 0;
        }
      } else if (ua.includes(agent) || agent.includes(ua)) {
        const spec = agent.length;
        if (spec > bestSpecificity) {
          bestGroup = g;
          bestSpecificity = spec;
        }
      }
    });
  });

  if (!bestGroup || (bestGroup as Group).rules.length === 0) {
    return { allowed: true, reason: "No matching rules found — crawling allowed by default.", matchedRule: null, group: bestGroup };
  }

  let bestRule: Rule | null = null;
  let bestLen = -1;

  (bestGroup as Group).rules.forEach((r) => {
    if (r.path === "" && r.type === "disallow") return;
    if (!r.path) return;
    const regex = pathToRegex(r.path);
    if (regex.test(urlPath)) {
      const specificity = r.path.replace(/\*/g, "").length;
      if (specificity > bestLen) {
        bestLen = specificity;
        bestRule = r;
      } else if (specificity === bestLen && r.type === "allow") {
        bestRule = r;
      }
    }
  });

  if (!bestRule) {
    return { allowed: true, reason: "No rules match this path — allowed by default.", matchedRule: null, group: bestGroup };
  }

  const allowed = (bestRule as Rule).type === "allow";
  return {
    allowed,
    reason: `Matched "${(bestRule as Rule).type}: ${(bestRule as Rule).path}" on line ${(bestRule as Rule).line}`,
    matchedRule: bestRule,
    group: bestGroup,
  };
}

// ── Builder helpers ──────────────────────────────────────────────────────

function generateRobotsTxt(builderGroups: BuilderGroup[], builderSitemaps: string[]): string {
  let out = "";
  builderGroups.forEach((g, i) => {
    if (i > 0) out += "\n";
    out += `User-agent: ${g.agent}\n`;
    g.rules.forEach((r) => {
      out += `${r.type === "allow" ? "Allow" : "Disallow"}: ${r.path}\n`;
    });
  });
  if (builderSitemaps.length) {
    out += "\n";
    builderSitemaps.forEach((s) => {
      if (s.trim()) out += `Sitemap: ${s.trim()}\n`;
    });
  }
  return out;
}

// ── Theme ────────────────────────────────────────────────────────────────

const FONT = `'IBM Plex Mono', 'Fira Code', 'SF Mono', monospace`;
const SANS = `'DM Sans', 'Helvetica Neue', system-ui, sans-serif`;

const t = {
  bg: "#0a0e17",
  surface: "#111827",
  surfaceAlt: "#1a2236",
  border: "#1e2a42",
  borderFocus: "#3b82f6",
  text: "#e2e8f0",
  textDim: "#64748b",
  accent: "#3b82f6",
  accentGlow: "rgba(59,130,246,0.15)",
  green: "#22c55e",
  greenBg: "rgba(34,197,94,0.08)",
  red: "#ef4444",
  redBg: "rgba(239,68,68,0.08)",
  yellow: "#eab308",
  yellowBg: "rgba(234,179,8,0.08)",
  mono: FONT,
  sans: SANS,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, color: t.textDim, fontFamily: t.sans,
  letterSpacing: "0.05em", textTransform: "uppercase" as const, marginBottom: 8, display: "block",
};

const inputBase: React.CSSProperties = {
  width: "100%", boxSizing: "border-box" as const, padding: "10px 12px",
  fontFamily: t.mono, fontSize: 13, background: t.surfaceAlt,
  border: `1px solid ${t.border}`, borderRadius: 6, color: t.text, outline: "none",
};

const smallBtn: React.CSSProperties = {
  padding: "6px 14px", fontSize: 12, fontWeight: 600, fontFamily: t.sans,
  borderRadius: 6, border: `1px solid ${t.border}`, background: t.surfaceAlt,
  color: t.text, cursor: "pointer",
};

// ── Tabs ─────────────────────────────────────────────────────────────────

function Tabs({ active, onChange }: { active: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${t.border}` }}>
      {["Validator", "Builder"].map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab.toLowerCase())}
          style={{
            fontFamily: t.sans, fontSize: 14,
            fontWeight: active === tab.toLowerCase() ? 700 : 500,
            padding: "12px 28px",
            background: active === tab.toLowerCase() ? t.surface : "transparent",
            color: active === tab.toLowerCase() ? t.accent : t.textDim,
            border: "none",
            borderBottom: active === tab.toLowerCase() ? `2px solid ${t.accent}` : "2px solid transparent",
            cursor: "pointer", letterSpacing: "0.02em",
          }}
        >
          {tab === "Validator" ? "🔍 " : "🔧 "}{tab}
        </button>
      ))}
    </div>
  );
}

function Badge({ allowed }: { allowed: boolean }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "6px 16px", borderRadius: 6, fontSize: 14, fontWeight: 700, fontFamily: t.sans,
      background: allowed ? t.greenBg : t.redBg,
      color: allowed ? t.green : t.red,
      border: `1px solid ${allowed ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
    }}>
      {allowed ? "✓ ALLOWED" : "✕ BLOCKED"}
    </span>
  );
}

function WarningList({ warnings }: { warnings: Warning[] }) {
  if (!warnings.length) return null;
  return (
    <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ ...labelStyle, color: t.yellow }}>Warnings &amp; Notes</div>
      {warnings.map((w, i) => (
        <div key={i} style={{
          fontSize: 13, fontFamily: t.mono, padding: "8px 12px",
          background: t.yellowBg, borderLeft: `3px solid ${t.yellow}`,
          borderRadius: "0 4px 4px 0", color: t.text,
        }}>
          <span style={{ color: t.textDim }}>Line {w.line}:</span> {w.msg}
        </div>
      ))}
    </div>
  );
}

// ── Validator ────────────────────────────────────────────────────────────

function Validator() {
  const [robotsTxt, setRobotsTxt] = useState(
    `User-agent: *\nDisallow: /admin/\nDisallow: /private/\nAllow: /admin/public/\n\nUser-agent: GPTBot\nDisallow: /\n\nSitemap: https://example.com/sitemap.xml`
  );
  const [fetchUrl, setFetchUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [testUA, setTestUA] = useState("Googlebot");
  const [testPath, setTestPath] = useState("/admin/public/page.html");
  const [result, setResult] = useState<TestResult | null>(null);

  const parsed = useMemo(() => parseRobotsTxt(robotsTxt), [robotsTxt]);

  const handleFetch = async () => {
    setFetchError("");
    let url = fetchUrl.trim();
    if (!url) return;
    if (!url.startsWith("http")) url = "https://" + url;
    // Strip trailing path and append /robots.txt
    try {
      const u = new URL(url);
      const robotsUrl = `${u.protocol}//${u.host}/robots.txt`;
      setFetching(true);
      const res = await fetch(robotsUrl);
      if (!res.ok) {
        setFetchError(`HTTP ${res.status} — no robots.txt found at ${robotsUrl}`);
        setFetching(false);
        return;
      }
      const text = await res.text();
      setRobotsTxt(text);
      setResult(null);
    } catch {
      setFetchError("Could not fetch. The site may block cross-origin requests. Try pasting the robots.txt content manually.");
    }
    setFetching(false);
  };

  const handleTest = () => {
    const r = testUrl(parsed, testUA, testPath);
    setResult(r);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "24px 0" }}>

      {/* URL Fetch */}
      <div>
        <label style={labelStyle}>Fetch robots.txt from a URL</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={fetchUrl}
            onChange={(e) => setFetchUrl(e.target.value)}
            style={{ ...inputBase, flex: 1 }}
            placeholder="example.com or https://example.com"
            onKeyDown={(e) => e.key === "Enter" && handleFetch()}
          />
          <button
            onClick={handleFetch}
            disabled={fetching}
            style={{
              ...smallBtn, background: t.accent, color: "#fff",
              borderColor: t.accent, padding: "10px 20px",
              opacity: fetching ? 0.6 : 1,
            }}
          >
            {fetching ? "Fetching..." : "Fetch"}
          </button>
        </div>
        {fetchError && (
          <div style={{ fontSize: 12, color: t.yellow, fontFamily: t.mono, marginTop: 6 }}>
            {fetchError}
          </div>
        )}
        <div style={{ fontSize: 11, color: t.textDim, fontFamily: t.sans, marginTop: 6 }}>
          Or paste robots.txt content directly below ↓
        </div>
      </div>

      {/* robots.txt textarea */}
      <div>
        <label style={labelStyle}>robots.txt content</label>
        <textarea
          value={robotsTxt}
          onChange={(e) => { setRobotsTxt(e.target.value); setResult(null); }}
          rows={10}
          style={{ ...inputBase, resize: "vertical" as const, lineHeight: 1.7 }}
          spellCheck={false}
        />
      </div>

      {/* Test inputs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={labelStyle}>User-Agent</label>
          <select
            value={testUA}
            onChange={(e) => { setTestUA(e.target.value); setResult(null); }}
            style={{ ...inputBase, cursor: "pointer" }}
          >
            {KNOWN_BOTS.filter((b) => b.name !== "*").map((b) => (
              <option key={b.name} value={b.name}>{b.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>URL Path to Test</label>
          <input
            value={testPath}
            onChange={(e) => { setTestPath(e.target.value); setResult(null); }}
            style={inputBase}
            placeholder="/example/path"
          />
        </div>
      </div>

      <button
        onClick={handleTest}
        style={{
          padding: "12px 24px", background: t.accent, color: "#fff",
          border: "none", borderRadius: 8, fontFamily: t.sans,
          fontSize: 14, fontWeight: 700, cursor: "pointer",
          boxShadow: `0 0 20px ${t.accentGlow}`,
        }}
      >
        Test URL
      </button>

      {/* Result */}
      {result && (
        <div style={{
          padding: 20,
          background: result.allowed ? t.greenBg : t.redBg,
          border: `1px solid ${result.allowed ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}`,
          borderRadius: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <Badge allowed={result.allowed} />
            <span style={{ fontFamily: t.mono, fontSize: 13, color: t.textDim }}>{testUA}</span>
          </div>
          <div style={{ fontSize: 13, fontFamily: t.mono, color: t.text }}>{result.reason}</div>
          {result.group && (
            <div style={{ fontSize: 12, fontFamily: t.mono, color: t.textDim, marginTop: 8 }}>
              Matched group: User-agent: {result.group.agents.join(", ")}
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ padding: 16, background: t.surfaceAlt, borderRadius: 8, border: `1px solid ${t.border}` }}>
          <div style={{ ...labelStyle, marginBottom: 8 }}>Groups Found</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: t.accent, fontFamily: t.sans }}>{parsed.groups.length}</div>
        </div>
        <div style={{ padding: 16, background: t.surfaceAlt, borderRadius: 8, border: `1px solid ${t.border}` }}>
          <div style={{ ...labelStyle, marginBottom: 8 }}>Sitemaps</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: t.accent, fontFamily: t.sans }}>{parsed.sitemaps.length}</div>
        </div>
      </div>

      {parsed.sitemaps.length > 0 && (
        <div style={{ fontSize: 13, fontFamily: t.mono, color: t.textDim }}>
          {parsed.sitemaps.map((s, i) => <div key={i}>📄 {s}</div>)}
        </div>
      )}

      <WarningList warnings={parsed.warnings} />
    </div>
  );
}

// ── Builder ──────────────────────────────────────────────────────────────

function Builder() {
  const [groups, setGroups] = useState<BuilderGroup[]>([
    { agent: "*", rules: [{ type: "disallow", path: "/admin/" }] },
  ]);
  const [sitemaps, setSitemaps] = useState<string[]>([""]);
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => generateRobotsTxt(groups, sitemaps), [groups, sitemaps]);

  const addGroup = () => setGroups([...groups, { agent: "*", rules: [] }]);
  const removeGroup = (gi: number) => setGroups(groups.filter((_, i) => i !== gi));
  const updateAgent = (gi: number, val: string) => {
    const ng = [...groups];
    ng[gi] = { ...ng[gi], agent: val };
    setGroups(ng);
  };
  const addRule = (gi: number) => {
    const ng = [...groups];
    ng[gi] = { ...ng[gi], rules: [...ng[gi].rules, { type: "disallow", path: "/" }] };
    setGroups(ng);
  };
  const updateRule = (gi: number, ri: number, field: string, val: string) => {
    const ng = [...groups];
    const nr = [...ng[gi].rules];
    nr[ri] = { ...nr[ri], [field]: val };
    ng[gi] = { ...ng[gi], rules: nr };
    setGroups(ng);
  };
  const removeRule = (gi: number, ri: number) => {
    const ng = [...groups];
    ng[gi] = { ...ng[gi], rules: ng[gi].rules.filter((_, i) => i !== ri) };
    setGroups(ng);
  };

  const copyOutput = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "24px 0" }}>
      {groups.map((g, gi) => (
        <div key={gi} style={{
          padding: 16, background: t.surfaceAlt,
          border: `1px solid ${t.border}`, borderRadius: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <label style={{ ...labelStyle, marginBottom: 0, whiteSpace: "nowrap" as const }}>User-Agent</label>
            <select
              value={g.agent}
              onChange={(e) => updateAgent(gi, e.target.value)}
              style={{ ...inputBase, flex: 1, cursor: "pointer" }}
            >
              {KNOWN_BOTS.map((b) => (
                <option key={b.name} value={b.name}>{b.label}</option>
              ))}
            </select>
            {groups.length > 1 && (
              <button onClick={() => removeGroup(gi)} style={{ ...smallBtn, color: t.red, borderColor: "rgba(239,68,68,0.2)" }}>✕</button>
            )}
          </div>

          {g.rules.map((r, ri) => (
            <div key={ri} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
              <select
                value={r.type}
                onChange={(e) => updateRule(gi, ri, "type", e.target.value)}
                style={{ ...inputBase, width: 120, cursor: "pointer" }}
              >
                <option value="disallow">Disallow</option>
                <option value="allow">Allow</option>
              </select>
              <input
                value={r.path}
                onChange={(e) => updateRule(gi, ri, "path", e.target.value)}
                style={{ ...inputBase, flex: 1 }}
                placeholder="/path/"
              />
              <button onClick={() => removeRule(gi, ri)} style={{ ...smallBtn, color: t.red, borderColor: "rgba(239,68,68,0.2)", padding: "6px 10px" }}>✕</button>
            </div>
          ))}

          <button onClick={() => addRule(gi)} style={{ ...smallBtn, marginTop: 6 }}>+ Add Rule</button>
        </div>
      ))}

      <button onClick={addGroup} style={{ ...smallBtn, borderColor: t.accent, color: t.accent }}>+ Add Bot Group</button>

      {/* Sitemaps */}
      <div>
        <label style={labelStyle}>Sitemaps</label>
        {sitemaps.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
            <input
              value={s}
              onChange={(e) => {
                const ns = [...sitemaps];
                ns[i] = e.target.value;
                setSitemaps(ns);
              }}
              style={{ ...inputBase, flex: 1 }}
              placeholder="https://example.com/sitemap.xml"
            />
            {sitemaps.length > 1 && (
              <button onClick={() => setSitemaps(sitemaps.filter((_, j) => j !== i))} style={{ ...smallBtn, color: t.red, borderColor: "rgba(239,68,68,0.2)", padding: "6px 10px" }}>✕</button>
            )}
          </div>
        ))}
        <button onClick={() => setSitemaps([...sitemaps, ""])} style={smallBtn}>+ Add Sitemap</button>
      </div>

      {/* Output */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <label style={labelStyle}>Generated robots.txt</label>
          <button
            onClick={copyOutput}
            style={{
              ...smallBtn,
              background: copied ? t.greenBg : t.surfaceAlt,
              color: copied ? t.green : t.accent,
              borderColor: copied ? "rgba(34,197,94,0.3)" : t.accent,
            }}
          >
            {copied ? "✓ Copied!" : "Copy"}
          </button>
        </div>
        <pre style={{
          fontFamily: t.mono, fontSize: 13, lineHeight: 1.7,
          padding: 16, background: t.bg, border: `1px solid ${t.border}`,
          borderRadius: 8, color: t.green, overflowX: "auto" as const,
          whiteSpace: "pre-wrap" as const, margin: 0,
        }}>
          {output}
        </pre>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────

export default function RobotsTxtTool() {
  const [tab, setTab] = useState("validator");

  return (
    <div style={{
      minHeight: "100vh", background: t.bg,
      color: t.text, fontFamily: t.sans, padding: "0 0 40px",
    }}>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      <div style={{ padding: "32px 24px 0", maxWidth: 720, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: `linear-gradient(135deg, ${t.accent}, #8b5cf6)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 800, color: "#fff",
            boxShadow: `0 0 24px ${t.accentGlow}`,
          }}>R</div>
          <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>
            robots.txt Tool
          </span>
        </div>
        <p style={{ fontSize: 13, color: t.textDim, margin: "8px 0 20px", lineHeight: 1.5 }}>
          Validate, test, and build robots.txt files — following Google&apos;s specification (RFC 9309).
        </p>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px" }}>
        <Tabs active={tab} onChange={setTab} />
        {tab === "validator" ? <Validator /> : <Builder />}
      </div>

      <div style={{ maxWidth: 720, margin: "32px auto 0", padding: "0 24px" }}>
        <div style={{
          padding: 16, background: t.surfaceAlt, borderRadius: 8,
          border: `1px solid ${t.border}`, fontSize: 12, color: t.textDim,
          fontFamily: t.mono, lineHeight: 1.6,
        }}>
          <strong style={{ color: t.text }}>Key spec notes:</strong> robots.txt manages crawler access, NOT indexing. To prevent indexing use <code>noindex</code>.
          Path matching is case-sensitive. On conflicting rules, longest path wins; on ties, Allow wins.
          Google ignores <code>crawl-delay</code>. File must be UTF-8, max 500 KiB, served at root (<code>/robots.txt</code>).
        </div>
      </div>
    </div>
  );
}
