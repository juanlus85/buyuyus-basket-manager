CREATE TABLE `feeInstallments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`feePlanId` int NOT NULL,
	`label` varchar(120) NOT NULL,
	`amountCents` int NOT NULL,
	`dueAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `feeInstallments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `feePlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`seasonId` int NOT NULL,
	`name` varchar(140) NOT NULL,
	`concept` varchar(180) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`notes` text,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `feePlans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `financeTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`direction` enum('income','expense') NOT NULL,
	`categoryId` int,
	`defaultAccountId` int,
	`defaultConcept` varchar(180) NOT NULL,
	`defaultAmountCents` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`notes` text,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financeTemplates_id` PRIMARY KEY(`id`),
	CONSTRAINT `template_name_direction_unique` UNIQUE(`name`,`direction`)
);
--> statement-breakpoint
CREATE TABLE `teamAccounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`holderName` varchar(160),
	`type` enum('cash','bank','digital') NOT NULL DEFAULT 'cash',
	`openingBalanceCents` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`notes` text,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teamAccounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `account_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
ALTER TABLE `playerCharges` ADD `feeInstallmentId` int;--> statement-breakpoint
ALTER TABLE `playerPayments` ADD `accountId` int;--> statement-breakpoint
ALTER TABLE `playerPayments` ADD `concept` varchar(180);--> statement-breakpoint
ALTER TABLE `teamTransactions` ADD `accountId` int;--> statement-breakpoint
ALTER TABLE `teamTransactions` ADD `templateId` int;--> statement-breakpoint
ALTER TABLE `teamTransactions` ADD `transferKey` varchar(64);--> statement-breakpoint
ALTER TABLE `playerCharges` ADD CONSTRAINT `charge_installment_player_unique` UNIQUE(`playerId`,`feeInstallmentId`);--> statement-breakpoint
ALTER TABLE `feeInstallments` ADD CONSTRAINT `feeInstallments_feePlanId_feePlans_id_fk` FOREIGN KEY (`feePlanId`) REFERENCES `feePlans`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `feePlans` ADD CONSTRAINT `feePlans_seasonId_seasons_id_fk` FOREIGN KEY (`seasonId`) REFERENCES `seasons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `feePlans` ADD CONSTRAINT `feePlans_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `financeTemplates` ADD CONSTRAINT `financeTemplates_categoryId_teamFinancialCategories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `teamFinancialCategories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `financeTemplates` ADD CONSTRAINT `financeTemplates_defaultAccountId_teamAccounts_id_fk` FOREIGN KEY (`defaultAccountId`) REFERENCES `teamAccounts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `financeTemplates` ADD CONSTRAINT `financeTemplates_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teamAccounts` ADD CONSTRAINT `teamAccounts_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `installment_plan_index` ON `feeInstallments` (`feePlanId`);--> statement-breakpoint
CREATE INDEX `installment_due_index` ON `feeInstallments` (`dueAt`);--> statement-breakpoint
CREATE INDEX `fee_plan_season_index` ON `feePlans` (`seasonId`);--> statement-breakpoint
CREATE INDEX `fee_plan_active_index` ON `feePlans` (`isActive`);--> statement-breakpoint
CREATE INDEX `template_active_index` ON `financeTemplates` (`isActive`);--> statement-breakpoint
CREATE INDEX `account_active_index` ON `teamAccounts` (`isActive`);--> statement-breakpoint
ALTER TABLE `playerCharges` ADD CONSTRAINT `playerCharges_feeInstallmentId_feeInstallments_id_fk` FOREIGN KEY (`feeInstallmentId`) REFERENCES `feeInstallments`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `playerPayments` ADD CONSTRAINT `playerPayments_accountId_teamAccounts_id_fk` FOREIGN KEY (`accountId`) REFERENCES `teamAccounts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teamTransactions` ADD CONSTRAINT `teamTransactions_accountId_teamAccounts_id_fk` FOREIGN KEY (`accountId`) REFERENCES `teamAccounts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teamTransactions` ADD CONSTRAINT `teamTransactions_templateId_financeTemplates_id_fk` FOREIGN KEY (`templateId`) REFERENCES `financeTemplates`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `payment_account_index` ON `playerPayments` (`accountId`);--> statement-breakpoint
CREATE INDEX `transaction_account_index` ON `teamTransactions` (`accountId`);