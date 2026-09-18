import { clsx } from "clsx";
import type { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { ChevronDownIcon } from "./icons";

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

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    // The browser's native dropdown arrow sits right at the edge with
    // barely any breathing room (worse on iOS). appearance-none drops it
    // entirely in favour of our own icon, positioned with real spacing —
    // className (e.g. a width override) goes on this wrapper, since it's
    // now what callers are actually sizing.
    <div className={clsx("relative", className)}>
      <select
        {...props}
        className="block min-h-[44px] w-full appearance-none rounded-xl border border-line bg-white py-2 pl-3.5 pr-10 text-base text-ink focus:border-primaryStrong focus:outline-none focus:ring-2 focus:ring-primaryStrong/20"
      />
      <ChevronDownIcon className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
    </div>
  );
}

export function LabelText(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={clsx("text-sm font-medium text-ink", props.className)} />;
}
