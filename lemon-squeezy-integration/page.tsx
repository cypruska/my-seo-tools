"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";

const plans = [
  {
    name: "Starter",
    credits: 5,
    price: 9,
    variantId: "1510881",
    description: "Perfect for trying out premium tools",
    features: ["5 site crawls (up to 5K pages each)", "5 batch PageSpeed runs", "5 AI analysis reports", "CSV exports"],
  },
  {
    name: "Pro",
    credits: 25,
    price: 35,
    variantId: "1510887",
    popular: true,
    description: "For SEO professionals and consultants",
    features: ["25 site crawls (up to 5K pages each)", "25 batch PageSpeed runs", "25 AI analysis reports", "CSV exports", "Priority processing"],
  },
  {
    name: "Business",
    credits: 100,
    price: 99,
    variantId: "1510897",
    description: "For agencies and teams",
    features: ["100 site crawls (up to 5K pages each)", "100 batch PageSpeed runs", "100 AI analysis reports", "CSV exports", "Priority processing", "Best value per credit"],
  },
];

export default function PricingPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleBuy(variantId: string) {
    if (!session) {
      window.location.href = "/login";
      return;
    }

    setLoading(variantId);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId }),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert("Failed to create checkout. Please try again.");
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 20px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, textAlign: "center", marginBottom: 8, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        Credit Packs
      </h1>
      <p style={{ textAlign: "center", color: "#94a3b8", marginBottom: 40, fontSize: 15 }}>
        Buy credits to unlock premium SEO tools. 1 credit = 1 crawl, 1 batch analysis, or 1 AI report.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
        {plans.map((plan) => (
          <div
            key={plan.variantId}
            style={{
              border: plan.popular ? "2px solid #3b82f6" : "1px solid #1e2a42",
              borderRadius: 12,
              padding: 28,
              background: plan.popular ? "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.06))" : "#0c1222",
              position: "relative",
            }}
          >
            {plan.popular && (
              <span style={{
                position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", color: "#fff",
                fontSize: 11, fontWeight: 700, padding: "4px 14px", borderRadius: 20,
                fontFamily: "'DM Sans', system-ui, sans-serif",
              }}>
                MOST POPULAR
              </span>
            )}

            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{plan.name}</h2>
            <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 16 }}>{plan.description}</p>

            <div style={{ marginBottom: 20 }}>
              <span style={{ fontSize: 36, fontWeight: 800, fontFamily: "'DM Sans', system-ui, sans-serif" }}>${plan.price}</span>
              <span style={{ color: "#64748b", fontSize: 14, marginLeft: 4 }}>/ {plan.credits} credits</span>
            </div>

            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", fontSize: 13, color: "#cbd5e1" }}>
              {plan.features.map((f, i) => (
                <li key={i} style={{ padding: "5px 0", borderBottom: "1px solid #1e2a42" }}>
                  ✓ {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleBuy(plan.variantId)}
              disabled={loading === plan.variantId}
              style={{
                width: "100%", padding: "12px 0", borderRadius: 8, border: "none", cursor: "pointer",
                fontWeight: 700, fontSize: 14, fontFamily: "'DM Sans', system-ui, sans-serif",
                background: plan.popular ? "linear-gradient(135deg, #3b82f6, #8b5cf6)" : "#1e2a42",
                color: "#fff", opacity: loading === plan.variantId ? 0.6 : 1,
              }}
            >
              {loading === plan.variantId ? "Loading..." : `Buy ${plan.credits} Credits`}
            </button>
          </div>
        ))}
      </div>

      <p style={{ textAlign: "center", color: "#475569", fontSize: 12, marginTop: 32 }}>
        Payments processed securely by Lemon Squeezy. Credits never expire.
      </p>
    </div>
  );
}
