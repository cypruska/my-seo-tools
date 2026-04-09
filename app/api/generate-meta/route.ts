import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const { url, keywords, currentTitle, currentDescription } = await req.json();
  if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

  // Step 1: Fetch the target website's HTML
  let pageContent = "";
  try {
    let target = url.trim();
    if (!target.startsWith("http")) target = "https://" + target;
    const res = await fetch(target, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SEOToolBot/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    const html = await res.text();
    // Extract useful text: title, meta description, h1s, h2s, first paragraphs
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/i);
    const h1s = [...html.matchAll(/<h1[^>]*>(.*?)<\/h1>/gi)].map(m => m[1].replace(/<[^>]+>/g, "").trim()).filter(Boolean);
    const h2s = [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/gi)].map(m => m[1].replace(/<[^>]+>/g, "").trim()).filter(Boolean).slice(0, 5);
    const paragraphs = [...html.matchAll(/<p[^>]*>(.*?)<\/p>/gi)].map(m => m[1].replace(/<[^>]+>/g, "").trim()).filter(s => s.length > 30).slice(0, 5);

    pageContent = [
      titleMatch ? `Current title: ${titleMatch[1].trim()}` : "",
      descMatch ? `Current meta description: ${descMatch[1].trim()}` : "",
      h1s.length ? `H1 headings: ${h1s.join(", ")}` : "",
      h2s.length ? `H2 headings: ${h2s.join(", ")}` : "",
      paragraphs.length ? `Key paragraphs: ${paragraphs.join(" | ")}` : "",
    ].filter(Boolean).join("\n");
  } catch {
    pageContent = "Could not fetch page content. Generate based on URL and keywords only.";
  }

  // Step 2: Call Claude API
  const prompt = `You are an expert SEO copywriter. Analyze this webpage and generate optimized meta tags.

URL: ${url}
${keywords ? `Target keywords: ${keywords}` : ""}
${currentTitle ? `Current title: ${currentTitle}` : ""}
${currentDescription ? `Current description: ${currentDescription}` : ""}

Page content extracted:
${pageContent}

Generate exactly 3 options for meta title and meta description. Rules:
- Meta title: 50-60 characters max. Primary keyword first, brand name last. Compelling and click-worthy.
- Meta description: 120-155 characters max. Include a call-to-action. Include target keyword naturally.
- Each option should have a different angle/approach.

Respond ONLY in this exact JSON format, no markdown, no backticks:
{"options":[{"title":"...","description":"...","angle":"..."},{"title":"...","description":"...","angle":"..."},{"title":"...","description":"...","angle":"..."}]}

The "angle" field should be 2-4 words describing the approach (e.g. "Benefit-focused", "Action-oriented", "Trust-building").`;

  try {
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const claudeData = await claudeRes.json();

    if (claudeData.error) {
      return NextResponse.json({ error: claudeData.error.message }, { status: 502 });
    }

    const text = claudeData.content?.[0]?.text || "";
    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 502 });
    }

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json({
      options: result.options,
      pageInfo: {
        fetchedTitle: pageContent.match(/Current title: (.*)/)?.[1] || "",
        fetchedDescription: pageContent.match(/Current meta description: (.*)/)?.[1] || "",
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "AI generation failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
