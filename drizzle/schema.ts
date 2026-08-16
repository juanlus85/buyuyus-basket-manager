import {
  boolean,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core identities provided by the authentication flow. The `role` field gates
 * management capabilities while the player profile holds sports-specific data.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const playerProfiles = mysqlTable(
  "playerProfiles",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").references(() => users.id, { onDelete: "set null" }),
    fullName: varchar("fullName", { length: 160 }).notNull(),
    shortName: varchar("shortName", { length: 80 }),
    position: varchar("position", { length: 80 }),
    jerseyNumber: int("jerseyNumber"),
    dateOfBirth: timestamp("dateOfBirth"),
    jerseySize: varchar("jerseySize", { length: 16 }),
    dni: varchar("dni", { length: 32 }),
    phone: varchar("phone", { length: 40 }),
    contactEmail: varchar("contactEmail", { length: 320 }),
    photoKey: varchar("photoKey", { length: 512 }),
    photoUrl: varchar("photoUrl", { length: 1024 }),
    status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
    isActiveCurrentSeason: boolean("isActiveCurrentSeason").default(true).notNull(),
    joinedAt: timestamp("joinedAt"),
    leftAt: timestamp("leftAt"),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    playerUserUnique: uniqueIndex("player_user_unique").on(table.userId),
    playerStatusIndex: index("player_status_index").on(table.status),
    playerCurrentSeasonIndex: index("player_current_season_index").on(table.isActiveCurrentSeason),
  })
);

export const userInvites = mysqlTable(
  "userInvites",
  {
    id: int("id").autoincrement().primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
    playerId: int("playerId").references(() => playerProfiles.id, { onDelete: "set null" }),
    token: varchar("token", { length: 96 }).notNull(),
    status: mysqlEnum("status", ["pending", "accepted", "revoked", "expired"]).default("pending").notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdByUserId: int("createdByUserId").references(() => users.id, { onDelete: "set null" }),
    acceptedByUserId: int("acceptedByUserId").references(() => users.id, { onDelete: "set null" }),
    acceptedAt: timestamp("acceptedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    inviteTokenUnique: uniqueIndex("invite_token_unique").on(table.token),
    inviteEmailIndex: index("invite_email_index").on(table.email),
    inviteStatusIndex: index("invite_status_index").on(table.status),
  })
);

export const seasons = mysqlTable(
  "seasons",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 80 }).notNull(),
    startsAt: timestamp("startsAt").notNull(),
    endsAt: timestamp("endsAt").notNull(),
    isCurrent: boolean("isCurrent").default(false).notNull(),
    description: text("description"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ seasonNameUnique: uniqueIndex("season_name_unique").on(table.name) })
);

export const competitions = mysqlTable(
  "competitions",
  {
    id: int("id").autoincrement().primaryKey(),
    seasonId: int("seasonId").notNull().references(() => seasons.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 140 }).notNull(),
    phase: varchar("phase", { length: 80 }),
    status: mysqlEnum("status", ["upcoming", "active", "finished", "archived"]).default("upcoming").notNull(),
    description: text("description"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ competitionSeasonIndex: index("competition_season_index").on(table.seasonId) })
);

export const teamFinancialCategories = mysqlTable(
  "teamFinancialCategories",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    direction: mysqlEnum("direction", ["income", "expense"]).notNull(),
    defaultAmountCents: int("defaultAmountCents"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ categoryNameDirectionUnique: uniqueIndex("category_name_direction_unique").on(table.name, table.direction) })
);

/** Cash boxes and accounts held by team administrators or payment providers. */
export const teamAccounts = mysqlTable(
  "teamAccounts",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    holderName: varchar("holderName", { length: 160 }),
    type: mysqlEnum("type", ["cash", "bank", "digital"]).default("cash").notNull(),
    openingBalanceCents: int("openingBalanceCents").default(0).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    notes: text("notes"),
    createdByUserId: int("createdByUserId").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ accountNameUnique: uniqueIndex("account_name_unique").on(table.name), accountActiveIndex: index("account_active_index").on(table.isActive) })
);

/** Reusable presets such as league registration, court rental or sponsorship income. */
export const financeTemplates = mysqlTable(
  "financeTemplates",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    direction: mysqlEnum("direction", ["income", "expense"]).notNull(),
    categoryId: int("categoryId").references(() => teamFinancialCategories.id, { onDelete: "set null" }),
    defaultAccountId: int("defaultAccountId").references(() => teamAccounts.id, { onDelete: "set null" }),
    defaultConcept: varchar("defaultConcept", { length: 180 }).notNull(),
    defaultAmountCents: int("defaultAmountCents"),
    isActive: boolean("isActive").default(true).notNull(),
    notes: text("notes"),
    createdByUserId: int("createdByUserId").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ templateNameDirectionUnique: uniqueIndex("template_name_direction_unique").on(table.name, table.direction), templateActiveIndex: index("template_active_index").on(table.isActive) })
);

