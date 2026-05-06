import { Prisma } from "@prisma/client";
import { addRoadmapProject, editRoadmapProject, findRoadmapProject } from "@/modules/roadmap/service";
import type { RoadmapProjectInput } from "@/modules/roadmap/types";
import { PackagingNotFoundError } from "./errors";
import { createPackagingRequest, getPackagingRequest, listPackagingRequests } from "./repository";
import type { PackagingRequestInput, PackagingRoadmapLinkInput } from "./types";

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function mapPrismaNotFound(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    throw new PackagingNotFoundError();
  }
  throw error;
}

function projectInputFromPackaging(packaging: Awaited<ReturnType<typeof getPackagingRequest>>): RoadmapProjectInput {
  if (!packaging) throw new PackagingNotFoundError();
  const startDate = new Date();
  const targetDate = packaging.desiredLaunchDate && packaging.desiredLaunchDate.getTime() >= startDate.getTime()
    ? packaging.desiredLaunchDate
    : addDays(startDate, 90);

  return {
    name: packaging.title,
    description: packaging.description ?? `Proyecto roadmap creado desde la solicitud de packaging ${packaging.code}.`,
    projectType: "packaging",
    area: "Marketing",
    channel: null,
    category: packaging.category,
    brand: packaging.brand,
    ownerName: packaging.requesterName,
    priority: "media",
    status: "no_iniciado",
    startDate,
    targetDate,
    completedAt: null,
    trafficLight: "gris",
    sourceType: "packaging_request",
    sourcePackagingId: packaging.id,
    sharepointFolderUrl: packaging.sharepointFolderUrl,
    colorLabel: null,
  };
}

export async function searchPackagingRequests() {
  return listPackagingRequests();
}

export async function findPackagingRequest(id: string) {
  const packaging = await getPackagingRequest(id);
  if (!packaging) throw new PackagingNotFoundError();
  return packaging;
}

export async function addPackagingRequest(input: PackagingRequestInput) {
  return createPackagingRequest(input);
}

export async function createRoadmapProjectForPackaging(packagingId: string) {
  const packaging = await findPackagingRequest(packagingId);
  return addRoadmapProject(projectInputFromPackaging(packaging));
}

export async function linkRoadmapProjectToPackaging(packagingId: string, input: PackagingRoadmapLinkInput) {
  await findPackagingRequest(packagingId);
  await findRoadmapProject(input.projectId);
  try {
    return await editRoadmapProject(input.projectId, {
      sourceType: "packaging_request",
      sourcePackagingId: packagingId,
      projectType: "packaging",
    });
  } catch (error) {
    mapPrismaNotFound(error);
  }
}
