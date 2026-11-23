import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { shortDate } from "@/lib/format";
import { reviewInteger, suggestReportPlayer, type RosterIdentity } from "@/lib/importReview";
import { useState } from "react";
import type { MatchReportImportDraft } from "../../../server/matchReportImport";

type Report = Omit<MatchReportImportDraft, "matchDetails"> & { matchDetails?: Partial<MatchReportImportDraft["matchDetails"]> };
type Game = { match: { id: number; opponent: string }; event: { startsAt: Date }; seasonName: string | null; competitionName: string | null };
export type ReportConfirmation = { matchId: number; ownScore: number; opponentScore: number; playerStats: Array<{ playerId: number; played: boolean; fouls: number; technicalFouls: number; unsportsmanlikeFouls: number }> };
const selectStyle = "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50";

export function MatchReportReview({ report, matches, roster, pending, readonly = false, onConfirm }: { report: Report; matches: Game[]; roster: RosterIdentity[]; pending: boolean; readonly?: boolean; onConfirm: (payload: ReportConfirmation) => Promise<void> }) {
  const [matchId, setMatchId] = useState("none");
  const [ownScore, setOwnScore] = useState(String(report.match.ownScore ?? ""));
  const [opponentScore, setOpponentScore] = useState(String(report.match.opponentScore ?? ""));
  const [mapping, setMapping] = useState<Record<number, string>>({});
  const [rows, setRows] = useState(report.playerStats.map(row => ({ ...row, fouls: String(row.fouls), technicalFouls: String(row.technicalFouls), unsportsmanlikeFouls: String(row.unsportsmanlikeFouls) })));
  const detail = report.matchDetails;
  const info = [detail?.date, detail?.time, detail?.venue, detail?.phase, detail?.district ? `Distrito ${detail.district}` : null, detail?.group ? `Grupo ${detail.group}` : null, detail?.journey ? `Jornada ${detail.journey}` : null].filter(Boolean).join(" · ");
  const selections = rows.map((row, index) => mapping[index] ?? String(suggestReportPlayer(row.playerName, roster) ?? "none"));
  const ids = selections.filter(id => id !== "none" && id !== "exclude");
  const unresolved = selections.includes("none");
  const duplicate = new Set(ids).size !== ids.length;
  const stats = rows.flatMap((row, index) => {
    const selected = selections[index];
    if (selected === "none" || selected === "exclude") return [];
    const fouls = reviewInteger(row.fouls, 10);
    const technicalFouls = reviewInteger(row.technicalFouls, 5);
    const unsportsmanlikeFouls = reviewInteger(row.unsportsmanlikeFouls, 5);
    return fouls === null || technicalFouls === null || unsportsmanlikeFouls === null ? [] : [{ playerId: Number(selected), played: row.played, fouls, technicalFouls, unsportsmanlikeFouls }];
  });
  const own = reviewInteger(ownScore, 300), opponent = reviewInteger(opponentScore, 300);
  const invalid = unresolved || duplicate || stats.length !== ids.length || !stats.length || matchId === "none" || own === null || opponent === null;
  const updateRow = (index: number, field: "fouls" | "technicalFouls" | "unsportsmanlikeFouls", value: string) => setRows(current => current.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));

  return <section className="mt-5 space-y-5" aria-label="Revisión del acta">
    <div className="rounded-xl bg-secondary/65 p-4"><p className="font-semibold">Buyuyus {report.match.ownScore ?? "?"}–{report.match.opponentScore ?? "?"} {report.match.opponent || "Rival no legible"}</p>{info ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{info}</p> : null}<p className="mt-2 text-xs">{rows.length} jugadores detectados · {ids.length} vinculados a la plantilla.</p></div>
    <p className="text-sm leading-6 text-muted-foreground">Un jugador listado en el acta cuenta como participante. P = falta personal, T = técnica, U = antideportiva. Los dorsales pueden cambiar: comprueba la ficha propuesta por nombre, o selecciónala manualmente. No se inventan puntos individuales ni otras estadísticas que el acta no permita leer.</p>
    {!readonly ? <>
      <div className="space-y-2"><Label htmlFor="report-match">Asociar al partido y temporada</Label><select id="report-match" className={selectStyle} value={matchId} onChange={event => setMatchId(event.target.value)} disabled={pending}><option value="none">Selecciona un partido</option>{matches.map(item => <option key={item.match.id} value={item.match.id}>{item.match.opponent} · {shortDate(item.event.startsAt)} · {item.seasonName ?? "Sin temporada"} · {item.competitionName ?? "Sin competición"}</option>)}</select></div>
      {!matches.length ? <p className="text-xs text-amber-800">Crea primero el partido en Temporadas y resultados. Después podrás asociar este borrador guardado.</p> : null}
      <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="own-score">Puntos Buyuyus</Label><Input id="own-score" type="number" min={0} max={300} value={ownScore} onChange={event => setOwnScore(event.target.value)} disabled={pending} /></div><div className="space-y-2"><Label htmlFor="opponent-score">Puntos rival</Label><Input id="opponent-score" type="number" min={0} max={300} value={opponentScore} onChange={event => setOpponentScore(event.target.value)} disabled={pending} /></div></div>
    </> : null}
    <div className="space-y-3">{rows.map((row, index) => <article key={index} className="rounded-xl border border-border p-4"><p className="text-sm font-semibold">{row.jerseyNumber !== null ? `#${row.jerseyNumber} · ` : ""}{row.playerName}</p>{readonly ? <p className="mt-2 text-sm">{row.played ? "Jugó" : "No jugó"} · P {row.fouls} · T {row.technicalFouls} · U {row.unsportsmanlikeFouls}</p> : <>
      <Label className="mt-3 block text-xs" htmlFor={`report-player-${index}`}>Ficha de jugador</Label><select id={`report-player-${index}`} className={`${selectStyle} mt-2`} value={selections[index]} onChange={event => setMapping(current => ({ ...current, [index]: event.target.value }))} disabled={pending}><option value="none">Pendiente de identificar</option><option value="exclude">No incluir esta fila (decisión administrativa)</option>{roster.map(player => <option key={player.id} value={player.id}>{player.fullName}{player.jerseyNumber !== null ? ` · dorsal habitual ${player.jerseyNumber}` : ""}</option>)}</select>
      {selections[index] !== "exclude" ? <div className="mt-3 grid grid-cols-3 gap-2">{(["fouls", "technicalFouls", "unsportsmanlikeFouls"] as const).map((field, number) => <div key={field}><Label className="text-xs" htmlFor={`report-${field}-${index}`}>{["P · Personales", "T · Técnicas", "U · Antideportivas"][number]}</Label><Input id={`report-${field}-${index}`} className="mt-1" type="number" min={0} max={field === "fouls" ? 10 : 5} value={row[field]} disabled={pending} onChange={event => updateRow(index, field, event.target.value)} /></div>)}<label className="col-span-3 mt-1 flex items-center gap-2 text-xs"><input type="checkbox" checked={row.played} disabled={pending} onChange={event => setRows(current => current.map((item, rowIndex) => rowIndex === index ? { ...item, played: event.target.checked } : item))} />Participó (jugador listado)</label></div> : null}
    </>}</article>)}</div>
    {!readonly ? <><div role="status" className="rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-900">{unresolved ? "Identifica todos los jugadores; si una ficha no existe, créala en Plantilla o decide explícitamente no incluir la fila. " : ""}{duplicate ? "Has asignado la misma ficha a más de una fila; corrígelo antes de confirmar. " : ""}Solo al confirmar se guardarán el marcador y las estadísticas en el partido seleccionado. Confirmar de nuevo reemplaza las estadísticas de ese partido, no las suma.</div><Button className="w-full rounded-xl" disabled={pending || invalid} onClick={() => { if (!invalid && own !== null && opponent !== null) void onConfirm({ matchId: Number(matchId), ownScore: own, opponentScore: opponent, playerStats: stats }); }}>{pending ? "Confirmando…" : "Confirmar acta y actualizar estadísticas"}</Button></> : <p className="text-xs text-muted-foreground">Consulta del borrador guardado. No se pueden aplicar cambios desde una importación ya revisada o descartada.</p>}
  </section>;
}
