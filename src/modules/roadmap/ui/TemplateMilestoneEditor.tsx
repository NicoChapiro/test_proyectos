"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RoadmapMilestoneTrackValue } from "../types";

type EditableMilestone = {
  id: string;
  flowTrack: RoadmapMilestoneTrackValue;
  name: string;
  suggestedOwner: string;
  approvalRequired: boolean;
  isCritical: boolean;
  suggestedOffsetDays: string;
  dateMode: "point" | "range";
  suggestedStartOffsetDays: string;
  suggestedEndOffsetDays: string;
  notes: string;
};

type FlowDefinition = {
  track: RoadmapMilestoneTrackValue;
  label: string;
};

type Props = {
  initialMilestonesText: string;
};

const FLOWS: FlowDefinition[] = [
  { track: "supply", label: "Producto / Operaciones" },
  { track: "marketing", label: "Marketing" },
];

function createEmptyMilestone(flowTrack: RoadmapMilestoneTrackValue): EditableMilestone {
  return {
    id: `${flowTrack}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    flowTrack,
    name: "",
    suggestedOwner: "",
    approvalRequired: false,
    isCritical: false,
    suggestedOffsetDays: "",
    dateMode: "point",
    suggestedStartOffsetDays: "",
    suggestedEndOffsetDays: "",
    notes: "",
  };
}

function sanitizePipeField(value: string): string {
  return value.replace(/[|\r\n]+/g, " ").trim();
}

function serializeMilestones(milestones: EditableMilestone[]): string {
  return milestones
    .map((milestone) =>
      [
        milestone.flowTrack,
        sanitizePipeField(milestone.name),
        sanitizePipeField(milestone.suggestedOwner),
        milestone.approvalRequired ? "true" : "false",
        milestone.isCritical ? "true" : "false",
        sanitizePipeField(milestone.suggestedOffsetDays),
        sanitizePipeField(milestone.notes),
        milestone.dateMode,
        sanitizePipeField(milestone.suggestedStartOffsetDays),
        sanitizePipeField(milestone.suggestedEndOffsetDays),
      ].join(" | "),
    )
    .join("\n");
}

function parseMilestones(lines: string): EditableMilestone[] {
  return lines
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [flowTrackRaw, nameRaw, ownerRaw, approvalRaw, criticalRaw, offsetRaw, notesRaw, dateModeRaw, startOffsetRaw, endOffsetRaw] = line
        .split("|")
        .map((part) => part.trim());
      const flowTrack = flowTrackRaw === "marketing" ? "marketing" : "supply";

      return {
        id: `${flowTrack}-${index}`,
        flowTrack,
        name: nameRaw ?? "",
        suggestedOwner: ownerRaw ?? "",
        approvalRequired: approvalRaw === "true" || approvalRaw === "1" || approvalRaw === "on",
        isCritical: criticalRaw === "true" || criticalRaw === "1" || criticalRaw === "on",
        suggestedOffsetDays: offsetRaw ?? "",
        dateMode: dateModeRaw === "range" ? "range" : "point",
        suggestedStartOffsetDays: startOffsetRaw ?? "",
        suggestedEndOffsetDays: endOffsetRaw ?? "",
        notes: notesRaw ?? "",
      };
    });
}

function milestoneValidationMessage(milestones: EditableMilestone[]): string {
  if (milestones.length === 0) return "Agrega al menos un hito de plantilla.";
  const missingNameIndex = milestones.findIndex((milestone) => milestone.name.trim().length === 0);
  if (missingNameIndex >= 0) return `Completa el nombre del hito ${missingNameIndex + 1}.`;
  const invalidOffsetIndex = milestones.findIndex((milestone) => {
    const offsets = milestone.dateMode === "range"
      ? [milestone.suggestedStartOffsetDays, milestone.suggestedEndOffsetDays]
      : [milestone.suggestedOffsetDays];
    return offsets.some((offset) => offset.trim().length > 0 && !Number.isFinite(Number(offset)));
  });
  if (invalidOffsetIndex >= 0) return `Los días del hito ${invalidOffsetIndex + 1} deben ser numéricos o quedar en blanco.`;
  const invalidRangeIndex = milestones.findIndex((milestone) => {
    if (milestone.dateMode !== "range") return false;
    const start = milestone.suggestedStartOffsetDays.trim();
    const end = milestone.suggestedEndOffsetDays.trim();
    return start.length > 0 && end.length > 0 && Number(end) < Number(start);
  });
  if (invalidRangeIndex >= 0) return `El término del hito ${invalidRangeIndex + 1} debe ser mayor o igual al inicio.`;
  return "";
}

export function TemplateMilestoneEditor({ initialMilestonesText }: Props) {
  const hiddenInputRef = useRef<HTMLTextAreaElement>(null);
  const [milestones, setMilestones] = useState<EditableMilestone[]>(() => parseMilestones(initialMilestonesText));
  const serializedMilestones = useMemo(() => serializeMilestones(milestones), [milestones]);
  const validationMessage = useMemo(() => milestoneValidationMessage(milestones), [milestones]);

  useEffect(() => {
    hiddenInputRef.current?.setCustomValidity(validationMessage);
  }, [validationMessage]);

  function updateMilestone(id: string, changes: Partial<EditableMilestone>) {
    setMilestones((current) =>
      current.map((milestone) => (milestone.id === id ? { ...milestone, ...changes } : milestone)),
    );
  }

  function addMilestone(flowTrack: RoadmapMilestoneTrackValue) {
    setMilestones((current) => [...current, createEmptyMilestone(flowTrack)]);
  }

  function removeMilestone(id: string) {
    setMilestones((current) => current.filter((milestone) => milestone.id !== id));
  }

  function moveMilestone(id: string, direction: -1 | 1) {
    setMilestones((current) => {
      const milestone = current.find((item) => item.id === id);
      if (!milestone) return current;
      const flowMilestones = current.filter((item) => item.flowTrack === milestone.flowTrack);
      const flowIndex = flowMilestones.findIndex((item) => item.id === id);
      const targetFlowMilestone = flowMilestones[flowIndex + direction];
      if (!targetFlowMilestone) return current;

      const next = [...current];
      const currentIndex = next.findIndex((item) => item.id === id);
      const targetIndex = next.findIndex((item) => item.id === targetFlowMilestone.id);
      [next[currentIndex], next[targetIndex]] = [next[targetIndex], next[currentIndex]];
      return next;
    });
  }

  return (
    <div className="template-milestone-editor full">
      <textarea
        ref={hiddenInputRef}
        aria-hidden="true"
        className="template-milestone-hidden-input"
        name="milestonesText"
        readOnly
        required
        tabIndex={-1}
        value={serializedMilestones}
      />
      {validationMessage ? <p className="template-milestone-alert">{validationMessage}</p> : null}

      <div className="template-milestone-flows">
        {FLOWS.map((flow) => {
          const flowMilestones = milestones.filter((milestone) => milestone.flowTrack === flow.track);

          return (
            <section className="template-milestone-flow" key={flow.track}>
              <header className="template-milestone-flow-header">
                <div>
                  <span>Flujo</span>
                  <strong>
                    {flow.label} · {flowMilestones.length} {flowMilestones.length === 1 ? "hito" : "hitos"}
                  </strong>
                </div>
                <button className="button small secondary" type="button" onClick={() => addMilestone(flow.track)}>
                  + Agregar hito a {flow.label}
                </button>
              </header>

              <div className="template-milestone-list">
                {flowMilestones.length === 0 ? (
                  <p className="template-milestone-empty">Agrega al menos un hito si esta plantilla necesita este flujo.</p>
                ) : (
                  flowMilestones.map((milestone, index) => (
                    <article className="template-milestone-row" key={milestone.id}>
                      <div className="template-milestone-order" aria-label={`Orden ${index + 1}`}>
                        {index + 1}
                      </div>
                      <label className="field template-milestone-name">
                        <span>Nombre <em>*</em></span>
                        <input
                          required
                          value={milestone.name}
                          onChange={(event) => updateMilestone(milestone.id, { name: event.target.value })}
                        />
                      </label>
                      <label className="field template-milestone-owner">
                        <span>Responsable sugerido</span>
                        <input
                          value={milestone.suggestedOwner}
                          onChange={(event) => updateMilestone(milestone.id, { suggestedOwner: event.target.value })}
                        />
                      </label>
                      <label className="field template-milestone-date-mode">
                        <span>Tipo de hito</span>
                        <select
                          value={milestone.dateMode}
                          onChange={(event) => updateMilestone(milestone.id, { dateMode: event.target.value as "point" | "range" })}
                        >
                          <option value="point">Puntual · una fecha clave</option>
                          <option value="range">Con duración · actividad con inicio y término</option>
                        </select>
                      </label>
                      {milestone.dateMode === "point" ? (
                        <label className="field template-milestone-offset">
                          <span>Día desde inicio</span>
                          <input
                            inputMode="numeric"
                            type="number"
                            value={milestone.suggestedOffsetDays}
                            onChange={(event) => updateMilestone(milestone.id, { suggestedOffsetDays: event.target.value })}
                          />
                        </label>
                      ) : (
                        <div className="template-milestone-range-fields">
                          <label className="field template-milestone-offset">
                            <span>Inicio: día</span>
                            <input
                              inputMode="numeric"
                              type="number"
                              value={milestone.suggestedStartOffsetDays}
                              onChange={(event) => updateMilestone(milestone.id, { suggestedStartOffsetDays: event.target.value })}
                            />
                          </label>
                          <label className="field template-milestone-offset">
                            <span>Término: día</span>
                            <input
                              inputMode="numeric"
                              type="number"
                              value={milestone.suggestedEndOffsetDays}
                              onChange={(event) => updateMilestone(milestone.id, { suggestedEndOffsetDays: event.target.value })}
                            />
                          </label>
                          <span className="template-milestone-duration">
                            Duración: {Number.isFinite(Number(milestone.suggestedStartOffsetDays)) && Number.isFinite(Number(milestone.suggestedEndOffsetDays)) && milestone.suggestedStartOffsetDays !== "" && milestone.suggestedEndOffsetDays !== "" ? Math.max(0, Number(milestone.suggestedEndOffsetDays) - Number(milestone.suggestedStartOffsetDays) + 1) : "—"} días
                          </span>
                        </div>
                      )}
                      <label className="template-milestone-check">
                        <input
                          checked={milestone.approvalRequired}
                          type="checkbox"
                          onChange={(event) => updateMilestone(milestone.id, { approvalRequired: event.target.checked })}
                        />
                        <span>Requiere aprobación</span>
                      </label>
                      <label className="template-milestone-check">
                        <input
                          checked={milestone.isCritical}
                          type="checkbox"
                          onChange={(event) => updateMilestone(milestone.id, { isCritical: event.target.checked })}
                        />
                        <span>Hito crítico</span>
                      </label>
                      <label className="field template-milestone-notes">
                        <span>Notas</span>
                        <input
                          value={milestone.notes}
                          onChange={(event) => updateMilestone(milestone.id, { notes: event.target.value })}
                        />
                      </label>
                      <div className="template-milestone-actions" aria-label={`Acciones para ${milestone.name || "hito"}`}>
                        <button className="button small secondary" type="button" disabled={index === 0} onClick={() => moveMilestone(milestone.id, -1)} aria-label="Subir hito">
                          ↑
                        </button>
                        <button className="button small secondary" type="button" disabled={index === flowMilestones.length - 1} onClick={() => moveMilestone(milestone.id, 1)} aria-label="Bajar hito">
                          ↓
                        </button>
                        <button className="button small danger-button" type="button" onClick={() => removeMilestone(milestone.id)}>
                          Quitar
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      <details className="template-milestone-advanced">
        <summary>Modo avanzado</summary>
        <label className="field full">
          <span>Formato compatible</span>
          <textarea
            className="template-lines-input"
            value={serializedMilestones}
            onChange={(event) => setMilestones(parseMilestones(event.target.value))}
          />
        </label>
      </details>
    </div>
  );
}
