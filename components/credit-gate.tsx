"use client";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";

const S = {
  surface: "#111827", border: "#1e2a42", text: "#e2e8f0", dim: "#64748b",
  accent: "#3b82f6", sans: "'DM Sans', system-ui, sans-serif",
};

interface CreditGateProps {
  children: React.ReactNode;
  cost?: number;
  toolName?: string;
}

export function CreditGate({ children, cost = 1, toolName = "this tool" }: CreditGateProps) {
  const { data: session, status } = useSession();
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/credits")
        .then((r) => r.json())
        .then((d) => {
          setCredits(d.credits);
          setLoading(false);
        })
        .catch(() => {
          setCredits(0);
          setLoading(false);
        });
    } else if (status !== "loading") {
      setLoading(false);
    }
  }, [session, status]);

  if (status === "loading" || loading) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 14, color: S.dim }}>Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px", fontFamily: S.sans }}>Premium Tool</h2>
        <p style={{ fontSize: 14, color: S.dim, margin: "0 0 24px", lineHeight: 1.6 }}>
          Sign in with Google to access {toolName}. We just need your email to get started.
        </p>
        <Link href="/login" style={{
          display: "inline-block", padding: "14px 36px", background: S.accent, color: "#fff",
          borderRadius: 10, fontSize: 15, fontWeight: 700, fontFamily: S.sans, textDecoration: "none",
        }}>
          Sign In to Unlock
        </Link>
      </div>
    );
  }

  if (credits !== null && credits < cost) {
    return (
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px", fontFamily: S.sans }}>No Credits</h2>
        <p style={{ fontSize: 14, color: S.dim, margin: "0 0 8px", lineHeight: 1.6 }}>
          {toolName} requires {cost} credit{cost > 1 ? "s" : ""} per use.
        </p>
        <p style={{ fontSize: 13, color: "#475569", margin: "0 0 24px" }}>
          Your balance: <strong style={{ color: "#f87171" }}>{credits} credits</strong>
        </p>
        <Link href="/pricing" style={{
          display: "inline-block", padding: "14px 36px",
          background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", color: "#fff",
          borderRadius: 10, fontSize: 15, fontWeight: 700, fontFamily: S.sans, textDecoration: "none",
        }}>
          Buy Credits
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
