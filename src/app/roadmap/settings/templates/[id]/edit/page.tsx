import Link from "next/link";
import { updateRoadmapTemplateAction } from "../../../../actions";
import { findRoadmapTemplate } from "@/modules/roadmap/service";
import { AppShell, PageHeader } from "@/modules/roadmap/ui/shell";
import { TemplateForm } from "@/modules/roadmap/ui/TemplateForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ id: string }> };

export default async function EditRoadmapTemplatePage({ params }: Props) {
  const { id } = await params;
  const template = await findRoadmapTemplate(id);

  return (
    <AppShell active="settings">
      <PageHeader eyebrow="Configuración > Plantillas" title={`Editar ${template.name}`} subtitle="Los cambios solo aplican a proyectos futuros; los proyectos existentes no se regeneran." actions={<Link className="button secondary" href="/roadmap/settings/templates">Volver</Link>} />
      <TemplateForm template={template} action={updateRoadmapTemplateAction.bind(null, template.id)} submitLabel="Guardar cambios" />
    </AppShell>
  );
}
