
import { Suspense } from 'react';
import { PomodoroClient } from './pomodoro-client';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';

export default function PomodoroPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<PomodoroSkeleton />}>
        <PomodoroClient />
      </Suspense>
    </div>
  );
}

function PomodoroSkeleton() {
  return (
    <div className="space-y-6">
       <PageHeader title="Pomodoro Zamanlayıcı">
          <Skeleton className="h-10 w-32" />
       </PageHeader>
        <div className="flex justify-center">
            <Skeleton className="h-64 w-64 rounded-full" />
        </div>
        <div className="flex justify-center gap-4">
            <Skeleton className="h-12 w-32" />
            <Skeleton className="h-12 w-32" />
        </div>
    </div>
  );
}
