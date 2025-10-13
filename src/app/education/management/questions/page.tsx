
import { Suspense } from 'react';
import QuestionsClient from './questions-client';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function QuestionBankPage() {
  return (
    <div className="h-full">
        <PageHeader title="Soru Bankası Yönetimi">
            <Link href="/education/management">
                <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Yönetim Paneline Geri Dön
                </Button>
            </Link>
        </PageHeader>
      <Suspense fallback={<QuestionsSkeleton />}>
        <QuestionsClient />
      </Suspense>
    </div>
  );
}


function QuestionsSkeleton() {
  return (
    <div className="space-y-6 mt-6">
        <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
        </div>
    </div>
  );
}

