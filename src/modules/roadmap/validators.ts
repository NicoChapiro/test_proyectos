import { ROADMAP_APPROVAL_STATUSES, ROADMAP_MILESTONE_STATUSES, ROADMAP_MILESTONE_TRACKS, ROADMAP_PRIORITIES, ROADMAP_PROJECT_TYPES, ROADMAP_STATUSES, ROADMAP_TRAFFIC_LIGHTS } from "./constants";
import { RoadmapError } from "./errors";
import type { RoadmapApprovalStatusValue, RoadmapBulkOwnerAssignmentInput, RoadmapBulkOwnerAssignmentScope, RoadmapFilters, RoadmapMilestoneDateModeValue, RoadmapMilestoneInput, RoadmapMilestoneStatusValue, RoadmapMilestoneTrackValue, RoadmapMilestoneUpdateInput, RoadmapPlannerDateInput, RoadmapPriorityValue, RoadmapProjectInput, RoadmapProjectTypeValue, RoadmapProjectUpdateInput, RoadmapStatusValue, RoadmapTemplateInput, RoadmapTrafficLightValue } from "./types";

const ROADMAP_BULK_OWNER_ASSIGNMENT_SCOPES = [
  "all_unassigned",
  "supply_unassigned",
  "marketing_unassigned",
  "pending_approvals_unassigned",
  "upcoming_unassigned",
] as const satisfies readonly RoadmapBulkOwnerAssignmentScope[];

const ROADMAP_MILESTONE_DATE_MODES = ["point", "range"] as const;

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

