CREATE TABLE `imdSyncConfigs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`seasonId` int NOT NULL,
	`competitionId` int NOT NULL,
	`portalCompetition` varchar(180),
	`teamSearch` varchar(120) NOT NULL DEFAULT 'BUYUYUS',
	`portalTeamId` varchar(80),
	`portalGroup` varchar(80),
	`isActive` boolean NOT NULL DEFAULT true,
	`lastProvisionalAt` timestamp,
	`lastFinalAt` timestamp,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `imdSyncConfigs_id` PRIMARY KEY(`id`),
	CONSTRAINT `imd_config_competition_unique` UNIQUE(`competitionId`)
);
--> statement-breakpoint
CREATE TABLE `imdSyncDrafts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`configId` int NOT NULL,
	`mode` enum('provisional','final') NOT NULL,
	`status` enum('pending','applied','discarded','unchanged','failed') NOT NULL DEFAULT 'pending',
	`sourceUrl` varchar(2048) NOT NULL,
	`portalCompetition` varchar(180),
	`portalTeamId` varchar(80),
	`portalGroup` varchar(80),
	`classificationData` json,
	`resultsData` json,
	`changesData` json,
	`sourceRetrievedAt` timestamp NOT NULL DEFAULT (now()),
	`errorMessage` text,
	`reviewedByUserId` int,
	`reviewedAt` timestamp,
	`appliedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `imdSyncDrafts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `imdSyncConfigs` ADD CONSTRAINT `imdSyncConfigs_seasonId_seasons_id_fk` FOREIGN KEY (`seasonId`) REFERENCES `seasons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `imdSyncConfigs` ADD CONSTRAINT `imdSyncConfigs_competitionId_competitions_id_fk` FOREIGN KEY (`competitionId`) REFERENCES `competitions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `imdSyncConfigs` ADD CONSTRAINT `imdSyncConfigs_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `imdSyncDrafts` ADD CONSTRAINT `imdSyncDrafts_configId_imdSyncConfigs_id_fk` FOREIGN KEY (`configId`) REFERENCES `imdSyncConfigs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `imdSyncDrafts` ADD CONSTRAINT `imdSyncDrafts_reviewedByUserId_users_id_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `imd_config_season_index` ON `imdSyncConfigs` (`seasonId`,`isActive`);--> statement-breakpoint
CREATE INDEX `imd_draft_config_status_index` ON `imdSyncDrafts` (`configId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `imd_draft_retrieved_index` ON `imdSyncDrafts` (`sourceRetrievedAt`);