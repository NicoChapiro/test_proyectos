"use client";

type RoadmapErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function RoadmapError({ reset }: RoadmapErrorProps) {
  return (
    <main className="page-shell">
      <section className="panel" role="alert" aria-labelledby="roadmap-error-title">
        <p className="eyebrow">Roadmap de Marketing</p>
        <h1 id="roadmap-error-title">No se pudo cargar el roadmap.</h1>
        <p className="muted">Revisa la conexión a la base de datos o las migraciones de Prisma.</p>
        <div className="actions" style={{ marginTop: 18 }}>
          <button className="button primary" type="button" onClick={() => reset()}>
            Reintentar
          </button>
        </div>
      </section>
    </main>
  );
}
