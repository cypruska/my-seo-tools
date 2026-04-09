import Link from "next/link";

const tools = [
  {
    href: "/robots-txt",
    icon: "🤖",
    title: "robots.txt Validator & Builder",
    desc: "Validate, test, and generate robots.txt files following Google's RFC 9309 specification.",
  },
  {
    href: "/utm-builder",
    icon: "🔗",
    title: "UTM Campaign URL Builder",
    desc: "Build UTM-tagged campaign URLs with smart presets for Google Ads, Meta, and more.",
  },
  {
    href: "/meta-tags",
    icon: "🏷️",
    title: "Meta Title & Description Creator",
    desc: "Write SEO-optimized titles and descriptions with a live Google SERP preview.",
  },
];

export default function Home() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px" }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 8px" }}>
        Free SEO & MarTech Tools
      </h1>
      <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 40px", lineHeight: 1.6 }}>
        Technical SEO tools built on real specs — not guesswork.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {tools.map((t) => (
          <Link key={t.href} href={t.href} style={{
            display: "block", padding: 24,
            background: "#111827", border: "1px solid #1e2a42",
            borderRadius: 12, textDecoration: "none", color: "#e2e8f0",
            transition: "border-color 0.15s",
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{t.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{t.title}</div>
            <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>{t.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
