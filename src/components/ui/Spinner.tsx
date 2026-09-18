import { clsx } from "clsx";

// border-current (not a fixed color) so this always matches whatever text
// color it's dropped into — a button's label, a status line, etc. — without
// needing its own color prop.
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={clsx("inline-block animate-spin rounded-full border-2 border-current border-t-transparent", className)}
      aria-hidden="true"
    />
  );
}
