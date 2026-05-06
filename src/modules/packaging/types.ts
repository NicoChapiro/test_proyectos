import type { PackagingRequest, RoadmapProject } from "@prisma/client";
import type { RoadmapProjectWithMilestones } from "@/modules/roadmap/types";

export type PackagingRequestWithRoadmapProjects = PackagingRequest & {
  roadmapProjects: RoadmapProjectWithMilestones[];
};

export type PackagingRequestInput = {
  code: string;
  title: string;
  description?: string | null;
  requesterName: string;
  brand?: string | null;
  category?: string | null;
  status?: string;
  desiredLaunchDate?: Date | null;
  sharepointFolderUrl?: string | null;
};

export type PackagingRoadmapLinkInput = {
  projectId: string;
};

export type PackagingRoadmapProject = RoadmapProject;
