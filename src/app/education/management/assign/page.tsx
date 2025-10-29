
import { Suspense } from 'react';
import AssignClient from './assign-client';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookCopy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AssignTestPage() {
  return (
    <div className="h-full">
        <PageHeader title="Ödev Ata">
             <div className="flex gap-2 flex-wrap">
                <Link href="/education/management">
                    <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Yönetim Paneline Geri Dön
                    </Button>
                </Link>
                 <Link href="/education/management/practice-exams">
                    <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none">
                        <BookCopy className="mr-2 h-4 w-4" /> Deneme Sınavları
                    </Button>
                </Link>
            </div>
        </PageHeader>
        <Card className="mt-6">
            <CardHeader>
                <CardTitle>Yeni Test Oluştur</CardTitle>
                <CardDescription>Oluşturmak istediğiniz ödev türünü seçin ve detayları doldurun.</CardDescription>
            </CardHeader>
            <CardContent>
                <Suspense fallback={<AssignSkeleton />}>
                    <AssignClient />
                </Suspense>
            </CardContent>
        </Card>
    </div>
  );
}


function AssignSkeleton() {
  return (
    <div className="space-y-6 mt-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
    </div>
  );
}
