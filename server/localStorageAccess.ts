export type StorageActor = { id: number; role: "admin" | "user"; isActive: boolean };
export type LocalAssetReference =
  | { kind: "shared_document"; isArchived: boolean }
  | { kind: "import_document" }
  | { kind: "player_photo"; playerIsCurrent: boolean }
  | { kind: "payment_proof"; ownerUserId: number | null };

export function canReadLocalAsset(actor: StorageActor, reference: LocalAssetReference) {
  if (!actor.isActive) return false;
  if (actor.role === "admin") return true;
  switch (reference.kind) {
    case "shared_document":
      return !reference.isArchived;
    case "import_document":
      return false;
    case "player_photo":
      return reference.playerIsCurrent;
    case "payment_proof":
      return reference.ownerUserId === actor.id;
  }
}
