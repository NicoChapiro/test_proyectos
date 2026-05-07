# Roadmap de Marketing

Aplicación Next.js con Prisma/PostgreSQL para organizar proyectos internos de Marketing.

## Marketing Roadmap

El módulo **Roadmap** es una herramienta transversal de gestión de proyectos de Marketing. Permite planificar y dar seguimiento a lanzamientos de producto, campañas, packaging, trade marketing, ecommerce, contenido/diseño, eventos, innovación, trabajo regulatorio/compliance, procesos internos y otras iniciativas.

**Packaging** permanece disponible como un tipo de proyecto dentro del Roadmap y como módulo especializado para gestionar solicitudes de packaging y vincularlas con proyectos del roadmap.

### Funcionalidades incluidas

- Modelos Prisma `RoadmapProject`, `RoadmapMilestone` y `PackagingRequest`, con relación opcional para que una solicitud de packaging aparezca en el roadmap.
- Taxonomía tipada de proyectos de Marketing mediante `projectType`, con filtros y etiquetas en español en la UI.
- Campos generales para `Área`, `Canal`, `Marca`, `Responsable`, `Estado`, `Prioridad`, `Semáforo`, fechas y URL de SharePoint.
- Página de detalle `/roadmap/[id]` con encabezado del proyecto, metadata general y tablas separadas por track para actualizar hitos.
- Plantilla automática de 12 hitos estándar cada vez que se crea un proyecto. Los hitos quedan vinculados al proyecto y guardan `milestoneCode`, `track`, `sequence`, estado, responsable, fechas planificada/real, estado de aprobación, links, documentos y notas.
- Modelo de dos tracks paralelos: **Supply / Operaciones / Proveedores** para aprobaciones internas, órdenes de compra, muestras, producción, embarque, llegada, aduana y bodega Quilicura; y **Marketing campaign** para concepto, implementación y activación de campaña.
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
  - `/roadmap/[id]`: detalle del proyecto, metadata general, tabla Supply, tabla Marketing, edición del proyecto y creación/actualización de hitos.
  - `/packaging`: listado de solicitudes de packaging.
  - `/packaging/[id]`: detalle de solicitud con acciones para crear un proyecto roadmap de tipo Packaging o vincular uno existente.

### Workflow de detalle e hitos

Cuando se crea un proyecto desde `/roadmap/new` o `POST /api/roadmap`, la aplicación redirige al detalle del proyecto y crea automáticamente el set estándar de hitos. La secuencia primero agrega los 9 hitos de Supply / Operaciones / Proveedores y luego los 3 hitos de Marketing campaign.

El detalle `/roadmap/[id]` muestra:

1. Encabezado con nombre, código, fechas y acceso de retorno al roadmap.
2. Metadata general: tipo, área, canal, marca, categoría, responsable, prioridad, estado, semáforo, fechas y SharePoint.
3. Tabla Supply / Operaciones / Proveedores con hitos de aprobaciones, OC, muestras, producción, embarque, Santiago, aduana y bodega Quilicura.
4. Tabla Marketing campaign con concepto, implementación y activación.
5. Formularios simples inline para actualizar responsable, fechas, estado, aprobación, links, documentos y notas por hito.

La vista anual `/roadmap` sigue funcionando como overview y cada proyecto enlaza a `/roadmap/[id]`. Los proyectos antiguos sin metadata nueva se renderizan de forma segura usando fechas y campos existentes.

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

### Aplicar migraciones sin entorno local

Si no usas un flujo de desarrollo local, puedes aplicar las migraciones Prisma ya confirmadas en el repositorio directamente contra Supabase mediante GitHub Actions.

1. En GitHub, abre el repositorio y configura `DATABASE_URL` como secreto en **Settings → Secrets and variables → Actions → Repository secrets**. Usa la URL de conexión de Supabase PostgreSQL correspondiente a la base de datos objetivo.
2. Ve a **GitHub → Actions → Prisma Migrate Deploy → Run workflow** y ejecuta el workflow manualmente.
3. El workflow instala dependencias, ejecuta `npm run prisma:generate` y después `npm run prisma:deploy` con `DATABASE_URL` leída únicamente desde GitHub Secrets.
4. Cuando el workflow termine correctamente, abre `https://<tu-dominio-vercel>/api/health`.
5. Si `/api/health` devuelve `status: "ok"`, entonces `/roadmap` debería cargar correctamente porque la app puede conectarse a la base de datos y las tablas esperadas existen.

No uses `prisma migrate dev` en GitHub Actions ni en Vercel. Ese comando es solo para desarrollo local; en despliegues o ejecuciones manuales contra Supabase usa migraciones confirmadas con `npm run prisma:deploy` / `prisma migrate deploy`.

### Health check post-despliegue

Después de cada despliegue en Vercel, abre `https://<tu-dominio-vercel>/api/health` para validar rápidamente que el runtime puede leer la configuración mínima, conectarse a Supabase/PostgreSQL mediante Prisma y consultar las tablas principales de la aplicación.

