-- Replace the original milestone status labels with the canonical workflow labels.
CREATE TYPE "RoadmapMilestoneStatus_new" AS ENUM ('not_started', 'in_progress', 'completed', 'blocked');

ALTER TABLE "RoadmapMilestone"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "RoadmapMilestoneStatus_new"
  USING (CASE "status"::text
    WHEN 'pendiente' THEN 'not_started'
    WHEN 'en_curso' THEN 'in_progress'
    WHEN 'completado' THEN 'completed'
    WHEN 'atrasado' THEN 'blocked'
    WHEN 'cancelado' THEN 'blocked'
    ELSE 'not_started'
  END)::"RoadmapMilestoneStatus_new";

DROP TYPE "RoadmapMilestoneStatus";
ALTER TYPE "RoadmapMilestoneStatus_new" RENAME TO "RoadmapMilestoneStatus";
ALTER TABLE "RoadmapMilestone" ALTER COLUMN "status" SET DEFAULT 'not_started';

-- CreateEnum
CREATE TYPE "RoadmapMilestoneTrack" AS ENUM ('supply', 'marketing');

-- CreateEnum
CREATE TYPE "RoadmapApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "RoadmapProject" ADD COLUMN "sharepointUrl" TEXT;

-- AlterTable
ALTER TABLE "RoadmapMilestone"
  ADD COLUMN "milestoneCode" TEXT,
  ADD COLUMN "track" "RoadmapMilestoneTrack" NOT NULL DEFAULT 'supply',
  ADD COLUMN "sequence" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "plannedDate" TIMESTAMP(3),
  ADD COLUMN "actualDate" TIMESTAMP(3),
  ADD COLUMN "approvalStatus" "RoadmapApprovalStatus",
  ADD COLUMN "linkUrl" TEXT,
  ADD COLUMN "documentUrl" TEXT,
  ADD COLUMN "notes" TEXT;

-- Backfill milestone metadata for existing rows.
UPDATE "RoadmapMilestone"
SET
  "plannedDate" = COALESCE("plannedDate", "dueDate"),
  "actualDate" = COALESCE("actualDate", "completedAt"),
  "sequence" = CASE WHEN "sequence" = 0 THEN "sortOrder" ELSE "sequence" END;

-- CreateIndex
CREATE UNIQUE INDEX "RoadmapMilestone_projectId_milestoneCode_key" ON "RoadmapMilestone"("projectId", "milestoneCode");
CREATE INDEX "RoadmapMilestone_plannedDate_idx" ON "RoadmapMilestone"("plannedDate");
CREATE INDEX "RoadmapMilestone_track_sequence_idx" ON "RoadmapMilestone"("track", "sequence");
