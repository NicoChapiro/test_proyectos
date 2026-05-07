import Link from "next/link";
import type { ReactNode } from "react";
import { searchRoadmapProjects } from "@/modules/roadmap/service";
import { ROADMAP_SEVERITY_LABELS, buildRoadmapProjectInsights, type RoadmapProjectInsights } from "@/modules/roadmap/insights";
import { ROADMAP_STATUS_LABELS } from "@/modules/roadmap/constants";
import type { RoadmapProjectWithMilestones } from "@/modules/roadmap/types";
import { displayDate, displayPlannedDate } from "@/modules/roadmap/ui/date";
import { displayApprovalStatus, displayMilestoneName, displayMilestoneStatus } from "@/modules/roadmap/ui/labels";
import { AppShell, KpiCard, PageHeader } from "@/modules/roadmap/ui/shell";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Record<string, string | string[] | undefined>;
type PageProps = { searchParams: Promise<SearchParams> };
type ProjectInsights = RoadmapProjectInsights<RoadmapProjectWithMilestones["milestones"][number]>;
type WeeklyProject = RoadmapProjectWithMilestones & { insights: ProjectInsights };
type WeeklyMilestone = RoadmapProjectWithMilestones["milestones"][number] & {
  project: WeeklyProject;
  category: string;
  tone: "red" | "amber" | "blue" | "slate";
};

type LimitedItems<T> = {
  visible: T[];
  remaining: number;
};

const WEEKLY_ITEM_LIMIT = 6;
const COMMERCIAL_LOGISTICS_CODES = new Set([
  "supply_estimated_arrival_santiago",
  "supply_quilicura_warehouse_arrival",
  "marketing_implementation_date",
  "marketing_activation_date",
]);

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function currentUtcYear(): number {
  return new Date().getUTCFullYear();
}

function validYear(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 2000 && parsed <= 2100 ? parsed : currentUtcYear();
}

function startOfUtcToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function sortByDate(firstMilestone: WeeklyMilestone, secondMilestone: WeeklyMilestone): number {
  if (firstMilestone.plannedDate && secondMilestone.plannedDate) return firstMilestone.plannedDate.getTime() - secondMilestone.plannedDate.getTime();
  if (firstMilestone.plannedDate) return -1;
  if (secondMilestone.plannedDate) return 1;
  return firstMilestone.sequence - secondMilestone.sequence || firstMilestone.name.localeCompare(secondMilestone.name, "es");
}

function withProject(project: WeeklyProject, milestone: RoadmapProjectWithMilestones["milestones"][number], category: string, tone: WeeklyMilestone["tone"]): WeeklyMilestone {
  return { ...milestone, project, category, tone };
}

function collectMilestones(projects: WeeklyProject[], select: (project: WeeklyProject) => RoadmapProjectWithMilestones["milestones"], category: string, tone: WeeklyMilestone["tone"]): WeeklyMilestone[] {
  return projects.flatMap((project) => select(project).map((milestone) => withProject(project, milestone, category, tone))).sort(sortByDate);
}

function collectPriorities(projects: WeeklyProject[]): WeeklyMilestone[] {
  const selected = new Map<string, WeeklyMilestone>();
  const append = (milestones: WeeklyMilestone[]) => {
    for (const milestone of milestones) {
      if (selected.size >= WEEKLY_ITEM_LIMIT) return;
      if (!selected.has(milestone.id)) selected.set(milestone.id, milestone);
    }
  };

  append(collectMilestones(projects, (project) => project.insights.blockedMilestones, "Bloqueado", "red"));
  append(collectMilestones(projects, (project) => project.insights.overdueMilestones, "Vencido", "red"));
  append(collectMilestones(projects, (project) => project.insights.pendingApprovalMilestones, "Aprobación", "amber"));
  append(
    collectMilestones(
      projects,
      (project) => project.insights.upcomingMilestones.filter((milestone) => !milestone.ownerName?.trim()),
      "Sin responsable",
      "amber",
    ),
  );
  append(collectMilestones(projects, (project) => project.insights.upcomingMilestones, "Próximo", "blue"));

  return [...selected.values()];
}

