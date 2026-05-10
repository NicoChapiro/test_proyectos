import Link from "next/link";
import { deactivateRoadmapTemplateAction, deleteRoadmapTemplateAction, duplicateRoadmapTemplateAction } from "../../actions";
import { ROADMAP_PROJECT_TYPE_LABELS, ROADMAP_TRACK_LABELS } from "@/modules/roadmap/constants";
import { searchRoadmapTemplates } from "@/modules/roadmap/service";
import { AppShell, PageHeader } from "@/modules/roadmap/ui/shell";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RoadmapTemplatesPage() {
  const templates = await searchRoadmapTemplates(true);

  return (
    <AppShell active="settings">
      <PageHeader
        eyebrow="Configuración > Plantillas"
        title="Plantillas de roadmap"
        subtitle="Administra plantillas activas e inactivas. Los proyectos existentes conservan la copia de hitos creada originalmente."
        actions={<Link className="button primary" href="/roadmap/settings/templates/new">Nueva plantilla</Link>}
      />

      <section className="panel templates-panel">
        <div className="table-wrap">
          <table className="milestone-table templates-table">
            <thead><tr><th>Plantilla</th><th>Estado</th><th>Flujos</th><th>Hitos</th><th>Uso</th><th>Acciones</th></tr></thead>
            <tbody>
              {templates.map((template) => {
                const usageCount = template._count?.projects ?? 0;
                return (
                  <tr key={template.id}>
                    <td>
                      <strong>{template.name}</strong>
                      <span className="admin-code">{template.projectType ? ROADMAP_PROJECT_TYPE_LABELS[template.projectType] : "General"}</span>
                      {template.description ? <p className="compact-notes">{template.description}</p> : null}
                    </td>
                    <td><span className={`badge ${template.isActive ? "approved" : "slate"}`}>{template.isActive ? "Activa" : "Inactiva"}</span></td>
                    <td>{template.flows.map((flow) => <span className="badge phase" key={flow.id}>{flow.name || ROADMAP_TRACK_LABELS[flow.track]}</span>)}</td>
                    <td>{template._count?.milestones ?? 0}</td>
                    <td>{usageCount} {usageCount === 1 ? "proyecto" : "proyectos"}</td>
                    <td>
                      <div className="template-actions">
                        <Link className="button small secondary" href={`/roadmap/settings/templates/${template.id}/edit`}>Editar</Link>
                        <form action={duplicateRoadmapTemplateAction.bind(null, template.id)}><button className="button small" type="submit">Duplicar</button></form>
                        {template.isActive ? <form action={deactivateRoadmapTemplateAction.bind(null, template.id)}><button className="button small" type="submit">Desactivar</button></form> : null}
                        {usageCount === 0 ? <form action={deleteRoadmapTemplateAction.bind(null, template.id)}><button className="button small danger-button" type="submit">Eliminar</button></form> : <span className="admin-code">Eliminar bloqueado: en uso</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {templates.length === 0 ? <tr><td colSpan={6}>Aún no hay plantillas configuradas.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
