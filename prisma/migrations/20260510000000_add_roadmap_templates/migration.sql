-- Add configurable roadmap templates. Existing projects keep their copied milestones;
-- the nullable roadmapTemplateId is only populated for projects created from a template after this migration.
CREATE TABLE "RoadmapTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "projectType" "RoadmapProjectType",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoadmapTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RoadmapTemplateFlow" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "track" "RoadmapMilestoneTrack" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoadmapTemplateFlow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RoadmapTemplateMilestone" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "suggestedOwner" TEXT,
    "approvalRequired" BOOLEAN NOT NULL DEFAULT false,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "suggestedOffsetDays" INTEGER,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoadmapTemplateMilestone_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "RoadmapProject" ADD COLUMN "roadmapTemplateId" TEXT;

CREATE INDEX "RoadmapProject_roadmapTemplateId_idx" ON "RoadmapProject"("roadmapTemplateId");
CREATE INDEX "RoadmapTemplate_isActive_sortOrder_idx" ON "RoadmapTemplate"("isActive", "sortOrder");
CREATE INDEX "RoadmapTemplate_projectType_idx" ON "RoadmapTemplate"("projectType");
CREATE UNIQUE INDEX "RoadmapTemplateFlow_templateId_track_key" ON "RoadmapTemplateFlow"("templateId", "track");
CREATE INDEX "RoadmapTemplateFlow_templateId_sortOrder_idx" ON "RoadmapTemplateFlow"("templateId", "sortOrder");
CREATE INDEX "RoadmapTemplateMilestone_templateId_sortOrder_idx" ON "RoadmapTemplateMilestone"("templateId", "sortOrder");
CREATE INDEX "RoadmapTemplateMilestone_flowId_sequence_idx" ON "RoadmapTemplateMilestone"("flowId", "sequence");

ALTER TABLE "RoadmapProject" ADD CONSTRAINT "RoadmapProject_roadmapTemplateId_fkey" FOREIGN KEY ("roadmapTemplateId") REFERENCES "RoadmapTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RoadmapTemplateFlow" ADD CONSTRAINT "RoadmapTemplateFlow_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "RoadmapTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoadmapTemplateMilestone" ADD CONSTRAINT "RoadmapTemplateMilestone_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "RoadmapTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoadmapTemplateMilestone" ADD CONSTRAINT "RoadmapTemplateMilestone_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "RoadmapTemplateFlow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
