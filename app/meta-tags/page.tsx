"use client";
import { useState } from "react";

const S = {
  bg: "#0a0e17", surface: "#111827", surfaceAlt: "#1a2236", border: "#1e2a42",
  text: "#e2e8f0", dim: "#64748b", accent: "#3b82f6", green: "#22c55e",
  red: "#ef4444", yellow: "#eab308",
  mono: "'IBM Plex Mono', monospace", sans: "'DM Sans', system-ui, sans-serif",
};
const label: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: S.dim, fontFamily: S.sans, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6, display: "block" };
const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "10px 12px", fontFamily: S.mono, fontSize: 13, background: S.surfaceAlt, border: `1px solid ${S.border}`, borderRadius: 6, color: S.text, outline: "none" };
const btn: React.CSSProperties = { padding: "6px 14px", fontSize: 12, fontWeight: 600, fontFamily: S.sans, borderRadius: 6, border: `1px solid ${S.border}`, background: S.surfaceAlt, color: S.text, cursor: "pointer" };

const TITLE_MAX = 60;
const DESC_MAX = 155;

function Counter({ current, max }: { current: number; max: number }) {
  const over = current > max;
  const warn = current > max * 0.9 && !over;
  const color = over ? S.red : warn ? S.yellow : S.dim;
  return (
    <span style={{ fontSize: 12, fontFamily: S.mono, color, fontWeight: over ? 700 : 400 }}>
      {current}/{max} {over && "⚠️ Too long — will be truncated"}
    </span>
  );
}

