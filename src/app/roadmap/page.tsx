import Link from "next/link";
import { ROADMAP_DEFAULT_COLORS, ROADMAP_PROJECT_TYPE_LABELS, ROADMAP_PROJECT_TYPES, ROADMAP_STATUSES, ROADMAP_STATUS_LABELS, ROADMAP_TRAFFIC_LIGHT_LABELS } from "@/modules/roadmap/constants";
import { buildRoadmapProjectInsights } from "@/modules/roadmap/insights";
import { searchRoadmapProjects } from "@/modules/roadmap/service";
import { clampYearPercent, displayDate, displayPlannedDate } from "@/modules/roadmap/ui/date";
import { displayMilestoneName, displayMilestoneStatus } from "@/modules/roadmap/ui/labels";
import { AppShell, KpiCard, PageHeader } from "@/modules/roadmap/ui/shell";
import type { RoadmapProjectTypeValue, RoadmapStatusValue } from "@/modules/roadmap/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

type Project = Awaited<ReturnType<typeof searchRoadmapProjects>>[number];
type ProjectMilestone = Project["milestones"][number];

const TIMELINE_LABEL_PRIORITY_CODES = [
  "supply_estimated_arrival_santiago",
  "marketing_activation_date",
  "supply_quilicura_warehouse_arrival",
] as const;
const TIMELINE_LABEL_LIMIT = 3;
const MIN_TIMELINE_LABEL_GAP = 24;

function milestoneWorkflowValue(milestone: ProjectMilestone): number {
  return milestone.sequence || milestone.sortOrder || Number.MAX_SAFE_INTEGER;
}

