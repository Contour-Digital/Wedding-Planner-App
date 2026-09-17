import { clsx } from "clsx";
import type { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        "block w-full min-h-[44px] rounded-xl border border-line bg-white px-3.5 py-2 text-base text-ink placeholder:text-muted focus:border-primaryStrong focus:outline-none focus:ring-2 focus:ring-primaryStrong/20",
        props.className
      )}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={clsx(
        "block w-full min-h-[88px] rounded-xl border border-line bg-white px-3.5 py-2 text-base text-ink placeholder:text-muted focus:border-primaryStrong focus:outline-none focus:ring-2 focus:ring-primaryStrong/20",
        props.className
      )}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={clsx(
        "block w-full min-h-[44px] rounded-xl border border-line bg-white px-3.5 py-2 text-base text-ink focus:border-primaryStrong focus:outline-none focus:ring-2 focus:ring-primaryStrong/20",
        props.className
      )}
    />
  );
}

export function LabelText(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={clsx("text-sm font-medium text-ink", props.className)} />;
}
