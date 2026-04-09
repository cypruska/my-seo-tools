"use client";
import { useState, useMemo } from "react";

interface PageEntry {
  title: string;
  url: string;
  description: string;
}

const S = {
  bg: "#0a0e17", surface: "#111827", surfaceAlt: "#1a2236",
  border: "#1e2a42", text: "#e2e8f0", dim: "#64748b",
  accent: "#3b82f6", green: "#22c55e", red: "#ef4444", yellow: "#eab308",
  mono: "'IBM Plex Mono', monospace", sans: "'DM Sans', system-ui, sans-serif",
};
const label: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: S.dim, fontFamily: S.sans, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 8, display: "block" };
const input: React.CSSProperties = { width: "100%", boxSizing: "border-box" as const, padding: "10px 12px", fontFamily: S.mono, fontSize: 13, background: S.surfaceAlt, border: `1px solid ${S.border}`, borderRadius: 6, color: S.text, outline: "none" };
const btn: React.CSSProperties = { padding: "6px 14px", fontSize: 12, fontWeight: 600, fontFamily: S.sans, borderRadius: 6, border: `1px solid ${S.border}`, background: S.surfaceAlt, color: S.text, cursor: "pointer" };

const MAX_PAGES = 10;

function generateLlmsTxt(siteName: string, summary: string, additionalInfo: string, pages: PageEntry[], optionalPages: PageEntry[]): string {
  let out = `# ${siteName || "My Website"}\n\n`;
  if (summary.trim()) out += `> ${summary.trim()}\n\n`;
  if (additionalInfo.trim()) out += `${additionalInfo.trim()}\n\n`;
  const validPages = pages.filter(p => p.title.trim() && p.url.trim());
  if (validPages.length > 0) {
    out += `## Documentation\n\n`;
    validPages.forEach(p => {
      out += `- [${p.title}](${p.url})`;
      if (p.description.trim()) out += `: ${p.description.trim()}`;
      out += `\n`;
    });
    out += `\n`;
  }
  const validOptional = optionalPages.filter(p => p.title.trim() && p.url.trim());
  if (validOptional.length > 0) {
    out += `## Optional\n\n`;
    validOptional.forEach(p => {
      out += `- [${p.title}](${p.url})`;
      if (p.description.trim()) out += `: ${p.description.trim()}`;
      out += `\n`;
    });
    out += `\n`;
  }
  return out;
}

function validateLlmsTxt(raw: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const lines = raw.split(/\r?\n/);
  if (lines.length === 0 || !lines[0].startsWith("# ")) issues.push("Must start with an H1 heading (# Site Name) — required by the spec.");
  if (!lines.some(l => l.startsWith("> "))) issues.push("Missing blockquote summary (> description). Recommended for context.");
  if (!lines.some(l => l.startsWith("## "))) issues.push("No H2 sections found. Use ## headings to organize documentation links.");
  if (!lines.some(l => /\[.+\]\(.+\)/.test(l))) issues.push("No markdown links found. Add links: - [Title](url): Description");
  if (lines.some(l => /<[a-z]+[\s>]/i.test(l))) issues.push("HTML detected. llms.txt should be pure Markdown.");
  if (raw.length > 50000) issues.push(`File is ${(raw.length / 1024).toFixed(0)} KiB. Keep llms.txt concise; use llms-full.txt for complete content.`);
  return { valid: issues.length === 0, issues };
}

