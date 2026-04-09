import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getCreditsForVariant } from "@/lib/credits";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET!;

  // Verify signature
  const hmac = crypto.createHmac("sha256", secret);
  const digest = hmac.update(rawBody).digest("hex");
  const signature = req.headers.get("x-signature");

  if (!signature || digest !== signature) {
    console.error("Invalid webhook signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const eventName = payload.meta?.event_name;

  if (eventName === "order_created") {
    const attrs = payload.data?.attributes;
    const orderId = String(payload.data?.id);
    const variantId = String(attrs?.first_order_item?.variant_id);
    const userId = payload.meta?.custom_data?.user_id;
    const amountUsd = attrs?.total ?? 0;

    if (!userId || !variantId) {
      console.error("Missing userId or variantId in webhook", { userId, variantId });
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    const credits = getCreditsForVariant(variantId);
    if (credits === 0) {
      console.error("Unknown variant ID:", variantId);
      return NextResponse.json({ error: "Unknown variant" }, { status: 400 });
    }

    // Check if order already processed (idempotency)
    const existing = await prisma.order.findUnique({
      where: { lemonSqueezyOrderId: orderId },
    });

    if (existing) {
      return NextResponse.json({ message: "Already processed" });
    }

    // Create order and add credits in a transaction
    await prisma.$transaction([
      prisma.order.create({
        data: {
          userId,
          lemonSqueezyOrderId: orderId,
          variantId,
          credits,
          amountUsd,
          status: "completed",
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { credits: { increment: credits } },
      }),
    ]);

    console.log(`Added ${credits} credits to user ${userId} (order ${orderId})`);
  }

  return NextResponse.json({ message: "OK" });
}
