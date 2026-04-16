import { NextRequest, NextResponse } from "next/server";

// Fetches current CrUX field data (real-user metrics) for a URL or origin
export async function POST(req: NextRequest) {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) return NextResponse.json({ error: "GOOGLE_API_KEY not configured" }, { status: 500 });

  try {
    const { url, formFactor = "PHONE", identifier = "url" } = await req.json();
    if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

    let target = url.trim();
    if (!target.startsWith("http")) target = "https://" + target;

    // Build request body
    const body: Record<string, unknown> = {
      formFactor,
      metrics: [
        "largest_contentful_paint",
        "interaction_to_next_paint",
        "cumulative_layout_shift",
        "first_contentful_paint",
        "experimental_time_to_first_byte",
      ],
    };

    if (identifier === "origin") {
      const urlObj = new URL(target);
      body.origin = urlObj.origin;
    } else {
      body.url = target;
    }

    const apiUrl = `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${key}`;
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });

    const data = await res.json();

    // CrUX returns 404 if no data available for that URL/origin
    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json({
          hasData: false,
          message: identifier === "url"
            ? "No CrUX field data available for this specific URL. Try origin-level data instead."
            : "No CrUX field data available for this origin. Site may have insufficient traffic.",
        });
      }
      return NextResponse.json({ error: data.error?.message || "CrUX API error" }, { status: res.status });
    }

    return NextResponse.json({ hasData: true, ...data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "CrUX fetch failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
