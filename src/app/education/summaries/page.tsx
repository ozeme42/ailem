import { Suspense } from 'react';
import { SummariesViewerClient } from './summaries-client';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = {
  title: "Ders Özetleri | Eğitim",
  description: "Ders tekrarlarınız için hazırlanan konu özetlerini inceleyin.",
};

export default function SummariesPage() {
  return (
    <Suspense fallback={<SummariesViewerSkeleton />}>
      <SummariesViewerClient />
    </Suspense>
  );
}

function SummariesViewerSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
       <div className="h-20 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-6 sticky top-0 z-40 backdrop-blur-xl">
          <Skeleton className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800" />
          <Skeleton className="h-6 w-48 bg-slate-100 dark:bg-slate-800 ml-4" />
       </div>
       <div className="flex-1 max-w-5xl mx-auto w-full p-6 space-y-6">
          <div className="flex gap-2 overflow-x-auto pb-4">
             <Skeleton className="h-10 w-24 rounded-full flex-shrink-0" />
             <Skeleton className="h-10 w-24 rounded-full flex-shrink-0" />
             <Skeleton className="h-10 w-24 rounded-full flex-shrink-0" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-48 w-full rounded-3xl" />
             ))}
          </div>
       </div>
    </div>
  );
}
