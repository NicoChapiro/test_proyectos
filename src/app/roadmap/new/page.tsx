import Link from "next/link";
import { createRoadmapProjectAction } from "../actions";
import { ProjectForm } from "@/modules/roadmap/ui/ProjectForm";

export default function NewRoadmapProjectPage() {
  return (
    <main className="page-shell">
      <div className="topbar"><div><p className="eyebrow">Roadmap</p><h1>Nuevo proyecto</h1></div><Link className="button" href="/roadmap">Volver</Link></div>
      <ProjectForm action={createRoadmapProjectAction} submitLabel="Crear proyecto" />
    </main>
  );
}
