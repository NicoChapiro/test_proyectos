import type { PackagingRequest, RoadmapMilestone, RoadmapProject } from "@prisma/client";
import type { ROADMAP_MILESTONE_STATUSES, ROADMAP_PRIORITIES, ROADMAP_PROJECT_TYPES, ROADMAP_STATUSES, ROADMAP_TRAFFIC_LIGHTS } from "./constants";

export type RoadmapPriorityValue = (typeof ROADMAP_PRIORITIES)[number];
export type RoadmapStatusValue = (typeof ROADMAP_STATUSES)[number];
export type RoadmapTrafficLightValue = (typeof ROADMAP_TRAFFIC_LIGHTS)[number];
export type RoadmapMilestoneStatusValue = (typeof ROADMAP_MILESTONE_STATUSES)[number];
export type RoadmapProjectTypeValue = (typeof ROADMAP_PROJECT_TYPES)[number];

export type RoadmapProjectWithMilestones = RoadmapProject & { milestones: RoadmapMilestone[]; packagingRequest?: PackagingRequest | null };

export type RoadmapFilters = {
  year?: number;
  status?: RoadmapStatusValue;
  projectType?: RoadmapProjectTypeValue;
  owner?: string;
  brand?: string;
  category?: string;
  area?: string;
  channel?: string;
  q?: string;
};

export type RoadmapProjectInput = {
  name: string;
  description?: string | null;
  projectType: RoadmapProjectTypeValue;
  category?: string | null;
  area?: string | null;
  channel?: string | null;
  brand?: string | null;
  ownerName: string;
  priority: RoadmapPriorityValue;
  status: RoadmapStatusValue;
  startDate: Date;
  targetDate: Date;
  completedAt?: Date | null;
  trafficLight: RoadmapTrafficLightValue;
  sourceType?: string | null;
  sourcePackagingId?: string | null;
  sharepointFolderUrl?: string | null;
  colorLabel?: string | null;
};

export type RoadmapProjectUpdateInput = Partial<RoadmapProjectInput>;

export type RoadmapMilestoneInput = {
  name: string;
  description?: string | null;
  ownerName?: string | null;
  status: RoadmapMilestoneStatusValue;
  dueDate: Date;
  completedAt?: Date | null;
  isCritical?: boolean;
  sortOrder?: number;
};

export type RoadmapMilestoneUpdateInput = Partial<RoadmapMilestoneInput>;