function startOfTodayUtc(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function pendingMilestones(projects: Project[]) {
  return projects.reduce((total, project) => total + project.milestones.filter((milestone) => milestone.status !== "completed").length, 0);
}

function plannedMilestones(project: Project, year: number) {
  return project.milestones
    .filter((milestone) => milestone.plannedDate)
    .sort((a, b) => Number(a.plannedDate) - Number(b.plannedDate))
    .map((milestone) => ({ milestone, left: clampYearPercent(milestone.plannedDate!, year) }));
}

function timelineLabelPriority(milestone: ProjectMilestone, context: { nextMilestone?: ProjectMilestone | null; earliestUpcomingId?: string; finalMilestoneId?: string }) {
  if (context.nextMilestone?.id === milestone.id) return 0;

  const codePriority = TIMELINE_LABEL_PRIORITY_CODES.indexOf(milestone.milestoneCode as (typeof TIMELINE_LABEL_PRIORITY_CODES)[number]);
  if (codePriority !== -1) return codePriority + 1;

  if (milestone.isCritical || context.finalMilestoneId === milestone.id) return 4;
  if (context.earliestUpcomingId === milestone.id) return 5;

  return Number.POSITIVE_INFINITY;
}

function timelineLabelClass(left: number) {
  if (left < 8) return "milestone-label align-start";
  if (left > 92) return "milestone-label align-end";
  return "milestone-label";
}

function timelineMilestones(project: Project, year: number, nextMilestone?: ProjectMilestone | null) {
  const milestones = plannedMilestones(project, year);
  const todayStart = startOfTodayUtc();
  const upcomingMilestones = milestones
    .map(({ milestone }) => milestone)
    .filter((milestone) => milestone.status !== "completed" && milestone.plannedDate && new Date(milestone.plannedDate).getTime() >= todayStart)
    .sort((a, b) => Number(a.plannedDate) - Number(b.plannedDate));
  const finalMilestone = milestones
    .map(({ milestone }) => milestone)
    .sort((a, b) => milestoneWorkflowValue(a) - milestoneWorkflowValue(b) || Number(a.plannedDate) - Number(b.plannedDate))
    .at(-1);
  const context = {
    nextMilestone,
    earliestUpcomingId: upcomingMilestones[0]?.id,
    finalMilestoneId: finalMilestone?.id,
  };
  const labels = milestones
    .map((item) => ({ ...item, priority: timelineLabelPriority(item.milestone, context) }))
    .filter((item) => Number.isFinite(item.priority))
    .sort((a, b) => a.priority - b.priority || Number(a.milestone.plannedDate) - Number(b.milestone.plannedDate));

  const visibleLabels = labels.reduce<typeof labels>((selected, item) => {
    if (selected.length >= TIMELINE_LABEL_LIMIT) return selected;
    const collides = selected.some((selectedItem) => Math.abs(selectedItem.left - item.left) < MIN_TIMELINE_LABEL_GAP);
    return collides ? selected : [...selected, item];
  }, []);
  const visibleLabelIds = new Set(visibleLabels.map((item) => item.milestone.id));
  const secondaryMilestoneCount = upcomingMilestones.filter((milestone) => !visibleLabelIds.has(milestone.id)).length;

  return {
    milestones,
    visibleLabels: visibleLabels.sort((a, b) => a.left - b.left),
    secondaryMilestoneCount,
  };
}

export default async function RoadmapPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const year = Number(first(params.year)) || new Date().getUTCFullYear();
  const status = first(params.status) as RoadmapStatusValue | undefined;
  const projectType = first(params.projectType) as RoadmapProjectTypeValue | undefined;
  const projects = await searchRoadmapProjects({
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

  const projectsInProgress = projects.filter((project) => project.status === "en_curso").length;
  const projectsAtRisk = projects.filter((project) => project.status === "en_riesgo").length;
  const blockedProjects = projects.filter((project) => project.status === "bloqueado").length;

  return (
    <AppShell active="roadmap">
      <PageHeader
        eyebrow="ROADMAP DE MARKETING"
        title={`Roadmap anual ${year}`}
        subtitle="Vista transversal de proyectos de Marketing, por Q1, Q2, Q3 y Q4 con hitos clave."
        actions={<Link className="button primary" href="/roadmap/new">+ Nuevo proyecto</Link>}
      />

      <section className="kpi-grid" aria-label="Indicadores del roadmap">
        <KpiCard label="Total proyectos" value={projects.length} tone="blue" detail="En el año filtrado" />
        <KpiCard label="En curso" value={projectsInProgress} tone="green" detail="Avanzando según plan" />
        <KpiCard label="En riesgo" value={projectsAtRisk} tone="amber" detail="Requieren seguimiento" />
        <KpiCard label="Bloqueados" value={blockedProjects} tone="red" detail="Con impedimentos" />
        <KpiCard label="Hitos pendientes" value={pendingMilestones(projects)} tone="slate" detail="No completados" />
      </section>

      <form className="panel filter-panel">
        <div className="filter-heading">
          <div>
            <p className="eyebrow">Filtros</p>
            <h2>Segmenta el roadmap</h2>
          </div>
          <div className="filter-actions"><Link className="button secondary" href="/roadmap">Limpiar</Link><button className="button primary" type="submit">Aplicar filtros</button></div>
        </div>
        <div className="filter-grid">
          <label className="field"><span>Año</span><input name="year" type="number" min="2000" max="2100" defaultValue={year} /></label>
          <label className="field"><span>Estado</span><select name="status" defaultValue={status ?? ""}><option value="">Todos</option>{ROADMAP_STATUSES.map((item) => <option key={item} value={item}>{ROADMAP_STATUS_LABELS[item]}</option>)}</select></label>
          <label className="field"><span>Tipo de proyecto</span><select name="projectType" defaultValue={projectType ?? ""}><option value="">Todos</option>{ROADMAP_PROJECT_TYPES.map((item) => <option key={item} value={item}>{ROADMAP_PROJECT_TYPE_LABELS[item]}</option>)}</select></label>
          <label className="field"><span>Responsable</span><input name="owner" defaultValue={first(params.owner) ?? ""} /></label>
          <label className="field"><span>Marca</span><input name="brand" defaultValue={first(params.brand) ?? ""} /></label>
          <label className="field"><span>Área</span><input name="area" defaultValue={first(params.area) ?? ""} /></label>
          <label className="field"><span>Canal</span><input name="channel" defaultValue={first(params.channel) ?? ""} /></label>
          <label className="field"><span>Categoría</span><input name="category" defaultValue={first(params.category) ?? ""} /></label>
          <label className="field wide"><span>Buscar</span><input name="q" placeholder="Proyecto, código o comentario" defaultValue={first(params.q) ?? ""} /></label>
        </div>
      </form>

      <section className="roadmap-board">
        <div className="quarter-header" aria-hidden="true"><div><strong>Q1</strong><span>Ene - Mar</span></div><div><strong>Q2</strong><span>Abr - Jun</span></div><div><strong>Q3</strong><span>Jul - Sep</span></div><div><strong>Q4</strong><span>Oct - Dic</span></div></div>
        {projects.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon" aria-hidden="true">+</span>
            <h2>No hay proyectos todavía</h2>
            <p>Crea el primer proyecto para comenzar a construir el roadmap anual.</p>
            <Link className="button primary" href="/roadmap/new">Nuevo proyecto</Link>
          </div>
        ) : null}
        {projects.map((project) => {
          const insights = buildRoadmapProjectInsights(project.milestones);
          const nextMilestone = insights.nextMilestone;
          const left = clampYearPercent(project.startDate, year);
          const right = clampYearPercent(project.targetDate, year);
          const width = Math.max(1, right - left);
          const color = project.colorLabel || ROADMAP_DEFAULT_COLORS[project.trafficLight];
          const timeline = timelineMilestones(project, year, nextMilestone);
          return (
            <article className="timeline-project-row" key={project.id}>
              <div className="project-summary">
                <p className="muted project-code">{project.code}</p>
                <h3><Link href={`/roadmap/${project.id}`}>{project.name}</Link></h3>
                <div className="project-meta-line"><span>{project.ownerName || "Sin responsable"}</span><span>{ROADMAP_PROJECT_TYPE_LABELS[project.projectType]}</span><span>{project.area || "Sin área"}</span></div>
                <div className="badges">
                  <span className={`badge status-${project.status}`}>{ROADMAP_STATUS_LABELS[project.status]}</span>
                  <span className={`badge ${project.trafficLight}`}>{ROADMAP_TRAFFIC_LIGHT_LABELS[project.trafficLight]}</span>
                  <span className="badge phase">{insights.currentPhase.label}</span>
                </div>
              </div>
              <div className="timeline-content">
                <div className="row-topline">
                  <span>Progreso {insights.progressPercentage}%</span>
                  <span>{displayDate(project.startDate)} → {displayDate(project.targetDate)}</span>
                </div>
                <div className="timeline" aria-label={`Línea de tiempo de ${project.name}`}>
                  <span className="timeline-bar" style={{ left: `${left}%`, width: `${width}%`, background: color }} title={`${displayDate(project.startDate)} → ${displayDate(project.targetDate)}`} />
                  {timeline.milestones.map(({ milestone, left: milestoneLeft }) => <span key={milestone.id} className={`milestone-dot milestone-${milestone.status}`} style={{ left: `${milestoneLeft}%` }} title={`${displayMilestoneName(milestone)}: ${displayDate(milestone.plannedDate)}`} />)}
                  {timeline.visibleLabels.map(({ milestone, left: milestoneLeft }) => <span key={`${milestone.id}-label`} className={timelineLabelClass(milestoneLeft)} style={{ left: `${milestoneLeft}%` }}>{displayMilestoneName(milestone)}</span>)}
                </div>
                <div className={`next-action-card${nextMilestone && !nextMilestone.ownerName?.trim() ? " warning-card" : ""}`}>
                  <p className="eyebrow">Próximo hito</p>
                  {nextMilestone ? (
                    <div>
                      <strong>{displayMilestoneName(nextMilestone)}</strong>
                      <p className="muted">{nextMilestone.ownerName || "Sin responsable"} · {displayPlannedDate(nextMilestone.plannedDate)} · {displayMilestoneStatus(nextMilestone.status)}</p>
                    </div>
                  ) : <p className="muted">Sin acciones pendientes.</p>}
                  {timeline.secondaryMilestoneCount > 0 ? (
                    <p className="muted compact-milestone-summary">+ {timeline.secondaryMilestoneCount} hitos próximos</p>
                  ) : null}
                </div>
              </div>
              <div className="row-actions"><Link className="button small" href={`/roadmap/${project.id}`}>Ver detalle</Link></div>
            </article>
          );
        })}
      </section>
    </AppShell>
  );
}
