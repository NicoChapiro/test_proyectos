# Test Proyectos

Aplicación Next.js con Prisma/PostgreSQL para organizar proyectos internos.

## Roadmap

El módulo **Roadmap** permite crear, listar y visualizar proyectos con hitos en una vista anual dividida en Q1, Q2, Q3 y Q4.

### Funcionalidades incluidas

- Modelos Prisma `RoadmapProject` y `RoadmapMilestone` con enums de prioridad, estado, semáforo y estado de hito.
- Migración SQL en `prisma/migrations/20260506000000_add_roadmap/migration.sql`.
- Seed opcional con 5 proyectos de ejemplo mediante `npm run seed`.
- APIs básicas:
  - `GET /api/roadmap?year=&status=&owner=&brand=&category=&q=`
  - `POST /api/roadmap`
  - `GET /api/roadmap/[id]`
  - `PATCH /api/roadmap/[id]`
  - `POST /api/roadmap/[id]/milestones`
  - `PATCH /api/roadmap/[id]/milestones/[milestoneId]`
- UI inicial:
  - `/roadmap`: selector de año, filtros simples y vista anual/trimestral con barras e hitos.
  - `/roadmap/new`: formulario para crear proyectos.
  - `/roadmap/[id]`: detalle, edición de proyecto, listado y creación/actualización de hitos.

### Configuración local

1. Copia `.env.example` a `.env` y ajusta `DATABASE_URL`.
2. Instala dependencias con `npm install`.
3. Genera Prisma Client con `npm run prisma:generate`.
4. Aplica migraciones con `npm run prisma:migrate`.
5. Opcionalmente carga ejemplos con `npm run seed`.
6. Inicia Next.js con `npm run dev` y abre `/roadmap`.

### Validaciones principales

- `name`, `ownerName`, `startDate` y `targetDate` son requeridos para proyectos.
- `targetDate` no puede ser anterior a `startDate`.
- `priority`, `status` y `trafficLight` deben pertenecer a los enums del módulo.
- Los hitos requieren `name` y `dueDate`.
