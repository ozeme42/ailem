
import { Suspense } from 'react';
import ProfileClient from '@/app/education/profile/[memberId]/profile-client';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function MemberProfilePage() {
  return (
    <div className="h-full">
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileClient />
      </Suspense>
    </div>
  );
}


function ProfileSkeleton() {
  return (
    <div className="space-y-6">
       <PageHeader title="Profil Yükleniyor...">
          <Skeleton className="h-10 w-24" />
       </PageHeader>
        <Card className="p-6">
            <div className="flex items-center gap-6">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-32" />
                </div>
            </div>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
        </div>
        <div>
            <Skeleton className="h-10 w-full mb-4" />
            <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
            </div>
        </div>
    </div>
  );
}

