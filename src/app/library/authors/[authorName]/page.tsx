
"use client";

import * as React from "react";
import Link from 'next/link';
import Image from "next/image";
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { onBooksUpdate } from '@/lib/dataService';
import type { Book } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Library } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";

export default function AuthorBooksPage() {
  const router = useRouter();
  const params = useParams();
  const authorName = decodeURIComponent(params.authorName as string);
  
  const { familyId } = useAuth();
  const [books, setBooks] = React.useState<Book[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribeBooks = onBooksUpdate((allBooks) => {
      setBooks(allBooks.filter(book => book.author === authorName));
      setLoading(false);
    });
    return () => unsubscribeBooks();
  }, [familyId, authorName]);

  if (loading) {
    return <AuthorBooksSkeleton authorName={authorName} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={authorName}>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön
        </Button>
      </PageHeader>
      
      {books.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {books.map(book => (
             <Link key={book.id} href={`/library/archive`}>
                <div className="group cursor-pointer">
                    <Card className="overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 relative">
                        <Image src={book.image} alt={book.title} width={300} height={450} className="w-full h-auto object-cover aspect-[2/3]" data-ai-hint="book cover" />
                    </Card>
                    <p className="mt-2 text-sm font-semibold truncate group-hover:text-primary">{book.title}</p>
                </div>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Library className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-md font-medium">Bu yazara ait kitap bulunamadı.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


function AuthorBooksSkeleton({ authorName }: { authorName: string }) {
    return (
      <div className="space-y-6">
        <PageHeader title={authorName}>
          <Skeleton className="h-10 w-28" />
        </PageHeader>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="w-full aspect-[2/3]" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
}
