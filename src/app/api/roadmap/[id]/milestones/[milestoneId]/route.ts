import { NextResponse } from "next/server";
import { toHttpError } from "@/modules/roadmap/errors";
import { editRoadmapMilestone } from "@/modules/roadmap/service";
import { validateMilestoneUpdateInput } from "@/modules/roadmap/validators";

type Context = { params: Promise<{ id: string; milestoneId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const { id, milestoneId } = await context.params;
    const input = validateMilestoneUpdateInput(await request.json());
    const milestone = await editRoadmapMilestone(id, milestoneId, input);
    return NextResponse.json({ data: milestone });
  } catch (error) {
    const httpError = toHttpError(error);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
