import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const samples = [
  ["RMP-2026-001", "Lanzamiento empaques sustentables", "Sustentabilidad", "Marca Norte", "Camila Rojas", "alta", "en_curso", "2026-01-15", "2026-06-30", "verde"],
  ["RMP-2026-002", "Optimización línea premium", "Innovación", "Premium", "Diego Silva", "media", "no_iniciado", "2026-03-01", "2026-09-15", "gris"],
  ["RMP-2026-003", "Migración proveedores críticos", "Operaciones", "Todas", "Antonia Pérez", "urgente", "en_riesgo", "2026-02-10", "2026-11-30", "amarillo"],
  ["RMP-2026-004", "Relanzamiento canal e-commerce", "Comercial", "Digital", "Javier Torres", "alta", "bloqueado", "2026-04-01", "2026-08-31", "rojo"],
  ["RMP-2026-005", "Programa eficiencia costos", "Finanzas", "Corporativo", "María Gómez", "media", "en_curso", "2026-07-01", "2026-12-15", "verde"],
] as const;

async function main() {
  for (const [code, name, category, brand, ownerName, priority, status, startDate, targetDate, trafficLight] of samples) {
    await prisma.roadmapProject.upsert({
      where: { code },
      update: {},
      create: {
        code,
        name,
        description: `Proyecto de ejemplo para ${category.toLowerCase()}.`,
        category,
        brand,
        ownerName,
        priority,
        status,
        startDate: new Date(`${startDate}T00:00:00.000Z`),
        targetDate: new Date(`${targetDate}T00:00:00.000Z`),
        trafficLight,
        milestones: {
          create: [
            { name: "Kickoff", dueDate: new Date(`${startDate}T00:00:00.000Z`), status: "completado", sortOrder: 1 },
            { name: "Revisión ejecutiva", dueDate: new Date(`${targetDate}T00:00:00.000Z`), status: "pendiente", sortOrder: 2, isCritical: true },
          ],
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
