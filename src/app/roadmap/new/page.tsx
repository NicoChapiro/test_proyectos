import Link from "next/link";
import { createRoadmapProjectAction } from "../actions";
import { ProjectForm } from "@/modules/roadmap/ui/ProjectForm";
import { AppShell, PageHeader } from "@/modules/roadmap/ui/shell";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function NewRoadmapProjectPage() {
  return (
    <AppShell active="roadmap">
      <PageHeader
        eyebrow="ROADMAP DE MARKETING"
        title="Nuevo proyecto"
        subtitle="Crea la cabecera del proyecto. Los hitos estándar se generarán automáticamente."
        actions={<Link className="button secondary" href="/roadmap">Volver</Link>}
      />
      <ProjectForm action={createRoadmapProjectAction} submitLabel="Crear proyecto" />
    </AppShell>
  );
}
