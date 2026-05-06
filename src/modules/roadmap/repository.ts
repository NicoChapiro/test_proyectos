import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { RoadmapFilters, RoadmapMilestoneInput, RoadmapMilestoneUpdateInput, RoadmapProjectInput, RoadmapProjectUpdateInput } from "./types";

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
    ...(filters.owner ? { ownerName: { contains: filters.owner, mode: "insensitive" } } : {}),
    ...(filters.brand ? { brand: { contains: filters.brand, mode: "insensitive" } } : {}),
    ...(filters.category ? { category: { contains: filters.category, mode: "insensitive" } } : {}),
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

export async function listRoadmapProjects(filters: RoadmapFilters) {
  return prisma.roadmapProject.findMany({
    where: buildWhere(filters),
    include: { milestones: { orderBy: [{ sortOrder: "asc" }, { dueDate: "asc" }] }, packagingRequest: true },
    orderBy: [{ startDate: "asc" }, { targetDate: "asc" }],
  });
}

export async function getRoadmapProject(id: string) {
  return prisma.roadmapProject.findUnique({
    where: { id },
    include: { milestones: { orderBy: [{ sortOrder: "asc" }, { dueDate: "asc" }] }, packagingRequest: true },
  });
}

export async function createRoadmapProject(input: RoadmapProjectInput & { code: string }) {
  return prisma.roadmapProject.create({
    data: input,
    include: { milestones: true, packagingRequest: true },
  });
}

export async function updateRoadmapProject(id: string, input: RoadmapProjectUpdateInput) {
  return prisma.roadmapProject.update({
    where: { id },
    data: input,
    include: { milestones: { orderBy: [{ sortOrder: "asc" }, { dueDate: "asc" }] }, packagingRequest: true },
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
