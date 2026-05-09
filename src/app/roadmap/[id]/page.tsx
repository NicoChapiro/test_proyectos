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
import { findRoadmapProject, getRoadmapProjectActivity } from "@/modules/roadmap/service";
import {
  displayDate,
  displayPlannedDate,
  inputDate,
} from "@/modules/roadmap/ui/date";
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
  updateMilestoneStatusAction,
  updateRoadmapProjectAction,
} from "../actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = { params: Promise<{ id: string }> };
type Project = Awaited<ReturnType<typeof findRoadmapProject>>;
type Milestone = Project["milestones"][number];
type ActivityLog = Awaited<ReturnType<typeof getRoadmapProjectActivity>>[number];

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

function buildBulkAssignmentCounts(milestones: Milestone[]): BulkAssignmentCounts {
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
    upcoming: assignableMilestones.filter(isMilestoneUpcomingForBulkAssignment).length,
  };
}

function BulkAssignmentCount({ label, value }: { label: string; value: number }) {
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
          <input
            name="ownerName"
            required
            placeholder="Ej: Mario, Rodolfo"
          />
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

function findMilestoneByCode(milestones: Milestone[], code: string) {
  return milestones.find((milestone) => milestone.milestoneCode === code);
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
    <section className="panel activity-history" id="historial">
      <div className="section-title compact">
        <div>
          <p className="eyebrow">Historial</p>
          <h2>Historial de cambios</h2>
          <p className="muted">Últimos 30 cambios registrados en el proyecto.</p>
        </div>
        <span className="badge slate">{activityLogs.length} eventos</span>
      </div>
      {activityLogs.length === 0 ? (
        <p className="muted">No hay cambios registrados todavía.</p>
      ) : (
        <ol className="activity-list" aria-label="Historial de cambios del proyecto">
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
    </section>
  );
}

function startOfUtcToday(): number {
  return startOfUtcDay(new Date());
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
                  <td>{displayPlannedDate(milestone.plannedDate)}</td>
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
                        <label className="field">
                          <span>Fecha planificada</span>
                          <input
                            type="date"
                            name="plannedDate"
                            defaultValue={inputDate(milestone.plannedDate)}
                          />
                        </label>
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
  const supplyMilestones = project.milestones.filter(
    (milestone) => milestone.track === "supply",
  );
  const marketingMilestones = project.milestones.filter(
    (milestone) => milestone.track === "marketing",
  );
  const sharepointUrl = project.sharepointUrl ?? project.sharepointFolderUrl;
  const summary = buildProjectSummary(project.milestones);
  const insights = buildRoadmapProjectInsights(project.milestones);
  const nextMilestone = insights.nextMilestone;
  const operationalAlerts = buildOperationalAlerts(insights);
  const santiagoArrival = findMilestoneByCode(
    project.milestones,
    "supply_estimated_arrival_santiago",
  );
  const campaignActivation = findMilestoneByCode(
    project.milestones,
    "marketing_activation_date",
  );
  const bulkAssignmentCounts = buildBulkAssignmentCounts(project.milestones);
  const activityLogs = await getRoadmapProjectActivity(project.id);

  return (
    <AppShell active="roadmap">
      <header className="project-hero">
        <div className="project-hero-top">
          <Link className="back-link" href="/roadmap">
            ← Volver al roadmap
          </Link>
          <Link className="button secondary" href="#editar-proyecto">
            Editar proyecto
          </Link>
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

      <section className="executive-summary">
        <article className="progress-card">
          <p className="eyebrow">Progreso general</p>
          <strong>{summary.progress}%</strong>
          <span className="progress-track">
            <span style={{ width: `${summary.progress}%` }} />
          </span>
          <p className="muted">
            {summary.completed} de {summary.total} hitos completados.
          </p>
        </article>
        <SummaryMetricCard label="Total hitos" value={summary.total} />
        <SummaryMetricCard
          label="Completados"
          value={summary.completed}
          tone="success"
        />
        <SummaryMetricCard
          label="Pendientes"
          value={summary.pending}
          tone="warning"
        />
        <SummaryMetricCard
          label="Bloqueados"
          value={summary.blocked}
          tone="danger"
        />
        <SummaryMetricCard
          label="Próximo hito"
          value={
            nextMilestone
              ? displayMilestoneName(nextMilestone)
              : "Sin pendientes"
          }
          detail={
            nextMilestone
              ? milestoneSummary(nextMilestone)
              : "No hay acciones pendientes."
          }
        />
        <SummaryMetricCard
          label="Llegada estimada a Santiago"
          value={displayPlannedDate(santiagoArrival?.plannedDate)}
        />
        <SummaryMetricCard
          label="Activación de campaña"
          value={displayPlannedDate(campaignActivation?.plannedDate)}
        />
      </section>

      <section
        className="panel project-control"
        aria-labelledby="control-proyecto-title"
      >
        <div className="section-title">
          <div>
            <p className="eyebrow">Control operativo</p>
            <h2 id="control-proyecto-title">Control del proyecto</h2>
          </div>
          <span className={`badge severity-${insights.severity}`}>
            {insights.severityLabel}
          </span>
        </div>
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
                ? displayPlannedDate(nextMilestone.plannedDate)
                : "No hay acciones pendientes."
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
                : "Sin hitos vencidos."
            }
            tone={insights.overdueMilestones.length > 0 ? "danger" : undefined}
          />
          <SummaryMetricCard
            label="Próximos 7 días"
            value={insights.upcomingMilestones.length}
            detail={
              insights.upcomingMilestones[0]
                ? milestoneSummary(insights.upcomingMilestones[0])
                : "Sin hitos en los próximos 7 días."
            }
          />
          <SummaryMetricCard
            label="Bloqueados"
            value={insights.blockedMilestones.length}
            detail={
              insights.blockedMilestones[0]
                ? milestoneSummary(insights.blockedMilestones[0])
                : "Sin hitos bloqueados."
            }
            tone={insights.blockedMilestones.length > 0 ? "danger" : undefined}
          />
          <SummaryMetricCard
            label="Sin responsable"
            value={insights.milestonesWithoutOwner.length}
            detail={
              insights.milestonesWithoutOwner[0]
                ? milestoneSummary(insights.milestonesWithoutOwner[0])
                : "Todos los hitos pendientes tienen responsable."
            }
            tone={
              insights.milestonesWithoutOwner.length > 0 ? "warning" : undefined
            }
          />
          <SummaryMetricCard
            label="Aprobaciones pendientes"
            value={insights.pendingApprovalCount}
            detail={
              insights.pendingApprovalMilestones[0]
                ? milestoneSummary(insights.pendingApprovalMilestones[0])
                : "Sin aprobaciones pendientes."
            }
            tone={insights.pendingApprovalCount > 0 ? "warning" : undefined}
          />
        </div>
        <div className={`operational-alert-list ${insights.severity}`}>
          <strong>Alertas operativas</strong>
          {operationalAlerts.length === 0 ? (
            <p className="muted">Sin alertas operativas.</p>
          ) : (
            <ul>
              {operationalAlerts.map((alert) => (
                <li key={alert}>{alert}</li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <BulkAssignmentPanel
        action={bulkAssignMilestoneOwners}
        counts={bulkAssignmentCounts}
      />

      <nav className="section-tabs" aria-label="Secciones del proyecto">
        <a href="#control-proyecto-title">Control del proyecto</a>
        <a href="#asignacion-rapida">Asignación rápida</a>
        <a href="#operaciones">Operaciones / Proveedor</a>
        <a href="#marketing">Marketing / Campaña</a>
        <a href="#resumen-proyecto">Resumen del proyecto</a>
        <a href="#historial">Historial</a>
      </nav>

      <section className="panel" id="resumen-proyecto">
        <div className="section-title">
          <div>
            <p className="eyebrow">Resumen del proyecto</p>
            <h2>Contexto ejecutivo</h2>
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
        <p>{project.description || "Sin comentarios."}</p>
        <dl className="metadata-grid">
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

      <ActivityHistory activityLogs={activityLogs} />

      <MilestoneTable
        milestones={supplyMilestones}
        projectId={project.id}
        track="supply"
      />
      <MilestoneTable
        milestones={marketingMilestones}
        projectId={project.id}
        track="marketing"
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
                <option value="supply">{displayTrackLabel("supply")}</option>
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
              <span>
                Fecha planificada <em>*</em>
              </span>
              <input type="date" name="plannedDate" required />
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
    </AppShell>
  );
}
