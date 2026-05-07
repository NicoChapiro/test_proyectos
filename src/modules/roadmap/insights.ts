import { ROADMAP_MILESTONE_CODE_LABELS, ROADMAP_MILESTONE_STATUS_LABELS } from "./constants";
import type { RoadmapMilestoneStatusValue } from "./types";

export type RoadmapInsightMilestone = {
  id?: string;
  name: string;
  milestoneCode: string | null;
  sequence: number;
  sortOrder: number;
  status: RoadmapMilestoneStatusValue;
  plannedDate: Date | null;
  ownerName: string | null;
};

export type RoadmapProjectPhaseKey = "design" | "purchase" | "sample" | "production" | "logistics" | "campaign" | "tracking" | "completed" | "empty";

export type RoadmapProjectPhase = {
  key: RoadmapProjectPhaseKey;
  label: string;
};

export type RoadmapProjectInsights<T extends RoadmapInsightMilestone = RoadmapInsightMilestone> = {
  currentPhase: RoadmapProjectPhase;
  nextMilestone: T | null;
  overdueMilestones: T[];
  upcomingMilestones: T[];
  blockedMilestones: T[];
  milestonesWithoutOwner: T[];
  progressPercentage: number;
};

export const ROADMAP_PHASE_LABELS: Record<RoadmapProjectPhaseKey, string> = {
  design: "Diseño",
  purchase: "Compra",
  sample: "Muestra",
  production: "Producción",
  logistics: "Logística",
  campaign: "Campaña",
  tracking: "Seguimiento",
  completed: "Completado",
  empty: "Sin hitos",
};

