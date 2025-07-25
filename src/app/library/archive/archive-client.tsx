
"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Book } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
import { migrateImage } from '@/ai/flows/migrate-image-flow';
import { Loader2, PlusCircle, Search, Trash2, Library, FilePlus, AlertTriangle, Edit, X, UploadCloud, ChevronRight, BookPlus, ChevronDown, Settings, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { onBooksUpdate, onTagsUpdate, addBook, updateBook, deleteBook, updateTags, addBookToMemberLibrary } from '@/lib/dataService';
import { useAuth } from '@/components/auth-provider';

// SCHEMAS & TYPES
const bookFormSchema = z.object({
  title: z.string().min(2, "Kitap adı en az 2 karakter olmalıdır."),
  author: z.string().optional(),
  pageCount: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.coerce.number().min(1, "Sayfa sayısı pozitif bir sayı olmalı.").optional()
  ),
  isForChildren: z.boolean().default(false),
  image: z.string().optional(), // Can be existing URL or new data URI for upload
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
  rating: z.number().optional(),
});
type BookFormData = z.infer<typeof bookFormSchema>;

const bulkAddJsonSchema = z.array(z.object({
  title: z.string().min(2, "Kitap adı en az 2 karakter olmalıdır."),
  author: z.string().optional(),
  pageCount: z.coerce.number().min(1).optional(),
  isForChildren: z.boolean().default(false),
  image: z.string().url("Geçerli bir URL olmalı").optional().or(z.literal('')),
  tags: z.array(z.string()).optional(),
})).min(1, "En az bir kitap eklemelisiniz.");

const shelfFormSchema = z.object({
    name: z.string().min(1, "Raf adı boş olamaz."),
});
type ShelfFormData = z.infer<typeof shelfFormSchema>;

