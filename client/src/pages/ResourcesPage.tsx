import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Archive, ArrowDownUp, BookOpen, ExternalLink, FileText, Link2, Paperclip, Pencil, Pin, Upload } from "lucide-react";
import { ChangeEvent, FormEvent, ReactNode, useMemo, useState } from "react";
import { toast } from "sonner";

type Category = "calendar" | "rules" | "document" | "link" | "other";
type Resource = { id: number; title: string; description: string | null; category: Category; kind: "document" | "link"; externalUrl: string | null; fileName: string | null; fileUrl: string | null; sortOrder: number; isPinned: boolean; isArchived: boolean };
type ResourceRow = { resource: Resource; authorName: string | null };
type UpdateResource = (input: { id: number; title: string; description: string | null; category: Category; isPinned: boolean; sortOrder: number }) => void;
const labels: Record<Category, string> = { calendar: "Calendarios", rules: "Normas", document: "Documentos", link: "Enlaces", other: "Otros" };

export default function ResourcesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const resources = trpc.resources.list.useQuery({ includeArchived: isAdmin });
  const createLink = trpc.resources.createLink.useMutation({ onSuccess: () => { utils.resources.list.invalidate(); toast.success("Enlace publicado para el equipo."); } });
  const upload = trpc.resources.uploadDocument.useMutation({ onSuccess: () => { utils.resources.list.invalidate(); toast.success("Documento publicado para el equipo."); } });
  const setArchived = trpc.resources.setArchived.useMutation({ onSuccess: () => { utils.resources.list.invalidate(); toast.success("Visibilidad del recurso actualizada."); } });
  const update = trpc.resources.update.useMutation({ onSuccess: () => { utils.resources.list.invalidate(); toast.success("Recurso actualizado."); } });
  const [filter, setFilter] = useState<"all" | Category>("all");
  const [mode, setMode] = useState<"link" | "document" | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("document");
  const [url, setUrl] = useState("");
  const [pinned, setPinned] = useState(false);
  const [sortOrder, setSortOrder] = useState("0");
  const [file, setFile] = useState<File | null>(null);
  const rows = (resources.data ?? []) as ResourceRow[];
  const visible = useMemo(() => rows.filter(item => filter === "all" || item.resource.category === filter), [filter, rows]);
  const reset = () => { setMode(null); setTitle(""); setDescription(""); setCategory("document"); setUrl(""); setPinned(false); setSortOrder("0"); setFile(null); };
  const publishLink = async (event: FormEvent<HTMLFormElement>): Promise<void> => { event.preventDefault(); await createLink.mutateAsync({ title, description: description || null, category, externalUrl: url, isPinned: pinned, sortOrder: Number(sortOrder) || 0 }); reset(); };
  const publishDocument = async (event: FormEvent<HTMLFormElement>): Promise<void> => { event.preventDefault(); if (!file) { toast.error("Selecciona un documento."); return; } const base64 = await readBase64(file); await upload.mutateAsync({ title, description: description || null, category, fileName: file.name, contentType: file.type || "application/pdf", base64, isPinned: pinned, sortOrder: Number(sortOrder) || 0 }); reset(); };

  return <div>
    <PageHeader eyebrow="Información compartida" title="Lo importante, siempre a mano." description="Normas, calendarios, documentos y enlaces de interés accesibles a todos los miembros del equipo." action={isAdmin ? <div className="flex gap-2"><Button variant="outline" onClick={() => setMode("link")} className="rounded-xl"><Link2 className="mr-2 h-4 w-4" />Añadir URL</Button><Button onClick={() => setMode("document")} className="rounded-xl"><Upload className="mr-2 h-4 w-4" />Subir documento</Button></div> : undefined} />
    <section className="mb-6 flex flex-wrap gap-2">{(["all", "calendar", "rules", "document", "link", "other"] as const).map(value => <Button key={value} size="sm" variant={filter === value ? "default" : "outline"} onClick={() => setFilter(value)} className="rounded-xl">{value === "all" ? "Todos" : labels[value]}</Button>)}</section>
    {mode === "link" && isAdmin ? <PublishForm title={title} setTitle={setTitle} description={description} setDescription={setDescription} category={category} setCategory={setCategory} pinned={pinned} setPinned={setPinned} sortOrder={sortOrder} setSortOrder={setSortOrder} onCancel={reset} pending={createLink.isPending} submitLabel="Publicar enlace" onSubmit={publishLink}><div className="space-y-2"><Label>URL de interés</Label><Input value={url} onChange={event => setUrl(event.target.value)} type="url" placeholder="https://…" className="rounded-xl" required /></div></PublishForm> : null}
    {mode === "document" && isAdmin ? <PublishForm title={title} setTitle={setTitle} description={description} setDescription={setDescription} category={category} setCategory={setCategory} pinned={pinned} setPinned={setPinned} sortOrder={sortOrder} setSortOrder={setSortOrder} onCancel={reset} pending={upload.isPending} submitLabel="Subir documento" onSubmit={publishDocument}><div className="space-y-2"><Label>Documento</Label><Input onChange={(event: ChangeEvent<HTMLInputElement>) => setFile(event.target.files?.[0] ?? null)} type="file" accept="application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="rounded-xl" required /><p className="text-xs text-muted-foreground">PDF, DOCX, PNG o JPG · máximo 10 MB.</p></div></PublishForm> : null}
    <section className="grid gap-4 lg:grid-cols-2">{visible.length ? visible.map(item => <ResourceCard key={item.resource.id} item={item} isAdmin={isAdmin} onUpdate={input => update.mutate(input)} onArchive={input => setArchived.mutate(input)} updating={update.isPending} />) : <article className="paper-card col-span-full p-10 text-center"><BookOpen className="mx-auto h-8 w-8 text-muted-foreground" /><h2 className="display-face mt-4 text-2xl">Todavía no hay recursos publicados</h2><p className="mt-2 text-sm text-muted-foreground">Aquí aparecerán normas, calendarios, documentos y enlaces de interés del equipo.</p></article>}</section>
  </div>;
}