function BuilderTab() {
  const [siteName, setSiteName] = useState("");
  const [summary, setSummary] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [pages, setPages] = useState<PageEntry[]>([{ title: "", url: "", description: "" }]);
  const [optionalPages, setOptionalPages] = useState<PageEntry[]>([]);
  const [copied, setCopied] = useState(false);
  const output = useMemo(() => generateLlmsTxt(siteName, summary, additionalInfo, pages, optionalPages), [siteName, summary, additionalInfo, pages, optionalPages]);

  const addPage = (section: "main" | "optional") => {
    if (section === "main" && pages.length >= MAX_PAGES) return;
    if (section === "optional" && optionalPages.length >= MAX_PAGES) return;
    const entry = { title: "", url: "", description: "" };
    if (section === "main") setPages([...pages, entry]);
    else setOptionalPages([...optionalPages, entry]);
  };

  const updatePage = (section: "main" | "optional", idx: number, field: keyof PageEntry, value: string) => {
    if (section === "main") { const n = [...pages]; n[idx] = { ...n[idx], [field]: value }; setPages(n); }
    else { const n = [...optionalPages]; n[idx] = { ...n[idx], [field]: value }; setOptionalPages(n); }
  };

  const removePage = (section: "main" | "optional", idx: number) => {
    if (section === "main") setPages(pages.filter((_, i) => i !== idx));
    else setOptionalPages(optionalPages.filter((_, i) => i !== idx));
  };

  const renderPageInputs = (section: "main" | "optional", items: PageEntry[]) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((p, i) => (
        <div key={i} style={{ padding: 12, background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
            <input value={p.title} onChange={e => updatePage(section, i, "title", e.target.value)} style={{ ...input, flex: 1 }} placeholder="Page title" />
            <button onClick={() => removePage(section, i)} style={{ ...btn, color: S.red, padding: "6px 10px" }}>✕</button>
          </div>
          <input value={p.url} onChange={e => updatePage(section, i, "url", e.target.value)} style={{ ...input, marginBottom: 6 }} placeholder="https://example.com/page" />
          <input value={p.description} onChange={e => updatePage(section, i, "description", e.target.value)} style={input} placeholder="Brief description (optional)" />
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "24px 0" }}>
      <div><label style={label}>Site / Project Name *</label><input value={siteName} onChange={e => setSiteName(e.target.value)} style={input} placeholder="My Website" /></div>
      <div><label style={label}>Summary (blockquote)</label><textarea value={summary} onChange={e => setSummary(e.target.value)} rows={3} style={{ ...input, resize: "vertical" as const, lineHeight: 1.6 }} placeholder="A brief summary of your site. This helps LLMs understand the context quickly." /></div>
      <div><label style={label}>Additional Notes (optional)</label><textarea value={additionalInfo} onChange={e => setAdditionalInfo(e.target.value)} rows={2} style={{ ...input, resize: "vertical" as const, lineHeight: 1.6 }} placeholder="Important notes, compatibility info, or guidance for AI systems." /></div>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <label style={{ ...label, marginBottom: 0 }}>Documentation Pages ({pages.length}/{MAX_PAGES})</label>
          {pages.length < MAX_PAGES && <button onClick={() => addPage("main")} style={{ ...btn, borderColor: S.accent, color: S.accent }}>+ Add Page</button>}
        </div>
        {renderPageInputs("main", pages)}
      </div>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <label style={{ ...label, marginBottom: 0 }}>Optional Pages ({optionalPages.length}/{MAX_PAGES})</label>
          {optionalPages.length < MAX_PAGES && <button onClick={() => addPage("optional")} style={{ ...btn, borderColor: S.accent, color: S.accent }}>+ Add Page</button>}
        </div>
        <div style={{ fontSize: 11, color: S.dim, marginBottom: 8 }}>Less critical resources — supplementary docs, blog posts, changelogs.</div>
        {renderPageInputs("optional", optionalPages)}
      </div>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <label style={{ ...label, marginBottom: 0 }}>Generated llms.txt</label>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { const blob = new Blob([output], { type: "text/plain" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "llms.txt"; a.click(); }} style={{ ...btn, borderColor: S.accent, color: S.accent }}>↓ Download</button>
            <button onClick={() => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 1500); }} style={{ ...btn, color: copied ? S.green : S.accent, borderColor: copied ? "rgba(34,197,94,0.3)" : S.accent }}>{copied ? "✓ Copied!" : "Copy"}</button>
          </div>
        </div>
        <pre style={{ fontFamily: S.mono, fontSize: 13, lineHeight: 1.7, padding: 16, background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8, color: S.green, whiteSpace: "pre-wrap", margin: 0 }}>{output}</pre>
      </div>
    </div>
  );
}

