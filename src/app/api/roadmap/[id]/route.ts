import { NextResponse } from "next/server";
import { toHttpError } from "@/modules/roadmap/errors";
import { editRoadmapProject, findRoadmapProject } from "@/modules/roadmap/service";
import { validateRoadmapProjectUpdateInput } from "@/modules/roadmap/validators";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const project = await findRoadmapProject(id);
    return NextResponse.json({ data: project });
  } catch (error) {
    const httpError = toHttpError(error);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const input = validateRoadmapProjectUpdateInput(await request.json());
    const project = await editRoadmapProject(id, input);
    return NextResponse.json({ data: project });
  } catch (error) {
    const httpError = toHttpError(error);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
