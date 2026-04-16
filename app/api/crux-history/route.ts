import { NextRequest, NextResponse } from "next/server";

// Fetches CrUX history data (up to 40 weeks of 28-day rolling averages)
export async function POST(req: NextRequest) {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) return NextResponse.json({ error: "GOOGLE_API_KEY not configured" }, { status: 500 });

  try {
    const { url, formFactor = "PHONE", identifier = "url" } = await req.json();
    if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

    let target = url.trim();
    if (!target.startsWith("http")) target = "https://" + target;

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

    const apiUrl = `https://chromeuxreport.googleapis.com/v1/records:queryHistoryRecord?key=${key}`;
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });

    const data = await res.json();

    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json({
          hasData: false,
          message: "No CrUX history data available.",
        });
      }
      return NextResponse.json({ error: data.error?.message || "CrUX History API error" }, { status: res.status });
    }

    return NextResponse.json({ hasData: true, ...data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "CrUX history fetch failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
