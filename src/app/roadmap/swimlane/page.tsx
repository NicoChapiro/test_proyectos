import Link from "next/link";
import {
  ROADMAP_MILESTONE_CODE_LABELS,
  ROADMAP_PROJECT_TYPE_LABELS,
  ROADMAP_PROJECT_TYPES,
  ROADMAP_STATUSES,
  ROADMAP_STATUS_LABELS,
  ROADMAP_TRAFFIC_LIGHT_LABELS,
} from "@/modules/roadmap/constants";
import { buildRoadmapProjectInsights } from "@/modules/roadmap/insights";
import { searchRoadmapProjects } from "@/modules/roadmap/service";
import {
  buildYearTimelineScale,
  clampYearPercent,
  displayDate,
  displayPlannedDate,
} from "@/modules/roadmap/ui/date";
import {
  displayMilestoneName,
  displayMilestoneStatus,
} from "@/modules/roadmap/ui/labels";
import { AppShell, KpiCard, PageHeader } from "@/modules/roadmap/ui/shell";
import type {
  RoadmapProjectTypeValue,
  RoadmapStatusValue,
} from "@/modules/roadmap/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type Project = Awaited<ReturnType<typeof searchRoadmapProjects>>[number];
type ProjectMilestone = Project["milestones"][number];
type ProjectInsight = ReturnType<typeof buildRoadmapProjectInsights<ProjectMilestone>>;
type QuickFilterKey =
  | "all"
  | "q1"
  | "q2"
  | "q3"
  | "q4"
  | "risk"
  | "blocked"
  | "unassigned"
  | "approvals";

type SwimlaneProject = {
  project: Project;
  insights: ProjectInsight;
  timeline: ReturnType<typeof timelineMilestones>;
};

type Swimlane = {
  area: AreaSwimlaneName;
  projects: SwimlaneProject[];
  inProgressCount: number;
  criticalOrBlockedCount: number;
  pendingMilestoneCount: number;
  nextImportantDate?: Date | null;
};

const AREA_SWIMLANE_ORDER = [
  "MARKETING",
  "DISEÑO",
  "ECOMMERCE",
  "PRODUCTO",
  "RRSS",
  "AUDIOVISUAL",
  "TRADE",
  "VENTAS",
  "OPERACIONES / PROVEEDOR",
  "OTRAS",
  "SIN ÁREA",
] as const;

const OFFICIAL_AREA_SET = new Set<string>(AREA_SWIMLANE_ORDER);
type AreaSwimlaneName = (typeof AREA_SWIMLANE_ORDER)[number];

const QUICK_FILTERS: Array<{ key: QuickFilterKey; label: string }> = [
  { key: "all", label: "Todo el año" },
  { key: "q1", label: "Q1" },
  { key: "q2", label: "Q2" },
  { key: "q3", label: "Q3" },
  { key: "q4", label: "Q4" },
  { key: "risk", label: "En riesgo" },
  { key: "blocked", label: "Bloqueados" },
  { key: "unassigned", label: "Sin responsable" },
  { key: "approvals", label: "Aprobaciones pendientes" },
];

const PRIORITY_MILESTONE_CODES = [
  "supply_internal_design_approval",
  "supply_purchase_order_submitted",
  "supply_supplier_sample_approval",
  "supply_production_start",
  "supply_estimated_shipment",
  "supply_estimated_arrival_santiago",
  "supply_customs_release",
  "supply_quilicura_warehouse_arrival",
  "marketing_campaign_concept",
  "marketing_implementation_date",
  "marketing_activation_date",
] as const;
const PRIORITY_MILESTONE_NAMES = Object.values(ROADMAP_MILESTONE_CODE_LABELS).map(
  normalizeMilestoneLabel,
);
const TIMELINE_LABEL_LIMIT = 4;
const MIN_TIMELINE_LABEL_GAP = 14;
const SWIMLANE_ROUTE = "/roadmap/swimlane";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function safeQuickFilter(value: string | undefined): QuickFilterKey {
  const allowed = new Set<QuickFilterKey>(QUICK_FILTERS.map((item) => item.key));
  return value && allowed.has(value as QuickFilterKey)
    ? (value as QuickFilterKey)
    : "all";
}

