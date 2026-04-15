import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Check if a fingerprint has used the free trial
export async function POST(req: NextRequest) {
  try {
    const { visitorId, action } = await req.json();

    if (!visitorId || typeof visitorId !== "string") {
      return NextResponse.json({ error: "Invalid visitorId" }, { status: 400 });
    }

    if (action === "check") {
      // Check if this fingerprint has already used the free trial
      const existing = await prisma.freeTrialUse.findUnique({
        where: { visitorId },
      });
      return NextResponse.json({ used: !!existing });
    }

    if (action === "record") {
      // Record that this fingerprint has used the free trial
      await prisma.freeTrialUse.upsert({
        where: { visitorId },
        update: { usedAt: new Date() },
        create: { visitorId },
      });
      return NextResponse.json({ recorded: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
