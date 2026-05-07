declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: unknown;
  }
}

declare namespace React {
  type ReactNode = unknown;
}

declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}

declare module "next" {
  export type Metadata = Record<string, unknown>;
  export type NextConfig = Record<string, unknown>;
}

declare module "next/navigation" {
  export function redirect(url: string): never;
  export function notFound(): never;
}

declare module "next/server" {
  export class NextResponse {
    static json(body: unknown, init?: { status?: number }): Response;
  }
}

declare const process: {
  env: Record<string, string | undefined>;
  exit(code?: number): never;
};

declare module "@prisma/client" {
  export type RoadmapPriority = "baja" | "media" | "alta" | "urgente";
  export type RoadmapStatus = "no_iniciado" | "en_curso" | "en_riesgo" | "bloqueado" | "completado" | "cancelado";
  export type RoadmapTrafficLight = "verde" | "amarillo" | "rojo" | "gris";
  export type RoadmapMilestoneStatus = "not_started" | "in_progress" | "completed" | "blocked";
  export type RoadmapMilestoneTrack = "supply" | "marketing";
  export type RoadmapApprovalStatus = "pending" | "approved" | "rejected";
  export type RoadmapProjectType = "packaging" | "product_launch" | "campaign" | "trade_marketing" | "ecommerce" | "content_design" | "event" | "innovation" | "regulatory_compliance" | "internal_process" | "other";

  export type PackagingRequest = {
    id: string;
    code: string;
    title: string;
    description: string | null;
    requesterName: string;
    brand: string | null;
    category: string | null;
    status: string;
    desiredLaunchDate: Date | null;
    sharepointFolderUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
  };

  export type RoadmapProject = {
    id: string;
    code: string;
    name: string;
    description: string | null;
    projectType: RoadmapProjectType;
    category: string | null;
    area: string | null;
    channel: string | null;
    brand: string | null;
    ownerName: string;
    priority: RoadmapPriority;
    status: RoadmapStatus;
    startDate: Date;
    targetDate: Date;
    completedAt: Date | null;
    trafficLight: RoadmapTrafficLight;
    sourceType: string | null;
    sourcePackagingId: string | null;
    sharepointUrl: string | null;
    sharepointFolderUrl: string | null;
    colorLabel: string | null;
    createdAt: Date;
    updatedAt: Date;
  };

  export type RoadmapMilestone = {
    id: string;
    projectId: string;
    name: string;
    description: string | null;
    milestoneCode: string | null;
    track: RoadmapMilestoneTrack;
    sequence: number;
    ownerName: string | null;
    status: RoadmapMilestoneStatus;
    dueDate: Date;
    plannedDate: Date | null;
    actualDate: Date | null;
    completedAt: Date | null;
    approvalStatus: RoadmapApprovalStatus | null;
    linkUrl: string | null;
    documentUrl: string | null;
    notes: string | null;
    isCritical: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  };

  export namespace Prisma {
    type StringFilter = { contains?: string; mode?: "insensitive" };
    type DateTimeFilter = { lte?: Date; gte?: Date };
    export type RoadmapProjectWhereInput = {
      startDate?: DateTimeFilter;
      targetDate?: DateTimeFilter;
      status?: RoadmapStatus;
      projectType?: RoadmapProjectType;
      ownerName?: StringFilter;
      brand?: StringFilter;
      category?: StringFilter;
      area?: StringFilter;
      channel?: StringFilter;
      code?: StringFilter;
      name?: StringFilter;
      description?: StringFilter;
      OR?: RoadmapProjectWhereInput[];
    };
    export type RoadmapMilestoneCreateWithoutProjectInput = Record<string, unknown>;
    export class PrismaClientKnownRequestError extends Error {
      code: string;
    }
  }

  type ProjectWithMilestones = RoadmapProject & { milestones: RoadmapMilestone[]; packagingRequest?: PackagingRequest | null };
  type PackagingWithRoadmapProjects = PackagingRequest & { roadmapProjects: ProjectWithMilestones[] };
  type OrderBy = Record<string, "asc" | "desc">;

  export class PrismaClient {
    packagingRequest: {
      findMany(args?: { include?: unknown; orderBy?: OrderBy[] }): Promise<PackagingWithRoadmapProjects[]>;
      findUnique(args: { where: { id: string }; include?: unknown }): Promise<PackagingWithRoadmapProjects | null>;
      create(args: { data: unknown }): Promise<PackagingRequest>;
      upsert(args: { where: { code: string }; update: unknown; create: unknown }): Promise<PackagingRequest>;
      count(args?: { where?: unknown }): Promise<number>;
    };
    roadmapProject: {
      findMany(args?: { where?: Prisma.RoadmapProjectWhereInput; include?: unknown; orderBy?: OrderBy[] }): Promise<ProjectWithMilestones[]>;
      findUnique(args: { where: { id: string }; include?: unknown }): Promise<ProjectWithMilestones | null>;
      create(args: { data: unknown; include?: unknown }): Promise<ProjectWithMilestones>;
      update(args: { where: { id: string }; data: unknown; include?: unknown }): Promise<ProjectWithMilestones>;
      upsert(args: { where: { code: string }; update: unknown; create: unknown }): Promise<RoadmapProject>;
      count(args?: { where?: Prisma.RoadmapProjectWhereInput }): Promise<number>;
    };
    roadmapMilestone: {
      create(args: { data: unknown }): Promise<RoadmapMilestone>;
      update(args: { where: { id: string }; data: unknown }): Promise<RoadmapMilestone>;
      count(args?: { where?: unknown }): Promise<number>;
    };
    $queryRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<unknown>;
    $disconnect(): Promise<void>;
  }
}
