
import { Suspense } from 'react';
import { PlanDetailClient } from './plan-detail-client';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export default function StudyPlanDetailPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<PlanDetailSkeleton />}>
        <PlanDetailClient />
      </Suspense>
    </div>
  );
}

function PlanDetailSkeleton() {
  return (
    <div className="space-y-6">
       <PageHeader title="Plan Detayı Yükleniyor...">
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
