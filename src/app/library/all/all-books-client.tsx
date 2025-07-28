
"use client";

import * as React from "react";
import Image from "next/image";
import { ArrowUpDown, Edit, Search } from "lucide-react";
import { z } from "zod";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { onBooksUpdate, updateBook, updateTags } from "@/lib/dataService";
import type { Book } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { BookDetailDialog } from "@/components/book-detail-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BookForm, BookFormData } from "@/components/new-book-form";
import { useToast } from "@/hooks/use-toast";
import { onTagsUpdate } from "@/lib/dataService";
import { Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";


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

type SortKey = keyof Book | null;

export function AllBooksClient() {
  const [books, setBooks] = React.useState<Book[]>([]);
  const [allTags, setAllTags] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  
  const [sortKey, setSortKey] = React.useState<SortKey>(null);
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');

  const [editingBook, setEditingBook] = React.useState<Book | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const { toast } = useToast();
  const formMethods = useForm<BookFormData>({ resolver: zodResolver(bookFormSchema) });


  React.useEffect(() => {
    const unsubscribeBooks = onBooksUpdate((allBooks) => {
      setBooks(allBooks);
      setLoading(false);
    });
    const unsubscribeTags = onTagsUpdate(setAllTags);
    return () => {
        unsubscribeBooks();
        unsubscribeTags();
    };
  }, []);

  const handleOpenEditDialog = React.useCallback((bookToEdit: Book) => {
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


  const sortedAndFilteredBooks = React.useMemo(() => {
    let filtered = books.filter(book => 
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (book.author && book.author.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (book.tags && book.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
    );

    if (sortKey) {
        filtered.sort((a, b) => {
            const valA = a[sortKey as keyof Book];
            const valB = b[sortKey as keyof Book];
            
            if (valA === undefined || valA === null) return 1;
            if (valB === undefined || valB === null) return -1;
            
            if (typeof valA === 'string' && typeof valB === 'string') {
                return sortDirection === 'asc' ? valA.localeCompare(valB, 'tr') : valB.localeCompare(valA, 'tr');
            }
            if (typeof valA === 'number' && typeof valB === 'number') {
                return sortDirection === 'asc' ? valA - valB : valB - valA;
            }
            return 0;
        });
    }

    return filtered;
  }, [books, searchTerm, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
      if (sortKey === key) {
          setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
      } else {
          setSortKey(key);
          setSortDirection('asc');
      }
  }

  const getSortIcon = (key: SortKey) => {
      if (sortKey !== key) {
          return <ArrowUpDown className="ml-2 h-4 w-4" />;
      }
      return sortDirection === 'asc' ? <ArrowUpDown className="ml-2 h-4 w-4" /> : <ArrowUpDown className="ml-2 h-4 w-4" />; // Could use ArrowUp/Down for more clarity
  };

  return (
    <>
      <div className="space-y-6">
        <PageHeader title="Tüm Kitaplar" />

        <div className="flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Başlık, yazar veya raf ara..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <Card>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[80px]">Kapak</TableHead>
                        <TableHead><Button variant="ghost" onClick={() => handleSort('title')}>Başlık {getSortIcon('title')}</Button></TableHead>
                        <TableHead><Button variant="ghost" onClick={() => handleSort('author')}>Yazar {getSortIcon('author')}</Button></TableHead>
                        <TableHead className="text-center"><Button variant="ghost" onClick={() => handleSort('pageCount')}>Sayfa {getSortIcon('pageCount')}</Button></TableHead>
                        <TableHead>Raflar</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedAndFilteredBooks.map(book => (
                        <TableRow key={book.id} onClick={() => handleOpenEditDialog(book)} className="cursor-pointer">
                            <TableCell>
                                <Image src={book.image || 'https://placehold.co/80x120.png'} alt={book.title} width={40} height={60} className="rounded-sm" data-ai-hint="book cover" />
                            </TableCell>
                            <TableCell className="font-medium">{book.title}</TableCell>
                            <TableCell>{book.author}</TableCell>
                            <TableCell className="text-center">{book.pageCount}</TableCell>
                            <TableCell>
                                <div className="flex flex-wrap gap-1">
                                    {book.tags?.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
             {loading && (
                <p className="text-center text-muted-foreground p-8">Yükleniyor...</p>
            )}
            {!loading && sortedAndFilteredBooks.length === 0 && (
                <div className="text-center text-muted-foreground p-8">Sonuç bulunamadı.</div>
            )}
        </Card>

      </div>
        
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
