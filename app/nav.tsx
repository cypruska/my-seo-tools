"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tools = [
  { href: "/robots-txt", label: "🤖 robots.txt" },
  { href: "/llms-txt", label: "🧠 LLMs.txt" },
  { href: "/utm-builder", label: "🔗 UTM Builder" },
  { href: "/meta-tags", label: "📝 Meta Tags AI" },
  { href: "/pagespeed", label: "⚡ PageSpeed" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav style={{
      borderBottom: "1px solid #1e2a42", padding: "0 24px",
      display: "flex", alignItems: "center", gap: 0,
      maxWidth: 900, margin: "0 auto", overflowX: "auto",
    }}>
      <Link href="/" style={{
        fontWeight: 800, fontSize: 16, color: "#e2e8f0",
        textDecoration: "none", marginRight: 32, padding: "14px 0",
        display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
      }}>
        <span style={{
          width: 28, height: 28, borderRadius: 6,
          background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 800, color: "#fff",
        }}>S</span>
        SEO Tools
      </Link>
      {tools.map((t) => (
        <Link key={t.href} href={t.href} style={{
          padding: "14px 14px", fontSize: 13, whiteSpace: "nowrap",
          fontWeight: path === t.href ? 700 : 500,
          color: path === t.href ? "#3b82f6" : "#64748b",
          textDecoration: "none",
          borderBottom: path === t.href ? "2px solid #3b82f6" : "2px solid transparent",
        }}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
