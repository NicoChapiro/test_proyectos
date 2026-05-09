-- CreateTable
CREATE TABLE "RoadmapActivityLog" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "milestoneId" TEXT,
    "entityType" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fieldName" TEXT,
    "beforeValue" TEXT,
    "afterValue" TEXT,
    "summary" TEXT NOT NULL,
    "actorName" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoadmapActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoadmapActivityLog_projectId_createdAt_idx" ON "RoadmapActivityLog"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "RoadmapActivityLog_milestoneId_idx" ON "RoadmapActivityLog"("milestoneId");

-- CreateIndex
CREATE INDEX "RoadmapActivityLog_action_idx" ON "RoadmapActivityLog"("action");

-- AddForeignKey
ALTER TABLE "RoadmapActivityLog" ADD CONSTRAINT "RoadmapActivityLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "RoadmapProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapActivityLog" ADD CONSTRAINT "RoadmapActivityLog_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "RoadmapMilestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
