"use client";

import { useEffect, useState } from "react";
import { Input } from "./Input";
import { isValidHex, normalizeHex } from "@/lib/utils/color";

// Native <input type="color"> gives every platform's own colour wheel /
// spectrum picker for free, paired with a plain hex field for anyone who
// already knows the code they want (e.g. matching a stationery suite).
export function ColorPicker({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  hint?: string;
}) {
  const [text, setText] = useState(value);

  useEffect(() => {
    setText(value);
  }, [value]);

  function handleTextChange(next: string) {
    setText(next);
    if (isValidHex(next)) {
      onChange(normalizeHex(next).toUpperCase());
    }
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={isValidHex(value) ? normalizeHex(value) : "#9CAF98"}
          onChange={(e) => {
            onChange(e.target.value.toUpperCase());
            setText(e.target.value.toUpperCase());
          }}
          aria-label={`${label} — colour wheel`}
          className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-line bg-white p-1"
        />
        <Input
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="#9CAF98"
          maxLength={7}
          className="flex-1 font-mono uppercase"
          aria-label={`${label} — hex code`}
        />
      </div>
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </div>
  );
}
