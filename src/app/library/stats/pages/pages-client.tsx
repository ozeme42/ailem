
"use client";

import * as React from "react";
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { onBooksUpdate } from '@/lib/dataService';
import type { Book } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Book as BookIcon, ArrowDownWideNarrow, ArrowUpWideNarrow } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function PagesClient() {
  const router = useRouter();
  const { familyId } = useAuth();
  const [books, setBooks] = React.useState<Book[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sortOrder, setSortOrder] = React.useState<'desc' | 'asc'>('desc');

  React.useEffect(() => {
    const unsubscribeBooks = onBooksUpdate((allBooks) => {
      setBooks(allBooks);
      setLoading(false);
    });
    return () => unsubscribeBooks();
  }, [familyId]);

  const sortedBooks = React.useMemo(() => {
    return [...books]
      .filter(book => book.pageCount && book.pageCount > 0)
      .sort((a, b) => {
        const pageA = a.pageCount || 0;
        const pageB = b.pageCount || 0;
        return sortOrder === 'desc' ? pageB - pageA : pageA - pageB;
      });
  }, [books, sortOrder]);

  if (loading) {
    return (
        <div className="space-y-6">
            <PageHeader title="Sayfa Sayısı Sıralaması">
                <Skeleton className="h-10 w-28" />
            </PageHeader>
            <Card>
                <CardContent className="p-4 space-y-2">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Sayfa Sayısı Sıralaması">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön
        </Button>
      </PageHeader>
      
      <div className="flex justify-end gap-2">
        <Button
            variant={sortOrder === 'desc' ? 'default' : 'outline'}
            onClick={() => setSortOrder('desc')}
        >
            <ArrowDownWideNarrow className="mr-2 h-4 w-4"/> Çoktan Aza
        </Button>
        <Button
            variant={sortOrder === 'asc' ? 'default' : 'outline'}
            onClick={() => setSortOrder('asc')}
        >
            <ArrowUpWideNarrow className="mr-2 h-4 w-4"/> Azdan Çoğa
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="space-y-2">
            {sortedBooks.map((book, index) => (
              <div key={book.id} className="flex items-center gap-4 p-3 border rounded-lg">
                  <span className="font-bold text-lg text-muted-foreground w-6 text-center">{index + 1}</span>
                  <BookIcon className="h-5 w-5 text-primary" />
                  <div className="flex-grow">
                    <p className="font-semibold">{book.title}</p>
                    <p className="text-sm text-muted-foreground">{book.author}</p>
                  </div>
                  <Badge variant="secondary">{book.pageCount} sayfa</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
