
"use client";

import { Suspense } from 'react';
import { NotesClient } from './notes-client';
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
       <div className="p-4 md:px-8 md:py-6 border-b border-slate-200 bg-white sticky top-0 z-20 shadow-sm">
           <Skeleton className="h-8 w-48 mb-4"/>
           <Skeleton className="h-11 w-full"/>
       </div>
        <div className="px-4 md:px-8 py-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
    </div>
  );
}

