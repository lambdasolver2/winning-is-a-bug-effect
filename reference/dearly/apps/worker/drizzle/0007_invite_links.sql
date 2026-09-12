ALTER TABLE `spaces` ADD `viewer_invite_code` text;
--> statement-breakpoint
ALTER TABLE `spaces` ADD `editor_invite_code` text;
--> statement-breakpoint
UPDATE `spaces` SET `viewer_invite_code` = `invite_code`, `editor_invite_code` = substr(hex(randomblob(6)), 1, 11);
--> statement-breakpoint
CREATE UNIQUE INDEX `spaces_viewer_invite_code_unique` ON `spaces` (`viewer_invite_code`);
--> statement-breakpoint
CREATE UNIQUE INDEX `spaces_editor_invite_code_unique` ON `spaces` (`editor_invite_code`);
