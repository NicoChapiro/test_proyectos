export const ROADMAP_PRIORITIES = ["baja", "media", "alta", "urgente"] as const;
export const ROADMAP_STATUSES = ["no_iniciado", "en_curso", "en_riesgo", "bloqueado", "completado", "cancelado"] as const;
export const ROADMAP_TRAFFIC_LIGHTS = ["verde", "amarillo", "rojo", "gris"] as const;
export const ROADMAP_MILESTONE_STATUSES = ["pendiente", "en_curso", "completado", "atrasado", "cancelado"] as const;

export const ROADMAP_DEFAULT_COLORS: Record<string, string> = {
  verde: "#22c55e",
  amarillo: "#eab308",
  rojo: "#ef4444",
  gris: "#64748b",
};

export const ROADMAP_STATUS_LABELS: Record<(typeof ROADMAP_STATUSES)[number], string> = {
  no_iniciado: "No iniciado",
  en_curso: "En curso",
  en_riesgo: "En riesgo",
  bloqueado: "Bloqueado",
  completado: "Completado",
  cancelado: "Cancelado",
};
