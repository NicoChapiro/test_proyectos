import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ROADMAP_APPROVAL_STATUS_LABELS,
  ROADMAP_PRIORITY_LABELS,
  ROADMAP_PROJECT_TYPE_LABELS,
  ROADMAP_STATUS_LABELS,
  ROADMAP_TRAFFIC_LIGHT_LABELS,
  ROADMAP_TRACK_LABELS,
} from "./constants";
import { RoadmapNotFoundError } from "./errors";
import {
  bulkUpdateMilestoneOwners,
  createManyRoadmapActivityLogs,
  createRoadmapActivityLog,
  createRoadmapMilestone,
  createRoadmapProject,
  getRoadmapMilestone,
  getRoadmapProject,
  listRoadmapActivityLogs,
  listRoadmapProjects,
  updateRoadmapMilestone,
  updateRoadmapProject,
} from "./repository";
import type {
  RoadmapActivityLogInput,
  RoadmapBulkOwnerAssignmentInput,
  RoadmapFilters,
  RoadmapMilestoneInput,
  RoadmapMilestoneUpdateInput,
  RoadmapProjectInput,
  RoadmapProjectUpdateInput,
} from "./types";
import { displayDate } from "./ui/date";
import { displayMilestoneName, displayMilestoneStatus } from "./ui/labels";

const DEFAULT_ACTOR_NAME = "Sistema Roadmap";
const TRUNCATED_FIELD_NAMES = new Set(["description", "notes"]);

const PROJECT_ACTIVITY_FIELDS = [
  "name",
  "description",
  "projectType",
  "category",
  "area",
  "channel",
  "brand",
  "ownerName",
  "priority",
  "status",
  "startDate",
  "targetDate",
  "completedAt",
  "trafficLight",
  "sharepointUrl",
  "sharepointFolderUrl",
  "colorLabel",
] as const;

const MILESTONE_ACTIVITY_FIELDS = [
  "name",
  "description",
  "track",
  "sequence",
  "ownerName",
  "status",
  "dueDate",
  "plannedDate",
  "actualDate",
  "completedAt",
  "approvalStatus",
  "linkUrl",
  "documentUrl",
  "notes",
  "isCritical",
  "sortOrder",
] as const;

type ProjectActivityField = (typeof PROJECT_ACTIVITY_FIELDS)[number];
type MilestoneActivityField = (typeof MILESTONE_ACTIVITY_FIELDS)[number];
type ActivityEntity = "project" | "milestone";

type ActivityFieldDefinition<TField extends string> = {
  label: string;
  summaryLabel: string;
  valueLabel?: (value: unknown) => string;
  changedSummary?: (beforeValue: string, afterValue: string, context?: string) => string;
};

function roadmapCode(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `RMP-${new Date().getUTCFullYear()}-${stamp}${random}`;
}

function mapPrismaNotFound(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    throw new RoadmapNotFoundError();
  }
  throw error;
}

function actorName(input?: { actorName?: string | null }): string {
  const safeActor = input?.actorName?.trim();
  return safeActor || DEFAULT_ACTOR_NAME;
}

function truncateValue(value: string, limit = 160): string {
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}

