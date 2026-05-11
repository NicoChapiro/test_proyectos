-- CreateEnum
CREATE TYPE "RoadmapMilestoneDateMode" AS ENUM ('point', 'range');

-- AlterTable
ALTER TABLE "RoadmapTemplateMilestone"
  ADD COLUMN "dateMode" "RoadmapMilestoneDateMode" NOT NULL DEFAULT 'point',
  ADD COLUMN "suggestedStartOffsetDays" INTEGER,
  ADD COLUMN "suggestedEndOffsetDays" INTEGER;

-- AlterTable
ALTER TABLE "RoadmapMilestone"
  ADD COLUMN "dateMode" "RoadmapMilestoneDateMode" NOT NULL DEFAULT 'point',
  ADD COLUMN "plannedStartDate" TIMESTAMP(3),
  ADD COLUMN "plannedEndDate" TIMESTAMP(3),
  ADD COLUMN "actualStartDate" TIMESTAMP(3),
  ADD COLUMN "actualEndDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "RoadmapMilestone_plannedStartDate_plannedEndDate_idx" ON "RoadmapMilestone"("plannedStartDate", "plannedEndDate");
