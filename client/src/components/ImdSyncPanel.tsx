import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type DraftChanges = { resultUpdates?: unknown[]; unmatchedResults?: unknown[]; standingChanged?: boolean };

export function ImdSyncPanel() {
  const utils = trpc.useUtils();
  const seasons = trpc.sports.seasons.useQuery();
  const competitions = trpc.sports.competitions.useQuery();
  const configs = trpc.imdSync.configs.useQuery();
  const drafts = trpc.imdSync.drafts.useQuery();
  const [seasonId, setSeasonId] = useState(""); const [competitionId, setCompetitionId] = useState(""); const [portalCompetition, setPortalCompetition] = useState("");
  useEffect(() => {
    const season = seasons.data?.find(item => item.isCurrent) ?? seasons.data?.[0];
    if (season && !seasonId) setSeasonId(String(season.id));
  }, [seasons.data, seasonId]);
  useEffect(() => {
    const competition = competitions.data?.find(item => String(item.seasonId) === seasonId) ?? competitions.data?.[0];
    if (competition && !competitionId) setCompetitionId(String(competition.id));
  }, [competitions.data, competitionId, seasonId]);
  const save = trpc.imdSync.saveConfig.useMutation({ onSuccess: () => { utils.imdSync.configs.invalidate(); toast.success("Configuración IMD guardada."); } });
  const run = trpc.imdSync.runNow.useMutation({ onSuccess: result => { utils.imdSync.drafts.invalidate(); if (result.status === "failed") toast.error(result.error ?? "No se pudo consultar el IMD."); else toast.success(result.status === "pending" ? "Borrador IMD listo para revisar." : "Sin cambios detectados."); } });
  const apply = trpc.imdSync.applyDraft.useMutation({ onSuccess: result => { utils.imdSync.drafts.invalidate(); utils.sports.matches.invalidate(); utils.sports.standings.invalidate(); toast.success(`Aplicados ${result.appliedResults} resultados y ${result.appliedStandings} filas de clasificación.`); } });
  const discard = trpc.imdSync.discard.useMutation({ onSuccess: () => { utils.imdSync.drafts.invalidate(); toast.success("Borrador descartado."); } });
  const pending = drafts.data?.filter(item => item.draft.status === "pending") ?? [];
  return <section className="paper-card mt-7 overflow-hidden"><div className="border-b border-border/70 px-6 py-5"><p className="eyebrow">Sincronización pública</p><h2 className="display-face mt-1 text-2xl">Bandeja IMD</h2><p className="mt-1 text-sm text-muted-foreground">Los martes se revisan provisionales y los jueves definitivos. Nada se aplica sin confirmación.</p></div>
    <div className="border-b border-border/70 p-6"><div className="grid gap-3 md:grid-cols-4"><div className="space-y-2"><Label>Temporada</Label><Select value={seasonId} onValueChange={setSeasonId}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{seasons.data?.map(season => <SelectItem key={season.id} value={String(season.id)}>{season.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Competición interna</Label><Select value={competitionId} onValueChange={setCompetitionId}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{competitions.data?.filter(item => String(item.seasonId) === seasonId).map(item => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Competición en el IMD</Label><Input className="rounded-xl" value={portalCompetition} onChange={event => setPortalCompetition(event.target.value)} placeholder="Juegos Deportivos Municipales 2026-2027" /></div><div className="flex items-end"><Button className="w-full rounded-xl" disabled={!seasonId || !competitionId || !portalCompetition || save.isPending} onClick={() => save.mutate({ seasonId: Number(seasonId), competitionId: Number(competitionId), portalCompetition, teamSearch: "BUYUYUS" })}>Guardar conexión IMD</Button></div></div>
      {configs.data?.length ? <div className="mt-4 flex flex-wrap gap-2">{configs.data.map(item => <div key={item.config.id} className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-sm"><span>{item.season.name} · {item.competition.name}</span><Badge variant="secondary">{item.config.portalTeamId ? `Grupo ${item.config.portalGroup ?? "detectado"}` : "Pendiente de primera consulta"}</Badge><Button size="sm" variant="outline" className="rounded-lg" disabled={run.isPending} onClick={() => run.mutate({ configId: item.config.id, mode: "provisional" })}>Consultar provisional</Button><Button size="sm" variant="outline" className="rounded-lg" disabled={run.isPending} onClick={() => run.mutate({ configId: item.config.id, mode: "final" })}>Consultar definitivo</Button></div>)}</div> : null}
    </div>
    <div className="divide-y divide-border/70">{pending.length ? pending.map(item => { const changes = (item.draft.changesData ?? {}) as DraftChanges; return <div key={item.draft.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-5"><div><div className="flex items-center gap-2"><p className="font-semibold">{item.draft.mode === "provisional" ? "Provisional" : "Definitivo"} · {item.season.name}</p><Badge>{item.draft.mode === "provisional" ? "Martes" : "Jueves"}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{changes.resultUpdates?.length ?? 0} resultados a actualizar · {changes.unmatchedResults?.length ?? 0} partidos sin vincular · {changes.standingChanged ? "clasificación con cambios" : "clasificación sin cambios"}</p></div><div className="flex gap-2"><Button variant="outline" className="rounded-xl" disabled={discard.isPending} onClick={() => discard.mutate({ draftId: item.draft.id })}>Descartar</Button><Button className="rounded-xl" disabled={apply.isPending} onClick={() => apply.mutate({ draftId: item.draft.id })}>Confirmar cambios</Button></div></div>; }) : <div className="p-7 text-sm text-muted-foreground">No hay borradores pendientes de revisión.</div>}</div>
  </section>;
}
