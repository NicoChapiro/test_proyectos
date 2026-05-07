import { ROADMAP_PRIORITIES, ROADMAP_PROJECT_TYPE_LABELS, ROADMAP_PROJECT_TYPES, ROADMAP_STATUSES, ROADMAP_TRAFFIC_LIGHTS } from "../constants";
import type { RoadmapProjectWithMilestones } from "../types";
import { inputDate } from "./date";

type Props = {
  project?: RoadmapProjectWithMilestones;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
};

export function ProjectForm({ project, action, submitLabel }: Props) {
  return (
    <form action={action} className="panel form-grid">
      <label className="field full"><span>Proyecto *</span><input name="name" required defaultValue={project?.name ?? ""} /></label>
      <label className="field full"><span>Descripción / comentarios</span><textarea name="description" defaultValue={project?.description ?? ""} /></label>
      <label className="field"><span>Tipo de proyecto</span><select name="projectType" defaultValue={project?.projectType ?? "other"}>{ROADMAP_PROJECT_TYPES.map((item) => <option key={item} value={item}>{ROADMAP_PROJECT_TYPE_LABELS[item]}</option>)}</select></label>
      <label className="field"><span>Área</span><input name="area" defaultValue={project?.area ?? ""} /></label>
      <label className="field"><span>Canal</span><input name="channel" defaultValue={project?.channel ?? ""} /></label>
      <label className="field"><span>Marca</span><input name="brand" defaultValue={project?.brand ?? ""} /></label>
      <label className="field"><span>Categoría / línea</span><input name="category" defaultValue={project?.category ?? ""} /></label>
      <label className="field"><span>Responsable *</span><input name="ownerName" required defaultValue={project?.ownerName ?? ""} /></label>
      <label className="field"><span>Prioridad</span><select name="priority" defaultValue={project?.priority ?? "media"}>{ROADMAP_PRIORITIES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label className="field"><span>Estado</span><select name="status" defaultValue={project?.status ?? "no_iniciado"}>{ROADMAP_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label className="field"><span>Semáforo</span><select name="trafficLight" defaultValue={project?.trafficLight ?? "gris"}>{ROADMAP_TRAFFIC_LIGHTS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label className="field"><span>Inicio *</span><input type="date" name="startDate" required defaultValue={inputDate(project?.startDate)} /></label>
      <label className="field"><span>Fecha objetivo *</span><input type="date" name="targetDate" required defaultValue={inputDate(project?.targetDate)} /></label>
      <label className="field full"><span>Carpeta SharePoint</span><input type="url" name="sharepointUrl" defaultValue={project?.sharepointUrl ?? project?.sharepointFolderUrl ?? ""} /></label>
      <div className="actions full"><button className="button primary" type="submit">{submitLabel}</button></div>
    </form>
  );
}
