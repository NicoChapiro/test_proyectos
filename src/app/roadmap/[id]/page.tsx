import Link from "next/link";
import { notFound } from "next/navigation";
import { ROADMAP_APPROVAL_STATUS_LABELS, ROADMAP_APPROVAL_STATUSES, ROADMAP_MILESTONE_STATUS_LABELS, ROADMAP_MILESTONE_STATUSES, ROADMAP_PRIORITY_LABELS, ROADMAP_PROJECT_TYPE_LABELS, ROADMAP_STATUS_LABELS, ROADMAP_TRAFFIC_LIGHT_LABELS } from "@/modules/roadmap/constants";
import { RoadmapNotFoundError } from "@/modules/roadmap/errors";
import { buildRoadmapProjectInsights, type RoadmapProjectInsights } from "@/modules/roadmap/insights";
import { findRoadmapProject } from "@/modules/roadmap/service";
import { displayDate, displayPlannedDate, inputDate } from "@/modules/roadmap/ui/date";
import { ProjectForm } from "@/modules/roadmap/ui/ProjectForm";
import { displayApprovalStatus, displayMilestoneName, displayMilestoneStatus, displayTrackLabel } from "@/modules/roadmap/ui/labels";
import { AppShell, SummaryMetricCard } from "@/modules/roadmap/ui/shell";
import type { RoadmapMilestoneTrackValue } from "@/modules/roadmap/types";
import { createMilestoneAction, updateMilestoneStatusAction, updateRoadmapProjectAction } from "../actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = { params: Promise<{ id: string }> };
type Project = Awaited<ReturnType<typeof findRoadmapProject>>;
type Milestone = Project["milestones"][number];

function findMilestoneByCode(milestones: Milestone[], code: string) {
  return milestones.find((milestone) => milestone.milestoneCode === code);
}

function buildProjectSummary(milestones: Milestone[]) {
  const total = milestones.length;
  const completed = milestones.filter((milestone) => milestone.status === "completed").length;
  const blocked = milestones.filter((milestone) => milestone.status === "blocked").length;
  const pending = milestones.filter((milestone) => milestone.status !== "completed").length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, pending, blocked, progress };
}

function milestoneSummary(milestone: Milestone): string {
  return `${displayMilestoneName(milestone)} · ${milestone.ownerName || "Sin responsable"} · ${displayPlannedDate(milestone.plannedDate)} · ${displayMilestoneStatus(milestone.status)}`;
}

function statusClass(status: string) {
  return `badge milestone-${status}`;
}

function severityTone(severity: RoadmapProjectInsights["severity"]): "success" | "warning" | "danger" {
  if (severity === "critical") return "danger";
  if (severity === "warning") return "warning";
  return "success";
}

function pluralize(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural;
}

function buildOperationalAlerts(insights: RoadmapProjectInsights<Milestone>) {
  const alerts: string[] = [];

  if (insights.milestonesWithoutOwner.length > 0) {
    alerts.push(`Hay ${insights.milestonesWithoutOwner.length} ${pluralize(insights.milestonesWithoutOwner.length, "hito", "hitos")} sin responsable.`);
  }

  if (insights.pendingApprovalCount > 0) {
    alerts.push(`Hay ${insights.pendingApprovalCount} ${pluralize(insights.pendingApprovalCount, "aprobación pendiente", "aprobaciones pendientes")}.`);
  }

  if (insights.overdueMilestones.length > 0) {
    alerts.push(`Hay ${insights.overdueMilestones.length} ${pluralize(insights.overdueMilestones.length, "hito vencido", "hitos vencidos")}.`);
  }

  if (insights.blockedMilestones.length > 0) {
    alerts.push(`Hay ${insights.blockedMilestones.length} ${pluralize(insights.blockedMilestones.length, "hito bloqueado", "hitos bloqueados")}.`);
  }

  return alerts;
}

