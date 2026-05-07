import { ROADMAP_APPROVAL_STATUS_LABELS, ROADMAP_MILESTONE_CODE_LABELS, ROADMAP_MILESTONE_STATUS_LABELS, ROADMAP_TRACK_LABELS } from "../constants";
import type { RoadmapApprovalStatusValue, RoadmapMilestoneStatusValue, RoadmapMilestoneTrackValue } from "../types";

export function displayMilestoneName(milestone: { name: string; milestoneCode?: string | null }): string {
  if (!milestone.milestoneCode) return milestone.name;
  return ROADMAP_MILESTONE_CODE_LABELS[milestone.milestoneCode as keyof typeof ROADMAP_MILESTONE_CODE_LABELS] ?? milestone.name;
}

export function displayMilestoneStatus(status: RoadmapMilestoneStatusValue): string {
  return ROADMAP_MILESTONE_STATUS_LABELS[status];
}

export function displayApprovalStatus(status: RoadmapApprovalStatusValue | null | undefined): string {
  return status ? ROADMAP_APPROVAL_STATUS_LABELS[status] : "—";
}

export function displayTrackLabel(track: RoadmapMilestoneTrackValue): string {
  return ROADMAP_TRACK_LABELS[track];
}
