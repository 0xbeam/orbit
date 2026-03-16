export type Category = 'Team' | 'Client' | 'Investor' | 'Community' | 'Advisor' | 'Ops Partner';
export type Tier = 1 | 2 | 3;
export type ContactType = 'Business' | 'Personal' | 'Both';
export type InteractionType = 'email_sent' | 'email_received' | 'meeting' | 'whatsapp' | 'call' | 'intro';
export type DraftType = 'email' | 'proposal' | 'intro' | 'follow_up' | 'call_request';
export type DraftStatus = 'draft' | 'sent' | 'archived';
export type SyncSource = 'gmail' | 'calendar' | 'whatsapp';
export type ContactMethod = 'email' | 'calendar' | 'whatsapp';
export type ContactSource = 'xlsx' | 'gmail' | 'people_api' | 'manual';
export type EmailDirection = 'inbound' | 'outbound';
export type ThreadStatus = 'open' | 'closed' | 'snoozed';
export type RelationshipHealth = 'warm' | 'cooling' | 'cold' | 'lost';

// Dark-mode optimized category colors
export const CATEGORY_COLORS: Record<Category, string> = {
  'Team': 'rgba(52, 211, 153, 0.1)',
  'Client': 'rgba(96, 165, 250, 0.1)',
  'Investor': 'rgba(251, 191, 36, 0.1)',
  'Community': 'rgba(192, 132, 252, 0.1)',
  'Advisor': 'rgba(245, 158, 11, 0.1)',
  'Ops Partner': 'rgba(167, 139, 250, 0.1)',
};

export const CATEGORY_TEXT_COLORS: Record<Category, string> = {
  'Team': '#34D399',
  'Client': '#60A5FA',
  'Investor': '#FBBF24',
  'Community': '#C084FC',
  'Advisor': '#F59E0B',
  'Ops Partner': '#A78BFA',
};

export const DECAY_THRESHOLDS: Record<number, { warm: number; cooling: number; cold: number; lost: number }> = {
  1: { warm: 14, cooling: 30, cold: 60, lost: 90 },
  2: { warm: 30, cooling: 60, cold: 90, lost: 180 },
  3: { warm: 60, cooling: 120, cold: 180, lost: 365 },
};

// Email thread response from API
export interface EmailThreadResponse {
  id: string;
  gmailThreadId: string | null;
  contactId: string | null;
  subject: string | null;
  snippet: string | null;
  lastMessageAt: string | null;
  messageCount: number | null;
  isUnread: boolean | null;
  isStarred: boolean | null;
  isReplied: boolean | null;
  status: string | null;
  labels: string | null;
  contactName: string;
  contactEmail: string;
  contactTier: number | null;
  contactCategory: string | null;
  contactPhotoUrl: string | null;
}

export interface EmailMessageResponse {
  id: string;
  gmailMessageId: string | null;
  threadId: string | null;
  contactId: string | null;
  direction: EmailDirection | null;
  fromAddress: string | null;
  toAddress: string | null;
  ccAddress: string | null;
  subject: string | null;
  snippet: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  date: string | null;
  labelIds: string | null;
  isRead: boolean | null;
  hasAttachments: boolean | null;
}

export interface SyncResult {
  threadsProcessed: number;
  messagesProcessed: number;
  contactsCreated: number;
  errors: number;
  isIncremental: boolean;
  duration: number;
}

// Calendar event display format (used by DayView, WeekView, etc.)
export interface CalendarEventDisplay {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  meetLink?: string | null;
  attendeeCount: number;
  contactNames?: string[];
  isInternal: boolean;
  location?: string | null;
  status: string;
}

export interface CalendarSyncResult {
  eventsProcessed: number;
  eventsCreated: number;
  eventsUpdated: number;
  errors: number;
  isIncremental: boolean;
  duration: number;
}