function MilestoneTable({ milestones, projectId, track }: { milestones: Milestone[]; projectId: string; track: RoadmapMilestoneTrackValue }) {
  return (
    <section className="panel milestone-section" id={track === "supply" ? "operaciones" : "marketing"}>
      <div className="section-title">
        <div>
          <p className="eyebrow">Track</p>
          <h2>{displayTrackLabel(track)}</h2>
        </div>
        <span className="badge slate">{milestones.length} hitos</span>
      </div>
      {milestones.length === 0 ? <p className="muted">No hay hitos para esta sección.</p> : null}
      <div className="table-wrap">
        <table className="milestone-table">
          <thead>
            <tr>
              <th>Hito</th>
              <th>Responsable</th>
              <th>Planificada</th>
              <th>Real</th>
              <th>Estado</th>
              <th>Aprobación</th>
              <th>Documentos</th>
              <th>Notas / editar</th>
            </tr>
          </thead>
          <tbody>
            {milestones.map((milestone) => {
              const updateMilestone = updateMilestoneStatusAction.bind(null, projectId, milestone.id);
              return (
                <tr key={milestone.id}>
                  <td>
                    <strong>{displayMilestoneName(milestone)}</strong>
                  </td>
                  <td>{milestone.ownerName || "—"}</td>
                  <td>{displayPlannedDate(milestone.plannedDate)}</td>
                  <td>{displayDate(milestone.actualDate ?? milestone.completedAt)}</td>
                  <td><span className={statusClass(milestone.status)}>{displayMilestoneStatus(milestone.status)}</span></td>
                  <td><span className={statusClass(milestone.approvalStatus ?? "pending")}>{displayApprovalStatus(milestone.approvalStatus)}</span></td>
                  <td className="link-cell">
                    {milestone.linkUrl ? <a className="text-button" href={milestone.linkUrl} target="_blank" rel="noreferrer">Abrir link</a> : null}
                    {milestone.documentUrl ? <a className="text-button" href={milestone.documentUrl} target="_blank" rel="noreferrer">Documento</a> : null}
                    {!milestone.linkUrl && !milestone.documentUrl ? <span className="muted">—</span> : null}
                  </td>
                  <td>
                    <p className="muted compact-notes">{milestone.notes || "Sin notas."}</p>
                    <details className="edit-details">
                      <summary className="button small secondary">Editar hito</summary>
                      <form action={updateMilestone} className="inline-edit">
                        <input type="hidden" name="name" value={milestone.name} />
                        <input type="hidden" name="track" value={track} />
                        <input type="hidden" name="sequence" value={milestone.sequence || milestone.sortOrder} />
                        <label className="field"><span>Responsable</span><input name="ownerName" defaultValue={milestone.ownerName ?? ""} /></label>
                        <label className="field"><span>Fecha planificada</span><input type="date" name="plannedDate" defaultValue={inputDate(milestone.plannedDate)} /></label>
                        <label className="field"><span>Fecha real</span><input type="date" name="actualDate" defaultValue={inputDate(milestone.actualDate ?? milestone.completedAt)} /></label>
                        <label className="field"><span>Estado</span><select name="status" defaultValue={milestone.status}>{ROADMAP_MILESTONE_STATUSES.map((status) => <option key={status} value={status}>{ROADMAP_MILESTONE_STATUS_LABELS[status]}</option>)}</select></label>
                        <label className="field"><span>Aprobación</span><select name="approvalStatus" defaultValue={milestone.approvalStatus ?? ""}><option value="">No aplica</option>{ROADMAP_APPROVAL_STATUSES.map((status) => <option key={status} value={status}>{ROADMAP_APPROVAL_STATUS_LABELS[status]}</option>)}</select></label>
                        <label className="field"><span>Link</span><input type="url" name="linkUrl" defaultValue={milestone.linkUrl ?? ""} /></label>
                        <label className="field"><span>Documento</span><input type="url" name="documentUrl" defaultValue={milestone.documentUrl ?? ""} /></label>
                        <label className="field"><span>Notas</span><textarea name="notes" defaultValue={milestone.notes ?? ""} /></label>
                        <button className="button primary" type="submit">Guardar hito</button>
                      </form>
                    </details>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function RoadmapProjectDetailPage({ params }: PageProps) {
  const { id } = await params;
  if (id === "new") notFound();

  let project;
  try {
    project = await findRoadmapProject(id);
  } catch (error) {
    if (error instanceof RoadmapNotFoundError) notFound();
    throw error;
  }

  const updateProject = updateRoadmapProjectAction.bind(null, project.id);
  const createMilestone = createMilestoneAction.bind(null, project.id);
  const supplyMilestones = project.milestones.filter((milestone) => milestone.track === "supply");
  const marketingMilestones = project.milestones.filter((milestone) => milestone.track === "marketing");
  const sharepointUrl = project.sharepointUrl ?? project.sharepointFolderUrl;
  const summary = buildProjectSummary(project.milestones);
  const insights = buildRoadmapProjectInsights(project.milestones);
  const nextMilestone = insights.nextMilestone;
  const operationalAlerts = buildOperationalAlerts(insights);
  const santiagoArrival = findMilestoneByCode(project.milestones, "supply_estimated_arrival_santiago");
  const campaignActivation = findMilestoneByCode(project.milestones, "marketing_activation_date");

  return (
    <AppShell active="roadmap">
      <header className="project-hero">
        <div className="project-hero-top"><Link className="back-link" href="/roadmap">← Volver al roadmap</Link><Link className="button secondary" href="#editar-proyecto">Editar proyecto</Link></div>
        <p className="eyebrow">{project.code}</p>
        <h1>{project.name}</h1>
        <p className="header-subtitle">{displayDate(project.startDate)} → {displayDate(project.targetDate)}</p>
        <div className="badges hero-badges">
          <span className="badge slate">{ROADMAP_PROJECT_TYPE_LABELS[project.projectType]}</span>
          <span className="badge slate">{project.area || "Sin área"}</span>
          <span className="badge slate">{project.ownerName}</span>
          <span className={`badge status-${project.status}`}>{ROADMAP_STATUS_LABELS[project.status]}</span>
          <span className={`badge ${project.trafficLight}`}>{ROADMAP_TRAFFIC_LIGHT_LABELS[project.trafficLight]}</span>
          <span className="badge priority">{ROADMAP_PRIORITY_LABELS[project.priority]}</span>
        </div>
      </header>

      <section className="executive-summary">
        <article className="progress-card">
          <p className="eyebrow">Progreso general</p>
          <strong>{summary.progress}%</strong>
          <span className="progress-track"><span style={{ width: `${summary.progress}%` }} /></span>
          <p className="muted">{summary.completed} de {summary.total} hitos completados.</p>
        </article>
        <SummaryMetricCard label="Total hitos" value={summary.total} />
        <SummaryMetricCard label="Completados" value={summary.completed} tone="success" />
        <SummaryMetricCard label="Pendientes" value={summary.pending} tone="warning" />
        <SummaryMetricCard label="Bloqueados" value={summary.blocked} tone="danger" />
        <SummaryMetricCard label="Próximo hito" value={nextMilestone ? displayMilestoneName(nextMilestone) : "Sin pendientes"} detail={nextMilestone ? milestoneSummary(nextMilestone) : "No hay acciones pendientes."} />
        <SummaryMetricCard label="Llegada estimada a Santiago" value={displayPlannedDate(santiagoArrival?.plannedDate)} />
        <SummaryMetricCard label="Activación de campaña" value={displayPlannedDate(campaignActivation?.plannedDate)} />
      </section>

      <section className="panel project-control" aria-labelledby="control-proyecto-title">
        <div className="section-title">
          <div>
            <p className="eyebrow">Control operativo</p>
            <h2 id="control-proyecto-title">Control del proyecto</h2>
          </div>
          <span className={`badge severity-${insights.severity}`}>{insights.severityLabel}</span>
        </div>
        <div className="control-grid">
          <SummaryMetricCard label="Fase actual" value={insights.currentPhase.label} />
          <SummaryMetricCard label="Severidad" value={insights.severityLabel} tone={severityTone(insights.severity)} />
          <SummaryMetricCard label="Próxima acción" value={nextMilestone ? displayMilestoneName(nextMilestone) : "Sin pendientes"} detail={nextMilestone ? displayPlannedDate(nextMilestone.plannedDate) : "No hay acciones pendientes."} />
          <SummaryMetricCard label="Responsable próxima acción" value={nextMilestone?.ownerName || "Sin responsable"} tone={nextMilestone && !nextMilestone.ownerName?.trim() ? "warning" : undefined} />
          <SummaryMetricCard label="Hitos vencidos" value={insights.overdueMilestones.length} detail={insights.overdueMilestones[0] ? milestoneSummary(insights.overdueMilestones[0]) : "Sin hitos vencidos."} tone={insights.overdueMilestones.length > 0 ? "danger" : undefined} />
          <SummaryMetricCard label="Próximos 7 días" value={insights.upcomingMilestones.length} detail={insights.upcomingMilestones[0] ? milestoneSummary(insights.upcomingMilestones[0]) : "Sin hitos en los próximos 7 días."} />
          <SummaryMetricCard label="Bloqueados" value={insights.blockedMilestones.length} detail={insights.blockedMilestones[0] ? milestoneSummary(insights.blockedMilestones[0]) : "Sin hitos bloqueados."} tone={insights.blockedMilestones.length > 0 ? "danger" : undefined} />
          <SummaryMetricCard label="Sin responsable" value={insights.milestonesWithoutOwner.length} detail={insights.milestonesWithoutOwner[0] ? milestoneSummary(insights.milestonesWithoutOwner[0]) : "Todos los hitos pendientes tienen responsable."} tone={insights.milestonesWithoutOwner.length > 0 ? "warning" : undefined} />
          <SummaryMetricCard label="Aprobaciones pendientes" value={insights.pendingApprovalCount} detail={insights.pendingApprovalMilestones[0] ? milestoneSummary(insights.pendingApprovalMilestones[0]) : "Sin aprobaciones pendientes."} tone={insights.pendingApprovalCount > 0 ? "warning" : undefined} />
        </div>
        <div className={`operational-alert-list ${insights.severity}`}>
          <strong>Alertas operativas</strong>
          {operationalAlerts.length === 0 ? (
            <p className="muted">Sin alertas operativas.</p>
          ) : (
            <ul>
              {operationalAlerts.map((alert) => <li key={alert}>{alert}</li>)}
            </ul>
          )}
        </div>
      </section>

      <nav className="section-tabs" aria-label="Secciones del proyecto">
        <a href="#control-proyecto-title">Control del proyecto</a>
        <a href="#operaciones">Operaciones / Proveedor</a>
        <a href="#marketing">Marketing / Campaña</a>
        <a href="#resumen-proyecto">Resumen del proyecto</a>
      </nav>

      <section className="panel" id="resumen-proyecto">
        <div className="section-title">
          <div><p className="eyebrow">Resumen del proyecto</p><h2>Contexto ejecutivo</h2></div>
          <div className="actions">{project.packagingRequest ? <Link className="button secondary" href={`/packaging/${project.packagingRequest.id}`}>Solicitud packaging {project.packagingRequest.code}</Link> : null}{sharepointUrl ? <a className="button secondary" href={sharepointUrl} target="_blank" rel="noreferrer">Abrir SharePoint</a> : null}</div>
        </div>
        <p>{project.description || "Sin comentarios."}</p>
        <dl className="metadata-grid">
          <div><dt>Responsable</dt><dd>{project.ownerName}</dd></div>
          <div><dt>Área</dt><dd>{project.area || "—"}</dd></div>
          <div><dt>Canal</dt><dd>{project.channel || "—"}</dd></div>
          <div><dt>Marca</dt><dd>{project.brand || "—"}</dd></div>
          <div><dt>Categoría</dt><dd>{project.category || "—"}</dd></div>
          <div><dt>Fase actual</dt><dd>{insights.currentPhase.label}</dd></div>
          <div><dt>Inicio</dt><dd>{displayDate(project.startDate)}</dd></div>
          <div><dt>Fecha objetivo</dt><dd>{displayDate(project.targetDate)}</dd></div>
        </dl>
      </section>


      <MilestoneTable milestones={supplyMilestones} projectId={project.id} track="supply" />
      <MilestoneTable milestones={marketingMilestones} projectId={project.id} track="marketing" />

      <section className="detail-grid forms-grid">
        <article id="editar-proyecto">
          <div className="section-title compact"><div><p className="eyebrow">Administración</p><h2>Editar proyecto</h2></div></div>
          <ProjectForm project={project} action={updateProject} submitLabel="Guardar cambios" />
        </article>

        <section className="panel add-milestone-card">
          <div className="section-title compact"><div><p className="eyebrow">Nuevo hito</p><h2>Crear hito adicional</h2></div></div>
          <form action={createMilestone} className="grid">
            <label className="field"><span>Nombre <em>*</em></span><input name="name" required /></label>
            <label className="field"><span>Track</span><select name="track" defaultValue="supply"><option value="supply">{displayTrackLabel("supply")}</option><option value="marketing">{displayTrackLabel("marketing")}</option></select></label>
            <label className="field"><span>Responsable</span><input name="ownerName" /></label>
            <label className="field"><span>Fecha planificada <em>*</em></span><input type="date" name="plannedDate" required /></label>
            <label className="field"><span>Estado</span><select name="status" defaultValue="not_started">{ROADMAP_MILESTONE_STATUSES.map((status) => <option key={status} value={status}>{ROADMAP_MILESTONE_STATUS_LABELS[status]}</option>)}</select></label>
            <label className="field"><span>Orden</span><input type="number" name="sequence" defaultValue="99" /></label>
            <label className="field"><span>Aprobación</span><select name="approvalStatus" defaultValue=""><option value="">No aplica</option>{ROADMAP_APPROVAL_STATUSES.map((status) => <option key={status} value={status}>{ROADMAP_APPROVAL_STATUS_LABELS[status]}</option>)}</select></label>
            <label className="field"><span>Documento</span><input type="url" name="documentUrl" /></label>
            <label className="field full"><span>Notas</span><textarea name="notes" /></label>
            <button className="button primary" type="submit">Agregar hito</button>
          </form>
        </section>
      </section>
    </AppShell>
  );
}
