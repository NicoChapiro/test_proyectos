import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">Gestión de proyectos</p>
        <h1>Test Proyectos</h1>
        <p>Accede al roadmap anual para organizar proyectos e hitos por trimestre.</p>
        <div className="actions"><Link className="button primary" href="/roadmap">Ver roadmap</Link><Link className="button" href="/packaging">Ver packaging</Link></div>
      </section>
    </main>
  );
}
