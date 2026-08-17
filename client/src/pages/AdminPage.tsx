import { BUILD_INFO } from "@/build-info";
import { AdminOnly } from "@/components/AdminOnly";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { shortDate } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { Clipboard, Link2, Settings, ShieldCheck, Users } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

export default function AdminPage() {
  return <AdminOnly><AdminWorkspace /></AdminOnly>;
}

type UserEditor = { id: number; name: string; email: string };
type CredentialResetTarget = { id: number; name: string; email: string; username: string };

function AdminWorkspace() {
  const utils = trpc.useUtils();
  const users = trpc.userManagement.list.useQuery();
  const unlinked = trpc.userManagement.unlinkedPlayers.useQuery();
  const setRole = trpc.userManagement.setRole.useMutation({ onSuccess: () => { utils.userManagement.list.invalidate(); toast.success("Rol actualizado."); } });
  const setActive = trpc.userManagement.setActive.useMutation({ onSuccess: () => { utils.userManagement.list.invalidate(); toast.success("Estado de acceso actualizado."); } });
  const updateIdentity = trpc.userManagement.updateIdentity.useMutation({ onSuccess: () => { utils.userManagement.list.invalidate(); toast.success("Datos de usuario actualizados."); } });
  const link = trpc.userManagement.linkPlayer.useMutation({ onSuccess: () => { utils.userManagement.invalidate(); toast.success("Ficha vinculada al usuario."); } });
  const invites = trpc.invites.list.useQuery();
  const createInvite = trpc.invites.create.useMutation({ onSuccess: () => { utils.invites.list.invalidate(); toast.success("Invitación creada. Comparte el enlace con el jugador."); } });
  const revokeInvite = trpc.invites.revoke.useMutation({ onSuccess: () => { utils.invites.list.invalidate(); toast.success("Invitación revocada."); } });
  const createLocalUser = trpc.localUsers.create.useMutation({ onSuccess: result => { utils.userManagement.invalidate(); if (result.emailSent) { toast.success(`Usuario creado. SMTP aceptó el correo (${result.delivery?.messageId ?? "sin identificador"}).`); } else { toast.warning("El usuario se ha creado, pero SMTP no confirmó la entrega. Revisa correo no deseado o reenvía las credenciales."); } } });
  const verifySmtp = trpc.localUsers.verifySmtp.useMutation({ onSuccess: result => { if (result.verified) { toast.success("SMTP está configurado y la conexión se ha verificado desde la aplicación."); } else if (!result.configured) { toast.error(`Faltan variables SMTP: ${result.missing.join(", ")}.`); } else { toast.error("SMTP está configurado, pero la aplicación no pudo conectar o autenticarse. Revisa los datos en Plesk."); } } });
  const resetCredentials = trpc.localUsers.resetCredentials.useMutation({ onSuccess: result => { if (result.emailSent) { toast.success(`Credenciales restablecidas. SMTP aceptó el correo (${result.delivery?.messageId ?? "sin identificador"}).`); } else { toast.warning("La contraseña se ha restablecido, pero SMTP no confirmó la entrega. Comparte la contraseña temporal por un canal seguro."); } utils.userManagement.invalidate(); setCredentialResetTarget(null); setResetPassword(""); } });
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [editingUser, setEditingUser] = useState<UserEditor | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePlayer, setInvitePlayer] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [localName, setLocalName] = useState(""); const [localEmail, setLocalEmail] = useState(""); const [localUsername, setLocalUsername] = useState(""); const [localPassword, setLocalPassword] = useState(""); const [localRole, setLocalRole] = useState<"user" | "admin">("user"); const [localPlayer, setLocalPlayer] = useState("");
  const [credentialResetTarget, setCredentialResetTarget] = useState<CredentialResetTarget | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const saveIdentity = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingUser) return;
    await updateIdentity.mutateAsync({ userId: editingUser.id, name: editingUser.name || null, email: editingUser.email || null });
    setEditingUser(null);
  };
  const makeInvite = async (event: FormEvent) => {
    event.preventDefault();
    const result = await createInvite.mutateAsync({ email: inviteEmail, playerId: invitePlayer ? Number(invitePlayer) : null, origin: window.location.origin });
    setInviteUrl(result.inviteUrl);
    setInviteEmail("");
    setInvitePlayer("");
  };
  const createAccount = async (event: FormEvent) => { event.preventDefault(); await createLocalUser.mutateAsync({ name: localName, email: localEmail, username: localUsername.toLowerCase(), password: localPassword, role: localRole, playerId: localPlayer ? Number(localPlayer) : null }); setLocalName(""); setLocalEmail(""); setLocalUsername(""); setLocalPassword(""); setLocalPlayer(""); };
  const resendAccess = async (event: FormEvent) => { event.preventDefault(); if (!credentialResetTarget) return; await resetCredentials.mutateAsync({ id: credentialResetTarget.id, password: resetPassword }); };

  return (
    <div>
      <Dialog open={Boolean(credentialResetTarget)} onOpenChange={open => { if (!open) { setCredentialResetTarget(null); setResetPassword(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reenviar acceso</DialogTitle>
            <DialogDescription>Se sustituirá la contraseña actual por una contraseña temporal y se enviará a {credentialResetTarget?.email}. Confirma esta acción con una nueva contraseña temporal.</DialogDescription>
          </DialogHeader>
          <form onSubmit={resendAccess} className="space-y-4">
            <div className="grid gap-2"><span className="text-sm font-medium">Usuario</span><Input value={credentialResetTarget?.username ?? ""} disabled className="rounded-xl" /></div>
            <div className="grid gap-2"><span className="text-sm font-medium">Contraseña temporal nueva</span><Input value={resetPassword} onChange={event => setResetPassword(event.target.value)} type="password" minLength={10} autoComplete="new-password" placeholder="Mínimo 10 caracteres" required className="rounded-xl" /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => { setCredentialResetTarget(null); setResetPassword(""); }} className="rounded-xl">Cancelar</Button><Button type="submit" disabled={resetCredentials.isPending || resetPassword.length < 10} className="rounded-xl">{resetCredentials.isPending ? "Restableciendo…" : "Restablecer y enviar"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
      <PageHeader eyebrow="Administración" title="La estructura del equipo." description="Gestiona los accesos de usuarios y vincula las fichas de jugador a sus cuentas de acceso." />
      <form onSubmit={createAccount} className="paper-card mb-6 p-6"><p className="eyebrow">Alta directa</p><h2 className="display-face mt-1 text-3xl">Crear usuario y enviar acceso</h2><p className="mt-2 text-sm text-muted-foreground">Se crea un usuario local, se vincula a una ficha opcional y se envían sus credenciales temporales por correo SMTP.</p><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6"><Input value={localName} onChange={event => setLocalName(event.target.value)} placeholder="Nombre completo" required className="rounded-xl" /><Input value={localEmail} onChange={event => setLocalEmail(event.target.value)} type="email" placeholder="correo@ejemplo.com" required className="rounded-xl" /><Input value={localUsername} onChange={event => setLocalUsername(event.target.value)} placeholder="Usuario" required className="rounded-xl" /><Input value={localPassword} onChange={event => setLocalPassword(event.target.value)} type="password" placeholder="Contraseña temporal" minLength={10} required className="rounded-xl" /><Select value={localRole} onValueChange={value => setLocalRole(value as "user" | "admin")}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="user">Jugador</SelectItem><SelectItem value="admin">Administrador</SelectItem></SelectContent></Select><Select value={localPlayer || "none"} onValueChange={value => setLocalPlayer(value === "none" ? "" : value)}><SelectTrigger className="rounded-xl"><SelectValue placeholder="Ficha opcional" /></SelectTrigger><SelectContent><SelectItem value="none">Sin ficha</SelectItem>{unlinked.data?.map(player => <SelectItem key={player.id} value={String(player.id)}>{player.fullName}</SelectItem>)}</SelectContent></Select></div><div className="mt-4 flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={verifySmtp.isPending} onClick={() => verifySmtp.mutate()} className="rounded-xl">{verifySmtp.isPending ? "Comprobando SMTP…" : "Comprobar SMTP"}</Button><Button type="submit" disabled={createLocalUser.isPending} className="rounded-xl">{createLocalUser.isPending ? "Creando y enviando…" : "Crear y enviar credenciales"}</Button></div></form>
      {editingUser ? <form onSubmit={saveIdentity} className="paper-card mb-6 grid gap-4 p-5 md:grid-cols-[1fr_1fr_auto]"><Input value={editingUser.name} onChange={event => setEditingUser({ ...editingUser, name: event.target.value })} placeholder="Nombre de usuario" className="rounded-xl" /><Input value={editingUser.email} onChange={event => setEditingUser({ ...editingUser, email: event.target.value })} placeholder="Correo de usuario" type="email" className="rounded-xl" /><div className="flex gap-2"><Button type="button" variant="ghost" onClick={() => setEditingUser(null)} className="rounded-xl">Cancelar</Button><Button type="submit" className="rounded-xl">Guardar datos</Button></div></form> : null}
      <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <article className="paper-card overflow-hidden">
          <div className="border-b border-border/70 px-6 py-5"><p className="eyebrow">Usuarios</p><h2 className="display-face mt-1 text-2xl">Accesos y roles</h2></div>
          <div className="divide-y divide-border/70">
            {users.data?.length ? users.data.map(item => <div key={item.id} className={`flex flex-wrap items-center justify-between gap-3 px-6 py-4 ${item.isActive ? "" : "bg-stone-100/60 opacity-70"}`}>
              <div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{item.name || item.email || "Usuario sin nombre"}</p><Badge className={item.role === "admin" ? "bg-violet-100 text-violet-800 hover:bg-violet-100" : "bg-sky-100 text-sky-800 hover:bg-sky-100"}>{item.role === "admin" ? "Administrador" : "Jugador"}</Badge><Badge variant="secondary">{item.isActive ? "Activo" : "Baja"}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{item.username ? `Usuario: ${item.username} · ` : ""}{item.playerName ? `Ficha: ${item.playerName}` : "Sin ficha vinculada"} · Último acceso {shortDate(item.lastSignedIn)}</p></div>
              <div className="flex flex-wrap items-center gap-2"><Select value={item.role} onValueChange={value => setRole.mutate({ userId: item.id, role: value as "admin" | "user" })}><SelectTrigger className="w-36 rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="user">Jugador</SelectItem><SelectItem value="admin">Administrador</SelectItem></SelectContent></Select><Button onClick={() => setEditingUser({ id: item.id, name: item.name ?? "", email: item.email ?? "" })} variant="outline" size="sm" className="rounded-lg">Editar</Button>{item.username && item.email ? <Button onClick={() => setCredentialResetTarget({ id: item.id, name: item.name ?? item.username!, email: item.email!, username: item.username! })} variant="outline" size="sm" className="rounded-lg">Reenviar acceso</Button> : null}<Button onClick={() => setActive.mutate({ userId: item.id, isActive: !item.isActive })} variant="ghost" size="sm" className="rounded-lg">{item.isActive ? "Dar de baja" : "Reactivar"}</Button></div>
            </div>) : <p className="p-7 text-sm text-muted-foreground">Los usuarios aparecen cuando inician sesión por primera vez; crea antes su ficha de jugador y vincúlala aquí.</p>}
          </div>
        </article>
        <article className="paper-card p-6"><span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-100 text-sky-700"><Link2 className="h-5 w-5" /></span><p className="eyebrow mt-5">Asignación</p><h2 className="display-face mt-1 text-3xl">Vincular ficha</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Asocia una cuenta de acceso a una ficha existente para que ese jugador vea su información privada.</p><div className="mt-6 space-y-3"><Select value={selectedUser} onValueChange={setSelectedUser}><SelectTrigger className="rounded-xl"><SelectValue placeholder="Elegir usuario" /></SelectTrigger><SelectContent>{users.data?.filter(item => !item.playerId && item.isActive).map(item => <SelectItem key={item.id} value={String(item.id)}>{item.name || item.email || `Usuario ${item.id}`}</SelectItem>)}</SelectContent></Select><Select value={selectedPlayer} onValueChange={setSelectedPlayer}><SelectTrigger className="rounded-xl"><SelectValue placeholder="Elegir ficha de jugador" /></SelectTrigger><SelectContent>{unlinked.data?.map(player => <SelectItem key={player.id} value={String(player.id)}>{player.fullName}</SelectItem>)}</SelectContent></Select><Button disabled={!selectedUser || !selectedPlayer || link.isPending} onClick={() => link.mutate({ userId: Number(selectedUser), playerId: Number(selectedPlayer) })} className="w-full rounded-xl">Vincular acceso</Button></div></article>
      </section>
      <section className="mt-7 grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
        <form onSubmit={makeInvite} className="paper-card p-6"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 text-violet-700"><Users className="h-5 w-5" /></span><p className="eyebrow mt-5">Alta de usuario</p><h2 className="display-face mt-1 text-3xl">Invitar al equipo</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Crea un enlace personal con caducidad de 14 días. El jugador deberá iniciar sesión con el correo invitado.</p><div className="mt-5 space-y-3"><Input value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} type="email" placeholder="correo@ejemplo.com" required className="rounded-xl" /><Select value={invitePlayer || "none"} onValueChange={value => setInvitePlayer(value === "none" ? "" : value)}><SelectTrigger className="rounded-xl"><SelectValue placeholder="Ficha de jugador opcional" /></SelectTrigger><SelectContent><SelectItem value="none">Sin ficha previa</SelectItem>{unlinked.data?.map(player => <SelectItem key={player.id} value={String(player.id)}>{player.fullName}</SelectItem>)}</SelectContent></Select><Button type="submit" disabled={createInvite.isPending} className="w-full rounded-xl">Crear invitación</Button></div>{inviteUrl ? <div className="mt-5 rounded-xl bg-secondary p-3"><p className="break-all text-xs leading-5 text-muted-foreground">{inviteUrl}</p><Button type="button" onClick={() => navigator.clipboard.writeText(inviteUrl).then(() => toast.success("Enlace copiado."))} size="sm" variant="outline" className="mt-3 rounded-lg"><Clipboard className="mr-1.5 h-3.5 w-3.5" />Copiar enlace</Button></div> : null}</form>
        <article className="paper-card overflow-hidden"><div className="border-b border-border/70 px-6 py-5"><p className="eyebrow">Seguimiento</p><h2 className="display-face mt-1 text-2xl">Invitaciones emitidas</h2></div><div className="divide-y divide-border/70">{invites.data?.length ? invites.data.map(item => <div key={item.invite.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"><div><p className="font-semibold">{item.invite.email}</p><p className="mt-1 text-xs text-muted-foreground">{item.playerName ? `Ficha: ${item.playerName}` : "Sin ficha asignada"} · caduca {shortDate(item.invite.expiresAt)}</p></div><div className="flex items-center gap-2"><Badge variant="secondary">{item.invite.status === "pending" ? "Pendiente" : item.invite.status === "accepted" ? "Aceptada" : item.invite.status === "revoked" ? "Revocada" : "Caducada"}</Badge>{item.invite.status === "pending" ? <Button onClick={() => revokeInvite.mutate({ id: item.invite.id })} size="sm" variant="ghost" className="rounded-lg text-rose-700">Revocar</Button> : null}</div></div>) : <p className="p-7 text-sm text-muted-foreground">Aún no se han emitido invitaciones.</p>}</div></article>
      </section>
      <section className="mt-7 grid gap-4 md:grid-cols-3"><InfoCard icon={<Users className="h-5 w-5" />} title="Usuarios activos" value={String(users.data?.filter(item => item.isActive).length ?? 0)} /><InfoCard icon={<ShieldCheck className="h-5 w-5" />} title="Administradores" value={String(users.data?.filter(item => item.role === "admin" && item.isActive).length ?? 0)} /><InfoCard icon={<Settings className="h-5 w-5" />} title="Configuración" value={BUILD_INFO.version} note={`Compilado ${new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(new Date(BUILD_INFO.builtAt))}`} /></section>
    </div>
  );
}

function InfoCard({ icon, title, value, note }: { icon: React.ReactNode; title: string; value: string; note?: string }) {
  return <article className="paper-card p-5"><span className="text-primary">{icon}</span><p className="eyebrow mt-5">{title}</p><p className="mt-2 text-2xl font-bold">{value}</p>{note ? <p className="mt-2 text-xs text-muted-foreground">{note}</p> : null}</article>;
}
