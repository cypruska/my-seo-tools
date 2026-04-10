import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { variantId } = await req.json();
  if (!variantId) {
    return NextResponse.json({ error: "Missing variantId" }, { status: 400 });
  }
  const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
    },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: { custom: { user_id: session.user.id } },
        },
        relationships: {
          store: { data: { type: "stores", id: process.env.LEMONSQUEEZY_STORE_ID } },
          variant: { data: { type: "variants", id: String(variantId) } },
        },
      },
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error("LS checkout error:", JSON.stringify(data));
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }
  return NextResponse.json({ checkoutUrl: data.data.attributes.url });
}
