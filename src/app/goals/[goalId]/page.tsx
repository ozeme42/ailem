
import { Suspense } from 'react';
import GoalDetailClient from './goal-detail-client';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export default function GoalDetailPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<GoalDetailSkeleton />}>
        <GoalDetailClient />
      </Suspense>
    </div>
  );
}


function GoalDetailSkeleton() {
  return (
    <div className="space-y-6">
       <PageHeader title="Yol Haritası Yükleniyor...">
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
