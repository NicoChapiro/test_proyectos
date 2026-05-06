import { prisma } from "@/lib/prisma";
import type { PackagingRequestInput } from "./types";

const packagingInclude = {
  roadmapProjects: {
    include: { milestones: { orderBy: [{ sortOrder: "asc" }, { dueDate: "asc" }] } },
    orderBy: [{ startDate: "asc" }, { targetDate: "asc" }],
  },
};

export async function getPackagingRequest(id: string) {
  return prisma.packagingRequest.findUnique({
    where: { id },
    include: packagingInclude,
  });
}

export async function listPackagingRequests() {
  return prisma.packagingRequest.findMany({
    include: { roadmapProjects: true },
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function createPackagingRequest(input: PackagingRequestInput) {
  return prisma.packagingRequest.create({ data: input });
}
