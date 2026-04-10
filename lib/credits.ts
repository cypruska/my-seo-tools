import { prisma } from "@/lib/prisma";

export const CREDIT_PACKS: Record<string, { credits: number; name: string; price: number }> = {
  "1514615": { credits: 5, name: "Starter SEO Credits", price: 9.99 },
  "1514616": { credits: 25, name: "Pro SEO Credits", price: 34.99 },
  "1514618": { credits: 100, name: "Enterprise SEO Credits", price: 98.99 },
};

export function getCreditsForVariant(variantId: string): number {
  return CREDIT_PACKS[variantId]?.credits ?? 0;
}

export async function checkCredits(userId: string, cost: number): Promise<{ ok: boolean; balance: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });
  const balance = user?.credits ?? 0;
  return { ok: balance >= cost, balance };
}

export async function deductCredits(userId: string, cost: number, reason: string): Promise<number> {
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: { credits: { decrement: cost } },
    });
    await tx.creditTransaction.create({
      data: {
        userId,
        amount: -cost,
        reason,
        balanceAfter: user.credits,
      },
    });
    return user.credits;
  });
  return result;
}
