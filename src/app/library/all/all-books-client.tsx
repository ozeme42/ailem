
"use client";

import * as React from "react";
import Image from "next/image";
import { ArrowUpDown, Edit, Loader2, Search, X, Filter, SlidersHorizontal } from "lucide-react";
import { z } from "zod";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { onBooksUpdate, updateBook, updateTags } from "@/lib/dataService";
import type { Book } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BookForm, BookFormData } from "@/components/new-book-form";
import { useToast } from "@/hooks/use-toast";
import { onTagsUpdate } from "@/lib/dataService";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";


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
  
  // Filtering states
  const [searchTerm, setSearchTerm] = React.useState("");
  const [showOnlyChildrenBooks, setShowOnlyChildrenBooks] = React.useState(false);
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  
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
    const unsubscribeTags = onTagsUpdate("libraryTags", setAllTags);
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
    let filtered = books
      .filter(book => {
          // Search term filter
          const searchLower = searchTerm.toLowerCase();
          const searchMatch = searchLower === '' ||
            book.title.toLowerCase().includes(searchLower) ||
            (book.author && book.author.toLowerCase().includes(searchLower));
          
          // Children's book filter
          const childrenMatch = book.isForChildren === showOnlyChildrenBooks;

          // Tags filter
          const tagsMatch = selectedTags.length === 0 || 
            selectedTags.every(filterTag => (book.tags || []).includes(filterTag));
          
          return searchMatch && childrenMatch && tagsMatch;
      });

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
  }, [books, searchTerm, sortKey, sortDirection, showOnlyChildrenBooks, selectedTags]);

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
  
  const handleTagSelect = (tag: string) => {
    setSelectedTags(prev => 
        prev.includes(tag) 
            ? prev.filter(t => t !== tag) 
            : [...prev, tag]
    );
  };


  return (
    <>
      <div className="space-y-6">
        <PageHeader title="Tüm Kitaplar" />

        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative w-full flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Başlık veya yazar ara..." 
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-4 self-stretch sm:self-center">
                <div className="flex items-center space-x-2">
                    <Switch 
                        id="children-books-only"
                        checked={showOnlyChildrenBooks}
                        onCheckedChange={setShowOnlyChildrenBooks}
                    />
                    <Label htmlFor="children-books-only">Sadece Çocuk</Label>
                </div>
                 <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline">
                        <SlidersHorizontal className="mr-2 h-4 w-4" />
                        Raflar ({selectedTags.length})
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0">
                      <Command>
                        <CommandInput placeholder="Raf ara..." />
                        <CommandList>
                          <CommandEmpty>Raf bulunamadı.</CommandEmpty>
                          <CommandGroup>
                            {allTags.sort().map(tag => (
                              <CommandItem
                                key={tag}
                                onSelect={() => handleTagSelect(tag)}
                                className="cursor-pointer"
                              >
                                <div className={cn(
                                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                    selectedTags.includes(tag) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                                )}>
                                    <X className="h-4 w-4" />
                                </div>
                                <span>{tag}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
              </div>
            </div>
            {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-sm font-medium">Filtreler:</span>
                    {selectedTags.map(tag => (
                        <Badge key={tag} variant="secondary">
                            {tag}
                            <button onClick={() => handleTagSelect(tag)} className="ml-1.5 rounded-full p-0.5 hover:bg-background/50">
                                <X className="h-3 w-3"/>
                            </button>
                        </Badge>
                    ))}
                    <Button variant="ghost" size="sm" onClick={() => setSelectedTags([])}>Tümünü Temizle</Button>
                </div>
            )}
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
                <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
            )}
            {!loading && sortedAndFilteredBooks.length === 0 && (
                <div className="text-center text-muted-foreground p-8">Filtrelerle eşleşen sonuç bulunamadı.</div>
            )}
        </Card>

      </div>
        
        <Dialog open={!!editingBook} onOpenChange={(open) => !open && setEditingBook(null)}>
          <DialogContent className="w-[95vw] md:max-w-2xl lg:max-w-3xl flex flex-col max-h-[90dvh] rounded-[2rem] p-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <FormProvider {...formMethods}>
              <form
                id="book-form"
                onSubmit={formMethods.handleSubmit(handleUpdateBook)}
                className="flex flex-col min-h-0 flex-1"
              >
                <DialogHeader className="p-6 pb-4 shrink-0 border-b border-slate-100 dark:border-slate-800">
                  <DialogTitle className="text-xl font-bold text-slate-800 dark:text-slate-100">Kitabı Düzenle</DialogTitle>
                </DialogHeader>
                <div className="overflow-y-auto p-6 flex-1 min-h-0">
                  <BookForm existingTags={allTags} />
                </div>
                <DialogFooter className="p-4 shrink-0 border-t border-slate-100 dark:border-slate-800 flex flex-row justify-end gap-2 sm:gap-3">
                  <Button variant="ghost" type="button" onClick={() => setEditingBook(null)} disabled={isSubmitting} className="rounded-full font-medium px-5">İptal</Button>
                  <Button type="submit" disabled={isSubmitting} className="rounded-full font-medium px-6 bg-indigo-600 text-white hover:bg-indigo-700 shadow-md">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Kaydet
                  </Button>
                </DialogFooter>
              </form>
            </FormProvider>
          </DialogContent>
      </Dialog>
    </>
  );
}
