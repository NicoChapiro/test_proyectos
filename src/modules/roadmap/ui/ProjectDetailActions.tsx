"use client";

import type { ReactNode } from "react";
import { useCallback } from "react";

type ProjectDetailActionButtonProps = {
  targetId: string;
  children: ReactNode;
  className?: string;
};

export function ProjectDetailActionButton({
  targetId,
  children,
  className = "button secondary",
}: ProjectDetailActionButtonProps) {
  const handleClick = useCallback(() => {
    const target = document.getElementById(targetId);
    if (!target) return;

    if (target instanceof HTMLDetailsElement) {
      target.open = true;
    } else {
      const parentDetails = target.closest("details");
      if (parentDetails instanceof HTMLDetailsElement) {
        parentDetails.open = true;
      }
    }

    window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState(null, "", `#${targetId}`);
    });
  }, [targetId]);

  return (
    <button className={className} type="button" onClick={handleClick}>
      {children}
    </button>
  );
}
