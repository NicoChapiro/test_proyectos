import Link from "next/link";
import type { ReactNode } from "react";

type NavKey = "roadmap" | "projects" | "packaging" | "calendar" | "reports" | "settings";

const navItems = [
  { label: "Roadmap", href: "/roadmap", key: "roadmap" },
  { label: "Proyectos", href: "/roadmap/projects", key: "projects" },
  { label: "Solicitudes Packaging", href: "/packaging", key: "packaging" },
  { label: "Calendario", href: "/roadmap/calendar", key: "calendar" },
  { label: "Reportes", href: "/roadmap/weekly", key: "reports" },
  { label: "Configuración", href: "/roadmap", key: "settings" },
] as const;

export function AppShell({ children, active = "roadmap" }: { children: ReactNode; active?: NavKey }) {
  return (
    <main className="app-shell">
      <header className="top-nav-shell" aria-label="Navegación principal">
        <Link className="top-nav-brand" href="/roadmap" aria-label="Marketing Roadmap">
          <span className="brand-mark">M</span>
          <span>
            <strong>Marketing</strong>
            <small>Roadmap 2026</small>
          </span>
        </Link>
        <nav className="top-nav-links">
          {navItems.map((item) => (
            <Link key={`${item.label}-${item.href}`} className={`top-nav-link${item.key === active ? " active" : ""}`} href={item.href} aria-current={item.key === active ? "page" : undefined}>
              <span className="nav-dot" aria-hidden="true" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="top-nav-user">
          <span className="user-avatar" aria-hidden="true">M</span>
          <span>
            <strong>Mario</strong>
            <small>Marketing</small>
          </span>
        </div>
      </header>
      <section className="content-shell">{children}</section>
    </main>
  );
}

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow: string; title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {subtitle ? <p className="header-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}

export function KpiCard({ label, value, tone = "blue", detail }: { label: string; value: string | number; tone?: "blue" | "green" | "amber" | "red" | "slate"; detail?: string }) {
  return (
    <article className="kpi-card">
      <span className={`kpi-icon ${tone}`} aria-hidden="true" />
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        {detail ? <small>{detail}</small> : null}
      </div>
    </article>
  );
}

export function SummaryMetricCard({ label, value, detail, tone }: { label: string; value: string | number; detail?: string; tone?: "success" | "warning" | "danger" }) {
  const isQuietZero = value === 0 || value === "0";

  return (
    <article className={`summary-card${tone ? ` ${tone}` : ""}${isQuietZero ? " quiet-zero" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <p>{detail}</p> : null}
    </article>
  );
}

export function FormSectionCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="form-section-card">
      <div className="form-section-heading">
        <h2>{title}</h2>
        {description ? <p className="muted">{description}</p> : null}
      </div>
      <div className="form-grid">{children}</div>
    </section>
  );
}
