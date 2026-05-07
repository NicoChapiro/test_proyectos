import type { ReactNode } from "react";
import Link from "next/link";
import { ROADMAP_DEFAULT_COLORS, ROADMAP_PROJECT_TYPE_LABELS, ROADMAP_PROJECT_TYPES, ROADMAP_STATUSES, ROADMAP_STATUS_LABELS } from "@/modules/roadmap/constants";
import { buildRoadmapProjectInsights } from "@/modules/roadmap/insights";
import { searchRoadmapProjects } from "@/modules/roadmap/service";
import { clampYearPercent, displayDate, displayPlannedDate } from "@/modules/roadmap/ui/date";
import { displayMilestoneName, displayMilestoneStatus } from "@/modules/roadmap/ui/labels";
import type { RoadmapProjectTypeValue, RoadmapStatusValue } from "@/modules/roadmap/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function WarningBadge({ children }: { children: ReactNode }) {
  return <span className="badge warning">{children}</span>;
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

  return (
    <main className="page-shell">
      <div className="topbar">
        <div>
          <p className="eyebrow">Roadmap de Marketing</p>
          <h1>Roadmap anual {year}</h1>
          <p className="muted">Vista transversal para proyectos de Marketing, por Q1, Q2, Q3 y Q4 con hitos clave.</p>
        </div>
        <Link className="button primary" href="/roadmap/new">Nuevo proyecto</Link>
      </div>

      <form className="panel filters">
        <label className="field"><span>Año</span><input name="year" type="number" min="2000" max="2100" defaultValue={year} /></label>
        <label className="field"><span>Estado</span><select name="status" defaultValue={status ?? ""}><option value="">Todos</option>{ROADMAP_STATUSES.map((item) => <option key={item} value={item}>{ROADMAP_STATUS_LABELS[item]}</option>)}</select></label>
        <label className="field"><span>Tipo de proyecto</span><select name="projectType" defaultValue={projectType ?? ""}><option value="">Todos</option>{ROADMAP_PROJECT_TYPES.map((item) => <option key={item} value={item}>{ROADMAP_PROJECT_TYPE_LABELS[item]}</option>)}</select></label>
        <label className="field"><span>Responsable</span><input name="owner" defaultValue={first(params.owner) ?? ""} /></label>
        <label className="field"><span>Marca</span><input name="brand" defaultValue={first(params.brand) ?? ""} /></label>
        <label className="field"><span>Área</span><input name="area" defaultValue={first(params.area) ?? ""} /></label>
        <label className="field"><span>Canal</span><input name="channel" defaultValue={first(params.channel) ?? ""} /></label>
        <label className="field"><span>Categoría</span><input name="category" defaultValue={first(params.category) ?? ""} /></label>
        <label className="field"><span>Buscar</span><input name="q" defaultValue={first(params.q) ?? ""} /></label>
        <div className="actions full"><button className="button" type="submit">Aplicar filtros</button><Link className="button" href="/roadmap">Limpiar</Link></div>
      </form>

      <section className="roadmap-board" style={{ marginTop: 18 }}>
        <div className="quarter-header"><div>Q1</div><div>Q2</div><div>Q3</div><div>Q4</div></div>
        {projects.length === 0 ? <div className="panel muted">No hay proyectos para los filtros seleccionados.</div> : null}
        {projects.map((project) => {
          const insights = buildRoadmapProjectInsights(project.milestones);
          const nextMilestone = insights.nextMilestone;
          const left = clampYearPercent(project.startDate, year);
          const right = clampYearPercent(project.targetDate, year);
          const width = Math.max(1, right - left);
          const color = project.colorLabel || ROADMAP_DEFAULT_COLORS[project.trafficLight];
          return (
            <article className="project-row" key={project.id}>
              <div className="project-meta">
                <h3><Link href={`/roadmap/${project.id}`}>{project.name}</Link></h3>
                <p className="muted">{project.code}</p>
                <div className="badges">
                  <span className={`badge ${project.trafficLight}`}>{project.trafficLight}</span>
                  <span className="badge">{ROADMAP_STATUS_LABELS[project.status]}</span>
                  <span className="badge">{ROADMAP_PROJECT_TYPE_LABELS[project.projectType]}</span>
                  <span className="badge phase">Fase: {insights.currentPhase.label}</span>
                  {insights.overdueMilestones.length > 0 ? <WarningBadge>{insights.overdueMilestones.length} vencidos</WarningBadge> : null}
                  {insights.blockedMilestones.length > 0 ? <WarningBadge>{insights.blockedMilestones.length} bloqueados</WarningBadge> : null}
                  {nextMilestone && !nextMilestone.ownerName?.trim() ? <WarningBadge>Próxima acción sin responsable</WarningBadge> : null}
                  {project.packagingRequest ? <span className="badge">Solicitud Packaging</span> : null}
                </div>
              </div>
              <div>
                <div className="timeline" aria-label={`Línea de tiempo de ${project.name}`}>
                  <div className="timeline-bar" style={{ left: `${left}%`, width: `${width}%`, background: color }} title={`${displayDate(project.startDate)} → ${displayDate(project.targetDate)}`} />
                  {project.milestones.filter((milestone) => milestone.plannedDate).map((milestone) => <span key={milestone.id} className="milestone-dot" style={{ left: `calc(${clampYearPercent(milestone.plannedDate!, year)}% - 6px)` }} title={`${displayMilestoneName(milestone)}: ${displayDate(milestone.plannedDate)}`} />)}
                </div>
                <div className={`next-action-card${nextMilestone && !nextMilestone.ownerName?.trim() ? " warning-card" : ""}`}>
                  <p className="eyebrow">Próxima acción</p>
                  {nextMilestone ? (
                    <div>
                      <strong>{displayMilestoneName(nextMilestone)}</strong>
                      <p className="muted">Responsable: {nextMilestone.ownerName || "Sin responsable"}</p>
                      <p className="muted">Planificada: {displayPlannedDate(nextMilestone.plannedDate)} · Estado: {displayMilestoneStatus(nextMilestone.status)}</p>
                    </div>
                  ) : <p className="muted">Sin acciones pendientes.</p>}
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
