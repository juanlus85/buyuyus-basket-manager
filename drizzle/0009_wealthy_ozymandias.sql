CREATE TABLE `playerMatchStats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`matchId` int NOT NULL,
	`playerId` int NOT NULL,
	`played` boolean NOT NULL DEFAULT true,
	`fouls` int NOT NULL DEFAULT 0,
	`technicalFouls` int NOT NULL DEFAULT 0,
	`unsportsmanlikeFouls` int NOT NULL DEFAULT 0,
	`sourceImportId` int,
	`confirmedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `playerMatchStats_id` PRIMARY KEY(`id`),
	CONSTRAINT `match_player_stat_unique` UNIQUE(`matchId`,`playerId`)
);
--> statement-breakpoint
ALTER TABLE `playerMatchStats` ADD CONSTRAINT `playerMatchStats_matchId_matches_id_fk` FOREIGN KEY (`matchId`) REFERENCES `matches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `playerMatchStats` ADD CONSTRAINT `playerMatchStats_playerId_playerProfiles_id_fk` FOREIGN KEY (`playerId`) REFERENCES `playerProfiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `playerMatchStats` ADD CONSTRAINT `playerMatchStats_sourceImportId_importJobs_id_fk` FOREIGN KEY (`sourceImportId`) REFERENCES `importJobs`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `playerMatchStats` ADD CONSTRAINT `playerMatchStats_confirmedByUserId_users_id_fk` FOREIGN KEY (`confirmedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `player_match_stat_player_index` ON `playerMatchStats` (`playerId`);