import Link from "next/link";
import { notFound } from "next/navigation";
import { PackagingNotFoundError } from "@/modules/packaging/errors";
import { findPackagingRequest } from "@/modules/packaging/service";
import { ROADMAP_STATUS_LABELS } from "@/modules/roadmap/constants";
import { searchRoadmapProjects } from "@/modules/roadmap/service";
import { displayDate } from "@/modules/roadmap/ui/date";
import { createPackagingRoadmapProjectAction, linkPackagingRoadmapProjectAction } from "../actions";

type PageProps = { params: Promise<{ id: string }> };

export default async function PackagingRequestDetailPage({ params }: PageProps) {
  const { id } = await params;
  let packaging;
  try {
    packaging = await findPackagingRequest(id);
  } catch (error) {
    if (error instanceof PackagingNotFoundError) notFound();
    throw error;
  }

  const availableProjects = await searchRoadmapProjects({});
  const createRoadmapProject = createPackagingRoadmapProjectAction.bind(null, packaging.id);
  const linkRoadmapProject = linkPackagingRoadmapProjectAction.bind(null, packaging.id);

  return (
    <main className="page-shell">
      <div className="topbar">
        <div>
          <p className="eyebrow">{packaging.code}</p>
          <h1>{packaging.title}</h1>
          <p className="muted">Solicitud de packaging · Estado: {packaging.status}</p>
        </div>
        <div className="actions">
          <Link className="button" href="/packaging">Volver a packaging</Link>
          <Link className="button" href="/roadmap">Ver roadmap</Link>
        </div>
      </div>

      <section className="detail-grid">
        <div className="grid">
          <article className="panel">
            <h2>Datos de la solicitud</h2>
            <p>{packaging.description || "Sin comentarios."}</p>
            <p className="muted">
              Solicitante: {packaging.requesterName} · Marca: {packaging.brand || "—"} · Categoría: {packaging.category || "—"}
            </p>
            <p className="muted">Lanzamiento deseado: {packaging.desiredLaunchDate ? displayDate(packaging.desiredLaunchDate) : "—"}</p>
            {packaging.sharepointFolderUrl ? <p><a className="button" href={packaging.sharepointFolderUrl} target="_blank" rel="noreferrer">Abrir SharePoint</a></p> : null}
          </article>

          <article className="panel">
            <h2>Roadmap</h2>
            <p className="muted">Crea un proyecto roadmap desde esta solicitud o vincula un proyecto existente.</p>
            <div className="actions" style={{ marginBottom: 16 }}>
              <form action={createRoadmapProject}>
                <button className="button primary" type="submit">Crear proyecto roadmap</button>
              </form>
            </div>
            <form action={linkRoadmapProject} className="form-grid">
              <label className="field full">
                <span>Vincular proyecto existente</span>
                <select name="projectId" required defaultValue="">
                  <option value="" disabled>Selecciona un proyecto</option>
                  {availableProjects.map((project) => (
                    <option key={project.id} value={project.id}>{project.code} · {project.name}</option>
                  ))}
                </select>
              </label>
              <div className="actions full"><button className="button" type="submit">Vincular al roadmap</button></div>
            </form>
          </article>
        </div>

        <aside className="grid">
          <section className="panel">
            <h2>Proyectos vinculados</h2>
            {packaging.roadmapProjects.length === 0 ? <p className="muted">Esta solicitud aún no aparece en el roadmap.</p> : null}
            <div className="grid">
              {packaging.roadmapProjects.map((project) => (
                <article className="panel" key={project.id} style={{ boxShadow: "none" }}>
                  <h3><Link href={`/roadmap/${project.id}`}>{project.name}</Link></h3>
                  <p className="muted">{project.code} · {displayDate(project.startDate)} → {displayDate(project.targetDate)}</p>
                  <div className="badges"><span className={`badge ${project.trafficLight}`}>{project.trafficLight}</span><span className="badge">{ROADMAP_STATUS_LABELS[project.status]}</span></div>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
