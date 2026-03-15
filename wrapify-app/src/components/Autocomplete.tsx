"use client";

import { useState, useRef, useEffect, useMemo } from "react";

interface AutocompleteProps {
  suggestions: string[];
  placeholder: string;
  onSelect: (value: string) => void;
}

function fuzzyMatch(text: string, query: string): { match: boolean; score: number } {
  const lower = text.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return { match: false, score: 0 };

  // Exact match scores highest
  if (lower === q) return { match: true, score: 100 };
  // Starts with
  if (lower.startsWith(q)) return { match: true, score: 90 };
  // Word starts with query
  const words = lower.split(/[\s\-_,./()]+/);
  if (words.some((w) => w.startsWith(q))) return { match: true, score: 80 };
  // Contains
  if (lower.includes(q)) return { match: true, score: 70 };

  // Multi-word: all query tokens must appear
  const tokens = q.split(/\s+/);
  if (tokens.length > 1 && tokens.every((t) => lower.includes(t))) {
    return { match: true, score: 60 };
  }

  return { match: false, score: 0 };
}

export default function Autocomplete({ suggestions, placeholder, onSelect }: AutocompleteProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  const filtered = useMemo(() => {
    if (query.length === 0) return [];
    const results: { value: string; score: number }[] = [];
    for (const s of suggestions) {
      const { match, score } = fuzzyMatch(s, query);
      if (match) results.push({ value: s, score });
      if (results.length >= 50) break;
    }
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 30).map((r) => r.value);
  }, [suggestions, query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    const item = itemRefs.current[highlighted];
    if (item && listRef.current) {
      item.scrollIntoView({ block: "nearest" });
    }
  }, [highlighted]);

  const select = (value: string) => {
    onSelect(value);
    setQuery("");
    setOpen(false);
    setHighlighted(0);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setHighlighted(0);
        }}
        onFocus={() => query.length > 0 && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlighted((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter" && filtered[highlighted]) {
            e.preventDefault();
            select(filtered[highlighted]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-green-500 focus:outline-none"
      />
      {open && filtered.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-lg"
        >
          {filtered.map((item, i) => (
            <li
              key={item}
              ref={(el) => { itemRefs.current[i] = el; }}
              className={`cursor-pointer px-3 py-2 text-sm ${
                i === highlighted ? "bg-zinc-700 text-zinc-100" : "text-zinc-400 hover:bg-zinc-800"
              }`}
              onMouseEnter={() => setHighlighted(i)}
              onMouseDown={() => select(item)}
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
