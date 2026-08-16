import type { LucideIcon } from "lucide-react";

export function MetricCard({ label, value, note, icon: Icon, accent = "blue" }: { label: string; value: string; note: string; icon: LucideIcon; accent?: "blue" | "gold" | "red" | "green" }) {
  const accents = {
    blue: "bg-sky-100 text-sky-700",
    gold: "bg-amber-100 text-amber-700",
    red: "bg-rose-100 text-rose-700",
    green: "bg-emerald-100 text-emerald-700",
  };
  return (
    <article className="paper-card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow">{label}</p>
        <span className={`grid h-9 w-9 place-items-center rounded-xl ${accents[accent]}`}><Icon className="h-4 w-4" /></span>
      </div>
      <p className="mt-6 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{note}</p>
    </article>
  );
}
