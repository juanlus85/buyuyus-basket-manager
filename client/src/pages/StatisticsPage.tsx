import { PageHeader } from "@/components/PageHeader";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Award, BarChart3, ShieldAlert, Trophy, UsersRound } from "lucide-react";

type Metric = "played" | "won" | "fouls" | "technicalFouls" | "unsportsmanlikeFouls";

const metricOptions: Array<{ value: Metric; label: string; color: string }> = [
  { value: "played", label: "Partidos jugados", color: "hsl(var(--chart-1))" },
  { value: "won", label: "Partidos ganados", color: "hsl(var(--chart-2))" },
  { value: "fouls", label: "Faltas", color: "hsl(var(--chart-3))" },
  { value: "technicalFouls", label: "Técnicas", color: "hsl(var(--chart-4))" },
  { value: "unsportsmanlikeFouls", label: "Antideportivas", color: "hsl(var(--chart-5))" },
];

function metricLabel(metric: Metric) {
  return metricOptions.find(option => option.value === metric)?.label ?? "Valor";
}

export default function StatisticsPage() {
  const seasons = trpc.sports.seasons.useQuery();
  const [seasonId, setSeasonId] = useState("");
  const [metric, setMetric] = useState<Metric>("played");

  useEffect(() => {
    if (seasonId || !seasons.data?.length) return;
    setSeasonId(String(seasons.data.find(season => season.isCurrent)?.id ?? seasons.data[0].id));
  }, [seasonId, seasons.data]);

  const statistics = trpc.sports.teamStatistics.useQuery({ seasonId: Number(seasonId || 0) }, { enabled: Boolean(seasonId) });
  const selectedSeason = seasons.data?.find(season => String(season.id) === seasonId);
  const chartRows = useMemo(() => (statistics.data?.players ?? [])
    .map(row => ({ name: row.player.shortName || row.player.fullName.split(" ")[0], value: row.summary[metric], fullName: row.player.fullName }))
    .filter(row => row.value > 0)
    .sort((a, b) => b.value - a.value || a.fullName.localeCompare(b.fullName, "es"))
    .slice(0, 10), [statistics.data?.players, metric]);
  const selectedMetric = metricOptions.find(option => option.value === metric) ?? metricOptions[0];
  const chartConfig = { value: { label: selectedMetric.label, color: selectedMetric.color } } satisfies ChartConfig;
  const summary = statistics.data?.summary;

  return <div>
    <PageHeader eyebrow="Balance deportivo" title="Estadísticas del equipo." description="Consulta la participación, el balance y la disciplina de cada jugador a partir de actas confirmadas." action={<Select value={seasonId} onValueChange={setSeasonId}><SelectTrigger className="w-52 rounded-xl"><SelectValue placeholder="Selecciona una temporada" /></SelectTrigger><SelectContent>{(seasons.data ?? []).map(season => <SelectItem key={season.id} value={String(season.id)}>{season.name}{season.isCurrent ? " · Actual" : ""}</SelectItem>)}</SelectContent></Select>} />

    {!seasonId || seasons.isLoading ? <section className="paper-card p-8 text-sm text-muted-foreground">Cargando temporadas…</section> : statistics.isLoading ? <section className="paper-card p-8 text-sm text-muted-foreground">Calculando estadísticas de {selectedSeason?.name ?? "la temporada"}…</section> : !summary || !statistics.data?.players.length ? <section className="paper-card p-8"><p className="eyebrow">Sin datos confirmados</p><h2 className="display-face mt-1 text-3xl">Aún no hay actas para esta temporada.</h2><p className="mt-3 max-w-2xl text-sm text-muted-foreground">Cuando administración revise y confirme un acta, se incorporarán automáticamente la participación, las victorias, las derrotas y las sanciones de cada jugador.</p></section> : <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Trophy} label="Actas confirmadas" value={summary.reportedMatches} hint="Partidos con datos individuales" tone="sky" />
        <SummaryCard icon={UsersRound} label="Participaciones" value={summary.participations} hint={`${summary.playersWithStats} jugadores con estadísticas`} tone="emerald" />
        <SummaryCard icon={Award} label="Balance individual" value={`${summary.won}–${summary.lost}`} hint="Victorias y derrotas con participación" tone="amber" />
        <SummaryCard icon={ShieldAlert} label="Faltas acumuladas" value={summary.fouls} hint={`${summary.technicalFouls} técnicas · ${summary.unsportsmanlikeFouls} antideportivas`} tone="rose" />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,.8fr)]">
        <article className="paper-card p-6 sm:p-7"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="eyebrow">Comparativa de plantilla</p><h2 className="display-face mt-1 text-3xl">Quién destaca en cada registro</h2><p className="mt-2 text-sm text-muted-foreground">Solo se muestran jugadores con al menos un valor en la métrica elegida.</p></div><Select value={metric} onValueChange={value => setMetric(value as Metric)}><SelectTrigger className="w-52 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{metricOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>{chartRows.length ? <ChartContainer config={chartConfig} className="mt-6 h-[320px] w-full"><BarChart data={chartRows} margin={{ top: 12, right: 8, left: -16, bottom: 8 }}><CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} /><ChartTooltip cursor={{ fill: "hsl(var(--muted) / .45)" }} content={<ChartTooltipContent />} /><Bar dataKey="value" fill="var(--color-value)" radius={[8, 8, 2, 2]} /></BarChart></ChartContainer> : <div className="mt-6 grid h-[320px] place-items-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">No hay valores para {metricLabel(metric).toLowerCase()}.</div>}</article>
        <article className="paper-card p-6 sm:p-7"><p className="eyebrow">Disciplina</p><h2 className="display-face mt-1 text-3xl">Resumen de sanciones</h2><div className="mt-6 space-y-4"><DisciplineRow label="Faltas personales" value={summary.fouls} color="bg-sky-500" /><DisciplineRow label="Técnicas" value={summary.technicalFouls} color="bg-amber-500" /><DisciplineRow label="Antideportivas" value={summary.unsportsmanlikeFouls} color="bg-rose-500" /></div><div className="mt-7 rounded-2xl bg-secondary/55 p-4 text-sm text-muted-foreground"><AlertCircle className="mb-2 h-4 w-4 text-primary" />Las estadísticas solo cambian al confirmar un acta. Cada corrección de acta recalcula los totales de esta pantalla.</div></article>
      </section>

      <section className="paper-card mt-6 overflow-hidden"><div className="border-b border-border/70 px-6 py-5"><p className="eyebrow">Detalle por jugador</p><h2 className="display-face mt-1 text-3xl">La plantilla, partido a partido</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-secondary/55 text-left text-xs font-bold uppercase tracking-[.12em] text-muted-foreground"><tr><th className="px-6 py-4">Jugador</th><th className="px-3 py-4 text-center">PJ</th><th className="px-3 py-4 text-center">PG</th><th className="px-3 py-4 text-center">PP</th><th className="px-3 py-4 text-center">Faltas</th><th className="px-3 py-4 text-center">Técnicas</th><th className="px-6 py-4 text-center">Antidep.</th></tr></thead><tbody>{statistics.data.players.map(row => <tr key={row.player.id} className="border-t border-border/60 transition-colors hover:bg-secondary/25"><td className="px-6 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-sidebar text-xs font-bold text-sidebar-foreground">{row.player.jerseyNumber ?? "—"}</span><div><p className="font-semibold">{row.player.shortName || row.player.fullName}</p>{row.player.shortName ? <p className="text-xs text-muted-foreground">{row.player.fullName}</p> : null}</div></div></td><ValueCell value={row.summary.played} /><ValueCell value={row.summary.won} className="text-emerald-700" /><ValueCell value={row.summary.lost} className="text-rose-700" /><ValueCell value={row.summary.fouls} /><ValueCell value={row.summary.technicalFouls} className={row.summary.technicalFouls ? "text-amber-700" : undefined} /><ValueCell value={row.summary.unsportsmanlikeFouls} className={row.summary.unsportsmanlikeFouls ? "text-rose-700" : undefined} last /></tr>)}</tbody></table></div></section>
    </>}
  </div>;
}

