"use client";
import { useState } from "react";

const S = {
  bg: "#0a0e17", surfaceAlt: "#1a2236", border: "#1e2a42",
  text: "#e2e8f0", dim: "#64748b", accent: "#3b82f6", green: "#22c55e",
  red: "#ef4444", yellow: "#eab308", purple: "#8b5cf6",
  mono: "'IBM Plex Mono', monospace", sans: "'DM Sans', system-ui, sans-serif",
};
const label: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: S.dim, fontFamily: S.sans, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6, display: "block" };
const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "10px 12px", fontFamily: S.mono, fontSize: 13, background: S.surfaceAlt, border: `1px solid ${S.border}`, borderRadius: 6, color: S.text, outline: "none" };
const btn: React.CSSProperties = { padding: "6px 14px", fontSize: 12, fontWeight: 600, fontFamily: S.sans, borderRadius: 6, border: `1px solid ${S.border}`, background: S.surfaceAlt, color: S.text, cursor: "pointer" };

const TITLE_MAX = 60;
const DESC_MAX = 155;

interface Option { title: string; description: string; angle: string }

function Counter({ current, max }: { current: number; max: number }) {
  const over = current > max;
  const color = over ? S.red : current > max * 0.9 ? S.yellow : S.dim;
  return <span style={{ fontSize: 12, fontFamily: S.mono, color, fontWeight: over ? 700 : 400 }}>{current}/{max}{over && " ⚠️ Too long"}</span>;
}

function ProgressBar({ current, max }: { current: number; max: number }) {
  return (
    <div style={{ marginTop: 6, height: 6, borderRadius: 3, background: S.surfaceAlt, overflow: "hidden" }}>
      <div style={{
        height: "100%", borderRadius: 3, transition: "width 0.2s, background 0.2s",
        width: `${Math.min(100, (current / max) * 100)}%`,
        background: current > max ? S.red : current > max * 0.8 ? S.yellow : S.green,
      }} />
    </div>
  );
}

