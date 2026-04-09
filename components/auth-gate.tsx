"use client";
import { useSession } from "next-auth/react";
import Link from "next/link";

const S = {
  surface: "#111827", border: "#1e2a42", text: "#e2e8f0", dim: "#64748b",
  accent: "#3b82f6", sans: "'DM Sans', system-ui, sans-serif",
};

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  if (status === "loading") {
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
          Sign in with Google to access this tool for free. We just need your email to get started.
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

  return <>{children}</>;
}
