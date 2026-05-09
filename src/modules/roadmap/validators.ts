import { ROADMAP_APPROVAL_STATUSES, ROADMAP_MILESTONE_STATUSES, ROADMAP_MILESTONE_TRACKS, ROADMAP_PRIORITIES, ROADMAP_PROJECT_TYPES, ROADMAP_STATUSES, ROADMAP_TRAFFIC_LIGHTS } from "./constants";
import { RoadmapError } from "./errors";
import type { RoadmapApprovalStatusValue, RoadmapBulkOwnerAssignmentInput, RoadmapBulkOwnerAssignmentScope, RoadmapFilters, RoadmapMilestoneInput, RoadmapMilestoneStatusValue, RoadmapMilestoneTrackValue, RoadmapMilestoneUpdateInput, RoadmapPlannerDateInput, RoadmapPriorityValue, RoadmapProjectInput, RoadmapProjectTypeValue, RoadmapProjectUpdateInput, RoadmapStatusValue, RoadmapTrafficLightValue } from "./types";

const ROADMAP_BULK_OWNER_ASSIGNMENT_SCOPES = [
  "all_unassigned",
  "supply_unassigned",
  "marketing_unassigned",
  "pending_approvals_unassigned",
  "upcoming_unassigned",
] as const satisfies readonly RoadmapBulkOwnerAssignmentScope[];

function asRecord(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object") throw new RoadmapError("Payload inválido");
  return payload as Record<string, unknown>;
}

function optionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function optionalUrl(value: unknown, field: string): string | null | undefined {
  const text = optionalString(value);
  if (!text) return text;
  try {
    const url = new URL(text);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("invalid protocol");
    return url.toString();
  } catch {
    throw new RoadmapError(`${field} debe ser una URL válida`);
  }
}

function requiredString(value: unknown, field: string): string {
  const text = optionalString(value);
  if (!text) throw new RoadmapError(`${field} es requerido`);
  return text;
}

function parseDate(value: unknown, field: string): Date {
  const text = requiredString(value, field);
  const date = new Date(`${text.length === 10 ? `${text}T00:00:00.000Z` : text}`);
  if (Number.isNaN(date.getTime())) throw new RoadmapError(`${field} debe ser una fecha válida`);
  return date;
}

function optionalDate(value: unknown, field: string): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return parseDate(value, field);
}

function enumValue<T extends readonly string[]>(value: unknown, values: T, field: string): T[number] {
  const text = requiredString(value, field);
  if (!values.includes(text)) throw new RoadmapError(`${field} no es válido`);
  return text as T[number];
}

function optionalEnumValue<T extends readonly string[]>(value: unknown, values: T, field: string): T[number] | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return enumValue(value, values, field);
}

function validateRange(startDate?: Date, targetDate?: Date): void {
  if (startDate && targetDate && targetDate.getTime() < startDate.getTime()) {
    throw new RoadmapError("targetDate no puede ser anterior a startDate");
  }
}

