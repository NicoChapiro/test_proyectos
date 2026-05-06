export const ROADMAP_PRIORITIES = ["baja", "media", "alta", "urgente"] as const;
export const ROADMAP_STATUSES = ["no_iniciado", "en_curso", "en_riesgo", "bloqueado", "completado", "cancelado"] as const;
export const ROADMAP_TRAFFIC_LIGHTS = ["verde", "amarillo", "rojo", "gris"] as const;
export const ROADMAP_MILESTONE_STATUSES = ["pendiente", "en_curso", "completado", "atrasado", "cancelado"] as const;

export const ROADMAP_PROJECT_TYPES = [
  "packaging",
  "product_launch",
  "campaign",
  "trade_marketing",
  "ecommerce",
  "content_design",
  "event",
  "innovation",
  "regulatory_compliance",
  "internal_process",
  "other",
] as const;

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

export const ROADMAP_PROJECT_TYPE_LABELS: Record<(typeof ROADMAP_PROJECT_TYPES)[number], string> = {
  packaging: "Packaging",
  product_launch: "Lanzamiento de producto",
  campaign: "Campaña",
  trade_marketing: "Trade marketing",
  ecommerce: "Ecommerce",
  content_design: "Contenido / Diseño",
  event: "Evento",
  innovation: "Innovación",
  regulatory_compliance: "Regulatorio / Compliance",
  internal_process: "Proceso interno",
  other: "Otro",
};

export const ROADMAP_MILESTONE_TEMPLATES: Record<(typeof ROADMAP_PROJECT_TYPES)[number] | "generic", readonly string[]> = {
  generic: [
    "Brief aprobado",
    "Plan definido",
    "Producción / desarrollo",
    "Revisión interna",
    "Aprobaciones",
    "Lanzamiento / entrega",
    "Cierre / medición",
  ],
  packaging: [
    "Brief aprobado",
    "Diseño inicial",
    "Revisión interna",
    "Arte final aprobado",
    "Proveedor confirmado",
    "Producción / prueba color",
    "Entrega final",
  ],
  campaign: [
    "Brief aprobado",
    "Concepto creativo",
    "Plan de medios / canales",
    "Producción de piezas",
    "Revisión y aprobación",
    "Lanzamiento",
    "Reporte de resultados",
  ],
  product_launch: [
    "Definición de producto",
    "Business case / alcance",
    "Packaging / assets",
    "Material comercial",
    "Plan de lanzamiento",
    "Lanzamiento",
    "Revisión post lanzamiento",
  ],
  trade_marketing: [
    "Brief aprobado",
    "Plan definido",
    "Producción / desarrollo",
    "Revisión interna",
    "Aprobaciones",
    "Lanzamiento / entrega",
    "Cierre / medición",
  ],
  ecommerce: [
    "Brief aprobado",
    "Plan definido",
    "Producción / desarrollo",
    "Revisión interna",
    "Aprobaciones",
    "Lanzamiento / entrega",
    "Cierre / medición",
  ],
  content_design: [
    "Brief aprobado",
    "Plan definido",
    "Producción / desarrollo",
    "Revisión interna",
    "Aprobaciones",
    "Lanzamiento / entrega",
    "Cierre / medición",
  ],
  event: [
    "Brief aprobado",
    "Plan definido",
    "Producción / desarrollo",
    "Revisión interna",
    "Aprobaciones",
    "Lanzamiento / entrega",
    "Cierre / medición",
  ],
  innovation: [
    "Brief aprobado",
    "Plan definido",
    "Producción / desarrollo",
    "Revisión interna",
    "Aprobaciones",
    "Lanzamiento / entrega",
    "Cierre / medición",
  ],
  regulatory_compliance: [
    "Brief aprobado",
    "Plan definido",
    "Producción / desarrollo",
    "Revisión interna",
    "Aprobaciones",
    "Lanzamiento / entrega",
    "Cierre / medición",
  ],
  internal_process: [
    "Brief aprobado",
    "Plan definido",
    "Producción / desarrollo",
    "Revisión interna",
    "Aprobaciones",
    "Lanzamiento / entrega",
    "Cierre / medición",
  ],
  other: [
    "Brief aprobado",
    "Plan definido",
    "Producción / desarrollo",
    "Revisión interna",
    "Aprobaciones",
    "Lanzamiento / entrega",
    "Cierre / medición",
  ],
};
