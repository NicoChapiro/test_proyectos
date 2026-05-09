import { ROADMAP_MILESTONE_CODE_LABELS, ROADMAP_MILESTONE_STATUS_LABELS } from "./constants";
import type { RoadmapApprovalStatusValue, RoadmapMilestoneStatusValue } from "./types";

export type RoadmapInsightMilestone = {
  id?: string;
  name: string;
  milestoneCode: string | null;
  sequence: number;
  sortOrder: number;
  status: RoadmapMilestoneStatusValue;
  plannedDate: Date | null;
  ownerName: string | null;
  approvalStatus?: RoadmapApprovalStatusValue | null;
};

export type RoadmapProjectPhaseKey = "design" | "purchase" | "sample" | "production" | "logistics" | "campaign" | "tracking" | "completed" | "empty";
export type RoadmapProjectSeverity = "critical" | "warning" | "ok";

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
  pendingApprovalMilestones: T[];
  pendingApprovalCount: number;
  severity: RoadmapProjectSeverity;
  severityLabel: string;
  progressPercentage: number;
};

export const ROADMAP_SEVERITY_LABELS: Record<RoadmapProjectSeverity, string> = {
  critical: "Crítico",
  warning: "Atención",
  ok: "En orden",
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
  product_design_approval: "design",
  packaging_design_approval: "design",
  content_creative_route: "design",
  event_concept_approved: "design",
  innovation_feasibility_review: "design",
  supply_purchase_order_submitted: "purchase",
  supply_supplier_sample_approval: "sample",
  supply_sample_correction_approval: "sample",
  packaging_supplier_sample_approval: "sample",
  packaging_corrections_approval: "sample",
  innovation_design_or_sample_approval: "sample",
  supply_production_start: "production",
  product_supplier_production_start: "production",
  packaging_production_start: "production",
  innovation_pilot_ready: "production",
  supply_estimated_shipment: "logistics",
  supply_estimated_arrival_santiago: "logistics",
  supply_customs_release: "logistics",
  supply_quilicura_warehouse_arrival: "logistics",
  product_quilicura_warehouse_arrival: "logistics",
  product_total_channel_implementation: "logistics",
  packaging_quilicura_arrival: "logistics",
  innovation_channel_implementation: "logistics",
  marketing_campaign_concept: "campaign",
  marketing_implementation_date: "campaign",
  marketing_activation_date: "campaign",
  marketing_brief_kickoff: "campaign",
  marketing_strategy_creative_proposal: "campaign",
  marketing_key_visual_approved: "campaign",
  marketing_360_plan_materials: "campaign",
  marketing_launch_close: "campaign",
  trade_brief_kickoff: "campaign",
  trade_mechanics_approved: "campaign",
  trade_materials_ready: "campaign",
  trade_implementation: "campaign",
  trade_close: "campaign",
  ecommerce_brief_kickoff: "campaign",
  ecommerce_assets_ready: "campaign",
  ecommerce_product_page_ready: "campaign",
  ecommerce_campaign_activation: "campaign",
  ecommerce_close: "campaign",
  content_brief_kickoff: "campaign",
  content_assets_production: "campaign",
  content_final_approval: "campaign",
  content_publication: "campaign",
  event_brief_kickoff: "campaign",
  event_production_plan: "campaign",
  event_execution: "campaign",
  event_close: "campaign",
  compliance_requirement_review: "tracking",
  compliance_documentation_ready: "tracking",
  compliance_approval: "tracking",
  compliance_implementation: "tracking",
  process_brief_kickoff: "tracking",
  process_scope_definition: "tracking",
  process_implementation_plan: "tracking",
  process_execution: "tracking",
  process_close: "tracking",
  generic_brief_kickoff: "tracking",
  generic_plan: "tracking",
  generic_execution: "tracking",
  generic_close: "tracking",
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function calculateUpcomingMilestoneDateWindow(today: Date = new Date()): { start: Date; end: Date } {
  const start = startOfUtcDay(today);
  return { start, end: new Date(start.getTime() + 8 * DAY_IN_MS) };
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
  const { start, end } = calculateUpcomingMilestoneDateWindow(today);
  return [...milestones]
    .filter((milestone) => isIncomplete(milestone) && milestone.plannedDate && milestone.plannedDate >= start && milestone.plannedDate < end)
    .sort(byActionPriority);
}

export function calculateBlockedMilestones<T extends RoadmapInsightMilestone>(milestones: T[]): T[] {
  return [...milestones].filter((milestone) => milestone.status === "blocked").sort(byActionPriority);
}

export function calculateMilestonesWithoutOwner<T extends RoadmapInsightMilestone>(milestones: T[]): T[] {
  return [...milestones].filter((milestone) => isIncomplete(milestone) && !milestone.ownerName?.trim()).sort(byWorkflowOrder);
}

export function calculatePendingApprovalMilestones<T extends RoadmapInsightMilestone>(milestones: T[]): T[] {
  return [...milestones].filter((milestone) => isIncomplete(milestone) && milestone.approvalStatus === "pending").sort(byActionPriority);
}

export function calculateProjectSeverity(metrics: Pick<RoadmapProjectInsights, "overdueMilestones" | "blockedMilestones" | "milestonesWithoutOwner" | "pendingApprovalMilestones">): RoadmapProjectSeverity {
  if (metrics.overdueMilestones.length > 0 || metrics.blockedMilestones.length > 0) return "critical";
  if (metrics.milestonesWithoutOwner.length > 0 || metrics.pendingApprovalMilestones.length > 0) return "warning";
  return "ok";
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
  const overdueMilestones = calculateOverdueMilestones(milestones, today);
  const upcomingMilestones = calculateUpcomingMilestones(milestones, today);
  const blockedMilestones = calculateBlockedMilestones(milestones);
  const milestonesWithoutOwner = calculateMilestonesWithoutOwner(milestones);
  const pendingApprovalMilestones = calculatePendingApprovalMilestones(milestones);
  const severity = calculateProjectSeverity({ overdueMilestones, blockedMilestones, milestonesWithoutOwner, pendingApprovalMilestones });

  return {
    currentPhase: calculateCurrentProjectPhase(milestones),
    nextMilestone: calculateNextMilestone(milestones),
    overdueMilestones,
    upcomingMilestones,
    blockedMilestones,
    milestonesWithoutOwner,
    pendingApprovalMilestones,
    pendingApprovalCount: pendingApprovalMilestones.length,
    severity,
    severityLabel: ROADMAP_SEVERITY_LABELS[severity],
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
