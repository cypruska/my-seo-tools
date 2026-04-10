"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";

const tools = [
  { href: "/robots-txt", label: "🤖 robots.txt" },
  { href: "/llms-txt", label: "🧠 LLMs.txt" },
  { href: "/utm-builder", label: "🔗 UTM Builder" },
  { href: "/meta-tags", label: "📝 Meta Tags AI" },
  { href: "/pagespeed", label: "⚡ PageSpeed" },
];

export function Nav() {
  const path = usePathname();
  const { data: session } = useSession();
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/credits")
        .then((r) => r.json())
        .then((d) => setCredits(d.credits))
        .catch(() => setCredits(0));
    }
  }, [session]);

  return (
    <nav style={{
      borderBottom: "1px solid #1e2a42", padding: "0 24px",
      display: "flex", alignItems: "center", gap: 0,
      maxWidth: 960, margin: "0 auto", overflowX: "auto",
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
      <div style={{ marginLeft: "auto", paddingLeft: 16 }}>
        {session ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/pricing" style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "5px 10px", borderRadius: 6,
              background: credits === 0 ? "rgba(239,68,68,0.15)" : "rgba(59,130,246,0.12)",
              border: credits === 0 ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(59,130,246,0.2)",
              textDecoration: "none", fontSize: 12, fontWeight: 600,
              color: credits === 0 ? "#f87171" : "#60a5fa",
              whiteSpace: "nowrap",
            }}>
              <span style={{ fontSize: 11 }}>⚡</span>
              {credits !== null ? credits : "–"} credits
            </Link>
            {session.user?.image && (
              <img src={session.user.image} alt="" style={{ width: 26, height: 26, borderRadius: "50%" }} />
            )}
            <span style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>{session.user?.name?.split(" ")[0]}</span>
            <button onClick={() => signOut()} style={{
              padding: "6px 12px", fontSize: 11, fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif",
              borderRadius: 6, border: "1px solid #1e2a42", background: "transparent", color: "#64748b", cursor: "pointer",
              whiteSpace: "nowrap",
            }}>Sign Out</button>
          </div>
        ) : (
          <Link href="/login" style={{
            padding: "8px 16px", fontSize: 12, fontWeight: 700,
            fontFamily: "'DM Sans', system-ui, sans-serif",
            borderRadius: 6, background: "#3b82f6", color: "#fff",
            textDecoration: "none", whiteSpace: "nowrap",
          }}>Sign In</Link>
        )}
      </div>
    </nav>
  );
}
