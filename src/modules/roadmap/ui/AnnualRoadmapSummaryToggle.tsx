"use client";

import Link from "next/link";
import { useId, useState } from "react";

type AnnualRoadmapSummaryToggleProps = {
  projectId: string;
  projectName: string;
  detailHref: string;
  fields: Array<{
    label: string;
    value: string;
    tone?: "default" | "warning" | "critical";
  }>;
  alerts: Array<{
    label: string;
    tone: "warning" | "critical";
  }>;
};

export function AnnualRoadmapSummaryToggle({
  projectId,
  projectName,
  detailHref,
  fields,
  alerts,
}: AnnualRoadmapSummaryToggleProps) {
  const generatedId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const panelId = `roadmap-summary-${projectId}-${generatedId.replace(/:/g, "")}`;

  return (
    <>
      <div className="row-actions annual-row-actions">
        <button
          type="button"
          className="annual-summary-toggle"
          aria-expanded={isOpen}
          aria-controls={panelId}
          aria-label={`${isOpen ? "Cerrar" : "Abrir"} resumen de ${projectName}`}
          onClick={() => setIsOpen((current) => !current)}
        >
          {isOpen ? "−" : "+"} Resumen
        </button>
        <Link className="annual-detail-link" href={detailHref}>
          Ver detalle
        </Link>
      </div>
      <div
        id={panelId}
        className={`annual-row-summary${isOpen ? " open" : ""}`}
        hidden={!isOpen}
      >
        <div className="annual-row-summary-grid">
          {fields.map((field) => (
            <div
              className={`annual-summary-field${field.tone ? ` ${field.tone}` : ""}`}
              key={field.label}
            >
              <span>{field.label}</span>
              <strong>{field.value}</strong>
            </div>
          ))}
        </div>
        <div className="annual-summary-alerts" aria-label="Alertas principales">
          {alerts.length > 0 ? (
            alerts.map((alert) => (
              <span className={`annual-summary-alert ${alert.tone}`} key={alert.label}>
                {alert.label}
              </span>
            ))
          ) : (
            <span className="annual-summary-alert ok">Sin alertas operativas</span>
          )}
        </div>
        <Link className="annual-summary-detail-link" href={detailHref}>
          Ver detalle
        </Link>
      </div>
    </>
  );
}
