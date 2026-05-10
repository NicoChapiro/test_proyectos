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
  defaultValue: RoadmapProjectTypeValue;
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
  const [selectedProjectType, setSelectedProjectType] = useState(defaultValue);
  const previewFlows = useMemo(() => buildPreviewFlows(selectedProjectType), [selectedProjectType]);
  const selectedProjectTypeLabel = ROADMAP_PROJECT_TYPE_LABELS[selectedProjectType];

  return (
    <>
      <label className="field">
        <span>Tipo de proyecto</span>
        <select
          name="projectType"
          value={selectedProjectType}
          onChange={(event) => setSelectedProjectType(event.currentTarget.value as RoadmapProjectTypeValue)}
        >
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
            <p>Estos flujos se crearán al guardar el proyecto. Luego podrás ajustar fechas, responsables e hitos desde el detalle.</p>
          </div>

          {previewFlows.length > 0 ? (
            <div className="template-preview-flows">
              {previewFlows.map((flow) => (
                <section className="template-preview-flow" key={flow.track}>
                  <span className="badge template-preview-badge">
                    {flow.label} · {flow.milestones.length} {flow.milestones.length === 1 ? "hito" : "hitos"}
                  </span>
                  <ul className="template-preview-milestones" aria-label={`Hitos de ${flow.label}`}>
                    {flow.milestones.map((milestone) => (
                      <li key={milestone.code}>{milestone.name}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <p className="template-preview-empty">La plantilla exacta se definirá al crear el proyecto.</p>
          )}
        </aside>
      ) : null}
    </>
  );
}