function normalizeValue(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function isSameActivityValue(beforeValue: unknown, afterValue: unknown): boolean {
  return normalizeValue(beforeValue) === normalizeValue(afterValue);
}

function dateValue(value: unknown): string {
  return value ? displayDate(value as Date | string) : "Sin fecha";
}

function genericValue(value: unknown): string {
  return normalizeValue(value) ?? "—";
}

function booleanValue(value: unknown): string {
  return value ? "Sí" : "No";
}

function safeEnumLabel<T extends string>(labels: Record<T, string>, value: unknown): string {
  const rawValue = normalizeValue(value) as T | null;
  if (!rawValue) return "—";
  return labels[rawValue] ?? rawValue;
}

function projectStatusValue(value: unknown): string {
  return safeEnumLabel(ROADMAP_STATUS_LABELS, value);
}

function projectPriorityValue(value: unknown): string {
  return safeEnumLabel(ROADMAP_PRIORITY_LABELS, value);
}

function projectTypeValue(value: unknown): string {
  return safeEnumLabel(ROADMAP_PROJECT_TYPE_LABELS, value);
}

function trafficLightValue(value: unknown): string {
  return safeEnumLabel(ROADMAP_TRAFFIC_LIGHT_LABELS, value);
}

function milestoneStatusValue(value: unknown): string {
  return value ? displayMilestoneStatus(value as never) : "—";
}

function approvalValue(value: unknown): string {
  return safeEnumLabel(ROADMAP_APPROVAL_STATUS_LABELS, value);
}

function trackValue(value: unknown): string {
  return safeEnumLabel(ROADMAP_TRACK_LABELS, value);
}

function isFeminineSummaryLabel(summaryLabel: string): boolean {
  return (
    summaryLabel.startsWith("Fecha") ||
    [
      "Aprobación",
      "Área",
      "Categoría",
      "Carpeta SharePoint",
      "Descripción del hito",
      "Descripción del proyecto",
      "Marca",
      "Marca crítica",
      "Prioridad",
      "Secuencia del hito",
    ].includes(summaryLabel)
  );
}

function defaultChangedSummary(summaryLabel: string, beforeValue: string, afterValue: string): string {
  const changedWord = isFeminineSummaryLabel(summaryLabel) ? "cambiada" : "cambiado";
  return `${summaryLabel} ${changedWord} de ${beforeValue} a ${afterValue}`;
}

const PROJECT_FIELD_DEFINITIONS: Record<ProjectActivityField, ActivityFieldDefinition<ProjectActivityField>> = {
  name: { label: "Nombre", summaryLabel: "Nombre del proyecto" },
  description: { label: "Descripción", summaryLabel: "Descripción del proyecto" },
  projectType: { label: "Tipo", summaryLabel: "Tipo de proyecto", valueLabel: projectTypeValue },
  category: { label: "Categoría", summaryLabel: "Categoría" },
  area: { label: "Área", summaryLabel: "Área" },
  channel: { label: "Canal", summaryLabel: "Canal" },
  brand: { label: "Marca", summaryLabel: "Marca" },
  ownerName: { label: "Responsable", summaryLabel: "Responsable del proyecto" },
  priority: { label: "Prioridad", summaryLabel: "Prioridad", valueLabel: projectPriorityValue },
  status: { label: "Estado", summaryLabel: "Estado del proyecto", valueLabel: projectStatusValue },
  startDate: { label: "Fecha de inicio", summaryLabel: "Fecha de inicio", valueLabel: dateValue },
  targetDate: { label: "Fecha objetivo", summaryLabel: "Fecha objetivo", valueLabel: dateValue },
  completedAt: { label: "Fecha de cierre", summaryLabel: "Fecha de cierre", valueLabel: dateValue },
  trafficLight: { label: "Semáforo", summaryLabel: "Semáforo", valueLabel: trafficLightValue },
  sharepointUrl: { label: "SharePoint", summaryLabel: "Enlace SharePoint" },
  sharepointFolderUrl: { label: "Carpeta SharePoint", summaryLabel: "Carpeta SharePoint" },
  colorLabel: { label: "Color", summaryLabel: "Color" },
};

const MILESTONE_FIELD_DEFINITIONS: Record<MilestoneActivityField, ActivityFieldDefinition<MilestoneActivityField>> = {
  name: { label: "Nombre", summaryLabel: "Nombre del hito" },
  description: { label: "Descripción", summaryLabel: "Descripción del hito" },
  track: { label: "Track", summaryLabel: "Track del hito", valueLabel: trackValue },
  sequence: { label: "Secuencia", summaryLabel: "Secuencia del hito" },
  ownerName: { label: "Responsable", summaryLabel: "Responsable del hito" },
  status: { label: "Estado", summaryLabel: "Estado del hito", valueLabel: milestoneStatusValue },
  dueDate: { label: "Fecha vencimiento", summaryLabel: "Fecha de vencimiento", valueLabel: dateValue },
  plannedDate: { label: "Fecha planificada", summaryLabel: "Fecha planificada", valueLabel: dateValue },
  actualDate: { label: "Fecha real", summaryLabel: "Fecha real", valueLabel: dateValue },
  completedAt: { label: "Fecha completado", summaryLabel: "Fecha de completado", valueLabel: dateValue },
  approvalStatus: { label: "Aprobación", summaryLabel: "Aprobación", valueLabel: approvalValue },
  linkUrl: { label: "Enlace", summaryLabel: "Enlace del hito" },
  documentUrl: { label: "Documento", summaryLabel: "Documento del hito" },
  notes: { label: "Notas", summaryLabel: "Notas del hito" },
  isCritical: { label: "Crítico", summaryLabel: "Marca crítica", valueLabel: booleanValue },
  sortOrder: { label: "Orden", summaryLabel: "Orden del hito" },
};

function displayFieldValue(fieldName: string, value: unknown, definition: ActivityFieldDefinition<string>): string {
  const rawValue = definition.valueLabel ? definition.valueLabel(value) : genericValue(value);
  return TRUNCATED_FIELD_NAMES.has(fieldName) ? truncateValue(rawValue) : truncateValue(rawValue);
}

function activityDiffs<TField extends string>(args: {
  fields: readonly TField[];
  definitions: Record<TField, ActivityFieldDefinition<TField>>;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  entityType: ActivityEntity;
  action: string;
  projectId: string;
  milestoneId?: string | null;
  milestoneName?: string;
  actorName: string;
}): RoadmapActivityLogInput[] {
  return args.fields.flatMap((fieldName) => {
    const beforeRaw = args.before[fieldName];
    const afterRaw = args.after[fieldName];
    if (isSameActivityValue(beforeRaw, afterRaw)) return [];

    const definition = args.definitions[fieldName];
    const beforeValue = displayFieldValue(fieldName, beforeRaw, definition);
    const afterValue = displayFieldValue(fieldName, afterRaw, definition);
    const summary = definition.changedSummary
      ? definition.changedSummary(beforeValue, afterValue, args.milestoneName)
      : defaultChangedSummary(definition.summaryLabel, beforeValue, afterValue);

    return [
      {
        projectId: args.projectId,
        milestoneId: args.milestoneId,
        entityType: args.entityType,
        action: args.action,
        fieldName,
        beforeValue,
        afterValue,
        summary,
        actorName: args.actorName,
      },
    ];
  });
}

export async function searchRoadmapProjects(filters: RoadmapFilters) {
  return listRoadmapProjects(filters);
}

export async function findRoadmapProject(id: string) {
  const project = await getRoadmapProject(id);
  if (!project) throw new RoadmapNotFoundError();
  return project;
}

export async function getRoadmapProjectActivity(projectId: string, limit = 30) {
  return listRoadmapActivityLogs(projectId, limit);
}

export async function addRoadmapProject(input: RoadmapProjectInput & { actorName?: string | null }) {
  const { actorName: submittedActorName, ...projectInput } = input;
  return prisma.$transaction(async (tx) => {
    const project = await createRoadmapProject({ ...projectInput, code: roadmapCode() }, tx);
    await createRoadmapActivityLog(
      {
        projectId: project.id,
        entityType: "project",
        action: "project_created",
        summary: `Proyecto creado con plantilla: ${projectTypeValue(project.projectType)}`,
        actorName: actorName({ actorName: submittedActorName }),
        metadata: { projectType: project.projectType, templateLabel: projectTypeValue(project.projectType) },
      },
      tx,
    );
    return project;
  });
}

export async function editRoadmapProject(id: string, input: RoadmapProjectUpdateInput & { actorName?: string | null }) {
  const { actorName: submittedActorName, ...projectInput } = input;
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await getRoadmapProject(id, tx);
      if (!existing) throw new RoadmapNotFoundError();

      const project = await updateRoadmapProject(id, projectInput, tx);
      const logs = activityDiffs({
        fields: PROJECT_ACTIVITY_FIELDS,
        definitions: PROJECT_FIELD_DEFINITIONS,
        before: existing,
        after: project,
        entityType: "project",
        action: "project_updated",
        projectId: id,
        actorName: actorName({ actorName: submittedActorName }),
      });
      await createManyRoadmapActivityLogs(logs, tx);
      return project;
    });
  } catch (error) {
    mapPrismaNotFound(error);
  }
}

