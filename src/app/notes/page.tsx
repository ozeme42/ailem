
"use client";

import { Suspense } from 'react';
import { NotesClient } from './notes-client';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';

export default function NotesPage() {
  return (
    <div className="h-full">
      <NotesClient />
    </div>
  );
}


function NotesSkeleton() {
  return (
    <div className="space-y-6">
       <PageHeader title="Not Defterleri">
          <Skeleton className="h-10 w-44" />
       </PageHeader>
        <div className="relative w-full sm:max-w-md">
            <Skeleton className="h-10 w-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
        </div>
    </div>
  );
}