function PublishForm({ title, setTitle, description, setDescription, category, setCategory, pinned, setPinned, sortOrder, setSortOrder, onCancel, pending, submitLabel, onSubmit, children }: { title: string; setTitle: (value: string) => void; description: string; setDescription: (value: string) => void; category: Category; setCategory: (value: Category) => void; pinned: boolean; setPinned: (value: boolean) => void; sortOrder: string; setSortOrder: (value: string) => void; onCancel: () => void; pending: boolean; submitLabel: string; onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>; children: ReactNode }) {
  return <form onSubmit={event => { void onSubmit(event); }} className="paper-card mb-6 grid gap-4 p-5 md:grid-cols-3"><div className="grid gap-3"><Input value={title} onChange={event => setTitle(event.target.value)} placeholder="Título del recurso" className="rounded-xl" required /><Textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="Descripción opcional" className="min-h-20 rounded-xl" /><ResourceMeta category={category} setCategory={setCategory} pinned={pinned} setPinned={setPinned} sortOrder={sortOrder} setSortOrder={setSortOrder} /></div>{children}<div className="flex items-end justify-end gap-2"><Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button><Button type="submit" disabled={pending} className="rounded-xl">{submitLabel}</Button></div></form>;
}

function ResourceMeta({ category, setCategory, pinned, setPinned, sortOrder, setSortOrder }: { category: Category; setCategory: (value: Category) => void; pinned: boolean; setPinned: (value: boolean) => void; sortOrder: string; setSortOrder: (value: string) => void }) {
  return <div className="grid grid-cols-3 gap-2"><Select value={category} onValueChange={value => setCategory(value as Category)}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(labels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select><Input value={sortOrder} onChange={event => setSortOrder(event.target.value)} type="number" placeholder="Orden" className="rounded-xl" /><label className="flex items-center gap-2 rounded-xl border border-border px-3 text-xs font-semibold"><input type="checkbox" checked={pinned} onChange={event => setPinned(event.target.checked)} className="h-4 w-4 accent-primary" />Destacar</label></div>;
}

function ResourceCard({ item, isAdmin, onUpdate, onArchive, updating }: { item: ResourceRow; isAdmin: boolean; onUpdate: UpdateResource; onArchive: (input: { id: number; isArchived: boolean }) => void; updating: boolean }) {
  const resource = item.resource;
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(resource.title); const [description, setDescription] = useState(resource.description ?? ""); const [category, setCategory] = useState<Category>(resource.category); const [order, setOrder] = useState(String(resource.sortOrder)); const [pinned, setPinned] = useState(resource.isPinned);
  const save = () => { onUpdate({ id: resource.id, title, description: description || null, category, isPinned: pinned, sortOrder: Number(order) || 0 }); setEditing(false); };
  return <article className={`paper-card flex flex-col p-6 ${resource.isArchived ? "opacity-55" : ""}`}><div className="flex items-start justify-between gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-100 text-sky-700">{resource.kind === "link" ? <Link2 className="h-5 w-5" /> : <FileText className="h-5 w-5" />}</span><div className="flex flex-wrap justify-end gap-2"><Badge variant="secondary">{labels[resource.category]}</Badge>{resource.isPinned ? <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100"><Pin className="mr-1 h-3 w-3" />Destacado</Badge> : null}{resource.isArchived ? <Badge variant="outline">Archivado</Badge> : null}</div></div>{editing ? <div className="mt-5 grid gap-3"><Input value={title} onChange={event => setTitle(event.target.value)} className="rounded-xl" /><Textarea value={description} onChange={event => setDescription(event.target.value)} className="min-h-20 rounded-xl" /><ResourceMeta category={category} setCategory={setCategory} pinned={pinned} setPinned={setPinned} sortOrder={order} setSortOrder={setOrder} /></div> : <><h2 className="display-face mt-5 text-2xl">{resource.title}</h2>{resource.description ? <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{resource.description}</p> : <div className="flex-1" />}{resource.kind === "link" && resource.externalUrl ? <a href={resource.externalUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"><ExternalLink className="h-4 w-4" />Abrir enlace</a> : null}{resource.kind === "document" && resource.fileUrl ? <a href={resource.fileUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"><Paperclip className="h-4 w-4" />{resource.fileName || "Abrir documento"}</a> : null}</>}{isAdmin ? <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">{editing ? <><Button size="sm" onClick={save} disabled={updating} className="rounded-lg">Guardar cambios</Button><Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button></> : <><Button size="sm" variant="outline" onClick={() => setEditing(true)} className="rounded-lg"><Pencil className="mr-1.5 h-3.5 w-3.5" />Editar</Button><Button size="sm" variant="outline" onClick={() => { onUpdate({ id: resource.id, title: resource.title, description: resource.description, category: resource.category, isPinned: resource.isPinned, sortOrder: resource.sortOrder - 1 }); }} className="rounded-lg"><ArrowDownUp className="mr-1.5 h-3.5 w-3.5" />Orden {resource.sortOrder}</Button><Button size="sm" variant="ghost" onClick={() => { onArchive({ id: resource.id, isArchived: !resource.isArchived }); }} className="rounded-lg">{resource.isArchived ? "Reactivar" : <><Archive className="mr-1.5 h-3.5 w-3.5" />Archivar</>}</Button></>}</div> : null}</article>;
}

function readBase64(file: File): Promise<string> { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("No se ha podido leer el archivo.")); reader.readAsDataURL(file); }); }
