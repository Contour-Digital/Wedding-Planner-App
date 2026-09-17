import { clsx } from "clsx";

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("rounded-2xl border border-line bg-white p-4 sm:p-5", className)}>{children}</div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "warn" | "danger" | "good";
}) {
  const toneClass = {
    default: "text-ink",
    warn: "text-warn",
    danger: "text-danger",
    good: "text-good",
  }[tone];

  return (
    <Card className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      <span className={clsx("text-2xl font-semibold font-display", toneClass)}>{value}</span>
      {sub && <span className="text-xs text-muted">{sub}</span>}
    </Card>
  );
}
