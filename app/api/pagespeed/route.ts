import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const strategy = req.nextUrl.searchParams.get("strategy") || "mobile";
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  let target = url.trim();
  if (!target.startsWith("http")) target = "https://" + target;

  const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(target)}&strategy=${strategy}&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES&category=SEO`;

  try {
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(60000) });
    const data = await res.json();
    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 502 });
    }
    return NextResponse.json(data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "PageSpeed API error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