function validateMilestoneDateRange(startDate?: Date | null, endDate?: Date | null): void {
  if (startDate && endDate && endDate.getTime() < startDate.getTime()) {
    throw new RoadmapError("La fecha de término no puede ser anterior al inicio");
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
    roadmapTemplateId: optionalString(data.roadmapTemplateId) ?? null,
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
  if (data.roadmapTemplateId !== undefined) input.roadmapTemplateId = optionalString(data.roadmapTemplateId) ?? null;
  validateRange(input.startDate, input.targetDate);
  return input;
}

export function validateMilestoneInput(payload: unknown): RoadmapMilestoneInput {
  const data = asRecord(payload);
  const dateMode = (optionalEnumValue(data.dateMode, ROADMAP_MILESTONE_DATE_MODES, "Tipo de hito") ?? "point") as RoadmapMilestoneDateModeValue;
  const plannedDate = optionalDate(data.plannedDate ?? data.dueDate, "milestone plannedDate");
  const actualDate = optionalDate(data.actualDate ?? data.completedAt, "milestone actualDate");
  const plannedStartDate = optionalDate(data.plannedStartDate, "Inicio planificado") ?? null;
  const plannedEndDate = optionalDate(data.plannedEndDate, "Término planificado") ?? null;
  const actualStartDate = optionalDate(data.actualStartDate, "Inicio real") ?? null;
  const actualEndDate = optionalDate(data.actualEndDate, "Término real") ?? null;
  validateMilestoneDateRange(plannedStartDate, plannedEndDate);
  validateMilestoneDateRange(actualStartDate, actualEndDate);
  const sequence = numberOrDefault(data.sequence ?? data.sortOrder, 0);
  const compatibilityDate = dateMode === "range" ? plannedEndDate ?? plannedStartDate ?? plannedDate : plannedDate;
  return {
    name: requiredString(data.name, "milestone name"),
    description: optionalString(data.description) ?? null,
    milestoneCode: optionalString(data.milestoneCode) ?? null,
    track: (optionalEnumValue(data.track, ROADMAP_MILESTONE_TRACKS, "milestone track") ?? "supply") as RoadmapMilestoneTrackValue,
    sequence,
    ownerName: optionalString(data.ownerName) ?? null,
    status: (optionalEnumValue(data.status, ROADMAP_MILESTONE_STATUSES, "milestone status") ?? "not_started") as RoadmapMilestoneStatusValue,
    dueDate: compatibilityDate ?? parseDate(data.dueDate, "milestone dueDate"),
    plannedDate: compatibilityDate ?? null,
    actualDate: dateMode === "range" ? actualEndDate ?? actualStartDate ?? actualDate ?? null : actualDate ?? null,
    completedAt: dateMode === "range" ? actualEndDate ?? actualStartDate ?? actualDate ?? null : actualDate ?? null,
    dateMode,
    plannedStartDate: dateMode === "range" ? plannedStartDate : null,
    plannedEndDate: dateMode === "range" ? plannedEndDate : null,
    actualStartDate: dateMode === "range" ? actualStartDate : null,
    actualEndDate: dateMode === "range" ? actualEndDate : null,
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
  if (data.dateMode !== undefined) input.dateMode = enumValue(data.dateMode, ROADMAP_MILESTONE_DATE_MODES, "Tipo de hito") as RoadmapMilestoneDateModeValue;
  if (data.dueDate !== undefined || data.plannedDate !== undefined) {
    const plannedDate = optionalDate(data.plannedDate ?? data.dueDate, "milestone plannedDate") ?? null;
    input.plannedDate = plannedDate;
    if (plannedDate) input.dueDate = plannedDate;
  }
  if (data.plannedStartDate !== undefined || data.plannedEndDate !== undefined) {
    const plannedStartDate = optionalDate(data.plannedStartDate, "Inicio planificado") ?? null;
    const plannedEndDate = optionalDate(data.plannedEndDate, "Término planificado") ?? null;
    validateMilestoneDateRange(plannedStartDate, plannedEndDate);
    input.dateMode = "range";
    input.plannedStartDate = plannedStartDate;
    input.plannedEndDate = plannedEndDate;
    const compatibilityDate = plannedEndDate ?? plannedStartDate;
    if (compatibilityDate) {
      input.plannedDate = compatibilityDate;
      input.dueDate = compatibilityDate;
    }
  }
  if (data.actualDate !== undefined || data.completedAt !== undefined) {
    const actualDate = optionalDate(data.actualDate ?? data.completedAt, "milestone actualDate") ?? null;
    input.actualDate = actualDate;
    input.completedAt = actualDate;
  }
  if (data.actualStartDate !== undefined || data.actualEndDate !== undefined) {
    const actualStartDate = optionalDate(data.actualStartDate, "Inicio real") ?? null;
    const actualEndDate = optionalDate(data.actualEndDate, "Término real") ?? null;
    validateMilestoneDateRange(actualStartDate, actualEndDate);
    input.actualStartDate = actualStartDate;
    input.actualEndDate = actualEndDate;
    const compatibilityDate = actualEndDate ?? actualStartDate;
    input.actualDate = compatibilityDate ?? input.actualDate ?? null;
    input.completedAt = compatibilityDate ?? input.completedAt ?? null;
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
      plannedStartDate: optionalDate(formData.get(`plannedStartDate:${milestoneId}`), "Inicio") ?? undefined,
      plannedEndDate: optionalDate(formData.get(`plannedEndDate:${milestoneId}`), "Término") ?? undefined,
    });
  });
  formData.forEach((_, key) => {
    if (!key.startsWith("plannedStartDate:")) return;
    const milestoneId = key.slice("plannedStartDate:".length).trim();
    if (!milestoneId || dates.some((date) => date.milestoneId === milestoneId)) return;
    const plannedStartDate = optionalDate(formData.get(`plannedStartDate:${milestoneId}`), "Inicio") ?? null;
    const plannedEndDate = optionalDate(formData.get(`plannedEndDate:${milestoneId}`), "Término") ?? null;
    validateMilestoneDateRange(plannedStartDate, plannedEndDate);
    dates.push({ milestoneId, plannedDate: plannedEndDate ?? plannedStartDate, plannedStartDate, plannedEndDate });
  });
  for (const date of dates) validateMilestoneDateRange(date.plannedStartDate, date.plannedEndDate);
  if (dates.length === 0) {
    throw new RoadmapError("No hay fechas para actualizar");
  }
  return { flowLabel, dates };
}

