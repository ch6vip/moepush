ALTER TABLE `endpoints` ADD `timeout_ms` integer DEFAULT 8000 NOT NULL;
--> statement-breakpoint
ALTER TABLE `endpoints` ADD `retry_count` integer DEFAULT 3 NOT NULL;
--> statement-breakpoint
CREATE TABLE `push_logs` (
  `id` text PRIMARY KEY NOT NULL,
  `request_id` text NOT NULL,
  `endpoint_id` text NOT NULL,
  `status` text NOT NULL,
  `response_body` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`endpoint_id`) REFERENCES `endpoints`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `push_logs_endpoint_id_idx` ON `push_logs` (`endpoint_id`);
--> statement-breakpoint
CREATE INDEX `push_logs_request_id_idx` ON `push_logs` (`request_id`);
--> statement-breakpoint
CREATE INDEX `push_logs_created_at_idx` ON `push_logs` (`created_at`);
