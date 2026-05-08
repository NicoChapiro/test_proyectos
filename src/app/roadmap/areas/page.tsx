import Link from "next/link";
import { searchRoadmapProjects } from "@/modules/roadmap/service";
import {
  ROADMAP_SEVERITY_LABELS,
  buildRoadmapProjectInsights,
  type RoadmapProjectInsights,
  type RoadmapProjectSeverity,
} from "@/modules/roadmap/insights";
import {
  ROADMAP_PROJECT_TYPE_LABELS,
  ROADMAP_STATUS_LABELS,
} from "@/modules/roadmap/constants";
import type { RoadmapProjectWithMilestones } from "@/modules/roadmap/types";
import { displayDate, displayPlannedDate } from "@/modules/roadmap/ui/date";
import {
  displayMilestoneName,
  displayMilestoneStatus,
} from "@/modules/roadmap/ui/labels";
import { AppShell, KpiCard, PageHeader } from "@/modules/roadmap/ui/shell";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Record<string, string | string[] | undefined>;
type PageProps = { searchParams: Promise<SearchParams> };
type ProjectInsights = RoadmapProjectInsights<
  RoadmapProjectWithMilestones["milestones"][number]
>;
type AreaProject = RoadmapProjectWithMilestones & {
  insights: ProjectInsights;
  normalizedArea: AreaBucket;
};
type AreaBucket = (typeof AREA_BUCKETS)[number];
type AreaSummary = {
  area: AreaBucket;
  projects: AreaProject[];
  totalProjects: number;
  inProgressProjects: number;
  criticalProjects: number;
  pendingMilestones: number;
  milestonesWithoutOwner: number;
  pendingApprovals: number;
  blockedMilestones: number;
  upcomingMilestones: number;
};

const AREA_BUCKETS = [
  "ECOMMERCE",
  "DISEÑO",
  "MARKETING",
  "PRODUCTO",
  "RRSS",
  "AUDIOVISUAL",
  "TRADE",
  "VENTAS",
  "OPERACIONES / PROVEEDOR",
  "SIN ÁREA",
  "OTRAS",
] as const;

const AREA_FILTERS: AreaBucket[] = [
  "ECOMMERCE",
  "DISEÑO",
  "MARKETING",
  "PRODUCTO",
  "RRSS",
  "AUDIOVISUAL",
  "TRADE",
  "VENTAS",
  "OPERACIONES / PROVEEDOR",
  "SIN ÁREA",
  "OTRAS",
];

const ACTIVE_PROJECT_STATUSES = new Set(["no_iniciado", "en_curso", "en_riesgo", "bloqueado"]);
const PROJECT_LIST_LIMIT = 8;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function currentUtcYear(): number {
  return new Date().getUTCFullYear();
}

function validYear(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 2000 && parsed <= 2100
    ? parsed
    : currentUtcYear();
}

