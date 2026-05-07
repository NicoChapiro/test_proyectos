import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SERVICE_NAME = "test-proyectos";
const DATABASE_PROVIDER = "postgresql";

const DATABASE_ERROR_CATEGORIES = {
  P1000: "authentication_failed",
  P1001: "database_unreachable",
  P1002: "database_timeout",
  P1013: "invalid_database_url",
  P2021: "missing_table",
  P2022: "missing_column",
} as const;

type DatabaseErrorCategory = (typeof DATABASE_ERROR_CATEGORIES)[keyof typeof DATABASE_ERROR_CATEGORIES] | "unknown_database_error";

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

type DatabaseDiagnostics = {
  category: DatabaseErrorCategory;
  code?: string;
  name?: string;
  sanitizedMessage?: string;
};

type HealthResponse = {
  status: "ok" | "error";
  service: typeof SERVICE_NAME;
  runtime: RuntimeInfo;
  env: EnvInfo;
  database: DatabaseInfo;
  diagnostics?: DatabaseDiagnostics;
  message?: string;
  hint?: string;
};

type MigrationCountRow = {
  count: bigint | number | string;
};

type PrismaLikeError = {
  name?: unknown;
  code?: unknown;
  errorCode?: unknown;
  message?: unknown;
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

function getPrismaErrorField(error: unknown, field: keyof PrismaLikeError): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  const value = (error as PrismaLikeError)[field];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getPrismaErrorCode(error: unknown): string | undefined {
  return getPrismaErrorField(error, "code") ?? getPrismaErrorField(error, "errorCode");
}

function classifyDatabaseError(error: unknown): DatabaseDiagnostics {
  const code = getPrismaErrorCode(error);
  const name = getPrismaErrorField(error, "name");
  const category = code && code in DATABASE_ERROR_CATEGORIES ? DATABASE_ERROR_CATEGORIES[code as keyof typeof DATABASE_ERROR_CATEGORIES] : "unknown_database_error";

  return {
    category,
    ...(code ? { code } : {}),
    ...(name ? { name } : {}),
  };
}

function sanitizeDevelopmentMessage(message: string): string {
  const databaseUrl = process.env.DATABASE_URL;
  let sanitizedMessage = message;

  if (databaseUrl) {
    sanitizedMessage = sanitizedMessage.split(databaseUrl).join("[redacted-database-url]");
  }

  return sanitizedMessage
    .replace(/\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|https?):\/\/[^\s"'<>]+/gi, "[redacted-url]")
    .replace(/\b[A-Za-z][A-Za-z0-9+.-]*:\/\/[^\s/@:]+(?::[^\s/@]*)?@/g, "[redacted-credentials]@")
    .replace(/([?&](?:user|username|password|pass|token|access_token|refresh_token|apikey|api_key|secret)=)[^\s&"'<>]+/gi, "$1[redacted]")
    .replace(/\b(?:user|username|password|pass|token|access_token|refresh_token|apikey|api_key|secret)=([^\s,;]+)/gi, (match) => {
      const [key] = match.split("=");
      return `${key}=[redacted]`;
    });
}

function withDevelopmentDiagnostics(diagnostics: DatabaseDiagnostics, error: unknown): DatabaseDiagnostics {
  const message = getPrismaErrorField(error, "message");

  if (process.env.NODE_ENV === "production" || !message) {
    return diagnostics;
  }

  return {
    ...diagnostics,
    sanitizedMessage: sanitizeDevelopmentMessage(message),
  };
}

function logSafeDatabaseError(diagnostics: DatabaseDiagnostics, env: EnvInfo) {
  console.error("Database health check failed", {
    name: diagnostics.name,
    code: diagnostics.code,
    category: diagnostics.category,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    databaseUrlConfigured: env.databaseUrlConfigured,
    databaseUrlLooksLikePostgres: env.databaseUrlLooksLikePostgres,
  });
}

function createErrorResponse(error?: unknown) {
  const env = getEnvInfo();
  const diagnostics = withDevelopmentDiagnostics(classifyDatabaseError(error), error);
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
    diagnostics,
    message: "Database health check failed",
    hint: "Check DATABASE_URL, Supabase availability and Prisma migrations.",
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
    const diagnostics = classifyDatabaseError(error);
    logSafeDatabaseError(diagnostics, env);

    return createErrorResponse(error);
  }
}
