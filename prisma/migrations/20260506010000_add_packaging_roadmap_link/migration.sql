-- CreateTable
CREATE TABLE "PackagingRequest" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "requesterName" TEXT NOT NULL,
    "brand" TEXT,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'recibida',
    "desiredLaunchDate" TIMESTAMP(3),
    "sharepointFolderUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackagingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PackagingRequest_code_key" ON "PackagingRequest"("code");
CREATE INDEX "PackagingRequest_status_idx" ON "PackagingRequest"("status");
CREATE INDEX "PackagingRequest_requesterName_idx" ON "PackagingRequest"("requesterName");
CREATE INDEX "PackagingRequest_brand_idx" ON "PackagingRequest"("brand");
CREATE INDEX "PackagingRequest_category_idx" ON "PackagingRequest"("category");
CREATE INDEX "RoadmapProject_sourcePackagingId_idx" ON "RoadmapProject"("sourcePackagingId");

-- AddForeignKey
ALTER TABLE "RoadmapProject" ADD CONSTRAINT "RoadmapProject_sourcePackagingId_fkey" FOREIGN KEY ("sourcePackagingId") REFERENCES "PackagingRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
