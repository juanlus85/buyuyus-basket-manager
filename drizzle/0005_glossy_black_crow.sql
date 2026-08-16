ALTER TABLE `playerProfiles` ADD `dateOfBirth` timestamp;--> statement-breakpoint
ALTER TABLE `playerProfiles` ADD `jerseySize` varchar(16);--> statement-breakpoint
ALTER TABLE `playerProfiles` ADD `dni` varchar(32);--> statement-breakpoint
ALTER TABLE `playerProfiles` ADD `isActiveCurrentSeason` boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX `player_current_season_index` ON `playerProfiles` (`isActiveCurrentSeason`);