
"use client";

import * as React from "react";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { onBooksUpdate } from '@/lib/dataService';
import type { Book } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Book as BookIcon } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";

type AuthorStat = {
  name: string;
  count: number;
};

export default function AuthorsStatsPage() {
  const router = useRouter();
  const { familyId } = useAuth();
  const [books, setBooks] = React.useState<Book[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribeBooks = onBooksUpdate((allBooks) => {
      setBooks(allBooks);
      setLoading(false);
    });
    return () => unsubscribeBooks();
  }, [familyId]);

  const authorStats = React.useMemo(() => {
    const authorCounts = new Map<string, number>();
    books.forEach(book => {
      if (book.author) {
        authorCounts.set(book.author, (authorCounts.get(book.author) || 0) + 1);
      }
    });

    return Array.from(authorCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [books]);

  if (loading) {
    return <AuthorsStatsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Yazar Sıralaması">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön
        </Button>
      </PageHeader>
      
      <Card>
        <CardContent className="p-4">
          <div className="space-y-2">
            {authorStats.map((stat, index) => (
              <Link key={stat.name} href={`/library/authors/${encodeURIComponent(stat.name)}`} passHref>
                <div className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted transition-colors cursor-pointer">
                  <span className="font-bold text-lg text-muted-foreground w-6 text-center">{index + 1}</span>
                  <User className="h-5 w-5 text-primary" />
                  <p className="font-semibold flex-grow">{stat.name}</p>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <BookIcon className="h-4 w-4" />
                    <span className="font-bold text-primary">{stat.count}</span> kitap
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AuthorsStatsSkeleton() {
    return (
        <div className="space-y-6">
            <PageHeader title="Yazar Sıralaması">
                <Skeleton className="h-10 w-28" />
            </PageHeader>
            <Card>
                <CardContent className="p-4 space-y-2">
                    {[...Array(5)].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </CardContent>
            </Card>
        </div>
    )
}
