import Link from "next/link";
import { updateRoadmapProjectFromTableAction } from "../actions";
import {
  ROADMAP_PRIORITIES,
  ROADMAP_PRIORITY_LABELS,
  ROADMAP_PROJECT_TYPE_LABELS,
  ROADMAP_PROJECT_TYPES,
  ROADMAP_STATUSES,
  ROADMAP_STATUS_LABELS,
  ROADMAP_TRAFFIC_LIGHT_LABELS,
  ROADMAP_TRAFFIC_LIGHTS,
} from "@/modules/roadmap/constants";
import {
  buildRoadmapProjectInsights,
  ROADMAP_SEVERITY_LABELS,
} from "@/modules/roadmap/insights";
import { searchRoadmapProjects } from "@/modules/roadmap/service";
import { displayDate, displayPlannedDate, inputDate } from "@/modules/roadmap/ui/date";
import { displayMilestoneName, displayMilestoneStatus } from "@/modules/roadmap/ui/labels";
import { AppShell, KpiCard, PageHeader } from "@/modules/roadmap/ui/shell";
import type {
  RoadmapPriorityValue,
  RoadmapProjectTypeValue,
  RoadmapStatusValue,
  RoadmapTrafficLightValue,
} from "@/modules/roadmap/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type Project = Awaited<ReturnType<typeof searchRoadmapProjects>>[number];
type ProjectWithInsights = Project & {
  insights: ReturnType<typeof buildRoadmapProjectInsights<Project["milestones"][number]>>;
};

type FilterKey = "year" | "status" | "type" | "area" | "owner" | "brand" | "channel" | "q";

const FILTER_KEYS: FilterKey[] = ["year", "status", "type", "area", "owner", "brand", "channel", "q"];

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

function filterValue(params: Record<string, string | string[] | undefined>, key: FilterKey): string {
  return first(params[key]) ?? "";
}

function returnToUrl(params: Record<string, string | string[] | undefined>): string {
  const query = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = filterValue(params, key).trim();
    if (value) query.set(key, value);
  }
  const serialized = query.toString();
  return serialized ? `/roadmap/projects?${serialized}` : "/roadmap/projects";
}

function selectOptions<T extends readonly string[]>(values: T, labels: Record<T[number], string>) {
  return values.map((value: T[number]) => (
    <option key={value} value={value}>
      {labels[value]}
    </option>
  ));
}

function projectRiskDetail(project: ProjectWithInsights): string {
  const items = [
    project.insights.blockedMilestones.length > 0 ? `${project.insights.blockedMilestones.length} bloqueado(s)` : null,
    project.insights.overdueMilestones.length > 0 ? `${project.insights.overdueMilestones.length} vencido(s)` : null,
    project.insights.pendingApprovalCount > 0 ? `${project.insights.pendingApprovalCount} aprobación(es)` : null,
  ].filter(Boolean);
  return items.length > 0 ? items.join(" · ") : "Sin alertas operativas";
}

function TableSelect<T extends readonly string[]>({
  formId,
  name,
  value,
  values,
  labels,
  ariaLabel,
}: {
  formId: string;
  name: string;
  value: T[number];
  values: T;
  labels: Record<T[number], string>;
  ariaLabel: string;
}) {
  return (
    <select className="project-table-input" form={formId} name={name} defaultValue={value} aria-label={ariaLabel}>
      {selectOptions(values, labels)}
    </select>
  );
}

function HiddenProjectFields({ project }: { project: Project }) {
  return (
    <>
      <input type="hidden" name="name" value={project.name} />
      <input type="hidden" name="description" value={project.description ?? ""} />
      <input type="hidden" name="category" value={project.category ?? ""} />
      <input type="hidden" name="completedAt" value={inputDate(project.completedAt)} />
      <input type="hidden" name="sourceType" value={project.sourceType ?? ""} />
      <input type="hidden" name="sourcePackagingId" value={project.sourcePackagingId ?? ""} />
      <input type="hidden" name="sharepointUrl" value={project.sharepointUrl ?? project.sharepointFolderUrl ?? ""} />
      <input type="hidden" name="colorLabel" value={project.colorLabel ?? ""} />
    </>
  );
}

