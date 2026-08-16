CREATE TABLE `sharedResources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(180) NOT NULL,
	`description` text,
	`category` enum('calendar','rules','document','link','other') NOT NULL DEFAULT 'document',
	`kind` enum('document','link') NOT NULL,
	`externalUrl` varchar(2048),
	`fileName` varchar(255),
	`fileKey` varchar(512),
	`fileUrl` varchar(1024),
	`mimeType` varchar(160),
	`sortOrder` int NOT NULL DEFAULT 0,
	`isPinned` boolean NOT NULL DEFAULT false,
	`isArchived` boolean NOT NULL DEFAULT false,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sharedResources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `sharedResources` ADD CONSTRAINT `sharedResources_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `resource_visibility_index` ON `sharedResources` (`isArchived`,`category`);--> statement-breakpoint
CREATE INDEX `resource_sort_index` ON `sharedResources` (`sortOrder`);