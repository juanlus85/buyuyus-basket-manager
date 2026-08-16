import { useAuth } from "@/_core/hooks/useAuth";
import { MetricCard } from "@/components/MetricCard";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { dateTime, euro } from "@/lib/format";
import { AlertCircle, CalendarDays, CheckCircle2, CircleDollarSign, Clock3, Users } from "lucide-react";
import { Link } from "wouter";

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const events = trpc.sports.events.useQuery({ limit: 5 });
  const announcements = trpc.announcements.list.useQuery();
  const balances = trpc.finance.playerBalances.useQuery(undefined, { enabled: isAdmin });
  const paymentQueue = trpc.finance.paymentQueue.useQuery(undefined, { enabled: isAdmin });
  const ledger = trpc.finance.ledger.useQuery(undefined, { enabled: isAdmin });
  const mine = trpc.finance.myStatement.useQuery(undefined, { enabled: !isAdmin });
  const nextActivity = trpc.sports.nextSummary.useQuery();

  const outstanding = balances.data?.reduce((total, row) => total + Math.max(row.summary.balanceCents, 0), 0) ?? 0;
  const activePlayers = balances.data?.filter(row => row.player.status === "active").length ?? 0;
  const now = Date.now();
  const upcoming = events.data?.filter(row => new Date(row.event.startsAt).getTime() >= now) ?? [];

  return (
    <div>
      <PageHeader
        eyebrow={isAdmin ? "Centro de control" : "Mi espacio"}
        title={isAdmin ? "El equipo, en orden." : `Hola, ${user?.name?.split(" ")[0] ?? "jugador"}.`}
        description={isAdmin ? "Prioridades financieras, actividad próxima y confirmaciones pendientes para tomar decisiones rápidas." : "Consulta tu estado de cuenta y toda la actividad relevante de Buyuyus Basket."}
      />

      <section className="mt-2 grid gap-5 lg:grid-cols-2">
        <ActivityCard kind="Siguiente partido" href="/competicion" row={nextActivity.data?.nextMatch} empty="No hay partidos programados." />
        <ActivityCard kind="Próximo entrenamiento" href="/calendario" row={nextActivity.data?.nextTraining} empty="No hay entrenamientos programados." />
      </section>

      {isAdmin ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Saldo del equipo" value={euro(ledger.data?.generalBalanceCents ?? 0)} note="Incluye pagos ya confirmados." icon={CircleDollarSign} accent="green" />
            <MetricCard label="Pendiente por cobrar" value={euro(outstanding)} note="Deuda abierta de jugadores activos." icon={AlertCircle} accent="red" />
            <MetricCard label="Pagos por confirmar" value={String(paymentQueue.data?.length ?? 0)} note="No afectan al saldo hasta confirmar." icon={Clock3} accent="gold" />
            <MetricCard label="Plantilla activa" value={String(activePlayers)} note="Las bajas quedan archivadas." icon={Users} accent="blue" />
          </section>

          <section className="mt-7 grid gap-5 xl:grid-cols-[1.18fr_.82fr]">
            <article className="paper-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-border/70 px-6 py-5">
                <div><p className="eyebrow">Confirmaciones</p><h2 className="display-face mt-1 text-2xl">Pagos pendientes</h2></div>
                <Link href="/cuentas" className="text-xs font-bold uppercase tracking-wider text-primary hover:underline">Ver cuentas</Link>
              </div>
              <div className="divide-y divide-border/70">
                {paymentQueue.isLoading ? <div className="space-y-3 p-6"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-4/5" /></div> : paymentQueue.data?.length ? paymentQueue.data.slice(0, 4).map(row => (
                  <div key={row.payment.id} className="flex items-center justify-between gap-4 px-6 py-4">
                    <div className="min-w-0"><p className="truncate text-sm font-semibold">{row.playerName}</p><p className="mt-1 text-xs text-muted-foreground">{dateTime(row.payment.paidAt)} · {row.payment.method === "bizum" ? "Bizum" : row.payment.method === "cash" ? "Efectivo" : row.payment.method === "paypal" ? "PayPal" : "Transferencia"}</p></div>
                    <p className="text-sm font-bold">{euro(row.payment.amountCents)}</p>
                  </div>
                )) : <p className="px-6 py-9 text-sm text-muted-foreground">No hay pagos esperando revisión.</p>}
              </div>
            </article>

            <article className="paper-card overflow-hidden">
              <div className="border-b border-border/70 px-6 py-5"><p className="eyebrow">Agenda</p><h2 className="display-face mt-1 text-2xl">Lo siguiente</h2></div>
              <div className="divide-y divide-border/70">
                {events.isLoading ? <div className="space-y-3 p-6"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div> : upcoming.length ? upcoming.slice(0, 4).map(row => <div key={row.event.id} className="flex gap-3 px-6 py-4"><span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-sky-100 text-sky-700"><CalendarDays className="h-3.5 w-3.5" /></span><div><p className="text-sm font-semibold">{row.event.title}</p><p className="mt-1 text-xs text-muted-foreground">{dateTime(row.event.startsAt)}{row.event.location ? ` · ${row.event.location}` : ""}</p></div></div>) : <p className="px-6 py-9 text-sm text-muted-foreground">No hay eventos próximos.</p>}
              </div>
            </article>
          </section>
        </>
      ) : (
        <section className="grid gap-5 lg:grid-cols-[1fr_.9fr]">
          <article className="relative overflow-hidden rounded-3xl bg-sidebar p-7 text-sidebar-foreground shadow-xl sm:p-9">
            <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full border-[18px] border-sky-300/15" />
            <p className="eyebrow text-sky-200">Mi estado de cuenta</p>
            {mine.isLoading ? <Skeleton className="mt-5 h-12 w-44 bg-white/10" /> : <><p className="mt-4 text-5xl font-semibold tracking-tight">{euro(mine.data?.summary.balanceCents ?? 0)}</p><p className="mt-2 text-sm text-sky-100/70">{(mine.data?.summary.balanceCents ?? 0) > 0 ? "Saldo pendiente de abonar." : "No tienes deuda pendiente."}</p></>}
            <Link href="/cuentas" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-sidebar hover:bg-sky-50">Gestionar pagos <CircleDollarSign className="h-4 w-4" /></Link>
          </article>
          <article className="paper-card p-7"><p className="eyebrow">Próximamente</p><h2 className="display-face mt-1 text-3xl">En la agenda</h2><div className="mt-5 space-y-3">{upcoming.length ? upcoming.slice(0, 3).map(row => <div key={row.event.id} className="rounded-xl bg-secondary/70 px-4 py-3"><p className="text-sm font-semibold">{row.event.title}</p><p className="mt-1 text-xs text-muted-foreground">{dateTime(row.event.startsAt)}</p></div>) : <p className="text-sm text-muted-foreground">No hay eventos próximos.</p>}</div></article>
        </section>
      )}

      <section className="mt-7 paper-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/70 px-6 py-5"><div><p className="eyebrow">Comunicación</p><h2 className="display-face mt-1 text-2xl">Avisos del equipo</h2></div><Link href="/equipo" className="text-xs font-bold uppercase tracking-wider text-primary hover:underline">Ver todos</Link></div>
        <div className="divide-y divide-border/70">{announcements.data?.length ? announcements.data.slice(0, 3).map(item => <div className="px-6 py-5" key={item.id}><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{item.title}</p>{item.isPinned ? <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Destacado</Badge> : null}</div><p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{item.content}</p></div>) : <div className="flex items-center gap-3 px-6 py-8 text-sm text-muted-foreground"><CheckCircle2 className="h-5 w-5 text-emerald-600" />No hay avisos nuevos.</div>}</div>
      </section>
    </div>
  );
}