function SerpPreview({ url, title, description }: { url: string; title: string; description: string }) {
  const displayUrl = (() => {
    try {
      const u = new URL(url.startsWith("http") ? url : "https://" + url);
      const parts = u.pathname.split("/").filter(Boolean);
      let breadcrumb = u.host;
      if (parts.length) breadcrumb += " › " + parts.join(" › ");
      return breadcrumb;
    } catch { return url || "example.com"; }
  })();

  const truncTitle = title.length > TITLE_MAX ? title.slice(0, TITLE_MAX - 1) + "…" : title;
  const truncDesc = description.length > DESC_MAX ? description.slice(0, DESC_MAX - 1) + "…" : description;

  return (
    <div style={{
      background: "#fff", borderRadius: 12, padding: "20px 24px",
      maxWidth: 600, fontFamily: "Arial, sans-serif",
    }}>
      <div style={{ fontSize: 14, color: "#202124", marginBottom: 2 }}>
        <span style={{ fontSize: 12, color: "#4d5156" }}>{displayUrl}</span>
      </div>
      <div style={{
        fontSize: 20, color: "#1a0dab", lineHeight: 1.3,
        marginBottom: 4, cursor: "pointer",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {truncTitle || "Page Title Goes Here"}
      </div>
      <div style={{ fontSize: 14, color: "#4d5156", lineHeight: 1.58 }}>
        {truncDesc || "Your meta description will appear here. Write a compelling summary of the page content to encourage clicks from search results."}
      </div>
    </div>
  );
}

export default function MetaTagsPage() {
  const [url, setUrl] = useState("https://example.com/product/shoes");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [copied, setCopied] = useState(false);

  const htmlSnippet = `<title>${title}</title>\n<meta name="description" content="${desc}">`;

  const titleWarnings: string[] = [];
  if (title.length === 0) titleWarnings.push("Title is empty — Google will auto-generate one.");
  if (title.length > 0 && title.length < 30) titleWarnings.push("Title is very short. Aim for 50-60 characters to maximize SERP real estate.");
  if (title.length > TITLE_MAX) titleWarnings.push(`Title exceeds ${TITLE_MAX} characters — Google will likely truncate it.`);
  if (title && !title.includes(" ")) titleWarnings.push("Title has no spaces — is this intentional?");
  if (title.toUpperCase() === title && title.length > 5) titleWarnings.push("ALL CAPS titles may be rewritten by Google. Use normal casing.");

  const descWarnings: string[] = [];
  if (desc.length === 0) descWarnings.push("Description is empty — Google will auto-generate one from page content.");
  if (desc.length > 0 && desc.length < 70) descWarnings.push("Description is short. Aim for 120-155 characters for best results.");
  if (desc.length > DESC_MAX) descWarnings.push(`Description exceeds ${DESC_MAX} characters — it will be truncated in search results.`);
  if (desc && !desc.includes(" ")) descWarnings.push("Description has no spaces — is this correct?");

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px 48px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>Meta Title & Description Creator</h1>
      <p style={{ fontSize: 13, color: S.dim, margin: "0 0 24px", lineHeight: 1.5 }}>
        Craft SEO-optimized titles (≤60 chars) and descriptions (≤155 chars) with a live Google SERP preview.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* URL */}
        <div>
          <label style={label}>Page URL</label>
          <input value={url} onChange={e => setUrl(e.target.value)} style={input} placeholder="https://example.com/page" />
          <div style={{ fontSize: 11, color: S.dim, marginTop: 4 }}>Used for the breadcrumb display in the SERP preview</div>
        </div>

        {/* Title */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label style={label}>Meta Title</label>
            <Counter current={title.length} max={TITLE_MAX} />
          </div>
          <input value={title} onChange={e => setTitle(e.target.value)} style={{
            ...input,
            borderColor: title.length > TITLE_MAX ? S.red : S.border,
          }} placeholder="Primary Keyword — Brand Name" maxLength={100} />
          <div style={{ fontSize: 11, color: S.dim, marginTop: 4 }}>
            Best practice: Primary keyword first, brand name last. 50-60 characters ideal.
          </div>
          <div style={{ marginTop: 6, height: 6, borderRadius: 3, background: S.surfaceAlt, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 3, transition: "width 0.2s, background 0.2s",
              width: `${Math.min(100, (title.length / TITLE_MAX) * 100)}%`,
              background: title.length > TITLE_MAX ? S.red : title.length > TITLE_MAX * 0.8 ? S.yellow : S.green,
            }} />
          </div>
        </div>

        {/* Description */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label style={label}>Meta Description</label>
            <Counter current={desc.length} max={DESC_MAX} />
          </div>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} style={{
            ...input, resize: "vertical" as const, lineHeight: 1.6,
            borderColor: desc.length > DESC_MAX ? S.red : S.border,
          }} placeholder="Write a compelling summary of this page. Include a call-to-action and target keyword." maxLength={300} />
          <div style={{ fontSize: 11, color: S.dim, marginTop: 4 }}>
            Best practice: Include target keyword naturally, add a CTA, stay under 155 characters. Google may still choose its own snippet.
          </div>
          <div style={{ marginTop: 6, height: 6, borderRadius: 3, background: S.surfaceAlt, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 3, transition: "width 0.2s, background 0.2s",
              width: `${Math.min(100, (desc.length / DESC_MAX) * 100)}%`,
              background: desc.length > DESC_MAX ? S.red : desc.length > DESC_MAX * 0.8 ? S.yellow : S.green,
            }} />
          </div>
        </div>
      </div>

      {/* SERP Preview */}
      <div style={{ marginTop: 32 }}>
        <label style={{ ...label, marginBottom: 12 }}>Google SERP Preview</label>
        <SerpPreview url={url} title={title} description={desc} />
      </div>

      {/* Warnings */}
      {(titleWarnings.length > 0 || descWarnings.length > 0) && (
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ ...label, color: S.yellow }}>SEO Checks</label>
          {[...titleWarnings.map(w => `Title: ${w}`), ...descWarnings.map(w => `Description: ${w}`)].map((w, i) => (
            <div key={i} style={{
              fontSize: 13, fontFamily: S.mono, padding: "8px 12px",
              background: "rgba(234,179,8,0.08)", borderLeft: `3px solid ${S.yellow}`,
              borderRadius: "0 4px 4px 0", color: S.text,
            }}>{w}</div>
          ))}
        </div>
      )}

      {/* HTML Output */}
      <div style={{ marginTop: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <label style={label}>HTML Code</label>
          <button onClick={() => { navigator.clipboard.writeText(htmlSnippet); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            style={{ ...btn, color: copied ? S.green : S.accent, borderColor: copied ? "rgba(34,197,94,0.3)" : S.accent }}>
            {copied ? "✓ Copied!" : "Copy HTML"}
          </button>
        </div>
        <pre style={{
          fontFamily: S.mono, fontSize: 13, lineHeight: 1.7, padding: 16,
          background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8,
          color: S.green, whiteSpace: "pre-wrap", margin: 0,
        }}>
          {htmlSnippet}
        </pre>
      </div>

      <div style={{ marginTop: 32, padding: 16, background: S.surfaceAlt, borderRadius: 8, border: `1px solid ${S.border}`, fontSize: 12, color: S.dim, fontFamily: S.mono, lineHeight: 1.6 }}>
        <strong style={{ color: S.text }}>Notes:</strong> Google may rewrite your title and description. Titles are best at 50-60 characters.
        Descriptions should be 120-155 characters. Google uses <code>&lt;title&gt;</code> and <code>meta description</code> as hints, not guarantees.
        Always include your primary keyword early in the title.
      </div>
    </div>
  );
}
