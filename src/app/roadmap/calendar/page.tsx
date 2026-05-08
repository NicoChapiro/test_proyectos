import Link from "next/link";
import { searchRoadmapProjects } from "@/modules/roadmap/service";
import {
  ROADMAP_SEVERITY_LABELS,
  buildRoadmapProjectInsights,
  type RoadmapProjectInsights,
} from "@/modules/roadmap/insights";
import {
  ROADMAP_PROJECT_TYPE_LABELS,
  ROADMAP_PROJECT_TYPES,
  ROADMAP_STATUS_LABELS,
} from "@/modules/roadmap/constants";
import type { RoadmapProjectWithMilestones } from "@/modules/roadmap/types";
import { displayPlannedDate } from "@/modules/roadmap/ui/date";
import {
  displayApprovalStatus,
  displayMilestoneName,
  displayMilestoneStatus,
} from "@/modules/roadmap/ui/labels";
import { AppShell, KpiCard, PageHeader } from "@/modules/roadmap/ui/shell";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Record<string, string | string[] | undefined>;
type PageProps = { searchParams: Promise<SearchParams> };
type ProjectInsights = RoadmapProjectInsights<
  RoadmapProjectWithMilestones["milestones"][number]
>;
type CalendarProject = RoadmapProjectWithMilestones & {
  insights: ProjectInsights;
};
type CalendarEvent = {
  projectId: string;
  projectName: string;
  projectCode: string;
  projectArea: string | null;
  projectType: CalendarProject["projectType"];
  projectStatus: CalendarProject["status"];
  projectSeverity: ProjectInsights["severity"];
  milestoneId: string;
  milestoneName: string;
  milestoneCode: string | null;
  milestoneStatus: CalendarProject["milestones"][number]["status"];
  plannedDate: Date;
  ownerName: string | null;
  approvalStatus: CalendarProject["milestones"][number]["approvalStatus"];
  track: CalendarProject["milestones"][number]["track"];
};
type CalendarDay = {
  key: string;
  date: Date | null;
  dayNumber: number | null;
};

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;
const WEEKDAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;
const AGENDA_LIMIT = 12;
const CAMPAIGN_LOGISTICS_CODES = new Set([
  "marketing_campaign_concept",
  "marketing_implementation_date",
  "marketing_activation_date",
  "supply_estimated_arrival_santiago",
  "supply_quilicura_warehouse_arrival",
  "supply_estimated_shipment",
  "supply_customs_release",
]);

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function currentUtcYear(): number {
  return new Date().getUTCFullYear();
}

function currentUtcMonth(): number {
  return new Date().getUTCMonth() + 1;
}

function validYear(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 2000 && parsed <= 2100
    ? parsed
    : currentUtcYear();
}

function validMonth(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 12
    ? parsed
    : currentUtcMonth();
}

function startOfUtcToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function monthTitle(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function buildCalendarDays(year: number, month: number): CalendarDay[] {
  const monthIndex = month - 1;
  const firstDay = new Date(Date.UTC(year, monthIndex, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const leadingBlankDays = (firstDay.getUTCDay() + 6) % 7;
  const populatedCells = leadingBlankDays + daysInMonth;
  const trailingBlankDays = (7 - (populatedCells % 7)) % 7;

  return [
    ...Array.from({ length: leadingBlankDays }, (_, index) => ({
      key: `blank-start-${index}`,
      date: null,
      dayNumber: null,
    })),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const date = new Date(Date.UTC(year, monthIndex, index + 1));
      return { key: dateKey(date), date, dayNumber: index + 1 };
    }),
    ...Array.from({ length: trailingBlankDays }, (_, index) => ({
      key: `blank-end-${index}`,
      date: null,
      dayNumber: null,
    })),
  ];
}

function normalizeFilter(value: string | undefined): string | undefined {
  return value?.trim() ? value.trim().toLowerCase() : undefined;
}

function labelArea(area: string | null | undefined): string {
  if (!area?.trim()) return "Sin área";
  return area
    .trim()
    .toLocaleLowerCase("es")
    .replace(/(^|[\s/])\p{L}/gu, (letter) => letter.toLocaleUpperCase("es"));
}

function buildQuery(params: {
  year: number;
  month: number;
  area?: string;
  type?: string;
}): string {
  const query = new URLSearchParams({
    year: String(params.year),
    month: String(params.month),
  });
  if (params.area) query.set("area", params.area);
  if (params.type) query.set("type", params.type);
  return `/roadmap/calendar?${query.toString()}`;
}

function adjacentMonth(year: number, month: number, direction: -1 | 1) {
  const date = new Date(Date.UTC(year, month - 1 + direction, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function flattenCalendarEvents(projects: CalendarProject[]): CalendarEvent[] {
  return projects.flatMap((project) =>
    project.milestones
      .filter((milestone) => milestone.plannedDate)
      .map((milestone) => ({
        projectId: project.id,
        projectName: project.name,
        projectCode: project.code,
        projectArea: project.area,
        projectType: project.projectType,
        projectStatus: project.status,
        projectSeverity: project.insights.severity,
        milestoneId: milestone.id,
        milestoneName: displayMilestoneName(milestone),
        milestoneCode: milestone.milestoneCode,
        milestoneStatus: milestone.status,
        plannedDate: milestone.plannedDate as Date,
        ownerName: milestone.ownerName,
        approvalStatus: milestone.approvalStatus,
        track: milestone.track,
      })),
  );
}

function isSelectedMonth(event: CalendarEvent, year: number, month: number): boolean {
  return (
    event.plannedDate.getUTCFullYear() === year &&
    event.plannedDate.getUTCMonth() + 1 === month
  );
}

function isBlocked(event: CalendarEvent): boolean {
  return event.milestoneStatus === "blocked";
}

function isOverdue(event: CalendarEvent, today: Date): boolean {
  return event.plannedDate < today && event.milestoneStatus !== "completed";
}

function isPendingApproval(event: CalendarEvent): boolean {
  return event.approvalStatus === "pending" && event.milestoneStatus !== "completed";
}

function isCampaignOrLogistics(event: CalendarEvent): boolean {
  return Boolean(event.milestoneCode && CAMPAIGN_LOGISTICS_CODES.has(event.milestoneCode));
}

function eventPriority(event: CalendarEvent, today: Date): number {
  if (isBlocked(event)) return 0;
  if (isOverdue(event, today)) return 1;
  if (isPendingApproval(event)) return 2;
  if (isCampaignOrLogistics(event)) return 3;
  return 4;
}

function sortEventsByPriority(today: Date) {
  return (firstEvent: CalendarEvent, secondEvent: CalendarEvent): number =>
    eventPriority(firstEvent, today) - eventPriority(secondEvent, today) ||
    firstEvent.projectName.localeCompare(secondEvent.projectName, "es") ||
    firstEvent.milestoneName.localeCompare(secondEvent.milestoneName, "es");
}

function sortEventsForAgenda(today: Date) {
  const byPriority = sortEventsByPriority(today);
  return (firstEvent: CalendarEvent, secondEvent: CalendarEvent): number =>
    firstEvent.plannedDate.getTime() - secondEvent.plannedDate.getTime() ||
    byPriority(firstEvent, secondEvent);
}

function filterEvents(
  events: CalendarEvent[],
  year: number,
  month: number,
  area: string | undefined,
  type: string | undefined,
): CalendarEvent[] {
  const normalizedArea = normalizeFilter(area);
  const normalizedType = normalizeFilter(type);

  return events.filter((event) => {
    if (!isSelectedMonth(event, year, month)) return false;
    if (normalizedArea && event.projectArea?.trim().toLowerCase() !== normalizedArea) return false;
    if (normalizedType && String(event.projectType).toLowerCase() !== normalizedType) return false;
    return true;
  });
}

function groupEventsByDay(events: CalendarEvent[], today: Date): Map<string, CalendarEvent[]> {
  const groupedEvents = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const key = dateKey(event.plannedDate);
    groupedEvents.set(key, [...(groupedEvents.get(key) ?? []), event]);
  }
  for (const [key, dayEvents] of groupedEvents) {
    groupedEvents.set(key, dayEvents.sort(sortEventsByPriority(today)));
  }
  return groupedEvents;
}

function dayTone(events: CalendarEvent[], today: Date): "danger" | "warning" | "neutral" {
  if (events.some((event) => isBlocked(event) || isOverdue(event, today))) return "danger";
  if (events.some((event) => isPendingApproval(event) || !event.ownerName?.trim())) return "warning";
  return "neutral";
}

function eventTone(event: CalendarEvent, today: Date): "danger" | "warning" | "blue" | "slate" {
  if (isBlocked(event) || isOverdue(event, today)) return "danger";
  if (isPendingApproval(event) || !event.ownerName?.trim()) return "warning";
  if (isCampaignOrLogistics(event)) return "blue";
  return "slate";
}

function eventRiskLabel(event: CalendarEvent, today: Date): string {
  if (isBlocked(event)) return "Bloqueado";
  if (isOverdue(event, today)) return "Vencido";
  if (isPendingApproval(event)) return "Aprobación";
  if (!event.ownerName?.trim()) return "Sin responsable";
  if (isCampaignOrLogistics(event)) return event.track === "marketing" ? "Campaña" : "Logística";
  return "Hito";
}

function uniqueAreas(projects: CalendarProject[], selectedArea?: string): string[] {
  const areas = new Map<string, string>();
  for (const project of projects) {
    if (project.area?.trim()) areas.set(project.area.trim().toLowerCase(), project.area.trim());
  }
  if (selectedArea?.trim()) areas.set(selectedArea.trim().toLowerCase(), selectedArea.trim());
  return [...areas.values()].sort((firstArea, secondArea) => labelArea(firstArea).localeCompare(labelArea(secondArea), "es"));
}

function CalendarCell({ day, events, today }: { day: CalendarDay; events: CalendarEvent[]; today: Date }) {
  if (!day.date || day.dayNumber === null) return <div className="calendar-day blank" aria-hidden="true" />;

  const visibleEvents = events.slice(0, 3);
  const remainingEvents = Math.max(events.length - visibleEvents.length, 0);
  const tone = dayTone(events, today);

  return (
    <article className={`calendar-day ${tone}`}>
      <div className="calendar-day-header">
        <span className="calendar-day-number">{day.dayNumber}</span>
        {events.length > 0 ? <span className="calendar-count">{events.length} hitos</span> : null}
      </div>
      <div className="calendar-events">
        {visibleEvents.map((event) => (
          <Link className={`calendar-event-chip ${eventTone(event, today)}`} href={`/roadmap/${event.projectId}`} key={event.milestoneId}>
            <span className="calendar-event-dot" aria-hidden="true" />
            <span className="calendar-event-text">
              <strong>{event.milestoneName}</strong>
              <small>{event.projectName}</small>
            </span>
            <em>{eventRiskLabel(event, today)}</em>
          </Link>
        ))}
        {remainingEvents > 0 ? <span className="calendar-more">+ {remainingEvents} más</span> : null}
      </div>
    </article>
  );
}

export default async function CalendarRoadmapPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const year = validYear(first(params.year));
  const month = validMonth(first(params.month));
  const selectedArea = first(params.area)?.trim() || undefined;
  const selectedType = first(params.type)?.trim() || undefined;
  const today = startOfUtcToday();
  const projects = await searchRoadmapProjects({ year });
  const calendarProjects: CalendarProject[] = projects.map((project) => ({
    ...project,
    insights: buildRoadmapProjectInsights(project.milestones, today),
  }));
  const allEvents = flattenCalendarEvents(calendarProjects);
  const monthEventsBeforeFilters = allEvents.filter((event) => isSelectedMonth(event, year, month));
  const monthEvents = filterEvents(allEvents, year, month, selectedArea, selectedType);
  const sortedMonthEvents = [...monthEvents].sort(sortEventsForAgenda(today));
  const groupedEvents = groupEventsByDay(monthEvents, today);
  const calendarDays = buildCalendarDays(year, month);
  const previousMonth = adjacentMonth(year, month, -1);
  const nextMonth = adjacentMonth(year, month, 1);
  const agendaEvents = sortedMonthEvents.slice(0, AGENDA_LIMIT);
  const remainingAgendaEvents = Math.max(sortedMonthEvents.length - AGENDA_LIMIT, 0);
  const hasActiveFilters = Boolean(selectedArea || selectedType);
  const emptyMessage =
    hasActiveFilters && monthEventsBeforeFilters.length > 0
      ? "No hay hitos para los filtros seleccionados."
      : "No hay hitos planificados para este mes.";
  const daysWithActivity = groupedEvents.size;
  const blockedOrOverdue = monthEvents.filter((event) => isBlocked(event) || isOverdue(event, today)).length;
  const pendingApprovals = monthEvents.filter(isPendingApproval).length;
  const withoutOwner = monthEvents.filter((event) => !event.ownerName?.trim()).length;
  const campaignAndLogistics = monthEvents.filter(isCampaignOrLogistics).length;
  const areaOptions = uniqueAreas(calendarProjects, selectedArea);

  return (
    <AppShell active="calendar">
      <PageHeader
        eyebrow="CALENDARIO ROADMAP"
        title={`Calendario de hitos · ${monthTitle(year, month)}`}
        subtitle="Vista mensual para revisar lanzamientos, activaciones de campaña, aprobaciones, llegadas logísticas y hitos críticos por proyecto."
        actions={
          <>
            <Link className="button secondary" href="/roadmap">
              Volver al roadmap
            </Link>
            <Link className="button primary" href="/roadmap/new">
              Nuevo proyecto
            </Link>
          </>
        }
      />

      <form className="panel filter-panel calendar-filter">
        <div className="filter-heading">
          <div>
            <p className="eyebrow">Filtro simple</p>
            <h2>Revisar calendario</h2>
          </div>
          <div className="filter-actions">
            <Link className="button secondary" href="/roadmap/calendar">
              Mes actual
            </Link>
            <button className="button primary" type="submit">
              Aplicar
            </button>
          </div>
        </div>
        <div className="filter-grid calendar-filter-grid">
          <label className="field">
            <span>Año</span>
            <input name="year" type="number" min="2000" max="2100" defaultValue={year} />
          </label>
          <label className="field">
            <span>Mes</span>
            <select name="month" defaultValue={month}>
              {MONTH_NAMES.map((label, index) => (
                <option value={index + 1} key={label}>{label}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Área</span>
            <select name="area" defaultValue={selectedArea ?? ""}>
              <option value="">Todas las áreas</option>
              {areaOptions.map((area) => (
                <option value={area} key={area}>{labelArea(area)}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Tipo de proyecto</span>
            <select name="type" defaultValue={selectedType ?? ""}>
              <option value="">Todos los tipos</option>
              {ROADMAP_PROJECT_TYPES.map((type) => (
                <option value={type} key={type}>{ROADMAP_PROJECT_TYPE_LABELS[type]}</option>
              ))}
            </select>
          </label>
        </div>
      </form>

      <section className="kpi-grid calendar-kpis" aria-label="Indicadores del calendario mensual">
        <KpiCard label="Hitos del mes" value={monthEvents.length} tone="slate" detail={monthTitle(year, month)} />
        <KpiCard label="Días con actividad" value={daysWithActivity} tone="blue" detail="Fechas con hitos" />
        <KpiCard label="Bloqueados / vencidos" value={blockedOrOverdue} tone={blockedOrOverdue > 0 ? "red" : "green"} detail="Requieren acción" />
        <KpiCard label="Aprobaciones pendientes" value={pendingApprovals} tone={pendingApprovals > 0 ? "amber" : "green"} detail="Decisiones abiertas" />
        <KpiCard label="Sin responsable" value={withoutOwner} tone={withoutOwner > 0 ? "amber" : "green"} detail="Asignación pendiente" />
        <KpiCard label="Campañas y logística" value={campaignAndLogistics} tone="blue" detail="Activaciones y llegadas" />
      </section>

      <section className="calendar-month-nav" aria-label="Navegación mensual">
        <Link className="button secondary" href={buildQuery({ ...previousMonth, area: selectedArea, type: selectedType })}>Mes anterior</Link>
        <strong>{monthTitle(year, month)}</strong>
        <Link className="button secondary" href={buildQuery({ ...nextMonth, area: selectedArea, type: selectedType })}>Mes siguiente</Link>
      </section>

      <div className="calendar-dashboard-grid">
        <section className="panel calendar-panel" aria-label={`Calendario de ${monthTitle(year, month)}`}>
          <div className="calendar-panel-header">
            <div>
              <p className="eyebrow">Vista mensual</p>
              <h2>{monthTitle(year, month)}</h2>
            </div>
            <div className="calendar-legend" aria-label="Leyenda de riesgo">
              <span className="legend-risk danger">Riesgo alto</span>
              <span className="legend-risk warning">Atención</span>
              <span className="legend-risk neutral">Normal</span>
            </div>
          </div>
          <div className="calendar-weekdays" aria-hidden="true">
            {WEEKDAY_NAMES.map((weekday) => <span key={weekday}>{weekday}</span>)}
          </div>
          <div className="calendar-grid">
            {calendarDays.map((day) => (
              <CalendarCell day={day} events={day.date ? groupedEvents.get(dateKey(day.date)) ?? [] : []} today={today} key={day.key} />
            ))}
          </div>
          {monthEvents.length === 0 ? <p className="calendar-empty">{emptyMessage}</p> : null}
        </section>

        <aside className="panel calendar-agenda" aria-label="Agenda del mes">
          <div className="calendar-panel-header compact">
            <div>
              <p className="eyebrow">Resumen operativo</p>
              <h2>Agenda del mes</h2>
            </div>
            <span className="badge slate">{agendaEvents.length} visibles</span>
          </div>
          {agendaEvents.length > 0 ? (
            <div className="calendar-agenda-list">
              {agendaEvents.map((event) => (
                <article className={`calendar-agenda-item ${eventTone(event, today)}`} key={`agenda-${event.milestoneId}`}>
                  <div className="calendar-agenda-date">
                    <strong>{event.plannedDate.getUTCDate()}</strong>
                    <span>{MONTH_NAMES[event.plannedDate.getUTCMonth()].slice(0, 3)}</span>
                  </div>
                  <div className="calendar-agenda-body">
                    <div className="calendar-agenda-title">
                      <h3>{event.projectName}</h3>
                      <span className={`badge severity-${event.projectSeverity}`}>{ROADMAP_SEVERITY_LABELS[event.projectSeverity]}</span>
                    </div>
                    <p>{event.milestoneName}</p>
                    <dl className="calendar-agenda-meta">
                      <div>
                        <dt>Fecha</dt>
                        <dd>{displayPlannedDate(event.plannedDate)}</dd>
                      </div>
                      <div>
                        <dt>Responsable</dt>
                        <dd>{event.ownerName || "Sin responsable"}</dd>
                      </div>
                      <div>
                        <dt>Estado</dt>
                        <dd>{displayMilestoneStatus(event.milestoneStatus)}</dd>
                      </div>
                      <div>
                        <dt>Proyecto</dt>
                        <dd>{ROADMAP_STATUS_LABELS[event.projectStatus]}</dd>
                      </div>
                      {event.approvalStatus ? (
                        <div>
                          <dt>Aprobación</dt>
                          <dd>{displayApprovalStatus(event.approvalStatus)}</dd>
                        </div>
                      ) : null}
                      <div>
                        <dt>Tipo</dt>
                        <dd>{ROADMAP_PROJECT_TYPE_LABELS[event.projectType]}</dd>
                      </div>
                    </dl>
                    <Link className="text-button" href={`/roadmap/${event.projectId}`}>Ver proyecto</Link>
                  </div>
                </article>
              ))}
              {remainingAgendaEvents > 0 ? <p className="calendar-more-agenda">+ {remainingAgendaEvents} hitos más este mes</p> : null}
            </div>
          ) : (
            <p className="calendar-empty agenda-empty">{emptyMessage}</p>
          )}
        </aside>
      </div>
    </AppShell>
  );
}
