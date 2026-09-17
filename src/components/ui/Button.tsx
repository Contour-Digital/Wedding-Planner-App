import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  // --color-on-primary is computed per-wedding (ThemeProvider) as whichever
  // of black/white reads best against the couple's chosen primary colour —
  // a hardcoded text colour here would break if they picked a dark primary.
  primary: "bg-primary text-onPrimary hover:opacity-90",
  secondary: "bg-line text-ink hover:bg-secondary/60",
  ghost: "bg-transparent text-ink hover:bg-line",
  danger: "bg-danger text-white hover:opacity-90",
};

export function Button({ variant = "primary", fullWidth, className, ...props }: Props) {
  return (
    <button
      className={clsx(
        "min-h-[44px] rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:opacity-50 disabled:pointer-events-none",
        variantClasses[variant],
        fullWidth && "w-full",
        className
      )}
      {...props}
    />
  );
}
