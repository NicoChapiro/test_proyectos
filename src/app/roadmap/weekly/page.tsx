import Link from "next/link";
import type { ReactNode } from "react";
import { searchRoadmapProjects } from "@/modules/roadmap/service";
import {
  ROADMAP_PHASE_BY_MILESTONE_CODE,
  ROADMAP_PHASE_LABELS,
  ROADMAP_SEVERITY_LABELS,
  buildRoadmapProjectInsights,
  type RoadmapProjectInsights,
} from "@/modules/roadmap/insights";
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

function milestonePhaseLabel(milestone: WeeklyMilestone): string | null {
  if (!milestone.milestoneCode) return null;
  const phaseKey = ROADMAP_PHASE_BY_MILESTONE_CODE[milestone.milestoneCode];
  return phaseKey ? ROADMAP_PHASE_LABELS[phaseKey] : null;
}

function withProject(project: WeeklyProject, milestone: RoadmapProjectWithMilestones["milestones"][number], category: string, tone: WeeklyMilestone["tone"]): WeeklyMilestone {
  return { ...milestone, project, category, tone };
}

function collectMilestones(projects: WeeklyProject[], select: (project: WeeklyProject) => RoadmapProjectWithMilestones["milestones"]): WeeklyMilestone[] {
  return projects.flatMap((project) => select(project).map((milestone) => withProject(project, milestone, "Seguimiento", "slate"))).sort(sortByDate);
}

function collectPriorities(projects: WeeklyProject[]): WeeklyMilestone[] {
  const selected = new Map<string, WeeklyMilestone>();
  const append = (project: WeeklyProject, milestones: RoadmapProjectWithMilestones["milestones"], category: string, tone: WeeklyMilestone["tone"]) => {
    for (const milestone of milestones) {
      if (!selected.has(milestone.id)) selected.set(milestone.id, withProject(project, milestone, category, tone));
    }
  };

  for (const project of projects) append(project, project.insights.blockedMilestones, "Bloqueado", "red");
  for (const project of projects) append(project, project.insights.overdueMilestones, "Vencido", "red");
  for (const project of projects) append(project, project.insights.pendingApprovalMilestones, "Aprobación", "amber");
  for (const project of projects) {
    append(
      project,
      project.insights.upcomingMilestones.filter((milestone) => !milestone.ownerName?.trim()),
      "Sin responsable",
      "amber",
    );
  }

  return [...selected.values()].sort(sortByDate);
}


