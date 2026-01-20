ALTER TABLE `push_logs` ADD `user_id` text;
--> statement-breakpoint
CREATE INDEX `push_logs_user_id_idx` ON `push_logs` (`user_id`);

