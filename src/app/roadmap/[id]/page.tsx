import Link from "next/link";
import { notFound } from "next/navigation";
import { ROADMAP_MILESTONE_STATUSES, ROADMAP_PROJECT_TYPE_LABELS, ROADMAP_STATUS_LABELS } from "@/modules/roadmap/constants";
import { RoadmapNotFoundError } from "@/modules/roadmap/errors";
import { findRoadmapProject } from "@/modules/roadmap/service";
import { displayDate, inputDate } from "@/modules/roadmap/ui/date";
import { ProjectForm } from "@/modules/roadmap/ui/ProjectForm";
import { createMilestoneAction, updateMilestoneStatusAction, updateRoadmapProjectAction } from "../actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = { params: Promise<{ id: string }> };

export default async function RoadmapProjectDetailPage({ params }: PageProps) {
  const { id } = await params;
  let project;
  try {
    project = await findRoadmapProject(id);
  } catch (error) {
    if (error instanceof RoadmapNotFoundError) notFound();
    throw error;
  }

  const updateProject = updateRoadmapProjectAction.bind(null, project.id);
  const createMilestone = createMilestoneAction.bind(null, project.id);

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

      <section className="detail-grid">
        <div className="grid">
          <article className="panel">
            <h2>Datos generales</h2>
            <div className="badges"><span className={`badge ${project.trafficLight}`}>{project.trafficLight}</span><span className="badge">{ROADMAP_STATUS_LABELS[project.status]}</span><span className="badge">{ROADMAP_PROJECT_TYPE_LABELS[project.projectType]}</span><span className="badge">{project.priority}</span></div>
            <p>{project.description || "Sin comentarios."}</p>
            <p className="muted">Responsable: {project.ownerName} · Área: {project.area || "—"} · Canal: {project.channel || "—"}</p>
            <p className="muted">Marca: {project.brand || "—"} · Categoría: {project.category || "—"}</p>
            {project.packagingRequest ? <p><Link className="button" href={`/packaging/${project.packagingRequest.id}`}>Ver solicitud packaging {project.packagingRequest.code}</Link></p> : null}
            {project.sharepointFolderUrl ? <p><a className="button" href={project.sharepointFolderUrl} target="_blank" rel="noreferrer">Abrir SharePoint</a></p> : null}
          </article>

          <article>
            <h2>Editar proyecto</h2>
            <ProjectForm project={project} action={updateProject} submitLabel="Guardar cambios" />
          </article>
        </div>

        <aside className="grid">
          <section className="panel">
            <h2>Hitos</h2>
            {project.milestones.length === 0 ? <p className="muted">Aún no hay hitos registrados.</p> : null}
            <div className="grid">
              {project.milestones.map((milestone) => {
                const updateMilestone = updateMilestoneStatusAction.bind(null, project.id, milestone.id);
                return (
                  <article key={milestone.id} className="panel" style={{ boxShadow: "none" }}>
                    <h3>{milestone.name}</h3>
                    <p className="muted">Vence: {displayDate(milestone.dueDate)} {milestone.isCritical ? "· Crítico" : ""}</p>
                    <form action={updateMilestone} className="actions">
                      <select name="status" defaultValue={milestone.status} aria-label="Estado del hito">
                        {ROADMAP_MILESTONE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                      <input type="hidden" name="name" value={milestone.name} />
                      <input type="hidden" name="dueDate" value={inputDate(milestone.dueDate)} />
                      <button className="button" type="submit">Actualizar</button>
                    </form>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="panel">
            <h2>Crear hito</h2>
            <form action={createMilestone} className="grid">
              <label className="field"><span>Nombre *</span><input name="name" required /></label>
              <label className="field"><span>Descripción</span><textarea name="description" /></label>
              <label className="field"><span>Responsable</span><input name="ownerName" /></label>
              <label className="field"><span>Fecha compromiso *</span><input type="date" name="dueDate" required /></label>
              <label className="field"><span>Estado</span><select name="status" defaultValue="pendiente">{ROADMAP_MILESTONE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
              <label className="field"><span>Orden</span><input type="number" name="sortOrder" defaultValue="0" /></label>
              <label className="actions"><input type="checkbox" name="isCritical" value="true" style={{ width: "auto" }} /> Crítico</label>
              <button className="button primary" type="submit">Agregar hito</button>
            </form>
          </section>
        </aside>
      </section>
    </main>
  );
}
