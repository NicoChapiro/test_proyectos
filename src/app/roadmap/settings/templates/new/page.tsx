import Link from "next/link";
import { createRoadmapTemplateAction } from "../../../actions";
import { AppShell, PageHeader } from "@/modules/roadmap/ui/shell";
import { TemplateForm } from "@/modules/roadmap/ui/TemplateForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function NewRoadmapTemplatePage() {
  return (
    <AppShell active="settings">
      <PageHeader eyebrow="Configuración > Plantillas" title="Nueva plantilla" subtitle="Crea una plantilla reutilizable para proyectos nuevos." actions={<Link className="button secondary" href="/roadmap/settings/templates">Volver</Link>} />
      <TemplateForm action={createRoadmapTemplateAction} submitLabel="Crear plantilla" />
    </AppShell>
  );
}