function limitItems<T>(items: T[]): LimitedItems<T> {
  return {
    visible: items.slice(0, WEEKLY_ITEM_LIMIT),
    remaining: Math.max(items.length - WEEKLY_ITEM_LIMIT, 0),
  };
}

function excludePriorityMilestones(milestones: WeeklyMilestone[], priorityIds: Set<string>): WeeklyMilestone[] {
  return milestones.filter((milestone) => !priorityIds.has(milestone.id));
}
function Section({ id, title, eyebrow, description, children }: { id: string; title: string; eyebrow: string; description: string; children: ReactNode }) {
  return (
    <section className="panel weekly-section" id={id}>
      <div className="section-title compact">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <p className="weekly-section-description">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="weekly-empty">{message}</p>;
}

function MoreFooter({ remaining }: { remaining: number }) {
  return remaining > 0 ? <p className="weekly-more">+ {remaining} más</p> : null;
}

function PriorityList({ milestones }: { milestones: WeeklyMilestone[] }) {
  if (milestones.length === 0) return <EmptyState message="No hay acciones urgentes para esta semana." />;

  return (
    <div className="weekly-priority-grid">
      {milestones.map((milestone) => (
        <article className="weekly-priority-card" key={`${milestone.category}-${milestone.id}`}>
          <div className="weekly-card-topline">
            <span className={`badge weekly-${milestone.tone}`}>{milestone.category}</span>
          </div>
          <h3>{milestone.project.name}</h3>
          <p className="weekly-milestone-name">{displayMilestoneName(milestone)}</p>
          <dl className="weekly-metadata">
            <div><dt>Responsable</dt><dd>{milestone.ownerName || "Sin responsable"}</dd></div>
            <div><dt>Fecha</dt><dd>{displayPlannedDate(milestone.plannedDate)}</dd></div>
            <div><dt>Estado</dt><dd>{displayMilestoneStatus(milestone.status)}</dd></div>
            <div><dt>Aprobación</dt><dd>{displayApprovalStatus(milestone.approvalStatus)}</dd></div>
          </dl>
          <Link className="text-button" href={`/roadmap/${milestone.project.id}`}>Ver proyecto</Link>
        </article>
      ))}
    </div>
  );
}

function CompactMilestoneList({ items, emptyMessage }: { items: LimitedItems<WeeklyMilestone>; emptyMessage: string }) {
  if (items.visible.length === 0) return <EmptyState message={emptyMessage} />;

  return (
    <>
      <div className="weekly-compact-list">
        {items.visible.map((milestone) => (
          <article className="weekly-compact-row" key={`${milestone.category}-${milestone.id}`}>
            <div className="weekly-compact-main">
              <span className={`badge weekly-${milestone.tone}`}>{milestone.category}</span>
              <div>
                <h3>{milestone.project.name}</h3>
                <p>{displayMilestoneName(milestone)}</p>
              </div>
            </div>
            <div className="weekly-compact-meta">
              <span>{milestone.ownerName || "Sin responsable"}</span>
              <span>{displayPlannedDate(milestone.plannedDate)}</span>
              <span>{displayMilestoneStatus(milestone.status)}</span>
              <Link className="text-button" href={`/roadmap/${milestone.project.id}`}>Ver proyecto</Link>
            </div>
          </article>
        ))}
      </div>
      <MoreFooter remaining={items.remaining} />
    </>
  );
}

function CompactProjectList({ items }: { items: LimitedItems<WeeklyProject> }) {
  if (items.visible.length === 0) return <EmptyState message="Sin proyectos críticos." />;

  return (
    <>
      <div className="weekly-compact-list">
        {items.visible.map((project) => (
          <article className="weekly-compact-row" key={project.id}>
            <div className="weekly-compact-main">
              <span className={`badge severity-${project.insights.severity}`}>{ROADMAP_SEVERITY_LABELS[project.insights.severity]}</span>
              <div>
                <h3>{project.name}</h3>
                <p>{project.insights.nextMilestone ? displayMilestoneName(project.insights.nextMilestone) : "Sin próximos hitos"}</p>
              </div>
            </div>
            <div className="weekly-compact-meta">
              <span>{ROADMAP_STATUS_LABELS[project.status]}</span>
              <span>{project.ownerName || "Sin responsable"}</span>
              <span>{project.insights.currentPhase.label}</span>
              <Link className="text-button" href={`/roadmap/${project.id}`}>Ver proyecto</Link>
            </div>
          </article>
        ))}
      </div>
      <MoreFooter remaining={items.remaining} />
    </>
  );
}

export default async function WeeklyRoadmapPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const year = validYear(first(params.year));
  const today = startOfUtcToday();
  const projects = await searchRoadmapProjects({ year });
  const weeklyProjects: WeeklyProject[] = projects.map((project) => ({
    ...project,
    insights: buildRoadmapProjectInsights(project.milestones, today),
  }));

  const criticalProjects = weeklyProjects.filter((project) => project.insights.severity === "critical");
  const warningProjects = weeklyProjects.filter((project) => project.insights.severity === "warning");
  const blockedMilestones = collectMilestones(weeklyProjects, (project) => project.insights.blockedMilestones, "Bloqueado", "red");
  const overdueMilestones = collectMilestones(weeklyProjects, (project) => project.insights.overdueMilestones, "Vencido", "red");
  const upcomingMilestones = collectMilestones(weeklyProjects, (project) => project.insights.upcomingMilestones, "Próximo", "blue");
  const milestonesWithoutOwner = collectMilestones(weeklyProjects, (project) => project.insights.milestonesWithoutOwner, "Sin responsable", "amber");
  const pendingApprovalMilestones = collectMilestones(weeklyProjects, (project) => project.insights.pendingApprovalMilestones, "Aprobación", "amber");
  const upcomingCampaignMilestones = collectMilestones(weeklyProjects, (project) => project.insights.upcomingMilestones.filter((milestone) => milestone.track === "marketing"), "Campaña", "blue");
  const upcomingLogisticsMilestones = collectMilestones(weeklyProjects, (project) => project.insights.upcomingMilestones.filter((milestone) => milestone.track === "supply"), "Logística", "slate");
  const commercialLogisticsMilestones: WeeklyMilestone[] = upcomingMilestones
    .filter((milestone) => milestone.milestoneCode && COMMERCIAL_LOGISTICS_CODES.has(milestone.milestoneCode))
    .map((milestone) => ({
      ...milestone,
      category: milestone.track === "marketing" ? "Comercial" : "Logística",
      tone: milestone.track === "marketing" ? "blue" : "slate",
    }));
  const weeklyPriorities = collectPriorities(weeklyProjects);
  const priorityMilestoneIds = new Set(weeklyPriorities.map((milestone) => milestone.id));

  return (
    <AppShell active="reports">
      <PageHeader
        eyebrow="REPORTES"
        title="Control semanal"
        subtitle={`Dashboard operativo para revisar proyectos e hitos que requieren seguimiento esta semana. Semana desde ${displayDate(today)}.`}
        actions={<Link className="button secondary" href="/roadmap">Volver al roadmap</Link>}
      />

      <form className="panel filter-panel weekly-filter">
        <div className="filter-heading">
          <div>
            <p className="eyebrow">Filtro simple</p>
            <h2>Revisar año</h2>
          </div>
          <div className="filter-actions">
            <Link className="button secondary" href="/roadmap/weekly">Año actual</Link>
            <button className="button primary" type="submit">Aplicar</button>
          </div>
        </div>
        <div className="filter-grid weekly-filter-grid">
          <label className="field"><span>Año</span><input name="year" type="number" min="2000" max="2100" defaultValue={year} /></label>
        </div>
      </form>

      <section className="kpi-grid weekly-kpis" aria-label="Indicadores del control semanal">
        <KpiCard label="Proyectos críticos" value={criticalProjects.length} tone={criticalProjects.length > 0 ? "red" : "green"} detail={`${warningProjects.length} proyectos en atención`} />
        <KpiCard label="Hitos vencidos" value={overdueMilestones.length} tone={overdueMilestones.length > 0 ? "red" : "green"} detail="Antes de hoy" />
        <KpiCard label="Próximos 7 días" value={upcomingMilestones.length} tone="blue" detail={`${upcomingCampaignMilestones.length} campaña · ${upcomingLogisticsMilestones.length} logística`} />
        <KpiCard label="Sin responsable" value={milestonesWithoutOwner.length} tone={milestonesWithoutOwner.length > 0 ? "amber" : "green"} detail="Hitos pendientes" />
        <KpiCard label="Aprobaciones pendientes" value={pendingApprovalMilestones.length} tone={pendingApprovalMilestones.length > 0 ? "amber" : "green"} detail="Requieren decisión" />
        <KpiCard label="Bloqueados" value={blockedMilestones.length} tone={blockedMilestones.length > 0 ? "red" : "green"} detail="Con impedimentos" />
      </section>

      <Section
        id="prioridades"
        eyebrow="Reunión semanal"
        title="Prioridades de la semana"
        description="Acciones que requieren revisión inmediata por bloqueo, vencimiento, aprobación o falta de responsable."
      >
        <PriorityList milestones={weeklyPriorities} />
      </Section>

      <div className="weekly-dashboard-grid">
        <Section id="vencidos" eyebrow="Seguimiento" title="Hitos vencidos" description="Hitos con fecha planificada anterior a hoy y aún no completados.">
          <CompactMilestoneList items={limitItems(excludePriorityMilestones(overdueMilestones, priorityMilestoneIds))} emptyMessage="Sin hitos vencidos." />
        </Section>
        <Section id="proximos" eyebrow="Planificación" title="Próximos 7 días" description="Hitos programados para esta semana.">
          <CompactMilestoneList items={limitItems(excludePriorityMilestones(upcomingMilestones, priorityMilestoneIds))} emptyMessage="Sin hitos en los próximos 7 días." />
        </Section>
        <Section id="sin-responsable" eyebrow="Responsables" title="Sin responsable" description="Hitos pendientes que necesitan asignación.">
          <CompactMilestoneList items={limitItems(excludePriorityMilestones(milestonesWithoutOwner, priorityMilestoneIds))} emptyMessage="Todos los hitos pendientes tienen responsable." />
        </Section>
        <Section id="aprobaciones" eyebrow="Decisiones" title="Aprobaciones pendientes" description="Decisiones pendientes que pueden bloquear avance.">
          <CompactMilestoneList items={limitItems(excludePriorityMilestones(pendingApprovalMilestones, priorityMilestoneIds))} emptyMessage="Sin aprobaciones pendientes." />
        </Section>
        <Section id="bloqueados" eyebrow="Impedimentos" title="Bloqueados" description="Hitos marcados como bloqueados.">
          <CompactMilestoneList items={limitItems(excludePriorityMilestones(blockedMilestones, priorityMilestoneIds))} emptyMessage="Sin hitos bloqueados." />
        </Section>
        <Section id="fechas-comerciales" eyebrow="Marketing y logística" title="Fechas comerciales y logísticas" description="Llegadas, activaciones y fechas comerciales próximas.">
          <CompactMilestoneList items={limitItems(excludePriorityMilestones(commercialLogisticsMilestones, priorityMilestoneIds))} emptyMessage="Sin fechas comerciales o logísticas próximas." />
        </Section>
        <Section id="criticos" eyebrow="Riesgo operacional" title="Proyectos críticos" description="Proyectos con bloqueos o hitos vencidos.">
          <CompactProjectList items={limitItems(criticalProjects)} />
        </Section>
      </div>
    </AppShell>
  );
}
