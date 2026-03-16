// Gmail sending engine for andromeda
// Provides functions to compose and send emails via the Gmail API.

import { getGmailClient } from '@/lib/google-auth';
import { USER_EMAIL, withRetry } from '@/lib/gmail-utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SendEmailParams {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string;
}

export interface ReplyToThreadParams {
  threadId: string;
  gmailThreadId: string;
  to: string;
  cc?: string;
  subject: string;
  body: string;
  lastMessageId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Encode a string to URL-safe base64 (RFC 4648 section 5) as required by the
 * Gmail API `raw` field.
 */
export function base64UrlEncode(str: string): string {
  return Buffer.from(str, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Build an RFC 5322 MIME message string with the supplied headers and body.
 *
 * The returned string is ready to be base64url-encoded and passed to the
 * Gmail API `messages.send` endpoint.
 */
export function buildMimeMessage(params: {
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
}): string {
  const lines: string[] = [];

  lines.push('MIME-Version: 1.0');
  lines.push('Content-Type: text/plain; charset=utf-8');
  lines.push(`Date: ${new Date().toUTCString()}`);
  lines.push(`From: ${params.from}`);
  lines.push(`To: ${params.to}`);

  if (params.cc) {
    lines.push(`Cc: ${params.cc}`);
  }

  if (params.bcc) {
    lines.push(`Bcc: ${params.bcc}`);
  }

  lines.push(`Subject: ${params.subject}`);

  if (params.inReplyTo) {
    lines.push(`In-Reply-To: ${params.inReplyTo}`);
  }

  if (params.references) {
    lines.push(`References: ${params.references}`);
  }

  // Blank line separates headers from body per RFC 5322
  lines.push('');
  lines.push(params.body);

  return lines.join('\r\n');
}

// ---------------------------------------------------------------------------
// Core send function
// ---------------------------------------------------------------------------

/**
 * Send an email via the Gmail API.
 *
 * The message is built as an RFC 5322 MIME string, base64url-encoded, and
 * posted through `gmail.users.messages.send`. When `threadId` is provided the
 * message is threaded with the existing conversation.
 *
 * The call is wrapped with `withRetry` to handle transient rate-limit errors.
 */
export async function sendEmail(params: SendEmailParams): Promise<{
  messageId: string;
  threadId: string;
}> {
  const mimeMessage = buildMimeMessage({
    from: USER_EMAIL,
    to: params.to,
    cc: params.cc,
    bcc: params.bcc,
    subject: params.subject,
    body: params.body,
    inReplyTo: params.inReplyTo,
    references: params.references,
  });

  const gmail = await getGmailClient();

  const requestBody: { raw: string; threadId?: string } = {
    raw: base64UrlEncode(mimeMessage),
  };

  if (params.threadId) {
    requestBody.threadId = params.threadId;
  }

  const res = await withRetry(() =>
    gmail.users.messages.send({
      userId: 'me',
      requestBody,
    }),
  );

  return {
    messageId: res.data.id!,
    threadId: res.data.threadId!,
  };
}

// ---------------------------------------------------------------------------
// Convenience: reply to an existing thread
// ---------------------------------------------------------------------------

/**
 * Reply to an existing email thread.
 *
 * Automatically prepends "Re: " to the subject (if not already present) and
 * sets the `In-Reply-To` / `References` headers so the Gmail UI threads the
 * messages correctly.
 */
export async function replyToThread(params: ReplyToThreadParams): Promise<{
  messageId: string;
  threadId: string;
}> {
  const subject = params.subject.startsWith('Re: ')
    ? params.subject
    : `Re: ${params.subject}`;

  return sendEmail({
    to: params.to,
    cc: params.cc,
    subject,
    body: params.body,
    threadId: params.gmailThreadId,
    inReplyTo: params.lastMessageId,
    references: params.lastMessageId,
  });
}
