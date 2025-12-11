import { Suspense } from 'react';
import { BooksClient } from './books-client';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = {
  title: "Kitap Takibi | Eğitim Asistanı",
  description: "Soru bankası ve konu anlatımlı kitap takibi.",
};

export default function BookTrackingPage() {
  return (
    <Suspense fallback={<BooksSkeleton />}>
        <BooksClient />
    </Suspense>
  );
}

function BooksSkeleton() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
       {/* Header Skeleton - Koyu Tema */}
       <div className="h-20 w-full bg-slate-900/50 border-b border-white/5 flex items-center justify-between px-6 sticky top-0 z-40 backdrop-blur-xl">
          <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full bg-white/10" />
              <div className="space-y-2">
                 <Skeleton className="h-6 w-32 bg-white/10" />
                 <Skeleton className="h-3 w-24 bg-white/5" />
              </div>
          </div>
          <Skeleton className="h-9 w-32 rounded-xl bg-white/10" />
       </div>

       <div className="flex-1 max-w-7xl mx-auto w-full p-6">
            {/* Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-[300px] rounded-[2rem] border border-white/5 bg-white/5 p-6 flex flex-col justify-between">
                        <div className="space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="space-y-2 w-3/4">
                                    <Skeleton className="h-6 w-full bg-white/10" />
                                    <Skeleton className="h-4 w-1/2 bg-white/5" />
                                </div>
                                <Skeleton className="h-8 w-8 rounded-full bg-white/5" />
                            </div>
                            <Skeleton className="h-6 w-24 rounded-full bg-white/5 mt-2" />
                            <div className="space-y-2 pt-2">
                                <Skeleton className="h-4 w-full bg-white/5" />
                                <Skeleton className="h-4 w-full bg-white/5" />
                                <Skeleton className="h-4 w-full bg-white/5" />
                            </div>
                        </div>
                        <Skeleton className="h-10 w-full rounded-xl bg-white/10 mt-4" />
                    </div>
                ))}
            </div>
       </div>
    </div>
  );
}