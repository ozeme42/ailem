import { Suspense } from 'react';
import { SubjectsClient } from './subjects-client';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = {
  title: "Ders ve Konu Yönetimi | Eğitim Paneli",
  description: "Dersleri ve konuları merkezi bir yerden yönetin.",
};

export default function SubjectsManagementPage() {
  return (
    <Suspense fallback={<SubjectsSkeleton />}>
      <SubjectsClient />
    </Suspense>
  );
}

function SubjectsSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
       <div className="h-20 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 sticky top-0 z-40 backdrop-blur-xl">
          <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800" />
              <div className="space-y-2">
                 <Skeleton className="h-6 w-48 bg-slate-100 dark:bg-slate-800" />
              </div>
          </div>
          <Skeleton className="h-9 w-32 rounded-xl bg-slate-100 dark:bg-slate-800" />
       </div>
       <div className="flex-1 max-w-5xl mx-auto w-full p-6 space-y-4">
          <Skeleton className="h-12 w-full rounded-2xl bg-slate-100 dark:bg-slate-800" />
          {[...Array(5)].map((_, i) => (
             <Skeleton key={i} className="h-16 w-full rounded-2xl bg-slate-100 dark:bg-slate-800" />
          ))}
       </div>
    </div>
  );
}
