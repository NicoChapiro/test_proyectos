import { ROADMAP_PROJECT_TYPE_LABELS, ROADMAP_PROJECT_TYPES, ROADMAP_TRACK_LABELS } from "../constants";
import type { RoadmapTemplateWithDetails } from "../types";
import { FormSectionCard } from "./shell";
import { TemplateMilestoneEditor } from "./TemplateMilestoneEditor";

type Props = {
  template?: RoadmapTemplateWithDetails;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
};

function templateLines(template?: RoadmapTemplateWithDetails): string {
  if (!template) {
    return [
      "supply | Aprobación de diseño | Responsable de proyecto | true | false | 0 | Validar diseño interno",
      "supply | Inicio producción proveedor |  | false | false | 14 |",
      "supply | Llegada a bodega Quilicura |  | false | true | 45 |",
      "marketing | Brief & Kickoff | Responsable de proyecto | false | false | 0 |",
      "marketing | KV aprobado |  | true | false | 21 |",
      "marketing | Lanzamiento & Cierre |  | false | true | 60 |",
    ].join("\n");
  }

  return template.flows
    .flatMap((flow) =>
      flow.milestones.map((milestone) =>
        [
          flow.track,
          milestone.name,
          milestone.suggestedOwner ?? "",
          milestone.approvalRequired ? "true" : "false",
          milestone.isCritical ? "true" : "false",
          milestone.suggestedOffsetDays ?? "",
          milestone.notes ?? "",
        ].join(" | "),
      ),
    )
    .join("\n");
}

export function TemplateForm({ template, action, submitLabel }: Props) {
  const supplyFlow = template?.flows.find((flow) => flow.track === "supply");
  const marketingFlow = template?.flows.find((flow) => flow.track === "marketing");

  return (
    <form action={action} className="guided-form">
      <FormSectionCard title="Identidad" description="Define cómo se verá la plantilla al crear proyectos nuevos.">
        <label className="field"><span>Nombre <em>*</em></span><input name="name" required defaultValue={template?.name ?? ""} /></label>
        <label className="field"><span>Tipo sugerido</span><select name="projectType" defaultValue={template?.projectType ?? ""}><option value="">General</option>{ROADMAP_PROJECT_TYPES.map((type) => <option key={type} value={type}>{ROADMAP_PROJECT_TYPE_LABELS[type]}</option>)}</select></label>
        <label className="field"><span>Orden</span><input type="number" name="sortOrder" defaultValue={template?.sortOrder ?? 0} /></label>
        <label className="field checkbox-field"><input type="checkbox" name="isActive" defaultChecked={template?.isActive ?? true} /><span>Plantilla activa</span></label>
        <label className="field full"><span>Descripción</span><textarea name="description" defaultValue={template?.description ?? ""} /></label>
      </FormSectionCard>

      <FormSectionCard title="Flujos" description="Reordena flujos ajustando su número de orden. Solo se guardan flujos con hitos.">
        <label className="field"><span>{ROADMAP_TRACK_LABELS.supply}</span><input name="supplyFlowName" defaultValue={supplyFlow?.name ?? ROADMAP_TRACK_LABELS.supply} /></label>
        <label className="field"><span>Orden supply</span><input type="number" name="supplyFlowOrder" defaultValue={supplyFlow?.sortOrder ?? 1} /></label>
        <label className="field"><span>{ROADMAP_TRACK_LABELS.marketing}</span><input name="marketingFlowName" defaultValue={marketingFlow?.name ?? ROADMAP_TRACK_LABELS.marketing} /></label>
        <label className="field"><span>Orden marketing</span><input type="number" name="marketingFlowOrder" defaultValue={marketingFlow?.sortOrder ?? 2} /></label>
      </FormSectionCard>

      <FormSectionCard title="Hitos de plantilla" description="Configura los hitos que se crearán automáticamente al usar esta plantilla.">
        <TemplateMilestoneEditor initialMilestonesText={templateLines(template)} />
      </FormSectionCard>

      <div className="form-footer"><button className="button primary large" type="submit">{submitLabel}</button></div>
    </form>
  );
}
