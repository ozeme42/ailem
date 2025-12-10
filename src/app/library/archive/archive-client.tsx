"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Book, AmbientSound } from '@/lib/data';
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
import { Loader2, PlusCircle, Search, Trash2, Library, FilePlus, AlertTriangle, Edit, X, UploadCloud, ChevronRight, BookPlus, ChevronDown, Settings, UserPlus, Music, BookUp, ArrowLeft, FolderOpen, MoreVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { onBooksUpdate, onTagsUpdate, addBook, updateBook, deleteBook, updateTags, addBookToMemberLibrary, onAmbientSoundsUpdate, addAmbientSound, deleteAmbientSound, updateBookTags, deleteTag } from '@/lib/dataService';
import { useAuth } from '@/components/auth-provider';
import { BookDetailDialog } from '@/components/book-detail-dialog';
import { BookForm, BookFormData } from '@/components/new-book-form';
import { useRouter } from 'next/navigation';

// --- DESIGN SYSTEM: Glassmorphism Colors ---
const glassColors = {
    CARD_BG: "bg-white/5 backdrop-blur-md border border-white/10 shadow-lg",
    CARD_HOVER: "hover:bg-white/10 hover:border-white/20 transition-all duration-300",
    TEXT_MAIN: "text-slate-100",
    TEXT_MUTED: "text-slate-400",
    HEADER_BG: "bg-slate-950/70 backdrop-blur-lg border-b border-white/5",
    ICON_BOX: "bg-gradient-to-br from-amber-500 to-orange-600 p-2 rounded-xl shadow-lg",
    BUTTON_GLASS: "bg-white/10 hover:bg-white/20 text-white border border-white/20",
    ACCENT_GRADIENT: "bg-gradient-to-r from-amber-600 to-orange-600",
};

const brightColors = [
    { id: 'blue-indigo', name: 'Mavi', gradient: 'from-blue-500/20 to-indigo-600/20 border-blue-500/30 text-blue-200' },
    { id: 'teal-green', name: 'Açık Yeşil', gradient: 'from-teal-400/20 to-green-500/20 border-teal-400/30 text-teal-200' },
    { id: 'amber-orange', name: 'Turuncu', gradient: 'from-amber-400/20 to-orange-500/20 border-amber-400/30 text-amber-200' },
    { id: 'rose-red', name: 'Gül Kurusu', gradient: 'from-rose-400/20 to-red-500/20 border-rose-400/30 text-rose-200' },
    { id: 'cyan-sky', name: 'Camgöbeği', gradient: 'from-cyan-400/20 to-sky-500/20 border-cyan-400/30 text-cyan-200' },
    { id: 'violet-purple', name: 'Menekşe', gradient: 'from-violet-500/20 to-purple-600/20 border-violet-500/30 text-violet-200' },
    { id: 'pink-fuchsia', name: 'Pembe', gradient: 'from-pink-500/20 to-fuchsia-500/20 border-pink-500/30 text-pink-200' },
    { id: 'lime-emerald', name: 'Fıstık Yeşili', gradient: 'from-lime-400/20 to-emerald-500/20 border-lime-400/30 text-lime-200'},
];

// SCHEMAS & TYPES
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


// ARCHIVE CLIENT COMPONENT
export default function ArchiveClient() {
  const router = useRouter();
  const { user, familyId, familyMembers } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [ambientSounds, setAmbientSounds] = useState<AmbientSound[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [isAddBookDialogOpen, setIsAddBookDialogOpen] = useState(false);
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [isBulkJsonDialogOpen, setIsBulkJsonDialogOpen] = useState(false);
  const [isSoundFormOpen, setIsSoundFormOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [viewingBook, setViewingBook] = useState<Book | null>(null);
  const [editingShelf, setEditingShelf] = useState<{ originalName: string; isNew: boolean } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [view, setView] = useState<'books' | 'management'>('books');
  const [activeTab, setActiveTab] = useState("adults");
  const [activeManagementTab, setActiveManagementTab] = useState("shelves");

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
    const unsubscribeTags = onTagsUpdate("libraryTags", setAllTags);
    const unsubscribeSounds = onAmbientSoundsUpdate(setAmbientSounds);

    return () => {
        unsubscribeBooks();
        unsubscribeTags();
        unsubscribeSounds();
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
        rating: initialData?.rating || 0,
    });
    setIsAddBookDialogOpen(true);
  }, [formMethods]);

  const handleAddOrUpdateBook = async (formData: BookFormData) => {
    setIsSubmitting(true);
    try {
        let finalImageUrl = formData.image;

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
        await updateTags("libraryTags", Array.from(newTags));
        
        if (editingBook) {
            await updateBook(editingBook.id, bookData);
            toast({ title: "Kitap Güncellendi" });
        } else {
            const newBook: Omit<Book, 'id' | 'familyId'> = {
                type: 'Kitap',
                rating: 0,
                description: '',
                isForChildren: false,
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
        toast({ title: "Hata", description: "Kitap eklenirken bir sorun oluştu.", variant: "destructive" });
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

        if (book.image) {
          const destinationPath = `book-covers/${(book.title || "untitled").replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.jpg`;
          const migrationResult = await migrateImage({ sourceUrl: book.image, destinationPath });

          if (migrationResult.success && migrationResult.newUrl) {
            finalImageUrl = migrationResult.newUrl;
          } else {
            toast({ title: "⚠️ Görsel Aktarılamadı", description: `"${book.title}" kitabının görseli aktarılamadı. Orijinal URL kullanılacak. Hata: ${migrationResult.error}`, variant: 'destructive' });
          }
        }

        (book.tags || []).forEach(tag => allCurrentTags.add(tag));

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

      await updateTags("libraryTags", Array.from(allCurrentTags));

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
        if (editingShelf.isNew) {
            await updateTags("libraryTags", [...allTags, newShelfName]);
            toast({ title: "Raf Eklendi", description: `"${newShelfName}" rafı başarıyla oluşturuldu.` });
        } else { 
            await updateBookTags(editingShelf.originalName, newShelfName);
            const newAllTags = allTags.map(tag => tag.startsWith(editingShelf.originalName) ? tag.replace(editingShelf.originalName, newShelfName) : tag);
            await updateTags("libraryTags", newAllTags);
            toast({ title: "Raf Güncellendi", description: `"${editingShelf.originalName}" rafının adı "${newShelfName}" olarak değiştirildi.` });
        }
      } catch (e) {
          toast({ title: "❌ Hata", description: "Raf güncellenirken bir hata oluştu.", variant: 'destructive'});
      }

      setEditingShelf(null);
  };

  const handleDeleteShelf = async (shelfName: string) => {
    try {
        await deleteTag("libraryTags", shelfName, "book");
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

    sourceBooks.forEach(book => {
        if (book.isForChildren) {
            children.push(book);
        } else {
            adults.push(book);
        }
    });

    return { adultBooks: adults, childrenBooks: children };
  }, [books, localSearchQuery]);

  return (
    <div className="min-h-[100dvh] bg-slate-950 font-sans text-slate-100 pb-24 relative overflow-hidden">
      {/* Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-orange-900/30 rounded-full blur-[120px]" />
          <div className="absolute bottom-[20%] right-[-5%] w-[400px] h-[400px] bg-amber-900/20 rounded-full blur-[100px]" />
      </div>

      {/* HEADER (Dynamic Glass) */}
      <div className={cn("sticky top-0 z-40 py-4 sm:px-6 transition-all duration-300", glassColors.HEADER_BG)}>
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={() => router.back()} className={cn("rounded-full mr-1 text-slate-400 hover:text-white hover:bg-white/10")}>
                      <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div className={glassColors.ICON_BOX}>
                      <Library className="w-6 h-6 text-white" />
                  </div>
                  <div>
                      <p className={cn("text-xs font-semibold uppercase tracking-wider", glassColors.TEXT_MUTED)}>Kütüphane</p>
                      <h1 className={cn("text-lg font-bold leading-none", glassColors.TEXT_MAIN)}>Kitap Arşivi</h1>
                  </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                   <div className="relative flex-1 md:w-64">
                      <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", glassColors.TEXT_MUTED)} />
                      <Input 
                        placeholder="Kitap ara..." 
                        value={localSearchQuery}
                        onChange={(e) => setLocalSearchQuery(e.target.value)}
                        className={cn("pl-9 rounded-xl border-white/10", glassColors.CARD_BG, glassColors.TEXT_MAIN, "placeholder:text-slate-500")} 
                      />
                  </div>
                  <Button variant="outline" size="icon" className={cn("rounded-full", glassColors.BUTTON_GLASS)} onClick={() => setView(view === 'books' ? 'management' : 'books')}>
                      <Settings className="w-4 h-4" />
                  </Button>
                  <div className="flex gap-2">
                       <Button onClick={() => handleOpenAddDialog()} className={cn("hidden md:flex rounded-full px-6 font-bold shadow-lg shadow-orange-900/20", glassColors.BUTTON_GLASS, "bg-orange-600 hover:bg-orange-500 border-orange-500/50")}>
                           <PlusCircle className="w-4 h-4 mr-2" /> Yeni Kitap
                       </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="icon" className={cn("rounded-full", glassColors.BUTTON_GLASS)}>
                                <ChevronDown className="h-4 w-4"/>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-slate-900 border-white/10 text-slate-100">
                              <DropdownMenuItem onClick={() => setIsSearchDialogOpen(true)} className="hover:bg-white/10 cursor-pointer">
                                <Search className="mr-2 h-4 w-4"/> İnternette Ara
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setIsBulkJsonDialogOpen(true)} className="hover:bg-white/10 cursor-pointer">
                                <FilePlus className="mr-2 h-4 w-4"/> Toplu Ekle (JSON)
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                  </div>
              </div>
          </div>
      </div>
      
      <div className="max-w-7xl mx-auto md:p-6 p-4 relative z-10 space-y-6">
      
      {view === 'books' ? (
        <Tabs defaultValue="adults" onValueChange={setActiveTab} className="flex flex-col flex-grow min-h-0">
          <div className="flex items-center justify-center mb-6">
             <div className={cn("p-1 rounded-2xl flex relative bg-white/5 border border-white/10 backdrop-blur-md")}>
                <TabsList className="bg-transparent h-auto p-0 gap-2">
                    <TabsTrigger value="adults" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white/10 data-[state=active]:text-white text-slate-400 font-bold transition-all">
                        Yetişkin ({adultBooks.length})
                    </TabsTrigger>
                    <TabsTrigger value="children" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white/10 data-[state=active]:text-white text-slate-400 font-bold transition-all">
                        Çocuk ({childrenBooks.length})
                    </TabsTrigger>
                </TabsList>
             </div>
          </div>

          <TabsContent value="adults" className="mt-0">
              <BookShelf books={adultBooks} onViewDetails={setViewingBook} onEdit={handleOpenAddDialog} onDelete={handleDeleteBook} onAddToLibrary={handleAddToLibrary} familyMembers={familyMembers} />
          </TabsContent>
          <TabsContent value="children" className="mt-0">
              <BookShelf books={childrenBooks} onViewDetails={setViewingBook} onEdit={handleOpenAddDialog} onDelete={handleDeleteBook} onAddToLibrary={handleAddToLibrary} familyMembers={familyMembers} />
          </TabsContent>
        </Tabs>
      ) : (
        <Tabs defaultValue="shelves" onValueChange={setActiveManagementTab} className="w-full">
            <div className={cn("p-1 rounded-2xl flex relative mb-8 w-fit mx-auto", glassColors.CARD_BG)}>
                <TabsList className="bg-transparent h-auto p-0 gap-2">
                    <TabsTrigger value="shelves" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white/10 data-[state=active]:text-white text-slate-400 font-bold transition-all">
                        Raf Yönetimi
                    </TabsTrigger>
                    <TabsTrigger value="sounds" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white/10 data-[state=active]:text-white text-slate-400 font-bold transition-all">
                        Ambiyans Sesleri
                    </TabsTrigger>
                </TabsList>
            </div>
            
            <TabsContent value="shelves">
                 <Card className={cn(glassColors.CARD_BG)}>
                    <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4">
                        <div>
                            <CardTitle className={cn("text-xl font-bold", glassColors.TEXT_MAIN)}>Raf Yönetimi</CardTitle>
                            <CardDescription className={glassColors.TEXT_MUTED}>Mevcut rafları düzenleyin veya silin.</CardDescription>
                        </div>
                         <Button onClick={() => handleOpenShelfDialog(null)} className={cn("rounded-full", glassColors.BUTTON_GLASS)}>
                            <PlusCircle className="mr-2 h-4 w-4"/> Yeni Raf
                        </Button>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {allTags.filter(t => !t.includes('/')).map((tag, index) => {
                                 const color = brightColors[index % brightColors.length];
                                 return (
                                    <div key={tag} className={cn("flex items-center justify-between p-4 rounded-2xl border bg-gradient-to-br transition-all hover:scale-[1.02]", color.gradient)}>
                                        <div className="flex items-center gap-3">
                                            <FolderOpen className="h-5 w-5 opacity-70" />
                                            <p className="font-bold text-sm">{tag}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10 text-white/70 hover:text-white rounded-full" onClick={() => handleOpenShelfDialog(tag)}>
                                                <Edit className="w-4 h-4"/>
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-rose-500/20 text-rose-200 hover:text-rose-100 rounded-full">
                                                        <Trash2 className="w-4 h-4"/>
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="bg-slate-900 border-white/10 text-slate-100">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Rafı Sil</AlertDialogTitle>
                                                        <AlertDialogDescription className="text-slate-400">
                                                            "{tag}" rafını ve tüm alt raflarını silmek üzeresiniz.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-300">İptal</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteShelf(tag)} className="bg-rose-600 hover:bg-rose-700 text-white">Sil</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
            
            <TabsContent value="sounds">
               <Card className={cn(glassColors.CARD_BG)}>
                    <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4">
                        <div>
                            <CardTitle className={cn("text-xl font-bold", glassColors.TEXT_MAIN)}>Ambiyans Sesleri</CardTitle>
                            <CardDescription className={glassColors.TEXT_MUTED}>Okuma seansları için sesleri yönetin.</CardDescription>
                        </div>
                         <Button onClick={() => setIsSoundFormOpen(true)} className={cn("rounded-full", glassColors.BUTTON_GLASS)}>
                            <PlusCircle className="mr-2 h-4 w-4"/> Yeni Ses
                        </Button>
                    </CardHeader>
                    <CardContent className="pt-6">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {ambientSounds.map(sound => (
                                <div key={sound.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400 border border-indigo-500/30">
                                             <Music className="w-5 h-5"/>
                                        </div>
                                        <p className="font-bold text-slate-200">{sound.name}</p>
                                    </div>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-full">
                                                <Trash2 className="w-4 h-4"/>
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="bg-slate-900 border-white/10 text-slate-100">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Sesi Sil</AlertDialogTitle>
                                                <AlertDialogDescription className="text-slate-400">"{sound.name}" sesini kalıcı olarak silmek istediğinizden emin misiniz?</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-300">İptal</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => deleteAmbientSound(sound.id)} className="bg-rose-600 hover:bg-rose-700 text-white">Sil</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            ))}
                       </div>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      )}

      {/* FAB (Mobile) */}
      <div className="fixed bottom-24 md:bottom-8 right-6 z-50 md:hidden">
            <Button 
                className="rounded-full w-14 h-14 bg-orange-600 text-white shadow-2xl shadow-orange-900/50 hover:bg-orange-500 transition-transform hover:scale-105 active:scale-95 border-2 border-orange-400"
                onClick={() => handleOpenAddDialog()}
            >
                <PlusCircle className="h-6 w-6" />
            </Button>
       </div>

      {/* View Book Details Dialog */}
      <BookDetailDialog 
        book={viewingBook} 
        isOpen={!!viewingBook}
        onOpenChange={(open) => {if(!open) setViewingBook(null)}}
        onEdit={handleOpenAddDialog}
        onAddToLibrary={handleAddToLibrary}
        familyMembers={familyMembers}
      />


      {/* Add/Edit Book Dialog */}
       <Dialog open={isAddBookDialogOpen} onOpenChange={setIsAddBookDialogOpen}>
          <DialogContent className="sm:max-w-lg flex flex-col h-full max-h-[90vh] bg-slate-900 border-white/10 text-slate-100 rounded-[2rem]">
            <FormProvider {...formMethods}>
              <form
                id="book-form"
                onSubmit={formMethods.handleSubmit(handleAddOrUpdateBook)}
                className="flex-1 flex flex-col min-h-0 h-full"
              >
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        {editingBook ? <Edit className="w-5 h-5 text-blue-400" /> : <BookPlus className="w-5 h-5 text-orange-500" />}
                        {editingBook ? 'Kitabı Düzenle' : 'Yeni Kitap Ekle'}
                    </DialogTitle>
                </DialogHeader>
                 <ScrollArea className="flex-1 min-h-0">
                    <div className="pr-6 py-4 text-slate-100 [&_label]:text-slate-300 [&_input]:bg-white/5 [&_input]:border-white/10 [&_input]:text-slate-100 [&_textarea]:bg-white/5 [&_textarea]:border-white/10 [&_textarea]:text-slate-100 [&_select]:bg-slate-800 [&_select]:border-white/10">
                      <BookForm existingTags={allTags} />
                    </div>
                </ScrollArea>
                <DialogFooter className="pt-4 border-t border-white/10 flex-shrink-0 gap-2">
                    <Button variant="ghost" type="button" onClick={() => setIsAddBookDialogOpen(false)} disabled={isSubmitting} className="text-slate-400 hover:text-white hover:bg-white/10">İptal</Button>
                    <Button type="submit" disabled={isSubmitting} className="bg-orange-600 hover:bg-orange-500 text-white rounded-xl">
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {editingBook ? 'Kaydet' : 'Ekle'}
                    </Button>
                </DialogFooter>
              </form>
            </FormProvider>
          </DialogContent>
      </Dialog>
      
       {/* Search Dialog */}
      <Dialog open={isSearchDialogOpen} onOpenChange={setIsSearchDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-slate-900 border-white/10 text-slate-100 rounded-[2rem]">
            <DialogHeader>
                <DialogTitle className="text-xl font-bold">İnternette Kitap Ara</DialogTitle>
                <DialogDescription className="text-slate-400">Kitapları başlık, yazar veya ISBN ile arayın.</DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 pt-4">
                <Input placeholder="Kitap adı, yazar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)} className="bg-white/5 border-white/10 text-slate-100 rounded-xl h-12 focus:border-orange-500 transition-all"/>
                <Button type="submit" disabled={isSearching} onClick={() => handleSearch(searchQuery)} className="bg-orange-600 hover:bg-orange-500 text-white rounded-xl h-12 w-12 p-0 flex items-center justify-center shadow-lg shadow-orange-900/20">
                  {isSearching ? <Loader2 className="animate-spin" /> : <Search />}
                </Button>
            </div>
            {searchError && (
                <Alert variant="destructive" className="mt-4 bg-red-900/20 border-red-900/50 text-red-200">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Arama Hatası</AlertTitle>
                  <AlertDescription>{searchError}</AlertDescription>
                </Alert>
            )}
            <ScrollArea className="h-64 mt-4">
                <div className="space-y-2 pr-4">
                  {searchResults.map((book, idx) => (
                    <div key={`${book.title}-${idx}`} onClick={() => handleSelectSearchResult(book)} className="flex items-center gap-4 p-3 border border-white/5 rounded-2xl cursor-pointer hover:bg-white/10 transition-colors bg-white/5">
                      <Image src={book.image || 'https://placehold.co/80x120.png'} alt={book.title || ''} width={40} height={60} className="object-cover rounded-lg shadow-md aspect-[2/3]" data-ai-hint="book cover"/>
                      <div className="flex-grow">
                        <p className="font-bold text-sm text-slate-200">{book.title}</p>
                        <p className="text-xs text-slate-400 truncate font-medium">{book.author}</p>
                      </div>
                      <PlusCircle className="w-5 h-5 text-orange-500 opacity-0 group-hover:opacity-100" />
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
            <DialogContent className="sm:max-w-md rounded-[2rem] bg-slate-900 border-white/10 text-slate-100">
                <DialogHeader>
                    <DialogTitle>{editingShelf?.isNew ? "Yeni Raf Ekle" : "Rafı Düzenle"}</DialogTitle>
                    <DialogDescription className="text-slate-400">
                         {editingShelf?.isNew 
                            ? "Kütüphanenize yeni bir raf ekleyin."
                            : "Rafın adını güncelleyin."
                        }
                    </DialogDescription>
                </DialogHeader>
                <Form {...shelfFormMethods}>
                    <form onSubmit={shelfFormMethods.handleSubmit(handleShelfFormSubmit)} id="shelf-form" className="space-y-4 pt-2">
                        <FormField
                            control={shelfFormMethods.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-slate-400 font-bold text-xs uppercase tracking-wider">Raf Adı</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="örn: Fantastik" className="bg-white/5 border-white/10 text-slate-100 rounded-xl h-12 focus:border-orange-500 transition-all"/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </form>
                </Form>
                 <DialogFooter className="gap-2">
                    <Button variant="ghost" onClick={() => setEditingShelf(null)} className="text-slate-400 hover:text-white hover:bg-white/10">İptal</Button>
                    <Button type="submit" form="shelf-form" className="bg-orange-600 hover:bg-orange-500 text-white rounded-xl">Kaydet</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Add Sound Dialog */}
        <NewSoundForm isOpen={isSoundFormOpen} onOpenChange={setIsSoundFormOpen} />
    </div>
    </div>
  );
}

// BookShelf COMPONENT
function BookShelf({ books, onEdit, onDelete, onAddToLibrary, familyMembers, onViewDetails }: { books: Book[], onEdit: (book: Book) => void, onDelete: (id: string) => void, onAddToLibrary: (bookId: string, memberId: string) => void, familyMembers: any[], onViewDetails: (book: Book) => void }) {
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
      <div className="flex flex-col items-center justify-center rounded-[2rem] border border-dashed border-white/10 bg-white/5 p-12 text-center h-[50vh]">
        <div className="h-24 w-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
             <Library className="mx-auto h-10 w-10 text-slate-500" />
        </div>
        <p className="text-xl font-bold text-slate-300">Kütüphane Boş</p>
        <p className="text-sm text-slate-500 mt-2">Bu kategoride henüz kitap yok. Yeni bir kitap ekleyerek başlayabilirsiniz.</p>
      </div>
     );
  }
  
  return (
    <div className="space-y-8 pb-24">
      {shelves.map(([shelfName, shelfBooks], index) => {
         const color = brightColors[index % brightColors.length];
         return (
            <div key={shelfName} className={cn("rounded-[2rem] p-6 border shadow-sm transition-all hover:shadow-md bg-gradient-to-br", color.gradient)}>
              <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-white/10 rounded-lg backdrop-blur-md border border-white/10">
                     <FolderOpen className="h-5 w-5 opacity-90" />
                  </div>
                  <h2 className={cn("text-xl font-bold text-white/90")}>{shelfName} <span className="text-sm font-normal opacity-60 ml-2">({shelfBooks.length})</span></h2>
              </div>
              
              <div className="relative">
                <div className="overflow-x-auto pb-4 -mb-4 scrollbar-hide">
                    <div className="flex flex-nowrap gap-4">
                        {shelfBooks.map(book => (
                           <div key={book.id} onClick={() => onViewDetails(book)} className="group relative w-36 sm:w-44 shrink-0 overflow-hidden flex flex-col cursor-pointer transition-transform duration-300 hover:-translate-y-2">
                              <div className="relative rounded-xl overflow-hidden shadow-lg aspect-[2/3]">
                                <Image 
                                  src={book.image || `https://placehold.co/300x450.png`} 
                                  alt={book.title} 
                                  width={300} 
                                  height={450} 
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                  data-ai-hint="book cover" 
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
                                 <div className="absolute bottom-0 left-0 p-3 w-full">
                                    <p className="font-bold text-sm text-white line-clamp-2 leading-tight shadow-black drop-shadow-md">{book.title}</p>
                                    <p className="text-xs text-white/80 truncate font-medium mt-0.5">{book.author}</p>
                                </div>
                                
                                {/* Hover Actions Overlay */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 backdrop-blur-[2px]">
                                     <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button size="sm" variant="secondary" className="bg-white/20 hover:bg-white/40 text-white border-none rounded-full backdrop-blur-md" onClick={(e) => e.stopPropagation()}>
                                                <UserPlus className="mr-1.5 h-3.5 w-3.5"/> Ekle
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent onClick={(e) => e.stopPropagation()} className="bg-slate-900 border-white/10 text-slate-100">
                                            <DropdownMenuLabel>Kimin Kitaplığına Eklensin?</DropdownMenuLabel>
                                            {familyMembers.map(member => (
                                                <DropdownMenuItem key={member.id} onClick={() => onAddToLibrary(book.id, member.id)} disabled={(book.readers || []).includes(member.id)} className="cursor-pointer hover:bg-white/10">
                                                   {member.name}
                                                   {(book.readers || []).includes(member.id) && <span className="text-xs text-slate-500 ml-auto">Ekli</span>}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    
                                     <div className="flex gap-2">
                                         <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/40 text-white border-none" onClick={(e) => {e.stopPropagation(); onEdit(book)}}>
                                            <Edit className="h-4 w-4"/>
                                         </Button>
                                          <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button size="icon" variant="destructive" className="h-8 w-8 rounded-full bg-rose-500/80 hover:bg-rose-600 text-white border-none" onClick={(e) => e.stopPropagation()}>
                                                    <Trash2 className="h-4 w-4"/>
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent onClick={(e) => e.stopPropagation()} className="bg-slate-900 border-white/10 text-slate-100">
                                                <AlertDialogHeader><AlertDialogTitle>Kitabı Sil</AlertDialogTitle><AlertDialogDescription className="text-slate-400">"{book.title}" kitabını kalıcı olarak silmek istediğinizden emin misiniz?</AlertDialogDescription></AlertDialogHeader>
                                                <AlertDialogFooter><AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-300">İptal</AlertDialogCancel><AlertDialogAction onClick={() => onDelete(book.id)} className="bg-rose-600 hover:bg-rose-700 text-white">Sil</AlertDialogAction></AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                     </div>
                                </div>
                              </div>
                           </div>
                        ))}
                    </div>
                </div>
              </div>
            </div>
         )
      })}
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
            <DialogContent className="sm:max-w-2xl bg-slate-900 border-white/10 text-slate-100 rounded-[2rem]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Toplu Kitap Ekle (JSON)</DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Kitap listenizi JSON formatında yapıştırarak topluca ekleyin.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div>
                         <Label htmlFor="json-input" className="mb-2 block text-slate-300 font-bold text-xs uppercase tracking-wider">JSON Verisi</Label>
                         <Textarea id="json-input" value={jsonInput} onChange={(e) => setJsonInput(e.target.value)} className="h-64 font-mono text-xs bg-white/5 border-white/10 text-slate-100 rounded-xl" disabled={isImporting} />
                         {error && <p className="text-sm font-medium text-rose-400 mt-2 whitespace-pre-wrap">{error}</p>}
                    </div>
                    <div>
                         <Label className="mb-2 block text-slate-300 font-bold text-xs uppercase tracking-wider">Örnek Format</Label>
                         <Card className="bg-black/20 border-white/5 p-4 h-64 overflow-auto rounded-xl">
                            <pre className="text-xs font-mono text-slate-300"><code>{exampleJson}</code></pre>
                         </Card>
                    </div>
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isImporting} className="text-slate-400 hover:text-white hover:bg-white/10">İptal</Button>
                    <Button onClick={handleImportClick} disabled={isImporting} className="bg-orange-600 hover:bg-orange-500 text-white rounded-xl">
                        {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        İçeri Aktar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// NEW SOUND FORM DIALOG
const newSoundFormSchema = z.object({
  name: z.string().min(2, "Ses adı en az 2 karakter olmalıdır."),
  soundFile: z.instanceof(File, { message: "Lütfen bir ses dosyası seçin." }).nullable(),
  loop: z.boolean().default(true),
});

type NewSoundFormData = z.infer<typeof newSoundFormSchema>;

function NewSoundForm({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (open: boolean) => void }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const form = useForm<NewSoundFormData>({
        resolver: zodResolver(newSoundFormSchema),
        defaultValues: { name: "", loop: true, soundFile: null },
    });

    const onSubmit = async (data: NewSoundFormData) => {
        setIsSubmitting(true);
        try {
            if (!data.soundFile) {
                throw new Error("Lütfen bir ses dosyası seçin.");
            }
            toast({ title: "Ses Yükleniyor..." });
            const file = data.soundFile;
            const destinationPath = `ambient-sounds/${file.name.replace(/[^a-zA-Z0-9.]/g, '-')}-${Date.now()}`;
            
            // Create a Data URI from the file for the migration flow
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const imageDataUri = reader.result as string;
                const migrationResult = await migrateImage({ imageDataUri, destinationPath });

                if (!migrationResult.success || !migrationResult.newUrl) {
                    throw new Error(migrationResult.error || "Ses dosyası yüklenemedi.");
                }

                const soundData: Omit<AmbientSound, 'id' | 'familyId'> = {
                    name: data.name,
                    url: migrationResult.newUrl,
                    loop: data.loop,
                };

                await addAmbientSound(soundData);
                toast({ title: "✅ Ses Eklendi", description: `"${data.name}" sesi kütüphaneye eklendi.` });
                form.reset();
                onOpenChange(false);
            };

            reader.onerror = (error) => {
                throw new Error("Dosya okunurken bir hata oluştu.");
            };

        } catch (e: any) {
            toast({ title: "❌ Hata", description: e.message || "İşlem sırasında bir hata oluştu.", variant: 'destructive'});
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-slate-900 border-white/10 text-slate-100 rounded-[2rem]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Yeni Ambiyans Sesi Ekle</DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Okuma seanslarında kullanmak için yeni bir ses yükleyin.
                    </DialogDescription>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-slate-300 font-bold text-xs uppercase tracking-wider">Ses Adı</FormLabel>
                                    <FormControl>
                                        <Input placeholder="örn: Yağmur Sesi" {...field} className="bg-white/5 border-white/10 text-slate-100 rounded-xl h-12 focus:border-orange-500 transition-all"/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="soundFile"
                            render={({ field: { onChange, value, ...fieldProps } }) => (
                                <FormItem>
                                    <FormLabel className="text-slate-300 font-bold text-xs uppercase tracking-wider">Ses Dosyası</FormLabel>
                                    <FormControl>
                                        <Input type="file" accept="audio/*" {...fieldProps} onChange={(e) => onChange(e.target.files?.[0] || null)} className="bg-white/5 border-white/10 text-slate-100 rounded-xl file:text-slate-100 file:bg-white/10 file:border-0 file:rounded-lg file:mr-4 hover:file:bg-white/20"/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="loop"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
                                    <FormLabel className="text-slate-300 font-bold text-sm">Sesi Döngüye Al</FormLabel>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                         <DialogFooter className="gap-2">
                            <Button variant="ghost" onClick={() => onOpenChange(false)} type="button" className="text-slate-400 hover:text-white hover:bg-white/10">İptal</Button>
                            <Button type="submit" disabled={isSubmitting} className="bg-orange-600 hover:bg-orange-500 text-white rounded-xl">
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Ekle
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}