export type RosterIdentity = { id: number; fullName: string; jerseyNumber: number | null };

export function normalizedPlayerName(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").match(/[a-z]+/g)?.sort().join(" ") ?? "";
}

/** Dorsales pueden cambiar o duplicarse. Solo proponemos coincidencias inequívocas por nombre completo. */
export function suggestReportPlayer(playerName: string, roster: RosterIdentity[]) {
  const normalized = normalizedPlayerName(playerName);
  if (!normalized) return null;
  const candidates = roster.filter(player => normalizedPlayerName(player.fullName) === normalized);
  return candidates.length === 1 ? candidates[0].id : null;
}

export function reviewInteger(value: string, maximum: number) {
  if (!/^\d+$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 && number <= maximum ? number : null;
}