El proyecto fija Node.js en `22.x` mediante `package.json` para mantener compatibilidad con Vercel, Prisma 5.22.0 y el runtime Node.js LTS esperado. Si Vercel muestra otro runtime en logs después de un cambio, redepliega para que tome la versión fijada.

El endpoint `GET /api/health` usa runtime Node.js y es dinámico. Nunca devuelve `DATABASE_URL`, URLs de conexión, host, usuario, contraseña, tokens, stack traces, cadenas de conexión ni credenciales; solo expone indicadores booleanos, conteos seguros y diagnósticos clasificados.

Interpretación de campos clave:

- `env.databaseUrlConfigured: false` significa que `DATABASE_URL` no está configurada en el entorno de Vercel que estás probando. Configúrala en **Production** o **Preview** según corresponda.
- `env.databaseUrlLooksLikePostgres` indica si la variable configurada parece una URL de PostgreSQL (`postgresql://` o `postgres://`) sin mostrar su valor.
- `database.connected: false` significa que Vercel no puede conectarse a Supabase/PostgreSQL con la configuración disponible, o que Prisma no pudo ejecutar una consulta mínima.
- `database.migrationsTableExists: false` significa que Prisma no encontró `_prisma_migrations`; las migraciones pueden no haberse aplicado en esa base de datos.
- `database.appliedMigrations` muestra cuántas migraciones Prisma aparecen registradas como aplicadas cuando existe `_prisma_migrations`.
- `database.counts.roadmapProjects`, `database.counts.roadmapMilestones` y `database.counts.packagingRequests` confirman que la app puede leer `RoadmapProject`, `RoadmapMilestone` y `PackagingRequest`.

Cuando hay un fallo de base de datos, `diagnostics.category` ayuda a acotar el problema sin exponer secretos:

- `authentication_failed` significa que el usuario o password de la base de datos es incorrecto.
- `database_unreachable` significa que host, puerto, pooler, red o disponibilidad de Supabase/PostgreSQL no permiten conectar.
- `database_timeout` significa que la conexión o consulta mínima agotó el tiempo de espera.
- `invalid_database_url` significa que `DATABASE_URL` está mal formada.
- `missing_table` significa que falta una tabla requerida y probablemente no se aplicaron migraciones.
- `missing_column` significa que falta una columna requerida y probablemente no se aplicaron migraciones.
- `unknown_database_error` significa que Prisma no entregó un código reconocido por el clasificador.

En producción, la respuesta de error puede incluir `diagnostics.category`, `diagnostics.code` y `diagnostics.name`, pero no incluye mensajes crudos de Prisma ni stack traces. En desarrollo local puede incluir un mensaje sanitizado con URLs y credenciales removidas para acelerar la depuración.

Ejemplo saludable:

```json
{
  "status": "ok",
  "service": "test-proyectos",
  "runtime": {
    "nodeEnv": "production",
    "vercelEnv": "production",
    "isVercel": true
  },
  "env": {
    "databaseUrlConfigured": true,
    "databaseUrlLooksLikePostgres": true
  },
  "database": {
    "connected": true,
    "provider": "postgresql",
    "prismaQueryOk": true,
    "migrationsTableExists": true,
    "appliedMigrations": 5,
    "counts": {
      "roadmapProjects": 0,
      "roadmapMilestones": 0,
      "packagingRequests": 0
    }
  }
}
```

Si `DATABASE_URL` falta, Vercel no puede conectarse a Supabase/PostgreSQL o faltan tablas necesarias, responde HTTP 500 con un mensaje seguro:

```json
{
  "status": "error",
  "service": "test-proyectos",
  "runtime": {
    "nodeEnv": "production",
    "vercelEnv": "preview",
    "isVercel": true
  },
  "env": {
    "databaseUrlConfigured": true,
    "databaseUrlLooksLikePostgres": true
  },
  "database": {
    "connected": false,
    "provider": "postgresql",
    "prismaQueryOk": false,
    "migrationsTableExists": false
  },
  "diagnostics": {
    "category": "database_unreachable",
    "code": "P1001",
    "name": "PrismaClientInitializationError"
  },
  "message": "Database health check failed",
  "hint": "Check DATABASE_URL, Supabase availability and Prisma migrations."
}
```

Usa esta ruta como primera verificación cuando `/roadmap` o `/packaging` fallen en Preview o Production. Si `/api/health` devuelve 500, revisa `DATABASE_URL`, disponibilidad de Supabase/PostgreSQL y que las migraciones se hayan aplicado con `npm run prisma:deploy`.

### Validaciones principales

- `name`, `ownerName`, `startDate` y `targetDate` son requeridos para proyectos.
- `projectType` debe pertenecer a la taxonomía de proyectos de Marketing.
- `targetDate` no puede ser anterior a `startDate`.
- `priority`, `status` y `trafficLight` deben pertenecer a los enums del módulo.
- Los hitos requieren `name` y una fecha planificada/due date; las URLs de SharePoint, links y documentos se validan cuando están presentes.
