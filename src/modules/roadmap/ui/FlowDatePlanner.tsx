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

type DatePrecision = "day" | "fortnight" | "month";
type DayOffsetReference = "previous" | "saved" | "start" | "target";

const DAY_OFFSET_REFERENCE_LABELS: Record<DayOffsetReference, string> = {
  previous: "Hito anterior",
  saved: "Fecha guardada actual",
  start: "Inicio del proyecto",
  target: "Fecha objetivo",
};

const QUICK_DAY_OFFSETS = [7, 15, 30, 45];

const MONTH_LABELS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

const PRECISION_OPTIONS: Array<{ value: DatePrecision; label: string }> = [
  { value: "day", label: "Día exacto" },
  { value: "fortnight", label: "Quincena" },
  { value: "month", label: "Mes" },
];

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

function clampDate(value: Date, startDate: Date, targetDate: Date): Date {
  const min = startDate.getTime();
  const max = Math.max(min, targetDate.getTime());
  return new Date(Math.min(max, Math.max(min, value.getTime())));
}

function lastDayOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

function snapDate(value: string, precision: DatePrecision, startDate: Date, targetDate: Date): string {
  const date = parseDate(value);
  if (!date) return value;
  if (precision === "fortnight") {
    const day = date.getUTCDate() < 15 ? 1 : 15;
    return toInputDate(clampDate(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), day)), startDate, targetDate));
  }
  if (precision === "month") {
    return toInputDate(clampDate(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)), startDate, targetDate));
  }
  return toInputDate(clampDate(date, startDate, targetDate));
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

type TimelineMonth = {
  key: string;
  label: string;
  left: number;
  width: number;
  firstLeft: number;
  secondLeft: number;
};

