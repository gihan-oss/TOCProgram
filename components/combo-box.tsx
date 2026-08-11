"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ComboBoxProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * A dropdown combo-box that suggests from a list while allowing free-form entry.
 * When opened via focus (no typing), shows all options with the current value
 * highlighted. When the user types, filters the list.
 * Keyboard: type to filter, ↑↓ to navigate, Enter to select, Escape to close.
 */
export function ComboBox({ options, value, onChange, placeholder, className }: ComboBoxProps) {
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Show all options on focus; filter only when the user types.
  const filtered = typing
    ? options.filter((o) => o.toLowerCase().includes(value.toLowerCase()))
    : options;

  // Index of the current value in the unfiltered list (for highlight on open).
  const selectedIndex = value ? options.indexOf(value) : -1;

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlight >= 0 && listRef.current) {
      const el = listRef.current.children[highlight] as HTMLLIElement | undefined;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [highlight]);

  function select(opt: string) {
    onChange(opt);
    setOpen(false);
    setTyping(false);
    setHighlight(-1);
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { setOpen(true); e.preventDefault(); }
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (highlight >= 0 && highlight < filtered.length) select(filtered[highlight]);
      else { setOpen(false); setTyping(false); setHighlight(-1); }
    }
    else if (e.key === "Escape") { setOpen(false); setTyping(false); setHighlight(-1); }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value); setTyping(true); setHighlight(-1); if (!open) setOpen(true); }}
        onFocus={() => { setOpen(true); setTyping(false); if (selectedIndex >= 0) setHighlight(selectedIndex); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
        className="combo-input w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:border-accent"
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul
          ref={listRef}
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-auto rounded-lg border bg-card p-1 shadow-lg"
        >
          <li className="sticky top-0 border-b bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground">
            Type to add a new entry
          </li>
          {filtered.map((opt, i) => (
            <li
              key={opt}
              onMouseDown={(e) => { e.preventDefault(); select(opt); }}
              onMouseEnter={() => setHighlight(i)}
              className={cn(
                "cursor-pointer rounded-md px-3 py-2 text-sm transition-colors",
                i === highlight
                  ? "bg-accent text-accent-foreground"
                  : opt === value
                    ? "bg-secondary font-medium"
                    : "hover:bg-secondary",
              )}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
      {open && filtered.length === 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border bg-card px-3 py-2 text-sm shadow-lg">
          <span className="text-muted-foreground">Type to add &ldquo;</span>
          <span className="font-medium">{value}</span>
          <span className="text-muted-foreground">&rdquo;</span>
        </div>
      )}
    </div>
  );
}
