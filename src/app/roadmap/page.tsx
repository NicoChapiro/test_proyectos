import Link from "next/link";
import {
  ROADMAP_PROJECT_TYPE_LABELS,
  ROADMAP_PROJECT_TYPES,
  ROADMAP_STATUSES,
  ROADMAP_STATUS_LABELS,
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
  displayApprovalStatus,
} from "@/modules/roadmap/ui/labels";
import { AnnualRoadmapSummaryToggle } from "@/modules/roadmap/ui/AnnualRoadmapSummaryToggle";
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
type ProjectSummaryField = {
  label: string;
  value: string;
  tone?: "default" | "warning" | "critical";
};

type QuickFilterKey =
  | "all"
  | "action"
  | "q1"
  | "q2"
  | "q3"
  | "q4"
  | "risk"
  | "blocked"
  | "unassigned"
  | "approvals";

const FLOW_LABELS = {
  supply: "Producto / Ops",
  marketing: "Marketing",
} as const;
const FLOW_ORDER = ["supply", "marketing"] as const;
const FLOW_CLUSTER_GAP = 2;
const FLOW_DOT_LIMIT = 9;

function milestoneWorkflowValue(milestone: ProjectMilestone): number {
  return milestone.sequence || milestone.sortOrder || Number.MAX_SAFE_INTEGER;
}

function milestoneTimelineDate(milestone: ProjectMilestone): Date | null {
  const value = milestone.dateMode === "range"
    ? milestone.plannedEndDate ?? milestone.plannedStartDate ?? milestone.plannedDate ?? milestone.dueDate
    : milestone.plannedDate ?? milestone.dueDate;
  return value ? new Date(value) : null;
}

function milestoneTimelineStartDate(milestone: ProjectMilestone): Date | null {
  const value = milestone.dateMode === "range" ? milestone.plannedStartDate ?? milestone.plannedDate ?? milestone.dueDate : milestone.plannedDate ?? milestone.dueDate;
  return value ? new Date(value) : null;
}

