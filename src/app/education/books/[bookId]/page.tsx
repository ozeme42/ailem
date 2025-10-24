import { Suspense } from 'react';
import { BookDetailClient } from './book-detail-client';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export default function BookDetailPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<BookDetailSkeleton />}>
        <BookDetailClient />
      </Suspense>
    </div>
  );
}

function BookDetailSkeleton() {
  return (
    <div className="space-y-6">
       <PageHeader title="Kitap Detayı Yükleniyor...">
          <Skeleton className="h-10 w-24" />
       </PageHeader>
        <Card className="p-6">
            <div className="flex items-center gap-6">
                <Skeleton className="h-8 w-48" />
            </div>
        </Card>
        <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
        </div>
    </div>
  );
}
