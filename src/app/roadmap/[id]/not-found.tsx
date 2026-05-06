import Link from "next/link";

export default function RoadmapProjectNotFound() {
  return (
    <main className="page-shell">
      <section className="panel">
        <h1>Proyecto no encontrado</h1>
        <p className="muted">No existe un proyecto de roadmap con el identificador solicitado.</p>
        <Link className="button" href="/roadmap">Volver al roadmap</Link>
      </section>
    </main>
  );
}
