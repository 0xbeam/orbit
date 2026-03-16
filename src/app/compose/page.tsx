'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ComposePanel from '@/components/ComposePanel';

function ComposeContent() {
  const searchParams = useSearchParams();
  const contactId = searchParams.get('contactId') || undefined;
  const threadSubject = searchParams.get('threadSubject') || undefined;
  const draftId = searchParams.get('draftId') || undefined;

  return (
    <ComposePanel
      initialContactId={contactId}
      initialSubject={threadSubject}
      draftId={draftId}
    />
  );
}

export default function ComposePage() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-txt-primary">Compose</h1>
        <p className="text-sm text-txt-tertiary mt-1">Draft an email with AI assistance</p>
      </div>
      <Suspense fallback={<div className="text-txt-tertiary text-sm">Loading...</div>}>
        <ComposeContent />
      </Suspense>
    </div>
  );
}
