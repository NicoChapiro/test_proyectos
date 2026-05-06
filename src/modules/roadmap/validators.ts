import { ROADMAP_MILESTONE_STATUSES, ROADMAP_PRIORITIES, ROADMAP_STATUSES, ROADMAP_TRAFFIC_LIGHTS } from "./constants";
import { RoadmapError } from "./errors";
import type { RoadmapFilters, RoadmapMilestoneInput, RoadmapMilestoneStatusValue, RoadmapMilestoneUpdateInput, RoadmapPriorityValue, RoadmapProjectInput, RoadmapProjectUpdateInput, RoadmapStatusValue, RoadmapTrafficLightValue } from "./types";

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

export function validateRoadmapFilters(searchParams: URLSearchParams): RoadmapFilters {
  const rawYear = searchParams.get("year");
  const year = rawYear ? Number(rawYear) : undefined;
  if (year !== undefined && (!Number.isInteger(year) || year < 2000 || year > 2100)) {
    throw new RoadmapError("year no es válido");
  }

  return {
    year,
    status: optionalEnumValue(searchParams.get("status"), ROADMAP_STATUSES, "status") as RoadmapStatusValue | undefined,
    owner: optionalString(searchParams.get("owner")) ?? undefined,
    brand: optionalString(searchParams.get("brand")) ?? undefined,
    category: optionalString(searchParams.get("category")) ?? undefined,
    q: optionalString(searchParams.get("q")) ?? undefined,
  };
}

export function validateRoadmapProjectInput(payload: unknown): RoadmapProjectInput {
  const data = asRecord(payload);
  const input: RoadmapProjectInput = {
    name: requiredString(data.name, "name"),
    description: optionalString(data.description) ?? null,
    category: optionalString(data.category) ?? null,
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
    sharepointFolderUrl: optionalString(data.sharepointFolderUrl) ?? null,
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
  if (data.category !== undefined) input.category = optionalString(data.category) ?? null;
  if (data.brand !== undefined) input.brand = optionalString(data.brand) ?? null;
  if (data.ownerName !== undefined) input.ownerName = requiredString(data.ownerName, "ownerName");
  if (data.priority !== undefined) input.priority = enumValue(data.priority, ROADMAP_PRIORITIES, "priority") as RoadmapPriorityValue;
  if (data.status !== undefined) input.status = enumValue(data.status, ROADMAP_STATUSES, "status") as RoadmapStatusValue;
  if (data.startDate !== undefined) input.startDate = parseDate(data.startDate, "startDate");
  if (data.targetDate !== undefined) input.targetDate = parseDate(data.targetDate, "targetDate");
  if (data.completedAt !== undefined) input.completedAt = optionalDate(data.completedAt, "completedAt") ?? null;
  if (data.trafficLight !== undefined) input.trafficLight = enumValue(data.trafficLight, ROADMAP_TRAFFIC_LIGHTS, "trafficLight") as RoadmapTrafficLightValue;
  if (data.sharepointFolderUrl !== undefined) input.sharepointFolderUrl = optionalString(data.sharepointFolderUrl) ?? null;
  if (data.colorLabel !== undefined) input.colorLabel = optionalString(data.colorLabel) ?? null;
  validateRange(input.startDate, input.targetDate);
  return input;
}

export function validateMilestoneInput(payload: unknown): RoadmapMilestoneInput {
  const data = asRecord(payload);
  return {
    name: requiredString(data.name, "milestone name"),
    description: optionalString(data.description) ?? null,
    ownerName: optionalString(data.ownerName) ?? null,
    status: (optionalEnumValue(data.status, ROADMAP_MILESTONE_STATUSES, "milestone status") ?? "pendiente") as RoadmapMilestoneStatusValue,
    dueDate: parseDate(data.dueDate, "milestone dueDate"),
    completedAt: optionalDate(data.completedAt, "milestone completedAt") ?? null,
    isCritical: Boolean(data.isCritical),
    sortOrder: Number.isFinite(Number(data.sortOrder)) ? Number(data.sortOrder) : 0,
  };
}

export function validateMilestoneUpdateInput(payload: unknown): RoadmapMilestoneUpdateInput {
  const data = asRecord(payload);
  const input: RoadmapMilestoneUpdateInput = {};
  if (data.name !== undefined) input.name = requiredString(data.name, "milestone name");
  if (data.description !== undefined) input.description = optionalString(data.description) ?? null;
  if (data.ownerName !== undefined) input.ownerName = optionalString(data.ownerName) ?? null;
  if (data.status !== undefined) input.status = enumValue(data.status, ROADMAP_MILESTONE_STATUSES, "milestone status") as RoadmapMilestoneStatusValue;
  if (data.dueDate !== undefined) input.dueDate = parseDate(data.dueDate, "milestone dueDate");
  if (data.completedAt !== undefined) input.completedAt = optionalDate(data.completedAt, "milestone completedAt") ?? null;
  if (data.isCritical !== undefined) input.isCritical = Boolean(data.isCritical);
  if (data.sortOrder !== undefined) input.sortOrder = Number(data.sortOrder);
  return input;
}
