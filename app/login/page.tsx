"use client";
import { signIn } from "next-auth/react";

const S = {
  bg: "#0a0e17", surface: "#111827", surfaceAlt: "#1a2236",
  border: "#1e2a42", text: "#e2e8f0", dim: "#64748b",
  accent: "#3b82f6", sans: "'DM Sans', system-ui, sans-serif",
};

export default function LoginPage() {
  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px", fontFamily: S.sans }}>Sign in to SEO Tools</h1>
      <p style={{ fontSize: 14, color: S.dim, margin: "0 0 32px", lineHeight: 1.6 }}>
        Unlock AI Meta Tags, enhanced PageSpeed Insights, and more premium tools.
      </p>
      <button
        onClick={() => signIn("google", { callbackUrl: "/" })}
        style={{
          display: "inline-flex", alignItems: "center", gap: 12,
          padding: "14px 32px", background: "#fff", color: "#1f2937",
          border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700,
          fontFamily: S.sans, cursor: "pointer", transition: "transform 0.1s",
        }}
        onMouseOver={e => (e.currentTarget.style.transform = "scale(1.02)")}
        onMouseOut={e => (e.currentTarget.style.transform = "scale(1)")}
      >
        <svg width="20" height="20" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        Continue with Google
      </button>
      <p style={{ fontSize: 12, color: S.dim, marginTop: 24, lineHeight: 1.5 }}>
        By signing in, you agree to our terms. We only access your name and email.
      </p>
    </div>
  );
}
