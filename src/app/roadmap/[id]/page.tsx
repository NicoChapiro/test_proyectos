import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ROADMAP_APPROVAL_STATUS_LABELS,
  ROADMAP_APPROVAL_STATUSES,
  ROADMAP_MILESTONE_STATUS_LABELS,
  ROADMAP_MILESTONE_STATUSES,
  ROADMAP_PRIORITY_LABELS,
  ROADMAP_PROJECT_TYPE_LABELS,
  ROADMAP_STATUS_LABELS,
  ROADMAP_TRAFFIC_LIGHT_LABELS,
} from "@/modules/roadmap/constants";
import { RoadmapNotFoundError } from "@/modules/roadmap/errors";
import {
  buildRoadmapProjectInsights,
  type RoadmapProjectInsights,
} from "@/modules/roadmap/insights";
import {
  findRoadmapProject,
  getRoadmapProjectActivity,
} from "@/modules/roadmap/service";
import {
  buildYearTimelineScale,
  clampYearPercent,
  displayDate,
  displayPlannedDate,
  inputDate,
} from "@/modules/roadmap/ui/date";
import {
  FlowDatePlanner,
  type PlannerFlow,
} from "@/modules/roadmap/ui/FlowDatePlanner";
import { ProjectDetailActionButton } from "@/modules/roadmap/ui/ProjectDetailActions";
import { ProjectForm } from "@/modules/roadmap/ui/ProjectForm";
import {
  displayApprovalStatus,
  displayMilestoneName,
  displayMilestoneStatus,
  displayTrackLabel,
} from "@/modules/roadmap/ui/labels";
import { AppShell, SummaryMetricCard } from "@/modules/roadmap/ui/shell";
import type {
  RoadmapApprovalStatusValue,
  RoadmapBulkOwnerAssignmentScope,
  RoadmapMilestoneStatusValue,
  RoadmapMilestoneTrackValue,
} from "@/modules/roadmap/types";
import {
  bulkAssignMilestoneOwnersAction,
  createMilestoneAction,
  updateMilestonePlannerDatesAction,
  updateMilestoneStatusAction,
  updateRoadmapProjectAction,
} from "../actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = { params: Promise<{ id: string }> };
type Project = Awaited<ReturnType<typeof findRoadmapProject>>;
type Milestone = Project["milestones"][number];
type ActivityLog = Awaited<
  ReturnType<typeof getRoadmapProjectActivity>
>[number];

const BULK_ASSIGNMENT_SCOPE_OPTIONS: Array<{
  value: RoadmapBulkOwnerAssignmentScope;
  label: string;
}> = [
  { value: "all_unassigned", label: "Todos los hitos sin responsable" },
  {
    value: "supply_unassigned",
    label: "Operaciones / Proveedor sin responsable",
  },
  {
    value: "marketing_unassigned",
    label: "Marketing / Campaña sin responsable",
  },
  {
    value: "pending_approvals_unassigned",
    label: "Aprobaciones pendientes sin responsable",
  },
  { value: "upcoming_unassigned", label: "Próximos 7 días sin responsable" },
];

type BulkAssignmentCounts = {
  all: number;
  supply: number;
  marketing: number;
  pendingApprovals: number;
  upcoming: number;
};

function startOfUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function isMilestoneAssignable(milestone: Milestone): boolean {
  return milestone.status !== "completed" && !milestone.ownerName?.trim();
}

function isMilestoneUpcomingForBulkAssignment(milestone: Milestone): boolean {
  if (!milestone.plannedDate) return false;
  const todayStart = startOfUtcDay(new Date());
  const upcomingEnd = todayStart + 8 * 24 * 60 * 60 * 1000;
  const plannedDate = new Date(milestone.plannedDate);
  const plannedDay = startOfUtcDay(plannedDate);
  return plannedDay >= todayStart && plannedDay < upcomingEnd;
}

function buildBulkAssignmentCounts(
  milestones: Milestone[],
): BulkAssignmentCounts {
  const assignableMilestones = milestones.filter(isMilestoneAssignable);
  return {
    all: assignableMilestones.length,
    supply: assignableMilestones.filter(
      (milestone) => milestone.track === "supply",
    ).length,
    marketing: assignableMilestones.filter(
      (milestone) => milestone.track === "marketing",
    ).length,
    pendingApprovals: assignableMilestones.filter(
      (milestone) => milestone.approvalStatus === "pending",
    ).length,
    upcoming: assignableMilestones.filter(isMilestoneUpcomingForBulkAssignment)
      .length,
  };
}

function BulkAssignmentCount({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <span className={`bulk-assignment-count${value === 0 ? " muted" : ""}`}>
      {label}: <strong>{value}</strong>
    </span>
  );
}

function BulkAssignmentPanel({
  action,
  counts,
}: {
  action: (formData: FormData) => Promise<void>;
  counts: BulkAssignmentCounts;
}) {
  return (
    <section className="panel bulk-assignment-card" id="asignacion-rapida">
      <div className="section-title compact">
        <div>
          <p className="eyebrow">Administración</p>
          <h2>Asignación rápida</h2>
          <p className="muted">
            Asigna responsables a hitos pendientes sin dueño.
          </p>
        </div>
      </div>
      <div
        className="bulk-assignment-counts"
        aria-label="Hitos disponibles para asignación rápida"
      >
        <BulkAssignmentCount label="Sin responsable" value={counts.all} />
        <BulkAssignmentCount label="Operaciones" value={counts.supply} />
        <BulkAssignmentCount label="Marketing" value={counts.marketing} />
        <BulkAssignmentCount
          label="Aprobaciones pendientes"
          value={counts.pendingApprovals}
        />
        <BulkAssignmentCount label="Próximos 7 días" value={counts.upcoming} />
      </div>
      <form action={action} className="grid bulk-assignment-form">
        <label className="field">
          <span>Responsable(s)</span>
          <input name="ownerName" required placeholder="Ej: Mario, Rodolfo" />
        </label>
        <label className="field">
          <span>Alcance</span>
          <select name="scope" defaultValue="all_unassigned">
            {BULK_ASSIGNMENT_SCOPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <p className="muted bulk-assignment-helper full">
          Puedes ingresar uno o más responsables, separados por coma. Solo se
          actualizarán hitos pendientes sin responsable. No se sobrescriben
          responsables existentes.
        </p>
        <button className="button primary" type="submit">
          Asignar responsable(s)
        </button>
      </form>
    </section>
  );
}

function buildProjectSummary(milestones: Milestone[]) {
  const total = milestones.length;
  const completed = milestones.filter(
    (milestone) => milestone.status === "completed",
  ).length;
  const blocked = milestones.filter(
    (milestone) => milestone.status === "blocked",
  ).length;
  const pending = milestones.filter(
    (milestone) => milestone.status !== "completed",
  ).length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, pending, blocked, progress };
}

type ProjectFlow = {
  track: RoadmapMilestoneTrackValue;
  label: string;
  milestones: Milestone[];
};

type DatedFlowMilestone = {
  milestone: Milestone;
  date: Date;
  left: number;
};

const FLOW_LABELS: Partial<Record<RoadmapMilestoneTrackValue, string>> = {
  supply: "Producto / Operaciones",
  marketing: "Marketing",
};
const KNOWN_FLOW_ORDER: RoadmapMilestoneTrackValue[] = ["supply", "marketing"];
const FLOW_LABEL_LIMIT = 2;
const FLOW_LABEL_MIN_GAP = 8;
const FLOW_CLUSTER_GAP = 2;

type FlowMilestoneCluster = {
  id: string;
  milestones: DatedFlowMilestone[];
  left: number;
  date: Date;
};

type FlowLabelCandidate = FlowMilestoneCluster & {
  label: string;
  priority: number;
};

function flowLabel(track: RoadmapMilestoneTrackValue): string {
  return FLOW_LABELS[track] ?? displayTrackLabel(track) ?? "Otros";
}