function SerpPreview({ url, title, description }: { url: string; title: string; description: string }) {
  const displayUrl = (() => {
    try {
      const u = new URL(url.startsWith("http") ? url : "https://" + url);
      const parts = u.pathname.split("/").filter(Boolean);
      return u.host + (parts.length ? " › " + parts.join(" › ") : "");
    } catch { return url || "example.com"; }
  })();
  const tTitle = title.length > TITLE_MAX ? title.slice(0, TITLE_MAX - 1) + "…" : title;
  const tDesc = description.length > DESC_MAX ? description.slice(0, DESC_MAX - 1) + "…" : description;

  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", maxWidth: 600, fontFamily: "Arial, sans-serif" }}>
      <div style={{ fontSize: 12, color: "#4d5156", marginBottom: 2 }}>{displayUrl}</div>
      <div style={{ fontSize: 20, color: "#1a0dab", lineHeight: 1.3, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {tTitle || "Page Title Goes Here"}
      </div>
      <div style={{ fontSize: 14, color: "#4d5156", lineHeight: 1.58 }}>
        {tDesc || "Your meta description will appear here..."}
      </div>
    </div>
  );
}

export default function MetaTagsPage() {
  const [url, setUrl] = useState("");
  const [keywords, setKeywords] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [generating, setGenerating] = useState(false);
  const [options, setOptions] = useState<Option[]>([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [fetchedInfo, setFetchedInfo] = useState<{ fetchedTitle: string; fetchedDescription: string } | null>(null);

  const handleGenerate = async () => {
    if (!url.trim()) { setError("Enter a URL first"); return; }
    setError(""); setGenerating(true); setOptions([]);
    try {
      const res = await fetch("/api/generate-meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), keywords: keywords.trim(), currentTitle: title, currentDescription: desc }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); }
      else {
        setOptions(data.options || []);
        if (data.pageInfo) setFetchedInfo(data.pageInfo);
      }
    } catch { setError("Failed to generate. Check your connection."); }
    setGenerating(false);
  };

  const selectOption = (opt: Option) => {
    setTitle(opt.title);
    setDesc(opt.description);
  };

  const htmlSnippet = `<title>${title}</title>\n<meta name="description" content="${desc}">`;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px 48px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>
        🤖 AI Meta Title &amp; Description Creator
      </h1>
      <p style={{ fontSize: 13, color: S.dim, margin: "0 0 24px", lineHeight: 1.5 }}>
        Enter a URL and optional keywords. AI reads the page and generates SEO-optimized titles (≤60 chars) and descriptions (≤155 chars).
      </p>

      {/* AI Generation Section */}
      <div style={{ padding: 20, background: "rgba(139,92,246,0.06)", border: `1px solid rgba(139,92,246,0.15)`, borderRadius: 12, marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 16 }}>✨</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: S.purple }}>AI-Powered SEO Copywriter</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={label}>Website URL *</label>
            <input value={url} onChange={e => setUrl(e.target.value)} style={input}
              placeholder="https://thelatestscoop.ca/" />
          </div>
          <div>
            <label style={label}>Target Keywords <span style={{ fontWeight: 400, opacity: 0.6 }}>(1-3, comma separated)</span></label>
            <input value={keywords} onChange={e => setKeywords(e.target.value)} style={input}
              placeholder="immigration services, visa canada, work permit" />
          </div>
          <button onClick={handleGenerate} disabled={generating}
            style={{
              padding: "12px 24px", background: `linear-gradient(135deg, ${S.accent}, ${S.purple})`,
              color: "#fff", border: "none", borderRadius: 8, fontFamily: S.sans,
              fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: generating ? 0.7 : 1,
            }}>
            {generating ? "🔄 Reading page & generating..." : "🚀 Generate with AI"}
          </button>
          {error && <div style={{ fontSize: 12, color: S.red, fontFamily: S.mono }}>{error}</div>}
        </div>
      </div>

      {/* Current page info */}
      {fetchedInfo && (fetchedInfo.fetchedTitle || fetchedInfo.fetchedDescription) && (
        <div style={{ padding: 16, background: S.surfaceAlt, borderRadius: 8, border: `1px solid ${S.border}`, marginBottom: 20 }}>
          <div style={{ ...label, marginBottom: 8, color: S.dim }}>Current page meta tags</div>
          {fetchedInfo.fetchedTitle && <div style={{ fontSize: 13, fontFamily: S.mono, color: S.text, marginBottom: 4 }}>Title: {fetchedInfo.fetchedTitle}</div>}
          {fetchedInfo.fetchedDescription && <div style={{ fontSize: 13, fontFamily: S.mono, color: S.text }}>Desc: {fetchedInfo.fetchedDescription}</div>}
        </div>
      )}

      {/* AI Generated Options */}
      {options.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <label style={{ ...label, marginBottom: 12 }}>AI Suggestions — click to use</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {options.map((opt, i) => (
              <button key={i} onClick={() => selectOption(opt)} style={{
                padding: 16, background: S.surfaceAlt, border: `1px solid ${S.border}`,
                borderRadius: 10, cursor: "pointer", textAlign: "left" as const,
                transition: "border-color 0.15s",
              }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = S.accent)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = S.border)}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: S.accent, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Option {i + 1}: {opt.angle}
                  </span>
                  <span style={{ fontSize: 11, color: S.dim }}>Click to use ↓</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1a0dab", marginBottom: 4 }}>{opt.title}</div>
                <div style={{ fontSize: 13, color: S.dim, lineHeight: 1.4 }}>{opt.description}</div>
                <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 11, fontFamily: S.mono, color: S.dim }}>
                  <span>Title: {opt.title.length}/{TITLE_MAX} {opt.title.length > TITLE_MAX ? "⚠️" : "✓"}</span>
                  <span>Desc: {opt.description.length}/{DESC_MAX} {opt.description.length > DESC_MAX ? "⚠️" : "✓"}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Manual edit */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <label style={label}>Meta Title</label>
            <Counter current={title.length} max={TITLE_MAX} />
          </div>
          <input value={title} onChange={e => setTitle(e.target.value)} style={{ ...input, borderColor: title.length > TITLE_MAX ? S.red : S.border }}
            placeholder="Primary Keyword — Brand Name" />
          <ProgressBar current={title.length} max={TITLE_MAX} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <label style={label}>Meta Description</label>
            <Counter current={desc.length} max={DESC_MAX} />
          </div>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3}
            style={{ ...input, resize: "vertical" as const, lineHeight: 1.6, borderColor: desc.length > DESC_MAX ? S.red : S.border }}
            placeholder="Write a compelling summary..." />
          <ProgressBar current={desc.length} max={DESC_MAX} />
        </div>
      </div>

      {/* SERP Preview */}
      <div style={{ marginTop: 32 }}>
        <label style={{ ...label, marginBottom: 12 }}>Google SERP Preview</label>
        <SerpPreview url={url || "example.com"} title={title} description={desc} />
      </div>

      {/* HTML Output */}
      {(title || desc) && (
        <div style={{ marginTop: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label style={label}>HTML Code</label>
            <button onClick={() => { navigator.clipboard.writeText(htmlSnippet); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
              style={{ ...btn, color: copied ? S.green : S.accent, borderColor: copied ? "rgba(34,197,94,0.3)" : S.accent }}>
              {copied ? "✓ Copied!" : "Copy HTML"}
            </button>
          </div>
          <pre style={{ fontFamily: S.mono, fontSize: 13, lineHeight: 1.7, padding: 16, background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8, color: S.green, whiteSpace: "pre-wrap", margin: 0 }}>
            {htmlSnippet}
          </pre>
        </div>
      )}

      <div style={{ marginTop: 32, padding: 16, background: S.surfaceAlt, borderRadius: 8, border: `1px solid ${S.border}`, fontSize: 12, color: S.dim, fontFamily: S.mono, lineHeight: 1.6 }}>
        <strong style={{ color: S.text }}>Notes:</strong> Google may rewrite your title and description. Titles: 50-60 chars. Descriptions: 120-155 chars.
        Include your primary keyword early in the title. Add a CTA in the description. AI generates 3 options with different angles — pick the best one and refine it.
      </div>
    </div>
  );
}
