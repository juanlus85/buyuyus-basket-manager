ALTER TABLE `teamEvents` ADD `recurrenceSeriesId` varchar(64);--> statement-breakpoint
CREATE INDEX `event_series_index` ON `teamEvents` (`recurrenceSeriesId`,`startsAt`);