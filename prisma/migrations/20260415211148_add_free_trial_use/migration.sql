-- CreateTable
CREATE TABLE "FreeTrialUse" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "tool" TEXT NOT NULL DEFAULT 'meta-tags',
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FreeTrialUse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FreeTrialUse_visitorId_key" ON "FreeTrialUse"("visitorId");
