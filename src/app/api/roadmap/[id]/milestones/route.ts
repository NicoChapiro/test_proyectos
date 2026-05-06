import { NextResponse } from "next/server";
import { toHttpError } from "@/modules/roadmap/errors";
import { addRoadmapMilestone } from "@/modules/roadmap/service";
import { validateMilestoneInput } from "@/modules/roadmap/validators";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const input = validateMilestoneInput(await request.json());
    const milestone = await addRoadmapMilestone(id, input);
    return NextResponse.json({ data: milestone }, { status: 201 });
  } catch (error) {
    const httpError = toHttpError(error);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
