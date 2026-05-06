-- CreateEnum
CREATE TYPE "RoadmapPriority" AS ENUM ('baja', 'media', 'alta', 'urgente');

-- CreateEnum
CREATE TYPE "RoadmapStatus" AS ENUM ('no_iniciado', 'en_curso', 'en_riesgo', 'bloqueado', 'completado', 'cancelado');

-- CreateEnum
CREATE TYPE "RoadmapTrafficLight" AS ENUM ('verde', 'amarillo', 'rojo', 'gris');

-- CreateEnum
CREATE TYPE "RoadmapMilestoneStatus" AS ENUM ('pendiente', 'en_curso', 'completado', 'atrasado', 'cancelado');

-- CreateTable
CREATE TABLE "RoadmapProject" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "brand" TEXT,
    "ownerName" TEXT NOT NULL,
    "priority" "RoadmapPriority" NOT NULL,
    "status" "RoadmapStatus" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "trafficLight" "RoadmapTrafficLight" NOT NULL,
    "sourceType" TEXT,
    "sourcePackagingId" TEXT,
    "sharepointFolderUrl" TEXT,
    "colorLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoadmapProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadmapMilestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerName" TEXT,
    "status" "RoadmapMilestoneStatus" NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoadmapMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoadmapProject_code_key" ON "RoadmapProject"("code");
CREATE INDEX "RoadmapProject_startDate_targetDate_idx" ON "RoadmapProject"("startDate", "targetDate");
CREATE INDEX "RoadmapProject_status_idx" ON "RoadmapProject"("status");
CREATE INDEX "RoadmapProject_ownerName_idx" ON "RoadmapProject"("ownerName");
CREATE INDEX "RoadmapProject_brand_idx" ON "RoadmapProject"("brand");
CREATE INDEX "RoadmapProject_category_idx" ON "RoadmapProject"("category");
CREATE INDEX "RoadmapMilestone_projectId_idx" ON "RoadmapMilestone"("projectId");
CREATE INDEX "RoadmapMilestone_dueDate_idx" ON "RoadmapMilestone"("dueDate");
CREATE INDEX "RoadmapMilestone_status_idx" ON "RoadmapMilestone"("status");

-- AddForeignKey
ALTER TABLE "RoadmapMilestone" ADD CONSTRAINT "RoadmapMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "RoadmapProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
