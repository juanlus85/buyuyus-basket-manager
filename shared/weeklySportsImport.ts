import { z } from "zod";

const nullableCount = (maximum = 999) => z.number().int().min(0).max(maximum).nullable();

export const weeklySportsStandingSchema = z.object({
  teamName: z.string().trim().min(1).max(160),
  position: z.number().int().min(1).max(999).nullable(),
  played: nullableCount(),
  won: nullableCount(),
  drawn: nullableCount(),
  lost: nullableCount(),
  forfeits: nullableCount(),
  pointsFor: nullableCount(99999),
  pointsAgainst: nullableCount(99999),
  points: nullableCount(9999),
});

export const weeklySportsResultSchema = z.object({
  opponent: z.string().trim().min(1).max(160),
  ownScore: z.number().int().min(0).max(300).nullable(),
  opponentScore: z.number().int().min(0).max(300).nullable(),
  date: z.string().trim().max(100).nullable(),
});

export const weeklySportsDraftSchema = z.object({
  documentSummary: z.string().max(8000),
  standings: z.array(weeklySportsStandingSchema).max(200),
  results: z.array(weeklySportsResultSchema).max(500),
  warnings: z.array(z.string().max(1000)).max(200),
});

export type WeeklySportsDraft = z.infer<typeof weeklySportsDraftSchema>;
export type WeeklySportsStandingDraft = z.infer<typeof weeklySportsStandingSchema>;
export type WeeklySportsResultDraft = z.infer<typeof weeklySportsResultSchema>;
