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
  supply: "Operaciones / Proveedor",
  marketing: "Marketing / Campaña",
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

export const ROADMAP_MILESTONE_CODE_LABELS = {
  supply_internal_design_approval: "Aprobación del diseño interno",
  supply_purchase_order_submitted: "Orden de compra emitida",
  supply_supplier_sample_approval: "Aprobación de muestra del proveedor",
  supply_sample_correction_approval: "Aprobación de correcciones de muestra",
  supply_production_start: "Inicio de producción del proveedor",
  supply_estimated_shipment: "Fecha estimada de despacho desde proveedor",
  supply_estimated_arrival_santiago: "Fecha estimada de llegada a Santiago de Chile",
  supply_customs_release: "Liberación de aduana",
  supply_quilicura_warehouse_arrival: "Llegada a bodega Quilicura",
  marketing_campaign_concept: "Idea, conceptualización y desarrollo de campaña",
  marketing_implementation_date: "Fecha de implementación de campaña",
  marketing_activation_date: "Fecha de activación de campaña",
} as const;

export const ROADMAP_STANDARD_MILESTONE_TEMPLATES = [
  { code: "supply_internal_design_approval", name: ROADMAP_MILESTONE_CODE_LABELS.supply_internal_design_approval, track: "supply", sequence: 1, approvalStatus: "pending", notes: "Registrar estado de aprobación, enlace y responsable." },
  { code: "supply_purchase_order_submitted", name: ROADMAP_MILESTONE_CODE_LABELS.supply_purchase_order_submitted, track: "supply", sequence: 2, notes: "Registrar responsable, fecha y documento." },
  { code: "supply_supplier_sample_approval", name: ROADMAP_MILESTONE_CODE_LABELS.supply_supplier_sample_approval, track: "supply", sequence: 3, approvalStatus: "pending", notes: "Registrar fecha de recepción de muestra y decisión de aprobación." },
  { code: "supply_sample_correction_approval", name: ROADMAP_MILESTONE_CODE_LABELS.supply_sample_correction_approval, track: "supply", sequence: 4, approvalStatus: "pending", notes: "Registrar fecha de envío de corrección, recepción de muestra corregida y decisión." },
  { code: "supply_production_start", name: ROADMAP_MILESTONE_CODE_LABELS.supply_production_start, track: "supply", sequence: 5 },
  { code: "supply_estimated_shipment", name: ROADMAP_MILESTONE_CODE_LABELS.supply_estimated_shipment, track: "supply", sequence: 6 },
  { code: "supply_estimated_arrival_santiago", name: ROADMAP_MILESTONE_CODE_LABELS.supply_estimated_arrival_santiago, track: "supply", sequence: 7 },
  { code: "supply_customs_release", name: ROADMAP_MILESTONE_CODE_LABELS.supply_customs_release, track: "supply", sequence: 8 },
  { code: "supply_quilicura_warehouse_arrival", name: ROADMAP_MILESTONE_CODE_LABELS.supply_quilicura_warehouse_arrival, track: "supply", sequence: 9 },
  { code: "marketing_campaign_concept", name: ROADMAP_MILESTONE_CODE_LABELS.marketing_campaign_concept, track: "marketing", sequence: 10 },
  { code: "marketing_implementation_date", name: ROADMAP_MILESTONE_CODE_LABELS.marketing_implementation_date, track: "marketing", sequence: 11 },
  { code: "marketing_activation_date", name: ROADMAP_MILESTONE_CODE_LABELS.marketing_activation_date, track: "marketing", sequence: 12 },
] as const;
