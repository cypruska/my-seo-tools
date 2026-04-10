export const CREDIT_PACKS: Record<string, { credits: number; name: string; price: number }> = {
  "1510881": { credits: 5, name: "Starter SEO Plan", price: 9 },
  "1510887": { credits: 25, name: "Pro SEO Plan", price: 35 },
  "1510897": { credits: 100, name: "Business SEO Plan", price: 99 },
};

export function getCreditsForVariant(variantId: string): number {
  return CREDIT_PACKS[variantId]?.credits ?? 0;
}
