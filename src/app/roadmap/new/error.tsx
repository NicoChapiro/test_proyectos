"use client";

import { useEffect } from "react";

type NewRoadmapProjectErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function NewRoadmapProjectError({ error, reset }: NewRoadmapProjectErrorProps) {
  useEffect(() => {
    console.error("Roadmap new project form error", {
      name: error.name,
      digest: error.digest,
    });
  }, [error.digest, error.name]);

  return (
    <main className="page-shell">
      <section className="panel" role="alert" aria-labelledby="roadmap-new-error-title">
        <p className="eyebrow">Roadmap de Marketing</p>
        <h1 id="roadmap-new-error-title">No se pudo cargar el formulario de nuevo proyecto.</h1>
        <p className="muted">Revisa los logs de Vercel para más detalle.</p>
        <div className="actions" style={{ marginTop: 18 }}>
          <button className="button primary" type="button" onClick={() => reset()}>
            Reintentar
          </button>
        </div>
      </section>
    </main>
  );
}
