import { NextResponse } from "next/server";
import { toHttpError } from "@/modules/roadmap/errors";
import { addRoadmapProject, searchRoadmapProjects } from "@/modules/roadmap/service";
import { validateRoadmapFilters, validateRoadmapProjectInput } from "@/modules/roadmap/validators";

export async function GET(request: Request) {
  try {
    const filters = validateRoadmapFilters(new URL(request.url).searchParams);
    const projects = await searchRoadmapProjects(filters);
    return NextResponse.json({ data: projects });
  } catch (error) {
    const httpError = toHttpError(error);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}

export async function POST(request: Request) {
  try {
    const input = validateRoadmapProjectInput(await request.json());
    const project = await addRoadmapProject(input);
    return NextResponse.json({ data: project }, { status: 201 });
  } catch (error) {
    const httpError = toHttpError(error);
    return NextResponse.json({ error: httpError.message }, { status: httpError.status });
  }
}