function SummaryCard({ icon: Icon, label, value, hint, tone }: { icon: typeof Trophy; label: string; value: number | string; hint: string; tone: "sky" | "emerald" | "amber" | "rose" }) {
  const tones = { sky: "bg-sky-100 text-sky-700", emerald: "bg-emerald-100 text-emerald-700", amber: "bg-amber-100 text-amber-700", rose: "bg-rose-100 text-rose-700" };
  return <article className="paper-card p-5"><div className="flex items-start justify-between gap-3"><p className="eyebrow">{label}</p><span className={`grid h-10 w-10 place-items-center rounded-2xl ${tones[tone]}`}><Icon className="h-4 w-4" /></span></div><p className="mt-5 text-4xl font-black tracking-tight">{value}</p><p className="mt-2 text-sm text-muted-foreground">{hint}</p></article>;
}

function DisciplineRow({ label, value, color }: { label: string; value: number; color: string }) {
  return <div><div className="flex items-center justify-between gap-4 text-sm"><span className="font-semibold">{label}</span><span className="font-black">{value}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary"><div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(value ? 12 : 0, value * 12))}%` }} /></div></div>;
}

function ValueCell({ value, className, last }: { value: number; className?: string; last?: boolean }) { return <td className={`px-3 py-4 text-center font-bold ${last ? "px-6" : ""} ${className ?? ""}`}>{value}</td>; }
