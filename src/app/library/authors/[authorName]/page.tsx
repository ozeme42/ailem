
"use client";

import * as React from "react";
import Link from 'next/link';
import Image from "next/image";
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { onBooksUpdate, onTagsUpdate, updateBook, updateTags } from '@/lib/dataService';
import type { Book } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Library, Loader2 } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { BookDetailDialog } from '@/components/book-detail-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BookForm, BookFormData } from '@/components/new-book-form';
import { useToast } from "@/hooks/use-toast";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const bookFormSchema = z.object({
  title: z.string().min(2, "Kitap adı en az 2 karakter olmalıdır."),
  author: z.string().optional(),
  pageCount: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.coerce.number().min(1, "Sayfa sayısı pozitif bir sayı olmalı.").optional()
  ),
  isForChildren: z.boolean().default(false),
  image: z.string().optional(),
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
  rating: z.number().optional(),
});

export default function AuthorBooksPage() {
  const router = useRouter();
  const params = useParams();
  const authorName = decodeURIComponent(params.authorName as string);
  
  const { familyId } = useAuth();
  const { toast } = useToast();
  const [books, setBooks] = React.useState<Book[]>([]);
  const [allTags, setAllTags] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [viewingBook, setViewingBook] = React.useState<Book | null>(null);
  const [editingBook, setEditingBook] = React.useState<Book | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const formMethods = useForm<BookFormData>({ resolver: zodResolver(bookFormSchema) });

  React.useEffect(() => {
    const unsubscribeBooks = onBooksUpdate((allBooks) => {
      setBooks(allBooks.filter(book => book.author === authorName));
      setLoading(false);
    });
    const unsubscribeTags = onTagsUpdate(setAllTags);
    return () => {
        unsubscribeBooks();
        unsubscribeTags();
    };
  }, [familyId, authorName]);
  
  const handleOpenEditDialog = React.useCallback((bookToEdit: Book) => {
    setViewingBook(null); // Close detail dialog
    setTimeout(() => { // Allow detail dialog to close before opening edit
        setEditingBook(bookToEdit);
        formMethods.reset({
            title: bookToEdit.title,
            author: bookToEdit.author,
            pageCount: bookToEdit.pageCount,
            image: bookToEdit.image,
            isForChildren: bookToEdit.isForChildren,
            tags: bookToEdit.tags || [],
            description: bookToEdit.description || '',
            rating: bookToEdit.rating || 0,
        });
    }, 150);
  }, [formMethods]);

  const handleUpdateBook = async (formData: BookFormData) => {
      if (!editingBook) return;
      setIsSubmitting(true);
      try {
          const bookData: any = { ...formData };
          if (bookData.pageCount === undefined) {
            delete bookData.pageCount;
          }
          const newTags = new Set([...allTags, ...(bookData.tags || [])]);
          await updateTags(Array.from(newTags));
          await updateBook(editingBook.id, bookData);
          toast({ title: "Kitap Güncellendi" });
          setEditingBook(null);
      } catch (e: any) {
          console.error(e);
          toast({ title: "❌ Hata", description: "Kitap güncellenirken bir hata oluştu.", variant: 'destructive' });
      } finally {
          setIsSubmitting(false);
      }
  };


  if (loading) {
    return <AuthorBooksSkeleton authorName={authorName} />;
  }

  return (
    <>
    <div className="space-y-6">
      <PageHeader title={authorName}>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön
        </Button>
      </PageHeader>
      
      {books.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {books.map(book => (
            <div key={book.id} onClick={() => setViewingBook(book)} className="group cursor-pointer">
                <Card className="overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 relative">
                    <Image src={book.image || 'https://placehold.co/300x450.png'} alt={book.title} width={300} height={450} className="w-full h-auto object-cover aspect-[2/3]" data-ai-hint="book cover" />
                </Card>
                <p className="mt-2 text-sm font-semibold truncate group-hover:text-primary">{book.title}</p>
            </div>
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

    <BookDetailDialog 
        book={viewingBook}
        isOpen={!!viewingBook}
        onOpenChange={setViewingBook}
        onEdit={handleOpenEditDialog}
    />
    
    <Dialog open={!!editingBook} onOpenChange={(open) => !open && setEditingBook(null)}>
        <DialogContent className="sm:max-w-lg">
            <FormProvider {...formMethods}>
            <form onSubmit={formMethods.handleSubmit(handleUpdateBook)} className="flex flex-col h-full">
                <DialogHeader>
                    <DialogTitle>Kitabı Düzenle</DialogTitle>
                </DialogHeader>
                <div className="flex-1 min-h-0 py-4">
                    <BookForm existingTags={allTags} />
                </div>
                 <div className="pt-4 border-t flex-shrink-0">
                  <Button type="submit" disabled={isSubmitting} className="w-full">
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Kaydet
                  </Button>
                </div>
            </form>
            </FormProvider>
        </DialogContent>
    </Dialog>
    </>
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
