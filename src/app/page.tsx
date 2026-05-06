import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">Gestión de proyectos de Marketing</p>
        <h1>Roadmap de Marketing</h1>
        <p>Planifica y da seguimiento a proyectos de Marketing: lanzamientos, campañas, packaging, trade marketing, contenido, eventos, ecommerce e iniciativas internas.</p>
        <div className="actions"><Link className="button primary" href="/roadmap">Ver roadmap</Link><Link className="button" href="/packaging">Ver solicitudes de Packaging</Link></div>
      </section>
    </main>
  );
}
