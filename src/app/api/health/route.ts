import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type HealthResponse = {
  status: "ok" | "error";
  env: {
    databaseUrlConfigured: boolean;
  };
  database: {
    connected: boolean;
    roadmapProjects?: number;
    roadmapMilestones?: number;
    packagingRequests?: number;
  };
  message?: string;
};

export async function GET() {
  const databaseUrlConfigured = Boolean(process.env.DATABASE_URL);

  try {
    await prisma.$queryRaw`SELECT 1`;

    const [roadmapProjects, roadmapMilestones, packagingRequests] = await Promise.all([
      prisma.roadmapProject.count(),
      prisma.roadmapMilestone.count(),
      prisma.packagingRequest.count(),
    ]);

    const response: HealthResponse = {
      status: "ok",
      env: {
        databaseUrlConfigured,
      },
      database: {
        connected: true,
        roadmapProjects,
        roadmapMilestones,
        packagingRequests,
      },
    };

    return NextResponse.json(response);
  } catch {
    const response: HealthResponse = {
      status: "error",
      env: {
        databaseUrlConfigured,
      },
      database: {
        connected: false,
      },
      message: "Database connection failed",
    };

    return NextResponse.json(response, { status: 500 });
  }
}