function milestoneTimelineEndDate(milestone: ProjectMilestone): Date | null {
  const value = milestone.dateMode === "range" ? milestone.plannedEndDate ?? milestone.plannedDate ?? milestone.dueDate : milestone.plannedDate ?? milestone.dueDate;
  return value ? new Date(value) : null;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function pendingMilestones(projects: Project[]) {
  return projects.reduce(
    (total, project) =>
      total +
      project.milestones.filter((milestone) => milestone.status !== "completed")
        .length,
    0,
  );
}

type FlowTrack = (typeof FLOW_ORDER)[number];
type DatedFlowMilestone = {
  milestone: ProjectMilestone;
  date: Date;
  left: number;
};
type FlowMilestoneCluster = {
  id: string;
  milestones: DatedFlowMilestone[];
  left: number;
  date: Date;
};
type ProjectFlowOverview = {
  track: FlowTrack;
  label: string;
  milestones: ProjectMilestone[];
  datedMilestones: DatedFlowMilestone[];
  clusters: FlowMilestoneCluster[];
  visibleClusters: FlowMilestoneCluster[];
  hiddenMilestoneCount: number;
  left: number;
  width: number;
};

function buildMilestoneClusters(
  datedMilestones: DatedFlowMilestone[],
): FlowMilestoneCluster[] {
  return datedMilestones.reduce<FlowMilestoneCluster[]>((clusters, item) => {
    const current = clusters.at(-1);
    if (current && Math.abs(item.left - current.left) <= FLOW_CLUSTER_GAP) {
      const milestones = [...current.milestones, item];
      current.milestones = milestones;
      current.left =
        milestones.reduce((total, milestone) => total + milestone.left, 0) /
        milestones.length;
      current.date = milestones[0].date;
      current.id = milestones.map(({ milestone }) => milestone.id).join("-");
      return clusters;
    }

    return [
      ...clusters,
      {
        id: item.milestone.id,
        milestones: [item],
        left: item.left,
        date: item.date,
      },
    ];
  }, []);
}

function buildProjectFlowOverviews(
  project: Project,
  year: number,
): ProjectFlowOverview[] {
  return FLOW_ORDER.map((track) => {
    const milestones = project.milestones
      .filter((milestone) => milestone.track === track)
      .sort(
        (a, b) =>
          milestoneWorkflowValue(a) - milestoneWorkflowValue(b) ||
          Number(milestoneTimelineDate(a) ?? 0) -
            Number(milestoneTimelineDate(b) ?? 0),
      );
    const datedMilestones = milestones
      .map((milestone) => {
        const date = milestoneTimelineDate(milestone);
        if (!date) return null;
        return { milestone, date, left: clampYearPercent(date, year) };
      })
      .filter((item): item is DatedFlowMilestone => Boolean(item))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    const clusters = buildMilestoneClusters(datedMilestones);
    const visibleClusters = clusters.slice(0, FLOW_DOT_LIMIT);
    const visibleMilestoneCount = visibleClusters.reduce(
      (total, cluster) => total + cluster.milestones.length,
      0,
    );
    const firstMilestone = datedMilestones[0];
    const lastMilestone = datedMilestones.at(-1);
    const left = firstMilestone?.left ?? 0;
    const right = lastMilestone?.left ?? left;

    return {
      track,
      label: FLOW_LABELS[track],
      milestones,
      datedMilestones,
      clusters,
      visibleClusters,
      hiddenMilestoneCount: Math.max(
        0,
        datedMilestones.length - visibleMilestoneCount,
      ),
      left,
      width: Math.max(1.5, right - left),
    };
  }).filter((flow) => flow.milestones.length > 0);
}

function flowDotClass(milestones: ProjectMilestone[]): string {
  if (
    milestones.some(
      (milestone) =>
        milestone.status === "blocked" ||
        milestone.isCritical ||
        milestone.approvalStatus === "rejected",
    )
  ) {
    return "milestone-blocked";
  }
  if (
    milestones.some(
      (milestone) =>
        milestone.status === "in_progress" ||
        milestone.approvalStatus === "pending",
    )
  ) {
    return "milestone-in_progress";
  }
  if (milestones.every((milestone) => milestone.status === "completed")) {
    return "milestone-completed";
  }
  return "milestone-not_started";
}

function milestoneSequenceLabel(milestone: ProjectMilestone): string {
  return `#${milestone.sequence ?? milestone.sortOrder ?? "—"}`;
}

function displayMilestoneTimelineDate(milestone: ProjectMilestone): string {
  if (milestone.dateMode !== "range") {
    return displayPlannedDate(milestoneTimelineDate(milestone));
  }

  return `${displayPlannedDate(
    milestoneTimelineStartDate(milestone),
  )} → ${displayPlannedDate(milestoneTimelineEndDate(milestone))}`;
}

function flowMilestoneTooltip(milestones: ProjectMilestone[]): string {
  return milestones
    .map((milestone) => {
      const lines = [
        milestoneSequenceLabel(milestone),
        displayMilestoneName(milestone),
        `Fecha: ${displayMilestoneTimelineDate(milestone)}`,
        `Responsable: ${milestone.ownerName || "Sin responsable"}`,
        `Estado: ${displayMilestoneStatus(milestone.status)}`,
      ];
      if (milestone.approvalStatus) {
        lines.push(`Aprobación: ${displayApprovalStatus(milestone.approvalStatus)}`);
      }
      return lines.join(" · ");
    })
    .join("\n");
}

function nextMilestoneSummary(
  milestone:
    | { name: string; milestoneCode?: string | null; plannedDate?: Date | null }
    | null
    | undefined,
) {
  if (!milestone) return "Sin acciones pendientes";
  return `${displayMilestoneName(milestone)} · ${displayPlannedDate(
    milestone.plannedDate,
  )}`;
}

function projectTooltipSummary(
  project: Project,
  insights: ReturnType<typeof buildRoadmapProjectInsights>,
): string {
  return [
    `${project.code} · ${project.name}`,
    `Responsable: ${project.ownerName || "Sin responsable"}`,
    `Tipo: ${ROADMAP_PROJECT_TYPE_LABELS[project.projectType]}`,
    `Área: ${project.area || "Sin área"}`,
    `Avance: ${insights.progressPercentage}%`,
    `Próximo hito: ${nextMilestoneSummary(insights.nextMilestone)}`,
    `Fecha objetivo: ${displayDate(project.targetDate)}`,
  ].join("\n");
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

function projectRequiresAction(
  project: Project,
  insights = buildRoadmapProjectInsights(project.milestones),
): boolean {
  return (
    !project.ownerName?.trim() ||
    project.status === "en_riesgo" ||
    project.status === "bloqueado" ||
    insights.severity === "warning" ||
    insights.severity === "critical" ||
    insights.blockedMilestones.length > 0 ||
    insights.overdueMilestones.length > 0 ||
    insights.milestonesWithoutOwner.length > 0 ||
    insights.pendingApprovalCount > 0 ||
    insights.pendingApprovalMilestones.length > 0
  );
}

function filteredByQuick(
  projects: Project[],
  year: number,
  quickFilter: QuickFilterKey,
) {
  if (quickFilter === "all") return projects;
  if (quickFilter === "action") {
    return projects.filter((project) => projectRequiresAction(project));
  }
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

function safeQuickFilter(value: string | undefined): QuickFilterKey {
  const allowed = new Set<QuickFilterKey>([
    "all",
    "action",
    "q1",
    "q2",
    "q3",
    "q4",
    "risk",
    "blocked",
    "unassigned",
    "approvals",
  ]);
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
  return serialized ? `/roadmap?${serialized}` : "/roadmap";
}

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function projectOperationalAlerts(
  insights: ReturnType<typeof buildRoadmapProjectInsights>,
): Array<{ label: string; tone: "warning" | "critical" }> {
  const alerts: Array<{ label: string; tone: "warning" | "critical" }> = [];
  if (insights.milestonesWithoutOwner.length > 0) {
    alerts.push({
      label: pluralize(
        insights.milestonesWithoutOwner.length,
        "hito sin responsable",
        "hitos sin responsable",
      ),
      tone: "warning",
    });
  }
  if (insights.pendingApprovalMilestones.length > 0) {
    alerts.push({
      label: pluralize(
        insights.pendingApprovalMilestones.length,
        "aprobación pendiente",
        "aprobaciones pendientes",
      ),
      tone: "warning",
    });
  }
  if (insights.blockedMilestones.length > 0) {
    alerts.push({
      label: pluralize(
        insights.blockedMilestones.length,
        "hito bloqueado",
        "hitos bloqueados",
      ),
      tone: "critical",
    });
  }
  if (insights.overdueMilestones.length > 0) {
    alerts.push({
      label: pluralize(
        insights.overdueMilestones.length,
        "hito vencido",
        "hitos vencidos",
      ),
      tone: "critical",
    });
  }
  return alerts;
}

function projectSummaryFields(
  project: Project,
  insights: ReturnType<typeof buildRoadmapProjectInsights>,
): ProjectSummaryField[] {
  const nextMilestone = insights.nextMilestone;
  return [
    {
      label: "Próximo hito",
      value: nextMilestone
        ? displayMilestoneName(nextMilestone)
        : "Sin acciones pendientes",
    },
    {
      label: "Fecha próximo hito",
      value: displayPlannedDate(nextMilestone?.plannedDate),
    },
    {
      label: "Responsable próximo hito",
      value: nextMilestone?.ownerName?.trim() || "Sin responsable",
      tone: nextMilestone?.ownerName?.trim() ? "default" : "warning",
    },
    { label: "Fecha objetivo", value: displayDate(project.targetDate) },
    { label: "Avance %", value: `${insights.progressPercentage}%` },
    { label: "Estado", value: ROADMAP_STATUS_LABELS[project.status] },
    {
      label: "Severidad / riesgo",
      value: insights.severityLabel,
      tone:
        insights.severity === "critical"
          ? "critical"
          : insights.severity === "warning"
            ? "warning"
            : "default",
    },
  ];
}

export default async function RoadmapPage({ searchParams }: PageProps) {
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
  const quickFilters: Array<{ key: QuickFilterKey; label: string }> = [
    { key: "all", label: "Todo el año" },
    { key: "action", label: "Requiere acción" },
    { key: "q1", label: "Q1" },
    { key: "q2", label: "Q2" },
    { key: "q3", label: "Q3" },
    { key: "q4", label: "Q4" },
    { key: "risk", label: "En riesgo" },
    { key: "blocked", label: "Bloqueados" },
    { key: "unassigned", label: "Sin responsable" },
    { key: "approvals", label: "Aprobaciones pendientes" },
  ];

  const projectsInProgress = projects.filter(
    (project) => project.status === "en_curso",
  ).length;
  const projectsRequiringAction = projects.filter((project) =>
    projectRequiresAction(project),
  ).length;
  const blockedProjects = projects.filter(
    (project) => project.status === "bloqueado",
  ).length;
  const timelineScale = buildYearTimelineScale(year);

  return (
    <AppShell active="roadmap">
      <PageHeader
        eyebrow="ROADMAP DE MARKETING"
        title={`Roadmap anual ${year}`}
        subtitle="Vista transversal de proyectos de Marketing, por Q1, Q2, Q3 y Q4 con hitos clave."
        actions={
          <Link className="button primary" href="/roadmap/new">
            + Nuevo proyecto
          </Link>
        }
      />

      <section className="kpi-grid" aria-label="Indicadores del roadmap">
        <KpiCard
          label="Total proyectos"
          value={projects.length}
          tone="blue"
          detail="En el año filtrado"
        />
        <KpiCard
          label="En curso"
          value={projectsInProgress}
          tone="green"
          detail="Avanzando según plan"
        />
        <KpiCard
          label="Requieren acción"
          value={projectsRequiringAction}
          tone="amber"
          detail="Con alertas operativas"
        />
        <KpiCard
          label="Bloqueados"
          value={blockedProjects}
          tone="red"
          detail="Con impedimentos"
        />
        <KpiCard
          label="Hitos pendientes"
          value={pendingMilestones(projects)}
          tone="slate"
          detail="No completados"
        />
      </section>

      <form className="panel filter-panel">
        <div className="filter-heading">
          <div>
            <p className="eyebrow">Filtros</p>
            <h2>Control y segmentación</h2>
            <p className="muted filter-description">
              Usa filtros rápidos para foco operativo o combina criterios
              avanzados. Roadmap = vista anual. Proyectos = edición masiva.
              Calendario = fechas mensuales. Reportes = seguimiento semanal.
            </p>
          </div>
          <div className="filter-actions">
            <Link className="button secondary" href="/roadmap">
              Limpiar
            </Link>
            <button className="button primary" type="submit">
              Aplicar filtros
            </button>
          </div>
        </div>
        {quickFilter !== "all" ? (
          <input type="hidden" name="quick" value={quickFilter} />
        ) : null}
        <div
          className="quick-filter-group"
          aria-label="Filtros rápidos del roadmap"
        >
          <span className="quick-filter-label">Filtros rápidos</span>
          <div className="quick-filter-chips">
            {quickFilters.map((item) => (
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
            <input
              name="year"
              type="number"
              min="2000"
              max="2100"
              defaultValue={year}
            />
          </label>
          <label className="field">
            <span>Estado</span>
            <select name="status" defaultValue={status ?? ""}>
              <option value="">Todos</option>
              {ROADMAP_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {ROADMAP_STATUS_LABELS[item]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Tipo de proyecto</span>
            <select name="projectType" defaultValue={projectType ?? ""}>
              <option value="">Todos</option>
              {ROADMAP_PROJECT_TYPES.map((item) => (
                <option key={item} value={item}>
                  {ROADMAP_PROJECT_TYPE_LABELS[item]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Buscar</span>
            <input
              name="q"
              placeholder="Proyecto, código o comentario"
              defaultValue={first(params.q) ?? ""}
            />
          </label>
        </div>
        <details className="advanced-filters">
          <summary>
            Filtros avanzados: responsable, marca, área, canal y categoría
          </summary>
          <div className="filter-grid advanced-filter-grid">
            <label className="field">
              <span>Responsable</span>
              <input name="owner" defaultValue={first(params.owner) ?? ""} />
            </label>
            <label className="field">
              <span>Marca</span>
              <input name="brand" defaultValue={first(params.brand) ?? ""} />
            </label>
            <label className="field">
              <span>Área</span>
              <input name="area" defaultValue={first(params.area) ?? ""} />
            </label>
            <label className="field">
              <span>Canal</span>
              <input
                name="channel"
                defaultValue={first(params.channel) ?? ""}
              />
            </label>
            <label className="field">
              <span>Categoría</span>
              <input
                name="category"
                defaultValue={first(params.category) ?? ""}
              />
            </label>
          </div>
        </details>
      </form>

      <details className="panel roadmap-legend compact-legend">
        <summary>Cómo leerlo</summary>
        <p className="muted">
          Cada fila es un proyecto. Cada línea muestra un flujo: Producto/Ops o
          Marketing. Los puntos son hitos ubicados por fecha. Amarillo y rojo
          requieren revisión. Usa Ver detalle para editar fechas, responsables e
          hitos.
        </p>
        <div className="legend-grid compact-legend-grid">
          <span>
            <i className="legend-dot green" />
            completado
          </span>
          <span>
            <i className="legend-dot yellow" />
            en curso / aprobación
          </span>
          <span>
            <i className="legend-dot red" />
            bloqueado / crítico
          </span>
          <span>
            <i className="legend-dot gray" />
            no iniciado
          </span>
        </div>
      </details>

      <section
        className="roadmap-board"
        aria-label="Roadmap anual por trimestre y mes"
      >
        <div className="roadmap-board-content">
          <div className="timeline-scale" aria-hidden="true">
            <div className="scale-spacer">Proyecto</div>
            <div className="scale-grid">
              <div className="quarter-header">
                {timelineScale.quarters.map((quarter) => (
                  <div
                    key={quarter.label}
                    style={{ width: `${quarter.width}%` }}
                  >
                    <strong>{quarter.label}</strong>
                    <span>{quarter.range}</span>
                  </div>
                ))}
              </div>
              <div className="month-header">
                {timelineScale.months.map((month) => (
                  <span key={month.label} style={{ width: `${month.width}%` }}>
                    {month.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="scale-spacer actions-spacer">Acción</div>
          </div>
          {projects.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon" aria-hidden="true">
                +
              </span>
              <h2>No hay proyectos todavía</h2>
              <p>
                Crea el primer proyecto para comenzar a construir el roadmap
                anual.
              </p>
              <Link className="button primary" href="/roadmap/new">
                Nuevo proyecto
              </Link>
            </div>
          ) : null}
          {projects.map((project) => {
            const insights = buildRoadmapProjectInsights(project.milestones);
            const flowOverviews = buildProjectFlowOverviews(project, year);
            const tooltip = projectTooltipSummary(project, insights);
            return (
              <article
                className="timeline-project-row annual-flow-row"
                key={project.id}
                title={tooltip}
                aria-label={tooltip}
              >
                <div className="project-summary annual-project-summary">
                  <h3>
                    <Link href={`/roadmap/${project.id}`}>{project.name}</Link>
                  </h3>
                  <div className="badges compact-badges">
                    <span className={`badge status-${project.status}`}>
                      {ROADMAP_STATUS_LABELS[project.status]}
                    </span>
                    {insights.severity !== "ok" ||
                    project.status === "en_riesgo" ||
                    project.status === "bloqueado" ? (
                      <span className={`badge severity-${insights.severity}`}>
                        {insights.severityLabel}
                      </span>
                    ) : null}
                  </div>
                  <p className="project-meta-line compact-meta-line">
                    <span>{project.ownerName || "Sin responsable"}</span>
                    <span>{project.area || "Sin área"}</span>
                  </p>
                </div>
                <div className="timeline-content annual-flow-content">
                  <div className="annual-flow-lanes">
                    {flowOverviews.length === 0 ? (
                      <p className="annual-no-dates">Sin fechas suficientes</p>
                    ) : null}
                    {flowOverviews.map((flow) => (
                      <div className="annual-flow-lane" key={flow.track}>
                        <div className="annual-flow-lane-label">
                          <span>{flow.label}</span>
                          <small>{flow.milestones.length}</small>
                        </div>
                        {flow.datedMilestones.length === 0 ? (
                          <p className="annual-no-dates">
                            Sin fechas
                          </p>
                        ) : (
                          <div
                            className="annual-flow-timeline"
                            aria-label={`${flow.label} de ${project.name}`}
                          >
                            <span className="timeline-grid" aria-hidden="true">
                              {timelineScale.months.slice(1).map((month) => (
                                <span
                                  key={`${project.id}-${flow.track}-${month.label}-month`}
                                  className="timeline-month-line"
                                  style={{ left: `${month.start}%` }}
                                />
                              ))}
                              {timelineScale.months
                                .filter((month) => month.isQuarterStart)
                                .map((month) => (
                                  <span
                                    key={`${project.id}-${flow.track}-${month.label}-quarter`}
                                    className="timeline-quarter-line"
                                    style={{ left: `${month.start}%` }}
                                  />
                                ))}
                            </span>
                            <span
                              className="annual-flow-bar"
                              style={{
                                left: `${flow.left}%`,
                                width: `${flow.width}%`,
                              }}
                              title={`${displayDate(flow.datedMilestones[0]?.date)} → ${displayDate(flow.datedMilestones.at(-1)?.date)}`}
                            />
                            {flow.datedMilestones.map(({ milestone }) => {
                              if (milestone.dateMode !== "range") return null;
                              const start = milestoneTimelineStartDate(milestone);
                              const end = milestoneTimelineEndDate(milestone);
                              if (!start || !end) return null;
                              const startLeft = clampYearPercent(start, year);
                              const endLeft = clampYearPercent(end, year);
                              return (
                                <span
                                  key={`${milestone.id}-range`}
                                  className={`milestone-range-bar annual-milestone-range ${flowDotClass([milestone])}`}
                                  style={{ left: `${Math.min(startLeft, endLeft)}%`, width: `${Math.max(2, Math.abs(endLeft - startLeft))}%` }}
                                  title={flowMilestoneTooltip([milestone])}
                                />
                              );
                            })}
                            {flow.visibleClusters.map((cluster) => {
                              const clusterMilestones = cluster.milestones.map(
                                ({ milestone }) => milestone,
                              );
                              const tooltip = flowMilestoneTooltip(
                                clusterMilestones,
                              );

                              return (
                                <span
                                  key={cluster.id}
                                  className={`milestone-dot ${flowDotClass(
                                    clusterMilestones,
                                  )}${
                                    cluster.milestones.length > 1
                                      ? " milestone-cluster"
                                      : ""
                                  }`}
                                  style={{ left: `${cluster.left}%` }}
                                  title={tooltip}
                                  aria-label={tooltip}
                                  tabIndex={0}
                                >
                                  {cluster.milestones.length > 1
                                    ? cluster.milestones.length
                                    : null}
                                </span>
                              );
                            })}
                            {flow.hiddenMilestoneCount > 0 ? (
                              <span className="annual-hidden-milestones">
                                +{flow.hiddenMilestoneCount}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <AnnualRoadmapSummaryToggle
                  projectId={project.id}
                  projectName={project.name}
                  detailHref={`/roadmap/${project.id}`}
                  fields={projectSummaryFields(project, insights)}
                  alerts={projectOperationalAlerts(insights)}
                />
              </article>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
