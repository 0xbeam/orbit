CREATE TABLE `email_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`gmail_message_id` text,
	`thread_id` text,
	`contact_id` text,
	`direction` text,
	`from_address` text,
	`to_address` text,
	`cc_address` text,
	`subject` text,
	`snippet` text,
	`body_text` text,
	`body_html` text,
	`date` text,
	`label_ids` text,
	`is_read` integer DEFAULT true,
	`has_attachments` integer DEFAULT false,
	`metadata` text,
	`created_at` text DEFAULT '2026-03-02T11:48:05.659Z',
	FOREIGN KEY (`thread_id`) REFERENCES `email_threads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_messages_gmail_message_id_unique` ON `email_messages` (`gmail_message_id`);--> statement-breakpoint
CREATE TABLE `email_threads` (
	`id` text PRIMARY KEY NOT NULL,
	`gmail_thread_id` text,
	`contact_id` text,
	`subject` text,
	`snippet` text,
	`last_message_at` text,
	`message_count` integer DEFAULT 0,
	`is_unread` integer DEFAULT false,
	`is_starred` integer DEFAULT false,
	`is_replied` integer DEFAULT false,
	`status` text DEFAULT 'open',
	`labels` text,
	`metadata` text,
	`created_at` text DEFAULT '2026-03-02T11:48:05.659Z',
	`updated_at` text DEFAULT '2026-03-02T11:48:05.659Z',
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_threads_gmail_thread_id_unique` ON `email_threads` (`gmail_thread_id`);--> statement-breakpoint
CREATE TABLE `meeting_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_id` text,
	`title` text,
	`content` text,
	`meeting_date` text,
	`source` text DEFAULT 'manual',
	`created_at` text DEFAULT '2026-03-02T11:48:05.659Z',
	`updated_at` text DEFAULT '2026-03-02T11:48:05.659Z',
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text,
	`updated_at` text DEFAULT '2026-03-02T11:48:05.659Z'
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_contacts` (
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
	`created_at` text DEFAULT '2026-03-02T11:48:05.658Z',
	`updated_at` text DEFAULT '2026-03-02T11:48:05.658Z',
	`phone` text,
	`linkedin_url` text,
	`twitter_url` text,
	`telegram_url` text,
	`website_url` text,
	`photo_url` text,
	`source` text,
	`is_internal` integer DEFAULT false,
	`last_email_at` text,
	`email_count` integer DEFAULT 0,
	`slack_user_id` text,
	`slack_context` text
);
--> statement-breakpoint
INSERT INTO `__new_contacts`("id", "name", "email", "emails", "organization", "category", "tier", "type", "role", "notes", "last_contacted_at", "last_contact_method", "created_at", "updated_at", "phone", "linkedin_url", "twitter_url", "telegram_url", "website_url", "photo_url", "source", "is_internal", "last_email_at", "email_count", "slack_user_id", "slack_context") SELECT "id", "name", "email", "emails", "organization", "category", "tier", "type", "role", "notes", "last_contacted_at", "last_contact_method", "created_at", "updated_at", "phone", "linkedin_url", "twitter_url", "telegram_url", "website_url", "photo_url", "source", "is_internal", "last_email_at", "email_count", "slack_user_id", "slack_context" FROM `contacts`;--> statement-breakpoint
DROP TABLE `contacts`;--> statement-breakpoint
ALTER TABLE `__new_contacts` RENAME TO `contacts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_id` text,
	`type` text,
	`subject` text,
	`body` text,
	`status` text DEFAULT 'draft',
	`created_at` text DEFAULT '2026-03-02T11:48:05.659Z',
	`updated_at` text DEFAULT '2026-03-02T11:48:05.659Z',
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_drafts`("id", "contact_id", "type", "subject", "body", "status", "created_at", "updated_at") SELECT "id", "contact_id", "type", "subject", "body", "status", "created_at", "updated_at" FROM `drafts`;--> statement-breakpoint
DROP TABLE `drafts`;--> statement-breakpoint
ALTER TABLE `__new_drafts` RENAME TO `drafts`;--> statement-breakpoint
CREATE TABLE `__new_interactions` (
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
	`created_at` text DEFAULT '2026-03-02T11:48:05.659Z',
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_interactions`("id", "contact_id", "type", "subject", "summary", "raw_content", "gmail_message_id", "calendar_event_id", "date", "metadata", "created_at") SELECT "id", "contact_id", "type", "subject", "summary", "raw_content", "gmail_message_id", "calendar_event_id", "date", "metadata", "created_at" FROM `interactions`;--> statement-breakpoint
DROP TABLE `interactions`;--> statement-breakpoint
ALTER TABLE `__new_interactions` RENAME TO `interactions`;