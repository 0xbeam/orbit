'use client';

import { useState, useEffect, Suspense } from 'react';
import { Shield, Unplug, Download, CheckCircle, XCircle, Loader2, AlertTriangle, Wrench } from 'lucide-react';
import BuildLog from '@/components/BuildLog';
import { useSearchParams } from 'next/navigation';

function SettingsContent() {
  const searchParams = useSearchParams();
  const [googleAuth, setGoogleAuth] = useState<{ authenticated: boolean; authUrl?: string; error?: string } | null>(null);
  const [scrapeStatus, setScrapeStatus] = useState<'idle' | 'scraping' | 'done' | 'error'>('idle');
  const [scrapeResult, setScrapeResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const successMsg = searchParams.get('success');
  const errorMsg = searchParams.get('error');

  useEffect(() => {
    fetch('/api/auth')
      .then(r => r.json())
      .then(data => {
        setGoogleAuth(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleConnect = () => {
    if (googleAuth?.authUrl) {
      window.location.href = googleAuth.authUrl;
    }
  };

  const handleDisconnect = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    setGoogleAuth({ authenticated: false });
    window.location.reload();
  };

  const handleScrape = async () => {
    setScrapeStatus('scraping');
    setScrapeResult(null);
    try {
      const res = await fetch('/api/contacts/scrape', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setScrapeResult(data);
        setScrapeStatus('done');
      } else {
        setScrapeResult(data);
        setScrapeStatus('error');
      }
    } catch {
      setScrapeStatus('error');
      setScrapeResult({ error: 'Network error' });
    }
  };

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-txt-primary mb-2">Settings</h1>
      <p className="text-sm text-txt-tertiary mb-8">Your accounts, integrations, and app configuration.</p>

      {/* Success/Error banners */}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 mb-6 bg-status-success/10 border border-status-success/20 rounded-lg text-sm text-status-success">
          <CheckCircle size={16} />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 p-3 mb-6 bg-status-danger/10 border border-status-danger/20 rounded-lg text-sm text-status-danger">
          <XCircle size={16} />
          {errorMsg}
        </div>
      )}

      {/* Google Account */}
      <section className="bg-surface-secondary rounded-lg border border-border p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield size={20} className="text-accent-text" />
          <h2 className="text-base font-semibold text-txt-primary">Google Account</h2>
        </div>
        <p className="text-sm text-txt-tertiary mb-4">
          Connect your Google account to sync Gmail, Calendar, and Contacts.
        </p>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-txt-tertiary">
            <Loader2 size={14} className="animate-spin" /> Checking...
          </div>
        ) : googleAuth?.authenticated ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-status-success">
              <CheckCircle size={16} />
              Connected as {process.env.NEXT_PUBLIC_USER_EMAIL || 'p@spacekayak.xyz'}
            </div>
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-status-danger border border-status-danger/30 rounded-lg hover:bg-status-danger/10 transition-colors"
            >
              <Unplug size={13} />
              Disconnect
            </button>
          </div>
        ) : (
          <div>
            {googleAuth?.error && (
              <div className="flex items-center gap-2 mb-3 text-xs text-status-warning">
                <AlertTriangle size={13} />
                {googleAuth.error}
              </div>
            )}
            <button
              onClick={handleConnect}
              disabled={!googleAuth?.authUrl}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Shield size={15} />
              Connect Google Account
            </button>
          </div>
        )}
      </section>

      {/* Contact Scraping */}
      <section className="bg-surface-secondary rounded-lg border border-border p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Download size={20} className="text-accent-text" />
          <h2 className="text-base font-semibold text-txt-primary">Import Contacts</h2>
        </div>
        <p className="text-sm text-txt-tertiary mb-4">
          Scrape contacts from Google Contacts and Gmail senders. Existing contacts will be enriched, not duplicated. Internal @spacekayak.xyz emails are flagged.
        </p>

        <button
          onClick={handleScrape}
          disabled={!googleAuth?.authenticated || scrapeStatus === 'scraping'}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {scrapeStatus === 'scraping' ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Scraping contacts...
            </>
          ) : (
            <>
              <Download size={15} />
              Scrape All Contacts
            </>
          )}
        </button>

        {!googleAuth?.authenticated && (
          <p className="text-xs text-txt-tertiary mt-2">Connect Google account first.</p>
        )}

        {scrapeResult && (
          <div className={`mt-4 p-4 rounded-lg text-sm ${scrapeStatus === 'done' ? 'bg-status-success/10 border border-status-success/20' : 'bg-status-danger/10 border border-status-danger/20'}`}>
            {scrapeStatus === 'done' ? (
              <div className="space-y-1">
                <p className="font-medium text-status-success">Scrape complete!</p>
                <p className="text-status-success/80">People API contacts: {String(scrapeResult.peopleApiContacts)}</p>
                <p className="text-status-success/80">Gmail senders found: {String(scrapeResult.gmailSenders)}</p>
                <p className="text-status-success/80">New contacts created: {String(scrapeResult.newContacts)}</p>
                <p className="text-status-success/80">Existing contacts enriched: {String(scrapeResult.enrichedContacts)}</p>
                <p className="text-status-success/80">Internal (spacekayak) flagged: {String(scrapeResult.skippedInternal)}</p>
                <p className="text-status-success/80">Duration: {String(scrapeResult.duration)}</p>
              </div>
            ) : (
              <p className="text-status-danger">{String(scrapeResult.error || 'Unknown error')}</p>
            )}
          </div>
        )}
      </section>

      {/* API Keys Status */}
      <section className="bg-surface-secondary rounded-lg border border-border p-6 mb-6">
        <h2 className="text-base font-semibold text-txt-primary mb-4">API Configuration</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-txt-secondary">Google Client ID</span>
            <span className={process.env.NEXT_PUBLIC_GOOGLE_CONFIGURED ? 'text-status-success' : 'text-status-warning'}>
              {process.env.NEXT_PUBLIC_GOOGLE_CONFIGURED ? 'Configured' : 'Check .env.local'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-txt-secondary">Claude API Key</span>
            <span className="text-status-warning">Check .env.local</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-txt-secondary">User Email</span>
            <span className="text-txt-primary">p@spacekayak.xyz</span>
          </div>
        </div>
      </section>

      {/* Build Log */}
      <section className="bg-surface-secondary rounded-lg border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Wrench size={20} className="text-accent-text" />
          <h2 className="text-base font-semibold text-txt-primary">Build Log</h2>
        </div>
        <p className="text-sm text-txt-tertiary mb-4">
          Track every change made to andromeda, phase by phase.
        </p>
        <BuildLog />
      </section>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="p-8 max-w-2xl">
        <h1 className="text-2xl font-bold text-txt-primary mb-2">Settings</h1>
        <div className="flex items-center gap-2 text-sm text-txt-tertiary">
          <Loader2 size={14} className="animate-spin" /> Loading...
        </div>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
