"use server";

import { redirect } from "next/navigation";
import { addRoadmapMilestone, addRoadmapProject, editRoadmapMilestone, editRoadmapProject } from "@/modules/roadmap/service";
import { validateMilestoneInput, validateMilestoneUpdateInput, validateRoadmapProjectInput, validateRoadmapProjectUpdateInput } from "@/modules/roadmap/validators";

function formToObject(formData: FormData): Record<string, FormDataEntryValue | boolean> {
  const result: Record<string, FormDataEntryValue | boolean> = {};
  formData.forEach((value, key) => {
    result[key] = value;
  });
  if (formData.has("isCritical")) result.isCritical = true;
  return result;
}

export async function createRoadmapProjectAction(formData: FormData) {
  const project = await addRoadmapProject(validateRoadmapProjectInput(formToObject(formData)));
  redirect(`/roadmap/${project.id}`);
}

export async function updateRoadmapProjectAction(id: string, formData: FormData) {
  await editRoadmapProject(id, validateRoadmapProjectUpdateInput(formToObject(formData)));
  redirect(`/roadmap/${id}`);
}

export async function createMilestoneAction(projectId: string, formData: FormData) {
  await addRoadmapMilestone(projectId, validateMilestoneInput(formToObject(formData)));
  redirect(`/roadmap/${projectId}`);
}

export async function updateMilestoneStatusAction(projectId: string, milestoneId: string, formData: FormData) {
  await editRoadmapMilestone(projectId, milestoneId, validateMilestoneUpdateInput(formToObject(formData)));
  redirect(`/roadmap/${projectId}`);
}
