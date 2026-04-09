# Lemon Squeezy Integration — Setup Instructions

## Step 1: Copy files into your project

Run these commands one by one:

```bash
cd ~/my-seo-tools
```

### Copy the new/updated files:
```bash
cp ~/Downloads/lemon-squeezy-integration/prisma/schema.prisma prisma/schema.prisma
```

```bash
cp ~/Downloads/lemon-squeezy-integration/lib/auth.ts lib/auth.ts
```

```bash
cp ~/Downloads/lemon-squeezy-integration/lib/credits.ts lib/credits.ts
```

```bash
cp ~/Downloads/lemon-squeezy-integration/app/api/auth/\[...nextauth\]/route.ts app/api/auth/\[...nextauth\]/route.ts
```

```bash
mkdir -p app/api/checkout
```

```bash
cp ~/Downloads/lemon-squeezy-integration/app/api/checkout/route.ts app/api/checkout/route.ts
```

```bash
mkdir -p app/api/webhooks/lemonsqueezy
```

```bash
cp ~/Downloads/lemon-squeezy-integration/app/api/webhooks/lemonsqueezy/route.ts app/api/webhooks/lemonsqueezy/route.ts
```

```bash
mkdir -p app/api/credits
```

```bash
cp ~/Downloads/lemon-squeezy-integration/app/api/credits/route.ts app/api/credits/route.ts
```

```bash
mkdir -p app/pricing
```

```bash
cp ~/Downloads/lemon-squeezy-integration/app/pricing/page.tsx app/pricing/page.tsx
```

## Step 2: Push the database migration

```bash
npx prisma db push
```

This adds the `credits` field to User and creates the `Order` table.

## Step 3: Generate Prisma client

```bash
npx prisma generate
```

## Step 4: Add environment variables to Vercel

Go to Vercel → your project → Settings → Environment Variables and add:

- `LEMONSQUEEZY_API_KEY` = (your new API key after rotating)
- `LEMONSQUEEZY_STORE_ID` = 341299
- `LEMONSQUEEZY_WEBHOOK_SECRET` = (your new secret after rotating)

## Step 5: Set up the webhook in Lemon Squeezy

Go to app.lemonsqueezy.com → Settings → Webhooks → Create webhook:
- URL: `https://cypru.lat/api/webhooks/lemonsqueezy`
- Events: check `order_created`
- Signing secret: same value as your LEMONSQUEEZY_WEBHOOK_SECRET env var

## Step 6: Deploy

```bash
git add .
```

```bash
git commit -m "feat: add Lemon Squeezy payments + credits system"
```

```bash
git push
```

## Step 7: Test

1. Make sure Lemon Squeezy is in TEST MODE
2. Go to cypru.lat/pricing
3. Click "Buy 5 Credits" on the Starter plan
4. Complete checkout with test card: 4242 4242 4242 4242
5. Check your database — you should see credits added to your user

## What was built:

- `prisma/schema.prisma` — Added `credits` field to User, new `Order` model
- `lib/auth.ts` — Extracted NextAuth options (needed for getServerSession in API routes)
- `lib/credits.ts` — Variant ID → credits mapping
- `app/api/auth/[...nextauth]/route.ts` — Simplified to use shared auth options
- `app/api/checkout/route.ts` — Creates Lemon Squeezy checkout with user ID
- `app/api/webhooks/lemonsqueezy/route.ts` — Receives payment confirmation, adds credits
- `app/api/credits/route.ts` — Returns user's credit balance
- `app/pricing/page.tsx` — Pricing page with 3 credit packs

## IMPORTANT: Rotate your credentials

Your API key and webhook secret were shared in chat. Before going live:
1. Go to Lemon Squeezy → Settings → API → delete old key, create new one
2. Update the webhook signing secret
3. Update both values in Vercel env vars
