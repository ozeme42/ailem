
import { Suspense } from 'react';
import { ResultsClient } from './results-client';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = {
  title: "Sınav Sonuçlarım | Eğitim Paneli",
  description: "Tüm sınav sonuçlarını detaylı tablo halinde inceleyin.",
};

export default function ResultsPage() {
  return (
    <Suspense fallback={<ResultsSkeleton />}>
      <ResultsClient />
    </Suspense>
  );
}

function ResultsSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
       <div className="h-20 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-6 sticky top-0 z-40 backdrop-blur-xl">
          <Skeleton className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800" />
          <Skeleton className="h-6 w-48 bg-slate-100 dark:bg-slate-800 ml-4" />
       </div>
       <div className="flex-1 max-w-7xl mx-auto w-full p-6 space-y-6">
          <div className="h-12 w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center px-4">
             <Skeleton className="h-4 w-full" />
          </div>
          <div className="space-y-4">
             {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800" />
             ))}
          </div>
       </div>
    </div>
  );
}