function Section({ id, title, eyebrow, children }: { id: string; title: string; eyebrow: string; children: ReactNode }) {
  return (
    <section className="panel weekly-section" id={id}>
      <div className="section-title compact">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="weekly-empty">{message}</p>;
}

function MilestoneList({ milestones, emptyMessage }: { milestones: WeeklyMilestone[]; emptyMessage: string }) {
  if (milestones.length === 0) return <EmptyState message={emptyMessage} />;

  return (
    <div className="weekly-card-grid">
      {milestones.map((milestone) => {
        const phaseLabel = milestonePhaseLabel(milestone);
        return (
          <article className="weekly-item-card" key={`${milestone.category}-${milestone.id}`}>
            <div className="weekly-card-topline">
              <span className={`badge weekly-${milestone.tone}`}>{milestone.category}</span>
              {phaseLabel ? <span className="badge phase">{phaseLabel}</span> : null}
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
        );
      })}
    </div>
  );
}

function CriticalProjects({ projects }: { projects: WeeklyProject[] }) {
  if (projects.length === 0) return <EmptyState message="Sin proyectos críticos." />;

  return (
    <div className="weekly-card-grid compact-projects">
      {projects.map((project) => (
        <article className="weekly-item-card" key={project.id}>
          <div className="weekly-card-topline">
            <span className={`badge severity-${project.insights.severity}`}>{ROADMAP_SEVERITY_LABELS[project.insights.severity]}</span>
            <span className="badge phase">{project.insights.currentPhase.label}</span>
          </div>
          <h3>{project.name}</h3>
          <p className="weekly-milestone-name">
            {project.insights.nextMilestone ? displayMilestoneName(project.insights.nextMilestone) : "Sin próximos hitos"}
          </p>
          <dl className="weekly-metadata">
            <div><dt>Estado</dt><dd>{ROADMAP_STATUS_LABELS[project.status]}</dd></div>
            <div><dt>Responsable</dt><dd>{project.ownerName || "Sin responsable"}</dd></div>
            <div><dt>Hitos vencidos</dt><dd>{project.insights.overdueMilestones.length}</dd></div>
            <div><dt>Bloqueados</dt><dd>{project.insights.blockedMilestones.length}</dd></div>
          </dl>
          <Link className="text-button" href={`/roadmap/${project.id}`}>Ver proyecto</Link>
        </article>
      ))}
    </div>
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
  const blockedMilestones = weeklyProjects.flatMap((project) => project.insights.blockedMilestones.map((milestone) => withProject(project, milestone, "Bloqueado", "red"))).sort(sortByDate);
  const overdueMilestones = weeklyProjects.flatMap((project) => project.insights.overdueMilestones.map((milestone) => withProject(project, milestone, "Vencido", "red"))).sort(sortByDate);
  const upcomingMilestones = weeklyProjects.flatMap((project) => project.insights.upcomingMilestones.map((milestone) => withProject(project, milestone, "Próximo", "blue"))).sort(sortByDate);
  const milestonesWithoutOwner = weeklyProjects.flatMap((project) => project.insights.milestonesWithoutOwner.map((milestone) => withProject(project, milestone, "Sin responsable", "amber"))).sort(sortByDate);
  const pendingApprovalMilestones = weeklyProjects.flatMap((project) => project.insights.pendingApprovalMilestones.map((milestone) => withProject(project, milestone, "Aprobación", "amber"))).sort(sortByDate);
  const upcomingCampaignMilestones = collectMilestones(weeklyProjects, (project) => project.insights.upcomingMilestones.filter((milestone) => milestone.track === "marketing"));
  const upcomingLogisticsMilestones = collectMilestones(weeklyProjects, (project) => project.insights.upcomingMilestones.filter((milestone) => milestone.track === "supply"));
  const commercialLogisticsMilestones = upcomingMilestones.filter((milestone) => milestone.milestoneCode && COMMERCIAL_LOGISTICS_CODES.has(milestone.milestoneCode));
  const weeklyPriorities = collectPriorities(weeklyProjects);

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

      <Section id="prioridades" eyebrow="Reunión semanal" title="Prioridades de la semana">
        <MilestoneList milestones={weeklyPriorities} emptyMessage="No hay acciones urgentes para esta semana." />
      </Section>

      <div className="weekly-dashboard-grid">
        <Section id="vencidos" eyebrow="Seguimiento" title="Hitos vencidos">
          <MilestoneList milestones={overdueMilestones} emptyMessage="Sin hitos vencidos." />
        </Section>
        <Section id="proximos" eyebrow="Planificación" title="Próximos 7 días">
          <MilestoneList milestones={upcomingMilestones} emptyMessage="Sin hitos en los próximos 7 días." />
        </Section>
        <Section id="sin-responsable" eyebrow="Responsables" title="Sin responsable">
          <MilestoneList milestones={milestonesWithoutOwner} emptyMessage="Todos los hitos pendientes tienen responsable." />
        </Section>
        <Section id="aprobaciones" eyebrow="Decisiones" title="Aprobaciones pendientes">
          <MilestoneList milestones={pendingApprovalMilestones} emptyMessage="Sin aprobaciones pendientes." />
        </Section>
      </div>

      <Section id="fechas-comerciales" eyebrow="Marketing y logística" title="Fechas comerciales y logísticas">
        <MilestoneList milestones={commercialLogisticsMilestones} emptyMessage="Sin fechas comerciales o logísticas próximas." />
      </Section>

      <Section id="criticos" eyebrow="Riesgo operacional" title="Proyectos críticos">
        <CriticalProjects projects={criticalProjects} />
      </Section>
    </AppShell>
  );
}