function buildTimelineMonths(startDate: Date, targetDate: Date): TimelineMonth[] {
  const months: TimelineMonth[] = [];
  const cursor = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
  const endMonth = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), 1));

  while (cursor.getTime() <= endMonth.getTime()) {
    const monthStart = new Date(cursor);
    const monthEnd = lastDayOfMonth(monthStart);
    const visibleStart = clampDate(monthStart, startDate, targetDate);
    const visibleEnd = clampDate(monthEnd, startDate, targetDate);
    const left = datePosition(startDate, targetDate, toInputDate(visibleStart));
    const right = datePosition(startDate, targetDate, toInputDate(visibleEnd));
    const firstLeft = datePosition(startDate, targetDate, toInputDate(clampDate(monthStart, startDate, targetDate)));
    const secondLeft = datePosition(
      startDate,
      targetDate,
      toInputDate(clampDate(new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), 15)), startDate, targetDate)),
    );

    months.push({
      key: `${monthStart.getUTCFullYear()}-${monthStart.getUTCMonth()}`,
      label: MONTH_LABELS[monthStart.getUTCMonth()],
      left,
      width: Math.max(3, right - left),
      firstLeft,
      secondLeft,
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return months;
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

function impactSummary(args: {
  selectedDate: string | null;
  savedDate: string | null;
  previous: PlannerMilestone | null;
  next: PlannerMilestone | null;
  projectTargetDate: string;
}): string[] {
  const summary: string[] = [];
  if (args.selectedDate && args.savedDate) {
    const difference = Math.round(dateCompare(args.selectedDate, args.savedDate) / DAY_MS);
    if (difference > 0) summary.push(`Se mueve ${difference} días después.`);
    if (difference < 0) summary.push(`Se mueve ${Math.abs(difference)} días antes.`);
    if (difference === 0) summary.push("Mantiene la fecha guardada.");
  } else if (args.selectedDate) {
    summary.push("Agrega una fecha planificada al hito.");
  }

  const previousDate = args.previous ? milestoneDate(args.previous) : null;
  const nextDate = args.next ? milestoneDate(args.next) : null;
  if (args.selectedDate && previousDate && dateCompare(args.selectedDate, previousDate) >= 0) {
    summary.push("Queda después del hito anterior.");
  }
  if (args.selectedDate && nextDate && dateCompare(args.selectedDate, nextDate) <= 0) {
    summary.push("Queda antes del hito siguiente.");
  }
  if (args.selectedDate && dateCompare(args.selectedDate, args.projectTargetDate) <= 0) {
    summary.push("No supera la fecha objetivo.");
  }
  return summary;
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
  const [quickAdjustment, setQuickAdjustment] = useState<{ days: string; reference: DayOffsetReference }>({
    days: "15",
    reference: "previous",
  });
  const [quickAdjustmentMessages, setQuickAdjustmentMessages] = useState<Record<string, string>>({});
  const [precision, setPrecision] = useState<DatePrecision>("day");
  const timelineMonths = useMemo(() => buildTimelineMonths(projectStart, projectTarget), [projectStart, projectTarget]);

  return (
    <div className="date-planner-shell">
      <div className="date-planner-toolbar" aria-label="Precisión del planificador">
        <span>Precisión:</span>
        {PRECISION_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={precision === option.value ? "active" : ""}
            onClick={() => setPrecision(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
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
        const savedDate = milestoneDate(selectedMilestone);
        const suggestedPreviewDate = suggestion ?? savedDate ?? projectStartDate;
        const selectedDate = draftDates[selectedMilestone.id] ?? savedDate ?? suggestion ?? projectStartDate;
        const hasPreviewChange = selectedDate !== savedDate;
        const warnings = warningsFor({
          selectedDate,
          previous,
          next,
          milestone: selectedMilestone,
          projectTargetDate,
        });
        const impact = impactSummary({ selectedDate, savedDate, previous, next, projectTargetDate });
        const rangeValue = Math.min(maxDays, Math.max(0, dayOffset(projectStart, selectedDate)));
        const inputId = `slider-planner-date-${flow.track}-${selectedMilestone.id}`;
        const selectedPreviewDate = parseDate(selectedDate) ?? projectStart;
        const previousDate = previous ? milestoneDate(previous) : null;
        const quickReferences: Array<{ value: DayOffsetReference; label: string; date: string | null }> = [
          { value: "previous", label: DAY_OFFSET_REFERENCE_LABELS.previous, date: previousDate },
          { value: "saved", label: DAY_OFFSET_REFERENCE_LABELS.saved, date: savedDate },
          { value: "start", label: DAY_OFFSET_REFERENCE_LABELS.start, date: projectStartDate },
          { value: "target", label: DAY_OFFSET_REFERENCE_LABELS.target, date: projectTargetDate },
        ];
        const activeQuickReference =
          quickReferences.find((reference) => reference.value === quickAdjustment.reference && reference.date) ??
          quickReferences.find((reference) => reference.date);
        const activeQuickReferenceDate = activeQuickReference?.date ?? projectStartDate;
        const activeQuickReferenceLabel = activeQuickReference?.label ?? DAY_OFFSET_REFERENCE_LABELS.start;
        const setPreviewDate = (value: string, quickMessage?: string) => {
          setDraftDates((current) => ({ ...current, [selectedMilestone.id]: value }));
          setQuickAdjustmentMessages((current) => {
            if (quickMessage) return { ...current, [selectedMilestone.id]: quickMessage };
            const { [selectedMilestone.id]: _removed, ...remaining } = current;
            return remaining;
          });
        };
        const applyPreviewDate = (value: string) =>
          setPreviewDate(snapDate(value, precision, projectStart, projectTarget));
        const setExactPreviewDate = (value: string) => setPreviewDate(value);
        const applyDayOffset = (daysValue = quickAdjustment.days) => {
          const parsedDays = Number.parseInt(daysValue, 10);
          const safeDays = Number.isNaN(parsedDays) ? 0 : Math.min(365, Math.max(0, parsedDays));
          const referenceDate = parseDate(activeQuickReferenceDate) ?? projectStart;
          const previewDate = addDays(referenceDate, safeDays);
          setQuickAdjustment((current) => ({ ...current, days: String(safeDays) }));
          setPreviewDate(previewDate, `Vista previa: ${safeDays} días después de ${activeQuickReferenceLabel}.`);
        };

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
                <div className="slider-time-scale" aria-hidden="true">
                  <div className="slider-month-row">
                    {timelineMonths.map((month) => (
                      <span
                        key={month.key}
                        className="slider-month-label"
                        style={{ left: `${month.left}%`, width: `${month.width}%` }}
                      >
                        {month.label}
                      </span>
                    ))}
                  </div>
                  <div className="slider-fortnight-row">
                    {timelineMonths.map((month) => (
                      <span key={`${month.key}-first`} style={{ left: `${month.firstLeft}%` }}>1ª</span>
                    ))}
                    {timelineMonths.map((month) => (
                      <span key={`${month.key}-second`} style={{ left: `${month.secondLeft}%` }}>2ª</span>
                    ))}
                  </div>
                </div>
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
                      title={`${milestone.name} guardado · ${displayDate(value)} · ${milestone.statusLabel}`}
                      aria-label={`Seleccionar ${milestone.name}`}
                      onClick={() => setSelectedByFlow((current) => ({ ...current, [flow.track]: milestone.id }))}
                    />
                  );
                })}
                {hasPreviewChange ? (
                  <button
                    type="button"
                    className={`slider-milestone-handle preview selected ${handleClass(selectedMilestone)}`}
                    style={{ left: `${datePosition(projectStart, projectTarget, selectedDate)}%` }}
                    title={`${selectedMilestone.name} en vista previa · ${displayDate(selectedDate)}`}
                    aria-label={`Vista previa para ${selectedMilestone.name}`}
                    onClick={() => setSelectedByFlow((current) => ({ ...current, [flow.track]: selectedMilestone.id }))}
                  />
                ) : null}
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
                <span className={`badge ${handleClass(selectedMilestone)}`}>
                  {hasPreviewChange ? "Vista previa " : "Guardada "}{displayDate(selectedDate)}
                </span>
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
                    onChange={(event) => applyPreviewDate(event.target.value)}
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
                    onChange={(event) => applyPreviewDate(addDays(projectStart, Number(event.target.value)))}
                  />
                </label>
              </div>
              <p className={`slider-impact-line${warnings.length > 0 ? " warning" : ""}`}>
                <strong>Impacto:</strong> {[quickAdjustmentMessages[selectedMilestone.id], ...impact].filter(Boolean).slice(0, 3).join(" · ")}
              </p>
              {warnings.length > 0 ? (
                <ul className="date-planner-warnings slider-warnings">
                  {warnings.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
              ) : null}
              <div className="slider-day-adjust" aria-label={`Ajuste rápido por días para ${selectedMilestone.name}`}>
                <strong>Ajuste rápido</strong>
                <label>
                  <input
                    type="number"
                    min={0}
                    max={365}
                    step={1}
                    value={quickAdjustment.days}
                    onChange={(event) => setQuickAdjustment((current) => ({ ...current, days: event.target.value }))}
                  />
                  días después de
                </label>
                <select
                  value={activeQuickReference?.value ?? quickAdjustment.reference}
                  onChange={(event) =>
                    setQuickAdjustment((current) => ({
                      ...current,
                      reference: event.target.value as DayOffsetReference,
                    }))
                  }
                >
                  {quickReferences.map((reference) => (
                    <option key={reference.value} value={reference.value} disabled={!reference.date}>
                      {reference.label}{reference.date ? "" : " (no disponible)"}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => applyDayOffset()}>Aplicar</button>
                <div className="slider-day-chips" aria-label="Atajos de días">
                  {QUICK_DAY_OFFSETS.map((days) => (
                    <button key={days} type="button" onClick={() => applyDayOffset(String(days))}>
                      +{days} días
                    </button>
                  ))}
                </div>
              </div>
              <div className="date-planner-actions slider-editor-actions">
                <div className="slider-quick-actions" aria-label={`Acciones rápidas para ${selectedMilestone.name}`}>
                  <button className="date-planner-suggestion-button" type="button" onClick={() => setExactPreviewDate(suggestedPreviewDate)}>
                    Usar sugerida
                  </button>
                  <button type="button" onClick={() => setExactPreviewDate(toInputDate(new Date(Date.UTC(selectedPreviewDate.getUTCFullYear(), selectedPreviewDate.getUTCMonth(), 1))))}>
                    1ª quincena
                  </button>
                  <button type="button" onClick={() => setExactPreviewDate(toInputDate(new Date(Date.UTC(selectedPreviewDate.getUTCFullYear(), selectedPreviewDate.getUTCMonth(), 15))))}>
                    2ª quincena
                  </button>
                  <button type="button" onClick={() => setExactPreviewDate(toInputDate(lastDayOfMonth(selectedPreviewDate)))}>
                    Fin de mes
                  </button>
                  <button type="button" onClick={() => setExactPreviewDate(projectTargetDate)}>
                    Fecha objetivo
                  </button>
                </div>
                <button className="button primary small" type="submit">
                  Guardar fecha
                </button>
              </div>
            </form>
          </article>
        );
      })}
      </div>
    </div>
  );
}
