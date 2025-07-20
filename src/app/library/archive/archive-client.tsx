"use client";

import React, { useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Book, familyMembers, mediaItems } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { searchBooks } from '@/ai/flows/search-books-flow';
import { Loader2, PlusCircle, Search, Trash2, Library, FilePlus, AlertTriangle } from 'lucide-react';

// SCHEMAS & TYPES
const bookFormSchema = z.object({
  title: z.string().min(2, "Kitap adı en az 2 karakter olmalıdır."),
  author: z.string().optional(),
  pageCount: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.coerce.number().min(1, "Sayfa sayısı pozitif bir sayı olmalı.").optional()
  ),
  isForChildren: z.boolean().default(false),
  image: z.string().url().optional().or(z.literal('')),
});
type BookFormData = z.infer<typeof bookFormSchema>;

const bulkAddJsonSchema = z.array(bookFormSchema).min(1, "En az bir kitap eklemelisiniz.");

// BOOK FORM COMPONENT
const BookForm = () => {
  const { control } = useFormContext<BookFormData>();
  return (
    <div className="space-y-4">
      <FormField control={control} name="title" render={({ field }) => (
        <FormItem><FormLabel>Kitap Adı</FormLabel><FormControl><Input placeholder="Kitabın adını girin..." {...field} /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={control} name="author" render={({ field }) => (
        <FormItem><FormLabel>Yazar</FormLabel><FormControl><Input placeholder="Yazar Adı (Opsiyonel)" {...field} /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={control} name="pageCount" render={({ field }) => (
        <FormItem><FormLabel>Sayfa Sayısı</FormLabel><FormControl><Input type="number" placeholder="Toplam Sayfa" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
      )} />
       <FormField control={control} name="image" render={({ field }) => (
        <FormItem><FormLabel>Kapak Resmi URL</FormLabel><FormControl><Input placeholder="https://" {...field} /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={control} name="isForChildren" render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
          <div className="space-y-0.5"><FormLabel>Çocuk Kitabı</FormLabel></div>
          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
        </FormItem>
      )} />
    </div>
  );
};

// ARCHIVE CLIENT COMPONENT
export default function ArchiveClient() {
  const [books, setBooks] = useState<Book[]>(mediaItems);
  const [isAddBookDialogOpen, setIsAddBookDialogOpen] = useState(false);
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [isBulkJsonDialogOpen, setIsBulkJsonDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Partial<Book>[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const { toast } = useToast();
  const formMethods = useForm<BookFormData>({ resolver: zodResolver(bookFormSchema) });

  const handleOpenAddDialog = useCallback((initialData: Partial<Book> | null = null) => {
    setEditingBook(initialData && 'id' in initialData ? initialData as Book : null);
    formMethods.reset({
        title: initialData?.title || '',
        author: initialData?.author || '',
        pageCount: initialData?.pageCount,
        image: initialData?.image || '',
        isForChildren: initialData?.isForChildren || false,
    });
    setIsAddBookDialogOpen(true);
  }, [formMethods]);

  const handleAddOrUpdateBook = (formData: BookFormData) => {
    if (editingBook) {
      setBooks(prev => prev.map(b => b.id === editingBook.id ? { ...b, ...formData } : b));
      toast({ title: "Kitap Güncellendi" });
    } else {
      const newBook: Book = {
        ...formData,
        id: Date.now(),
        type: 'Kitap',
        rating: 0,
        description: '',
      };
      setBooks(prev => [...prev, newBook]);
      toast({ title: "Kitap Eklendi" });
    }
    setIsAddBookDialogOpen(false);
  };

  const handleDeleteBook = (bookId: number) => {
    setBooks(prev => prev.filter(b => b.id !== bookId));
    toast({ title: "Kitap Silindi", variant: 'destructive' });
  };
  
  const handleAddToMyLibrary = (book: Book) => {
      // In a real app, this would update the specific user's library.
      // For now, we'll just show a toast.
      const member = familyMembers[Math.floor(Math.random() * familyMembers.length)];
      toast({
          title: `"${book.title}"`,
          description: `${member.name} kullanıcısının kitaplığına eklendi.`
      });
  }

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    setSearchError(null);
    try {
        const result = await searchBooks(query.trim());
        if (result.success && result.books) {
            if (result.books.length === 0) setSearchError('Aradığınız kriterlere uygun kitap bulunamadı.');
            setSearchResults(result.books);
        } else {
            setSearchError(result.error || 'Bilinmeyen bir arama hatası oluştu.');
        }
    } catch (e) {
        setSearchError('Arama sırasında beklenmedik bir hata oluştu.');
    } finally {
        setIsSearching(false);
    }
  }, []);
  
  const handleSelectSearchResult = (book: Partial<Book>) => {
    setIsSearchDialogOpen(false);
    handleOpenAddDialog(book);
  };
  
  const handleBulkImport = (importedBooks: Partial<Book>[]) => {
    const newBooks: Book[] = importedBooks.map((book, index) => ({
        ...book,
        id: Date.now() + index,
        type: 'Kitap',
        rating: 0,
        description: '',
    }));
    setBooks(prev => [...prev, ...newBooks]);
    toast({ title: `${newBooks.length} kitap başarıyla eklendi.` });
    setIsBulkJsonDialogOpen(false);
  };

  const { adultBooks, childrenBooks } = useMemo(() => {
    const adults: Book[] = [];
    const children: Book[] = [];
    books.forEach(book => (book.isForChildren ? children.push(book) : adults.push(book)));
    return { adultBooks, childrenBooks };
  }, [books]);

  return (
    <>
      <PageHeader title="Kitaplığımız">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsSearchDialogOpen(true)}><Search className="mr-2 h-4 w-4"/> Kitap Bul</Button>
            <Button onClick={() => handleOpenAddDialog()}><PlusCircle className="mr-2 h-4 w-4"/> Yeni Kitap Ekle</Button>
            <Button variant="outline" onClick={() => setIsBulkJsonDialogOpen(true)}><FilePlus className="mr-2 h-4 w-4"/> Toplu Ekle</Button>
          </div>
      </PageHeader>
      
      <Tabs defaultValue="adults" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="adults">Yetişkin Kitapları ({adultBooks.length})</TabsTrigger>
          <TabsTrigger value="children">Çocuk Kitapları ({childrenBooks.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="adults" className="mt-6">
            <BookShelf books={adultBooks} onAddToLibrary={handleAddToMyLibrary} onEdit={handleOpenAddDialog} onDelete={handleDeleteBook} />
        </TabsContent>
        <TabsContent value="children" className="mt-6">
            <BookShelf books={childrenBooks} onAddToLibrary={handleAddToMyLibrary} onEdit={handleOpenAddDialog} onDelete={handleDeleteBook} />
        </TabsContent>
      </Tabs>

      {/* Add/Edit Book Dialog */}
      <Dialog open={isAddBookDialogOpen} onOpenChange={setIsAddBookDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBook ? 'Kitabı Düzenle' : 'Yeni Kitap Ekle'}</DialogTitle>
          </DialogHeader>
          <FormProvider {...formMethods}>
            <form onSubmit={formMethods.handleSubmit(handleAddOrUpdateBook)} id="book-form">
              <BookForm />
            </form>
          </FormProvider>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddBookDialogOpen(false)}>İptal</Button>
            <Button type="submit" form="book-form">{editingBook ? 'Kaydet' : 'Ekle'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
       {/* Search Dialog */}
      <Dialog open={isSearchDialogOpen} onOpenChange={setIsSearchDialogOpen}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>İnternette Kitap Ara</DialogTitle>
                <DialogDescription>Kitapları başlık, yazar veya ISBN ile arayın.</DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 pt-4">
                <Input placeholder="Kitap adı, yazar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)} />
                <Button type="submit" disabled={isSearching} onClick={() => handleSearch(searchQuery)}>
                  {isSearching ? <Loader2 className="animate-spin" /> : <Search />}
                </Button>
            </div>
            {searchError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Arama Hatası</AlertTitle>
                  <AlertDescription>{searchError}</AlertDescription>
                </Alert>
            )}
            <ScrollArea className="h-64 mt-4">
                <div className="space-y-2 pr-4">
                  {searchResults.map((book, idx) => (
                    <div key={`${book.title}-${idx}`} onClick={() => handleSelectSearchResult(book)} className="flex items-center gap-4 p-3 border rounded-lg cursor-pointer hover:bg-muted transition-colors">
                      <Image src={book.image || 'https://placehold.co/80x120.png'} alt={book.title || ''} width={40} height={60} className="object-cover rounded-sm shadow-md" data-ai-hint="book cover"/>
                      <div className="flex-grow">
                        <p className="font-semibold text-sm">{book.title}</p>
                        <p className="text-xs text-muted-foreground">{book.author}</p>
                      </div>
                    </div>
                  ))}
                </div>
            </ScrollArea>
        </DialogContent>
      </Dialog>
      
      {/* Bulk Add JSON Dialog */}
      <BulkAddJsonDialog open={isBulkJsonDialogOpen} onOpenChange={setIsBulkJsonDialogOpen} onImport={handleBulkImport} />
    </>
  );
}

// BOOKSHELF COMPONENT
function BookShelf({ books, onAddToLibrary, onEdit, onDelete }: { books: Book[], onAddToLibrary: (book: Book) => void, onEdit: (book: Book) => void, onDelete: (id: number) => void }) {
  const shelves = useMemo(() => {
    const grouped: Record<string, Book[]> = {};
    books.forEach(book => {
      const shelfName = book.genre || "Diğer";
      if (!grouped[shelfName]) grouped[shelfName] = [];
      grouped[shelfName].push(book);
    });
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [books]);

  if (books.length === 0) {
     return <div className="text-center text-muted-foreground py-16 flex flex-col items-center justify-center border-2 border-dashed rounded-lg bg-muted/20">
          <Library className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-md">Bu kategoride gösterilecek kitap yok.</p>
      </div>;
  }

  return (
    <div className="space-y-8">
      {shelves.map(([shelfName, shelfBooks]) => (
        <div key={shelfName}>
          <h3 className="text-xl font-bold mb-4">{shelfName} ({shelfBooks.length})</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-8">
            {shelfBooks.map(book => (
              <div key={book.id} className="group relative">
                <Card className="overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1">
                   <Image src={book.image || `https://placehold.co/300x450.png`} alt={book.title} width={300} height={450} className="w-full h-auto object-cover aspect-[2/3]" data-ai-hint="book cover" />
                </Card>
                <div className="mt-2 text-center">
                    <p className="font-semibold text-sm truncate" title={book.title}>{book.title}</p>
                    <p className="text-xs text-muted-foreground">{book.author}</p>
                </div>
                 <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" className="h-8 w-8" onClick={() => onAddToLibrary(book)}><PlusCircle className="h-4 w-4"/></Button>
                    <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => onEdit(book)}><Search className="h-4 w-4"/></Button>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button size="icon" variant="destructive" className="h-8 w-8"><Trash2 className="h-4 w-4"/></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Kitabı Sil</AlertDialogTitle><AlertDialogDescription>"{book.title}" kitabını kalıcı olarak silmek istediğinizden emin misiniz?</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => onDelete(book.id)}>Sil</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                 </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// BULK ADD JSON DIALOG
function BulkAddJsonDialog({ open, onOpenChange, onImport }: { open: boolean, onOpenChange: (open: boolean) => void, onImport: (books: Partial<Book>[]) => void }) {
    const [jsonInput, setJsonInput] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleImportClick = () => {
        setError(null);
        if (!jsonInput.trim()) return setError("Lütfen geçerli bir JSON verisi girin.");

        try {
            const parsed = JSON.parse(jsonInput);
            const result = bulkAddJsonSchema.safeParse(parsed);
            if (!result.success) {
                 const formattedErrors = result.error.errors.map(err => `[${err.path.join('.')}] ${err.message}`).join('\n');
                 setError(`JSON verisi doğrulanamadı:\n${formattedErrors}`);
                 return;
            }
            onImport(result.data);
            setJsonInput('');
        } catch (e) {
            setError("Geçersiz JSON formatı. Lütfen veriyi kontrol edin.");
        }
    };
    
    const exampleJson = `[
  {
    "title": "Yerdeniz Büyücüsü",
    "author": "Ursula K. Le Guin",
    "pageCount": 208,
    "isForChildren": false
  },
  {
    "title": "Küçük Prens",
    "author": "Antoine de Saint-Exupéry",
    "isForChildren": true
  }
]`;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Toplu Kitap Ekle (JSON)</DialogTitle>
                    <DialogDescription>Kitap listenizi JSON formatında yapıştırarak topluca ekleyin.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div>
                         <Label htmlFor="json-input" className="mb-2 block">JSON Verisi</Label>
                         <Textarea id="json-input" value={jsonInput} onChange={(e) => setJsonInput(e.target.value)} className="h-64 font-mono text-xs" />
                         {error && <p className="text-sm font-medium text-destructive mt-2 whitespace-pre-wrap">{error}</p>}
                    </div>
                    <div>
                         <Label className="mb-2 block">Örnek Format</Label>
                         <Card className="bg-muted/50 p-4 h-64 overflow-auto">
                            <pre className="text-xs font-mono"><code>{exampleJson}</code></pre>
                         </Card>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>İptal</Button>
                    <Button onClick={handleImportClick}>İçeri Aktar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