/** General team income and expenses. Player payments are recorded separately for a confirmable workflow. */
export const teamTransactions = mysqlTable(
  "teamTransactions",
  {
    id: int("id").autoincrement().primaryKey(),
    seasonId: int("seasonId").references(() => seasons.id, { onDelete: "set null" }),
    categoryId: int("categoryId").references(() => teamFinancialCategories.id, { onDelete: "set null" }),
    accountId: int("accountId").references(() => teamAccounts.id, { onDelete: "set null" }),
    templateId: int("templateId").references(() => financeTemplates.id, { onDelete: "set null" }),
    transferKey: varchar("transferKey", { length: 64 }),
    direction: mysqlEnum("direction", ["income", "expense"]).notNull(),
    concept: varchar("concept", { length: 180 }).notNull(),
    amountCents: int("amountCents").notNull(),
    occurredAt: timestamp("occurredAt").notNull(),
    notes: text("notes"),
    createdByUserId: int("createdByUserId").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    transactionSeasonIndex: index("transaction_season_index").on(table.seasonId),
    transactionAccountIndex: index("transaction_account_index").on(table.accountId),
    transactionOccurredIndex: index("transaction_occurred_index").on(table.occurredAt),
  })
);

/** A recurring obligation, composed of one or more scheduled installments. */
export const feePlans = mysqlTable(
  "feePlans",
  {
    id: int("id").autoincrement().primaryKey(),
    seasonId: int("seasonId").notNull().references(() => seasons.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 140 }).notNull(),
    concept: varchar("concept", { length: 180 }).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    notes: text("notes"),
    createdByUserId: int("createdByUserId").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ feePlanSeasonIndex: index("fee_plan_season_index").on(table.seasonId), feePlanActiveIndex: index("fee_plan_active_index").on(table.isActive) })
);

export const feeInstallments = mysqlTable(
  "feeInstallments",
  {
    id: int("id").autoincrement().primaryKey(),
    feePlanId: int("feePlanId").notNull().references(() => feePlans.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 120 }).notNull(),
    amountCents: int("amountCents").notNull(),
    dueAt: timestamp("dueAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ installmentPlanIndex: index("installment_plan_index").on(table.feePlanId), installmentDueIndex: index("installment_due_index").on(table.dueAt) })
);

/** Charges represent amounts owed by a specific player, independently of payment submission. */
export const playerCharges = mysqlTable(
  "playerCharges",
  {
    id: int("id").autoincrement().primaryKey(),
    playerId: int("playerId").notNull().references(() => playerProfiles.id, { onDelete: "cascade" }),
    seasonId: int("seasonId").references(() => seasons.id, { onDelete: "set null" }),
    feeInstallmentId: int("feeInstallmentId").references(() => feeInstallments.id, { onDelete: "set null" }),
    concept: varchar("concept", { length: 180 }).notNull(),
    amountCents: int("amountCents").notNull(),
    dueAt: timestamp("dueAt"),
    status: mysqlEnum("status", ["open", "cancelled", "settled"]).default("open").notNull(),
    notes: text("notes"),
    createdByUserId: int("createdByUserId").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    chargePlayerIndex: index("charge_player_index").on(table.playerId),
    chargeInstallmentPlayerUnique: uniqueIndex("charge_installment_player_unique").on(table.playerId, table.feeInstallmentId),
    chargeSeasonIndex: index("charge_season_index").on(table.seasonId),
  })
);

/** Submitted player payments never affect balances until they are confirmed by an administrator. */
export const playerPayments = mysqlTable(
  "playerPayments",
  {
    id: int("id").autoincrement().primaryKey(),
    playerId: int("playerId").notNull().references(() => playerProfiles.id, { onDelete: "cascade" }),
    chargeId: int("chargeId").references(() => playerCharges.id, { onDelete: "set null" }),
    seasonId: int("seasonId").references(() => seasons.id, { onDelete: "set null" }),
    accountId: int("accountId").references(() => teamAccounts.id, { onDelete: "set null" }),
    concept: varchar("concept", { length: 180 }),
    amountCents: int("amountCents").notNull(),
    paidAt: timestamp("paidAt").notNull(),
    method: mysqlEnum("method", ["cash", "bank_transfer", "bizum", "paypal"]).notNull(),
    status: mysqlEnum("status", ["pending", "confirmed", "rejected"]).default("pending").notNull(),
    proofKey: varchar("proofKey", { length: 512 }),
    proofUrl: varchar("proofUrl", { length: 1024 }),
    playerNote: text("playerNote"),
    adminNote: text("adminNote"),
    submittedByUserId: int("submittedByUserId").references(() => users.id, { onDelete: "set null" }),
    reviewedByUserId: int("reviewedByUserId").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    paymentPlayerIndex: index("payment_player_index").on(table.playerId),
    paymentAccountIndex: index("payment_account_index").on(table.accountId),
    paymentStatusIndex: index("payment_status_index").on(table.status),
    paymentSeasonIndex: index("payment_season_index").on(table.seasonId),
  })
);