function ProjectRow({ project, returnTo }: { project: ProjectWithInsights; returnTo: string }) {
  const formId = `project-table-${project.id}`;
  const nextMilestone = project.insights.nextMilestone;
  const action = updateRoadmapProjectFromTableAction.bind(null, project.id, returnTo);

  return (
    <tr>
      <td className="project-table-project-cell">
        <span className="admin-code">{project.code}</span>
        <strong>{project.name}</strong>
        <div className="project-table-display-badges">
          <span className={`badge status-${project.status}`}>{ROADMAP_STATUS_LABELS[project.status]}</span>
          <span className={`badge severity-${project.insights.severity}`}>{ROADMAP_SEVERITY_LABELS[project.insights.severity]}</span>
        </div>
      </td>
      <td>
        <TableSelect formId={formId} name="status" value={project.status as RoadmapStatusValue} values={ROADMAP_STATUSES} labels={ROADMAP_STATUS_LABELS} ariaLabel={`Estado de ${project.name}`} />
      </td>
      <td>
        <TableSelect formId={formId} name="priority" value={project.priority as RoadmapPriorityValue} values={ROADMAP_PRIORITIES} labels={ROADMAP_PRIORITY_LABELS} ariaLabel={`Prioridad de ${project.name}`} />
      </td>
      <td>
        <TableSelect formId={formId} name="trafficLight" value={project.trafficLight as RoadmapTrafficLightValue} values={ROADMAP_TRAFFIC_LIGHTS} labels={ROADMAP_TRAFFIC_LIGHT_LABELS} ariaLabel={`Semáforo de ${project.name}`} />
      </td>
      <td>
        <input className="project-table-input" form={formId} name="ownerName" defaultValue={project.ownerName} aria-label={`Responsable de ${project.name}`} />
      </td>
      <td>
        <input className="project-table-input" form={formId} name="area" defaultValue={project.area ?? ""} aria-label={`Área de ${project.name}`} />
      </td>
      <td>
        <TableSelect formId={formId} name="projectType" value={project.projectType as RoadmapProjectTypeValue} values={ROADMAP_PROJECT_TYPES} labels={ROADMAP_PROJECT_TYPE_LABELS} ariaLabel={`Tipo de ${project.name}`} />
      </td>
      <td>
        <input className="project-table-input" form={formId} name="channel" defaultValue={project.channel ?? ""} aria-label={`Canal de ${project.name}`} />
      </td>
      <td>
        <input className="project-table-input" form={formId} name="brand" defaultValue={project.brand ?? ""} aria-label={`Marca de ${project.name}`} />
      </td>
      <td>
        <input className="project-table-input date" form={formId} name="startDate" type="date" defaultValue={inputDate(project.startDate)} aria-label={`Inicio de ${project.name}`} />
        <small>{displayDate(project.startDate)}</small>
      </td>
      <td>
        <input className="project-table-input date" form={formId} name="targetDate" type="date" defaultValue={inputDate(project.targetDate)} aria-label={`Fecha objetivo de ${project.name}`} />
        <small>{displayDate(project.targetDate)}</small>
      </td>
      <td>
        <span className={`badge severity-${project.insights.severity}`}>{ROADMAP_SEVERITY_LABELS[project.insights.severity]}</span>
        <small>{projectRiskDetail(project)}</small>
      </td>
      <td className="project-table-next-cell">
        <strong>{nextMilestone ? displayMilestoneName(nextMilestone) : "Sin próximos hitos"}</strong>
        <small>
          {nextMilestone
            ? `${displayPlannedDate(nextMilestone.plannedDate)} · ${displayMilestoneStatus(nextMilestone.status)}`
            : "Sin fecha"}
        </small>
      </td>
      <td>
        <form id={formId} className="project-row-actions" action={action}>
          <HiddenProjectFields project={project} />
          <button className="button primary small" type="submit">Guardar</button>
          <Link className="text-button" href={`/roadmap/${project.id}`}>Ver detalle</Link>
        </form>
      </td>
    </tr>
  );
}

