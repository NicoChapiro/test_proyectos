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
