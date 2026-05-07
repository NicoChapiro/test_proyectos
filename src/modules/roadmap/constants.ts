export const ROADMAP_PRIORITIES = ["baja", "media", "alta", "urgente"] as const;
export const ROADMAP_STATUSES = ["no_iniciado", "en_curso", "en_riesgo", "bloqueado", "completado", "cancelado"] as const;
export const ROADMAP_TRAFFIC_LIGHTS = ["verde", "amarillo", "rojo", "gris"] as const;
export const ROADMAP_MILESTONE_STATUSES = ["not_started", "in_progress", "completed", "blocked"] as const;
export const ROADMAP_MILESTONE_TRACKS = ["supply", "marketing"] as const;
export const ROADMAP_APPROVAL_STATUSES = ["pending", "approved", "rejected"] as const;

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

export const ROADMAP_MILESTONE_STATUS_LABELS: Record<(typeof ROADMAP_MILESTONE_STATUSES)[number], string> = {
  not_started: "No iniciado",
  in_progress: "En curso",
  completed: "Completado",
  blocked: "Bloqueado",
};

export const ROADMAP_APPROVAL_STATUS_LABELS: Record<(typeof ROADMAP_APPROVAL_STATUSES)[number], string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
};

export const ROADMAP_TRACK_LABELS: Record<(typeof ROADMAP_MILESTONE_TRACKS)[number], string> = {
  supply: "Supply / Operaciones / Proveedores",
  marketing: "Marketing campaign",
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

export const ROADMAP_STANDARD_MILESTONE_TEMPLATES = [
  { code: "supply_internal_design_approval", name: "Internal design approval", track: "supply", sequence: 1, approvalStatus: "pending", notes: "Track approval status, link and owner." },
  { code: "supply_purchase_order_submitted", name: "Purchase order submitted", track: "supply", sequence: 2, notes: "Track owner, date and document." },
  { code: "supply_supplier_sample_approval", name: "Supplier sample approval", track: "supply", sequence: 3, approvalStatus: "pending", notes: "Track sample received date and approval decision." },
  { code: "supply_sample_correction_approval", name: "Sample correction approval", track: "supply", sequence: 4, approvalStatus: "pending", notes: "Track correction sent date, corrected sample received date and approval decision." },
  { code: "supply_production_start", name: "Supplier production start", track: "supply", sequence: 5 },
  { code: "supply_estimated_shipment", name: "Estimated shipment date from supplier", track: "supply", sequence: 6 },
  { code: "supply_estimated_arrival_santiago", name: "Estimated arrival date to Santiago de Chile", track: "supply", sequence: 7 },
  { code: "supply_customs_release", name: "Customs release date", track: "supply", sequence: 8 },
  { code: "supply_quilicura_warehouse_arrival", name: "Arrival at Quilicura warehouse", track: "supply", sequence: 9 },
  { code: "marketing_campaign_concept", name: "Campaign idea / concept / development", track: "marketing", sequence: 10 },
  { code: "marketing_implementation_date", name: "Campaign implementation date", track: "marketing", sequence: 11 },
  { code: "marketing_activation_date", name: "Campaign activation date", track: "marketing", sequence: 12 },
] as const;
