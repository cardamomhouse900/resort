import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "light" | "ghost-light";

const variants: Record<Variant, string> = {
  primary: "bg-forest text-cream hover:bg-mountain",
  secondary: "text-forest ring-1 ring-forest/30 hover:bg-beige",
  light: "bg-cream text-forest hover:bg-white",
  "ghost-light": "text-cream ring-1 ring-cream/50 hover:bg-cream/10",
};

export const buttonClasses = (variant: Variant = "primary", extra = "") =>
  `inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-7 text-[0.9375rem] font-semibold transition-colors duration-200 ${variants[variant]} ${extra}`;

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClasses(variant, className)} {...props} />;
}
