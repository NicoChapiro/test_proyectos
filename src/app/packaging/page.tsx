import Link from "next/link";
import { searchPackagingRequests } from "@/modules/packaging/service";
import { displayDate } from "@/modules/roadmap/ui/date";

export default async function PackagingPage() {
  const requests = await searchPackagingRequests();

  return (
    <main className="page-shell">
      <div className="topbar">
        <div>
          <p className="eyebrow">Packaging</p>
          <h1>Solicitudes de packaging</h1>
          <p className="muted">Vincula solicitudes con proyectos del roadmap para dar seguimiento por trimestre.</p>
        </div>
        <Link className="button" href="/roadmap">Ver roadmap</Link>
      </div>

      <section className="grid">
        {requests.length === 0 ? <div className="panel muted">No hay solicitudes de packaging registradas.</div> : null}
        {requests.map((request) => (
          <article className="panel" key={request.id}>
            <p className="eyebrow">{request.code}</p>
            <h2><Link href={`/packaging/${request.id}`}>{request.title}</Link></h2>
            <p className="muted">
              Solicitante: {request.requesterName} · Marca: {request.brand || "—"} · Lanzamiento deseado: {request.desiredLaunchDate ? displayDate(request.desiredLaunchDate) : "—"}
            </p>
            <div className="badges"><span className="badge">{request.status}</span><span className="badge">{request.roadmapProjects.length} en roadmap</span></div>
          </article>
        ))}
      </section>
    </main>
  );
}