function normalizeText(value: string): string {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function normalizeArea(area: string | null | undefined): AreaBucket {
  if (!area?.trim()) return "SIN ÁREA";

  const normalized = normalizeText(area).replace(/[\s_-]+/g, " ");
  const compact = normalized.replace(/[^A-Z0-9]/g, "");

  if (["ECOMMERCE", "ECOM", "ECOMMERCE"].includes(compact)) return "ECOMMERCE";
  if (compact === "MKT" || compact === "MARKETING") return "MARKETING";
  if (compact === "DISENO" || compact === "DESIGN") return "DISEÑO";
  if (compact === "PRODUCTO" || compact === "PRODUCT") return "PRODUCTO";
  if (["RRSS", "REDESSOCIALES", "SOCIALMEDIA"].includes(compact)) return "RRSS";
  if (compact === "AUDIOVISUAL") return "AUDIOVISUAL";
  if (compact === "TRADE" || compact === "TRADEMARKETING") return "TRADE";
  if (compact === "VENTAS" || compact === "SALES") return "VENTAS";
  if (["OPERACIONES", "OPERACION", "PROVEEDOR", "PROVEEDORES", "OPERACIONESPROVEEDOR", "SUPPLY", "LOGISTICA"].includes(compact)) {
    return "OPERACIONES / PROVEEDOR";
  }

  return "OTRAS";
}

function normalizeAreaFilter(area: string | undefined): AreaBucket | undefined {
  if (!area?.trim()) return undefined;
  return normalizeArea(area);
}

function startOfUtcToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function pendingMilestones(project: AreaProject): number {
  return project.milestones.filter((milestone) => milestone.status !== "completed").length;
}

function severityRank(severity: RoadmapProjectSeverity): number {
  if (severity === "critical") return 0;
  if (severity === "warning") return 1;
  return 2;
}

function targetDateTime(project: AreaProject): number {
  return project.targetDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
}

function sortProjectsByRisk(firstProject: AreaProject, secondProject: AreaProject): number {
  return (
    severityRank(firstProject.insights.severity) -
      severityRank(secondProject.insights.severity) ||
    secondProject.insights.blockedMilestones.length -
      firstProject.insights.blockedMilestones.length ||
    secondProject.insights.pendingApprovalMilestones.length -
      firstProject.insights.pendingApprovalMilestones.length ||
    secondProject.insights.upcomingMilestones.length -
      firstProject.insights.upcomingMilestones.length ||
    targetDateTime(firstProject) - targetDateTime(secondProject) ||
    firstProject.name.localeCompare(secondProject.name, "es")
  );
}

function buildAreaSummary(area: AreaBucket, projects: AreaProject[]): AreaSummary {
  const sortedProjects = [...projects].sort(sortProjectsByRisk);

  return {
    area,
    projects: sortedProjects,
    totalProjects: sortedProjects.length,
    inProgressProjects: sortedProjects.filter((project) => project.status === "en_curso").length,
    criticalProjects: sortedProjects.filter((project) => project.insights.severity === "critical").length,
    pendingMilestones: sortedProjects.reduce((total, project) => total + pendingMilestones(project), 0),
    milestonesWithoutOwner: sortedProjects.reduce((total, project) => total + project.insights.milestonesWithoutOwner.length, 0),
    pendingApprovals: sortedProjects.reduce((total, project) => total + project.insights.pendingApprovalMilestones.length, 0),
    blockedMilestones: sortedProjects.reduce((total, project) => total + project.insights.blockedMilestones.length, 0),
    upcomingMilestones: sortedProjects.reduce((total, project) => total + project.insights.upcomingMilestones.length, 0),
  };
}

function groupProjectsByArea(projects: AreaProject[], selectedArea?: AreaBucket): AreaSummary[] {
  const projectsByArea = new Map<AreaBucket, AreaProject[]>();

  for (const area of AREA_BUCKETS) projectsByArea.set(area, []);
  for (const project of projects) {
    projectsByArea.get(project.normalizedArea)?.push(project);
  }

  if (selectedArea) {
    return [buildAreaSummary(selectedArea, projectsByArea.get(selectedArea) ?? [])];
  }

  return AREA_BUCKETS.map((area) => buildAreaSummary(area, projectsByArea.get(area) ?? [])).filter(
    (summary) => summary.totalProjects > 0,
  );
}

function riskArea(summary: AreaSummary): boolean {
  return (
    summary.criticalProjects > 0 ||
    summary.blockedMilestones > 0 ||
    summary.pendingApprovals > 0 ||
    summary.milestonesWithoutOwner > 0
  );
}

function AreaMetric({ label, value, tone }: { label: string; value: number; tone?: "danger" | "warning" | "neutral" }) {
  return (
    <div className={`area-metric${tone ? ` ${tone}` : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ProjectMeta({ project }: { project: AreaProject }) {
  const items = [
    ROADMAP_PROJECT_TYPE_LABELS[project.projectType],
    project.channel?.trim(),
    project.brand?.trim(),
  ].filter((item): item is string => Boolean(item));

  return items.length > 0 ? <p className="area-project-tags">{items.join(" · ")}</p> : null;
}

function AreaProjectItem({ project }: { project: AreaProject }) {
  const nextMilestone = project.insights.nextMilestone;

  return (
    <Link className="area-project-item" href={`/roadmap/${project.id}`}>
      <div className="area-project-main">
        <p className="area-project-code">{project.code}</p>
        <h3>{project.name}</h3>
        <ProjectMeta project={project} />
      </div>
      <div className="area-project-badges">
        <span className={`badge status-${project.status}`}>{ROADMAP_STATUS_LABELS[project.status]}</span>
        <span className={`badge severity-${project.insights.severity}`}>{ROADMAP_SEVERITY_LABELS[project.insights.severity]}</span>
        <span className="badge slate">{project.ownerName || "Sin responsable"}</span>
      </div>
      <div className="area-project-next">
        <span>Próximo hito</span>
        <strong>{nextMilestone ? displayMilestoneName(nextMilestone) : "Sin próximos hitos"}</strong>
        <small>
          {nextMilestone
            ? `${displayPlannedDate(nextMilestone.plannedDate)} · ${displayMilestoneStatus(nextMilestone.status)}`
            : "Sin fecha"}
        </small>
      </div>
    </Link>
  );
}

function AreaLane({ summary }: { summary: AreaSummary }) {
  const visibleProjects = summary.projects.slice(0, PROJECT_LIST_LIMIT);
  const remainingProjects = Math.max(summary.projects.length - PROJECT_LIST_LIMIT, 0);

  return (
    <section className="panel area-lane" aria-labelledby={`area-${summary.area}`}>
      <div className="area-lane-header">
        <div>
          <p className="eyebrow">Área</p>
          <h2 id={`area-${summary.area}`}>{summary.area}</h2>
        </div>
        <span className={`badge ${riskArea(summary) ? "warning" : "approved"}`}>
          {riskArea(summary) ? "Con riesgo" : "En orden"}
        </span>
      </div>
      <div className="area-metrics-grid">
        <AreaMetric label="Proyectos" value={summary.totalProjects} />
        <AreaMetric label="En curso" value={summary.inProgressProjects} />
        <AreaMetric label="Críticos" value={summary.criticalProjects} tone={summary.criticalProjects > 0 ? "danger" : "neutral"} />
        <AreaMetric label="Hitos pendientes" value={summary.pendingMilestones} />
        <AreaMetric label="Sin responsable" value={summary.milestonesWithoutOwner} tone={summary.milestonesWithoutOwner > 0 ? "warning" : "neutral"} />
        <AreaMetric label="Aprobaciones" value={summary.pendingApprovals} tone={summary.pendingApprovals > 0 ? "warning" : "neutral"} />
        <AreaMetric label="Bloqueados" value={summary.blockedMilestones} tone={summary.blockedMilestones > 0 ? "danger" : "neutral"} />
        <AreaMetric label="Próximos 7 días" value={summary.upcomingMilestones} />
      </div>
      <div className="area-project-list">
        {visibleProjects.map((project) => (
          <AreaProjectItem key={project.id} project={project} />
        ))}
      </div>
      {remainingProjects > 0 ? <p className="area-more">+ {remainingProjects} proyectos más</p> : null}
    </section>
  );
}

export default async function RoadmapAreasPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const year = validYear(first(params.year));
  const selectedArea = normalizeAreaFilter(first(params.area));
  const today = startOfUtcToday();
  const projects = await searchRoadmapProjects({ year });
  const areaProjects: AreaProject[] = projects.map((project) => ({
    ...project,
    insights: buildRoadmapProjectInsights(project.milestones, today),
    normalizedArea: normalizeArea(project.area),
  }));
  const filteredProjects = selectedArea
    ? areaProjects.filter((project) => project.normalizedArea === selectedArea)
    : areaProjects;
  const areaSummaries = groupProjectsByArea(filteredProjects, selectedArea);
  const activeProjects = filteredProjects.filter((project) => ACTIVE_PROJECT_STATUSES.has(project.status));
  const areasWithRisk = areaSummaries.filter(riskArea);
  const milestonesWithoutOwner = filteredProjects.reduce((total, project) => total + project.insights.milestonesWithoutOwner.length, 0);
  const pendingApprovals = filteredProjects.reduce((total, project) => total + project.insights.pendingApprovalMilestones.length, 0);
  const blockedMilestones = filteredProjects.reduce((total, project) => total + project.insights.blockedMilestones.length, 0);
  const currentYear = currentUtcYear();
  const emptyMessage = selectedArea
    ? "No hay proyectos para esta área."
    : "No hay proyectos para el año seleccionado.";

  return (
    <AppShell active="projects">
      <PageHeader
        eyebrow="PROYECTOS"
        title="Vista por área"
        subtitle="Coordina proyectos, hitos y riesgos por equipo responsable."
        actions={
          <Link className="button secondary" href="/roadmap">
            Volver al roadmap
          </Link>
        }
      />

      <form className="panel filter-panel area-filter">
        <div className="filter-heading">
          <div>
            <p className="eyebrow">Filtro simple</p>
            <h2>Revisar coordinación</h2>
          </div>
          <div className="filter-actions">
            <Link className="button secondary" href="/roadmap/areas">
              Año actual
            </Link>
            <button className="button primary" type="submit">
              Aplicar
            </button>
          </div>
        </div>
        <div className="filter-grid area-filter-grid">
          <label className="field">
            <span>Año</span>
            <input name="year" type="number" min="2000" max="2100" defaultValue={year} />
          </label>
          <label className="field">
            <span>Área</span>
            <select name="area" defaultValue={selectedArea ?? ""}>
              <option value="">Todas</option>
              {AREA_FILTERS.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </label>
          <div className="area-filter-current" aria-label="Año actual">
            <span>Año actual</span>
            <strong>{currentYear}</strong>
          </div>
        </div>
      </form>

      <section className="kpi-grid area-kpis" aria-label="Indicadores por área">
        <KpiCard label="Áreas activas" value={areaSummaries.filter((summary) => summary.totalProjects > 0).length} tone="blue" detail="Con proyectos" />
        <KpiCard label="Proyectos activos" value={activeProjects.length} tone="slate" detail={`Total filtrado: ${filteredProjects.length}`} />
        <KpiCard label="Áreas con riesgo" value={areasWithRisk.length} tone={areasWithRisk.length > 0 ? "amber" : "green"} detail="Riesgo operativo" />
        <KpiCard label="Hitos sin responsable" value={milestonesWithoutOwner} tone={milestonesWithoutOwner > 0 ? "amber" : "green"} detail="Pendientes" />
        <KpiCard label="Aprobaciones pendientes" value={pendingApprovals} tone={pendingApprovals > 0 ? "amber" : "green"} detail="Requieren decisión" />
        <KpiCard label="Bloqueados" value={blockedMilestones} tone={blockedMilestones > 0 ? "red" : "green"} detail="Con impedimentos" />
      </section>

      {areaSummaries.length === 0 || areaSummaries.every((summary) => summary.totalProjects === 0) ? (
        <section className="panel area-empty">
          <h2>{emptyMessage}</h2>
          <p>
            Ajusta el año o el área para revisar la carga de trabajo de otros equipos.
          </p>
        </section>
      ) : (
        <div className="area-dashboard-grid" aria-label={`Proyectos por área ${displayDate(new Date(Date.UTC(year, 0, 1)))}`}>
          {areaSummaries.map((summary) => (
            <AreaLane key={summary.area} summary={summary} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