export default async function RoadmapProjectsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const year = validYear(first(params.year));
  const status = first(params.status) as RoadmapStatusValue | undefined;
  const projectType = (first(params.type) || first(params.projectType)) as RoadmapProjectTypeValue | undefined;
  const today = new Date();
  const projects = await searchRoadmapProjects({
    year,
    status: status || undefined,
    projectType: projectType || undefined,
    area: first(params.area),
    owner: first(params.owner),
    brand: first(params.brand),
    channel: first(params.channel),
    q: first(params.q),
  });
  const projectsWithInsights: ProjectWithInsights[] = projects.map((project) => ({
    ...project,
    insights: buildRoadmapProjectInsights(project.milestones, today),
  }));
  const currentYear = currentUtcYear();
  const returnTo = returnToUrl({ ...params, year: String(year), type: projectType });
  const inProgress = projectsWithInsights.filter((project) => project.status === "en_curso").length;
  const atRisk = projectsWithInsights.filter((project) => project.status === "en_riesgo" || project.insights.severity !== "ok").length;
  const blocked = projectsWithInsights.filter((project) => project.status === "bloqueado" || project.insights.blockedMilestones.length > 0).length;
  const withoutOwner = projectsWithInsights.filter((project) => !project.ownerName?.trim()).length;
  const pendingApprovals = projectsWithInsights.reduce((total, project) => total + project.insights.pendingApprovalCount, 0);

  return (
    <AppShell active="projects">
      <PageHeader
        eyebrow="PROYECTOS"
        title="Tabla de proyectos"
        subtitle="Actualiza campos clave, responsables, estados y fechas sin perder la vista general."
        actions={
          <>
            <Link className="button secondary" href="/roadmap/areas">Vista por área</Link>
            <Link className="button primary" href="/roadmap/new">Nuevo proyecto</Link>
          </>
        }
      />

      <section className="kpi-grid project-table-kpis" aria-label="Indicadores de proyectos">
        <KpiCard label="Total proyectos" value={projectsWithInsights.length} tone="blue" detail="En filtros activos" />
        <KpiCard label="En curso" value={inProgress} tone="green" detail="Avanzando" />
        <KpiCard label="Con riesgo" value={atRisk} tone={atRisk > 0 ? "amber" : "green"} detail="Estado o hitos" />
        <KpiCard label="Bloqueados" value={blocked} tone={blocked > 0 ? "red" : "green"} detail="Con impedimentos" />
        <KpiCard label="Sin responsable" value={withoutOwner} tone={withoutOwner > 0 ? "amber" : "green"} detail="Proyecto sin dueño" />
        <KpiCard label="Aprobaciones pendientes" value={pendingApprovals} tone={pendingApprovals > 0 ? "amber" : "green"} detail="Hitos por decidir" />
      </section>

      <form className="panel filter-panel project-table-filter">
        <div className="filter-heading">
          <div>
            <p className="eyebrow">Filtros</p>
            <h2>Filtrar proyectos</h2>
            <p className="muted filter-description">Segmenta la tabla sin salir de la administración rápida.</p>
          </div>
          <div className="filter-actions">
            <Link className="button secondary" href={`/roadmap/projects?year=${currentYear}`}>Año actual</Link>
            <Link className="button secondary" href="/roadmap/projects">Limpiar</Link>
            <button className="button primary" type="submit">Aplicar</button>
          </div>
        </div>
        <div className="filter-grid project-table-filter-grid">
          <label className="field">
            <span>Año</span>
            <input name="year" type="number" min="2000" max="2100" defaultValue={year} />
          </label>
          <label className="field">
            <span>Estado</span>
            <select name="status" defaultValue={status ?? ""}>
              <option value="">Todos</option>
              {selectOptions(ROADMAP_STATUSES, ROADMAP_STATUS_LABELS)}
            </select>
          </label>
          <label className="field">
            <span>Tipo de proyecto</span>
            <select name="type" defaultValue={projectType ?? ""}>
              <option value="">Todos</option>
              {selectOptions(ROADMAP_PROJECT_TYPES, ROADMAP_PROJECT_TYPE_LABELS)}
            </select>
          </label>
          <label className="field">
            <span>Área</span>
            <input name="area" defaultValue={filterValue(params, "area")} />
          </label>
          <label className="field">
            <span>Responsable</span>
            <input name="owner" defaultValue={filterValue(params, "owner")} />
          </label>
          <label className="field">
            <span>Marca</span>
            <input name="brand" defaultValue={filterValue(params, "brand")} />
          </label>
          <label className="field">
            <span>Canal</span>
            <input name="channel" defaultValue={filterValue(params, "channel")} />
          </label>
          <label className="field">
            <span>Buscar</span>
            <input name="q" placeholder="Código, proyecto o descripción" defaultValue={filterValue(params, "q")} />
          </label>
        </div>
      </form>

      <section className="panel project-table-panel" aria-labelledby="project-table-title">
        <div className="project-table-heading">
          <div>
            <p className="eyebrow">Administración rápida</p>
            <h2 id="project-table-title">Campos editables por fila</h2>
            <p className="muted">Los cambios se guardan por fila. Para editar hitos o documentación, entra al detalle del proyecto.</p>
          </div>
        </div>

        {projectsWithInsights.length === 0 ? (
          <div className="empty-state project-table-empty">
            <span className="empty-icon" aria-hidden="true">⌕</span>
            <h2>No hay proyectos para los filtros seleccionados.</h2>
            <div className="actions">
              <Link className="button secondary" href="/roadmap/projects">Limpiar filtros</Link>
              <Link className="button primary" href="/roadmap/new">Nuevo proyecto</Link>
            </div>
          </div>
        ) : (
          <div className="table-wrap project-table-wrap">
            <table className="project-admin-table">
              <thead>
                <tr>
                  <th>Proyecto</th>
                  <th>Estado</th>
                  <th>Prioridad</th>
                  <th>Semáforo</th>
                  <th>Responsable(s)</th>
                  <th>Área</th>
                  <th>Tipo</th>
                  <th>Canal</th>
                  <th>Marca</th>
                  <th>Inicio</th>
                  <th>Fecha objetivo</th>
                  <th>Riesgo</th>
                  <th>Próximo hito</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {projectsWithInsights.map((project) => (
                  <ProjectRow key={project.id} project={project} returnTo={returnTo} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