function numberOrDefault(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function validateRoadmapFilters(searchParams: URLSearchParams): RoadmapFilters {
  const rawYear = searchParams.get("year");
  const year = rawYear ? Number(rawYear) : undefined;
  if (year !== undefined && (!Number.isInteger(year) || year < 2000 || year > 2100)) {
    throw new RoadmapError("year no es válido");
  }

  return {
    year,
    status: optionalEnumValue(searchParams.get("status"), ROADMAP_STATUSES, "status") as RoadmapStatusValue | undefined,
    projectType: optionalEnumValue(searchParams.get("projectType"), ROADMAP_PROJECT_TYPES, "projectType") as RoadmapProjectTypeValue | undefined,
    owner: optionalString(searchParams.get("owner")) ?? undefined,
    brand: optionalString(searchParams.get("brand")) ?? undefined,
    category: optionalString(searchParams.get("category")) ?? undefined,
    area: optionalString(searchParams.get("area")) ?? undefined,
    channel: optionalString(searchParams.get("channel")) ?? undefined,
    q: optionalString(searchParams.get("q")) ?? undefined,
  };
}

export function validateRoadmapProjectInput(payload: unknown): RoadmapProjectInput {
  const data = asRecord(payload);
  const sharepointUrl = optionalUrl(data.sharepointUrl ?? data.sharepointFolderUrl, "sharepointUrl") ?? null;
  const input: RoadmapProjectInput = {
    name: requiredString(data.name, "name"),
    description: optionalString(data.description) ?? null,
    projectType: (optionalEnumValue(data.projectType, ROADMAP_PROJECT_TYPES, "projectType") ?? "other") as RoadmapProjectTypeValue,
    category: optionalString(data.category) ?? null,
    area: optionalString(data.area) ?? null,
    channel: optionalString(data.channel) ?? null,
    brand: optionalString(data.brand) ?? null,
    ownerName: requiredString(data.ownerName, "ownerName"),
    priority: enumValue(data.priority, ROADMAP_PRIORITIES, "priority") as RoadmapPriorityValue,
    status: enumValue(data.status, ROADMAP_STATUSES, "status") as RoadmapStatusValue,
    startDate: parseDate(data.startDate, "startDate"),
    targetDate: parseDate(data.targetDate, "targetDate"),
    completedAt: optionalDate(data.completedAt, "completedAt") ?? null,
    trafficLight: enumValue(data.trafficLight, ROADMAP_TRAFFIC_LIGHTS, "trafficLight") as RoadmapTrafficLightValue,
    sourceType: optionalString(data.sourceType) ?? null,
    sourcePackagingId: optionalString(data.sourcePackagingId) ?? null,
    sharepointUrl,
    sharepointFolderUrl: sharepointUrl,
    colorLabel: optionalString(data.colorLabel) ?? null,
  };
  validateRange(input.startDate, input.targetDate);
  return input;
}

export function validateRoadmapProjectUpdateInput(payload: unknown): RoadmapProjectUpdateInput {
  const data = asRecord(payload);
  const input: RoadmapProjectUpdateInput = {};
  if (data.name !== undefined) input.name = requiredString(data.name, "name");
  if (data.description !== undefined) input.description = optionalString(data.description) ?? null;
  if (data.projectType !== undefined) input.projectType = enumValue(data.projectType, ROADMAP_PROJECT_TYPES, "projectType") as RoadmapProjectTypeValue;
  if (data.category !== undefined) input.category = optionalString(data.category) ?? null;
  if (data.area !== undefined) input.area = optionalString(data.area) ?? null;
  if (data.channel !== undefined) input.channel = optionalString(data.channel) ?? null;
  if (data.brand !== undefined) input.brand = optionalString(data.brand) ?? null;
  if (data.ownerName !== undefined) input.ownerName = requiredString(data.ownerName, "ownerName");
  if (data.priority !== undefined) input.priority = enumValue(data.priority, ROADMAP_PRIORITIES, "priority") as RoadmapPriorityValue;
  if (data.status !== undefined) input.status = enumValue(data.status, ROADMAP_STATUSES, "status") as RoadmapStatusValue;
  if (data.startDate !== undefined) input.startDate = parseDate(data.startDate, "startDate");
  if (data.targetDate !== undefined) input.targetDate = parseDate(data.targetDate, "targetDate");
  if (data.completedAt !== undefined) input.completedAt = optionalDate(data.completedAt, "completedAt") ?? null;
  if (data.trafficLight !== undefined) input.trafficLight = enumValue(data.trafficLight, ROADMAP_TRAFFIC_LIGHTS, "trafficLight") as RoadmapTrafficLightValue;
  if (data.sourceType !== undefined) input.sourceType = optionalString(data.sourceType) ?? null;
  if (data.sourcePackagingId !== undefined) input.sourcePackagingId = optionalString(data.sourcePackagingId) ?? null;
  if (data.sharepointUrl !== undefined || data.sharepointFolderUrl !== undefined) {
    const sharepointUrl = optionalUrl(data.sharepointUrl ?? data.sharepointFolderUrl, "sharepointUrl") ?? null;
    input.sharepointUrl = sharepointUrl;
    input.sharepointFolderUrl = sharepointUrl;
  }
  if (data.colorLabel !== undefined) input.colorLabel = optionalString(data.colorLabel) ?? null;
  validateRange(input.startDate, input.targetDate);
  return input;
}

export function validateMilestoneInput(payload: unknown): RoadmapMilestoneInput {
  const data = asRecord(payload);
  const plannedDate = optionalDate(data.plannedDate ?? data.dueDate, "milestone plannedDate");
  const actualDate = optionalDate(data.actualDate ?? data.completedAt, "milestone actualDate");
  const sequence = numberOrDefault(data.sequence ?? data.sortOrder, 0);
  return {
    name: requiredString(data.name, "milestone name"),
    description: optionalString(data.description) ?? null,
    milestoneCode: optionalString(data.milestoneCode) ?? null,
    track: (optionalEnumValue(data.track, ROADMAP_MILESTONE_TRACKS, "milestone track") ?? "supply") as RoadmapMilestoneTrackValue,
    sequence,
    ownerName: optionalString(data.ownerName) ?? null,
    status: (optionalEnumValue(data.status, ROADMAP_MILESTONE_STATUSES, "milestone status") ?? "not_started") as RoadmapMilestoneStatusValue,
    dueDate: plannedDate ?? parseDate(data.dueDate, "milestone dueDate"),
    plannedDate: plannedDate ?? null,
    actualDate: actualDate ?? null,
    completedAt: actualDate ?? null,
    approvalStatus: (optionalEnumValue(data.approvalStatus, ROADMAP_APPROVAL_STATUSES, "approval status") ?? null) as RoadmapApprovalStatusValue | null,
    linkUrl: optionalUrl(data.linkUrl, "linkUrl") ?? null,
    documentUrl: optionalUrl(data.documentUrl, "documentUrl") ?? null,
    notes: optionalString(data.notes) ?? null,
    isCritical: Boolean(data.isCritical),
    sortOrder: sequence,
  };
}

export function validateMilestoneUpdateInput(payload: unknown): RoadmapMilestoneUpdateInput {
  const data = asRecord(payload);
  const input: RoadmapMilestoneUpdateInput = {};
  if (data.name !== undefined) input.name = requiredString(data.name, "milestone name");
  if (data.description !== undefined) input.description = optionalString(data.description) ?? null;
  if (data.milestoneCode !== undefined) input.milestoneCode = optionalString(data.milestoneCode) ?? null;
  if (data.track !== undefined) input.track = enumValue(data.track, ROADMAP_MILESTONE_TRACKS, "milestone track") as RoadmapMilestoneTrackValue;
  if (data.sequence !== undefined || data.sortOrder !== undefined) {
    const sequence = numberOrDefault(data.sequence ?? data.sortOrder, 0);
    input.sequence = sequence;
    input.sortOrder = sequence;
  }
  if (data.ownerName !== undefined) input.ownerName = optionalString(data.ownerName) ?? null;
  if (data.status !== undefined) input.status = enumValue(data.status, ROADMAP_MILESTONE_STATUSES, "milestone status") as RoadmapMilestoneStatusValue;
  if (data.dueDate !== undefined || data.plannedDate !== undefined) {
    const plannedDate = optionalDate(data.plannedDate ?? data.dueDate, "milestone plannedDate") ?? null;
    input.plannedDate = plannedDate;
    if (plannedDate) input.dueDate = plannedDate;
  }
  if (data.actualDate !== undefined || data.completedAt !== undefined) {
    const actualDate = optionalDate(data.actualDate ?? data.completedAt, "milestone actualDate") ?? null;
    input.actualDate = actualDate;
    input.completedAt = actualDate;
  }
  if (data.approvalStatus !== undefined) input.approvalStatus = (optionalEnumValue(data.approvalStatus, ROADMAP_APPROVAL_STATUSES, "approval status") ?? null) as RoadmapApprovalStatusValue | null;
  if (data.linkUrl !== undefined) input.linkUrl = optionalUrl(data.linkUrl, "linkUrl") ?? null;
  if (data.documentUrl !== undefined) input.documentUrl = optionalUrl(data.documentUrl, "documentUrl") ?? null;
  if (data.notes !== undefined) input.notes = optionalString(data.notes) ?? null;
  if (data.isCritical !== undefined) input.isCritical = Boolean(data.isCritical);
  return input;
}

export function validateBulkOwnerAssignmentInput(
  payload: unknown,
): RoadmapBulkOwnerAssignmentInput {
  const data = asRecord(payload);
  return {
    ownerName: requiredString(data.ownerName, "Responsable(s)"),
    scope: enumValue(
      data.scope,
      ROADMAP_BULK_OWNER_ASSIGNMENT_SCOPES,
      "Alcance",
    ) as RoadmapBulkOwnerAssignmentScope,
  };
}

export function validateRoadmapPlannerDateInput(
  formData: FormData,
): RoadmapPlannerDateInput {
  const flowLabel = requiredString(formData.get("flowLabel"), "Flujo");
  const dates: RoadmapPlannerDateInput["dates"] = [];
  formData.forEach((value, key) => {
    if (!key.startsWith("plannedDate:")) return;
    const milestoneId = key.slice("plannedDate:".length).trim();
    if (!milestoneId) throw new RoadmapError("Hito inválido");
    dates.push({
      milestoneId,
      plannedDate: optionalDate(value, "Fecha planificada") ?? null,
    });
  });
  if (dates.length === 0) {
    throw new RoadmapError("No hay fechas para actualizar");
  }
  return { flowLabel, dates };
}