export const teamEvents = mysqlTable(
  "teamEvents",
  {
    id: int("id").autoincrement().primaryKey(),
    seasonId: int("seasonId").references(() => seasons.id, { onDelete: "set null" }),
    competitionId: int("competitionId").references(() => competitions.id, { onDelete: "set null" }),
    type: mysqlEnum("type", ["training", "match", "general"]).notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    startsAt: timestamp("startsAt").notNull(),
    endsAt: timestamp("endsAt"),
    location: varchar("location", { length: 220 }),
    description: text("description"),
    createdByUserId: int("createdByUserId").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    eventStartIndex: index("event_start_index").on(table.startsAt),
    eventSeasonIndex: index("event_season_index").on(table.seasonId),
  })
);

export const matches = mysqlTable(
  "matches",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId").notNull().references(() => teamEvents.id, { onDelete: "cascade" }),
    competitionId: int("competitionId").references(() => competitions.id, { onDelete: "set null" }),
    opponent: varchar("opponent", { length: 140 }).notNull(),
    venue: mysqlEnum("venue", ["home", "away", "neutral"]).default("home").notNull(),
    ownScore: int("ownScore"),
    opponentScore: int("opponentScore"),
    status: mysqlEnum("status", ["scheduled", "completed", "postponed", "cancelled"]).default("scheduled").notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    matchEventUnique: uniqueIndex("match_event_unique").on(table.eventId),
    matchCompetitionIndex: index("match_competition_index").on(table.competitionId),
  })
);

export const competitionStandings = mysqlTable(
  "competitionStandings",
  {
    id: int("id").autoincrement().primaryKey(),
    competitionId: int("competitionId").notNull().references(() => competitions.id, { onDelete: "cascade" }),
    teamName: varchar("teamName", { length: 160 }).notNull(),
    position: int("position"),
    played: int("played").default(0).notNull(),
    won: int("won").default(0).notNull(),
    drawn: int("drawn").default(0).notNull(),
    lost: int("lost").default(0).notNull(),
    forfeits: int("forfeits").default(0).notNull(),
    pointsFor: int("pointsFor").default(0).notNull(),
    pointsAgainst: int("pointsAgainst").default(0).notNull(),
    points: int("points").default(0).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    standingTeamCompetitionUnique: uniqueIndex("standing_team_competition_unique").on(table.competitionId, table.teamName),
  })
);

export const teamAnnouncements = mysqlTable(
  "teamAnnouncements",
  {
    id: int("id").autoincrement().primaryKey(),
    title: varchar("title", { length: 180 }).notNull(),
    content: text("content").notNull(),
    isPinned: boolean("isPinned").default(false).notNull(),
    publishedAt: timestamp("publishedAt").defaultNow().notNull(),
    authorUserId: int("authorUserId").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ announcementPublishedIndex: index("announcement_published_index").on(table.publishedAt) })
);

/** Stored input and extraction result. Data is always reviewed before it creates records. */
export const importJobs = mysqlTable(
  "importJobs",
  {
    id: int("id").autoincrement().primaryKey(),
    type: mysqlEnum("type", ["calendar", "standing", "match_report", "financial", "other"]).notNull(),
    sourceKind: mysqlEnum("sourceKind", ["image", "pdf"]).notNull(),
    status: mysqlEnum("status", ["uploaded", "extracting", "ready_for_review", "approved", "failed", "discarded"]).default("uploaded").notNull(),
    originalFilename: varchar("originalFilename", { length: 255 }).notNull(),
    fileKey: varchar("fileKey", { length: 512 }).notNull(),
    fileUrl: varchar("fileUrl", { length: 1024 }).notNull(),
    extractedData: json("extractedData"),
    extractionNote: text("extractionNote"),
    createdByUserId: int("createdByUserId").references(() => users.id, { onDelete: "set null" }),
    reviewedByUserId: int("reviewedByUserId").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    importStatusIndex: index("import_status_index").on(table.status),
    importCreatorIndex: index("import_creator_index").on(table.createdByUserId),
  })
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type PlayerProfile = typeof playerProfiles.$inferSelect;
export type Season = typeof seasons.$inferSelect;
export type Competition = typeof competitions.$inferSelect;
export type TeamEvent = typeof teamEvents.$inferSelect;
export type PlayerPayment = typeof playerPayments.$inferSelect;
