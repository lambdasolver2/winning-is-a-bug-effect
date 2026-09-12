UPDATE `spaces` SET `viewer_invite_code` = substr(hex(randomblob(6)), 1, 11) WHERE `viewer_invite_code` IS NULL;--> statement-breakpoint
UPDATE `spaces` SET `editor_invite_code` = substr(hex(randomblob(6)), 1, 11) WHERE `editor_invite_code` IS NULL;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_spaces` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`owner_id` text NOT NULL,
	`viewer_invite_code` text NOT NULL,
	`editor_invite_code` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_spaces`("id", "name", "owner_id", "viewer_invite_code", "editor_invite_code", "created_at") SELECT "id", "name", "owner_id", "viewer_invite_code", "editor_invite_code", "created_at" FROM `spaces`;--> statement-breakpoint
DROP TABLE `spaces`;--> statement-breakpoint
ALTER TABLE `__new_spaces` RENAME TO `spaces`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `spaces_owner_id_unique` ON `spaces` (`owner_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `spaces_viewer_invite_code_unique` ON `spaces` (`viewer_invite_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `spaces_editor_invite_code_unique` ON `spaces` (`editor_invite_code`);