function milestoneWorkflowValue(milestone: Milestone): number {
  return milestone.sequence || milestone.sortOrder || Number.MAX_SAFE_INTEGER;
}

function milestoneTimelineDate(milestone: Milestone): Date | null {
  const value = milestone.dateMode === "range"
    ? milestone.plannedEndDate ?? milestone.plannedStartDate ?? milestone.plannedDate ?? milestone.dueDate
    : milestone.plannedDate ?? milestone.dueDate;
  return value ? new Date(value) : null;
}

function milestoneTimelineStartDate(milestone: Milestone): Date | null {
  const value = milestone.dateMode === "range" ? milestone.plannedStartDate ?? milestone.plannedDate ?? milestone.dueDate : milestone.plannedDate ?? milestone.dueDate;
  return value ? new Date(value) : null;
}

function milestoneTimelineEndDate(milestone: Milestone): Date | null {
  const value = milestone.dateMode === "range" ? milestone.plannedEndDate ?? milestone.plannedDate ?? milestone.dueDate : milestone.plannedDate ?? milestone.dueDate;
  return value ? new Date(value) : null;
}

function milestoneDurationDays(milestone: Milestone): number | null {
  const start = milestoneTimelineStartDate(milestone);
  const end = milestoneTimelineEndDate(milestone);
  if (!start || !end) return null;
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1);
}

function displayMilestonePlannedRange(milestone: Milestone): string {
  if (milestone.dateMode !== "range") return displayPlannedDate(milestoneTimelineDate(milestone));
  const duration = milestoneDurationDays(milestone);
  return `${displayPlannedDate(milestoneTimelineStartDate(milestone))} → ${displayPlannedDate(milestoneTimelineEndDate(milestone))}${duration ? ` · ${duration} días` : ""}`;
}

function buildProjectFlows(milestones: Milestone[]): ProjectFlow[] {
  const grouped = new Map<RoadmapMilestoneTrackValue, Milestone[]>();
  for (const milestone of milestones) {
    const track = milestone.track;
    grouped.set(track, [...(grouped.get(track) ?? []), milestone]);
  }

  return Array.from(grouped.entries())
    .map(([track, flowMilestones]) => ({
      track,
      label: flowLabel(track),
      milestones: [...flowMilestones].sort(
        (a, b) =>
          milestoneWorkflowValue(a) - milestoneWorkflowValue(b) ||
          Number(milestoneTimelineDate(a) ?? 0) -
            Number(milestoneTimelineDate(b) ?? 0),
      ),
    }))
    .sort((a, b) => {
      const aKnown = KNOWN_FLOW_ORDER.indexOf(a.track);
      const bKnown = KNOWN_FLOW_ORDER.indexOf(b.track);
      if (aKnown !== -1 || bKnown !== -1) {
        return (aKnown === -1 ? 99 : aKnown) - (bKnown === -1 ? 99 : bKnown);
      }
      return a.label.localeCompare(b.label, "es");
    });
}

