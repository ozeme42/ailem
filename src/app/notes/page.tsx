
import { Suspense } from 'react';
import { NotesClient } from './notes-client';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';

export default function NotesPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<NotesSkeleton />}>
        <NotesClient />
      </Suspense>
    </div>
  );
}


function NotesSkeleton() {
  return (
    <div className="space-y-6">
       <PageHeader title="Not Defterleri">
          <Skeleton className="h-10 w-32" />
       </PageHeader>
        <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
        </div>
    </div>
  );
}

