"use server";

import { redirect } from "next/navigation";
import { createRoadmapProjectForPackaging, linkRoadmapProjectToPackaging } from "@/modules/packaging/service";

export async function createPackagingRoadmapProjectAction(packagingId: string) {
  const project = await createRoadmapProjectForPackaging(packagingId);
  redirect(`/roadmap/${project.id}`);
}

export async function linkPackagingRoadmapProjectAction(packagingId: string, formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "").trim();
  if (!projectId) redirect(`/packaging/${packagingId}`);

  const project = await linkRoadmapProjectToPackaging(packagingId, { projectId });
  redirect(`/roadmap/${project.id}`);
}