function buildDatedFlowMilestones(
  milestones: Milestone[],
  year: number,
): DatedFlowMilestone[] {
  return milestones
    .map((milestone) => {
      const date = milestoneTimelineDate(milestone);
      if (!date) return null;
      return { milestone, date, left: clampYearPercent(date, year) };
    })
    .filter((item): item is DatedFlowMilestone => Boolean(item))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

function buildFlowMilestoneClusters(
  datedMilestones: DatedFlowMilestone[],
): FlowMilestoneCluster[] {
  return datedMilestones.reduce<FlowMilestoneCluster[]>((clusters, item) => {
    const current = clusters.at(-1);
    if (current && Math.abs(item.left - current.left) <= FLOW_CLUSTER_GAP) {
      const milestones = [...current.milestones, item];
      current.milestones = milestones;
      current.left =
        milestones.reduce((total, milestone) => total + milestone.left, 0) /
        milestones.length;
      current.date = milestones[0].date;
      current.id = milestones.map(({ milestone }) => milestone.id).join("-");
      return clusters;
    }

    return [
      ...clusters,
      {
        id: item.milestone.id,
        milestones: [item],
        left: item.left,
        date: item.date,
      },
    ];
  }, []);
}

function flowProgress(milestones: Milestone[]): number {
  if (milestones.length === 0) return 0;
  const completed = milestones.filter(
    (milestone) => milestone.status === "completed",
  ).length;
  return Math.round((completed / milestones.length) * 100);
}

function nextFlowMilestone(milestones: Milestone[]): Milestone | null {
  return (
    [...milestones]
      .filter((milestone) => milestone.status !== "completed")
      .sort(
        (a, b) =>
          Number(milestoneTimelineDate(a) ?? Number.MAX_SAFE_INTEGER) -
            Number(milestoneTimelineDate(b) ?? Number.MAX_SAFE_INTEGER) ||
          milestoneWorkflowValue(a) - milestoneWorkflowValue(b),
      )[0] ?? null
  );
}

function flowDotClass(milestones: Milestone[]): string {
  if (
    milestones.some(
      (milestone) =>
        milestone.status === "blocked" ||
        milestone.isCritical ||
        milestone.approvalStatus === "rejected",
    )
  ) {
    return "milestone-blocked";
  }
  if (
    milestones.some(
      (milestone) =>
        milestone.status === "in_progress" ||
        milestone.approvalStatus === "pending",
    )
  ) {
    return "milestone-in_progress";
  }
  if (milestones.every((milestone) => milestone.status === "completed")) {
    return "milestone-completed";
  }
  return "milestone-not_started";
}

function flowMilestoneTooltip(milestones: Milestone[]): string {
  return milestones
    .map((milestone) => {
      const lines = [
        displayMilestoneName(milestone),
        milestone.dateMode === "range"
          ? `Planificada: ${displayMilestonePlannedRange(milestone)}`
          : `Planificada: ${displayPlannedDate(milestoneTimelineDate(milestone))}`,
      ];
      const actualDate = milestone.actualDate ?? milestone.completedAt;
      if (actualDate) lines.push(`Real: ${displayDate(actualDate)}`);
      lines.push(`Estado: ${displayMilestoneStatus(milestone.status)}`);
      if (milestone.approvalStatus) {
        lines.push(
          `Aprobación: ${displayApprovalStatus(milestone.approvalStatus)}`,
        );
      }
      return lines.join(" · ");
    })
    .join("\n");
}

function clusterLabelPriority(
  cluster: FlowMilestoneCluster,
  context: { nextMilestone?: Milestone | null; finalMilestoneId?: string },
): number {
  const milestones = cluster.milestones.map(({ milestone }) => milestone);
  if (
    milestones.some((milestone) => context.nextMilestone?.id === milestone.id)
  ) {
    return 0;
  }
  if (
    milestones.some(
      (milestone) => milestone.status === "blocked" || milestone.isCritical,
    )
  ) {
    return 1;
  }
  if (milestones.some((milestone) => milestone.approvalStatus === "pending")) {
    return 2;
  }
  if (
    milestones.some((milestone) => context.finalMilestoneId === milestone.id)
  ) {
    return 3;
  }
  return Number.POSITIVE_INFINITY;
}

function clusterLabel(cluster: FlowMilestoneCluster, priority: number): string {
  if (cluster.milestones.length > 1) {
    return `${cluster.milestones.length} hitos`;
  }

  const milestone = cluster.milestones[0].milestone;
  if (priority === 3) return "Hito final";
  return displayMilestoneName(milestone);
}

function timelineLabelClass(left: number) {
  if (left < 8) return "milestone-label align-start";
  if (left > 92) return "milestone-label align-end";
  return "milestone-label";
}

function visibleFlowLabels(
  clusters: FlowMilestoneCluster[],
  nextMilestone?: Milestone | null,
): FlowLabelCandidate[] {
  const finalMilestoneId = clusters.at(-1)?.milestones.at(-1)?.milestone.id;
  const candidates = clusters
    .map((cluster) => ({
      ...cluster,
      priority: clusterLabelPriority(cluster, {
        nextMilestone,
        finalMilestoneId,
      }),
    }))
    .filter((item) => Number.isFinite(item.priority))
    .sort(
      (a, b) =>
        a.priority - b.priority ||
        a.date.getTime() - b.date.getTime() ||
        a.left - b.left,
    );

  return candidates
    .reduce<FlowLabelCandidate[]>((selected, item) => {
      if (selected.length >= FLOW_LABEL_LIMIT) return selected;
      const collides = selected.some(
        (selectedItem) =>
          Math.abs(selectedItem.left - item.left) < FLOW_LABEL_MIN_GAP,
      );
      if (collides) return selected;
      return [
        ...selected,
        { ...item, label: clusterLabel(item, item.priority) },
      ];
    }, [])
    .sort((a, b) => a.left - b.left);
}

function ProjectFlowRoadmap({ project }: { project: Project }) {
  const year = new Date(project.startDate).getUTCFullYear();
  const timelineScale = buildYearTimelineScale(year);
  const flows = buildProjectFlows(project.milestones);

  return (
    <section
      className="panel project-flow-roadmap"
      id="roadmap-proyecto"
      aria-labelledby="roadmap-proyecto-title"
    >
      <div className="section-title compact">
        <div>
          <p className="eyebrow">Roadmap anual {year}</p>
          <h2 id="roadmap-proyecto-title">Roadmap del proyecto</h2>
          <p className="muted">
            Resumen visual de flujos, fechas e hitos clave.
          </p>
        </div>
        <span className="badge priority">{flows.length} flujos</span>
      </div>
      <p className="project-flow-legend">
        Cómo leerlo: barra = flujo · punto = hito · verde completado · amarillo
        atención · rojo crítico · gris pendiente
      </p>
      <div className="project-flow-scroll">
        <div className="project-flow-board">
          <div className="project-flow-scale" aria-hidden="true">
            <div className="project-flow-spacer">Flujo</div>
            <div className="scale-grid compact-scale">
              <div className="quarter-header">
                {timelineScale.quarters.map((quarter) => (
                  <div
                    key={quarter.label}
                    style={{ width: `${quarter.width}%` }}
                  >
                    <strong>{quarter.label}</strong>
                    <span>{quarter.range}</span>
                  </div>
                ))}
              </div>
              <div className="month-header">
                {timelineScale.months.map((month) => (
                  <span key={month.label} style={{ width: `${month.width}%` }}>
                    {month.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
          {flows.length === 0 ? (
            <p className="muted project-flow-empty">
              No hay hitos creados para visualizar flujos del proyecto.
            </p>
          ) : null}
          {flows.map((flow) => {
            const progress = flowProgress(flow.milestones);
            const nextMilestone = nextFlowMilestone(flow.milestones);
            const datedMilestones = buildDatedFlowMilestones(
              flow.milestones,
              year,
            );
            const firstMilestone = datedMilestones[0];
            const lastMilestone = datedMilestones.at(-1);
            const left = firstMilestone?.left ?? 0;
            const right = lastMilestone?.left ?? left;
            const width = Math.max(1.5, right - left);
            const clusters = buildFlowMilestoneClusters(datedMilestones);
            const labels = visibleFlowLabels(clusters, nextMilestone);
            const labeledMilestoneCount = labels.reduce(
              (total, label) => total + label.milestones.length,
              0,
            );
            const hiddenLabelCount = Math.max(
              0,
              flow.milestones.length - labeledMilestoneCount,
            );

            return (
              <article className="project-flow-row" key={flow.track}>
                <div className="project-flow-summary">
                  <div className="project-flow-titleline">
                    <h3>{flow.label}</h3>
                    <span className="badge slate">Avance {progress}%</span>
                  </div>
                  <div className="project-flow-next">
                    {nextMilestone ? (
                      <>
                        <p>
                          Próximo:{" "}
                          <strong>{displayMilestoneName(nextMilestone)}</strong>{" "}
                          ·{" "}
                          {displayPlannedDate(
                            milestoneTimelineDate(nextMilestone),
                          )}
                        </p>
                        <p>
                          Responsable:{" "}
                          {nextMilestone.ownerName || "Sin responsable"}
                        </p>
                      </>
                    ) : (
                      <p className="muted">Sin acciones pendientes.</p>
                    )}
                  </div>
                </div>
                <div className="project-flow-timeline-wrap">
                  {datedMilestones.length === 0 ? (
                    <div className="project-flow-no-dates">
                      Sin fechas suficientes
                    </div>
                  ) : (
                    <div
                      className="timeline project-flow-timeline"
                      aria-label={`Roadmap del flujo ${flow.label}`}
                    >
                      <span className="timeline-grid" aria-hidden="true">
                        {timelineScale.months.slice(1).map((month) => (
                          <span
                            key={`${flow.track}-${month.label}-month`}
                            className="timeline-month-line"
                            style={{ left: `${month.start}%` }}
                          />
                        ))}
                        {timelineScale.months
                          .filter((month) => month.isQuarterStart)
                          .map((month) => (
                            <span
                              key={`${flow.track}-${month.label}-quarter`}
                              className="timeline-quarter-line"
                              style={{ left: `${month.start}%` }}
                            />
                          ))}
                      </span>
                      <span
                        className="timeline-bar project-flow-bar"
                        style={{ left: `${left}%`, width: `${width}%` }}
                        title={`${displayDate(firstMilestone?.date)} → ${displayDate(lastMilestone?.date)}`}
                      />
                      {datedMilestones.map(({ milestone }) => {
                        if (milestone.dateMode !== "range") return null;
                        const start = milestoneTimelineStartDate(milestone);
                        const end = milestoneTimelineEndDate(milestone);
                        if (!start || !end) return null;
                        const startLeft = clampYearPercent(start, year);
                        const endLeft = clampYearPercent(end, year);
                        return (
                          <span
                            key={`${milestone.id}-range`}
                            className={`milestone-range-bar ${flowDotClass([milestone])}`}
                            style={{ left: `${Math.min(startLeft, endLeft)}%`, width: `${Math.max(2, Math.abs(endLeft - startLeft))}%` }}
                            title={flowMilestoneTooltip([milestone])}
                          />
                        );
                      })}
                      {clusters.map((cluster) => (
                        <span
                          key={cluster.id}
                          className={`milestone-dot ${flowDotClass(
                            cluster.milestones.map(
                              ({ milestone }) => milestone,
                            ),
                          )}${
                            cluster.milestones.length > 1
                              ? " milestone-cluster"
                              : ""
                          }`}
                          style={{ left: `${cluster.left}%` }}
                          title={flowMilestoneTooltip(
                            cluster.milestones.map(
                              ({ milestone }) => milestone,
                            ),
                          )}
                        >
                          {cluster.milestones.length > 1
                            ? cluster.milestones.length
                            : null}
                        </span>
                      ))}
                      {labels.map((label) => (
                        <span
                          key={`${label.id}-flow-label`}
                          className={timelineLabelClass(label.left)}
                          style={{ left: `${label.left}%` }}
                        >
                          {label.label}
                        </span>
                      ))}
                    </div>
                  )}
                  {hiddenLabelCount > 0 ? (
                    <p className="muted compact-milestone-summary">
                      + {hiddenLabelCount} hitos
                    </p>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function milestoneSummary(milestone: Milestone): string {
  return `${displayMilestoneName(milestone)} · ${milestone.ownerName || "Sin responsable"} · ${displayPlannedDate(milestone.plannedDate)} · ${displayMilestoneStatus(milestone.status)}`;
}

function statusClass(status: string) {
  return `badge milestone-${status}`;
}

function approvalClass(status: Milestone["approvalStatus"]) {
  return status ? statusClass(status) : "badge slate";
}

function todayInputDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function displayActivityTimestamp(date: Date | string): string {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(date));
}

function displayActivityEntity(entityType: string): string {
  if (entityType === "project") return "Proyecto";
  if (entityType === "milestone") return "Hito";
  return entityType;
}

function activityActionLabel(action: string): string {
  const labels: Record<string, string> = {
    project_created: "Creación",
    project_updated: "Actualización",
    milestone_created: "Hito creado",
    milestone_updated: "Hito actualizado",
    milestone_dates_updated: "Fechas actualizadas",
    bulk_owner_assignment: "Asignación rápida",
  };
  return labels[action] ?? action.replaceAll("_", " ");
}

function activityFieldLabel(fieldName: string | null): string | null {
  if (!fieldName) return null;
  const labels: Record<string, string> = {
    name: "Nombre",
    description: "Descripción",
    projectType: "Tipo",
    category: "Categoría",
    area: "Área",
    channel: "Canal",
    brand: "Marca",
    ownerName: "Responsable",
    priority: "Prioridad",
    status: "Estado",
    startDate: "Fecha inicio",
    targetDate: "Fecha objetivo",
    completedAt: "Fecha completado",
    trafficLight: "Semáforo",
    sharepointUrl: "SharePoint",
    sharepointFolderUrl: "Carpeta SharePoint",
    colorLabel: "Color",
    track: "Track",
    sequence: "Secuencia",
    dueDate: "Fecha vencimiento",
    plannedDate: "Fecha planificada",
    actualDate: "Fecha real",
    approvalStatus: "Aprobación",
    linkUrl: "Enlace",
    documentUrl: "Documento",
    notes: "Notas",
    isCritical: "Crítico",
    sortOrder: "Orden",
  };
  return labels[fieldName] ?? fieldName;
}

function ActivityHistory({ activityLogs }: { activityLogs: ActivityLog[] }) {
  return (
    <details
      className="panel activity-history collapsible-panel"
      id="historial"
    >
      <summary className="collapsible-summary">
        <span>
          <strong>Historial</strong>
          <small>Ver cambios recientes · {activityLogs.length} eventos</small>
        </span>
        <span className="badge slate">Abrir</span>
      </summary>
      <div className="section-title compact collapsible-content-title">
        <div>
          <p className="eyebrow">Historial</p>
          <h2>Historial de cambios</h2>
          <p className="muted">
            Últimos 30 cambios registrados en el proyecto.
          </p>
        </div>
      </div>
      {activityLogs.length === 0 ? (
        <p className="muted">No hay cambios registrados todavía.</p>
      ) : (
        <ol
          className="activity-list"
          aria-label="Historial de cambios del proyecto"
        >
          {activityLogs.map((log) => {
            const fieldLabel = activityFieldLabel(log.fieldName);
            return (
              <li key={log.id} className="activity-item">
                <div className="activity-marker" aria-hidden="true" />
                <div className="activity-content">
                  <div className="activity-header">
                    <time dateTime={new Date(log.createdAt).toISOString()}>
                      {displayActivityTimestamp(log.createdAt)}
                    </time>
                    <span className="badge activity-badge">
                      {activityActionLabel(log.action)}
                    </span>
                  </div>
                  <p className="activity-summary">{log.summary}</p>
                  <div className="activity-meta">
                    <span>{displayActivityEntity(log.entityType)}</span>
                    {fieldLabel ? <span>{fieldLabel}</span> : null}
                    <span>{log.actorName || "Sistema Roadmap"}</span>
                    {log.milestone ? (
                      <span>Hito: {displayMilestoneName(log.milestone)}</span>
                    ) : null}
                  </div>
                  {log.beforeValue || log.afterValue ? (
                    <p className="activity-diff">
                      <span>{log.beforeValue || "—"}</span>
                      <strong>→</strong>
                      <span>{log.afterValue || "—"}</span>
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </details>
  );
}

function startOfUtcToday(): number {
  return startOfUtcDay(new Date());
}

type DatePlannerMilestoneContext = {
  previous: Milestone | null;
  next: Milestone | null;
};

function milestoneHasPlannerDate(milestone: Milestone): boolean {
  return Boolean(milestone.plannedDate || milestone.dueDate);
}

function plannerDate(milestone: Milestone): Date | null {
  return milestoneTimelineDate(milestone);
}

function comparePlannerDate(a: Date | null, b: Date | null): number {
  if (!a || !b) return 0;
  return startOfUtcDay(a) - startOfUtcDay(b);
}

function isFinalFlowMilestone(
  milestone: Milestone,
  milestones: Milestone[],
): boolean {
  return milestones.at(-1)?.id === milestone.id;
}

function buildDatePlannerWarnings(args: {
  milestone: Milestone;
  milestones: Milestone[];
  context: DatePlannerMilestoneContext;
  targetDate: Date;
}): string[] {
  const { milestone, milestones, context, targetDate } = args;
  const date = plannerDate(milestone);
  const warnings: string[] = [];
  const previousDate = context.previous ? plannerDate(context.previous) : null;
  const nextDate = context.next ? plannerDate(context.next) : null;

  if (date && previousDate && comparePlannerDate(date, previousDate) < 0) {
    warnings.push("Esta fecha queda antes del hito anterior.");
  }
  if (date && nextDate && comparePlannerDate(date, nextDate) > 0) {
    warnings.push("Esta fecha queda después del hito siguiente.");
  }
  if (
    date &&
    isFinalFlowMilestone(milestone, milestones) &&
    comparePlannerDate(date, targetDate) > 0
  ) {
    warnings.push("Esta fecha supera la fecha objetivo del proyecto.");
  }
  if (!date && isFinalFlowMilestone(milestone, milestones)) {
    warnings.push("Este hito crítico no tiene fecha.");
  }
  if (!date && milestone.approvalStatus === "pending") {
    warnings.push("Este hito pendiente de aprobación no tiene fecha.");
  }

  return warnings;
}

function datePlannerContext(
  milestones: Milestone[],
  index: number,
): DatePlannerMilestoneContext {
  return {
    previous: index > 0 ? milestones[index - 1] : null,
    next: index < milestones.length - 1 ? milestones[index + 1] : null,
  };
}

function nearestDatedMilestone(
  milestones: Milestone[],
  startIndex: number,
  direction: -1 | 1,
): { milestone: Milestone; index: number; date: Date } | null {
  for (
    let index = startIndex + direction;
    index >= 0 && index < milestones.length;
    index += direction
  ) {
    const date = plannerDate(milestones[index]);
    if (date) return { milestone: milestones[index], index, date };
  }
  return null;
}

function midpointDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.round((end.getTime() - start.getTime()) / 2),
  );
}

function interpolatedProjectDate(
  startDate: Date,
  targetDate: Date,
  index: number,
  total: number,
): Date | null {
  if (total <= 0) return null;
  if (total === 1) return midpointDate(startDate, targetDate);
  const ratio = index / Math.max(total - 1, 1);
  return new Date(
    startDate.getTime() +
      Math.round((targetDate.getTime() - startDate.getTime()) * ratio),
  );
}

function suggestedPlannerDate(args: {
  milestones: Milestone[];
  index: number;
  project: Project;
}): Date | null {
  const { milestones, index, project } = args;
  if (plannerDate(milestones[index])) return null;
  const previous = nearestDatedMilestone(milestones, index, -1);
  const next = nearestDatedMilestone(milestones, index, 1);
  if (previous && next) return midpointDate(previous.date, next.date);
  if (project.startDate && project.targetDate) {
    return interpolatedProjectDate(
      new Date(project.startDate),
      new Date(project.targetDate),
      index,
      milestones.length,
    );
  }
  return null;
}

function compactPlannerRow(milestone: Milestone): string {
  return `${displayMilestoneName(milestone)} · ${displayPlannedDate(
    plannerDate(milestone),
  )} · ${milestone.ownerName || "Sin responsable"} · ${displayMilestoneStatus(
    milestone.status,
  )}`;
}

function plannerRowClass(warnings: string[], hasDate: boolean): string {
  if (warnings.length > 0) return "date-planner-row conflict";
  if (!hasDate) return "date-planner-row missing";
  return "date-planner-row ok";
}

function DatePlannerPreviewList({
  title,
  milestones,
}: {
  title: string;
  milestones: Milestone[];
}) {
  const visibleMilestones = milestones.slice(0, 4);
  return (
    <div className="date-planner-preview-list">
      <h4>{title}</h4>
      {visibleMilestones.length === 0 ? (
        <p className="muted">Sin hitos en este grupo.</p>
      ) : (
        <ul>
          {visibleMilestones.map((milestone) => (
            <li key={milestone.id}>{compactPlannerRow(milestone)}</li>
          ))}
        </ul>
      )}
      {milestones.length > visibleMilestones.length ? (
        <p className="date-planner-more">
          +{milestones.length - visibleMilestones.length} hitos más
        </p>
      ) : null}
    </div>
  );
}

function DatePlannerContextBlock({
  milestone,
  context,
}: {
  milestone: Milestone;
  context: DatePlannerMilestoneContext;
}) {
  if (milestoneHasPlannerDate(milestone)) return null;
  return (
    <div className="date-planner-context">
      <span>
        <strong>Anterior:</strong>{" "}
        {context.previous
          ? `${displayMilestoneName(context.previous)} · ${displayPlannedDate(
              plannerDate(context.previous),
            )}`
          : "Sin hito anterior"}
      </span>
      <span>
        <strong>Actual:</strong> {displayMilestoneName(milestone)} · Sin fecha
      </span>
      <span>
        <strong>Siguiente:</strong>{" "}
        {context.next
          ? `${displayMilestoneName(context.next)} · ${displayPlannedDate(
              plannerDate(context.next),
            )}`
          : "Sin hito siguiente"}
      </span>
    </div>
  );
}

function toPlannerDate(value: Date | string | null | undefined): string | null {
  return value ? inputDate(value) : null;
}

function buildPlannerFlows(project: Project): PlannerFlow[] {
  return buildProjectFlows(project.milestones).map((flow) => ({
    track: flow.track,
    label: flow.label,
    milestones: flow.milestones.map((milestone) => ({
      id: milestone.id,
      name: displayMilestoneName(milestone),
      ownerName: milestone.ownerName,
      status: milestone.status,
      statusLabel: displayMilestoneStatus(milestone.status),
      approvalStatus: milestone.approvalStatus,
      approvalLabel: milestone.approvalStatus
        ? displayApprovalStatus(milestone.approvalStatus)
        : null,
      dateMode: milestone.dateMode,
      plannedDate: toPlannerDate(milestone.plannedDate),
      dueDate: toPlannerDate(milestone.dueDate),
      plannedStartDate: toPlannerDate(milestone.plannedStartDate),
      plannedEndDate: toPlannerDate(milestone.plannedEndDate),
      actualDate: toPlannerDate(milestone.actualDate ?? milestone.completedAt),
      isCritical: milestone.isCritical,
      sequence: milestone.sequence ?? 0,
      sortOrder: milestone.sortOrder ?? 0,
    })),
  }));
}

function DatePlannerSection({
  project,
  action,
}: {
  project: Project;
  action: (formData: FormData) => Promise<void>;
}) {
  const flows = buildPlannerFlows(project);
  return (
    <section className="date-planner">
      <div className="section-title compact">
        <div>
          <p className="eyebrow">Planificación</p>
          <h2>Planificador de fechas</h2>
          <p className="muted">Ajusta fechas por flujo con vista previa.</p>
        </div>
      </div>
      <FlowDatePlanner
        flows={flows}
        projectStartDate={inputDate(project.startDate)}
        projectTargetDate={inputDate(project.targetDate)}
        action={action}
      />
    </section>
  );
}

function isMilestoneOverdue(milestone: Milestone): boolean {
  if (!milestone.plannedDate || milestone.status === "completed") return false;
  const plannedDate = new Date(milestone.plannedDate);
  const plannedDay = Date.UTC(
    plannedDate.getUTCFullYear(),
    plannedDate.getUTCMonth(),
    plannedDate.getUTCDate(),
  );
  return plannedDay < startOfUtcToday();
}

function canCompleteMilestone(milestone: Milestone): boolean {
  return milestone.status !== "completed";
}

function canBlockMilestone(milestone: Milestone): boolean {
  return milestone.status !== "blocked" && milestone.status !== "completed";
}

function canReopenMilestone(milestone: Milestone): boolean {
  return milestone.status === "completed" || milestone.status === "blocked";
}

function canApproveMilestone(milestone: Milestone): boolean {
  return milestone.approvalStatus === "pending";
}

function canRejectMilestone(milestone: Milestone): boolean {
  return milestone.approvalStatus === "pending";
}

function milestoneRowClass(milestone: Milestone): string {
  const classes = ["milestone-row"];
  if (milestone.status === "completed") classes.push("is-completed");
  if (milestone.status === "blocked") classes.push("has-danger");
  else if (isMilestoneOverdue(milestone)) classes.push("has-danger");
  else if (
    !milestone.ownerName?.trim() ||
    milestone.approvalStatus === "pending"
  )
    classes.push("has-warning");
  return classes.join(" ");
}

function milestoneIssueLabels(milestone: Milestone): string[] {
  const labels: string[] = [];
  if (!milestone.ownerName?.trim()) labels.push("Sin responsable");
  if (milestone.approvalStatus === "pending")
    labels.push("Aprobación pendiente");
  if (milestone.status === "blocked") labels.push("Bloqueado");
  if (isMilestoneOverdue(milestone)) labels.push("Vencido");
  if (milestone.status === "completed") labels.push("Completado");
  return labels;
}

function buildMilestoneUpdateHiddenInputs(
  milestone: Milestone,
  track: RoadmapMilestoneTrackValue,
  overrides: Partial<{
    status: RoadmapMilestoneStatusValue;
    approvalStatus: RoadmapApprovalStatusValue | "";
    actualDate: string;
  }>,
) {
  return {
    name: milestone.name,
    track,
    sequence: String(milestone.sequence ?? milestone.sortOrder ?? 0),
    ownerName: milestone.ownerName ?? "",
    plannedDate: inputDate(milestone.plannedDate),
    actualDate:
      overrides.actualDate ??
      inputDate(milestone.actualDate ?? milestone.completedAt),
    status: overrides.status ?? milestone.status,
    approvalStatus: overrides.approvalStatus ?? milestone.approvalStatus ?? "",
    linkUrl: milestone.linkUrl ?? "",
    documentUrl: milestone.documentUrl ?? "",
    notes: milestone.notes ?? "",
  };
}

function MilestoneHiddenInputs({
  values,
}: {
  values: ReturnType<typeof buildMilestoneUpdateHiddenInputs>;
}) {
  return (
    <>
      {Object.entries(values).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
    </>
  );
}

function severityTone(
  severity: RoadmapProjectInsights["severity"],
): "success" | "warning" | "danger" {
  if (severity === "critical") return "danger";
  if (severity === "warning") return "warning";
  return "success";
}

function pluralize(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural;
}

function buildOperationalAlerts(insights: RoadmapProjectInsights<Milestone>) {
  const alerts: string[] = [];

  if (insights.milestonesWithoutOwner.length > 0) {
    alerts.push(
      `Hay ${insights.milestonesWithoutOwner.length} ${pluralize(insights.milestonesWithoutOwner.length, "hito", "hitos")} sin responsable.`,
    );
  }

  if (insights.pendingApprovalCount > 0) {
    alerts.push(
      `Hay ${insights.pendingApprovalCount} ${pluralize(insights.pendingApprovalCount, "aprobación pendiente", "aprobaciones pendientes")}.`,
    );
  }

  if (insights.overdueMilestones.length > 0) {
    alerts.push(
      `Hay ${insights.overdueMilestones.length} ${pluralize(insights.overdueMilestones.length, "hito vencido", "hitos vencidos")}.`,
    );
  }

  if (insights.blockedMilestones.length > 0) {
    alerts.push(
      `Hay ${insights.blockedMilestones.length} ${pluralize(insights.blockedMilestones.length, "hito bloqueado", "hitos bloqueados")}.`,
    );
  }

  if (insights.severity === "critical") {
    alerts.push("Severidad crítica: requiere revisión operativa.");
  }

  return alerts;
}

function MilestoneQuickAction({
  action,
  label,
  milestone,
  track,
  overrides,
  tone = "secondary",
}: {
  action: (formData: FormData) => Promise<void>;
  label: string;
  milestone: Milestone;
  track: RoadmapMilestoneTrackValue;
  overrides: Partial<{
    status: RoadmapMilestoneStatusValue;
    approvalStatus: RoadmapApprovalStatusValue | "";
    actualDate: string;
  }>;
  tone?: "secondary" | "success" | "warning" | "danger";
}) {
  return (
    <form action={action} className="quick-action-form">
      <MilestoneHiddenInputs
        values={buildMilestoneUpdateHiddenInputs(milestone, track, overrides)}
      />
      <button
        className={`button small quick-action ${tone}`}
        type="submit"
        aria-label={`${label} hito ${displayMilestoneName(milestone)}`}
      >
        {label}
      </button>
    </form>
  );
}

function MilestoneTable({
  milestones,
  projectId,
  track,
}: {
  milestones: Milestone[];
  projectId: string;
  track: RoadmapMilestoneTrackValue;
}) {
  return (
    <section
      className="panel milestone-section"
      id={track === "supply" ? "operaciones" : "marketing"}
    >
      <div className="section-title">
        <div>
          <p className="eyebrow">Track</p>
          <h2>{displayTrackLabel(track)}</h2>
        </div>
        <span className="badge slate">{milestones.length} hitos</span>
      </div>
      {milestones.length === 0 ? (
        <p className="muted">No hay hitos para esta sección.</p>
      ) : null}
      <div className="table-wrap">
        <table className="milestone-table">
          <thead>
            <tr>
              <th>Hito</th>
              <th>Responsable(s)</th>
              <th>Planificada</th>
              <th>Real</th>
              <th>Estado</th>
              <th>Aprobación</th>
              <th>Documentos</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {milestones.map((milestone) => {
              const updateMilestone = updateMilestoneStatusAction.bind(
                null,
                projectId,
                milestone.id,
              );
              const issueLabels = milestoneIssueLabels(milestone);
              const completedActualDate =
                inputDate(milestone.actualDate ?? milestone.completedAt) ||
                todayInputDate();

              return (
                <tr key={milestone.id} className={milestoneRowClass(milestone)}>
                  <td>
                    <strong>{displayMilestoneName(milestone)}</strong>
                    {issueLabels.length > 0 ? (
                      <div
                        className="milestone-indicators"
                        aria-label="Indicadores del hito"
                      >
                        {issueLabels.map((label) => (
                          <span className="badge alert-chip" key={label}>
                            {label}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    {milestone.ownerName || (
                      <span className="muted">Sin responsable</span>
                    )}
                  </td>
                  <td>{displayMilestonePlannedRange(milestone)}</td>
                  <td>
                    {displayDate(milestone.actualDate ?? milestone.completedAt)}
                  </td>
                  <td>
                    <span className={statusClass(milestone.status)}>
                      {displayMilestoneStatus(milestone.status)}
                    </span>
                  </td>
                  <td>
                    <span className={approvalClass(milestone.approvalStatus)}>
                      {displayApprovalStatus(milestone.approvalStatus)}
                    </span>
                  </td>
                  <td className="link-cell">
                    {milestone.linkUrl ? (
                      <a
                        className="text-button"
                        href={milestone.linkUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Abrir link
                      </a>
                    ) : null}
                    {milestone.documentUrl ? (
                      <a
                        className="text-button"
                        href={milestone.documentUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Documento
                      </a>
                    ) : null}
                    {!milestone.linkUrl && !milestone.documentUrl ? (
                      <span className="muted">—</span>
                    ) : null}
                  </td>
                  <td className="milestone-action-cell">
                    {milestone.notes ? (
                      <p className="muted compact-notes">{milestone.notes}</p>
                    ) : null}
                    <div
                      className="quick-actions"
                      aria-label={`Acciones rápidas para ${displayMilestoneName(milestone)}`}
                    >
                      {canCompleteMilestone(milestone) ? (
                        <MilestoneQuickAction
                          action={updateMilestone}
                          label="Completar"
                          milestone={milestone}
                          track={track}
                          overrides={{
                            status: "completed",
                            actualDate: completedActualDate,
                          }}
                          tone="success"
                        />
                      ) : null}
                      {canBlockMilestone(milestone) ? (
                        <MilestoneQuickAction
                          action={updateMilestone}
                          label="Bloquear"
                          milestone={milestone}
                          track={track}
                          overrides={{ status: "blocked" }}
                          tone="danger"
                        />
                      ) : null}
                      {canReopenMilestone(milestone) ? (
                        <MilestoneQuickAction
                          action={updateMilestone}
                          label="Reabrir"
                          milestone={milestone}
                          track={track}
                          overrides={{ status: "in_progress" }}
                          tone="warning"
                        />
                      ) : null}
                      {canApproveMilestone(milestone) ? (
                        <MilestoneQuickAction
                          action={updateMilestone}
                          label="Aprobar"
                          milestone={milestone}
                          track={track}
                          overrides={{ approvalStatus: "approved" }}
                          tone="success"
                        />
                      ) : null}
                      {canRejectMilestone(milestone) ? (
                        <MilestoneQuickAction
                          action={updateMilestone}
                          label="Rechazar"
                          milestone={milestone}
                          track={track}
                          overrides={{ approvalStatus: "rejected" }}
                          tone="danger"
                        />
                      ) : null}
                    </div>
                    <details className="edit-details">
                      <summary className="button small secondary">
                        Editar
                      </summary>
                      <form
                        action={updateMilestone}
                        className="inline-edit milestone-edit-panel"
                      >
                        <input
                          type="hidden"
                          name="name"
                          value={milestone.name}
                        />
                        <input type="hidden" name="track" value={track} />
                        <input
                          type="hidden"
                          name="sequence"
                          value={milestone.sequence ?? milestone.sortOrder ?? 0}
                        />
                        <label className="field">
                          <span>Responsable(s)</span>
                          <input
                            name="ownerName"
                            defaultValue={milestone.ownerName ?? ""}
                            placeholder="Ej: Mario, Rodolfo"
                          />
                        </label>
                        <input type="hidden" name="dateMode" value={milestone.dateMode} />
                        {milestone.dateMode === "range" ? (
                          <>
                            <label className="field">
                              <span>Inicio planificado</span>
                              <input type="date" name="plannedStartDate" defaultValue={inputDate(milestone.plannedStartDate ?? milestone.plannedDate ?? milestone.dueDate)} />
                            </label>
                            <label className="field">
                              <span>Término planificado</span>
                              <input type="date" name="plannedEndDate" defaultValue={inputDate(milestone.plannedEndDate ?? milestone.plannedDate ?? milestone.dueDate)} />
                            </label>
                          </>
                        ) : (
                          <label className="field">
                            <span>Fecha planificada</span>
                            <input
                              type="date"
                              name="plannedDate"
                              defaultValue={inputDate(
                                milestone.plannedDate ?? milestone.dueDate,
                              )}
                            />
                          </label>
                        )}
                        <label className="field">
                          <span>Fecha real</span>
                          <input
                            type="date"
                            name="actualDate"
                            defaultValue={inputDate(
                              milestone.actualDate ?? milestone.completedAt,
                            )}
                          />
                        </label>
                        <label className="field">
                          <span>Estado</span>
                          <select name="status" defaultValue={milestone.status}>
                            {ROADMAP_MILESTONE_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {ROADMAP_MILESTONE_STATUS_LABELS[status]}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="field">
                          <span>Aprobación</span>
                          <select
                            name="approvalStatus"
                            defaultValue={milestone.approvalStatus ?? ""}
                          >
                            <option value="">No aplica</option>
                            {ROADMAP_APPROVAL_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {ROADMAP_APPROVAL_STATUS_LABELS[status]}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="field">
                          <span>Link</span>
                          <input
                            type="url"
                            name="linkUrl"
                            defaultValue={milestone.linkUrl ?? ""}
                            placeholder="https://..."
                          />
                        </label>
                        <label className="field">
                          <span>Documento</span>
                          <input
                            type="url"
                            name="documentUrl"
                            defaultValue={milestone.documentUrl ?? ""}
                            placeholder="https://..."
                          />
                        </label>
                        <label className="field full">
                          <span>Notas</span>
                          <textarea
                            name="notes"
                            defaultValue={milestone.notes ?? ""}
                            placeholder="Notas operativas, bloqueos o próximos pasos"
                          />
                        </label>
                        <div className="form-footer full">
                          <button className="button primary" type="submit">
                            Guardar cambios
                          </button>
                        </div>
                      </form>
                    </details>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function OperationalSummaryBand({
  project,
  summary,
  insights,
  nextMilestone,
  alerts,
}: {
  project: Project;
  summary: ReturnType<typeof buildProjectSummary>;
  insights: RoadmapProjectInsights<Milestone>;
  nextMilestone: Milestone | null;
  alerts: string[];
}) {
  const summaryItems = [
    {
      label: "Estado",
      value: ROADMAP_STATUS_LABELS[project.status],
    },
    { label: "Avance", value: `${summary.progress}%` },
    {
      label: "Próximo hito",
      value: nextMilestone ? displayMilestoneName(nextMilestone) : "Sin pendientes",
    },
    {
      label: "Fecha próximo hito",
      value: nextMilestone
        ? displayPlannedDate(milestoneTimelineDate(nextMilestone))
        : "—",
    },
    {
      label: "Responsable próximo hito",
      value: nextMilestone?.ownerName || "Sin responsable",
      warning: Boolean(nextMilestone && !nextMilestone.ownerName?.trim()),
    },
    { label: "Fecha objetivo", value: displayDate(project.targetDate) },
    { label: "Riesgo", value: insights.severityLabel },
  ];

  return (
    <section className="panel operational-overview" aria-labelledby="resumen-operativo-title">
      <div className="operational-overview-header">
        <div>
          <p className="eyebrow">Resumen operativo</p>
          <h2 id="resumen-operativo-title">Estado y próxima acción</h2>
        </div>
        <span className={`badge severity-${insights.severity}`}>
          {insights.severityLabel}
        </span>
      </div>
      <dl className="operational-summary-strip">
        {summaryItems.map((item) => (
          <div className={item.warning ? "needs-attention" : undefined} key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
      <div className="primary-detail-actions" aria-label="Acciones principales del proyecto">
        <ProjectDetailActionButton targetId="planificador-fechas">
          Editar fechas
        </ProjectDetailActionButton>
        <ProjectDetailActionButton targetId="asignacion-rapida">
          Asignar responsable
        </ProjectDetailActionButton>
        <ProjectDetailActionButton targetId="administracion">
          Administración
        </ProjectDetailActionButton>
      </div>
      <div className={`compact-alert-strip ${insights.severity}`}>
        {alerts.length === 0 ? (
          <span className="muted">Sin alertas operativas.</span>
        ) : (
          alerts.map((alert) => <span key={alert}>{alert}</span>)
        )}
      </div>
    </section>
  );
}

export default async function RoadmapProjectDetailPage({ params }: PageProps) {
  const { id } = await params;
  if (id === "new") notFound();

  let project;
  try {
    project = await findRoadmapProject(id);
  } catch (error) {
    if (error instanceof RoadmapNotFoundError) notFound();
    throw error;
  }

  const updateProject = updateRoadmapProjectAction.bind(null, project.id);
  const createMilestone = createMilestoneAction.bind(null, project.id);
  const bulkAssignMilestoneOwners = bulkAssignMilestoneOwnersAction.bind(
    null,
    project.id,
  );
  const updatePlannerDates = updateMilestonePlannerDatesAction.bind(
    null,
    project.id,
  );
  const projectFlows = buildProjectFlows(project.milestones);
  const sharepointUrl = project.sharepointUrl ?? project.sharepointFolderUrl;
  const summary = buildProjectSummary(project.milestones);
  const insights = buildRoadmapProjectInsights(project.milestones);
  const nextMilestone = insights.nextMilestone;
  const operationalAlerts = buildOperationalAlerts(insights);
  const bulkAssignmentCounts = buildBulkAssignmentCounts(project.milestones);
  const activityLogs = await getRoadmapProjectActivity(project.id);

  return (
    <AppShell active="roadmap">
      <div className="roadmap-detail-compact">
        <header className="project-hero">
          <div className="project-hero-top">
            <Link className="back-link" href="/roadmap">
              ← Volver al roadmap
            </Link>
            <ProjectDetailActionButton targetId="administracion">
              Administración
            </ProjectDetailActionButton>
          </div>
          <p className="eyebrow">{project.code}</p>
          <h1>{project.name}</h1>
          <p className="header-subtitle">
            {displayDate(project.startDate)} → {displayDate(project.targetDate)}
          </p>
          <div className="badges hero-badges">
            <span className="badge slate">
              {ROADMAP_PROJECT_TYPE_LABELS[project.projectType]}
            </span>
            <span className="badge slate">{project.area || "Sin área"}</span>
            <span className="badge slate">{project.ownerName}</span>
            <span className={`badge status-${project.status}`}>
              {ROADMAP_STATUS_LABELS[project.status]}
            </span>
            <span className={`badge ${project.trafficLight}`}>
              {ROADMAP_TRAFFIC_LIGHT_LABELS[project.trafficLight]}
            </span>
            <span className="badge priority">
              {ROADMAP_PRIORITY_LABELS[project.priority]}
            </span>
          </div>
        </header>

        <OperationalSummaryBand
          project={project}
          summary={summary}
          insights={insights}
          nextMilestone={nextMilestone}
          alerts={operationalAlerts}
        />

        <ProjectFlowRoadmap project={project} />

        <nav className="section-tabs" aria-label="Secciones del proyecto">
          <a href="#roadmap-proyecto">Roadmap</a>
          <a href="#planificador-fechas">Editar fechas</a>
          <a href="#control-operativo">Control operativo</a>
          <a href="#detalle-operativo">Detalle operativo</a>
          <a href="#administracion">Administración</a>
          <a href="#historial">Historial</a>
        </nav>

        <details className="panel collapsible-panel" id="planificador-fechas">
          <summary className="collapsible-summary">
            <span>
              <strong>Planificador de fechas</strong>
              <small>Ajusta fechas de hitos y flujos</small>
            </span>
            <span className="badge slate">Editar fechas</span>
          </summary>
          <DatePlannerSection project={project} action={updatePlannerDates} />
        </details>

        <details className="panel collapsible-panel project-control" id="control-operativo">
          <summary className="collapsible-summary">
            <span>
              <strong>Control operativo</strong>
              <small>Ver alertas, bloqueos y responsables</small>
            </span>
            <span className={`badge severity-${insights.severity}`}>
              {insights.severityLabel}
            </span>
          </summary>
          <div className="control-grid">
            <SummaryMetricCard
              label="Fase actual"
              value={insights.currentPhase.label}
            />
            <SummaryMetricCard
              label="Severidad"
              value={insights.severityLabel}
              tone={severityTone(insights.severity)}
            />
            <SummaryMetricCard
              label="Próxima acción"
              value={
                nextMilestone
                  ? displayMilestoneName(nextMilestone)
                  : "Sin pendientes"
              }
              detail={
                nextMilestone
                  ? displayPlannedDate(milestoneTimelineDate(nextMilestone))
                  : undefined
              }
            />
            <SummaryMetricCard
              label="Responsable(s) próxima acción"
              value={nextMilestone?.ownerName || "Sin responsable"}
              tone={
                nextMilestone && !nextMilestone.ownerName?.trim()
                  ? "warning"
                  : undefined
              }
            />
            <SummaryMetricCard
              label="Hitos vencidos"
              value={insights.overdueMilestones.length}
              detail={
                insights.overdueMilestones[0]
                  ? milestoneSummary(insights.overdueMilestones[0])
                  : undefined
              }
              tone={
                insights.overdueMilestones.length > 0 ? "danger" : undefined
              }
            />
            <SummaryMetricCard
              label="Próximos 7 días"
              value={insights.upcomingMilestones.length}
              detail={
                insights.upcomingMilestones[0]
                  ? milestoneSummary(insights.upcomingMilestones[0])
                  : undefined
              }
            />
            <SummaryMetricCard
              label="Bloqueados"
              value={insights.blockedMilestones.length}
              detail={
                insights.blockedMilestones[0]
                  ? milestoneSummary(insights.blockedMilestones[0])
                  : undefined
              }
              tone={
                insights.blockedMilestones.length > 0 ? "danger" : undefined
              }
            />
            <SummaryMetricCard
              label="Sin responsable"
              value={insights.milestonesWithoutOwner.length}
              detail={
                insights.milestonesWithoutOwner[0]
                  ? milestoneSummary(insights.milestonesWithoutOwner[0])
                  : undefined
              }
              tone={
                insights.milestonesWithoutOwner.length > 0
                  ? "warning"
                  : undefined
              }
            />
            <SummaryMetricCard
              label="Aprobaciones pendientes"
              value={insights.pendingApprovalCount}
              detail={
                insights.pendingApprovalMilestones[0]
                  ? milestoneSummary(insights.pendingApprovalMilestones[0])
                  : undefined
              }
              tone={insights.pendingApprovalCount > 0 ? "warning" : undefined}
            />
          </div>
        </details>

        <details className="panel collapsible-panel" id="resumen-proyecto">
          <summary className="collapsible-summary">
            <span>
              <strong>Resumen completo</strong>
              <small>Ver contexto ejecutivo y metadatos</small>
            </span>
            <span className="badge slate">Contexto</span>
          </summary>
          <section className="compact-project-summary">
            <div className="section-title compact">
              <div>
                <p className="eyebrow">Resumen del proyecto</p>
                <h2>
                  Contexto ejecutivo{project.description?.trim() ? "" : " —"}
                </h2>
              </div>
              <div className="actions">
                {project.packagingRequest ? (
                  <Link
                    className="button secondary"
                    href={`/packaging/${project.packagingRequest.id}`}
                  >
                    Solicitud packaging {project.packagingRequest.code}
                  </Link>
                ) : null}
                {sharepointUrl ? (
                  <a
                    className="button secondary"
                    href={sharepointUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir SharePoint
                  </a>
                ) : null}
              </div>
            </div>
            {project.description?.trim() ? (
              <p className="compact-summary-description">{project.description}</p>
            ) : null}
            <dl className="metadata-grid compact-metadata-grid">
              <div>
                <dt>Responsable</dt>
                <dd>{project.ownerName}</dd>
              </div>
              <div>
                <dt>Área</dt>
                <dd>{project.area || "—"}</dd>
              </div>
              <div>
                <dt>Canal</dt>
                <dd>{project.channel || "—"}</dd>
              </div>
              <div>
                <dt>Marca</dt>
                <dd>{project.brand || "—"}</dd>
              </div>
              <div>
                <dt>Categoría</dt>
                <dd>{project.category || "—"}</dd>
              </div>
              <div>
                <dt>Fase actual</dt>
                <dd>{insights.currentPhase.label}</dd>
              </div>
              <div>
                <dt>Inicio</dt>
                <dd>{displayDate(project.startDate)}</dd>
              </div>
              <div>
                <dt>Fecha objetivo</dt>
                <dd>{displayDate(project.targetDate)}</dd>
              </div>
            </dl>
          </section>
        </details>

        <ActivityHistory activityLogs={activityLogs} />

        <details className="panel collapsible-panel" id="detalle-operativo">
          <summary className="collapsible-summary">
            <span>
              <strong>Detalle operativo</strong>
              <small>Ver y editar hitos</small>
            </span>
            <span className="badge slate">
              {project.milestones.length} hitos
            </span>
          </summary>
          <div className="collapsible-stack">
            {projectFlows.map((flow) => (
              <MilestoneTable
                key={flow.track}
                milestones={flow.milestones}
                projectId={project.id}
                track={flow.track}
              />
            ))}
          </div>
        </details>

        <details
          className="panel collapsible-panel administration-panel"
          id="administracion"
        >
          <summary className="collapsible-summary">
            <span>
              <strong>Administración</strong>
              <small>Editar datos del proyecto</small>
            </span>
            <span className="badge slate">Editar / crear</span>
          </summary>
          <BulkAssignmentPanel
            action={bulkAssignMilestoneOwners}
            counts={bulkAssignmentCounts}
          />
          <section className="detail-grid forms-grid">
            <article id="editar-proyecto">
              <div className="section-title compact">
                <div>
                  <p className="eyebrow">Administración</p>
                  <h2>Editar proyecto</h2>
                </div>
              </div>
              <ProjectForm
                project={project}
                action={updateProject}
                submitLabel="Guardar cambios"
              />
            </article>

            <section className="panel add-milestone-card">
              <div className="section-title compact">
                <div>
                  <p className="eyebrow">Nuevo hito</p>
                  <h2>Crear hito adicional</h2>
                </div>
              </div>
              <form action={createMilestone} className="grid">
                <label className="field">
                  <span>
                    Nombre <em>*</em>
                  </span>
                  <input name="name" required />
                </label>
                <label className="field">
                  <span>Track</span>
                  <select name="track" defaultValue="supply">
                    <option value="supply">
                      {displayTrackLabel("supply")}
                    </option>
                    <option value="marketing">
                      {displayTrackLabel("marketing")}
                    </option>
                  </select>
                </label>
                <label className="field">
                  <span>Responsable(s)</span>
                  <input name="ownerName" placeholder="Ej: Mario, Rodolfo" />
                </label>
                <label className="field">
                  <span>Tipo de hito</span>
                  <select name="dateMode" defaultValue="point">
                    <option value="point">Puntual</option>
                    <option value="range">Con duración</option>
                  </select>
                </label>
                <label className="field">
                  <span>Fecha planificada / término <em>*</em></span>
                  <input type="date" name="plannedDate" required />
                </label>
                <label className="field">
                  <span>Inicio (si tiene duración)</span>
                  <input type="date" name="plannedStartDate" />
                </label>
                <label className="field">
                  <span>Término (si tiene duración)</span>
                  <input type="date" name="plannedEndDate" />
                </label>
                <label className="field">
                  <span>Estado</span>
                  <select name="status" defaultValue="not_started">
                    {ROADMAP_MILESTONE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {ROADMAP_MILESTONE_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Orden</span>
                  <input type="number" name="sequence" defaultValue="99" />
                </label>
                <label className="field">
                  <span>Aprobación</span>
                  <select name="approvalStatus" defaultValue="">
                    <option value="">No aplica</option>
                    {ROADMAP_APPROVAL_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {ROADMAP_APPROVAL_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Documento</span>
                  <input type="url" name="documentUrl" />
                </label>
                <label className="field full">
                  <span>Notas</span>
                  <textarea name="notes" />
                </label>
                <button className="button primary" type="submit">
                  Agregar hito
                </button>
              </form>
            </section>
          </section>
        </details>
      </div>
    </AppShell>
  );
}