function booleanFromForm(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === "1";
}

function parseTemplateMilestoneLines(value: unknown): RoadmapTemplateInput["milestones"] {
  const text = requiredString(value, "Hitos de plantilla");
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [flowTrackRaw, nameRaw, ownerRaw, approvalRaw, criticalRaw, offsetRaw, notesRaw, dateModeRaw, startOffsetRaw, endOffsetRaw] = line.split("|").map((part) => part.trim());
      const flowTrack = enumValue(flowTrackRaw, ROADMAP_MILESTONE_TRACKS, `Flujo línea ${index + 1}`) as RoadmapMilestoneTrackValue;
      const dateMode = (optionalEnumValue(dateModeRaw, ROADMAP_MILESTONE_DATE_MODES, `Tipo línea ${index + 1}`) ?? "point") as RoadmapMilestoneDateModeValue;
      const numericOffset = (raw: unknown, label: string) => {
        const text = optionalString(raw);
        const value = text === undefined || text === null ? null : numberOrDefault(text, Number.NaN);
        if (value !== null && !Number.isFinite(value)) throw new RoadmapError(`${label} debe ser numérico`);
        return value;
      };
      const suggestedOffsetDays = numericOffset(offsetRaw, `Offset línea ${index + 1}`);
      const suggestedStartOffsetDays = numericOffset(startOffsetRaw, `Inicio línea ${index + 1}`);
      const suggestedEndOffsetDays = numericOffset(endOffsetRaw, `Término línea ${index + 1}`);
      if (dateMode === "range" && suggestedStartOffsetDays !== null && suggestedEndOffsetDays !== null && suggestedEndOffsetDays < suggestedStartOffsetDays) {
        throw new RoadmapError(`Término línea ${index + 1} debe ser mayor o igual al inicio`);
      }
      return {
        name: requiredString(nameRaw, `Nombre de hito línea ${index + 1}`),
        flowTrack,
        sequence: index + 1,
        suggestedOwner: optionalString(ownerRaw) ?? null,
        approvalRequired: booleanFromForm(approvalRaw),
        isCritical: booleanFromForm(criticalRaw),
        suggestedOffsetDays: dateMode === "point" ? suggestedOffsetDays : suggestedEndOffsetDays ?? suggestedOffsetDays,
        dateMode,
        suggestedStartOffsetDays: dateMode === "range" ? suggestedStartOffsetDays : null,
        suggestedEndOffsetDays: dateMode === "range" ? suggestedEndOffsetDays : null,
        notes: optionalString(notesRaw) ?? null,
      };
    });
}

export function validateRoadmapTemplateInput(payload: unknown): RoadmapTemplateInput {
  const data = asRecord(payload);
  const flowDefinitions = [
    { name: requiredString(data.supplyFlowName || "Operaciones / Proveedor", "Flujo supply"), track: "supply" as const, sortOrder: numberOrDefault(data.supplyFlowOrder, 1) },
    { name: requiredString(data.marketingFlowName || "Marketing / Campaña", "Flujo marketing"), track: "marketing" as const, sortOrder: numberOrDefault(data.marketingFlowOrder, 2) },
  ].sort((first, second) => first.sortOrder - second.sortOrder);
  const milestones = parseTemplateMilestoneLines(data.milestonesText);
  const usedTracks = new Set(milestones.map((milestone) => milestone.flowTrack));
  const flows = flowDefinitions.filter((flow) => usedTracks.has(flow.track));
  if (flows.length === 0) throw new RoadmapError("La plantilla debe tener al menos un flujo con hitos");

  return {
    name: requiredString(data.name, "Nombre de plantilla"),
    description: optionalString(data.description) ?? null,
    projectType: (optionalEnumValue(data.projectType, ROADMAP_PROJECT_TYPES, "Tipo sugerido") ?? null) as RoadmapProjectTypeValue | null,
    isActive: data.isActive === undefined ? false : booleanFromForm(data.isActive),
    sortOrder: numberOrDefault(data.sortOrder, 0),
    flows,
    milestones,
  };
}
