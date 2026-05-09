"use client";

import { useMemo, useState } from "react";

export type PlannerMilestoneStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "blocked";

export type PlannerMilestone = {
  id: string;
  name: string;
  ownerName: string | null;
  status: PlannerMilestoneStatus;
  statusLabel: string;
  approvalStatus: string | null;
  approvalLabel: string | null;
  plannedDate: string | null;
  dueDate: string | null;
  actualDate: string | null;
  isCritical: boolean;
  sequence: number;
  sortOrder: number;
};

export type PlannerFlow = {
  track: string;
  label: string;
  milestones: PlannerMilestone[];
};

type FlowDatePlannerProps = {
  flows: PlannerFlow[];
  projectStartDate: string;
  projectTargetDate: string;
  action: (formData: FormData) => Promise<void>;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toInputDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function displayDate(value: string | null): string {
  if (!value) return "Sin fecha";
  const date = parseDate(value);
  if (!date) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function milestoneDate(milestone: PlannerMilestone): string | null {
  return milestone.plannedDate ?? milestone.dueDate;
}

function dayOffset(startDate: Date, value: string | null): number {
  const date = parseDate(value);
  if (!date) return 0;
  return Math.round((date.getTime() - startDate.getTime()) / DAY_MS);
}

function addDays(startDate: Date, days: number): string {
  return toInputDate(new Date(startDate.getTime() + days * DAY_MS));
}

function midpointDate(start: Date, end: Date): string {
  return toInputDate(new Date(start.getTime() + Math.round((end.getTime() - start.getTime()) / 2)));
}

function nearestDatedMilestone(
  milestones: PlannerMilestone[],
  startIndex: number,
  direction: -1 | 1,
): PlannerMilestone | null {
  for (
    let index = startIndex + direction;
    index >= 0 && index < milestones.length;
    index += direction
  ) {
    if (milestoneDate(milestones[index])) return milestones[index];
  }
  return null;
}

function suggestedDate(args: {
  milestones: PlannerMilestone[];
  index: number;
  projectStartDate: Date;
  projectTargetDate: Date;
}): string | null {
  const { milestones, index, projectStartDate, projectTargetDate } = args;
  if (milestoneDate(milestones[index])) return null;

  const previous = nearestDatedMilestone(milestones, index, -1);
  const next = nearestDatedMilestone(milestones, index, 1);
  const previousDate = previous ? parseDate(milestoneDate(previous)) : null;
  const nextDate = next ? parseDate(milestoneDate(next)) : null;

  if (previousDate && nextDate) return midpointDate(previousDate, nextDate);
  if (previousDate) return midpointDate(previousDate, projectTargetDate);
  if (nextDate) return midpointDate(projectStartDate, nextDate);

  if (milestones.length === 1) return midpointDate(projectStartDate, projectTargetDate);
  const ratio = index / Math.max(milestones.length - 1, 1);
  return toInputDate(
    new Date(
      projectStartDate.getTime() +
        Math.round((projectTargetDate.getTime() - projectStartDate.getTime()) * ratio),
    ),
  );
}

function datePosition(startDate: Date, targetDate: Date, value: string): number {
  const start = startDate.getTime();
  const end = targetDate.getTime();
  const current = parseDate(value)?.getTime() ?? start;
  if (end <= start) return 0;
  return Math.min(100, Math.max(0, ((current - start) / (end - start)) * 100));
}

function handleClass(milestone: PlannerMilestone): string {
  if (milestone.status === "completed") return "milestone-completed";
  if (
    milestone.status === "blocked" ||
    milestone.isCritical ||
    milestone.approvalStatus === "rejected"
  ) {
    return "milestone-blocked";
  }
  if (milestone.status === "in_progress" || milestone.approvalStatus === "pending") {
    return "milestone-in_progress";
  }
  return "milestone-not_started";
}

function contextLabel(milestone: PlannerMilestone | null): string {
  if (!milestone) return "Sin hito";
  return `${milestone.name} · ${displayDate(milestoneDate(milestone))}`;
}

function dateCompare(a: string | null, b: string | null): number {
  const aDate = parseDate(a);
  const bDate = parseDate(b);
  if (!aDate || !bDate) return 0;
  return aDate.getTime() - bDate.getTime();
}

function warningsFor(args: {
  selectedDate: string | null;
  previous: PlannerMilestone | null;
  next: PlannerMilestone | null;
  milestone: PlannerMilestone;
  projectTargetDate: string;
}): string[] {
  const warnings: string[] = [];
  const previousDate = args.previous ? milestoneDate(args.previous) : null;
  const nextDate = args.next ? milestoneDate(args.next) : null;

  if (args.selectedDate && previousDate && dateCompare(args.selectedDate, previousDate) < 0) {
    warnings.push("Esta fecha queda antes del hito anterior.");
  }
  if (args.selectedDate && nextDate && dateCompare(args.selectedDate, nextDate) > 0) {
    warnings.push("Esta fecha queda después del hito siguiente.");
  }
  if (args.selectedDate && dateCompare(args.selectedDate, args.projectTargetDate) > 0) {
    warnings.push("Esta fecha supera la fecha objetivo del proyecto.");
  }
  if (!args.selectedDate && args.milestone.isCritical) {
    warnings.push("Este hito crítico no tiene fecha.");
  }
  return warnings;
}

function selectedDefaults(flows: PlannerFlow[]): Record<string, string> {
  return Object.fromEntries(
    flows.map((flow) => [
      flow.track,
      (flow.milestones.find((milestone) => milestone.status !== "completed") ??
        flow.milestones[0])?.id ?? "",
    ]),
  );
}

export function FlowDatePlanner({
  flows,
  projectStartDate,
  projectTargetDate,
  action,
}: FlowDatePlannerProps) {
  const [selectedByFlow, setSelectedByFlow] = useState<Record<string, string>>(() =>
    selectedDefaults(flows),
  );
  const projectStart = useMemo(() => parseDate(projectStartDate) ?? new Date(), [projectStartDate]);
  const projectTarget = useMemo(
    () => parseDate(projectTargetDate) ?? projectStart,
    [projectStart, projectTargetDate],
  );
  const maxDays = Math.max(0, Math.round((projectTarget.getTime() - projectStart.getTime()) / DAY_MS));
  const [draftDates, setDraftDates] = useState<Record<string, string>>({});

  return (
    <div className="date-planner-grid slider-planner-grid">
      {flows.map((flow) => {
        const selectedId = selectedByFlow[flow.track] || flow.milestones[0]?.id || "";
        const selectedIndex = Math.max(
          0,
          flow.milestones.findIndex((milestone) => milestone.id === selectedId),
        );
        const selectedMilestone = flow.milestones[selectedIndex];
        const datedMilestones = flow.milestones.filter((milestone) => milestoneDate(milestone));
        const undatedMilestones = flow.milestones.filter((milestone) => !milestoneDate(milestone));
        const progress = flow.milestones.length
          ? Math.round(
              (flow.milestones.filter((milestone) => milestone.status === "completed").length /
                flow.milestones.length) *
                100,
            )
          : 0;

        if (!selectedMilestone) {
          return (
            <article key={flow.track} className="date-planner-flow-card slider-planner-flow">
              <h3>{flow.label}</h3>
              <p className="muted">No hay hitos para planificar en este flujo.</p>
            </article>
          );
        }

        const previous = selectedIndex > 0 ? flow.milestones[selectedIndex - 1] : null;
        const next = selectedIndex < flow.milestones.length - 1 ? flow.milestones[selectedIndex + 1] : null;
        const suggestion = suggestedDate({
          milestones: flow.milestones,
          index: selectedIndex,
          projectStartDate: projectStart,
          projectTargetDate: projectTarget,
        });
        const selectedDate =
          draftDates[selectedMilestone.id] ?? milestoneDate(selectedMilestone) ?? suggestion ?? projectStartDate;
        const warnings = warningsFor({
          selectedDate,
          previous,
          next,
          milestone: selectedMilestone,
          projectTargetDate,
        });
        const rangeValue = Math.min(maxDays, Math.max(0, dayOffset(projectStart, selectedDate)));
        const inputId = `slider-planner-date-${flow.track}-${selectedMilestone.id}`;

        return (
          <article key={flow.track} className="date-planner-flow-card slider-planner-flow">
            <div className="date-planner-flow-header">
              <div>
                <h3>{flow.label}</h3>
                <p className="muted">
                  {datedMilestones.length} con fecha · {undatedMilestones.length} sin fecha
                </p>
              </div>
              <span className="date-planner-percent">{progress}%</span>
            </div>
            <div className="date-planner-stats" aria-label={`Resumen de fechas de ${flow.label}`}>
              <span>Total <strong>{flow.milestones.length}</strong></span>
              <span>Con fecha <strong>{datedMilestones.length}</strong></span>
              <span>Sin fecha <strong>{undatedMilestones.length}</strong></span>
            </div>
            <div className="slider-planner-scroll">
              <div className="slider-date-rail" aria-label={`Línea de fechas de ${flow.label}`}>
                <span className="slider-date-rail-line" aria-hidden="true" />
                <span className="slider-date-bound start">{displayDate(projectStartDate)}</span>
                <span className="slider-date-bound end">{displayDate(projectTargetDate)}</span>
                {datedMilestones.map((milestone) => {
                  const value = milestoneDate(milestone);
                  if (!value) return null;
                  return (
                    <button
                      key={milestone.id}
                      type="button"
                      className={`slider-milestone-handle ${handleClass(milestone)}${milestone.id === selectedMilestone.id ? " selected" : ""}`}
                      style={{ left: `${datePosition(projectStart, projectTarget, value)}%` }}
                      title={`${milestone.name} · ${displayDate(value)} · ${milestone.statusLabel}`}
                      aria-label={`Seleccionar ${milestone.name}`}
                      onClick={() => setSelectedByFlow((current) => ({ ...current, [flow.track]: milestone.id }))}
                    />
                  );
                })}
              </div>
            </div>
            {undatedMilestones.length > 0 ? (
              <div className="slider-undated-group" aria-label={`Hitos sin fecha de ${flow.label}`}>
                <strong>Sin fecha</strong>
                {undatedMilestones.map((milestone) => (
                  <button
                    key={milestone.id}
                    type="button"
                    className={`slider-undated-pill ${handleClass(milestone)}${milestone.id === selectedMilestone.id ? " selected" : ""}`}
                    onClick={() => setSelectedByFlow((current) => ({ ...current, [flow.track]: milestone.id }))}
                  >
                    {milestone.name}
                  </button>
                ))}
              </div>
            ) : null}
            <form action={action} className="slider-selected-editor">
              <input type="hidden" name="flowLabel" value={flow.label} />
              <div className="slider-selected-heading">
                <div>
                  <p className="eyebrow">Hito seleccionado</p>
                  <h4>{selectedMilestone.name}</h4>
                  <p>
                    {selectedMilestone.ownerName || "Sin responsable"} · {selectedMilestone.statusLabel}
                    {selectedMilestone.approvalLabel ? ` · ${selectedMilestone.approvalLabel}` : ""}
                  </p>
                </div>
                <span className={`badge ${handleClass(selectedMilestone)}`}>{displayDate(selectedDate)}</span>
              </div>
              <div className="slider-context-grid">
                <span><strong>Anterior:</strong> {contextLabel(previous)}</span>
                <span><strong>Actual:</strong> {contextLabel(selectedMilestone)}</span>
                <span><strong>Siguiente:</strong> {contextLabel(next)}</span>
              </div>
              <div className="slider-editor-controls">
                <label className="field">
                  <span>Fecha planificada</span>
                  <input
                    id={inputId}
                    type="date"
                    name={`plannedDate:${selectedMilestone.id}`}
                    value={selectedDate}
                    onChange={(event) =>
                      setDraftDates((current) => ({
                        ...current,
                        [selectedMilestone.id]: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field slider-range-field">
                  <span>Fecha en el flujo · {displayDate(selectedDate)}</span>
                  <input
                    type="range"
                    min={0}
                    max={maxDays}
                    step={1}
                    value={rangeValue}
                    data-min-date={projectStartDate}
                    data-max-date={projectTargetDate}
                    onChange={(event) =>
                      setDraftDates((current) => ({
                        ...current,
                        [selectedMilestone.id]: addDays(projectStart, Number(event.target.value)),
                      }))
                    }
                  />
                </label>
              </div>
              {warnings.length > 0 ? (
                <ul className="date-planner-warnings slider-warnings">
                  {warnings.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
              ) : null}
              <div className="date-planner-actions slider-editor-actions">
                {suggestion ? (
                  <button
                    className="date-planner-suggestion-button"
                    type="button"
                    onClick={() =>
                      setDraftDates((current) => ({ ...current, [selectedMilestone.id]: suggestion }))
                    }
                  >
                    Usar sugerida
                  </button>
                ) : null}
                <button className="button primary small" type="submit">
                  Guardar fecha
                </button>
              </div>
            </form>
          </article>
        );
      })}
    </div>
  );
}
