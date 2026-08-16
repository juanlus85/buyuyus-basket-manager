CREATE TABLE `userInvites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`playerId` int,
	`token` varchar(96) NOT NULL,
	`status` enum('pending','accepted','revoked','expired') NOT NULL DEFAULT 'pending',
	`expiresAt` timestamp NOT NULL,
	`createdByUserId` int,
	`acceptedByUserId` int,
	`acceptedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userInvites_id` PRIMARY KEY(`id`),
	CONSTRAINT `invite_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `userInvites` ADD CONSTRAINT `userInvites_playerId_playerProfiles_id_fk` FOREIGN KEY (`playerId`) REFERENCES `playerProfiles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userInvites` ADD CONSTRAINT `userInvites_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userInvites` ADD CONSTRAINT `userInvites_acceptedByUserId_users_id_fk` FOREIGN KEY (`acceptedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `invite_email_index` ON `userInvites` (`email`);--> statement-breakpoint
CREATE INDEX `invite_status_index` ON `userInvites` (`status`);