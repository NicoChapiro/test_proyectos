export function inputDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

export function displayDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(date));
}

export function clampYearPercent(date: Date | string, year: number): number {
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year, 11, 31, 23, 59, 59, 999);
  const value = new Date(date).getTime();
  const clamped = Math.min(Math.max(value, start), end);
  return ((clamped - start) / (end - start)) * 100;
}


const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"] as const;
const QUARTER_LABELS = ["Q1", "Q2", "Q3", "Q4"] as const;

function yearBoundaryDate(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 1));
}

export function buildYearTimelineScale(year: number) {
  const months = MONTH_LABELS.map((label, index) => {
    const start = clampYearPercent(yearBoundaryDate(year, index), year);
    const end = index === MONTH_LABELS.length - 1 ? 100 : clampYearPercent(yearBoundaryDate(year, index + 1), year);

    return {
      label,
      start,
      end,
      width: end - start,
      isQuarterStart: index > 0 && index % 3 === 0,
    };
  });

  const quarters = QUARTER_LABELS.map((label, index) => {
    const firstMonth = months[index * 3];
    const lastMonth = months[index * 3 + 2];

    return {
      label,
      range: `${firstMonth.label} - ${lastMonth.label}`,
      start: firstMonth.start,
      end: lastMonth.end,
      width: lastMonth.end - firstMonth.start,
    };
  });

  return { months, quarters };
}

export function displayPlannedDate(date: Date | string | null | undefined): string {
  return date ? displayDate(date) : "Sin fecha";
}
