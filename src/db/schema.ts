import { pgTable, text, integer, boolean } from 'drizzle-orm/pg-core';

export const contacts = pgTable('contacts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  emails: text('emails'), // JSON array of all known emails
  organization: text('organization'),
  category: text('category'), // Team | Client | Investor | Community | Advisor | Ops Partner
  tier: integer('tier'), // 1, 2, 3
  type: text('type'), // Business | Personal | Both
  role: text('role'), // role/context description
  notes: text('notes'),
  lastContactedAt: text('last_contacted_at'), // ISO date
  lastContactMethod: text('last_contact_method'), // email | calendar | whatsapp
  createdAt: text('created_at').default(new Date().toISOString()),
  updatedAt: text('updated_at').default(new Date().toISOString()),
  // New fields — Session 1 expansion
  phone: text('phone'),
  linkedinUrl: text('linkedin_url'),
  twitterUrl: text('twitter_url'),
  telegramUrl: text('telegram_url'),
  websiteUrl: text('website_url'),
  photoUrl: text('photo_url'),
  source: text('source'), // 'xlsx' | 'gmail' | 'people_api' | 'manual'
  isInternal: boolean('is_internal').default(false),
  lastEmailAt: text('last_email_at'), // ISO date, from Gmail
  emailCount: integer('email_count').default(0),
  slackUserId: text('slack_user_id'),
  slackContext: text('slack_context'),
});

export const interactions = pgTable('interactions', {
  id: text('id').primaryKey(),
  contactId: text('contact_id').references(() => contacts.id),
  type: text('type'), // email_sent | email_received | meeting | whatsapp | call | intro
  subject: text('subject'),
  summary: text('summary'), // AI-generated summary
  rawContent: text('raw_content'), // full email/message body
  gmailMessageId: text('gmail_message_id'), // for dedup
  calendarEventId: text('calendar_event_id'), // for dedup
  date: text('date'), // ISO date
  metadata: text('metadata'), // JSON blob for extra data
  createdAt: text('created_at').default(new Date().toISOString()),
});

export const drafts = pgTable('drafts', {
  id: text('id').primaryKey(),
  contactId: text('contact_id').references(() => contacts.id),
  type: text('type'), // email | proposal | intro | follow_up | call_request
  subject: text('subject'),
  body: text('body'),
  status: text('status').default('draft'), // draft | sent | archived
  createdAt: text('created_at').default(new Date().toISOString()),
  updatedAt: text('updated_at').default(new Date().toISOString()),
});

export const syncLog = pgTable('sync_log', {
  id: text('id').primaryKey(),
  source: text('source'), // gmail | calendar | whatsapp
  lastSyncAt: text('last_sync_at'),
  itemsSynced: integer('items_synced'),
  status: text('status'), // success | error
  error: text('error'),
});

// New tables — Session 1 expansion

export const emailThreads = pgTable('email_threads', {
  id: text('id').primaryKey(),
  gmailThreadId: text('gmail_thread_id').unique(),
  contactId: text('contact_id').references(() => contacts.id),
  subject: text('subject'),
  snippet: text('snippet'),
  lastMessageAt: text('last_message_at'),
  messageCount: integer('message_count').default(0),
  isUnread: boolean('is_unread').default(false),
  isStarred: boolean('is_starred').default(false),
  isReplied: boolean('is_replied').default(false),
  status: text('status').default('open'), // 'open' | 'closed' | 'snoozed'
  labels: text('labels'), // JSON array of Gmail labels
  metadata: text('metadata'), // JSON blob
  createdAt: text('created_at').default(new Date().toISOString()),
  updatedAt: text('updated_at').default(new Date().toISOString()),
});

export const emailMessages = pgTable('email_messages', {
  id: text('id').primaryKey(),
  gmailMessageId: text('gmail_message_id').unique(),
  threadId: text('thread_id').references(() => emailThreads.id),
  contactId: text('contact_id').references(() => contacts.id),
  direction: text('direction'), // 'inbound' | 'outbound'
  fromAddress: text('from_address'),
  toAddress: text('to_address'), // JSON array
  ccAddress: text('cc_address'), // JSON array
  subject: text('subject'),
  snippet: text('snippet'),
  bodyText: text('body_text'),
  bodyHtml: text('body_html'),
  date: text('date'), // ISO date
  labelIds: text('label_ids'), // JSON array
  isRead: boolean('is_read').default(true),
  hasAttachments: boolean('has_attachments').default(false),
  metadata: text('metadata'), // JSON blob
  createdAt: text('created_at').default(new Date().toISOString()),
});

export const meetingNotes = pgTable('meeting_notes', {
  id: text('id').primaryKey(),
  contactId: text('contact_id').references(() => contacts.id),
  title: text('title'),
  content: text('content'), // markdown
  meetingDate: text('meeting_date'),
  source: text('source').default('manual'), // 'manual' | 'fathom'
  createdAt: text('created_at').default(new Date().toISOString()),
  updatedAt: text('updated_at').default(new Date().toISOString()),
});

export const calendarEvents = pgTable('calendar_events', {
  id: text('id').primaryKey(),
  googleEventId: text('google_event_id').unique(),
  calendarId: text('calendar_id'), // which calendar (primary, etc.)
  title: text('title'),
  description: text('description'),
  location: text('location'),
  startAt: text('start_at'), // ISO datetime
  endAt: text('end_at'), // ISO datetime
  allDay: boolean('all_day').default(false),
  status: text('status'), // 'confirmed' | 'tentative' | 'cancelled'
  attendees: text('attendees'), // JSON array of { email, name, responseStatus }
  organizer: text('organizer'), // JSON { email, name, self }
  meetLink: text('meet_link'),
  recurringEventId: text('recurring_event_id'),
  visibility: text('visibility'), // 'default' | 'public' | 'private'
  contactIds: text('contact_ids'), // JSON array of matched contact IDs
  isInternal: boolean('is_internal').default(false),
  metadata: text('metadata'), // JSON blob
  createdAt: text('created_at').default(new Date().toISOString()),
  updatedAt: text('updated_at').default(new Date().toISOString()),
});

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value'), // JSON-encoded
  updatedAt: text('updated_at').default(new Date().toISOString()),
});

// Session 6 — Time Logging
export const timeEntries = pgTable('time_entries', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  contactId: text('contact_id').references(() => contacts.id),
  startAt: text('start_at').notNull(), // ISO datetime
  endAt: text('end_at'), // nullable for running timers
  category: text('category'), // 'meeting' | 'email' | 'call' | 'research' | 'other'
  notes: text('notes'),
  calendarEventId: text('calendar_event_id'),
  createdAt: text('created_at').default(new Date().toISOString()),
});

// Session 6 — Product Build Log
export const buildLog = pgTable('build_log', {
  id: text('id').primaryKey(),
  version: text('version'),
  title: text('title').notNull(),
  description: text('description'),
  changes: text('changes'), // JSON array of { file, action, detail }
  phase: text('phase'),
  timestamp: text('timestamp'),
  canRollback: boolean('can_rollback').default(false),
  rolledBack: boolean('rolled_back').default(false),
  createdAt: text('created_at').default(new Date().toISOString()),
});
