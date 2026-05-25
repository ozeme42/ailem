import { Suspense } from 'react';
import { HtmlTestsClient } from './html-tests-client';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = {
  title: "HTML Testler | Eğitim Yönetimi",
  description: "HTML tabanlı interaktif testler oluşturun ve yönetin.",
};

export default function HtmlTestsPage() {
  return (
    <Suspense fallback={<HtmlTestsSkeleton />}>
      <HtmlTestsClient />
    </Suspense>
  );
}

function HtmlTestsSkeleton() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
       <div className="h-20 w-full bg-slate-900/50 border-b border-white/5 flex items-center justify-between px-6 sticky top-0 z-40 backdrop-blur-xl">
          <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full bg-white/10" />
              <div className="space-y-2">
                 <Skeleton className="h-6 w-48 bg-white/10" />
              </div>
          </div>
          <Skeleton className="h-9 w-32 rounded-xl bg-white/10" />
       </div>
       <div className="flex-1 max-w-5xl mx-auto w-full p-6 space-y-4">
          {[...Array(3)].map((_, i) => (
             <Skeleton key={i} className="h-24 w-full rounded-2xl bg-white/5" />
          ))}
       </div>
    </div>
  );
}
