import { AdminOnly } from "@/components/AdminOnly";
import { MatchReportReview, type ReportConfirmation } from "@/components/MatchReportReview";
import { WeeklySportsReview, type SnapshotConfirmation } from "@/components/WeeklySportsReview";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { shortDate } from "@/lib/format";
import { FileSearch, FileUp, LoaderCircle, Sparkles } from "lucide-react";
import { ChangeEvent, useState } from "react";
import { toast } from "sonner";
import type { MatchReportImportDraft } from "../../../server/matchReportImport";
import { weeklySportsDraftSchema, type WeeklySportsDraft } from "../../../shared/weeklySportsImport";

type ExtractedItem = { recordType: string; summary: string; rawFields: string; confidence: number };
type ExtractionResult = { documentSummary: string; items: ExtractedItem[]; warnings: string[] };
type Report = Omit<MatchReportImportDraft, "matchDetails"> & { matchDetails?: Partial<MatchReportImportDraft["matchDetails"]> };
type Draft = ExtractionResult | Report | WeeklySportsDraft;
type ImportType = "calendar" | "standing" | "match_report" | "financial" | "other";
const typeLabels: Record<ImportType, string> = { calendar: "Calendario", standing: "Clasificación y resultados", match_report: "Acta del partido", financial: "Contabilidad", other: "Otro" };
const statusLabels: Record<string, string> = { ready_for_review: "Listo para revisar", approved: "Confirmado/revisado", discarded: "Descartado", failed: "Con error", extracting: "Extrayendo", uploaded: "Subido" };

function savedDraft(value: unknown): Draft | null {
  if (!value || typeof value !== "object") return null;
  if ("standings" in value) { const parsed = weeklySportsDraftSchema.safeParse(value); return parsed.success ? parsed.data : null; }
  if (!("documentSummary" in value) || typeof value.documentSummary !== "string" || !("warnings" in value) || !Array.isArray(value.warnings)) return null;
  if ("match" in value && "playerStats" in value && Array.isArray(value.playerStats)) return value as Report;
  if ("items" in value && Array.isArray(value.items)) return value as ExtractionResult;
  return null;
}

export default function ImportPage() { return <AdminOnly><ImportWorkspace /></AdminOnly>; }

