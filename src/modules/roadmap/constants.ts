export const ROADMAP_PRIORITIES = ["baja", "media", "alta", "urgente"] as const;
export const ROADMAP_STATUSES = ["no_iniciado", "en_curso", "en_riesgo", "bloqueado", "completado", "cancelado"] as const;
export const ROADMAP_TRAFFIC_LIGHTS = ["verde", "amarillo", "rojo", "gris"] as const;
export const ROADMAP_MILESTONE_STATUSES = ["not_started", "in_progress", "completed", "blocked"] as const;
export const ROADMAP_MILESTONE_TRACKS = ["supply", "marketing"] as const;
export const ROADMAP_APPROVAL_STATUSES = ["pending", "approved", "rejected"] as const;

export const ROADMAP_PRIORITY_LABELS: Record<(typeof ROADMAP_PRIORITIES)[number], string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  urgente: "Urgente",
};

export const ROADMAP_TRAFFIC_LIGHT_LABELS: Record<(typeof ROADMAP_TRAFFIC_LIGHTS)[number], string> = {
  verde: "Verde",
  amarillo: "Amarillo",
  rojo: "Rojo",
  gris: "Gris",
};

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
  product_design_approval: "Aprobación de diseño",
  product_supplier_production_start: "Inicio de producción proveedor",
  product_quilicura_warehouse_arrival: "Llegada a bodega Quilicura",
  product_total_channel_implementation: "Implementación total en canales",
  marketing_brief_kickoff: "Brief & Kickoff",
  marketing_strategy_creative_proposal: "Estrategia & Propuesta Creativa",
  marketing_key_visual_approved: "KV aprobado",
  marketing_360_plan_materials: "Plan 360 & Materiales",
  marketing_launch_close: "Lanzamiento & Cierre",
  packaging_design_approval: "Aprobación de diseño",
  packaging_supplier_sample_approval: "Aprobación muestra proveedor",
  packaging_corrections_approval: "Aprobación de correcciones",
  packaging_production_start: "Inicio producción proveedor",
  packaging_quilicura_arrival: "Llegada a bodega Quilicura",
  trade_brief_kickoff: "Brief & Kickoff",
  trade_mechanics_approved: "Mecánica aprobada",
  trade_materials_ready: "Materiales listos",
  trade_implementation: "Implementación en punto de venta",
  trade_close: "Cierre y aprendizajes",
  ecommerce_brief_kickoff: "Brief & Kickoff",
  ecommerce_assets_ready: "Assets ecommerce listos",
  ecommerce_product_page_ready: "Ficha / landing publicada",
  ecommerce_campaign_activation: "Activación ecommerce",
  ecommerce_close: "Cierre y resultados",
  content_brief_kickoff: "Brief & Kickoff",
  content_creative_route: "Ruta creativa aprobada",
  content_assets_production: "Producción de piezas",
  content_final_approval: "Aprobación final",
  content_publication: "Publicación / entrega",
  event_brief_kickoff: "Brief & Kickoff",
  event_concept_approved: "Concepto aprobado",
  event_production_plan: "Plan de producción",
  event_execution: "Ejecución del evento",
  event_close: "Cierre y aprendizajes",
  innovation_feasibility_review: "Revisión de factibilidad",
  innovation_design_or_sample_approval: "Aprobación diseño / muestra",
  innovation_pilot_ready: "Piloto listo",
  innovation_channel_implementation: "Implementación en canales",
  compliance_requirement_review: "Revisión de requerimientos",
  compliance_documentation_ready: "Documentación lista",
  compliance_approval: "Aprobación compliance",
  compliance_implementation: "Implementación",
  process_brief_kickoff: "Brief & Kickoff",
  process_scope_definition: "Definición de alcance",
  process_implementation_plan: "Plan de implementación",
  process_execution: "Ejecución",
  process_close: "Cierre",
  generic_brief_kickoff: "Brief & Kickoff",
  generic_plan: "Plan de trabajo",
  generic_execution: "Ejecución",
  generic_close: "Cierre",
} as const;

