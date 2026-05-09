import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ROADMAP_PROJECT_TYPE_MILESTONE_TEMPLATES, ROADMAP_STANDARD_MILESTONE_TEMPLATES } from "./constants";
import type { RoadmapMilestoneTemplate } from "./constants";
import { calculateUpcomingMilestoneDateWindow } from "./insights";
import type {
  RoadmapActivityLogInput,
  RoadmapBulkOwnerAssignmentInput,
  RoadmapFilters,
  RoadmapMilestoneInput,
  RoadmapMilestoneUpdateInput,
  RoadmapProjectInput,
  RoadmapProjectUpdateInput,
} from "./types";

type RoadmapDatabase = typeof prisma | Prisma.TransactionClient;

function buildDateOverlap(year?: number): Prisma.RoadmapProjectWhereInput {
  if (!year) return {};
  return {
    startDate: { lte: new Date(`${year}-12-31T23:59:59.999Z`) },
    targetDate: { gte: new Date(`${year}-01-01T00:00:00.000Z`) },
  };
}

function buildWhere(filters: RoadmapFilters): Prisma.RoadmapProjectWhereInput {
  return {
    ...buildDateOverlap(filters.year),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.projectType ? { projectType: filters.projectType } : {}),
    ...(filters.owner ? { ownerName: { contains: filters.owner, mode: "insensitive" } } : {}),
    ...(filters.brand ? { brand: { contains: filters.brand, mode: "insensitive" } } : {}),
    ...(filters.category ? { category: { contains: filters.category, mode: "insensitive" } } : {}),
    ...(filters.area ? { area: { contains: filters.area, mode: "insensitive" } } : {}),
    ...(filters.channel ? { channel: { contains: filters.channel, mode: "insensitive" } } : {}),
    ...(filters.q
      ? {
          OR: [
            { code: { contains: filters.q, mode: "insensitive" } },
            { name: { contains: filters.q, mode: "insensitive" } },
            { description: { contains: filters.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}


function buildBulkOwnerScopeWhere(
  input: RoadmapBulkOwnerAssignmentInput,
): Prisma.RoadmapMilestoneWhereInput {
  const baseWhere: Prisma.RoadmapMilestoneWhereInput = {
    status: { not: "completed" },
  };

  if (input.scope === "all_unassigned") return baseWhere;
  if (input.scope === "supply_unassigned") {
    return { ...baseWhere, track: "supply" };
  }
  if (input.scope === "marketing_unassigned") {
    return { ...baseWhere, track: "marketing" };
  }
  if (input.scope === "pending_approvals_unassigned") {
    return { ...baseWhere, approvalStatus: "pending" };
  }
  if (input.scope === "upcoming_unassigned") {
    const { start, end } = calculateUpcomingMilestoneDateWindow();
    return {
      ...baseWhere,
      plannedDate: {
        gte: start,
        lt: end,
      },
    };
  }

  throw new Error("Alcance de asignación no válido");
}

function hasMissingOwner(ownerName: string | null): boolean {
  return !ownerName?.trim();
}

const milestoneOrder = [{ track: "asc" as const }, { sequence: "asc" as const }, { sortOrder: "asc" as const }, { dueDate: "asc" as const }];

function selectedMilestoneTemplates(project: RoadmapProjectInput): readonly RoadmapMilestoneTemplate[] {
  const projectTypeTemplate = ROADMAP_PROJECT_TYPE_MILESTONE_TEMPLATES[project.projectType];
  if (projectTypeTemplate?.length) return projectTypeTemplate;
  if (ROADMAP_PROJECT_TYPE_MILESTONE_TEMPLATES.other.length) return ROADMAP_PROJECT_TYPE_MILESTONE_TEMPLATES.other;
  return ROADMAP_STANDARD_MILESTONE_TEMPLATES;
}

function interpolatePlannedDate(startDate: Date, targetDate: Date, index: number, total: number): Date {
  if (index === 0) return new Date(startDate);
  if (index === total - 1) return new Date(targetDate);

  const duration = targetDate.getTime() - startDate.getTime();
  const ratio = index / Math.max(total - 1, 1);
  return new Date(startDate.getTime() + Math.round(duration * ratio));
}

function defaultMilestonesForProject(project: RoadmapProjectInput): Prisma.RoadmapMilestoneCreateWithoutProjectInput[] {
  const templates = selectedMilestoneTemplates(project);
  const templatesByTrack = templates.reduce<Record<string, RoadmapMilestoneTemplate[]>>((accumulator, template) => {
    accumulator[template.track] = [...(accumulator[template.track] ?? []), template];
    return accumulator;
  }, {});

  return templates.map((template) => {
    const trackTemplates = templatesByTrack[template.track] ?? [];
    const trackIndex = trackTemplates.findIndex((trackTemplate) => trackTemplate.code === template.code);
    const isFirstTrackMilestone = trackIndex === 0;
    const isFinalTrackMilestone = trackIndex === trackTemplates.length - 1;
    const plannedDate = interpolatePlannedDate(project.startDate, project.targetDate, trackIndex, trackTemplates.length);

    return {
      name: template.name,
      milestoneCode: template.code,
      track: template.track,
      sequence: template.sequence,
      sortOrder: template.sequence,
      status: "not_started",
      ownerName: isFirstTrackMilestone ? project.ownerName : null,
      plannedDate,
      dueDate: plannedDate,
      approvalStatus: "approvalStatus" in template ? template.approvalStatus : null,
      notes: "notes" in template ? template.notes : null,
      isCritical: isFinalTrackMilestone,
    };
  });
}

export async function listRoadmapProjects(filters: RoadmapFilters) {
  return prisma.roadmapProject.findMany({
    where: buildWhere(filters),
    include: { milestones: { orderBy: milestoneOrder }, packagingRequest: true },
    orderBy: [{ startDate: "asc" }, { targetDate: "asc" }],
  });
}

export async function getRoadmapProject(id: string, db: RoadmapDatabase = prisma) {
  return db.roadmapProject.findUnique({
    where: { id },
    include: { milestones: { orderBy: milestoneOrder }, packagingRequest: true },
  });
}

export async function createRoadmapProject(input: RoadmapProjectInput & { code: string }, db: RoadmapDatabase = prisma) {
  const { code, ...projectInput } = input;
  return db.roadmapProject.create({
    data: {
      ...projectInput,
      code,
      milestones: { create: defaultMilestonesForProject(projectInput) },
    },
    include: { milestones: { orderBy: milestoneOrder }, packagingRequest: true },
  });
}

export async function updateRoadmapProject(id: string, input: RoadmapProjectUpdateInput, db: RoadmapDatabase = prisma) {
  return db.roadmapProject.update({
    where: { id },
    data: input,
    include: { milestones: { orderBy: milestoneOrder }, packagingRequest: true },
  });
}

export async function createRoadmapMilestone(projectId: string, input: RoadmapMilestoneInput, db: RoadmapDatabase = prisma) {
  return db.roadmapMilestone.create({
    data: { ...input, projectId },
  });
}

export async function updateRoadmapMilestone(projectId: string, milestoneId: string, input: RoadmapMilestoneUpdateInput, db: RoadmapDatabase = prisma) {
  return db.roadmapMilestone.update({
    where: { id: milestoneId },
    data: input,
  });
}

export async function bulkUpdateMilestoneOwners(
  projectId: string,
  input: RoadmapBulkOwnerAssignmentInput,
  db: RoadmapDatabase = prisma,
) {
  const candidates = await db.roadmapMilestone.findMany({
    where: {
      projectId,
      ...buildBulkOwnerScopeWhere(input),
    },
    select: { id: true, ownerName: true },
  });
  const milestoneIds = candidates
    .filter((milestone) => hasMissingOwner(milestone.ownerName))
    .map((milestone) => milestone.id);

  if (milestoneIds.length === 0) return { count: 0 };

  const missingOwnerValues = [
    ...new Set(
      candidates
        .map((milestone) => milestone.ownerName)
        .filter((ownerName): ownerName is string =>
          Boolean(ownerName && !ownerName.trim()),
        ),
    ),
  ];

  return db.roadmapMilestone.updateMany({
    where: {
      projectId,
      id: { in: milestoneIds },
      OR: [
        { ownerName: null },
        { ownerName: "" },
        ...missingOwnerValues.map((ownerName) => ({ ownerName })),
      ],
    },
    data: { ownerName: input.ownerName },
  });
}


export async function getRoadmapMilestone(
  projectId: string,
  milestoneId: string,
  db: RoadmapDatabase = prisma,
) {
  return db.roadmapMilestone.findFirst({
    where: { id: milestoneId, projectId },
  });
}

export async function createRoadmapActivityLog(
  input: RoadmapActivityLogInput,
  db: RoadmapDatabase = prisma,
) {
  return db.roadmapActivityLog.create({
    data: input,
  });
}

export async function createManyRoadmapActivityLogs(
  inputs: RoadmapActivityLogInput[],
  db: RoadmapDatabase = prisma,
) {
  if (inputs.length === 0) return { count: 0 };
  return db.roadmapActivityLog.createMany({
    data: inputs,
  });
}

export async function listRoadmapActivityLogs(projectId: string, limit = 30) {
  return prisma.roadmapActivityLog.findMany({
    where: { projectId },
    include: { milestone: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
