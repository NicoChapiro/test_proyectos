-- CreateEnum
CREATE TYPE "RoadmapProjectType" AS ENUM ('packaging', 'product_launch', 'campaign', 'trade_marketing', 'ecommerce', 'content_design', 'event', 'innovation', 'regulatory_compliance', 'internal_process', 'other');

-- AlterTable
ALTER TABLE "RoadmapProject"
  ADD COLUMN "projectType" "RoadmapProjectType" NOT NULL DEFAULT 'other',
  ADD COLUMN "area" TEXT,
  ADD COLUMN "channel" TEXT;

-- Backfill known packaging-linked roadmap projects without changing unrelated records.
UPDATE "RoadmapProject"
SET "projectType" = 'packaging'
WHERE "sourceType" = 'packaging_request' OR "sourcePackagingId" IS NOT NULL;

-- CreateIndex
CREATE INDEX "RoadmapProject_projectType_idx" ON "RoadmapProject"("projectType");
CREATE INDEX "RoadmapProject_area_idx" ON "RoadmapProject"("area");
CREATE INDEX "RoadmapProject_channel_idx" ON "RoadmapProject"("channel");