export type RoadmapMilestoneTemplate = {
  code: keyof typeof ROADMAP_MILESTONE_CODE_LABELS;
  name: string;
  track: (typeof ROADMAP_MILESTONE_TRACKS)[number];
  sequence: number;
  approvalStatus?: (typeof ROADMAP_APPROVAL_STATUSES)[number];
  notes?: string;
};

function milestoneTemplate(
  code: keyof typeof ROADMAP_MILESTONE_CODE_LABELS,
  track: (typeof ROADMAP_MILESTONE_TRACKS)[number],
  sequence: number,
  options: Pick<RoadmapMilestoneTemplate, "approvalStatus" | "notes"> = {},
): RoadmapMilestoneTemplate {
  return { code, name: ROADMAP_MILESTONE_CODE_LABELS[code], track, sequence, ...options };
}

const approvalMilestoneTemplate = (
  code: keyof typeof ROADMAP_MILESTONE_CODE_LABELS,
  track: (typeof ROADMAP_MILESTONE_TRACKS)[number],
  sequence: number,
  notes?: string,
): RoadmapMilestoneTemplate => milestoneTemplate(code, track, sequence, { approvalStatus: "pending", ...(notes ? { notes } : {}) });

export const ROADMAP_STANDARD_MILESTONE_TEMPLATES = [
  approvalMilestoneTemplate("supply_internal_design_approval", "supply", 1, "Registrar estado de aprobación, enlace y responsable."),
  milestoneTemplate("supply_purchase_order_submitted", "supply", 2, { notes: "Registrar responsable, fecha y documento." }),
  approvalMilestoneTemplate("supply_supplier_sample_approval", "supply", 3, "Registrar fecha de recepción de muestra y decisión de aprobación."),
  approvalMilestoneTemplate("supply_sample_correction_approval", "supply", 4, "Registrar fecha de envío de corrección, recepción de muestra corregida y decisión."),
  milestoneTemplate("supply_production_start", "supply", 5),
  milestoneTemplate("supply_estimated_shipment", "supply", 6),
  milestoneTemplate("supply_estimated_arrival_santiago", "supply", 7),
  milestoneTemplate("supply_customs_release", "supply", 8),
  milestoneTemplate("supply_quilicura_warehouse_arrival", "supply", 9),
  milestoneTemplate("marketing_campaign_concept", "marketing", 10),
  milestoneTemplate("marketing_implementation_date", "marketing", 11),
  milestoneTemplate("marketing_activation_date", "marketing", 12),
] as const satisfies readonly RoadmapMilestoneTemplate[];

