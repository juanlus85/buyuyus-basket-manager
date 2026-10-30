import { describe, expect, it } from "vitest";
import { canReadLocalAsset } from "./localStorageAccess";

const player = { id: 7, role: "user" as const, isActive: true };
const inactiveUser = { ...player, isActive: false };
const admin = { id: 1, role: "admin" as const, isActive: true };

describe("local file access policy", () => {
  it("allows team members to read active shared documents, not archived ones or private imports", () => {
    expect(canReadLocalAsset(player, { kind: "shared_document", isArchived: false })).toBe(true);
    expect(canReadLocalAsset(player, { kind: "shared_document", isArchived: true })).toBe(false);
    expect(canReadLocalAsset(player, { kind: "import_document" })).toBe(false);
  });

  it("allows current player photos to members but old profile photos only to administrators", () => {
    expect(canReadLocalAsset(player, { kind: "player_photo", playerIsCurrent: true })).toBe(true);
    expect(canReadLocalAsset(player, { kind: "player_photo", playerIsCurrent: false })).toBe(false);
    expect(canReadLocalAsset(admin, { kind: "player_photo", playerIsCurrent: false })).toBe(true);
  });

  it("keeps payment proofs owner-only and denies every file to inactive users", () => {
    expect(canReadLocalAsset(player, { kind: "payment_proof", ownerUserId: player.id })).toBe(true);
    expect(canReadLocalAsset(player, { kind: "payment_proof", ownerUserId: 9 })).toBe(false);
    expect(canReadLocalAsset(inactiveUser, { kind: "shared_document", isArchived: false })).toBe(false);
    expect(canReadLocalAsset(admin, { kind: "import_document" })).toBe(true);
  });
});
