import Link from "next/link";
import { notFound } from "next/navigation";
import { ROADMAP_APPROVAL_STATUS_LABELS, ROADMAP_APPROVAL_STATUSES, ROADMAP_MILESTONE_STATUS_LABELS, ROADMAP_MILESTONE_STATUSES, ROADMAP_PROJECT_TYPE_LABELS, ROADMAP_STATUS_LABELS } from "@/modules/roadmap/constants";
import { RoadmapNotFoundError } from "@/modules/roadmap/errors";
import { buildRoadmapProjectInsights } from "@/modules/roadmap/insights";
import { findRoadmapProject } from "@/modules/roadmap/service";
import { displayDate, displayPlannedDate, inputDate } from "@/modules/roadmap/ui/date";
import { ProjectForm } from "@/modules/roadmap/ui/ProjectForm";
import { displayApprovalStatus, displayMilestoneName, displayMilestoneStatus, displayTrackLabel } from "@/modules/roadmap/ui/labels";
import type { RoadmapMilestoneTrackValue } from "@/modules/roadmap/types";
import { createMilestoneAction, updateMilestoneStatusAction, updateRoadmapProjectAction } from "../actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = { params: Promise<{ id: string }> };
type Project = Awaited<ReturnType<typeof findRoadmapProject>>;
type Milestone = Project["milestones"][number];

function milestoneDate(milestone: Milestone) {
  return milestone.plannedDate;
}

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

function InsightCard({ title, value, detail, warning = false }: { title: string; value: string | number; detail?: string; warning?: boolean }) {
  return (
    <article className={`insight-card${warning ? " warning-card" : ""}`}>
      <p className="eyebrow">{title}</p>
      <strong>{value}</strong>
      {detail ? <p className="muted">{detail}</p> : null}
    </article>
  );
}

