CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`emails` text,
	`organization` text,
	`category` text,
	`tier` integer,
	`type` text,
	`role` text,
	`notes` text,
	`last_contacted_at` text,
	`last_contact_method` text,
	`created_at` text DEFAULT '2026-03-02T10:27:15.938Z',
	`updated_at` text DEFAULT '2026-03-02T10:27:15.939Z'
);
--> statement-breakpoint
CREATE TABLE `drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_id` text,
	`type` text,
	`subject` text,
	`body` text,
	`status` text DEFAULT 'draft',
	`created_at` text DEFAULT '2026-03-02T10:27:15.939Z',
	`updated_at` text DEFAULT '2026-03-02T10:27:15.939Z',
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `interactions` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_id` text,
	`type` text,
	`subject` text,
	`summary` text,
	`raw_content` text,
	`gmail_message_id` text,
	`calendar_event_id` text,
	`date` text,
	`metadata` text,
	`created_at` text DEFAULT '2026-03-02T10:27:15.939Z',
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sync_log` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text,
	`last_sync_at` text,
	`items_synced` integer,
	`status` text,
	`error` text
);
