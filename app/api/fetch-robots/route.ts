import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Missing url param" }, { status: 400 });

  try {
    let target = url.trim();
    if (!target.startsWith("http")) target = "https://" + target;
    const u = new URL(target);
    const robotsUrl = `${u.protocol}//${u.host}/robots.txt`;

    const res = await fetch(robotsUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SEOToolBot/1.0)" },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `HTTP ${res.status} from ${robotsUrl}` }, { status: 502 });
    }

    const text = await res.text();
    return NextResponse.json({ content: text, url: robotsUrl });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
