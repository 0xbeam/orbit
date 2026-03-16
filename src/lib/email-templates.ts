import {
  MessageCircle,
  Coffee,
  Phone,
  Heart,
  FileText,
  Zap,
  HelpCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  subjectTemplate: string;
  bodyTemplate: string;
  icon: LucideIcon;
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'follow-up',
    name: 'Follow up',
    description: 'After a meeting or conversation',
    icon: MessageCircle,
    subjectTemplate: 'Following up — {{name}}',
    bodyTemplate: `Hey {{name}},

Great connecting {{context}}. Wanted to follow up on what we discussed.

{{body}}

Let me know if there's anything else I can help with.

Best,
Finney`,
  },
  {
    id: 'check-in',
    name: 'Check in',
    description: 'Casual reconnect',
    icon: Coffee,
    subjectTemplate: 'Checking in',
    bodyTemplate: `Hey {{name}},

It's been a minute — wanted to check in and see how things are going{{orgContext}}.

{{body}}

Would love to catch up if you have some time.

Cheers,
Finney`,
  },
  {
    id: 'call-request',
    name: 'Request a call',
    description: 'Schedule a quick chat',
    icon: Phone,
    subjectTemplate: 'Quick call?',
    bodyTemplate: `Hey {{name}},

Would you have 15-20 minutes this week for a quick call? {{body}}

Happy to work around your schedule — let me know what works.

Best,
Finney`,
  },
  {
    id: 'thank-you',
    name: 'Thank you',
    description: 'Post-meeting or intro gratitude',
    icon: Heart,
    subjectTemplate: 'Thanks, {{name}}!',
    bodyTemplate: `Hey {{name}},

Just wanted to say thanks {{context}}. Really appreciated your time and insights.

{{body}}

Looking forward to staying in touch.

Best,
Finney`,
  },
  {
    id: 'proposal',
    name: 'Proposal',
    description: 'Business proposal structure',
    icon: FileText,
    subjectTemplate: 'Proposal: {{subject}}',
    bodyTemplate: `Hey {{name}},

Following up on our conversation — here's what I'm thinking:

{{body}}

Happy to jump on a call to walk through this in more detail. Let me know your thoughts.

Best,
Finney`,
  },
  {
    id: 'cold-outreach',
    name: 'Cold outreach',
    description: 'First-time contact',
    icon: Zap,
    subjectTemplate: '{{subject}}',
    bodyTemplate: `Hey {{name}},

{{body}}

Would love to connect if you're open to it — happy to keep it short.

Best,
Finney`,
  },
  {
    id: 'intro-request',
    name: 'Ask for intro',
    description: 'Request an introduction to someone',
    icon: HelpCircle,
    subjectTemplate: 'Quick ask — intro to {{target}}?',
    bodyTemplate: `Hey {{name}},

Hope you're doing well! I have a quick ask — would you be open to introducing me to {{target}}? {{body}}

Totally understand if the timing isn't right. Either way, appreciate you!

Best,
Finney`,
  },
];

export function resolveTemplate(
  template: EmailTemplate,
  data: {
    name?: string;
    org?: string;
    context?: string;
    body?: string;
    subject?: string;
    target?: string;
  }
): { subject: string; body: string } {
  const name = data.name || '';
  const org = data.org || '';
  const context = data.context || '';
  const body = data.body || '';
  const subject = data.subject || '';
  const target = data.target || '[Name]';
  const orgContext = org ? ` at ${org}` : '';

  const resolvedSubject = template.subjectTemplate
    .replace(/\{\{name\}\}/g, name)
    .replace(/\{\{subject\}\}/g, subject)
    .replace(/\{\{target\}\}/g, target);

  const resolvedBody = template.bodyTemplate
    .replace(/\{\{name\}\}/g, name)
    .replace(/\{\{orgContext\}\}/g, orgContext)
    .replace(/\{\{context\}\}/g, context || 'recently')
    .replace(/\{\{body\}\}/g, body || '[Your message here]')
    .replace(/\{\{target\}\}/g, target);

  return { subject: resolvedSubject, body: resolvedBody };
}
