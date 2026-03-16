import { db } from '@/db';
import { contacts, interactions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Mail, Building2, Tag, Star, PenSquare, Linkedin, Twitter, Send, Phone, Globe, ExternalLink, Clock } from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_TEXT_COLORS, type Category } from '@/types';
import Timeline from '@/components/Timeline';
import ContactEmailHistory from '@/components/ContactEmailHistory';
import RelationshipStrength from '@/components/RelationshipStrength';
import ContactEditor from '@/components/ContactEditor';
import { formatDistanceToNow } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contact = (await db.select().from(contacts).where(eq(contacts.id, id)))[0];

  if (!contact) {
    notFound();
  }

  const contactInteractions = await db
    .select()
    .from(interactions)
    .where(eq(interactions.contactId, id));

  const cat = (contact.category || 'Client') as Category;
  const lastContact = contact.lastContactedAt
    ? formatDistanceToNow(new Date(contact.lastContactedAt), { addSuffix: true })
    : 'No contact yet';

  // Relationship strength: count interactions in last 90 days
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const recentInteractions = contactInteractions.filter(
    (i) => i.date && new Date(i.date) >= ninetyDaysAgo
  );
  const relationshipScore = Math.min(100, recentInteractions.length * 10);

  // Days since last contact
  const daysSinceContact = contact.lastContactedAt
    ? Math.floor((now.getTime() - new Date(contact.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const socialLinks = [
    { url: contact.linkedinUrl, icon: Linkedin, label: 'LinkedIn', color: 'text-accent-text' },
    { url: contact.twitterUrl, icon: Twitter, label: 'Twitter', color: 'text-status-info' },
    { url: contact.telegramUrl, icon: Send, label: 'Telegram', color: 'text-accent-text' },
    { url: contact.websiteUrl, icon: Globe, label: 'Website', color: 'text-txt-secondary' },
  ].filter(l => l.url);

  return (
    <div className="p-8 max-w-4xl">
      {/* Back button */}
      <Link
        href="/contacts"
        className="inline-flex items-center gap-1.5 text-sm text-txt-tertiary hover:text-txt-secondary mb-6"
      >
        <ArrowLeft size={14} />
        Back to contacts
      </Link>

      {/* Header */}
      <div className="bg-surface-secondary rounded-lg border border-border p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {contact.photoUrl ? (
              <Image
                src={contact.photoUrl}
                alt={contact.name}
                width={64}
                height={64}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
                style={{ backgroundColor: CATEGORY_COLORS[cat], color: CATEGORY_TEXT_COLORS[cat] }}
              >
                {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-txt-primary">{contact.name}</h1>
                {contact.tier === 1 && <Star size={16} className="text-status-warning fill-status-warning" />}
                {contact.category ? (
                  <span
                    className="text-[11px] font-medium px-2.5 py-0.5 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[cat], color: CATEGORY_TEXT_COLORS[cat] }}
                  >
                    {contact.category}
                  </span>
                ) : (
                  <span className="text-[11px] text-txt-tertiary bg-surface-hover px-2.5 py-0.5 rounded-full">
                    Uncategorized
                  </span>
                )}
                {contact.isInternal && (
                  <span className="text-[10px] text-txt-tertiary bg-surface-hover px-2 py-0.5 rounded">Internal</span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-txt-tertiary">
                {contact.organization && (
                  <span className="flex items-center gap-1">
                    <Building2 size={13} />
                    {contact.organization}
                  </span>
                )}
                {contact.role && (
                  <span className="flex items-center gap-1">
                    <Tag size={13} />
                    {contact.role}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="flex items-center gap-1 text-sm text-accent-text hover:underline">
                    <Mail size={13} />
                    {contact.email}
                  </a>
                )}
                {contact.phone && (
                  <a href={`tel:${contact.phone}`} className="flex items-center gap-1 text-sm text-txt-tertiary hover:underline">
                    <Phone size={13} />
                    {contact.phone}
                  </a>
                )}
              </div>
              {/* Last seen badge */}
              <div className="flex items-center gap-3 mt-2">
                {daysSinceContact !== null ? (
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                    daysSinceContact <= 7
                      ? 'bg-status-success/10 text-status-success'
                      : daysSinceContact <= 30
                      ? 'bg-status-warning/10 text-status-warning'
                      : 'bg-status-danger/10 text-status-danger'
                  }`}>
                    <Clock size={11} />
                    {daysSinceContact === 0 ? 'Active today' : daysSinceContact === 1 ? 'Last seen yesterday' : `Last seen ${daysSinceContact} days ago`}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-surface-hover text-txt-tertiary">
                    <Clock size={11} />
                    No contact yet
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/compose?contact=${contact.id}`}
              className="flex items-center gap-1.5 px-3 py-2 bg-accent text-white text-xs font-medium rounded-lg hover:bg-accent-hover transition-colors"
            >
              <PenSquare size={13} />
              Draft Email
            </Link>
          </div>
        </div>

        {/* Social links */}
        {socialLinks.length > 0 && (
          <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border-subtle">
            {socialLinks.map((link) => (
              <a
                key={link.label}
                href={link.url!}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-1.5 text-xs ${link.color} hover:underline`}
              >
                <link.icon size={13} />
                {link.label}
                <ExternalLink size={10} />
              </a>
            ))}
          </div>
        )}

        {/* Relationship strength */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-3 mb-1">
            <p className="text-[11px] text-txt-tertiary uppercase tracking-wider">Relationship</p>
            <p className="text-[11px] text-txt-tertiary">{recentInteractions.length} interactions in 90 days</p>
          </div>
          <div className="max-w-xs">
            <RelationshipStrength score={relationshipScore} />
          </div>
        </div>

        {/* Meta row */}
        <div className="flex gap-6 mt-4 pt-4 border-t border-border">
          <div>
            <p className="text-[11px] text-txt-tertiary uppercase tracking-wider">Tier</p>
            <p className="text-sm font-medium text-txt-primary mt-0.5">
              {contact.tier === 1 ? 'Tier 1 — Priority' : contact.tier === 2 ? 'Tier 2 — Active' : 'Tier 3 — Passive'}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-txt-tertiary uppercase tracking-wider">Type</p>
            <p className="text-sm font-medium text-txt-primary mt-0.5">{contact.type || 'Business'}</p>
          </div>
          <div>
            <p className="text-[11px] text-txt-tertiary uppercase tracking-wider">Last Contact</p>
            <p className="text-sm font-medium text-txt-primary mt-0.5">{lastContact}</p>
          </div>
          <div>
            <p className="text-[11px] text-txt-tertiary uppercase tracking-wider">Via</p>
            <p className="text-sm font-medium text-txt-primary mt-0.5 capitalize">{contact.lastContactMethod || 'N/A'}</p>
          </div>
          {contact.emailCount && contact.emailCount > 0 ? (
            <div>
              <p className="text-[11px] text-txt-tertiary uppercase tracking-wider">Emails</p>
              <p className="text-sm font-medium text-txt-primary mt-0.5">{contact.emailCount}</p>
            </div>
          ) : null}
          {contact.source && (
            <div>
              <p className="text-[11px] text-txt-tertiary uppercase tracking-wider">Source</p>
              <p className="text-sm font-medium text-txt-primary mt-0.5 capitalize">{contact.source}</p>
            </div>
          )}
        </div>
      </div>

      {/* Editable Notes & Details */}
      <div className="mb-6">
        <ContactEditor
          contactId={id}
          initialNotes={contact.notes}
          initialTier={contact.tier}
          initialCategory={contact.category}
          initialRole={contact.role}
          initialOrganization={contact.organization}
        />
      </div>

      {/* Email History */}
      <div className="bg-surface-secondary rounded-lg border border-border p-6 mb-6">
        <h2 className="text-sm font-semibold text-txt-primary mb-4">Email History</h2>
        <ContactEmailHistory contactId={id} />
      </div>

      {/* Timeline */}
      <div className="bg-surface-secondary rounded-lg border border-border p-6">
        <h2 className="text-sm font-semibold text-txt-primary mb-4">Timeline</h2>
        <Timeline interactions={contactInteractions} />
      </div>
    </div>
  );
}
