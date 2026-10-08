-- Legacy endpoints have no channel configuration or message template.
-- Keep them visible, but inactive, with one disabled placeholder channel per owner.
INSERT INTO `channels` (`id`, `name`, `type`, `webhook`, `secret`, `remark`, `status`, `user_id`, `created_at`)
SELECT 'legacy-' || old.`user_id`, '需重新配置的旧渠道', 'webhook', '', NULL, NULL, 'inactive', old.`user_id`, CURRENT_TIMESTAMP
FROM (SELECT DISTINCT `user_id` FROM `endpoints`) AS old
WHERE NOT EXISTS (
  SELECT 1 FROM `channels` WHERE `channels`.`id` = 'legacy-' || old.`user_id`
);
--> statement-breakpoint
CREATE TABLE `__new_endpoints` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `status` text DEFAULT 'active' NOT NULL,
  `user_id` text NOT NULL,
  `channel_id` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `remark` text,
  `rule` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_endpoints` (`id`, `name`, `status`, `user_id`, `channel_id`, `created_at`, `remark`, `rule`)
SELECT `id`, `name`, 'inactive', `user_id`, 'legacy-' || `user_id`, `created_at`, `description`, '{}'
FROM `endpoints`;
--> statement-breakpoint
DROP TABLE `endpoints`;
--> statement-breakpoint
ALTER TABLE `__new_endpoints` RENAME TO `endpoints`;
--> statement-breakpoint
CREATE INDEX `endpoints_user_id_idx` ON `endpoints` (`user_id`);
--> statement-breakpoint
CREATE INDEX `endpoints_channel_id_idx` ON `endpoints` (`channel_id`);
