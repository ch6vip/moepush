-- Repair values introduced by SQLite treating unknown quoted column names as strings.
UPDATE `channels` SET `corp_id` = NULL WHERE `corp_id` = 'corpId';
--> statement-breakpoint
UPDATE `channels` SET `agent_id` = NULL WHERE `agent_id` = 'agentId';
--> statement-breakpoint
-- Attribute legacy logs where the endpoint still exists; orphan logs remain NULL.
UPDATE `push_logs`
SET `user_id` = (SELECT `user_id` FROM `endpoints` WHERE `endpoints`.`id` = `push_logs`.`endpoint_id`)
WHERE `user_id` IS NULL
  AND EXISTS (SELECT 1 FROM `endpoints` WHERE `endpoints`.`id` = `push_logs`.`endpoint_id`);
--> statement-breakpoint
CREATE TABLE `registration_rate_limits` (
  `address_hash` text PRIMARY KEY NOT NULL,
  `window_started_at` integer NOT NULL,
  `request_count` integer NOT NULL
);
