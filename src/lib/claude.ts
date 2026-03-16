// Claude AI layer — Phase 4
// Implements AI-powered email drafting, thread summarization, and action suggestions

import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-20250514';

// ---------------------------------------------------------------------------
// Client helper
// ---------------------------------------------------------------------------

function getAnthropicClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return null;
  }
  return new Anthropic({ apiKey });
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface DraftEmailParams {
  contactName: string;
  contactOrg?: string;
  intent: string; // 'follow_up' | 'intro' | 'proposal' | 'check_in' | 'call_request'
  context?: string;
  recentEmails?: Array<{
    direction: string;
    subject: string;
    snippet: string;
    date: string;
  }>;
}

interface ThreadMessage {
  direction: string;
  fromAddress: string;
  snippet: string;
  date: string;
}

interface RecentInteraction {
  type: string;
  subject: string;
  date: string;
  summary?: string;
}

// ---------------------------------------------------------------------------
// draftEmail
// ---------------------------------------------------------------------------

export async function draftEmail(
  params: DraftEmailParams
): Promise<{ subject: string; body: string } | null> {
  try {
    const client = getAnthropicClient();
    if (!client) return null;

    const { contactName, contactOrg, intent, context, recentEmails } = params;

    let userPrompt = `Draft an email for the following situation:\n`;
    userPrompt += `- Recipient: ${contactName}`;
    if (contactOrg) {
      userPrompt += ` (${contactOrg})`;
    }
    userPrompt += `\n- Intent: ${intent}\n`;

    if (context) {
      userPrompt += `- Additional context: ${context}\n`;
    }

    if (recentEmails && recentEmails.length > 0) {
      userPrompt += `\nRecent email history for context:\n`;
      for (const email of recentEmails) {
        userPrompt += `  [${email.date}] ${email.direction}: "${email.subject}" — ${email.snippet}\n`;
      }
    }

    userPrompt += `\nReturn valid JSON with "subject" and "body" fields only.`;

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system:
        'You are an AI assistant helping draft emails for Finney, a founder. Write concise, warm, professional emails that sound human — not corporate. Return JSON with \'subject\' and \'body\' fields only. Do not include email signatures.',
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textBlock = message.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') return null;

    const parsed = JSON.parse(textBlock.text);
    return { subject: parsed.subject, body: parsed.body };
  } catch (error) {
    console.error('draftEmail error:', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// summarizeThread
// ---------------------------------------------------------------------------

export async function summarizeThread(
  messages: ThreadMessage[]
): Promise<string | null> {
  try {
    const client = getAnthropicClient();
    if (!client) return null;

    let userPrompt = 'Here is an email thread to summarize:\n\n';
    for (const msg of messages) {
      userPrompt += `[${msg.date}] ${msg.direction} (${msg.fromAddress}): ${msg.snippet}\n`;
    }

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 256,
      system:
        'Summarize this email thread in 2-3 concise sentences. Focus on the key points and any action items.',
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textBlock = message.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') return null;

    return textBlock.text;
  } catch (error) {
    console.error('summarizeThread error:', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// suggestNextAction
// ---------------------------------------------------------------------------

export async function suggestNextAction(
  contactName: string,
  recentInteractions: RecentInteraction[]
): Promise<string | null> {
  try {
    const client = getAnthropicClient();
    if (!client) return null;

    let userPrompt = `Contact: ${contactName}\n\nRecent interactions:\n`;
    for (const interaction of recentInteractions) {
      userPrompt += `- [${interaction.date}] ${interaction.type}: ${interaction.subject}`;
      if (interaction.summary) {
        userPrompt += ` — ${interaction.summary}`;
      }
      userPrompt += '\n';
    }

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 128,
      system:
        'Based on the recent interactions with this contact, suggest one specific next action to take. Be brief (1-2 sentences).',
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textBlock = message.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') return null;

    return textBlock.text;
  } catch (error) {
    console.error('suggestNextAction error:', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Stubs — not yet needed
// ---------------------------------------------------------------------------

export async function generateProposal(_params: {
  contactId: string;
  projectType: string;
  scope: string;
}): Promise<string | null> {
  return null;
}

export async function draftIntroduction(params: {
  contactAName: string;
  contactAEmail: string;
  contactAOrg?: string;
  contactBName: string;
  contactBEmail: string;
  contactBOrg?: string;
  reason?: string;
  template: 'warm' | 'direct' | 'quick' | 'business';
}): Promise<{ to: string; cc: string; subject: string; body: string } | null> {
  try {
    const client = getAnthropicClient();
    if (!client) return null;

    const { contactAName, contactAEmail, contactBName, contactBEmail, contactAOrg, contactBOrg, reason, template } = params;

    const templateInstructions: Record<string, string> = {
      warm: `Write a warm double-opt-in email TO ${contactAName} asking if they'd be open to connecting with ${contactBName}. This is NOT a direct intro yet — it's checking with ${contactAName} first. Tone: friendly, thoughtful, personal.`,
      direct: `Write a direct introduction email TO ${contactAName}, CC'ing ${contactBName}. Introduce them to each other warmly and get out of the way. Tone: warm but efficient.`,
      quick: `Write a short, casual intro email TO ${contactAName}, CC'ing ${contactBName}. Keep it brief — 2-3 sentences max. Tone: informal, friendly, like a quick text.`,
      business: `Write a formal professional introduction email TO ${contactAName}, CC'ing ${contactBName}. Include relevant professional context. Tone: polished, professional, structured.`,
    };

    let userPrompt = templateInstructions[template] || templateInstructions.direct;
    userPrompt += `\n\nPerson A: ${contactAName}`;
    if (contactAOrg) userPrompt += ` (${contactAOrg})`;
    userPrompt += `\nPerson B: ${contactBName}`;
    if (contactBOrg) userPrompt += ` (${contactBOrg})`;

    if (reason) {
      userPrompt += `\n\nReason for connecting: ${reason}`;
    }

    userPrompt += `\n\nReturn valid JSON with "subject" and "body" fields only. Subject format: "Intro: ${contactAName} ↔ ${contactBName}"`;

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: 'You are helping Finney, a founder, draft introduction emails. Write concise, warm emails that sound human — not corporate. Return JSON with \'subject\' and \'body\' fields only. Do not include email signatures.',
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textBlock = message.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') return null;

    const parsed = JSON.parse(textBlock.text);

    return {
      to: contactAEmail,
      cc: template === 'warm' ? '' : contactBEmail,
      subject: parsed.subject,
      body: parsed.body,
    };
  } catch (error) {
    console.error('draftIntroduction error:', error);
    return null;
  }
}
