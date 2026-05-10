"use client";

import { useMemo, useState } from "react";
import {
  ROADMAP_PROJECT_TYPE_LABELS,
  ROADMAP_PROJECT_TYPE_MILESTONE_TEMPLATES,
  ROADMAP_PROJECT_TYPES,
} from "../constants";
import type { RoadmapMilestoneTemplate } from "../constants";
import type { RoadmapMilestoneTrackValue, RoadmapProjectTypeValue } from "../types";

const PREVIEW_TRACK_LABELS: Record<RoadmapMilestoneTrackValue, string> = {
  supply: "Producto / Operaciones",
  marketing: "Marketing",
};

const PREVIEW_TRACK_ORDER: RoadmapMilestoneTrackValue[] = ["supply", "marketing"];

type ProjectTemplatePreviewFieldProps = {
  defaultValue?: RoadmapProjectTypeValue;
  showPreview?: boolean;
};

type PreviewFlow = {
  track: RoadmapMilestoneTrackValue;
  label: string;
  milestones: readonly RoadmapMilestoneTemplate[];
};

function buildPreviewFlows(projectType: RoadmapProjectTypeValue): PreviewFlow[] {
  const templates = ROADMAP_PROJECT_TYPE_MILESTONE_TEMPLATES[projectType] ?? [];
  const templatesByTrack = templates.reduce<Partial<Record<RoadmapMilestoneTrackValue, RoadmapMilestoneTemplate[]>>>(
    (accumulator, template) => {
      accumulator[template.track] = [...(accumulator[template.track] ?? []), template];
      return accumulator;
    },
    {},
  );

  return PREVIEW_TRACK_ORDER.flatMap((track) => {
    const milestones = [...(templatesByTrack[track] ?? [])].sort((first, second) => first.sequence - second.sequence);
    if (milestones.length === 0) return [];
    return [{ track, label: PREVIEW_TRACK_LABELS[track], milestones }];
  });
}

export function ProjectTemplatePreviewField({
  defaultValue,
  showPreview = true,
}: ProjectTemplatePreviewFieldProps) {
  const [selectedProjectType, setSelectedProjectType] = useState<RoadmapProjectTypeValue | "">(defaultValue ?? "");
  const previewProjectType: RoadmapProjectTypeValue = selectedProjectType || "other";
  const previewFlows = useMemo(() => buildPreviewFlows(previewProjectType), [previewProjectType]);
  const selectedProjectTypeLabel = selectedProjectType ? ROADMAP_PROJECT_TYPE_LABELS[selectedProjectType] : "Selecciona tipo de proyecto";
  const isGenericPreview = previewProjectType === "other";

  return (
    <>
      <label className="field">
        <span>Tipo de proyecto</span>
        <select
          name="projectType"
          value={selectedProjectType}
          onChange={(event) => setSelectedProjectType(event.currentTarget.value as RoadmapProjectTypeValue)}
          required
        >
          <option value="" disabled>Selecciona tipo de proyecto</option>
          {ROADMAP_PROJECT_TYPES.map((item) => (
            <option key={item} value={item}>{ROADMAP_PROJECT_TYPE_LABELS[item]}</option>
          ))}
        </select>
      </label>

      {showPreview ? (
        <aside className="template-preview full" aria-live="polite">
          <div className="template-preview-heading">
            <div>
              <span>Vista previa de plantilla</span>
              <strong>{selectedProjectTypeLabel}</strong>
            </div>
            <p>Esta plantilla se aplicará al crear el proyecto. Luego podrás ajustar fechas, responsables e hitos desde el detalle. Cambiar el tipo después no regenerará hitos automáticamente.</p>
          </div>

          {isGenericPreview ? (
            <p className="template-preview-empty">La plantilla exacta se definirá al crear el proyecto.</p>
          ) : previewFlows.length > 0 ? (
            <div className="template-preview-flows">
              {previewFlows.map((flow) => (
                <section className="template-preview-flow" key={flow.track}>
                  <span className="badge template-preview-badge">
                    {flow.label} · {flow.milestones.length} {flow.milestones.length === 1 ? "hito" : "hitos"}
                  </span>
                  <ol className="template-preview-milestones" aria-label={`Secuencia de hitos de ${flow.label}`}>
                    {flow.milestones.map((milestone, index) => (
                      <li key={milestone.code}>
                        <span>{milestone.name}</span>
                        {index < flow.milestones.length - 1 ? <span className="template-preview-arrow" aria-hidden="true">→</span> : null}
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          ) : (
            <p className="template-preview-empty">La plantilla exacta se definirá al crear el proyecto.</p>
          )}

          <p className="template-preview-settings-hint" aria-disabled="true">Las plantillas podrán administrarse desde Configuración.</p>
        </aside>
      ) : null}
    </>
  );
}