// BOOK FORM COMPONENT
const BookForm = ({ existingTags }: { existingTags: string[] }) => {
  const { control, getValues, setValue, watch } = useFormContext<BookFormData>();
  const [newShelfMain, setNewShelfMain] = useState('');
  const [newShelfSub, setNewShelfSub] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const imageValue = watch('image');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setValue('image', reader.result as string, { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddShelf = () => {
    const main = newShelfMain.trim();
    const sub = newShelfSub.trim();
    if (!main) return;

    const newTag = sub ? `${main}/${sub}` : main;
    
    const currentTagsValue = getValues('tags') || [];
    if (!currentTagsValue.includes(newTag)) {
        setValue('tags', [...currentTagsValue, newTag], { shouldValidate: true });
    }
    setNewShelfMain('');
    setNewShelfSub('');
  };

  const removeTag = (tagToRemove: string) => {
    const currentTagsValue = getValues('tags') || [];
    setValue('tags', currentTagsValue.filter(tag => tag !== tagToRemove), { shouldValidate: true });
  };
  
  const handleToggleTag = (tag: string) => {
    const currentTagsValue = getValues('tags') || [];
    const newTags = currentTagsValue.includes(tag)
        ? currentTagsValue.filter((t) => t !== tag)
        : [...currentTagsValue, tag];
    setValue('tags', newTags, { shouldValidate: true });
  };
  
  const handleUseShelfAsTemplate = (shelfName: string) => {
    setNewShelfMain(shelfName);
    setNewShelfSub('');
  };

  const hierarchicalShelves = useMemo(() => {
    const shelves: Record<string, string[]> = {};
    const mainShelves: string[] = [];

    existingTags.forEach(tag => {
      const parts = tag.split('/');
      const main = parts[0];
      if (!shelves[main]) {
        shelves[main] = [];
        mainShelves.push(main);
      }
      if (parts.length > 1) {
        const sub = parts.slice(1).join('/');
        if (!shelves[main].includes(sub)) {
          shelves[main].push(sub);
        }
      }
    });

    mainShelves.sort((a,b) => a.localeCompare(b, 'tr'));
    Object.values(shelves).forEach(subs => subs.sort((a,b) => a.localeCompare(b, 'tr')));
    
    const sortedShelves: Record<string, string[]> = {};
    mainShelves.forEach(main => {
        sortedShelves[main] = shelves[main];
    });

    return sortedShelves;
  }, [existingTags]);

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
      
      <FormItem>
        <FormLabel>Kapak Resmi</FormLabel>
        <FormControl>
             <Input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
        </FormControl>
        <Card 
            className="aspect-video w-full border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
        >
            {imageValue && imageValue.startsWith('data:image') ? (
                <Image src={imageValue} alt="Kapak önizlemesi" width={150} height={225} className="max-h-full w-auto object-contain rounded-md" data-ai-hint="book cover"/>
            ) : imageValue ? (
                <Image src={imageValue} alt="Kapak" width={150} height={225} className="max-h-full w-auto object-contain rounded-md" data-ai-hint="book cover"/>
            ) : (
                <>
                    <UploadCloud className="h-10 w-10"/>
                    <p className="mt-2 text-sm">Resim Yükle</p>
                    <p className="text-xs">Tıkla veya sürükle bırak</p>
                </>
            )}
        </Card>
        <FormMessage />
      </FormItem>


       <FormField
          control={control}
          name="tags"
          render={({ field }) => (
              <FormItem>
                  <FormLabel>Raflar</FormLabel>
                  <Card className="p-4 bg-muted/50">
                      <CardTitle className="text-base mb-2">Yeni Raf Ekle</CardTitle>
                      <div className="space-y-2">
                          <Input
                              placeholder="Ana Raf Adı (örn: Yazarlar)"
                              value={newShelfMain}
                              onChange={(e) => setNewShelfMain(e.target.value)}
                          />
                          <Input
                              placeholder="Alt Raf Adı (opsiyonel, örn: Dostoyevski)"
                              value={newShelfSub}
                              onChange={(e) => setNewShelfSub(e.target.value)}
                          />
                          <Button type="button" size="sm" onClick={handleAddShelf}>
                              <PlusCircle className="mr-2 h-4 w-4" />
                              Raf Ekle
                          </Button>
                      </div>
                  </Card>

                  <div className="pt-2">
                      <FormLabel className="text-xs text-muted-foreground">Seçili Raflar</FormLabel>
                      <div className="flex flex-wrap gap-1.5 mt-1.5 min-h-[26px]">
                          {(field.value || []).map((tag) => (
                          <Badge key={tag} variant="secondary" className="gap-1.5 py-1 px-2.5">
                              {tag}
                              <button type="button" aria-label={`${tag} rafını kaldır`} onClick={() => removeTag(tag)}>
                                <X className="h-3.5 w-3.5" />
                              </button>
                          </Badge>
                          ))}
                      </div>
                  </div>

                  {Object.keys(hierarchicalShelves).length > 0 && (
                      <div className="pt-4 space-y-2">
                          <FormLabel className="text-xs text-muted-foreground">Mevcut Raflar</FormLabel>
                          <ScrollArea className="h-48 rounded-md border p-2">
                              <div className="space-y-2">
                                  {Object.entries(hierarchicalShelves).map(([main, subs]) => (
                                      <div key={main}>
                                          <div className="flex items-center gap-1">
                                            <Badge
                                                variant={(field.value || []).includes(main) ? 'default' : 'outline'}
                                                onClick={() => handleToggleTag(main)}
                                                className="cursor-pointer text-sm flex-grow justify-start text-left"
                                            >
                                                {main}
                                            </Badge>
                                             <TooltipProvider>
                                                  <Tooltip>
                                                      <TooltipTrigger asChild>
                                                          <Button
                                                              type="button"
                                                              variant="ghost"
                                                              size="icon"
                                                              className="h-6 w-6 shrink-0"
                                                              onClick={() => handleUseShelfAsTemplate(main)}
                                                          >
                                                              <PlusCircle className="mr-2 h-4 w-4" />
                                                          </Button>
                                                      </TooltipTrigger>
                                                      <TooltipContent>
                                                          <p>Bu rafa alt raf ekle</p>
                                                      </TooltipContent>
                                                  </Tooltip>
                                              </TooltipProvider>
                                          </div>
                                          {(subs as string[]).length > 0 && (
                                              <div className="flex flex-wrap gap-1.5 mt-2 ml-4 pl-2 border-l">
                                                  {(subs as string[]).map(sub => (
                                                      <Badge
                                                          key={sub}
                                                          variant={(field.value || []).includes(`${main}/${sub}`) ? 'default' : 'outline'}
                                                          onClick={() => handleToggleTag(`${main}/${sub}`)}
                                                          className="cursor-pointer text-xs"
                                                      >
                                                          {sub}
                                                      </Badge>
                                                  ))}
                                              </div>
                                          )}
                                      </div>
                                  ))}
                              </div>
                          </ScrollArea>
                      </div>
                  )}
                  <FormMessage />
              </FormItem>
          )}
      />

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
  const { user, familyId, familyMembers } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [isAddBookDialogOpen, setIsAddBookDialogOpen] = useState(false);
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [isBulkJsonDialogOpen, setIsBulkJsonDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [editingShelf, setEditingShelf] = useState<{ originalName: string; isNew: boolean } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [view, setView] = useState<'books' | 'management'>('books');
  const [activeTab, setActiveTab] = useState("adults");

  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Partial<Book>[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const { toast } = useToast();
  const formMethods = useForm<BookFormData>({ resolver: zodResolver(bookFormSchema) });
  const shelfFormMethods = useForm<ShelfFormData>({ resolver: zodResolver(shelfFormSchema) });
  
  useEffect(() => {
    const unsubscribeBooks = onBooksUpdate(setBooks);
    const unsubscribeTags = onTagsUpdate(setAllTags);

    return () => {
        unsubscribeBooks();
        unsubscribeTags();
    };
  }, [user]);

  const handleOpenAddDialog = useCallback((initialData: Partial<Book> | null = null) => {
    setEditingBook(initialData && 'id' in initialData ? initialData as Book : null);
    formMethods.reset({
        title: initialData?.title || '',
        author: initialData?.author || '',
        pageCount: initialData?.pageCount,
        image: initialData?.image || '',
        isForChildren: initialData?.isForChildren || false,
        tags: initialData?.tags || [],
        description: initialData?.description || '',
        rating: initialData?.rating || 0
    });
    setIsAddBookDialogOpen(true);
  }, [formMethods]);

  const handleAddOrUpdateBook = async (formData: BookFormData) => {
    setIsSubmitting(true);
    try {
        let finalImageUrl = formData.image;

        // If image is a data URI, upload it first
        if (formData.image && formData.image.startsWith('data:image')) {
             toast({ title: "Görsel Yükleniyor...", description: "Kapak fotoğrafı depolama alanına kaydediliyor." });
             const destinationPath = `book-covers/${(formData.title || 'untitled').replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.jpg`;
             const migrationResult = await migrateImage({ imageDataUri: formData.image, destinationPath });

             if (migrationResult.success && migrationResult.newUrl) {
                finalImageUrl = migrationResult.newUrl;
             } else {
                 throw new Error(migrationResult.error || 'Bilinmeyen bir görsel yükleme hatası.');
             }
        }
        
        const bookData: any = { ...formData, image: finalImageUrl };

        if (bookData.pageCount === undefined) {
            delete bookData.pageCount;
        }

        const newTags = new Set([...allTags, ...(bookData.tags || [])]);
        await updateTags(Array.from(newTags));
        
        if (editingBook) {
            await updateBook(editingBook.id, bookData);
            toast({ title: "Kitap Güncellendi" });
        } else {
            const newBook: Omit<Book, 'id' | 'familyId'> = {
                type: 'Kitap',
                rating: 0,
                description: '',
                readers: [],
                ...bookData,
            };
            await addBook(newBook);
            toast({ title: "Kitap Eklendi" });
        }
        setIsAddBookDialogOpen(false);
    } catch(e: any) {
        console.error(e);
        toast({ title: "❌ Hata", description: e.message || "İşlem sırasında bir hata oluştu.", variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    try {
        await deleteBook(bookId);
        toast({ title: "Kitap Silindi", variant: 'destructive' });
    } catch(e) {
        toast({ title: "❌ Hata", description: "Kitap silinirken bir hata oluştu.", variant: 'destructive'});
    }
  };
  
  const handleAddToLibrary = async (bookId: string, memberId: string) => {
    if (!familyId) return;
    try {
        await addBookToMemberLibrary(familyId, memberId, bookId);
        const member = familyMembers.find(m => m.id === memberId);
        const book = books.find(b => b.id === bookId);
        toast({
            title: `"${book?.title}"`,
            description: `${member?.name} adlı üyenin kitaplığına eklendi.`
        });
    } catch (e) {
        toast({ title: "Hata", description: "Kitap eklenirken bir sorun oluştu.", variant: 'destructive' });
    }
  };

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
  
  const handleSelectSearchResult = async (book: Partial<Book>) => {
    setIsSearchDialogOpen(false);
    toast({ title: "Görsel Aktarılıyor...", description: "Kapak fotoğrafı kendi depolama alanınıza kaydediliyor." });

    let finalImageUrl = book.image;
    if (book.image) {
        try {
            const destinationPath = `book-covers/${(book.title || 'untitled').replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.jpg`;
            const migrationResult = await migrateImage({ sourceUrl: book.image, destinationPath });

            if (migrationResult.success && migrationResult.newUrl) {
                finalImageUrl = migrationResult.newUrl;
                 toast({ title: "✅ Görsel Aktarıldı", description: "Kapak fotoğrafı başarıyla kaydedildi." });
            } else {
                throw new Error(migrationResult.error || "Bilinmeyen bir görsel taşıma hatası.");
            }
        } catch (e: any) {
            toast({ title: "⚠️ Görsel Aktarılamadı", description: `Orijinal URL kullanılacak. Hata: ${e.message}`, variant: 'destructive' });
        }
    }
    
    handleOpenAddDialog({ ...book, image: finalImageUrl });
  };
  
  const handleBulkImport = async (importedBooks: Partial<Book>[]) => {
    toast({ title: "İçe Aktarma Başlatıldı", description: "Kitaplar ve görseller aktarılıyor. Bu işlem biraz zaman alabilir." });
    setIsBulkJsonDialogOpen(false);

    try {
      const allCurrentTags = new Set(allTags);
      
      for (const book of importedBooks) {
        let finalImageUrl = book.image;

        // Migrate image if a URL is provided
        if (book.image) {
          const destinationPath = `book-covers/${(book.title || "untitled").replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.jpg`;
          const migrationResult = await migrateImage({ sourceUrl: book.image, destinationPath });

          if (migrationResult.success && migrationResult.newUrl) {
            finalImageUrl = migrationResult.newUrl;
          } else {
            toast({ title: "⚠️ Görsel Aktarılamadı", description: `"${book.title}" kitabının görseli aktarılamadı. Orijinal URL kullanılacak. Hata: ${migrationResult.error}`, variant: 'destructive' });
          }
        }

        // Add tags to the set
        (book.tags || []).forEach(tag => allCurrentTags.add(tag));

        // Create book data
        const newBook: Omit<Book, 'id' | 'familyId'> = {
          type: 'Kitap',
          rating: 0,
          description: '',
          isForChildren: false,
          readers: [],
          ...book,
          image: finalImageUrl || 'https://placehold.co/300x450.png',
          tags: book.tags || [],
        };
        
        await addBook(newBook);
      }

      await updateTags(Array.from(allCurrentTags));

      toast({ title: "✅ İçe Aktarma Tamamlandı", description: `${importedBooks.length} kitap başarıyla kütüphaneye eklendi.` });

    } catch (e) {
      toast({ title: "❌ Toplu Ekleme Hatası", description: "Toplu ekleme sırasında bir hata oluştu.", variant: 'destructive' });
    }
  };
  
  const handleOpenShelfDialog = (shelfName: string | null) => {
      const isNew = shelfName === null;
      shelfFormMethods.reset({ name: isNew ? '' : shelfName });
      setEditingShelf({ originalName: shelfName || '', isNew });
  }

  const handleShelfFormSubmit = async (data: ShelfFormData) => {
      if (!editingShelf) return;
      const newShelfName = data.name.trim();

      if (allTags.includes(newShelfName) && newShelfName !== editingShelf.originalName) {
          toast({ title: "Hata", description: "Bu raf adı zaten mevcut.", variant: "destructive" });
          return;
      }
      
      try {
        if (editingShelf.isNew) { // Add new shelf
            await updateTags([...allTags, newShelfName]);
            toast({ title: "Raf Eklendi", description: `"${newShelfName}" rafı başarıyla oluşturuldu.` });
        } else { // Update existing shelf
            const booksToUpdate = books.filter(book => (book.tags || []).some(tag => tag.startsWith(editingShelf.originalName)));
            for(const book of booksToUpdate) {
                const newTags = (book.tags || []).map(tag => tag.startsWith(editingShelf.originalName) ? tag.replace(editingShelf.originalName, newShelfName) : tag);
                await updateBook(book.id, { tags: newTags });
            }
            const newAllTags = allTags.map(tag => tag.startsWith(editingShelf.originalName) ? tag.replace(editingShelf.originalName, newShelfName) : tag);
            await updateTags(newAllTags);
            toast({ title: "Raf Güncellendi", description: `"${editingShelf.originalName}" rafının adı "${newShelfName}" olarak değiştirildi.` });
        }
      } catch (e) {
          toast({ title: "❌ Hata", description: "Raf güncellenirken bir hata oluştu.", variant: 'destructive'});
      }


      setEditingShelf(null);
  };

  const handleDeleteShelf = async (shelfName: string) => {
    try {
        const booksToUpdate = books.filter(book => (book.tags || []).some(tag => tag.startsWith(shelfName)));
        for(const book of booksToUpdate) {
            const newTags = (book.tags || []).filter(tag => !tag.startsWith(shelfName));
            await updateBook(book.id, { tags: newTags });
        }
        await updateTags(allTags.filter(tag => !tag.startsWith(shelfName)));
        toast({ title: "Raf Silindi", description: `"${shelfName}" rafı ve alt rafları tüm kitaplardan kaldırıldı.`, variant: 'destructive'});
    } catch(e) {
        toast({ title: "❌ Hata", description: "Raf silinirken bir hata oluştu.", variant: 'destructive'});
    }
  };

  const { adultBooks, childrenBooks } = useMemo(() => {
    const adults: Book[] = [];
    const children: Book[] = [];
    
    const sourceBooks = books.filter(book => {
      if (!localSearchQuery) return true;
      const q = localSearchQuery.toLowerCase();
      return (
        book.title.toLowerCase().includes(q) ||
        (book.author && book.author.toLowerCase().includes(q)) ||
        (book.tags && book.tags.some(tag => tag.toLowerCase().includes(q)))
      );
    });

    sourceBooks.forEach(book => (book.isForChildren ? children.push(book) : adults.push(book)));
    return { adultBooks: adults, childrenBooks: children };
  }, [books, localSearchQuery]);

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold">Kitaplığımız 📚</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none" onClick={() => setView(view === 'books' ? 'management' : 'books')}>
                <Settings className="mr-2 h-4 w-4"/>
                {view === 'books' ? 'Raf Yönetimi' : 'Kitapları Gör'}
            </Button>
            <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none" onClick={() => handleOpenAddDialog()}>
              <PlusCircle className="mr-2 h-4 w-4"/> Yeni Kitap Ekle
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-10 w-10 bg-white/20 text-white hover:bg-white/30 border-none">
                  <ChevronDown className="h-4 w-4"/>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsSearchDialogOpen(true)}>
                  <Search className="mr-2 h-4 w-4"/> İnternette Ara
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsBulkJsonDialogOpen(true)}>
                  <FilePlus className="mr-2 h-4 w-4"/> Toplu Ekle (JSON)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
      </div>
      
      {view === 'books' ? (
        <Tabs defaultValue="adults" onValueChange={setActiveTab} className="flex flex-col flex-grow min-h-0">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <TabsList className="grid w-full sm:w-auto grid-cols-2">
              <TabsTrigger value="adults">Yetişkin Kitapları ({adultBooks.length})</TabsTrigger>
              <TabsTrigger value="children">Çocuk Kitapları ({childrenBooks.length})</TabsTrigger>
            </TabsList>
            <div className="relative w-full sm:flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Mevcut kütüphanede ara (başlık, yazar, raf...)"
                className="pl-10"
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <TabsContent value="adults" className="mt-6 flex-grow overflow-y-auto">
              <BookShelf books={adultBooks} onEdit={handleOpenAddDialog} onDelete={handleDeleteBook} onAddToLibrary={handleAddToLibrary} familyMembers={familyMembers} />
          </TabsContent>
          <TabsContent value="children" className="mt-6 flex-grow overflow-y-auto">
              <BookShelf books={childrenBooks} onEdit={handleOpenAddDialog} onDelete={handleDeleteBook} onAddToLibrary={handleAddToLibrary} familyMembers={familyMembers} />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="mt-6 flex-grow overflow-y-auto">
           <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Rafları Yönet</CardTitle>
                        <CardDescription>Mevcut tüm ana rafları buradan düzenleyebilir veya silebilirsiniz.</CardDescription>
                    </div>
                     <Button onClick={() => handleOpenShelfDialog(null)}>
                        <PlusCircle className="mr-2 h-4 w-4"/> Yeni Raf Ekle
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2 pr-4">
                        {allTags.filter(t => !t.includes('/')).map(tag => (
                            <div key={tag} className="flex items-center justify-between p-3 border rounded-lg">
                                <p className="font-medium">{tag}</p>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleOpenShelfDialog(tag)}>
                                        <Edit className="w-4 h-4"/>
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                <Trash2 className="w-4 h-4"/>
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Rafı Sil</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    "{tag}" rafını ve tüm alt raflarını silmek istediğinizden emin misiniz? Bu işlem, bu etiketleri tüm kitaplardan kaldıracak ve raf kalıcı olarak silinecektir. Bu işlem geri alınamaz.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>İptal</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteShelf(tag)}>Sil</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
           </Card>
        </div>
      )}


      {/* Add/Edit Book Dialog */}
      <Dialog open={isAddBookDialogOpen} onOpenChange={setIsAddBookDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBook ? 'Kitabı Düzenle' : 'Yeni Kitap Ekle'}</DialogTitle>
          </DialogHeader>
          <FormProvider {...formMethods}>
            <form onSubmit={formMethods.handleSubmit(handleAddOrUpdateBook)} id="book-form">
              <ScrollArea className="max-h-[70vh] p-1">
                <div className="pr-5">
                    <BookForm existingTags={allTags} />
                </div>
              </ScrollArea>
            </form>
          </FormProvider>
          <DialogFooter className="pt-4 border-t">
            <Button variant="ghost" onClick={() => setIsAddBookDialogOpen(false)} disabled={isSubmitting}>İptal</Button>
            <Button type="submit" form="book-form" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingBook ? 'Kaydet' : 'Ekle'}
            </Button>
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
                        <p className="text-xs text-muted-foreground truncate">{book.author}</p>
                      </div>
                    </div>
                  ))}
                </div>
            </ScrollArea>
        </DialogContent>
      </Dialog>
      
      {/* Bulk Add JSON Dialog */}
      <BulkAddJsonDialog open={isBulkJsonDialogOpen} onOpenChange={setIsBulkJsonDialogOpen} onImport={handleBulkImport} />

      {/* Edit Shelf Dialog */}
        <Dialog open={!!editingShelf} onOpenChange={(open) => !open && setEditingShelf(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingShelf?.isNew ? "Yeni Raf Ekle" : "Rafı Düzenle"}</DialogTitle>
                    <DialogDescription>
                         {editingShelf?.isNew 
                            ? "Kütüphanenize yeni bir raf ekleyin."
                            : "Rafın adını güncelleyin. Bu değişiklik bu rafa ve alt raflarına sahip tüm kitaplara yansıtılacaktır."
                        }
                    </DialogDescription>
                </DialogHeader>
                <Form {...shelfFormMethods}>
                    <form onSubmit={shelfFormMethods.handleSubmit(handleShelfFormSubmit)} id="shelf-form" className="space-y-4">
                        <FormField
                            control={shelfFormMethods.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Raf Adı</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="örn: Fantastik"/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </form>
                </Form>
                 <DialogFooter>
                    <Button variant="ghost" onClick={() => setEditingShelf(null)}>İptal</Button>
                    <Button type="submit" form="shelf-form">Kaydet</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}

// BookShelf COMPONENT
function BookShelf({ books, onEdit, onDelete, onAddToLibrary, familyMembers }: { books: Book[], onEdit: (book: Book) => void, onDelete: (id: string) => void, onAddToLibrary: (bookId: string, memberId: string) => void, familyMembers: any[] }) {
  const shelves = useMemo(() => {
    const grouped: Record<string, Book[]> = {};
    books.forEach(book => {
      const bookTags = book.tags && book.tags.length > 0 ? book.tags : ["Diğer"];
      bookTags.forEach(tag => {
        if (!grouped[tag]) grouped[tag] = [];
        if(!grouped[tag].some(b => b.id === book.id)) {
            grouped[tag].push(book);
        }
      });
    });
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b, 'tr'));
  }, [books]);

  if (books.length === 0) {
     return (
      <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed bg-muted/20 p-8 text-center text-muted-foreground">
        <div>
          <Library className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-md font-medium">Bu kategoride gösterilecek kitap yok.</p>
          <p className="text-sm">Yeni bir kitap ekleyerek başlayabilirsiniz.</p>
        </div>
      </div>
     );
  }

  return (
    <div className="space-y-8">
      {shelves.map(([shelfName, shelfBooks]) => (
        <div key={shelfName}>
          <h2 className="text-xl font-bold mb-4">{shelfName}</h2>
          <div className="relative">
            <div className="overflow-x-auto pb-4 -mb-4">
                <div className="flex flex-nowrap gap-4">
                    {shelfBooks.map(book => (
                       <Card key={book.id} className="group relative w-40 sm:w-48 shrink-0 overflow-hidden flex flex-col">
                          <div className="relative">
                            <Image 
                              src={book.image || `https://placehold.co/300x450.png`} 
                              alt={book.title} 
                              width={300} 
                              height={450} 
                              className="w-full h-auto object-cover aspect-[2/3] transition-transform duration-300 group-hover:scale-105"
                              data-ai-hint="book cover" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                             <div className="absolute bottom-0 left-0 p-2 sm:p-3 text-white">
                                <p className="font-bold text-sm truncate" title={book.title}>{book.title}</p>
                                <p className="text-xs text-white/80 truncate">{book.author}</p>
                            </div>
                          </div>
                           <CardContent className="p-2 flex-grow flex flex-col justify-end">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button size="sm" variant="secondary" className="w-full text-xs" onClick={(e) => e.stopPropagation()}>
                                            <UserPlus className="mr-1.5 h-3.5 w-3.5"/>
                                            Kitaplığa Ekle
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenuLabel>Kimin Kitaplığına Eklensin?</DropdownMenuLabel>
                                        {familyMembers.map(member => (
                                            <DropdownMenuItem key={member.id} onClick={() => onAddToLibrary(book.id, member.id)} disabled={(book.readers || []).includes(member.id)}>
                                               {member.name}
                                               {(book.readers || []).includes(member.id) && <span className="text-xs text-muted-foreground ml-auto">Ekli</span>}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                           </CardContent>
                          <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => onEdit(book)}><Edit className="h-4 w-4"/></Button>
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
                      </Card>
                    ))}
                </div>
            </div>
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
    const [isImporting, setIsImporting] = useState(false);

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
            setIsImporting(true);
            onImport(result.data).finally(() => setIsImporting(false));
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
    "isForChildren": false,
    "image": "https://covers.openlibrary.org/b/id/10472775-L.jpg",
    "tags": ["Fantastik", "Macera"]
  },
  {
    "title": "Küçük Prens",
    "author": "Antoine de Saint-Exupéry",
    "isForChildren": true,
    "image": "https://covers.openlibrary.org/b/id/8303399-L.jpg",
    "tags": ["Çocuk Klasikleri", "Felsefe"]
  }
]`;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Toplu Kitap Ekle (JSON)</DialogTitle>
                    <DialogDescription>
                        Kitap listenizi JSON formatında yapıştırarak topluca ekleyin. Görseller otomatik olarak kendi depolama alanınıza taşınacaktır.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div>
                         <Label htmlFor="json-input" className="mb-2 block">JSON Verisi</Label>
                         <Textarea id="json-input" value={jsonInput} onChange={(e) => setJsonInput(e.target.value)} className="h-64 font-mono text-xs" disabled={isImporting} />
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
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isImporting}>İptal</Button>
                    <Button onClick={handleImportClick} disabled={isImporting}>
                        {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        İçeri Aktar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