function quickFilterHref(
  params: Record<string, string | string[] | undefined>,
  key: QuickFilterKey,
) {
  const query = new URLSearchParams();
  for (const [name, value] of Object.entries(params)) {
    if (name === "quick") continue;
    const firstValue = first(value);
    if (firstValue) query.set(name, firstValue);
  }
  if (key !== "all") query.set("quick", key);
  const serialized = query.toString();
  return serialized ? `${SWIMLANE_ROUTE}?${serialized}` : SWIMLANE_ROUTE;
}

function projectOverlapsQuarter(
  project: Project,
  year: number,
  quarter: number,
) {
  const quarterStart = new Date(Date.UTC(year, (quarter - 1) * 3, 1));
  const quarterEnd = new Date(Date.UTC(year, quarter * 3, 0, 23, 59, 59, 999));
  return project.startDate <= quarterEnd && project.targetDate >= quarterStart;
}

function filteredByQuick(
  projects: Project[],
  year: number,
  quickFilter: QuickFilterKey,
) {
  if (quickFilter === "all") return projects;
  if (["q1", "q2", "q3", "q4"].includes(quickFilter)) {
    const quarter = Number(quickFilter.slice(1));
    return projects.filter((project) =>
      projectOverlapsQuarter(project, year, quarter),
    );
  }
  return projects.filter((project) => {
    const insights = buildRoadmapProjectInsights(project.milestones);
    if (quickFilter === "risk")
      return (
        project.status === "en_riesgo" ||
        insights.severity === "warning" ||
        insights.severity === "critical"
      );
    if (quickFilter === "blocked")
      return (
        project.status === "bloqueado" || insights.blockedMilestones.length > 0
      );
    if (quickFilter === "unassigned")
      return (
        !project.ownerName?.trim() || insights.milestonesWithoutOwner.length > 0
      );
    if (quickFilter === "approvals") return insights.pendingApprovalCount > 0;
    return true;
  });
}

function normalizeArea(area: string | null | undefined): AreaSwimlaneName {
  const normalized = area?.trim().toUpperCase();
  if (!normalized) return "SIN ÁREA";
  return OFFICIAL_AREA_SET.has(normalized)
    ? (normalized as AreaSwimlaneName)
    : "OTRAS";
}

function normalizeMilestoneLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

