import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { ImagePlus, UserMinus, UserPlus, UserRoundCheck, Users } from "lucide-react";
import { ChangeEvent, FormEvent, useState } from "react";
import { toast } from "sonner";

type PlayerForm = { fullName: string; shortName: string; position: string; jerseyNumber: string; phone: string; contactEmail: string; notes: string };
type ManagedPlayer = { id: number; fullName: string; shortName: string | null; position: string | null; jerseyNumber: number | null; phone: string | null; contactEmail: string | null; notes: string | null; photoUrl: string | null; status: "active" | "inactive" };
const blankForm: PlayerForm = { fullName: "", shortName: "", position: "", jerseyNumber: "", phone: "", contactEmail: "", notes: "" };

export default function PlayersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const roster = trpc.players.roster.useQuery();
  const adminRoster = trpc.players.adminRoster.useQuery(undefined, { enabled: isAdmin });
  const createPlayer = trpc.players.create.useMutation({ onSuccess: () => { utils.players.roster.invalidate(); toast.success("Jugador añadido a la plantilla."); } });
  const updatePlayer = trpc.players.update.useMutation({ onSuccess: () => { utils.players.roster.invalidate(); toast.success("Ficha actualizada."); } });
  const uploadPhoto = trpc.players.uploadPhoto.useMutation({ onSuccess: () => { utils.players.invalidate(); toast.success("Fotografía actualizada."); } });
  const archive = trpc.players.archive.useMutation({ onSuccess: () => { utils.players.roster.invalidate(); toast.success("Jugador marcado como baja y archivado."); } });
  const restore = trpc.players.restore.useMutation({ onSuccess: () => { utils.players.roster.invalidate(); toast.success("Jugador reactivado."); } });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PlayerForm>(blankForm);

  const openNew = () => { setEditingId(0); setForm(blankForm); };
  const openEdit = (player: ManagedPlayer) => {
    setEditingId(player.id);
    setForm({ fullName: player.fullName, shortName: player.shortName ?? "", position: player.position ?? "", jerseyNumber: player.jerseyNumber?.toString() ?? "", phone: player.phone ?? "", contactEmail: player.contactEmail ?? "", notes: player.notes ?? "" });
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const payload = { fullName: form.fullName, shortName: form.shortName || null, position: form.position || null, jerseyNumber: form.jerseyNumber ? Number(form.jerseyNumber) : null, phone: form.phone || null, contactEmail: form.contactEmail || null, notes: form.notes || null };
    if (editingId && editingId > 0) await updatePlayer.mutateAsync({ id: editingId, ...payload });
    else await createPlayer.mutateAsync(payload);
    setEditingId(null); setForm(blankForm);
  };
  const uploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editingId || editingId <= 0) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) return toast.error("Selecciona una imagen de hasta 5 MB.");
    const base64 = await readBase64(file);
    await uploadPhoto.mutateAsync({ id: editingId, filename: file.name, mimeType: file.type, base64 });
    event.target.value = "";
  };

  const players = (isAdmin ? adminRoster.data : roster.data) as ManagedPlayer[] | undefined;
  const active = players?.filter(player => player.status === "active") ?? [];
  const inactive = players?.filter(player => player.status === "inactive") ?? [];
  return (
    <div>
      <PageHeader eyebrow="Plantilla" title="Personas que hacen equipo." description="Fichas de jugador, datos de contacto y el histórico de altas y bajas del club." action={isAdmin ? <Button onClick={openNew} className="rounded-xl"><UserPlus className="mr-2 h-4 w-4" />Añadir jugador</Button> : undefined} />
      {editingId !== null && isAdmin ? <form onSubmit={submit} className="paper-card mb-7 p-5"><div className="mb-5 flex items-center justify-between"><div><p className="eyebrow">{editingId ? "Editar ficha" : "Nueva ficha"}</p><h2 className="display-face mt-1 text-2xl">Datos del jugador</h2></div><Button type="button" variant="ghost" onClick={() => setEditingId(null)}>Cerrar</Button></div>{editingId > 0 ? <label className="mb-5 flex w-fit items-center gap-2 rounded-xl border border-dashed border-primary/35 bg-accent/30 px-4 py-3 text-sm font-semibold text-primary"><input type="file" accept="image/*" className="sr-only" onChange={uploadImage} /><ImagePlus className="h-4 w-4" />{uploadPhoto.isPending ? "Subiendo fotografía…" : "Subir fotografía"}</label> : <p className="mb-5 text-xs text-muted-foreground">Guarda primero la ficha para añadir una fotografía.</p>}<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Field label="Nombre completo" value={form.fullName} onChange={fullName => setForm({ ...form, fullName })} required /><Field label="Nombre corto" value={form.shortName} onChange={shortName => setForm({ ...form, shortName })} /><Field label="Posición" value={form.position} onChange={position => setForm({ ...form, position })} placeholder="Base, alero…" /><Field label="Dorsal" value={form.jerseyNumber} onChange={jerseyNumber => setForm({ ...form, jerseyNumber })} type="number" /><Field label="Teléfono" value={form.phone} onChange={phone => setForm({ ...form, phone })} /><Field label="Email" value={form.contactEmail} onChange={contactEmail => setForm({ ...form, contactEmail })} type="email" /><div className="md:col-span-2"><Field label="Notas internas" value={form.notes} onChange={notes => setForm({ ...form, notes })} /></div></div><div className="mt-5 flex justify-end"><Button disabled={createPlayer.isPending || updatePlayer.isPending} className="rounded-xl" type="submit">Guardar ficha</Button></div></form> : null}
      <section className="paper-card overflow-hidden"><div className="flex items-center justify-between border-b border-border/70 px-6 py-5"><div><p className="eyebrow">Actual</p><h2 className="display-face mt-1 text-2xl">Plantilla activa</h2></div><Badge className="bg-sky-100 text-sky-800 hover:bg-sky-100">{active.length} jugadores</Badge></div><div className="grid gap-px bg-border/70 sm:grid-cols-2 xl:grid-cols-3">{roster.isLoading || adminRoster.isLoading ? <p className="bg-card p-8 text-sm text-muted-foreground">Cargando plantilla…</p> : active.length ? active.map(player => <PlayerCard key={player.id} player={player} canManage={isAdmin} onEdit={() => openEdit(player)} onArchive={() => archive.mutate({ id: player.id })} onRestore={() => restore.mutate({ id: player.id })} />) : <p className="bg-card p-8 text-sm text-muted-foreground">Aún no hay jugadores activos.</p>}</div></section>
      {inactive.length ? <section className="mt-7 paper-card overflow-hidden"><div className="flex items-center justify-between border-b border-border/70 px-6 py-5"><div><p className="eyebrow">Histórico</p><h2 className="display-face mt-1 text-2xl">Bajas archivadas</h2></div><Badge variant="secondary">{inactive.length} archivados</Badge></div><div className="grid gap-px bg-border/70 sm:grid-cols-2 xl:grid-cols-3">{inactive.map(player => <PlayerCard key={player.id} player={player} canManage={isAdmin} onEdit={() => openEdit(player)} onArchive={() => archive.mutate({ id: player.id })} onRestore={() => restore.mutate({ id: player.id })} />)}</div></section> : null}
    </div>
  );
}