function ValidatorTab() {
  const [txt, setTxt] = useState("");
  const [result, setResult] = useState<{ valid: boolean; issues: string[] } | null>(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "24px 0" }}>
      <div>
        <label style={label}>Paste your llms.txt content</label>
        <textarea value={txt} onChange={e => { setTxt(e.target.value); setResult(null); }} rows={12} style={{ ...input, resize: "vertical" as const, lineHeight: 1.7 }} spellCheck={false}
          placeholder={"# My Site\n\n> A brief description of my site.\n\n## Documentation\n\n- [Home](https://example.com): Main landing page\n- [API Docs](https://example.com/docs): API reference\n\n## Optional\n\n- [Blog](https://example.com/blog): Latest updates"} />
      </div>
      <button onClick={() => { if (txt.trim()) setResult(validateLlmsTxt(txt)); }} style={{ padding: "12px 24px", background: S.accent, color: "#fff", border: "none", borderRadius: 8, fontFamily: S.sans, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Validate</button>
      {result && (
        <div style={{ padding: 20, background: result.valid ? "rgba(34,197,94,0.08)" : "rgba(234,179,8,0.08)", border: `1px solid ${result.valid ? "rgba(34,197,94,0.15)" : "rgba(234,179,8,0.15)"}`, borderRadius: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: result.issues.length > 0 ? 12 : 0 }}>
            <span style={{ padding: "6px 16px", borderRadius: 6, fontSize: 14, fontWeight: 700, fontFamily: S.sans, background: result.valid ? "rgba(34,197,94,0.08)" : "rgba(234,179,8,0.08)", color: result.valid ? S.green : S.yellow, border: `1px solid ${result.valid ? "rgba(34,197,94,0.2)" : "rgba(234,179,8,0.2)"}` }}>
              {result.valid ? "✓ VALID" : "⚠ ISSUES FOUND"}
            </span>
          </div>
          {result.issues.map((issue, i) => (
            <div key={i} style={{ fontSize: 13, fontFamily: S.mono, padding: "8px 12px", marginBottom: 4, background: "rgba(234,179,8,0.06)", borderLeft: `3px solid ${S.yellow}`, borderRadius: "0 4px 4px 0", color: S.text }}>{issue}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LlmsTxtPage() {
  const [tab, setTab] = useState("builder");
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px 48px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>🤖 LLMs.txt Builder</h1>
      <p style={{ fontSize: 13, color: S.dim, margin: "0 0 20px" }}>Generate and validate <code style={{ fontFamily: S.mono, background: S.surfaceAlt, padding: "2px 6px", borderRadius: 4 }}>llms.txt</code> files — the emerging standard for making your site AI-readable.</p>
      <div style={{ display: "flex", borderBottom: `1px solid ${S.border}` }}>
        {["Builder", "Validator"].map(t => (
          <button key={t} onClick={() => setTab(t.toLowerCase())} style={{ fontFamily: S.sans, fontSize: 14, fontWeight: tab === t.toLowerCase() ? 700 : 500, padding: "12px 28px", background: "transparent", color: tab === t.toLowerCase() ? S.accent : S.dim, border: "none", borderBottom: tab === t.toLowerCase() ? `2px solid ${S.accent}` : "2px solid transparent", cursor: "pointer" }}>{t === "Builder" ? "🔧 " : "🔍 "}{t}</button>
        ))}
      </div>
      {tab === "builder" ? <BuilderTab /> : <ValidatorTab />}
      <div style={{ marginTop: 32, padding: 16, background: S.surfaceAlt, borderRadius: 8, border: `1px solid ${S.border}`, fontSize: 12, color: S.dim, fontFamily: S.mono, lineHeight: 1.6 }}>
        <strong style={{ color: S.text }}>About llms.txt:</strong> A proposed standard by Jeremy Howard (Answer.AI) for helping LLMs understand your site. Place at <code>/llms.txt</code> in your site root. Format: Markdown with H1 title, blockquote summary, and H2 sections with links. Adopted by Anthropic, Cloudflare, Vercel, and others.{" "}
        <a href="https://llmstxt.org/" target="_blank" rel="noopener noreferrer" style={{ color: S.accent, textDecoration: "none" }}>Read the spec →</a>
      </div>
    </div>
  );
}
