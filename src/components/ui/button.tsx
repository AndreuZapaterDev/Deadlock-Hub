import Link from "next/link";
import { cn } from "@/lib/cn";

const base =
  "shine press inline-flex items-center justify-center gap-2 rounded-sm px-5 py-2.5 text-sm font-semibold tracking-wide transition-colors duration-150 disabled:opacity-50 disabled:grayscale disabled:pointer-events-none";
const variants = {
  primary: "frame-double bg-accent text-on-accent border border-brass hover:bg-accent/85",
  secondary: "frame-double bg-surface text-ink border border-brass hover:bg-brass/15",
  ghost: "bg-transparent text-ink-muted hover:text-ink hover:bg-brass/10",
};

type Props = { variant?: keyof typeof variants; className?: string; children: React.ReactNode } & (
  | ({ href: string } & Omit<React.ComponentProps<typeof Link>, "href" | "className" | "children">)
  | ({ href?: undefined } & React.ButtonHTMLAttributes<HTMLButtonElement>)
);

export function Button({ variant = "primary", className, children, ...rest }: Props) {
  const cls = cn(base, variants[variant], className);
  if ("href" in rest && rest.href !== undefined) {
    const { href, ...linkProps } = rest;
    return <Link href={href} className={cls} {...linkProps}>{children}</Link>;
  }
  return <button type="button" className={cls} {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}>{children}</button>;
}