function ActivityCard({ kind, href, row, empty }: { kind: string; href: string; row: { event: { title: string; startsAt: Date; callAt: Date | null; location: string | null; description: string | null }; match: { opponent: string; venue: "home" | "away" | "neutral" } | null; competitionName: string | null; attendance: { going: number; maybe: number; notGoing: number; mine: "going" | "maybe" | "not_going" | null } } | null | undefined; empty: string }) {
  return <article className="paper-card overflow-hidden"><div className="flex items-center justify-between border-b border-border/70 px-6 py-5"><div><p className="eyebrow">Agenda deportiva</p><h2 className="display-face mt-1 text-2xl">{kind}</h2></div><CalendarDays className="h-5 w-5 text-primary" /></div>{row ? <div className="px-6 py-5"><p className="text-lg font-bold">{row.match ? `Buyuyus · ${row.match.opponent}` : row.event.title}</p><p className="mt-2 text-sm text-muted-foreground">{dateTime(row.event.startsAt)}{row.event.location ? ` · ${row.event.location}` : ""}</p>{row.event.callAt ? <p className="mt-2 rounded-lg bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800">Hora de estar: {dateTime(row.event.callAt)}</p> : null}{row.competitionName ? <p className="mt-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{row.competitionName}</p> : null}{row.event.description ? <p className="mt-3 text-sm text-muted-foreground">{row.event.description}</p> : null}{row.event.callAt || row.event.title ? <p className="mt-4 text-xs text-muted-foreground">Asistencia: {row.attendance.going} sí · {row.attendance.maybe} quizá · {row.attendance.notGoing} no</p> : null}<Link href={href} className="mt-4 inline-flex text-xs font-bold uppercase tracking-wider text-primary hover:underline">Ver en calendario</Link></div> : <p className="px-6 py-9 text-sm text-muted-foreground">{empty}</p>}</article>;
}
