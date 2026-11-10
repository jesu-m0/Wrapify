"use client";

import Link from "next/link";

export const LAB_VERSIONS = [
  { href: "/lab/stories", label: "Stories" },
  { href: "/lab/revista", label: "Revista" },
  { href: "/lab/studio", label: "Studio" },
] as const;

/** Small pill to hop between the three versions (the loaded data travels with you). */
export default function LabSwitcher({ current, className = "" }: { current: string; className?: string }) {
  return (
    <nav
      aria-label="Versiones del lab"
      className={`flex items-center gap-1 rounded-full border p-1 text-xs font-semibold backdrop-blur-md ${className}`}
      style={{ borderColor: "var(--g-border)", background: "color-mix(in srgb, var(--g-bg) 70%, transparent)", color: "var(--g-ink)" }}
    >
      {LAB_VERSIONS.map((v) => {
        const active = v.href === current;
        return (
          <Link
            key={v.href}
            href={v.href}
            aria-current={active ? "page" : undefined}
            className="rounded-full px-3 py-1.5 transition-colors duration-200"
            style={active ? { background: "var(--g-ink)", color: "var(--g-bg)" } : { opacity: 0.75 }}
          >
            {v.label}
          </Link>
        );
      })}
    </nav>
  );
}
