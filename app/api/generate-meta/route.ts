import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkCredits, deductCredits } from "@/lib/credits";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { url, keywords, currentTitle, currentDescription, visitorId } = body;

  if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

  const session = await getServerSession(authOptions);
  let isFreeUse = false;

  if (!session?.user?.id) {
    // Anonymous user — check if they have a free use available
    if (!visitorId) {
      return NextResponse.json({ error: "Sign in to use this tool", requiresAuth: true }, { status: 401 });
    }
    const existing = await prisma.freeTrialUse.findUnique({
      where: { visitorId },
    });
    if (existing) {
      return NextResponse.json({ error: "Free trial used. Sign in and buy credits to continue.", requiresAuth: true }, { status: 401 });
    }
    isFreeUse = true;
  } else {
    // Authenticated user — check credits
    const { ok, balance } = await checkCredits(session.user.id, 1);
    if (!ok) {
      return NextResponse.json({ error: "No credits", balance, requiresCredits: true }, { status: 402 });
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  // Fetch page content
  let pageContent = "";
  try {
    let target = url.trim();
    if (!target.startsWith("http")) target = "https://" + target;
    const res = await fetch(target, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SEOToolBot/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i);
    const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => m[1].replace(/<[^>]+>/g, "").trim()).filter(Boolean);
    const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map(m => m[1].replace(/<[^>]+>/g, "").trim()).filter(Boolean).slice(0, 5);
    const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map(m => m[1].replace(/<[^>]+>/g, "").trim()).filter(s => s.length > 30).slice(0, 5);

    pageContent = [
      titleMatch ? "Current title: " + titleMatch[1].trim() : "",
      descMatch ? "Current meta description: " + descMatch[1].trim() : "",
      h1s.length ? "H1 headings: " + h1s.join(", ") : "",
      h2s.length ? "H2 headings: " + h2s.join(", ") : "",
      paragraphs.length ? "Key paragraphs: " + paragraphs.join(" | ") : "",
    ].filter(Boolean).join("\n");
  } catch {
    pageContent = "Could not fetch page content. Generate based on URL and keywords only.";
  }

  const prompt = "You are an expert SEO copywriter. Analyze this webpage and generate optimized meta tags.\n\nURL: " + url + "\n" + (keywords ? "Target keywords: " + keywords + "\n" : "") + (currentTitle ? "Current title: " + currentTitle + "\n" : "") + (currentDescription ? "Current description: " + currentDescription + "\n" : "") + "\nPage content extracted:\n" + pageContent + "\n\nGenerate exactly 3 options for meta title and meta description. Rules:\n- Meta title: 50-60 characters max. Primary keyword first, brand name last. Compelling and click-worthy.\n- Meta description: 120-155 characters max. Include a call-to-action. Include target keyword naturally.\n- Each option should have a different angle/approach.\n\nRespond ONLY in this exact JSON format, no markdown, no backticks:\n{\"options\":[{\"title\":\"...\",\"description\":\"...\",\"angle\":\"...\"},{\"title\":\"...\",\"description\":\"...\",\"angle\":\"...\"},{\"title\":\"...\",\"description\":\"...\",\"angle\":\"...\"}]}\n\nThe \"angle\" field should be 2-4 words describing the approach (e.g. \"Benefit-focused\", \"Action-oriented\", \"Trust-building\").";

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
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 502 });
    }

    const result = JSON.parse(jsonMatch[0]);

    if (isFreeUse) {
      // Record the free trial use
      await prisma.freeTrialUse.create({
        data: { visitorId: visitorId! },
      });
      return NextResponse.json({
        options: result.options,
        freeUse: true,
        pageInfo: {
          fetchedTitle: pageContent.match(/Current title: (.*)/)?.[1] || "",
          fetchedDescription: pageContent.match(/Current meta description: (.*)/)?.[1] || "",
        },
      });
    }

    // Deduct credit AFTER successful generation
    const newBalance = await deductCredits(session!.user!.id!, 1, "use:meta-tags");

    return NextResponse.json({
      options: result.options,
      balance: newBalance,
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
