import { ROADMAP_PRIORITIES, ROADMAP_PRIORITY_LABELS, ROADMAP_STATUSES, ROADMAP_STATUS_LABELS, ROADMAP_TRAFFIC_LIGHT_LABELS, ROADMAP_TRAFFIC_LIGHTS } from "../constants";
import type { RoadmapProjectWithMilestones } from "../types";
import { inputDate } from "./date";
import { ProjectTemplatePreviewField } from "./ProjectTemplatePreviewField";
import { FormSectionCard } from "./shell";

type Props = {
  project?: RoadmapProjectWithMilestones;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
};

export function ProjectForm({ project, action, submitLabel }: Props) {
  return (
    <form action={action} className="guided-form">
      <FormSectionCard title="Información principal" description="Define el nombre ejecutivo y contexto del proyecto.">
        <label className="field full"><span>Proyecto <em>*</em></span><input name="name" required defaultValue={project?.name ?? ""} /></label>
        <label className="field full"><span>Descripción / comentarios</span><textarea name="description" defaultValue={project?.description ?? ""} /></label>
      </FormSectionCard>

      <FormSectionCard title="Clasificación" description="Agrupa el proyecto para filtrar el roadmap anual.">
        <ProjectTemplatePreviewField defaultValue={project?.projectType} showPreview={!project} />
        <label className="field"><span>Área</span><input name="area" defaultValue={project?.area ?? ""} /></label>
        <label className="field"><span>Canal</span><input name="channel" defaultValue={project?.channel ?? ""} /></label>
        <label className="field"><span>Marca</span><input name="brand" defaultValue={project?.brand ?? ""} /></label>
        <label className="field full"><span>Categoría / línea</span><input name="category" defaultValue={project?.category ?? ""} /></label>
      </FormSectionCard>

      <FormSectionCard title="Responsable y fechas" description="Mantén visible el ownership, prioridad y semáforo del proyecto.">
        <label className="field"><span>Responsable <em>*</em></span><input name="ownerName" required defaultValue={project?.ownerName ?? ""} /></label>
        <label className="field"><span>Inicio <em>*</em></span><input type="date" name="startDate" required defaultValue={inputDate(project?.startDate)} /></label>
        <label className="field"><span>Fecha objetivo <em>*</em></span><input type="date" name="targetDate" required defaultValue={inputDate(project?.targetDate)} /></label>
        <label className="field"><span>Estado</span><select name="status" defaultValue={project?.status ?? "no_iniciado"}>{ROADMAP_STATUSES.map((item) => <option key={item} value={item}>{ROADMAP_STATUS_LABELS[item]}</option>)}</select></label>
        <label className="field"><span>Prioridad</span><select name="priority" defaultValue={project?.priority ?? "media"}>{ROADMAP_PRIORITIES.map((item) => <option key={item} value={item}>{ROADMAP_PRIORITY_LABELS[item]}</option>)}</select></label>
        <label className="field"><span>Semáforo</span><select name="trafficLight" defaultValue={project?.trafficLight ?? "gris"}>{ROADMAP_TRAFFIC_LIGHTS.map((item) => <option key={item} value={item}>{ROADMAP_TRAFFIC_LIGHT_LABELS[item]}</option>)}</select></label>
      </FormSectionCard>

      <FormSectionCard title="Documentación" description="Conecta la carpeta base para archivos y aprobaciones.">
        <label className="field full"><span>Carpeta SharePoint</span><input type="url" name="sharepointUrl" defaultValue={project?.sharepointUrl ?? project?.sharepointFolderUrl ?? ""} /></label>
      </FormSectionCard>

      <div className="form-footer"><button className="button primary large" type="submit">{submitLabel}</button></div>
    </form>
  );
}
