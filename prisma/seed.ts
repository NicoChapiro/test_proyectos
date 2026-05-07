import { PrismaClient } from "@prisma/client";
import { ROADMAP_STANDARD_MILESTONE_TEMPLATES } from "../src/modules/roadmap/constants";

const prisma = new PrismaClient();

const packagingSamples = [
  ["PKG-2026-001", "Packaging sustentable línea norte", "Camila Rojas", "Marca Norte", "Sustentabilidad", "2026-06-30"],
  ["PKG-2026-002", "Ajustes empaque premium", "Diego Silva", "Premium", "Innovación", "2026-09-15"],
] as const;

const samples = [
  { code: "RMP-2026-001", name: "Lanzamiento empaques sustentables", projectType: "packaging", area: "Marketing de producto", channel: "Retail", category: "Sustentabilidad", brand: "Marca Norte", ownerName: "Camila Rojas", priority: "alta", status: "en_curso", startDate: "2026-01-15", targetDate: "2026-06-30", trafficLight: "verde" },
  { code: "RMP-2026-002", name: "Campaña always-on premium", projectType: "campaign", area: "Marca", channel: "Digital", category: "Innovación", brand: "Premium", ownerName: "Diego Silva", priority: "media", status: "no_iniciado", startDate: "2026-03-01", targetDate: "2026-09-15", trafficLight: "gris" },
  { code: "RMP-2026-003", name: "Migración proveedores críticos", projectType: "internal_process", area: "Operaciones comerciales", channel: "Interno", category: "Operaciones", brand: "Todas", ownerName: "Antonia Pérez", priority: "urgente", status: "en_riesgo", startDate: "2026-02-10", targetDate: "2026-11-30", trafficLight: "amarillo" },
  { code: "RMP-2026-004", name: "Relanzamiento canal e-commerce", projectType: "ecommerce", area: "Ecommerce", channel: "Online", category: "Comercial", brand: "Digital", ownerName: "Javier Torres", priority: "alta", status: "bloqueado", startDate: "2026-04-01", targetDate: "2026-08-31", trafficLight: "rojo" },
  { code: "RMP-2026-005", name: "Evento anual con clientes", projectType: "event", area: "Trade marketing", channel: "Eventos", category: "Relación clientes", brand: "Corporativo", ownerName: "María Gómez", priority: "media", status: "en_curso", startDate: "2026-07-01", targetDate: "2026-12-15", trafficLight: "verde" },
] as const;

async function main() {
  for (const [code, title, requesterName, brand, category, desiredLaunchDate] of packagingSamples) {
    await prisma.packagingRequest.upsert({
      where: { code },
      update: {},
      create: {
        code,
        title,
        description: `Solicitud de ejemplo para ${brand}.`,
        requesterName,
        brand,
        category,
        status: "recibida",
        desiredLaunchDate: new Date(`${desiredLaunchDate}T00:00:00.000Z`),
      },
    });
  }

  for (const sample of samples) {
    await prisma.roadmapProject.upsert({
      where: { code: sample.code },
      update: {},
      create: {
        code: sample.code,
        name: sample.name,
        description: `Proyecto de Marketing de ejemplo para ${sample.category.toLowerCase()}.`,
        projectType: sample.projectType,
        area: sample.area,
        channel: sample.channel,
        category: sample.category,
        brand: sample.brand,
        ownerName: sample.ownerName,
        priority: sample.priority,
        status: sample.status,
        startDate: new Date(`${sample.startDate}T00:00:00.000Z`),
        targetDate: new Date(`${sample.targetDate}T00:00:00.000Z`),
        trafficLight: sample.trafficLight,
        milestones: {
          create: ROADMAP_STANDARD_MILESTONE_TEMPLATES.map((template) => {
            const plannedDate = template.code === "marketing_activation_date"
              ? new Date(`${sample.targetDate}T00:00:00.000Z`)
              : new Date(`${sample.startDate}T00:00:00.000Z`);
            return {
              name: template.name,
              milestoneCode: template.code,
              track: template.track,
              sequence: template.sequence,
              sortOrder: template.sequence,
              status: template.sequence === 1 ? "completed" : "not_started",
              ownerName: template.sequence === 1 ? sample.ownerName : null,
              plannedDate,
              actualDate: template.sequence === 1 ? plannedDate : null,
              completedAt: template.sequence === 1 ? plannedDate : null,
              dueDate: plannedDate,
              approvalStatus: "approvalStatus" in template ? template.approvalStatus : null,
              notes: "notes" in template ? template.notes : null,
              isCritical: template.code === "marketing_activation_date" || template.code === "supply_quilicura_warehouse_arrival",
            };
          }),
        },
      },
    });
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