function Field({ label, value, onChange, required, placeholder, type = "text" }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; placeholder?: string; type?: string }) { return <div className="space-y-2"><Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</Label><Input value={value} onChange={event => onChange(event.target.value)} required={required} placeholder={placeholder} type={type} className="rounded-xl bg-background" /></div>; }

function PlayerCard({ player, canManage, onEdit, onArchive, onRestore }: { player: ManagedPlayer; canManage: boolean; onEdit: () => void; onArchive: () => void; onRestore: () => void }) {
  const inactive = player.status === "inactive";
  return <article className={`bg-card p-5 ${inactive ? "opacity-65" : ""}`}><div className="flex items-start justify-between gap-4"><div className="grid h-11 w-11 place-items-center overflow-hidden rounded-2xl bg-sidebar text-lg font-bold text-sidebar-foreground">{player.photoUrl ? <img src={player.photoUrl} alt={`Foto de ${player.fullName}`} className="h-full w-full object-cover" /> : player.jerseyNumber ?? "—"}</div><Badge variant="secondary" className={inactive ? "bg-stone-200 text-stone-700" : "bg-emerald-100 text-emerald-800"}>{inactive ? "Baja" : "Activo"}</Badge></div><h3 className="mt-5 text-base font-bold">{player.fullName}</h3><p className="mt-1 text-sm text-muted-foreground">{player.position || "Posición sin indicar"}</p>{canManage ? <div className="mt-5 flex gap-2"><Button onClick={onEdit} size="sm" variant="outline" className="rounded-lg">Editar</Button>{inactive ? <Button onClick={onRestore} size="sm" variant="ghost" className="rounded-lg text-emerald-700"><UserRoundCheck className="mr-1.5 h-3.5 w-3.5" />Reactivar</Button> : <Button onClick={onArchive} size="sm" variant="ghost" className="rounded-lg text-muted-foreground"><UserMinus className="mr-1.5 h-3.5 w-3.5" />Dar de baja</Button>}</div> : null}</article>;
}
function readBase64(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(reader.error); reader.onload = () => resolve(String(reader.result).split(",")[1] ?? ""); reader.readAsDataURL(file); }); }