function startOfTodayUtc(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function todayLinePercent(year: number) {
  const now = new Date();
  if (now.getUTCFullYear() !== year) return null;
  return clampYearPercent(
    new Date(Date.UTC(year, now.getUTCMonth(), now.getUTCDate())),
    year,
  );
}

function hasImportantLaunchMilestone(milestone: ProjectMilestone) {
  const name = normalizeMilestoneLabel(displayMilestoneName(milestone));
  return (
    milestone.milestoneCode === "marketing_activation_date" ||
    name.includes("activacion") ||
    name.includes("lanzamiento")
  );
}

function milestoneMarkerClass(milestone: ProjectMilestone) {
  if (milestone.status === "completed") return "milestone-completed";
  if (milestone.status === "blocked" || milestone.isCritical)
    return "milestone-blocked";
  if (hasImportantLaunchMilestone(milestone)) return "milestone-launch";
  if (milestone.status === "in_progress") return "milestone-in_progress";
  return "milestone-not_started";
}

function plannedMilestones(project: Project, year: number) {
  return project.milestones
    .filter((milestone) => milestone.plannedDate)
    .sort((a, b) => Number(a.plannedDate) - Number(b.plannedDate))
    .map((milestone) => ({
      milestone,
      left: clampYearPercent(milestone.plannedDate!, year),
    }));
}

function milestoneWorkflowValue(milestone: ProjectMilestone): number {
  return milestone.sequence || milestone.sortOrder || Number.MAX_SAFE_INTEGER;
}

function timelineLabelPriority(
  milestone: ProjectMilestone,
  context: {
    nextMilestone?: ProjectMilestone | null;
    earliestUpcomingId?: string;
    finalMilestoneId?: string;
  },
) {
  const codePriority = PRIORITY_MILESTONE_CODES.indexOf(
    milestone.milestoneCode as (typeof PRIORITY_MILESTONE_CODES)[number],
  );
  if (codePriority !== -1) return codePriority;

  const namePriority = PRIORITY_MILESTONE_NAMES.indexOf(
    normalizeMilestoneLabel(displayMilestoneName(milestone)),
  );
  if (namePriority !== -1) return namePriority + PRIORITY_MILESTONE_CODES.length;

  if (context.nextMilestone?.id === milestone.id) return 100;
  if (milestone.isCritical || milestone.status === "blocked") return 101;
  if (context.earliestUpcomingId === milestone.id) return 102;
  if (context.finalMilestoneId === milestone.id) return 103;

  return Number.POSITIVE_INFINITY;
}

function timelineLabelClass(left: number) {
  if (left < 8) return "milestone-label align-start";
  if (left > 92) return "milestone-label align-end";
  return "milestone-label";
}

function timelineMilestones(
  project: Project,
  year: number,
  nextMilestone?: ProjectMilestone | null,
) {
  const milestones = plannedMilestones(project, year);
  const todayStart = startOfTodayUtc();
  const upcomingMilestones = milestones
    .map(({ milestone }) => milestone)
    .filter(
      (milestone) =>
        milestone.status !== "completed" &&
        milestone.plannedDate &&
        new Date(milestone.plannedDate).getTime() >= todayStart,
    )
    .sort((a, b) => Number(a.plannedDate) - Number(b.plannedDate));
  const finalMilestone = milestones
    .map(({ milestone }) => milestone)
    .sort(
      (a, b) =>
        Number(a.plannedDate) - Number(b.plannedDate) ||
        milestoneWorkflowValue(a) - milestoneWorkflowValue(b),
    )
    .at(-1);
  const context = {
    nextMilestone,
    earliestUpcomingId: upcomingMilestones[0]?.id,
    finalMilestoneId: finalMilestone?.id,
  };
  const labels = milestones
    .map((item) => ({
      ...item,
      priority: timelineLabelPriority(item.milestone, context),
    }))
    .filter((item) => Number.isFinite(item.priority))
    .sort(
      (a, b) =>
        a.priority - b.priority ||
        Number(a.milestone.plannedDate) - Number(b.milestone.plannedDate),
    );

  const visibleLabels = labels.reduce<typeof labels>((selected, item) => {
    if (selected.length >= TIMELINE_LABEL_LIMIT) return selected;
    const collides = selected.some(
      (selectedItem) =>
        Math.abs(selectedItem.left - item.left) < MIN_TIMELINE_LABEL_GAP,
    );
    return collides ? selected : [...selected, item];
  }, []);
  const visibleLabelIds = new Set(
    visibleLabels.map((item) => item.milestone.id),
  );

  return {
    milestones,
    visibleLabels: visibleLabels.sort((a, b) => a.left - b.left),
    secondaryMilestoneCount: milestones.filter(
      ({ milestone }) => !visibleLabelIds.has(milestone.id),
    ).length,
  };
}

function severityRank(insights: ProjectInsight, project: Project) {
  if (
    project.status === "bloqueado" ||
    insights.severity === "critical" ||
    insights.blockedMilestones.length > 0
  )
    return 0;
  if (project.status === "en_riesgo" || insights.severity === "warning")
    return 1;
  return 2;
}

function sortSwimlaneProjects(a: SwimlaneProject, b: SwimlaneProject) {
  return (
    severityRank(a.insights, a.project) - severityRank(b.insights, b.project) ||
    Number(a.project.targetDate) - Number(b.project.targetDate) ||
    Number(a.project.startDate) - Number(b.project.startDate) ||
    a.project.name.localeCompare(b.project.name, "es")
  );
}

function nextImportantDate(projects: SwimlaneProject[]) {
  return projects
    .flatMap(({ insights, timeline }) => [
      insights.nextMilestone?.plannedDate ?? null,
      ...timeline.milestones
        .filter(({ milestone }) => milestone.status !== "completed")
        .map(({ milestone }) => milestone.plannedDate),
    ])
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => Number(a) - Number(b))[0];
}

function buildSwimlanes(projects: Project[], year: number): Swimlane[] {
  const grouped = new Map<AreaSwimlaneName, SwimlaneProject[]>();

  for (const project of projects) {
    const area = normalizeArea(project.area);
    const insights = buildRoadmapProjectInsights(project.milestones);
    const swimlaneProject = {
      project,
      insights,
      timeline: timelineMilestones(project, year, insights.nextMilestone),
    };
    grouped.set(area, [...(grouped.get(area) ?? []), swimlaneProject]);
  }

  // Future enhancement: persist custom area ordering with drag and drop.
  return AREA_SWIMLANE_ORDER.map((area) => {
    const laneProjects = (grouped.get(area) ?? []).sort(sortSwimlaneProjects);
    return {
      area,
      projects: laneProjects,
      inProgressCount: laneProjects.filter(
        ({ project }) => project.status === "en_curso",
      ).length,
      criticalOrBlockedCount: laneProjects.filter(
        ({ project, insights }) => severityRank(insights, project) === 0,
      ).length,
      pendingMilestoneCount: laneProjects.reduce(
        (total, { project }) =>
          total +
          project.milestones.filter(
            (milestone) => milestone.status !== "completed",
          ).length,
        0,
      ),
      nextImportantDate: nextImportantDate(laneProjects),
    };
  }).filter((lane) => lane.projects.length > 0);
}

