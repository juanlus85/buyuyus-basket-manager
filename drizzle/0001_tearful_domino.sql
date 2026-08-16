CREATE TABLE `competitionStandings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`competitionId` int NOT NULL,
	`teamName` varchar(160) NOT NULL,
	`position` int,
	`played` int NOT NULL DEFAULT 0,
	`won` int NOT NULL DEFAULT 0,
	`drawn` int NOT NULL DEFAULT 0,
	`lost` int NOT NULL DEFAULT 0,
	`forfeits` int NOT NULL DEFAULT 0,
	`pointsFor` int NOT NULL DEFAULT 0,
	`pointsAgainst` int NOT NULL DEFAULT 0,
	`points` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `competitionStandings_id` PRIMARY KEY(`id`),
	CONSTRAINT `standing_team_competition_unique` UNIQUE(`competitionId`,`teamName`)
);
--> statement-breakpoint
CREATE TABLE `competitions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`seasonId` int NOT NULL,
	`name` varchar(140) NOT NULL,
	`phase` varchar(80),
	`status` enum('upcoming','active','finished','archived') NOT NULL DEFAULT 'upcoming',
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `competitions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `importJobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('calendar','standing','match_report','financial','other') NOT NULL,
	`sourceKind` enum('image','pdf') NOT NULL,
	`status` enum('uploaded','extracting','ready_for_review','approved','failed','discarded') NOT NULL DEFAULT 'uploaded',
	`originalFilename` varchar(255) NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`fileUrl` varchar(1024) NOT NULL,
	`extractedData` json,
	`extractionNote` text,
	`createdByUserId` int,
	`reviewedByUserId` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `importJobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `matches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`competitionId` int,
	`opponent` varchar(140) NOT NULL,
	`venue` enum('home','away','neutral') NOT NULL DEFAULT 'home',
	`ownScore` int,
	`opponentScore` int,
	`status` enum('scheduled','completed','postponed','cancelled') NOT NULL DEFAULT 'scheduled',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `matches_id` PRIMARY KEY(`id`),
	CONSTRAINT `match_event_unique` UNIQUE(`eventId`)
);
--> statement-breakpoint
CREATE TABLE `playerCharges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`playerId` int NOT NULL,
	`seasonId` int,
	`concept` varchar(180) NOT NULL,
	`amountCents` int NOT NULL,
	`dueAt` timestamp,
	`status` enum('open','cancelled','settled') NOT NULL DEFAULT 'open',
	`notes` text,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `playerCharges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `playerPayments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`playerId` int NOT NULL,
	`chargeId` int,
	`seasonId` int,
	`amountCents` int NOT NULL,
	`paidAt` timestamp NOT NULL,
	`method` enum('cash','bank_transfer','bizum','paypal') NOT NULL,
	`status` enum('pending','confirmed','rejected') NOT NULL DEFAULT 'pending',
	`proofKey` varchar(512),
	`proofUrl` varchar(1024),
	`playerNote` text,
	`adminNote` text,
	`submittedByUserId` int,
	`reviewedByUserId` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `playerPayments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `playerProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`fullName` varchar(160) NOT NULL,
	`shortName` varchar(80),
	`position` varchar(80),
	`jerseyNumber` int,
	`phone` varchar(40),
	`contactEmail` varchar(320),
	`photoKey` varchar(512),
	`photoUrl` varchar(1024),
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`joinedAt` timestamp,
	`leftAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `playerProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `player_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `seasons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(80) NOT NULL,
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp NOT NULL,
	`isCurrent` boolean NOT NULL DEFAULT false,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `seasons_id` PRIMARY KEY(`id`),
	CONSTRAINT `season_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `teamAnnouncements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(180) NOT NULL,
	`content` text NOT NULL,
	`isPinned` boolean NOT NULL DEFAULT false,
	`publishedAt` timestamp NOT NULL DEFAULT (now()),
	`authorUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teamAnnouncements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teamEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`seasonId` int,
	`competitionId` int,
	`type` enum('training','match','general') NOT NULL,
	`title` varchar(180) NOT NULL,
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp,
	`location` varchar(220),
	`description` text,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teamEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teamFinancialCategories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`direction` enum('income','expense') NOT NULL,
	`defaultAmountCents` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teamFinancialCategories_id` PRIMARY KEY(`id`),
	CONSTRAINT `category_name_direction_unique` UNIQUE(`name`,`direction`)
);
--> statement-breakpoint
CREATE TABLE `teamTransactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`seasonId` int,
	`categoryId` int,
	`direction` enum('income','expense') NOT NULL,
	`concept` varchar(180) NOT NULL,
	`amountCents` int NOT NULL,
	`occurredAt` timestamp NOT NULL,
	`notes` text,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teamTransactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `competitionStandings` ADD CONSTRAINT `competitionStandings_competitionId_competitions_id_fk` FOREIGN KEY (`competitionId`) REFERENCES `competitions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `competitions` ADD CONSTRAINT `competitions_seasonId_seasons_id_fk` FOREIGN KEY (`seasonId`) REFERENCES `seasons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `importJobs` ADD CONSTRAINT `importJobs_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `importJobs` ADD CONSTRAINT `importJobs_reviewedByUserId_users_id_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `matches` ADD CONSTRAINT `matches_eventId_teamEvents_id_fk` FOREIGN KEY (`eventId`) REFERENCES `teamEvents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `matches` ADD CONSTRAINT `matches_competitionId_competitions_id_fk` FOREIGN KEY (`competitionId`) REFERENCES `competitions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `playerCharges` ADD CONSTRAINT `playerCharges_playerId_playerProfiles_id_fk` FOREIGN KEY (`playerId`) REFERENCES `playerProfiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `playerCharges` ADD CONSTRAINT `playerCharges_seasonId_seasons_id_fk` FOREIGN KEY (`seasonId`) REFERENCES `seasons`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `playerCharges` ADD CONSTRAINT `playerCharges_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `playerPayments` ADD CONSTRAINT `playerPayments_playerId_playerProfiles_id_fk` FOREIGN KEY (`playerId`) REFERENCES `playerProfiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `playerPayments` ADD CONSTRAINT `playerPayments_chargeId_playerCharges_id_fk` FOREIGN KEY (`chargeId`) REFERENCES `playerCharges`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `playerPayments` ADD CONSTRAINT `playerPayments_seasonId_seasons_id_fk` FOREIGN KEY (`seasonId`) REFERENCES `seasons`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `playerPayments` ADD CONSTRAINT `playerPayments_submittedByUserId_users_id_fk` FOREIGN KEY (`submittedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `playerPayments` ADD CONSTRAINT `playerPayments_reviewedByUserId_users_id_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `playerProfiles` ADD CONSTRAINT `playerProfiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teamAnnouncements` ADD CONSTRAINT `teamAnnouncements_authorUserId_users_id_fk` FOREIGN KEY (`authorUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teamEvents` ADD CONSTRAINT `teamEvents_seasonId_seasons_id_fk` FOREIGN KEY (`seasonId`) REFERENCES `seasons`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teamEvents` ADD CONSTRAINT `teamEvents_competitionId_competitions_id_fk` FOREIGN KEY (`competitionId`) REFERENCES `competitions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teamEvents` ADD CONSTRAINT `teamEvents_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teamTransactions` ADD CONSTRAINT `teamTransactions_seasonId_seasons_id_fk` FOREIGN KEY (`seasonId`) REFERENCES `seasons`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teamTransactions` ADD CONSTRAINT `teamTransactions_categoryId_teamFinancialCategories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `teamFinancialCategories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teamTransactions` ADD CONSTRAINT `teamTransactions_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `competition_season_index` ON `competitions` (`seasonId`);--> statement-breakpoint
CREATE INDEX `import_status_index` ON `importJobs` (`status`);--> statement-breakpoint
CREATE INDEX `import_creator_index` ON `importJobs` (`createdByUserId`);--> statement-breakpoint
CREATE INDEX `match_competition_index` ON `matches` (`competitionId`);--> statement-breakpoint
CREATE INDEX `charge_player_index` ON `playerCharges` (`playerId`);--> statement-breakpoint
CREATE INDEX `charge_season_index` ON `playerCharges` (`seasonId`);--> statement-breakpoint
CREATE INDEX `payment_player_index` ON `playerPayments` (`playerId`);--> statement-breakpoint
CREATE INDEX `payment_status_index` ON `playerPayments` (`status`);--> statement-breakpoint
CREATE INDEX `payment_season_index` ON `playerPayments` (`seasonId`);--> statement-breakpoint
CREATE INDEX `player_status_index` ON `playerProfiles` (`status`);--> statement-breakpoint
CREATE INDEX `announcement_published_index` ON `teamAnnouncements` (`publishedAt`);--> statement-breakpoint
CREATE INDEX `event_start_index` ON `teamEvents` (`startsAt`);--> statement-breakpoint
CREATE INDEX `event_season_index` ON `teamEvents` (`seasonId`);--> statement-breakpoint
CREATE INDEX `transaction_season_index` ON `teamTransactions` (`seasonId`);--> statement-breakpoint
CREATE INDEX `transaction_occurred_index` ON `teamTransactions` (`occurredAt`);