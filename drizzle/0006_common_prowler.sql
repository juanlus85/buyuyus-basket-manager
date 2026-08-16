CREATE TABLE `eventAttendances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`userId` int NOT NULL,
	`status` enum('going','not_going','maybe') NOT NULL,
	`note` varchar(400),
	`respondedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eventAttendances_id` PRIMARY KEY(`id`),
	CONSTRAINT `attendance_event_user_unique` UNIQUE(`eventId`,`userId`)
);
--> statement-breakpoint
ALTER TABLE `teamEvents` ADD `callAt` timestamp;--> statement-breakpoint
ALTER TABLE `teamEvents` ADD `attendanceEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `username` varchar(80);--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `mustChangePassword` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_username_unique` UNIQUE(`username`);--> statement-breakpoint
ALTER TABLE `eventAttendances` ADD CONSTRAINT `eventAttendances_eventId_teamEvents_id_fk` FOREIGN KEY (`eventId`) REFERENCES `teamEvents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eventAttendances` ADD CONSTRAINT `eventAttendances_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `attendance_event_index` ON `eventAttendances` (`eventId`);--> statement-breakpoint
CREATE INDEX `attendance_user_index` ON `eventAttendances` (`userId`);