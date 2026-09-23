import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cx, priorityClass, slaClass, statusClass } from "../../lib/utils";

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "glow";
  size?: "sm" | "md" | "lg";
}) {
  const sizeStyles = {
    sm: "px-3.5 py-1.5 text-xs font-bold rounded-xl",
    md: "px-5 py-2.5 text-sm font-bold rounded-xl",
    lg: "px-7 py-3.5 text-base font-bold rounded-2xl",
  };

  const styles = {
    primary:
      "group relative overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 dark:from-white dark:via-zinc-100 dark:to-zinc-200 text-white dark:text-zinc-950 shadow-md shadow-indigo-600/25 dark:shadow-none hover:shadow-2xl hover:shadow-indigo-600/40 hover:-translate-y-1 active:translate-y-0 active:scale-[0.97] transition-all duration-200 font-bold border border-indigo-500/30 dark:border-transparent",
    secondary:
      "group relative overflow-hidden glass-card border dark:border-white/[0.15] border-slate-200/90 dark:text-zinc-100 text-slate-800 bg-white/90 dark:bg-white/[0.05] hover:bg-indigo-50/70 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-300 hover:border-indigo-300 dark:hover:border-indigo-400/50 hover:shadow-xl hover:shadow-indigo-500/15 hover:-translate-y-1 active:translate-y-0 active:scale-[0.97] transition-all duration-200 font-bold",
    ghost:
      "dark:text-zinc-300 text-slate-600 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] active:scale-[0.97] transition-all duration-150 font-semibold",
    danger:
      "bg-rose-500/10 text-rose-600 dark:text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-150 font-bold",
    glow:
      "group relative overflow-hidden bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 text-white font-bold hover:shadow-2xl hover:shadow-purple-500/40 hover:-translate-y-1 active:translate-y-0 active:scale-[0.97] transition-all duration-200",
  };

  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 tracking-tight disabled:opacity-40 disabled:pointer-events-none cursor-pointer select-none",
        sizeStyles[size],
        styles[variant],
        className,
      )}
      {...props}
    >
      {/* Light shimmer light sweep on hover */}
      {(variant === "primary" || variant === "glow") && (
        <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      )}
      {children}
    </button>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        "w-full rounded-xl border dark:border-white/[0.1] border-slate-200 dark:bg-[#0E0E14] bg-white px-3.5 py-2 text-sm dark:text-zinc-100 text-slate-900 placeholder:text-slate-400 dark:placeholder:text-zinc-500",
        "focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm transition-all duration-150 font-medium",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cx(
        "w-full rounded-xl border dark:border-white/[0.1] border-slate-200 dark:bg-[#0E0E14] bg-white px-3.5 py-2.5 text-sm dark:text-zinc-100 text-slate-900 placeholder:text-slate-400 dark:placeholder:text-zinc-500",
        "focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm transition-all duration-150 font-medium",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cx(
        "w-full rounded-xl border dark:border-white/[0.1] border-slate-200 dark:bg-[#0E0E14] bg-white px-3.5 py-2 text-sm dark:text-zinc-100 text-slate-900 font-medium",
        "focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm transition-all duration-150 cursor-pointer",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ children, htmlFor, className }: { children: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cx("mb-1.5 block text-xs font-bold dark:text-zinc-400 text-slate-600 tracking-wide uppercase", className)}>
      {children}
    </label>
  );
}

export function Card({
  children,
  className,
  hoverable = false,
}: {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
}) {
  return (
    <section
      className={cx(
        "glass-card relative rounded-2xl border dark:border-white/[0.08] border-slate-200 p-5 shadow-sm",
        hoverable && "transition-all duration-200 hover:shadow-md hover:border-indigo-400 dark:hover:border-white/[0.18]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function BentoCard({
  title,
  subtitle,
  children,
  badge,
  className,
  glow = false,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  badge?: ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <div
      className={cx(
        "glass-card group relative overflow-hidden rounded-2xl border dark:border-white/[0.08] border-slate-200 p-6 shadow-sm transition-all duration-300",
        "hover:border-indigo-400 dark:hover:border-white/[0.2] hover:shadow-xl",
        className,
      )}
    >
      {/* Top subtle highlight shimmer */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      {glow && (
        <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
      )}

      {(title || badge) && (
        <div className="mb-4 flex items-center justify-between">
          <div>
            {title && <h3 className="text-lg font-bold dark:text-white text-slate-900 tracking-tight">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs font-medium dark:text-zinc-400 text-slate-500">{subtitle}</p>}
          </div>
          {badge}
        </div>
      )}
      {children}
    </div>
  );
}

export function Badge({ value, kind = "status" }: { value: string; kind?: "status" | "priority" | "sla" }) {
  const map = kind === "priority" ? priorityClass : kind === "sla" ? slaClass : statusClass;
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide border",
        map[value] ?? "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700",
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
      {value.replaceAll("_", " ")}
    </span>
  );
}

export function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ElementType;
  trend?: string;
}) {
  return (
    <div className="glass-card group relative overflow-hidden rounded-2xl border dark:border-white/[0.08] border-slate-200 p-5 shadow-sm transition-all duration-200 hover:border-indigo-400 dark:hover:border-white/[0.18]">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold dark:text-zinc-400 text-slate-500 uppercase tracking-wider">{label}</p>
        {Icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-xl dark:bg-white/[0.04] bg-slate-100 border dark:border-white/[0.08] border-slate-200 dark:text-zinc-400 text-slate-600 group-hover:text-indigo-600 transition-colors">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <p className="mt-2 font-display text-3xl font-extrabold tracking-tight dark:text-white text-slate-900">{value}</p>
      {(hint || trend) && (
        <div className="mt-2 flex items-center gap-2 text-xs font-medium dark:text-zinc-400 text-slate-500">
          {trend && (
            <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              {trend}
            </span>
          )}
          {hint ? <span>{hint}</span> : null}
        </div>
      )}
    </div>
  );
}

export function Empty({ title, body }: { title: string; body?: string }) {
  return (
    <div className="glass-card rounded-2xl border border-dashed dark:border-white/[0.12] border-slate-300 p-12 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full dark:bg-white/[0.04] bg-slate-100 border dark:border-white/[0.08] border-slate-200">
        <div className="h-3 w-3 rounded-full bg-indigo-500 animate-ping opacity-75" />
      </div>
      <p className="font-bold dark:text-white text-slate-900 tracking-tight text-base">{title}</p>
      {body ? <p className="mt-1 text-xs dark:text-zinc-400 text-slate-500 max-w-sm mx-auto font-medium">{body}</p> : null}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-300 font-medium">
      {message}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-10">
      <div className="relative h-9 w-9">
        <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
        <div className="absolute inset-0 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    </div>
  );
}
