import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, Sparkles } from "lucide-react";

type Tone = "green" | "orange" | "red" | "blue" | "gray";

const toneClasses: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  orange: "bg-amber-50 text-amber-700 border border-amber-200",
  red: "bg-red-50 text-red-700 border border-red-200",
  blue: "bg-medical-50 text-medical-700 border border-medical-200",
  gray: "bg-slate-100 text-slate-600 border border-slate-200"
};

export function StatusBadge({ children, tone = "gray" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`label ${toneClasses[tone]}`}>{children}</span>;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-5">
      <div>
        <p className="eyebrow mb-1.5">{eyebrow}</p>
        <h1 className="text-[28px] font-bold tracking-tight text-slate-950">{title}</h1>
        <p className="mt-1.5 max-w-3xl text-sm leading-5 text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  action
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-4">
      <div>
        <h2 className="card-title">{title}</h2>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Notice({
  tone = "blue",
  title,
  children
}: {
  tone?: Exclude<Tone, "gray">;
  title: string;
  children: ReactNode;
}) {
  const Icon = tone === "red" || tone === "orange" ? AlertTriangle : tone === "green" ? CheckCircle2 : Info;
  return (
    <div className={`flex gap-3 rounded-xl border p-4 ${toneClasses[tone]}`}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="text-sm font-bold">{title}</p>
        <div className="mt-1 text-sm leading-6 opacity-90">{children}</div>
      </div>
    </div>
  );
}

export function AiBadge() {
  return (
    <StatusBadge tone="blue">
      <Sparkles className="h-3.5 w-3.5" />
      AI 辅助草稿
    </StatusBadge>
  );
}

export function StatCard({
  label,
  value,
  note,
  tone = "blue",
  icon
}: {
  label: string;
  value: string;
  note: string;
  tone?: Tone;
  icon: ReactNode;
}) {
  const accent: Record<Tone, string> = {
    green: "bg-emerald-50 text-emerald-700",
    orange: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    blue: "bg-medical-50 text-medical-700",
    gray: "bg-slate-100 text-slate-600"
  };
  return (
    <article className="card p-5" data-metric={`METRIC-${label}`}>
      <div className="flex items-start justify-between">
        <div className={`rounded-xl p-2.5 ${accent[tone]}`}>{icon}</div>
        {tone === "red" && <span className="h-2.5 w-2.5 rounded-full bg-red-500" />}
      </div>
      <p className="mt-5 text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{note}</p>
    </article>
  );
}
