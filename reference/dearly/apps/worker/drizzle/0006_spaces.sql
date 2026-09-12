CREATE TABLE `spaces` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `owner_id` text NOT NULL UNIQUE,
  `invite_code` text NOT NULL UNIQUE,
  `invite_role` text DEFAULT 'viewer' NOT NULL,
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `space_members` (
  `id` text PRIMARY KEY NOT NULL,
  `space_id` text NOT NULL REFERENCES `spaces`(`id`) ON DELETE CASCADE,
  `owner_id` text NOT NULL,
  `role` text NOT NULL,
  `joined_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `space_members_space_owner_idx` ON `space_members` (`space_id`,`owner_id`);
--> statement-breakpoint
ALTER TABLE `media_objects` ADD `space_id` text;
--> statement-breakpoint
ALTER TABLE `stickers` ADD `space_id` text;
--> statement-breakpoint
ALTER TABLE `diary_entries` ADD `space_id` text;
--> statement-breakpoint
CREATE INDEX `media_objects_space_id_idx` ON `media_objects` (`space_id`);
--> statement-breakpoint
CREATE INDEX `stickers_space_id_idx` ON `stickers` (`space_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `diary_entries_space_date_idx` ON `diary_entries` (`space_id`,`entry_date`);
