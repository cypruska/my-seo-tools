"use client";
import { useState, useMemo } from "react";

const S = {
  bg: "#0a0e17", surfaceAlt: "#1a2236", border: "#1e2a42",
  text: "#e2e8f0", dim: "#64748b", accent: "#3b82f6", green: "#22c55e",
  mono: "'IBM Plex Mono', monospace", sans: "'DM Sans', system-ui, sans-serif",
};
const label: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: S.dim, fontFamily: S.sans, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6, display: "block" };
const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "10px 12px", fontFamily: S.mono, fontSize: 13, background: S.surfaceAlt, border: `1px solid ${S.border}`, borderRadius: 6, color: S.text, outline: "none" };
const btn: React.CSSProperties = { padding: "6px 14px", fontSize: 12, fontWeight: 600, fontFamily: S.sans, borderRadius: 6, border: `1px solid ${S.border}`, background: S.surfaceAlt, color: S.text, cursor: "pointer" };

const PRESETS = [
  { label: "Google Ads (CPC)", source: "google", medium: "cpc", campaign: "brand-campaign" },
  { label: "Meta Ads (Paid Social)", source: "meta", medium: "paid-social", campaign: "remarketing-campaign" },
  { label: "Email Newsletter", source: "newsletter", medium: "email", campaign: "weekly-digest" },
  { label: "LinkedIn Ads", source: "linkedin", medium: "paid-social", campaign: "b2b-campaign" },
  { label: "Twitter / X Ads", source: "twitter", medium: "paid-social", campaign: "awareness-campaign" },
  { label: "Organic Social", source: "instagram", medium: "social", campaign: "organic-post" },
  { label: "Affiliate", source: "partner-name", medium: "affiliate", campaign: "affiliate-q1" },
];

export default function UtmBuilder() {
  const [url, setUrl] = useState("https://example.com/landing-page");
  const [source, setSource] = useState("google");
  const [medium, setMedium] = useState("cpc");
  const [campaign, setCampaign] = useState("brand-campaign");
  const [term, setTerm] = useState("");
  const [content, setContent] = useState("");
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    if (!url.trim()) return "";
    const params = new URLSearchParams();
    if (source.trim()) params.set("utm_source", source.trim());
    if (medium.trim()) params.set("utm_medium", medium.trim());
    if (campaign.trim()) params.set("utm_campaign", campaign.trim());
    if (term.trim()) params.set("utm_term", term.trim());
    if (content.trim()) params.set("utm_content", content.trim());
    const sep = url.includes("?") ? "&" : "?";
    return `${url.trim()}${params.toString() ? sep + params.toString() : ""}`;
  }, [url, source, medium, campaign, term, content]);

  const applyPreset = (p: typeof PRESETS[0]) => {
    setSource(p.source); setMedium(p.medium); setCampaign(p.campaign);
  };

  const copy = () => { navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px 48px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>UTM Campaign URL Builder</h1>
      <p style={{ fontSize: 13, color: S.dim, margin: "0 0 24px", lineHeight: 1.5 }}>
        Build campaign-tagged URLs for Google Analytics. Pick a preset or customize your own.
      </p>

      {/* Presets */}
      <div style={{ marginBottom: 24 }}>
        <label style={label}>Quick Presets</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => applyPreset(p)}
              style={{ ...btn, fontSize: 11, padding: "5px 12px",
                background: source === p.source && medium === p.medium ? "rgba(59,130,246,0.15)" : S.surfaceAlt,
                color: source === p.source && medium === p.medium ? S.accent : S.dim,
                borderColor: source === p.source && medium === p.medium ? S.accent : S.border,
              }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={label}>Website URL *</label>
          <input value={url} onChange={e => setUrl(e.target.value)} style={input} placeholder="https://example.com/page" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={label}>utm_source *</label>
            <input value={source} onChange={e => setSource(e.target.value)} style={input} placeholder="google, meta, newsletter" />
            <div style={{ fontSize: 11, color: S.dim, marginTop: 4 }}>Where the traffic comes from</div>
          </div>
          <div>
            <label style={label}>utm_medium *</label>
            <input value={medium} onChange={e => setMedium(e.target.value)} style={input} placeholder="cpc, email, social" />
            <div style={{ fontSize: 11, color: S.dim, marginTop: 4 }}>Marketing medium or channel</div>
          </div>
        </div>
        <div>
          <label style={label}>utm_campaign *</label>
          <input value={campaign} onChange={e => setCampaign(e.target.value)} style={input} placeholder="brand-campaign, remarketing-q1" />
          <div style={{ fontSize: 11, color: S.dim, marginTop: 4 }}>Campaign name — use lowercase and hyphens</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={label}>utm_term <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span></label>
            <input value={term} onChange={e => setTerm(e.target.value)} style={input} placeholder="running shoes" />
            <div style={{ fontSize: 11, color: S.dim, marginTop: 4 }}>Paid search keyword</div>
          </div>
          <div>
            <label style={label}>utm_content <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span></label>
            <input value={content} onChange={e => setContent(e.target.value)} style={input} placeholder="banner-v2, cta-button" />
            <div style={{ fontSize: 11, color: S.dim, marginTop: 4 }}>Differentiates ads/links</div>
          </div>
        </div>
      </div>

      {/* Result */}
      <div style={{ marginTop: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <label style={label}>Generated URL</label>
          <button onClick={copy} style={{ ...btn, color: copied ? S.green : S.accent, borderColor: copied ? "rgba(34,197,94,0.3)" : S.accent }}>
            {copied ? "✓ Copied!" : "Copy URL"}
          </button>
        </div>
        <div style={{
          fontFamily: S.mono, fontSize: 13, lineHeight: 1.7, padding: 16,
          background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8,
          color: S.green, wordBreak: "break-all",
        }}>
          {result || "Enter a URL above..."}
        </div>
      </div>

      <div style={{ marginTop: 32, padding: 16, background: S.surfaceAlt, borderRadius: 8, border: `1px solid ${S.border}`, fontSize: 12, color: S.dim, fontFamily: S.mono, lineHeight: 1.6 }}>
        <strong style={{ color: S.text }}>Tips:</strong> Always use lowercase. Use hyphens instead of spaces.
        utm_source, utm_medium, and utm_campaign are required by GA4. utm_term and utm_content are optional.
      </div>
    </div>
  );
}