function MilestoneTable({ milestones, projectId, track }: { milestones: Milestone[]; projectId: string; track: RoadmapMilestoneTrackValue }) {
  return (
    <section className="panel">
      <div className="section-title">
        <div>
          <p className="eyebrow">Track</p>
          <h2>{displayTrackLabel(track)}</h2>
        </div>
        <span className="badge">{milestones.length} hitos</span>
      </div>
      {milestones.length === 0 ? <p className="muted">No hay hitos para este track.</p> : null}
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
              <th>Links</th>
              <th>Notas / editar</th>
            </tr>
          </thead>
          <tbody>
            {milestones.map((milestone) => {
              const updateMilestone = updateMilestoneStatusAction.bind(null, projectId, milestone.id);
              return (
                <tr key={milestone.id}>
                  <td><strong>{displayMilestoneName(milestone)}</strong></td>
                  <td>{milestone.ownerName || "—"}</td>
                  <td>{displayPlannedDate(milestoneDate(milestone))}</td>
                  <td>{displayDate(milestone.actualDate ?? milestone.completedAt)}</td>
                  <td><span className="badge">{displayMilestoneStatus(milestone.status)}</span></td>
                  <td>{displayApprovalStatus(milestone.approvalStatus)}</td>
                  <td className="link-cell">
                    {milestone.linkUrl ? <a href={milestone.linkUrl} target="_blank" rel="noreferrer">Link</a> : null}
                    {milestone.documentUrl ? <a href={milestone.documentUrl} target="_blank" rel="noreferrer">Documento</a> : null}
                    {!milestone.linkUrl && !milestone.documentUrl ? "—" : null}
                  </td>
                  <td>
                    <p className="muted compact-notes">{milestone.notes || "Sin notas."}</p>
                    <details>
                      <summary className="button small">Editar hito</summary>
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
  const santiagoArrival = findMilestoneByCode(project.milestones, "supply_estimated_arrival_santiago");
  const campaignActivation = findMilestoneByCode(project.milestones, "marketing_activation_date");

  return (
    <main className="page-shell">
      <div className="topbar">
        <div>
          <p className="eyebrow">{project.code}</p>
          <h1>{project.name}</h1>
          <p className="muted">{displayDate(project.startDate)} → {displayDate(project.targetDate)}</p>
        </div>
        <Link className="button" href="/roadmap">Volver al roadmap</Link>
      </div>

      <section className="grid">
        <article className="panel">
          <div className="section-title">
            <div>
              <p className="eyebrow">Resumen del proyecto</p>
              <h2>{project.name}</h2>
            </div>
            <div className="badges"><span className={`badge ${project.trafficLight}`}>{project.trafficLight}</span><span className="badge">{ROADMAP_STATUS_LABELS[project.status]}</span><span className="badge">{ROADMAP_PROJECT_TYPE_LABELS[project.projectType]}</span><span className="badge">{project.priority}</span></div>
          </div>
          <p>{project.description || "Sin comentarios."}</p>
          <dl className="metadata-grid">
            <div><dt>Responsable</dt><dd>{project.ownerName}</dd></div>
            <div><dt>Área</dt><dd>{project.area || "—"}</dd></div>
            <div><dt>Canal</dt><dd>{project.channel || "—"}</dd></div>
            <div><dt>Marca</dt><dd>{project.brand || "—"}</dd></div>
            <div><dt>Categoría</dt><dd>{project.category || "—"}</dd></div>
            <div><dt>Tipo</dt><dd>{ROADMAP_PROJECT_TYPE_LABELS[project.projectType]}</dd></div>
            <div><dt>Inicio</dt><dd>{displayDate(project.startDate)}</dd></div>
            <div><dt>Fecha objetivo</dt><dd>{displayDate(project.targetDate)}</dd></div>
          </dl>
          <div className="actions">
            {project.packagingRequest ? <Link className="button" href={`/packaging/${project.packagingRequest.id}`}>Ver solicitud packaging {project.packagingRequest.code}</Link> : null}
            {sharepointUrl ? <a className="button" href={sharepointUrl} target="_blank" rel="noreferrer">Abrir SharePoint</a> : null}
          </div>
        </article>


        <article className="panel">
          <div className="section-title">
            <div>
              <p className="eyebrow">Avance de hitos</p>
              <h2>Resumen operativo</h2>
            </div>
            <span className="badge">{insights.progressPercentage}% completado</span>
          </div>
          <dl className="metadata-grid">
            <div><dt>Total de hitos</dt><dd>{summary.total}</dd></div>
            <div><dt>Hitos completados</dt><dd>{summary.completed}</dd></div>
            <div><dt>Hitos pendientes</dt><dd>{summary.pending}</dd></div>
            <div><dt>Hitos bloqueados</dt><dd>{summary.blocked}</dd></div>
            <div><dt>Fase actual</dt><dd>{insights.currentPhase.label}</dd></div>
            <div><dt>Próxima acción</dt><dd>{nextMilestone ? milestoneSummary(nextMilestone) : "Sin acciones pendientes"}</dd></div>
            <div><dt>Llegada estimada a Santiago de Chile</dt><dd>{displayPlannedDate(santiagoArrival?.plannedDate)}</dd></div>
            <div><dt>Activación de campaña</dt><dd>{displayPlannedDate(campaignActivation?.plannedDate)}</dd></div>
            <div><dt>Progreso</dt><dd>{insights.progressPercentage}%</dd></div>
          </dl>
        </article>

        <section className="insight-grid full">
          <InsightCard title="Fase actual" value={insights.currentPhase.label} detail={`${insights.progressPercentage}% completado`} />
          <InsightCard
            title="Próxima acción"
            value={nextMilestone ? displayMilestoneName(nextMilestone) : "Sin pendientes"}
            detail={nextMilestone ? `Responsable: ${nextMilestone.ownerName || "Sin responsable"} · Planificada: ${displayPlannedDate(nextMilestone.plannedDate)} · Estado: ${displayMilestoneStatus(nextMilestone.status)}` : "No hay hitos pendientes."}
            warning={Boolean(nextMilestone && !nextMilestone.ownerName?.trim())}
          />
          <InsightCard
            title="Hitos vencidos"
            value={insights.overdueMilestones.length}
            detail={insights.overdueMilestones[0] ? milestoneSummary(insights.overdueMilestones[0]) : "Sin hitos vencidos."}
            warning={insights.overdueMilestones.length > 0}
          />
          <InsightCard
            title="Hitos próximos"
            value={insights.upcomingMilestones.length}
            detail={insights.upcomingMilestones[0] ? milestoneSummary(insights.upcomingMilestones[0]) : "Sin hitos en los próximos 7 días."}
          />
          <InsightCard
            title="Hitos bloqueados"
            value={insights.blockedMilestones.length}
            detail={insights.blockedMilestones[0] ? milestoneSummary(insights.blockedMilestones[0]) : "Sin bloqueos activos."}
            warning={insights.blockedMilestones.length > 0}
          />
          <InsightCard
            title="Hitos sin responsable"
            value={insights.milestonesWithoutOwner.length}
            detail={insights.milestonesWithoutOwner[0] ? milestoneSummary(insights.milestonesWithoutOwner[0]) : "Todos los hitos pendientes tienen responsable."}
            warning={Boolean(nextMilestone && !nextMilestone.ownerName?.trim())}
          />
        </section>

        <MilestoneTable milestones={supplyMilestones} projectId={project.id} track="supply" />
        <MilestoneTable milestones={marketingMilestones} projectId={project.id} track="marketing" />

        <section className="detail-grid">
          <article>
            <h2>Editar proyecto</h2>
            <ProjectForm project={project} action={updateProject} submitLabel="Guardar cambios" />
          </article>

          <section className="panel">
            <h2>Crear hito adicional</h2>
            <form action={createMilestone} className="grid">
              <label className="field"><span>Nombre *</span><input name="name" required /></label>
              <label className="field"><span>Track</span><select name="track" defaultValue="supply"><option value="supply">{displayTrackLabel("supply")}</option><option value="marketing">{displayTrackLabel("marketing")}</option></select></label>
              <label className="field"><span>Responsable</span><input name="ownerName" /></label>
              <label className="field"><span>Fecha planificada *</span><input type="date" name="plannedDate" required /></label>
              <label className="field"><span>Estado</span><select name="status" defaultValue="not_started">{ROADMAP_MILESTONE_STATUSES.map((status) => <option key={status} value={status}>{ROADMAP_MILESTONE_STATUS_LABELS[status]}</option>)}</select></label>
              <label className="field"><span>Orden</span><input type="number" name="sequence" defaultValue="99" /></label>
              <label className="field"><span>Aprobación</span><select name="approvalStatus" defaultValue=""><option value="">No aplica</option>{ROADMAP_APPROVAL_STATUSES.map((status) => <option key={status} value={status}>{ROADMAP_APPROVAL_STATUS_LABELS[status]}</option>)}</select></label>
              <label className="field"><span>Documento</span><input type="url" name="documentUrl" /></label>
              <label className="field full"><span>Notas</span><textarea name="notes" /></label>
              <button className="button primary" type="submit">Agregar hito</button>
            </form>
          </section>
        </section>
      </section>
    </main>
  );
}
