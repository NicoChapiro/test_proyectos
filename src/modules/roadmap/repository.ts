import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ROADMAP_STANDARD_MILESTONE_TEMPLATES } from "./constants";
import { calculateUpcomingMilestoneDateWindow } from "./insights";
import type {
  RoadmapBulkOwnerAssignmentInput,
  RoadmapFilters,
  RoadmapMilestoneInput,
  RoadmapMilestoneUpdateInput,
  RoadmapProjectInput,
  RoadmapProjectUpdateInput,
} from "./types";

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

function defaultMilestonesForProject(project: RoadmapProjectInput): Prisma.RoadmapMilestoneCreateWithoutProjectInput[] {
  return ROADMAP_STANDARD_MILESTONE_TEMPLATES.map((template) => {
    const usesTargetDate = template.code === "marketing_activation_date" || template.code === "supply_quilicura_warehouse_arrival";
    const plannedDate = usesTargetDate ? project.targetDate : null;
    return {
      name: template.name,
      milestoneCode: template.code,
      track: template.track,
      sequence: template.sequence,
      sortOrder: template.sequence,
      status: "not_started",
      ownerName: template.sequence === 1 ? project.ownerName : null,
      plannedDate,
      dueDate: plannedDate ?? project.targetDate,
      approvalStatus: "approvalStatus" in template ? template.approvalStatus : null,
      notes: "notes" in template ? template.notes : null,
      isCritical: usesTargetDate,
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

export async function getRoadmapProject(id: string) {
  return prisma.roadmapProject.findUnique({
    where: { id },
    include: { milestones: { orderBy: milestoneOrder }, packagingRequest: true },
  });
}

export async function createRoadmapProject(input: RoadmapProjectInput & { code: string }) {
  const { code, ...projectInput } = input;
  return prisma.roadmapProject.create({
    data: {
      ...projectInput,
      code,
      milestones: { create: defaultMilestonesForProject(projectInput) },
    },
    include: { milestones: { orderBy: milestoneOrder }, packagingRequest: true },
  });
}

export async function updateRoadmapProject(id: string, input: RoadmapProjectUpdateInput) {
  return prisma.roadmapProject.update({
    where: { id },
    data: input,
    include: { milestones: { orderBy: milestoneOrder }, packagingRequest: true },
  });
}

export async function createRoadmapMilestone(projectId: string, input: RoadmapMilestoneInput) {
  return prisma.roadmapMilestone.create({
    data: { ...input, projectId },
  });
}

export async function updateRoadmapMilestone(projectId: string, milestoneId: string, input: RoadmapMilestoneUpdateInput) {
  return prisma.roadmapMilestone.update({
    where: { id: milestoneId },
    data: input,
  });
}

export async function bulkUpdateMilestoneOwners(
  projectId: string,
  input: RoadmapBulkOwnerAssignmentInput,
) {
  const candidates = await prisma.roadmapMilestone.findMany({
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

  return prisma.roadmapMilestone.updateMany({
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
