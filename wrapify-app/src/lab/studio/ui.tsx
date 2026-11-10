"use client";

import { CSSProperties, ReactNode } from "react";

/*
 * Studio building blocks: palette, icons, cards and small controls.
 *
 * Colour rules, so it stays cheerful instead of loud:
 * - flat page, no gradients or glows;
 * - six hues of similar weight, and every one carries the same dark ink;
 * - on a colour block the data is drawn in ink too (two tones per card);
 * - decorations are tone-on-tone and only live where there is empty space.
 */

/* ── Palette ── */

export const INK = "#1e1728";
export const HUES = {
  coral: "#ff7d5c",
  sun: "#ffc94d",
  pink: "#ffa9d2",
  lilac: "#ab96ff",
  mint: "#63d6a6",
  sky: "#80c9ff",
} as const;
export type Hue = keyof typeof HUES;

export const TINT = "color-mix(in srgb, var(--ink) 9%, transparent)";
export const cssVars = (vars: Record<string, string>) => vars as CSSProperties;

/* ── Icons: flat, single colour, drawn on a 24px grid ── */

export type IconName = "sun" | "moon" | "crown" | "flame" | "trophy" | "headphones" | "search" | "close" | "play" | "pause";

export const SUN_RAYS = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2;
  const p = (r: number) => [(12 + Math.cos(a) * r).toFixed(2), (12 + Math.sin(a) * r).toFixed(2)];
  const [x1, y1] = p(7.6);
  const [x2, y2] = p(10.2);
  return { x1, y1, x2, y2 };
});

export const ICONS: Record<IconName, ReactNode> = {
  sun: (
    <>
      <circle cx="12" cy="12" r="4.4" />
      <g className="lab-spin" style={{ transformOrigin: "12px 12px", animationDuration: "20s" }} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        {SUN_RAYS.map((r, i) => (
          <line key={i} {...r} />
        ))}
      </g>
    </>
  ),
  moon: <path d="M20.2 14.6A8.6 8.6 0 1 1 9.4 3.8a7 7 0 0 0 10.8 10.8z" />,
  crown: <path d="M3 8.5l4.2 3.6L12 5l4.8 7.1L21 8.5l-1.8 10H4.8L3 8.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />,
  flame: <path d="M12.6 2.5c.5 3.2 4.9 5.2 4.9 10.3a5.5 5.5 0 0 1-11 0c0-2.1.9-3.7 2.2-5 .2 1.6.9 2.6 1.9 3.1-.3-3.2.4-6.3 2-8.4z" />,
  trophy: (
    <>
      <path d="M7 3.5h10v4.8a5 5 0 0 1-10 0V3.5z" />
      <path d="M7 5.5H4.2v1.3a3 3 0 0 0 3 3M17 5.5h2.8v1.3a3 3 0 0 1-3 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="11" y="13" width="2" height="4.5" />
      <rect x="7.5" y="17" width="9" height="3.2" rx="1.2" />
    </>
  ),
  headphones: (
    <>
      <path d="M4.6 14v-1.6a7.4 7.4 0 0 1 14.8 0V14" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
      <rect x="3" y="12.8" width="4.8" height="7.8" rx="2.2" />
      <rect x="16.2" y="12.8" width="4.8" height="7.8" rx="2.2" />
    </>
  ),
  search: (
    <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <circle cx="10.8" cy="10.8" r="6.3" />
      <path d="M15.6 15.6l5 5" />
    </g>
  ),
  play: <path d="M8 4.8v14.4a1 1 0 0 0 1.5.86l12-7.2a1 1 0 0 0 0-1.72l-12-7.2A1 1 0 0 0 8 4.8z" transform="translate(-2.5 0)" />,
  pause: (
    <>
      <rect x="6" y="4.5" width="4.4" height="15" rx="1.4" />
      <rect x="13.6" y="4.5" width="4.4" height="15" rx="1.4" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />,
};

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
      {ICONS[name]}
    </svg>
  );
}

/** Icon on a disc of ink: the one place an icon gets a container. */
export function IconBadge({ name, size = 44 }: { name: IconName; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={{ width: size, height: size, background: "var(--ink)", color: "var(--g-bg)" }}
    >
      <Icon name={name} size={size * 0.5} />
    </span>
  );
}

/* ── Building blocks ── */

export type DecoKind = "arcs" | "bars" | "disc";

/** Tone-on-tone backdrop (--deco). Only for cards with room to spare. */
export function Deco({ kind }: { kind: DecoKind }) {
  return (
    <div className="lab-fade pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {kind === "arcs" && (
        // concentric bands around the top-right corner, sized from the card's height
        <div className="absolute top-0 right-0 aspect-square h-[150%] translate-x-[36%] -translate-y-[36%]">
          <span
            className="lab-breathe absolute inset-0 rounded-full"
            style={{
              background:
                "radial-gradient(circle closest-side, transparent 0 20%, var(--deco) 20.5% 36%, transparent 36.5% 52%, var(--deco) 52.5% 68%, transparent 68.5% 84%, var(--deco) 84.5% 99.5%, transparent 100%)",
            }}
          />
        </div>
      )}
      {kind === "bars" && (
        <div className="absolute right-6 bottom-0 flex h-[58%] items-end gap-2.5">
          {[62, 100, 44, 80, 56, 90].map((h, i) => (
            <span
              key={i}
              className="w-5 rounded-t-full"
              style={{
                height: `${h}%`,
                background: "var(--deco)",
                transformOrigin: "center bottom",
                animation: `lab-eq ${2 + (i % 3) * 0.5}s ${-i * 0.37}s ease-in-out infinite`,
              }}
            />
          ))}
        </div>
      )}
      {kind === "disc" && (
        <span className="lab-float absolute -right-14 -bottom-24 h-60 w-60 rounded-full" style={{ background: "var(--deco)", animationDuration: "8s" }} />
      )}
    </div>
  );
}

