
import { Suspense } from 'react';
import { NotesClient } from './notes-client';
import { Skeleton } from '@/components/ui/skeleton';

export default function NotesPage() {
  return (
    <div className="h-full bg-slate-50 dark:bg-slate-950">
      <Suspense fallback={<NotesSkeleton />}>
        <NotesClient />
      </Suspense>
    </div>
  );
}


function NotesSkeleton() {
  return (
    <div className="space-y-6 p-4 md:p-8">
       <div className="flex items-center justify-between">
           <Skeleton className="h-8 w-48"/>
           <Skeleton className="h-11 w-32"/>
       </div>
        <Skeleton className="h-11 w-full max-w-lg"/>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
    </div>
  );
}
