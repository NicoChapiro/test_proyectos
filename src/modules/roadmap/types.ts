import type { PackagingRequest, Prisma, RoadmapMilestone, RoadmapProject } from "@prisma/client";
import type { ROADMAP_APPROVAL_STATUSES, ROADMAP_MILESTONE_STATUSES, ROADMAP_MILESTONE_TRACKS, ROADMAP_PRIORITIES, ROADMAP_PROJECT_TYPES, ROADMAP_STATUSES, ROADMAP_TRAFFIC_LIGHTS } from "./constants";

export type RoadmapPriorityValue = (typeof ROADMAP_PRIORITIES)[number];
export type RoadmapStatusValue = (typeof ROADMAP_STATUSES)[number];
export type RoadmapTrafficLightValue = (typeof ROADMAP_TRAFFIC_LIGHTS)[number];
export type RoadmapMilestoneStatusValue = (typeof ROADMAP_MILESTONE_STATUSES)[number];
export type RoadmapMilestoneTrackValue = (typeof ROADMAP_MILESTONE_TRACKS)[number];
export type RoadmapApprovalStatusValue = (typeof ROADMAP_APPROVAL_STATUSES)[number];
export type RoadmapProjectTypeValue = (typeof ROADMAP_PROJECT_TYPES)[number];
export type RoadmapBulkOwnerAssignmentScope =
  | "all_unassigned"
  | "supply_unassigned"
  | "marketing_unassigned"
  | "pending_approvals_unassigned"
  | "upcoming_unassigned";

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
  sharepointUrl?: string | null;
  sharepointFolderUrl?: string | null;
  colorLabel?: string | null;
};

export type RoadmapProjectUpdateInput = Partial<RoadmapProjectInput>;

export type RoadmapMilestoneInput = {
  name: string;
  description?: string | null;
  milestoneCode?: string | null;
  track?: RoadmapMilestoneTrackValue;
  sequence?: number;
  ownerName?: string | null;
  status: RoadmapMilestoneStatusValue;
  dueDate: Date;
  plannedDate?: Date | null;
  actualDate?: Date | null;
  completedAt?: Date | null;
  approvalStatus?: RoadmapApprovalStatusValue | null;
  linkUrl?: string | null;
  documentUrl?: string | null;
  notes?: string | null;
  isCritical?: boolean;
  sortOrder?: number;
};

export type RoadmapMilestoneUpdateInput = Partial<RoadmapMilestoneInput>;

export type RoadmapBulkOwnerAssignmentInput = {
  ownerName: string;
  scope: RoadmapBulkOwnerAssignmentScope;
};

export type RoadmapPlannerDateInput = {
  flowLabel: string;
  dates: Array<{ milestoneId: string; plannedDate: Date | null }>;
};

export type RoadmapActivityLogInput = {
  projectId: string;
  milestoneId?: string | null;
  entityType: string;
  action: string;
  fieldName?: string | null;
  beforeValue?: string | null;
  afterValue?: string | null;
  summary: string;
  actorName?: string | null;
  metadata?: Prisma.InputJsonValue | null;
};
