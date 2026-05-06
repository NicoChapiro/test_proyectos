import { Prisma } from "@prisma/client";
import { RoadmapNotFoundError } from "./errors";
import { createRoadmapMilestone, createRoadmapProject, getRoadmapProject, listRoadmapProjects, updateRoadmapMilestone, updateRoadmapProject } from "./repository";
import type { RoadmapFilters, RoadmapMilestoneInput, RoadmapMilestoneUpdateInput, RoadmapProjectInput, RoadmapProjectUpdateInput } from "./types";

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

export async function searchRoadmapProjects(filters: RoadmapFilters) {
  return listRoadmapProjects(filters);
}

export async function findRoadmapProject(id: string) {
  const project = await getRoadmapProject(id);
  if (!project) throw new RoadmapNotFoundError();
  return project;
}

export async function addRoadmapProject(input: RoadmapProjectInput) {
  return createRoadmapProject({ ...input, code: roadmapCode() });
}

export async function editRoadmapProject(id: string, input: RoadmapProjectUpdateInput) {
  try {
    return await updateRoadmapProject(id, input);
  } catch (error) {
    mapPrismaNotFound(error);
  }
}

export async function addRoadmapMilestone(projectId: string, input: RoadmapMilestoneInput) {
  await findRoadmapProject(projectId);
  return createRoadmapMilestone(projectId, input);
}

export async function editRoadmapMilestone(projectId: string, milestoneId: string, input: RoadmapMilestoneUpdateInput) {
  try {
    return await updateRoadmapMilestone(projectId, milestoneId, input);
  } catch (error) {
    mapPrismaNotFound(error);
  }
}