export const ROADMAP_PHASE_BY_MILESTONE_CODE: Record<string, RoadmapProjectPhaseKey> = {
  supply_internal_design_approval: "design",
  supply_purchase_order_submitted: "purchase",
  supply_supplier_sample_approval: "sample",
  supply_sample_correction_approval: "sample",
  supply_production_start: "production",
  supply_estimated_shipment: "logistics",
  supply_estimated_arrival_santiago: "logistics",
  supply_customs_release: "logistics",
  supply_quilicura_warehouse_arrival: "logistics",
  marketing_campaign_concept: "campaign",
  marketing_implementation_date: "campaign",
  marketing_activation_date: "campaign",
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function milestoneOrderValue(milestone: RoadmapInsightMilestone): number {
  return milestone.sequence || milestone.sortOrder || Number.MAX_SAFE_INTEGER;
}

function byWorkflowOrder(firstMilestone: RoadmapInsightMilestone, secondMilestone: RoadmapInsightMilestone): number {
  const sequenceDifference = milestoneOrderValue(firstMilestone) - milestoneOrderValue(secondMilestone);
  if (sequenceDifference !== 0) return sequenceDifference;
  if (firstMilestone.plannedDate && secondMilestone.plannedDate) return firstMilestone.plannedDate.getTime() - secondMilestone.plannedDate.getTime();
  if (firstMilestone.plannedDate) return -1;
  if (secondMilestone.plannedDate) return 1;
  return firstMilestone.name.localeCompare(secondMilestone.name, "es");
}

function byActionPriority(firstMilestone: RoadmapInsightMilestone, secondMilestone: RoadmapInsightMilestone): number {
  if (firstMilestone.plannedDate && secondMilestone.plannedDate) return firstMilestone.plannedDate.getTime() - secondMilestone.plannedDate.getTime();
  if (firstMilestone.plannedDate) return -1;
  if (secondMilestone.plannedDate) return 1;
  return byWorkflowOrder(firstMilestone, secondMilestone);
}

function isIncomplete(milestone: RoadmapInsightMilestone): boolean {
  return milestone.status !== "completed";
}

function phaseForMilestone(milestone: RoadmapInsightMilestone | null): RoadmapProjectPhase | null {
  if (!milestone?.milestoneCode) return null;
  const key = ROADMAP_PHASE_BY_MILESTONE_CODE[milestone.milestoneCode];
  return key ? { key, label: ROADMAP_PHASE_LABELS[key] } : null;
}

export function calculateNextMilestone<T extends RoadmapInsightMilestone>(milestones: T[]): T | null {
  return [...milestones].filter(isIncomplete).sort(byActionPriority)[0] ?? null;
}

export function calculateOverdueMilestones<T extends RoadmapInsightMilestone>(milestones: T[], today: Date = new Date()): T[] {
  const todayStart = startOfUtcDay(today);
  return [...milestones]
    .filter((milestone) => isIncomplete(milestone) && milestone.plannedDate && milestone.plannedDate < todayStart)
    .sort(byActionPriority);
}

export function calculateUpcomingMilestones<T extends RoadmapInsightMilestone>(milestones: T[], today: Date = new Date()): T[] {
  const todayStart = startOfUtcDay(today);
  const upcomingEnd = new Date(todayStart.getTime() + 8 * DAY_IN_MS);
  return [...milestones]
    .filter((milestone) => isIncomplete(milestone) && milestone.plannedDate && milestone.plannedDate >= todayStart && milestone.plannedDate < upcomingEnd)
    .sort(byActionPriority);
}

export function calculateBlockedMilestones<T extends RoadmapInsightMilestone>(milestones: T[]): T[] {
  return [...milestones].filter((milestone) => milestone.status === "blocked").sort(byActionPriority);
}

export function calculateMilestonesWithoutOwner<T extends RoadmapInsightMilestone>(milestones: T[]): T[] {
  return [...milestones].filter((milestone) => isIncomplete(milestone) && !milestone.ownerName?.trim()).sort(byWorkflowOrder);
}

export function calculateProgressPercentage(milestones: RoadmapInsightMilestone[]): number {
  if (milestones.length === 0) return 0;
  const completed = milestones.filter((milestone) => milestone.status === "completed").length;
  return Math.round((completed / milestones.length) * 100);
}

export function calculateCurrentProjectPhase<T extends RoadmapInsightMilestone>(milestones: T[]): RoadmapProjectPhase {
  if (milestones.length === 0) return { key: "empty", label: ROADMAP_PHASE_LABELS.empty };

  const nextMilestone = calculateNextMilestone(milestones);
  const nextPhase = phaseForMilestone(nextMilestone);
  if (nextPhase) return nextPhase;

  if (!nextMilestone) return { key: "completed", label: ROADMAP_PHASE_LABELS.completed };

  const latestCompletedWithPhase = [...milestones]
    .filter((milestone) => milestone.status === "completed" && phaseForMilestone(milestone))
    .sort(byWorkflowOrder)
    .at(-1);

  return phaseForMilestone(latestCompletedWithPhase ?? null) ?? { key: "tracking", label: ROADMAP_PHASE_LABELS.tracking };
}

export function buildRoadmapProjectInsights<T extends RoadmapInsightMilestone>(milestones: T[], today: Date = new Date()): RoadmapProjectInsights<T> {
  return {
    currentPhase: calculateCurrentProjectPhase(milestones),
    nextMilestone: calculateNextMilestone(milestones),
    overdueMilestones: calculateOverdueMilestones(milestones, today),
    upcomingMilestones: calculateUpcomingMilestones(milestones, today),
    blockedMilestones: calculateBlockedMilestones(milestones),
    milestonesWithoutOwner: calculateMilestonesWithoutOwner(milestones),
    progressPercentage: calculateProgressPercentage(milestones),
  };
}

export function displayInsightMilestoneName(milestone: Pick<RoadmapInsightMilestone, "name" | "milestoneCode">): string {
  return milestone.milestoneCode && milestone.milestoneCode in ROADMAP_MILESTONE_CODE_LABELS
    ? ROADMAP_MILESTONE_CODE_LABELS[milestone.milestoneCode as keyof typeof ROADMAP_MILESTONE_CODE_LABELS]
    : milestone.name;
}

export function displayInsightMilestoneStatus(milestone: Pick<RoadmapInsightMilestone, "status">): string {
  return ROADMAP_MILESTONE_STATUS_LABELS[milestone.status];
}