function ImportWorkspace() {
  const utils = trpc.useUtils();
  const jobs = trpc.imports.list.useQuery();
  const upload = trpc.imports.uploadAndExtract.useMutation({ onSettled: () => utils.imports.list.invalidate() });
  const review = trpc.imports.review.useMutation({ onSuccess: () => utils.imports.list.invalidate() });
  const matches = trpc.sports.matches.useQuery();
  const competitions = trpc.sports.competitions.useQuery();
  const seasons = trpc.sports.seasons.useQuery();
  const roster = trpc.players.adminRoster.useQuery();
  const applyReport = trpc.sports.applyMatchReport.useMutation();
  const applySnapshot = trpc.imports.applySportsSnapshot.useMutation();
  const [type, setType] = useState<ImportType>("match_report");
  const [result, setResult] = useState<Draft | null>(null);
  const [filename, setFilename] = useState("");
  const [jobId, setJobId] = useState<number | null>(null);
  const [fileUrl, setFileUrl] = useState("");
  const [status, setStatus] = useState("ready_for_review");
  const [errorMessage, setErrorMessage] = useState("");
  const [reviewKey, setReviewKey] = useState(0);
  const pending = upload.isPending || applyReport.isPending || applySnapshot.isPending || review.isPending;
  const readonly = status !== "ready_for_review";
  const report = result && "match" in result ? result : null;
  const snapshot = result && "standings" in result ? result : null;

  const uploadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0]; if (!file || pending) return;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isImage = !isPdf && file.type.startsWith("image/");
    if (!isPdf && !isImage) { toast.error("Selecciona una imagen o un PDF."); input.value = ""; return; }
    if (file.size > 15 * 1024 * 1024) { toast.error("El documento supera el límite de 15 MB."); input.value = ""; return; }
    setFilename(file.name); setResult(null); setJobId(null); setFileUrl(""); setErrorMessage("");
    try {
      const base64 = await readBase64(file);
      const response = await upload.mutateAsync({ type, sourceKind: isPdf ? "pdf" : "image", originalFilename: file.name, mimeType: isPdf ? "application/pdf" : file.type, base64 });
      const draft = savedDraft(response.result);
      if (!draft) throw new Error("El documento se guardó, pero el borrador no tiene un formato válido. Consulta el historial.");
      setResult(draft); setJobId(response.id); setFileUrl(response.fileUrl); setStatus(response.status); setReviewKey(current => current + 1);
      toast.success("Borrador guardado. Revísalo antes de confirmar datos.");
    } catch (error) { const message = error instanceof Error ? error.message : "No se ha podido extraer el documento."; setErrorMessage(message); toast.error(message); }
    finally { input.value = ""; }
  };

  const confirmReport = async (payload: ReportConfirmation) => {
    if (!jobId || readonly || !report) return;
    try {
      await applyReport.mutateAsync({ ...payload, sourceImportId: jobId, notes: report.documentSummary });
      setStatus("approved"); await utils.invalidate(); toast.success("Acta confirmada: resultado y estadísticas disponibles en la temporada del partido.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo confirmar el acta."); }
  };
  const confirmSnapshot = async (payload: SnapshotConfirmation) => {
    if (!jobId || readonly) return;
    try { await applySnapshot.mutateAsync({ id: jobId, ...payload }); setStatus("approved"); await utils.invalidate(); toast.success("Clasificación y resultados seleccionados confirmados. No se han inventado participaciones ni faltas de jugadores."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "No se pudieron confirmar los cambios."); }
  };
  const decide = async (id: number, decision: "approved" | "discarded") => {
    try { await review.mutateAsync({ id, decision }); if (jobId === id) setStatus(decision); toast.success(decision === "discarded" ? "Borrador descartado." : "Documento marcado como revisado, sin aplicar datos."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo guardar la decisión."); }
  };

  return <div>
    <PageHeader eyebrow="Importación asistida" title="Del documento al borrador." description="Sube actas, capturas semanales de clasificación y resultados, calendarios o cuentas. Primero se guardan para revisar; solo administración confirma los cambios." />
    <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
      <article className="paper-card p-6 sm:p-7"><p className="eyebrow">Nuevo documento</p><h2 className="display-face mt-1 text-3xl">Preparar importación</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Las actas IMD y calendarios PDF reconocidos con texto se procesan localmente, sin IA. Las capturas y documentos escaneados necesitan análisis visual configurado en el servidor.</p>
        <div className="mt-6 space-y-2"><label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Destino del borrador</label><Select value={type} onValueChange={value => setType(value as ImportType)} disabled={pending}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(typeLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
        <label className={`mt-5 flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-primary/35 bg-accent/30 px-5 text-center ${pending ? "opacity-60" : "cursor-pointer hover:bg-accent/60"}`}><input type="file" accept="image/*,application/pdf" aria-label="Subir documento" className="sr-only" disabled={pending} onChange={uploadFile} /><span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground">{upload.isPending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <FileUp className="h-5 w-5" />}</span><span className="mt-3 text-sm font-bold">{upload.isPending ? "Extrayendo información…" : "Seleccionar imagen o PDF"}</span><span className="mt-1 break-all text-xs text-muted-foreground">Máximo 15 MB · {filename || "sin archivo"}</span></label>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">Para capturas semanales selecciona «Clasificación y resultados». Incluye las cabeceras, los nombres completos y toda la tabla; no hace falta un acta para actualizar el marcador, pero las faltas y participaciones solo se obtienen de actas.</p>
        {errorMessage ? <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-900">{errorMessage}</div> : null}
      </article>
      <article className="paper-card min-w-0 overflow-hidden"><div className="flex items-center gap-3 border-b border-border/70 px-6 py-5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-amber-700"><Sparkles className="h-4 w-4" /></span><div><p className="eyebrow">Revisión administrativa</p><h2 className="display-face mt-1 text-2xl">Borrador guardado</h2></div></div>
        {result ? <div className="p-5 sm:p-6"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><Badge variant="secondary">{statusLabels[status] ?? status}</Badge>{fileUrl ? <a className="text-xs font-semibold text-primary underline" href={fileUrl} target="_blank" rel="noreferrer">Ver documento original</a> : null}</div><p className="text-sm leading-6 text-muted-foreground">{result.documentSummary}</p>
          {report ? <MatchReportReview key={reviewKey} report={report} matches={matches.data ?? []} roster={roster.data ?? []} pending={pending} readonly={readonly} onConfirm={confirmReport} /> : snapshot ? <WeeklySportsReview key={reviewKey} draft={snapshot} matches={matches.data ?? []} competitions={competitions.data ?? []} seasons={seasons.data ?? []} pending={pending} readonly={readonly} onConfirm={confirmSnapshot} /> : "items" in result ? <div className="mt-5 space-y-3">{result.items.map((item, index) => <div key={index} className="rounded-xl bg-secondary/65 p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-wider text-primary">{item.recordType}</p><Badge variant="secondary">{item.confidence}% confianza</Badge></div><p className="mt-2 font-semibold">{item.summary}</p><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{item.rawFields}</p></div>)}</div> : null}
          {result.warnings.length ? <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900"><strong>Revisar antes de guardar:</strong><ul className="mt-2 list-disc pl-4">{result.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></div> : null}
        </div> : <div className="p-10 text-center"><FileSearch className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-3 text-sm text-muted-foreground">Aquí aparecerá el borrador. También puedes abrir una importación desde el historial.</p></div>}
      </article>
    </section>
    <section className="paper-card mt-7 overflow-hidden"><div className="border-b border-border/70 px-6 py-5"><p className="eyebrow">Historial persistente</p><h2 className="display-face mt-1 text-2xl">Importaciones guardadas</h2><p className="mt-2 text-xs text-muted-foreground">Abrir un borrador no aplica datos. Puedes volver a él después de recargar la página.</p></div>
      {jobs.isError ? <p role="alert" className="p-6 text-sm text-red-700">No se pudo cargar el historial: {jobs.error.message}</p> : <div className="divide-y divide-border/70">{jobs.data?.length ? jobs.data.map(job => <div key={job.id} className="flex flex-wrap items-start justify-between gap-3 px-6 py-4"><div className="min-w-0 max-w-full"><p className="break-all font-semibold">{job.originalFilename}</p><p className="mt-1 text-xs text-muted-foreground">{typeLabels[job.type]} · {shortDate(job.createdAt)}</p>{job.status === "failed" && job.extractionNote ? <p className="mt-2 max-w-2xl text-xs leading-5 text-red-700">{job.extractionNote}</p> : null}</div><div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">{statusLabels[job.status] ?? job.status}</Badge>{savedDraft(job.extractedData) ? <Button size="sm" variant="outline" disabled={pending} onClick={() => { setResult(savedDraft(job.extractedData)); setJobId(job.id); setFilename(job.originalFilename); setFileUrl(job.fileUrl); setStatus(job.status); setErrorMessage(""); setReviewKey(current => current + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Abrir borrador</Button> : <a className="text-xs text-primary underline" href={job.fileUrl} target="_blank" rel="noreferrer">Ver archivo guardado</a>}{job.status === "ready_for_review" ? <>{job.type !== "match_report" && job.type !== "standing" ? <Button size="sm" disabled={pending} onClick={() => void decide(job.id, "approved")}>Marcar revisado</Button> : null}<Button size="sm" variant="ghost" disabled={pending} onClick={() => void decide(job.id, "discarded")}>Descartar</Button></> : null}</div></div>) : <p className="p-7 text-sm text-muted-foreground">{jobs.isLoading ? "Cargando importaciones…" : "Aún no hay importaciones."}</p>}</div>}
    </section>
  </div>;
}

function readBase64(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(reader.error); reader.onload = () => resolve(String(reader.result).split(",")[1] ?? ""); reader.readAsDataURL(file); }); }