export async function addRoadmapMilestone(projectId: string, input: RoadmapMilestoneInput & { actorName?: string | null }) {
  const { actorName: submittedActorName, ...milestoneInput } = input;
  try {
    return await prisma.$transaction(async (tx) => {
      const project = await getRoadmapProject(projectId, tx);
      if (!project) throw new RoadmapNotFoundError();
      const milestone = await createRoadmapMilestone(projectId, milestoneInput, tx);
      await createRoadmapActivityLog(
        {
          projectId,
          milestoneId: milestone.id,
          entityType: "milestone",
          action: "milestone_created",
          summary: `Hito creado: ${displayMilestoneName(milestone)}`,
          actorName: actorName({ actorName: submittedActorName }),
        },
        tx,
      );
      return milestone;
    });
  } catch (error) {
    mapPrismaNotFound(error);
  }
}

export async function editRoadmapMilestone(projectId: string, milestoneId: string, input: RoadmapMilestoneUpdateInput & { actorName?: string | null }) {
  const { actorName: submittedActorName, ...milestoneInput } = input;
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await getRoadmapMilestone(projectId, milestoneId, tx);
      if (!existing) throw new RoadmapNotFoundError();

      const milestone = await updateRoadmapMilestone(projectId, milestoneId, milestoneInput, tx);
      const logs = activityDiffs({
        fields: MILESTONE_ACTIVITY_FIELDS,
        definitions: MILESTONE_FIELD_DEFINITIONS,
        before: existing,
        after: milestone,
        entityType: "milestone",
        action: "milestone_updated",
        projectId,
        milestoneId,
        milestoneName: displayMilestoneName(milestone),
        actorName: actorName({ actorName: submittedActorName }),
      });
      await createManyRoadmapActivityLogs(logs, tx);
      return milestone;
    });
  } catch (error) {
    mapPrismaNotFound(error);
  }
}

export async function bulkAssignMilestoneOwners(
  projectId: string,
  input: RoadmapBulkOwnerAssignmentInput & { actorName?: string | null },
) {
  const { actorName: submittedActorName, ...assignmentInput } = input;
  try {
    return await prisma.$transaction(async (tx) => {
      const project = await getRoadmapProject(projectId, tx);
      if (!project) throw new RoadmapNotFoundError();

      const result = await bulkUpdateMilestoneOwners(projectId, assignmentInput, tx);
      if (result.count > 0) {
        await createRoadmapActivityLog(
          {
            projectId,
            entityType: "project",
            action: "bulk_owner_assignment",
            summary: `Asignación rápida: ${result.count} hitos asignados a ${assignmentInput.ownerName}`,
            actorName: actorName({ actorName: submittedActorName }),
            metadata: { scope: assignmentInput.scope, assignedCount: result.count },
          },
          tx,
        );
      }
      return result;
    });
  } catch (error) {
    mapPrismaNotFound(error);
  }
}
