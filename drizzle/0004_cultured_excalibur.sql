PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_channels` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`webhook` text,
	`secret` text,
	`corpId` text,
	`agentId` text,
	`status` text DEFAULT 'active' NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_channels` (`id`, `name`, `type`, `webhook`, `secret`, `corpId`, `agentId`, `status`, `user_id`, `created_at`)
SELECT `id`, `name`, `type`, `webhook`, `secret`, NULL, NULL, `status`, `user_id`, `created_at` FROM `channels`;
--> statement-breakpoint
DROP TABLE `channels`;
--> statement-breakpoint
ALTER TABLE `__new_channels` RENAME TO `channels`;
--> statement-breakpoint
PRAGMA foreign_keys=ON;
--> statement-breakpoint
CREATE INDEX `channels_user_id_idx` ON `channels` (`user_id`);
