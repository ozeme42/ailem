import { Suspense } from 'react';
import BookDetailClient from './book-detail-client'; 
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = {
  title: "Kitap Detayı | Eğitim Asistanı",
  description: "Kitap konuları, testleri ve ilerleme durumu.",
};

export default function BookDetailPage() {
  return (
    <Suspense fallback={<BookDetailSkeleton />}>
        <BookDetailClient />
    </Suspense>
  );
}

function BookDetailSkeleton() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
       {/* Header Skeleton */}
       <div className="h-20 w-full bg-slate-900/50 border-b border-white/5 flex items-center px-6 gap-4 sticky top-0 z-40">
          <Skeleton className="h-10 w-10 rounded-full bg-white/10" />
          <div className="space-y-2">
             <Skeleton className="h-6 w-48 bg-white/10" />
             <Skeleton className="h-3 w-24 bg-white/5" />
          </div>
       </div>

       <div className="flex-1 max-w-5xl mx-auto w-full p-6 space-y-8">
            {/* Summary Card Skeleton */}
            <div className="rounded-3xl border border-white/5 bg-white/5 p-6 flex flex-col sm:flex-row justify-between gap-6">
                <div className="space-y-2">
                    <Skeleton className="h-6 w-32 bg-white/10" />
                    <Skeleton className="h-4 w-48 bg-white/5" />
                </div>
                <div className="flex gap-8">
                     <div className="flex flex-col items-center gap-2">
                        <Skeleton className="h-8 w-8 bg-white/10" />
                        <Skeleton className="h-3 w-12 bg-white/5" />
                     </div>
                     <div className="flex flex-col items-center gap-2">
                        <Skeleton className="h-8 w-8 bg-white/10" />
                        <Skeleton className="h-3 w-12 bg-white/5" />
                     </div>
                </div>
            </div>

            {/* List Skeleton */}
            <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-16 w-full rounded-2xl bg-white/5 border border-white/5 animate-pulse" />
                ))}
            </div>
       </div>
    </div>
  );
}