export function Card({
  children,
  className = "",
  i = 0,
  hue,
  tone = "paper",
  deco,
  dense = false,
}: {
  children: ReactNode;
  className?: string;
  /** stagger index */
  i?: number;
  /** colour block; omit for a neutral card */
  hue?: Hue;
  /** neutral surface when there is no hue */
  tone?: "paper" | "contrast";
  deco?: DecoKind;
  /** tighter padding for the small tiles of the bento */
  dense?: boolean;
}) {
  const surface = hue ? "lab-world" : tone === "contrast" ? "lab-card--contrast" : "lab-card--paper";
  return (
    <section className={`lab-card-in ${className}`} style={{ animationDelay: `${i * 70}ms` }}>
      <div className={`lab-card h-full ${surface}`} style={hue ? cssVars({ "--bg": HUES[hue] }) : undefined}>
        {deco && <Deco kind={deco} />}
        <div className={`relative z-10 h-full ${dense ? "p-5" : "p-6 md:p-7"}`}>{children}</div>
      </div>
    </section>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-xs font-bold tracking-[0.18em] uppercase" style={{ color: "var(--muted)" }}>
      {children}
    </h3>
  );
}

/** Highlighter: a word on a tilted block. "ink" inverts the card; "hl" is marker yellow. */
export function Mark({ children, tone = "ink", r = -1.5 }: { children: ReactNode; tone?: "ink" | "hl"; r?: number }) {
  return (
    <span
      className="inline-block rounded-[0.32em] px-[0.34em] leading-[1.2]"
      style={{
        background: tone === "ink" ? "var(--ink)" : HUES.sun,
        color: tone === "ink" ? "var(--g-bg)" : INK,
        rotate: `${r}deg`,
      }}
    >
      {children}
    </span>
  );
}

export function Pill({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer rounded-full px-4 py-1.5 text-[13px] font-bold whitespace-nowrap transition-transform duration-200 hover:scale-105 active:scale-95"
      style={{ background: "var(--ink)", color: "var(--g-bg)" }}
    >
      {children}
    </button>
  );
}

export const BURST = Array.from({ length: 28 }, (_, i) => {
  const r = i % 2 === 0 ? 100 : 82;
  const a = (i / 28) * Math.PI * 2;
  return `${(100 + Math.cos(a) * r).toFixed(1)},${(100 + Math.sin(a) * r).toFixed(1)}`;
}).join(" ");

/** Slowly turning seal of ink with a label that stays still. */
export function Sticker({ children, size = 100 }: { children: ReactNode; size?: number }) {
  return (
    <span className="lab-pop relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size, animationDelay: "450ms" }}>
      <svg viewBox="0 0 200 200" className="lab-spin absolute inset-0 h-full w-full" style={{ animationDuration: "30s" }} aria-hidden>
        <polygon points={BURST} fill="var(--ink)" />
      </svg>
      <span className="relative text-center leading-none font-extrabold" style={{ color: "var(--g-bg)" }}>
        {children}
      </span>
    </span>
  );
}

/** Segmented control with a sliding thumb (equal-width options). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className = "",
  thumb = "var(--ink)",
  onThumb = "var(--g-bg)",
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  /** thumb colour and the text colour that sits on it */
  thumb?: string;
  onThumb?: string;
}) {
  const idx = options.indexOf(value);
  return (
    <div
      role="tablist"
      className={`relative grid rounded-full p-1 ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`, background: TINT }}
    >
      <span
        aria-hidden
        className="absolute top-1 bottom-1 left-1 rounded-full transition-[transform,background-color] duration-500"
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(${idx * 100}%)`,
          background: thumb,
          transitionTimingFunction: "cubic-bezier(0.3, 1.35, 0.4, 1)",
        }}
      />
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="tab"
          aria-selected={o === value}
          onClick={() => onChange(o)}
          className="relative z-10 cursor-pointer rounded-full px-1 py-2 text-sm font-bold transition-colors duration-300 sm:px-5"
          style={{ color: o === value ? onThumb : "var(--muted)" }}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export const HUE_NAMES = Object.keys(HUES) as Hue[];
/** Every artist keeps the same colour each time their drawer opens. */
export function hueFor(name: string): Hue {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return HUE_NAMES[h % HUE_NAMES.length];
}

/* ── Bento ── */

/**
 * The bento grid: 12 columns and, from lg up, rows of one fixed unit that only
 * grow if a tile needs it. Tiles pick their shape with col-span / row-span
 * (`lg:col-span-5 lg:row-span-3`); below lg everything stacks.
 */
export function Bento({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-12 gap-4 lg:grid-flow-dense lg:auto-rows-[minmax(108px,auto)]">{children}</div>;
}

/** Lets a fixed-ratio child (a chart) take all the height a tile has left. Use inside a flex column. */
export function Fill({ children, min = 200, className = "" }: { children: ReactNode; min?: number; className?: string }) {
  return (
    <div className={`relative flex-1 ${className}`} style={{ minHeight: min }}>
      <div className="absolute inset-0">{children}</div>
    </div>
  );
}

/** One line under a chart title that says how to read it. */
export function Hint({ children }: { children: ReactNode }) {
  return (
    <p className="mt-1.5 max-w-[62ch] text-[13px] leading-snug font-medium" style={{ color: "var(--muted)" }}>
      {children}
    </p>
  );
}
