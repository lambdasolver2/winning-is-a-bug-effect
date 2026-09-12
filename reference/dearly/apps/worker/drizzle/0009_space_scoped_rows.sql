INSERT INTO `spaces` (`id`, `name`, `owner_id`, `viewer_invite_code`, `editor_invite_code`, `created_at`)
SELECT
	lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
	'My diary',
	`owners`.`owner_id`,
	substr(hex(randomblob(6)), 1, 11),
	substr(hex(randomblob(6)), 1, 11),
	strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM (
	SELECT `owner_id` FROM `diary_entries`
	UNION SELECT `owner_id` FROM `media_objects`
	UNION SELECT `owner_id` FROM `stickers`
) AS `owners`
WHERE NOT EXISTS (SELECT 1 FROM `spaces` WHERE `spaces`.`owner_id` = `owners`.`owner_id`);--> statement-breakpoint
INSERT INTO `space_members` (`id`, `space_id`, `owner_id`, `role`, `joined_at`)
SELECT lower(hex(randomblob(16))), `spaces`.`id`, `spaces`.`owner_id`, 'owner', `spaces`.`created_at`
FROM `spaces`
WHERE NOT EXISTS (
	SELECT 1 FROM `space_members`
	WHERE `space_members`.`space_id` = `spaces`.`id` AND `space_members`.`owner_id` = `spaces`.`owner_id`
);--> statement-breakpoint
UPDATE `diary_entries` SET `space_id` = (SELECT `spaces`.`id` FROM `spaces` WHERE `spaces`.`owner_id` = `diary_entries`.`owner_id`) WHERE `space_id` IS NULL;--> statement-breakpoint
UPDATE `media_objects` SET `space_id` = (SELECT `spaces`.`id` FROM `spaces` WHERE `spaces`.`owner_id` = `media_objects`.`owner_id`) WHERE `space_id` IS NULL;--> statement-breakpoint
UPDATE `stickers` SET `space_id` = (SELECT `spaces`.`id` FROM `spaces` WHERE `spaces`.`owner_id` = `stickers`.`owner_id`) WHERE `space_id` IS NULL;--> statement-breakpoint
DROP INDEX IF EXISTS `diary_entries_owner_entry_date_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `diary_entries_owner_date_idx`;
