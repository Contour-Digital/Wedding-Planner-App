import { clsx } from "clsx";

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  const overBudget = value > 100;
  return (
    <div className={clsx("h-2 w-full overflow-hidden rounded-full bg-line", className)}>
      <div
        className={clsx("h-full rounded-full transition-all", overBudget ? "bg-danger" : "bg-primary")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