function projectDates(project: Project, year: number) {
  const left = clampYearPercent(project.startDate, year);
  const right = clampYearPercent(project.targetDate, year);
  return { left, width: Math.max(1, right - left) };
}

function countPendingMilestones(projects: Project[]) {
  return projects.reduce(
    (total, project) =>
      total +
      project.milestones.filter((milestone) => milestone.status !== "completed")
        .length,
    0,
  );
}

export default async function SwimlaneRoadmapPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const year = Number(first(params.year)) || new Date().getUTCFullYear();
  const status = first(params.status) as RoadmapStatusValue | undefined;
  const projectType = first(params.projectType) as
    | RoadmapProjectTypeValue
    | undefined;
  const quickFilter = safeQuickFilter(first(params.quick));
  const allProjects = await searchRoadmapProjects({
    year,
    status: status || undefined,
    projectType: projectType || undefined,
    owner: first(params.owner),
    brand: first(params.brand),
    category: first(params.category),
    area: first(params.area),
    channel: first(params.channel),
    q: first(params.q),
  });
  const projects = filteredByQuick(allProjects, year, quickFilter);
  const swimlanes = buildSwimlanes(projects, year);
  const timelineScale = buildYearTimelineScale(year);
  const todayPercent = todayLinePercent(year);
  const atRiskProjects = projects.filter((project) => {
    const insights = buildRoadmapProjectInsights(project.milestones);
    return (
      project.status === "en_riesgo" ||
      insights.severity === "warning" ||
      insights.severity === "critical"
    );
  }).length;
  const blockedProjects = projects.filter((project) => {
    const insights = buildRoadmapProjectInsights(project.milestones);
    return project.status === "bloqueado" || insights.blockedMilestones.length > 0;
  }).length;
  const unassignedProjects = projects.filter(
    (project) => !project.ownerName?.trim(),
  ).length;
  const pendingApprovals = projects.reduce(
    (total, project) =>
      total + buildRoadmapProjectInsights(project.milestones).pendingApprovalCount,
    0,
  );

  return (
    <AppShell active="roadmap">
      <PageHeader
        eyebrow="ROADMAP DE MARKETING"
        title="Roadmap por áreas"
        subtitle="Vista tipo swimlane para comparar proyectos, hitos y carga de trabajo por área durante el año."
        actions={
          <>
            <Link className="button secondary" href="/roadmap">
              Volver al roadmap
            </Link>
            <Link className="button primary" href="/roadmap/new">
              + Nuevo proyecto
            </Link>
          </>
        }
      />

      <section className="kpi-grid swimlane-kpi-grid" aria-label="Indicadores del roadmap por áreas">
        <KpiCard label="Total proyectos" value={projects.length} tone="blue" detail="En filtros activos" />
        <KpiCard label="Áreas activas" value={swimlanes.length} tone="slate" detail="Con proyectos visibles" />
        <KpiCard label="En riesgo" value={atRiskProjects} tone="amber" detail="Warning o crítico" />
        <KpiCard label="Bloqueados" value={blockedProjects} tone="red" detail="Proyecto o hito" />
        <KpiCard label="Sin responsable" value={unassignedProjects} tone="slate" detail="Proyecto sin owner" />
        <KpiCard label="Aprobaciones pendientes" value={pendingApprovals} tone="amber" detail={`${countPendingMilestones(projects)} hitos pendientes`} />
      </section>

      <form className="panel filter-panel">
        <div className="filter-heading">
          <div>
            <p className="eyebrow">Filtros</p>
            <h2>Control ejecutivo de swimlanes</h2>
            <p className="muted filter-description">
              Compara áreas, trimestres y carga operativa sin cambiar la vista principal del roadmap.
            </p>
          </div>
          <div className="filter-actions">
            <Link className="button secondary" href={SWIMLANE_ROUTE}>
              Limpiar
            </Link>
            <button className="button primary" type="submit">
              Aplicar filtros
            </button>
          </div>
        </div>
        {quickFilter !== "all" ? <input type="hidden" name="quick" value={quickFilter} /> : null}
        <div className="quick-filter-group" aria-label="Filtros rápidos del roadmap swimlane">
          <span className="quick-filter-label">Filtros rápidos</span>
          <div className="quick-filter-chips">
            {QUICK_FILTERS.map((item) => (
              <Link
                key={item.key}
                className={`quick-filter-chip${quickFilter === item.key ? " active" : ""}`}
                href={quickFilterHref(params, item.key)}
                aria-current={quickFilter === item.key ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="filter-grid primary-filters">
          <label className="field">
            <span>Año</span>
            <input name="year" type="number" min="2000" max="2100" defaultValue={year} />
          </label>
          <label className="field">
            <span>Estado</span>
            <select name="status" defaultValue={status ?? ""}>
              <option value="">Todos</option>
              {ROADMAP_STATUSES.map((item) => (
                <option key={item} value={item}>{ROADMAP_STATUS_LABELS[item]}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Tipo de proyecto</span>
            <select name="projectType" defaultValue={projectType ?? ""}>
              <option value="">Todos</option>
              {ROADMAP_PROJECT_TYPES.map((item) => (
                <option key={item} value={item}>{ROADMAP_PROJECT_TYPE_LABELS[item]}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Buscar</span>
            <input name="q" placeholder="Proyecto, código o comentario" defaultValue={first(params.q) ?? ""} />
          </label>
        </div>
        <details className="advanced-filters">
          <summary>Filtros avanzados: responsable, marca, área, canal y categoría</summary>
          <div className="filter-grid advanced-filter-grid">
            <label className="field"><span>Responsable</span><input name="owner" defaultValue={first(params.owner) ?? ""} /></label>
            <label className="field"><span>Marca</span><input name="brand" defaultValue={first(params.brand) ?? ""} /></label>
            <label className="field"><span>Área</span><input name="area" defaultValue={first(params.area) ?? ""} /></label>
            <label className="field"><span>Canal</span><input name="channel" defaultValue={first(params.channel) ?? ""} /></label>
            <label className="field"><span>Categoría</span><input name="category" defaultValue={first(params.category) ?? ""} /></label>
          </div>
        </details>
      </form>

      <details className="panel roadmap-legend swimlane-legend" open>
        <summary>Cómo leer esta vista</summary>
        <div className="legend-grid">
          <span><i className="legend-bar neutral" />Barra = duración estimada</span>
          <span><i className="today-legend-line" />Línea vertical = hoy</span>
          <span><i className="legend-dot point" />Punto = hito</span>
          <span><i className="legend-dot green" />Verde = completado</span>
          <span><i className="legend-dot yellow" />Amarillo = requiere atención</span>
          <span><i className="legend-dot red" />Rojo = crítico/bloqueado</span>
          <span><i className="legend-dot gray" />Gris = no iniciado</span>
        </div>
      </details>

      <section className="swimlane-board" aria-label="Roadmap anual tipo swimlane por área">
        <div className="swimlane-board-content">
          <div className="timeline-scale swimlane-scale" aria-hidden="true">
            <div className="scale-spacer">Área / proyecto</div>
            <div className="scale-grid swimlane-scale-grid">
              {todayPercent !== null ? (
                <span className="today-line scale-today-line" style={{ left: `${todayPercent}%` }}>
                  <span>Hoy</span>
                </span>
              ) : null}
              <div className="quarter-header">
                {timelineScale.quarters.map((quarter) => (
                  <div key={quarter.label} style={{ width: `${quarter.width}%` }}>
                    <strong>{quarter.label}</strong>
                    <span>{quarter.range}</span>
                  </div>
                ))}
              </div>
              <div className="month-header">
                {timelineScale.months.map((month) => (
                  <span key={month.label} style={{ width: `${month.width}%` }}>{month.label}</span>
                ))}
              </div>
            </div>
            <div className="scale-spacer actions-spacer">Acción</div>
          </div>

          {swimlanes.length === 0 ? (
            <div className="empty-state swimlane-empty-state">
              <span className="empty-icon" aria-hidden="true">+</span>
              <h2>No hay proyectos para los filtros seleccionados</h2>
              <p>Ajusta los filtros o crea un nuevo proyecto para poblar las swimlanes del año.</p>
              <Link className="button primary" href="/roadmap/new">Nuevo proyecto</Link>
            </div>
          ) : null}

          {swimlanes.map((lane) => (
            <details className="swimlane-lane" key={lane.area} open>
              <summary className="swimlane-lane-summary">
                <span className="swimlane-lane-title">
                  {lane.area} · {lane.projects.length} {lane.projects.length === 1 ? "proyecto" : "proyectos"} · {lane.inProgressCount} en curso · {lane.criticalOrBlockedCount} crítico{lane.criticalOrBlockedCount === 1 ? "" : "s"} · {lane.pendingMilestoneCount} hitos pendientes
                </span>
                {lane.nextImportantDate ? (
                  <span className="swimlane-next-date">Próxima fecha: {displayDate(lane.nextImportantDate)}</span>
                ) : null}
              </summary>
              <div className="swimlane-projects">
                {lane.projects.map(({ project, insights, timeline }) => {
                  const { left, width } = projectDates(project, year);
                  return (
                    <article className="swimlane-project-row" key={project.id}>
                      <div className="swimlane-project-summary">
                        <p className="muted project-code">{project.code}</p>
                        <h3><Link href={`/roadmap/${project.id}`}>{project.name}</Link></h3>
                        <div className="project-meta-line swimlane-meta-line">
                          <span>{project.ownerName || "Sin responsable"}</span>
                          <span>{ROADMAP_PROJECT_TYPE_LABELS[project.projectType]}</span>
                        </div>
                        <div className="badges swimlane-badges">
                          <span className={`badge status-${project.status}`}>{ROADMAP_STATUS_LABELS[project.status]}</span>
                          <span className={`badge ${project.trafficLight}`}>{ROADMAP_TRAFFIC_LIGHT_LABELS[project.trafficLight]}</span>
                          <span className={`badge severity-${insights.severity}`}>{insights.severityLabel}</span>
                        </div>
                      </div>
                      <div className="swimlane-timeline-content">
                        <div className="row-topline swimlane-row-topline">
                          <span>{displayDate(project.startDate)} → {displayDate(project.targetDate)}</span>
                          <span>{insights.progressPercentage}% avance</span>
                        </div>
                        <div className="timeline swimlane-timeline" aria-label={`Línea de tiempo swimlane de ${project.name}`}>
                          <span className="timeline-grid" aria-hidden="true">
                            {timelineScale.months.slice(1).map((month) => (
                              <span key={`${project.id}-${month.label}-month`} className="timeline-month-line" style={{ left: `${month.start}%` }} />
                            ))}
                            {timelineScale.months.filter((month) => month.isQuarterStart).map((month) => (
                              <span key={`${project.id}-${month.label}-quarter`} className="timeline-quarter-line" style={{ left: `${month.start}%` }} />
                            ))}
                          </span>
                          {todayPercent !== null ? <span className="today-line row-today-line" style={{ left: `${todayPercent}%` }} /> : null}
                          <span className="timeline-bar swimlane-duration-bar" style={{ left: `${left}%`, width: `${width}%` }} title={`${displayDate(project.startDate)} → ${displayDate(project.targetDate)}`} />
                          {timeline.milestones.map(({ milestone, left: milestoneLeft }) => (
                            <span
                              key={milestone.id}
                              className={`milestone-dot ${milestoneMarkerClass(milestone)}`}
                              style={{ left: `${milestoneLeft}%` }}
                              title={`${displayMilestoneName(milestone)}: ${displayPlannedDate(milestone.plannedDate)} · ${displayMilestoneStatus(milestone.status)}`}
                            />
                          ))}
                          {timeline.visibleLabels.map(({ milestone, left: milestoneLeft }) => (
                            <span key={`${milestone.id}-label`} className={timelineLabelClass(milestoneLeft)} style={{ left: `${milestoneLeft}%` }}>
                              {displayMilestoneName(milestone)}
                            </span>
                          ))}
                          {timeline.secondaryMilestoneCount > 0 ? (
                            <span className="swimlane-more-milestones">+ {timeline.secondaryMilestoneCount} hitos</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="row-actions swimlane-row-actions">
                        <Link className="button small" href={`/roadmap/${project.id}`}>Ver detalle</Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </details>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