export const ROADMAP_PROJECT_TYPE_MILESTONE_TEMPLATES = {
  product_launch: [
    approvalMilestoneTemplate("product_design_approval", "supply", 1),
    milestoneTemplate("product_supplier_production_start", "supply", 2),
    milestoneTemplate("product_quilicura_warehouse_arrival", "supply", 3),
    milestoneTemplate("product_total_channel_implementation", "supply", 4),
    milestoneTemplate("marketing_brief_kickoff", "marketing", 1),
    milestoneTemplate("marketing_strategy_creative_proposal", "marketing", 2),
    approvalMilestoneTemplate("marketing_key_visual_approved", "marketing", 3),
    milestoneTemplate("marketing_360_plan_materials", "marketing", 4),
    milestoneTemplate("marketing_launch_close", "marketing", 5),
  ],
  packaging: [
    approvalMilestoneTemplate("packaging_design_approval", "supply", 1),
    approvalMilestoneTemplate("packaging_supplier_sample_approval", "supply", 2),
    approvalMilestoneTemplate("packaging_corrections_approval", "supply", 3),
    milestoneTemplate("packaging_production_start", "supply", 4),
    milestoneTemplate("packaging_quilicura_arrival", "supply", 5),
    milestoneTemplate("marketing_brief_kickoff", "marketing", 1),
    approvalMilestoneTemplate("marketing_key_visual_approved", "marketing", 2),
    milestoneTemplate("marketing_launch_close", "marketing", 3),
  ],
  campaign: [
    milestoneTemplate("marketing_brief_kickoff", "marketing", 1),
    milestoneTemplate("marketing_strategy_creative_proposal", "marketing", 2),
    approvalMilestoneTemplate("marketing_key_visual_approved", "marketing", 3),
    milestoneTemplate("marketing_360_plan_materials", "marketing", 4),
    milestoneTemplate("marketing_launch_close", "marketing", 5),
  ],
  trade_marketing: [
    milestoneTemplate("trade_brief_kickoff", "marketing", 1),
    approvalMilestoneTemplate("trade_mechanics_approved", "marketing", 2),
    milestoneTemplate("trade_materials_ready", "marketing", 3),
    milestoneTemplate("trade_implementation", "marketing", 4),
    milestoneTemplate("trade_close", "marketing", 5),
  ],
  ecommerce: [
    milestoneTemplate("ecommerce_brief_kickoff", "marketing", 1),
    milestoneTemplate("ecommerce_assets_ready", "marketing", 2),
    milestoneTemplate("ecommerce_product_page_ready", "marketing", 3),
    milestoneTemplate("ecommerce_campaign_activation", "marketing", 4),
    milestoneTemplate("ecommerce_close", "marketing", 5),
  ],
  content_design: [
    milestoneTemplate("content_brief_kickoff", "marketing", 1),
    approvalMilestoneTemplate("content_creative_route", "marketing", 2),
    milestoneTemplate("content_assets_production", "marketing", 3),
    approvalMilestoneTemplate("content_final_approval", "marketing", 4),
    milestoneTemplate("content_publication", "marketing", 5),
  ],
  event: [
    milestoneTemplate("event_brief_kickoff", "marketing", 1),
    approvalMilestoneTemplate("event_concept_approved", "marketing", 2),
    milestoneTemplate("event_production_plan", "marketing", 3),
    milestoneTemplate("event_execution", "marketing", 4),
    milestoneTemplate("event_close", "marketing", 5),
  ],
  innovation: [
    milestoneTemplate("innovation_feasibility_review", "supply", 1),
    approvalMilestoneTemplate("innovation_design_or_sample_approval", "supply", 2),
    milestoneTemplate("innovation_pilot_ready", "supply", 3),
    milestoneTemplate("innovation_channel_implementation", "supply", 4),
    milestoneTemplate("marketing_brief_kickoff", "marketing", 1),
    milestoneTemplate("marketing_strategy_creative_proposal", "marketing", 2),
    milestoneTemplate("marketing_launch_close", "marketing", 3),
  ],
  regulatory_compliance: [
    milestoneTemplate("compliance_requirement_review", "supply", 1),
    milestoneTemplate("compliance_documentation_ready", "supply", 2),
    approvalMilestoneTemplate("compliance_approval", "supply", 3),
    milestoneTemplate("compliance_implementation", "supply", 4),
  ],
  internal_process: [
    milestoneTemplate("process_brief_kickoff", "marketing", 1),
    milestoneTemplate("process_scope_definition", "marketing", 2),
    milestoneTemplate("process_implementation_plan", "marketing", 3),
    milestoneTemplate("process_execution", "marketing", 4),
    milestoneTemplate("process_close", "marketing", 5),
  ],
  other: [
    milestoneTemplate("generic_brief_kickoff", "marketing", 1),
    milestoneTemplate("generic_plan", "marketing", 2),
    milestoneTemplate("generic_execution", "marketing", 3),
    milestoneTemplate("generic_close", "marketing", 4),
  ],
} as const satisfies Record<(typeof ROADMAP_PROJECT_TYPES)[number], readonly RoadmapMilestoneTemplate[]>;
