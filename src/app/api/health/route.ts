import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SERVICE_NAME = "test-proyectos";
const DATABASE_PROVIDER = "postgresql";

type RuntimeInfo = {
  nodeEnv: string;
  vercelEnv: string | null;
  isVercel: boolean;
};

type EnvInfo = {
  databaseUrlConfigured: boolean;
  databaseUrlLooksLikePostgres: boolean;
};

type DatabaseCounts = {
  roadmapProjects: number;
  roadmapMilestones: number;
  packagingRequests: number;
};

type DatabaseInfo = {
  connected: boolean;
  provider: typeof DATABASE_PROVIDER;
  prismaQueryOk: boolean;
  migrationsTableExists: boolean;
  appliedMigrations?: number;
  counts?: DatabaseCounts;
};

type HealthResponse = {
  status: "ok" | "error";
  service: typeof SERVICE_NAME;
  runtime: RuntimeInfo;
  env: EnvInfo;
  database: DatabaseInfo;
  message?: string;
  hint?: string;
  error?: {
    name?: string;
    code?: string;
  };
};

type MigrationCountRow = {
  count: bigint | number | string;
};

function getRuntimeInfo(): RuntimeInfo {
  return {
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    vercelEnv: process.env.VERCEL_ENV ?? null,
    isVercel: process.env.VERCEL === "1",
  };
}

function getEnvInfo(): EnvInfo {
  const databaseUrl = process.env.DATABASE_URL;

  return {
    databaseUrlConfigured: Boolean(databaseUrl),
    databaseUrlLooksLikePostgres: Boolean(databaseUrl?.startsWith("postgresql://") || databaseUrl?.startsWith("postgres://")),
  };
}

function toNumber(value: bigint | number | string): number {
  if (typeof value === "bigint") {
    return Number(value);
  }

  if (typeof value === "string") {
    return Number.parseInt(value, 10);
  }

  return value;
}

async function checkMigrationsTable(): Promise<Pick<DatabaseInfo, "migrationsTableExists" | "appliedMigrations">> {
  try {
    const rows = (await prisma.$queryRaw`
      SELECT COUNT(*) AS count
      FROM "_prisma_migrations"
      WHERE "finished_at" IS NOT NULL
    `) as MigrationCountRow[];

    return {
      migrationsTableExists: true,
      appliedMigrations: toNumber(rows[0]?.count ?? 0),
    };
  } catch {
    return {
      migrationsTableExists: false,
    };
  }
}

function getSafeDevelopmentError(error: unknown): HealthResponse["error"] | undefined {
  if (process.env.NODE_ENV === "production" || typeof error !== "object" || error === null) {
    return undefined;
  }

  const candidate = error as { name?: unknown; code?: unknown };
  const safeError: NonNullable<HealthResponse["error"]> = {};

  if (typeof candidate.name === "string") {
    safeError.name = candidate.name;
  }

  if (typeof candidate.code === "string") {
    safeError.code = candidate.code;
  }

  return Object.keys(safeError).length > 0 ? safeError : undefined;
}

function createErrorResponse(error?: unknown) {
  const env = getEnvInfo();
  const safeError = getSafeDevelopmentError(error);
  const response: HealthResponse = {
    status: "error",
    service: SERVICE_NAME,
    runtime: getRuntimeInfo(),
    env,
    database: {
      connected: false,
      provider: DATABASE_PROVIDER,
      prismaQueryOk: false,
      migrationsTableExists: false,
    },
    message: "Database health check failed",
    hint: "Check DATABASE_URL, Supabase availability and Prisma migrations.",
    ...(safeError ? { error: safeError } : {}),
  };

  return NextResponse.json(response, { status: 500 });
}

export async function GET() {
  const env = getEnvInfo();

  if (!env.databaseUrlConfigured) {
    return createErrorResponse();
  }

  try {
    await prisma.$queryRaw`SELECT 1`;

    const migrations = await checkMigrationsTable();
    const [roadmapProjects, roadmapMilestones, packagingRequests] = await Promise.all([
      prisma.roadmapProject.count(),
      prisma.roadmapMilestone.count(),
      prisma.packagingRequest.count(),
    ]);

    const response: HealthResponse = {
      status: "ok",
      service: SERVICE_NAME,
      runtime: getRuntimeInfo(),
      env,
      database: {
        connected: true,
        provider: DATABASE_PROVIDER,
        prismaQueryOk: true,
        ...migrations,
        counts: {
          roadmapProjects,
          roadmapMilestones,
          packagingRequests,
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    return createErrorResponse(error);
  }
}
