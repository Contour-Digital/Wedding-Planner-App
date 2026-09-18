import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
  // Shows a small spinner before the label and disables the button —
  // for anything that takes a moment (a network request, generating a
  // password) rather than resolving instantly, so it's visibly doing
  // something instead of just sitting there.
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-primary text-onPrimary hover:opacity-90",
  secondary: "bg-line text-ink hover:bg-secondary/60",
  ghost: "bg-transparent text-ink hover:bg-line",
  danger: "bg-danger text-white hover:opacity-90",
};

export function Button({ variant = "primary", fullWidth, loading, disabled, className, children, ...props }: Props) {
  return (
    <button
      className={clsx(
        "flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:opacity-50 disabled:pointer-events-none",
        variantClasses[variant],
        fullWidth && "w-full",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}
