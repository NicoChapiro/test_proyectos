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
  export type RoadmapMilestoneDateMode = "point" | "range";
  export type RoadmapApprovalStatus = "pending" | "approved" | "rejected";
  export type RoadmapProjectType = "packaging" | "product_launch" | "campaign" | "trade_marketing" | "ecommerce" | "content_design" | "event" | "innovation" | "regulatory_compliance" | "internal_process" | "other";

  export type RoadmapActivityLog = {
    id: string;
    projectId: string;
    milestoneId: string | null;
    entityType: string;
    action: string;
    fieldName: string | null;
    beforeValue: string | null;
    afterValue: string | null;
    summary: string;
    actorName: string | null;
    metadata: unknown;
    createdAt: Date;
  };

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
    roadmapTemplateId: string | null;
    createdAt: Date;
    updatedAt: Date;
  };

  export type RoadmapTemplate = {
    id: string;
    name: string;
    description: string | null;
    projectType: RoadmapProjectType | null;
    isActive: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  };

  export type RoadmapTemplateFlow = {
    id: string;
    templateId: string;
    name: string;
    track: RoadmapMilestoneTrack;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  };

  export type RoadmapTemplateMilestone = {
    id: string;
    templateId: string;
    flowId: string;
    name: string;
    sequence: number;
    suggestedOwner: string | null;
    approvalRequired: boolean;
    isCritical: boolean;
    suggestedOffsetDays: number | null;
    dateMode: RoadmapMilestoneDateMode;
    suggestedStartOffsetDays: number | null;
    suggestedEndOffsetDays: number | null;
    notes: string | null;
    sortOrder: number;
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
    dateMode: RoadmapMilestoneDateMode;
    plannedStartDate: Date | null;
    plannedEndDate: Date | null;
    actualStartDate: Date | null;
    actualEndDate: Date | null;
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
    type DateTimeFilter = { lte?: Date; gte?: Date; lt?: Date; not?: string };
    type StringNullableFilter = string | null | { not?: string | null };
    type StringListFilter = { in?: string[] };
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
      roadmapTemplateId?: string | null;
      OR?: RoadmapProjectWhereInput[];
    };
    export type RoadmapMilestoneCreateWithoutProjectInput = Record<string, unknown>;
    export type InputJsonValue = unknown;
    export type RoadmapMilestoneWhereInput = {
      id?: string | StringListFilter;
      projectId?: string;
      status?: RoadmapMilestoneStatus | { not?: RoadmapMilestoneStatus };
      ownerName?: StringNullableFilter;
      track?: RoadmapMilestoneTrack;
      approvalStatus?: RoadmapApprovalStatus;
      plannedDate?: DateTimeFilter;
      OR?: RoadmapMilestoneWhereInput[];
    };
    export class PrismaClientKnownRequestError extends Error {
      code: string;
    }
    export type TransactionClient = PrismaClient;
  }

  type ProjectWithMilestones = RoadmapProject & { milestones: RoadmapMilestone[]; packagingRequest?: PackagingRequest | null };
  type TemplateFlowWithMilestones = RoadmapTemplateFlow & { milestones: RoadmapTemplateMilestone[] };
  type TemplateWithDetails = RoadmapTemplate & { flows: TemplateFlowWithMilestones[]; _count?: { projects: number; milestones: number; flows: number } };
  type PackagingWithRoadmapProjects = PackagingRequest & { roadmapProjects: ProjectWithMilestones[] };
  type ActivityLogWithMilestone = RoadmapActivityLog & { milestone?: RoadmapMilestone | null };
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
    roadmapTemplate: {
      findMany(args?: { where?: unknown; include?: unknown; orderBy?: OrderBy[] }): Promise<TemplateWithDetails[]>;
      findFirst(args?: { where?: unknown; include?: unknown; orderBy?: OrderBy[] }): Promise<TemplateWithDetails | null>;
      findUnique(args: { where: { id: string }; include?: unknown }): Promise<TemplateWithDetails | null>;
      create(args: { data: unknown; include?: unknown }): Promise<TemplateWithDetails>;
      update(args: { where: { id: string }; data: unknown; include?: unknown }): Promise<TemplateWithDetails>;
      delete(args: { where: { id: string } }): Promise<RoadmapTemplate>;
    };
    roadmapTemplateFlow: {
      create(args: { data: unknown; select?: unknown; include?: unknown }): Promise<RoadmapTemplateFlow>;
      deleteMany(args: { where?: unknown }): Promise<{ count: number }>;
    };
    roadmapTemplateMilestone: {
      create(args: { data: unknown; select?: unknown; include?: unknown }): Promise<RoadmapTemplateMilestone>;
      createMany(args: { data: unknown[] }): Promise<{ count: number }>;
      deleteMany(args: { where?: unknown }): Promise<{ count: number }>;
    };
    roadmapMilestone: {
      create(args: { data: unknown }): Promise<RoadmapMilestone>;
      findMany(args?: {
        where?: Prisma.RoadmapMilestoneWhereInput;
        select?: unknown;
        orderBy?: OrderBy[];
      }): Promise<RoadmapMilestone[]>;
      findFirst(args?: { where?: Prisma.RoadmapMilestoneWhereInput }): Promise<RoadmapMilestone | null>;
      update(args: { where: { id: string }; data: unknown }): Promise<RoadmapMilestone>;
      updateMany(args: {
        where: Prisma.RoadmapMilestoneWhereInput;
        data: unknown;
      }): Promise<{ count: number }>;
      count(args?: { where?: unknown }): Promise<number>;
    };
    roadmapActivityLog: {
      create(args: { data: unknown }): Promise<RoadmapActivityLog>;
      createMany(args: { data: unknown[] }): Promise<{ count: number }>;
      findMany(args?: {
        where?: { projectId?: string };
        include?: unknown;
        orderBy?: OrderBy;
        take?: number;
      }): Promise<ActivityLogWithMilestone[]>;
    };
    $transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
    $queryRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<unknown>;
    $disconnect(): Promise<void>;
  }
}
