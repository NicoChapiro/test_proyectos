# Roadmap de Marketing

Aplicación Next.js con Prisma/PostgreSQL para organizar proyectos internos de Marketing.

## Marketing Roadmap

El módulo **Roadmap** es una herramienta transversal de gestión de proyectos de Marketing. Permite planificar y dar seguimiento a lanzamientos de producto, campañas, packaging, trade marketing, ecommerce, contenido/diseño, eventos, innovación, trabajo regulatorio/compliance, procesos internos y otras iniciativas.

**Packaging** permanece disponible como un tipo de proyecto dentro del Roadmap y como módulo especializado para gestionar solicitudes de packaging y vincularlas con proyectos del roadmap.

### Funcionalidades incluidas

- Modelos Prisma `RoadmapProject`, `RoadmapMilestone` y `PackagingRequest`, con relación opcional para que una solicitud de packaging aparezca en el roadmap.
- Taxonomía tipada de proyectos de Marketing mediante `projectType`, con filtros y etiquetas en español en la UI.
- Campos generales para `Área`, `Canal`, `Marca`, `Responsable`, `Hitos`, `Estado`, `Prioridad` y `Semáforo`.
- Plantillas base de hitos por tipo de proyecto preparadas para uso futuro.
- Migraciones SQL para roadmap, el vínculo con packaging y la generalización de Marketing en `prisma/migrations/`.
- Seed opcional con proyectos de ejemplo de Marketing mediante `npm run seed`.
- APIs básicas:
  - `GET /api/roadmap?year=&status=&projectType=&owner=&brand=&category=&area=&channel=&q=`
  - `POST /api/roadmap`
  - `GET /api/roadmap/[id]`
  - `PATCH /api/roadmap/[id]`
  - `POST /api/roadmap/[id]/milestones`
  - `PATCH /api/roadmap/[id]/milestones/[milestoneId]`
- UI inicial:
  - `/roadmap`: selector de año, filtros simples y vista anual/trimestral con barras e hitos.
  - `/roadmap/new`: formulario para crear proyectos de Marketing.
  - `/roadmap/[id]`: detalle, edición de proyecto, listado y creación/actualización de hitos.
  - `/packaging`: listado de solicitudes de packaging.
  - `/packaging/[id]`: detalle de solicitud con acciones para crear un proyecto roadmap de tipo Packaging o vincular uno existente.

### Configuración local

1. Copia `.env.example` a `.env` y ajusta `DATABASE_URL`.
2. Instala dependencias con `npm install`.
3. Genera Prisma Client con `npm run prisma:generate`.
4. Aplica migraciones con `npm run prisma:migrate`.
5. Opcionalmente carga ejemplos con `npm run seed`.
6. Inicia Next.js con `npm run dev` y abre `/roadmap`.

### Variables de entorno y despliegue

- `DATABASE_URL` es obligatoria tanto en desarrollo local como en Vercel para que Prisma pueda conectarse a PostgreSQL en runtime. En local debe estar definida en `.env`; en Vercel debe configurarse como variable de entorno del proyecto.
- Las páginas server-side que leen datos con Prisma están marcadas como dinámicas para evitar que Next.js intente prerenderizarlas durante `next build`. Si falta `DATABASE_URL`, el error debe corregirse configurando la variable de entorno, no ocultándolo en código.
- En Vercel no uses `prisma migrate dev`; ese comando es solo para desarrollo local. Para despliegues, genera el cliente con `npm run prisma:generate` o usa el script `npm run build`, que ejecuta `prisma generate && next build`.

### Checklist de despliegue en Vercel

- Configura `DATABASE_URL` en los entornos **Production** y **Preview** del proyecto en Vercel; `/roadmap` consulta Prisma en runtime y necesita la variable en ambos entornos.
- Después de cambios en `prisma/schema.prisma`, ejecuta `npx prisma migrate deploy` contra la base de datos objetivo para aplicar las migraciones pendientes. También puedes usar `npm run prisma:deploy`.
- No uses `prisma migrate dev` en Vercel: ese flujo es interactivo y está pensado para desarrollo local, no para despliegues.
- No hagas que el build ejecute migraciones automáticamente salvo que el proceso de despliegue lo requiera explícitamente; el build solo debe generar Prisma Client y compilar Next.js.
- Si `/roadmap` falla pero la home funciona, revisa los runtime logs de Vercel para detectar errores de `DATABASE_URL` ausente o migraciones faltantes, por ejemplo columnas/enums nuevos que todavía no existen en la base de datos Preview.

### Validaciones principales

- `name`, `ownerName`, `startDate` y `targetDate` son requeridos para proyectos.
- `projectType` debe pertenecer a la taxonomía de proyectos de Marketing.
- `targetDate` no puede ser anterior a `startDate`.
- `priority`, `status` y `trafficLight` deben pertenecer a los enums del módulo.
- Los hitos requieren `name` y `dueDate`.
