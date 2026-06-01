"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

import { 
  Loader2, Plus, Search, Trash2, Library, FilePlus, 
  Edit, X, UploadCloud, ChevronRight, ChevronDown, Settings, 
  Download, MoreVertical, FolderOpen, BookOpen, ArrowLeft
} from 'lucide-react';

import { Book, UserLibrary, FamilyMember } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

import { searchBooks } from '@/ai/flows/search-books-flow';
import { migrateImage } from '@/ai/flows/migrate-image-flow';
import { onBooksUpdate, onTagsUpdate, addBook, updateBook, deleteBook, updateTags, addBookToMemberLibrary, deleteTag } from '@/lib/dataService';
import { useAuth } from '@/components/auth-provider';
import { BookDetailDialog } from '@/components/book-detail-dialog';
import { BookForm, BookFormData } from '@/components/new-book-form';
import { cn } from "@/lib/utils";

const appTheme = {
    BG: "bg-[#F2F2F7] dark:bg-slate-950 transition-colors duration-300",
    HEADER_BG: "bg-white/85 dark:bg-slate-950/85 backdrop-blur-xl border-b border-black/[0.05] dark:border-white/[0.05] sticky top-0 z-40",
    CARD_BG: "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none rounded-3xl",
    TEXT_MAIN: "text-slate-900 dark:text-slate-100",
    TEXT_MUTED: "text-slate-500 dark:text-slate-400",
    ICON_BOX: "bg-indigo-50 dark:bg-indigo-500/10 p-2 rounded-2xl text-indigo-600 dark:text-indigo-400",
    FAB: "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl shadow-indigo-200 dark:shadow-none bg-indigo-600 hover:bg-indigo-700 text-white z-50 flex items-center justify-center transition-transform hover:scale-105 active:scale-95",
    INPUT_BG: "bg-slate-100 dark:bg-slate-900 border-transparent text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl transition-all",
    TABS_CONTAINER: "bg-slate-200/60 dark:bg-slate-900 p-1 rounded-full",
    TAB_TRIGGER: "rounded-full px-6 py-2 text-sm font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-indigo-700 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-sm text-slate-600 dark:text-slate-400 transition-all"
};

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

const shelfFormSchema = z.object({
    name: z.string().min(1, "Raf adı boş olamaz."),
});
type ShelfFormData = z.infer<typeof shelfFormSchema>;

export function ArchiveClient() {
  const router = useRouter();
  const { familyId, familyMembers } = useAuth();
  const { toast } = useToast();

  const [books, setBooks] = useState<Book[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  
  const [isAddBookDialogOpen, setIsAddBookDialogOpen] = useState(false);
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [isBulkJsonDialogOpen, setIsBulkJsonDialogOpen] = useState(false);
  
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [viewingBook, setViewingBook] = useState<Book | null>(null);
  const [editingShelf, setEditingShelf] = useState<{ originalName: string; isNew: boolean } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [view, setView] = useState<'books' | 'management'>('books');
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Partial<Book>[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("adults");

  const formMethods = useForm<BookFormData>({ resolver: zodResolver(bookFormSchema) });
  const shelfFormMethods = useForm<ShelfFormData>({ resolver: zodResolver(shelfFormSchema) });
  
  useEffect(() => {
    const unsubscribeBooks = onBooksUpdate(setBooks);
    const unsubscribeTags = onTagsUpdate("libraryTags", setAllTags);
    return () => {
        unsubscribeBooks();
        unsubscribeTags();
    };
  }, []);

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
             const destinationPath = `book-covers/${(formData.title || 'untitled').replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.jpg`;
             const migrationResult = await migrateImage({ imageDataUri: formData.image, destinationPath });
             if (migrationResult.success && migrationResult.newUrl) {
                finalImageUrl = migrationResult.newUrl;
             }
        }
        
        const bookData: any = { ...formData, image: finalImageUrl };
        if (bookData.pageCount === undefined) delete bookData.pageCount;
        
        if (editingBook) {
            await updateBook(editingBook.id, bookData);
            toast({ title: "Kitap Güncellendi" });
        } else {
            await addBook({
                type: 'Kitap',
                rating: 0,
                description: '',
                isForChildren: false,
                readers: [],
                ...bookData,
            });
            toast({ title: "Kitap Eklendi" });
        }
        setIsAddBookDialogOpen(false);
    } catch(e: any) {
        toast({ title: "Hata", description: e.message, variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    try {
        await deleteBook(bookId);
        toast({ title: "Kitap Silindi" });
    } catch(e) {
        toast({ title: "Hata", variant: 'destructive'});
    }
  };
  
  const handleAddToLibrary = async (bookId: string, memberId: string) => {
    if (!familyId) return;
    try {
        await addBookToMemberLibrary(familyId, memberId, bookId);
        const member = familyMembers.find(m => m.id === memberId);
        toast({ title: "Kitaplığa Eklendi", description: `${member?.name} kütüphanesine eklendi.` });
    } catch (e) {
        toast({ title: "Hata", variant: "destructive" });
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
            setSearchResults(result.books);
        } else {
            setSearchError(result.error || 'Arama hatası.');
        }
    } catch (e) {
        setSearchError('Beklenmedik bir hata oluştu.');
    } finally {
        setIsSearching(false);
    }
  }, []);
  
  const handleSelectSearchResult = async (book: Partial<Book>) => {
    setIsSearchDialogOpen(false);
    handleOpenAddDialog(book);
  };

  const handleDownloadList = () => {
    if (books.length === 0) {
      toast({ title: "Hata", description: "İndirilecek kitap yok.", variant: "destructive" });
      return;
    }
    const headers = ["Kitap Adı", "Yazar", "Sayfa", "Raflar", "Çocuk"];
    const rows = books.map(book => [
      `"${book.title.replace(/"/g, '""')}"`,
      `"${(book.author || '').replace(/"/g, '""')}"`,
      book.pageCount || 0,
      `"${(book.tags || []).join(', ').replace(/"/g, '""')}"`,
      book.isForChildren ? "Evet" : "Hayır"
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kitap-listesi-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Başarılı", description: "CSV dosyası indirildi." });
  };
  
  const { adultBooks, childrenBooks } = useMemo(() => {
    const adults: Book[] = [];
    const children: Book[] = [];
    const filtered = books.filter(book => {
      if (!localSearchQuery) return true;
      const q = localSearchQuery.toLowerCase();
      return book.title.toLowerCase().includes(q) || (book.author && book.author.toLowerCase().includes(q));
    });
    filtered.forEach(book => book.isForChildren ? children.push(book) : adults.push(book));
    return { adultBooks: adults, childrenBooks: children };
  }, [books, localSearchQuery]);

  return (
    <div className={cn("min-h-[100dvh] font-sans pb-24 relative overflow-hidden flex flex-col", appTheme.BG)}>
      
      {/* NATIVE APP BAR */}
      <header className={cn("py-3 px-4 transition-all duration-300", appTheme.HEADER_BG)}>
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#2C2C2E]">
                      <ArrowLeft className="w-6 h-6" />
                  </Button>
                  <div>
                      <h1 className={cn("text-xl font-bold leading-tight", appTheme.TEXT_MAIN)}>Arşiv</h1>
                      <p className={cn("text-xs font-medium", appTheme.TEXT_MUTED)}>Aile Kütüphanesi</p>
                  </div>
              </div>

              <div className="flex items-center gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#2C2C2E]">
                            <MoreVertical className="w-5 h-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white dark:bg-[#1C1C1E] border-slate-100 dark:border-white/10 rounded-2xl shadow-xl w-48 p-1 text-slate-900 dark:text-white">
                        <DropdownMenuItem onClick={() => setView(view === 'books' ? 'management' : 'books')} className="rounded-xl cursor-pointer py-2.5 dark:focus:bg-[#2C2C2E]">
                            <Settings className="mr-2 h-4 w-4 text-slate-500 dark:text-slate-400"/> {view === 'books' ? 'Raf Yönetimi' : 'Kitaplara Dön'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/10 my-1" />
                        <DropdownMenuItem onClick={() => setIsBulkJsonDialogOpen(true)} className="rounded-xl cursor-pointer py-2.5 dark:focus:bg-[#2C2C2E]">
                            <FilePlus className="mr-2 h-4 w-4 text-slate-500 dark:text-slate-400"/> Toplu Ekle (JSON)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleDownloadList} className="rounded-xl cursor-pointer py-2.5 text-indigo-600 dark:text-indigo-400 focus:text-indigo-700 dark:focus:text-indigo-300 dark:focus:bg-[#2C2C2E]">
                            <Download className="mr-2 h-4 w-4"/> Listeyi İndir (CSV)
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
              </div>
          </div>
      </header>
      
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 relative z-10 flex flex-col min-h-0">
      
      {/* MOBİL ARAMA ÇUBUĞU */}
      <div className="mb-6 relative">
          <Search className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5", appTheme.TEXT_MUTED)} />
          <Input 
            placeholder="Kitap veya yazar ara..." 
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            className={cn("pl-11 h-12 text-[15px]", appTheme.INPUT_BG)} 
          />
      </div>

      {view === 'books' ? (
        <Tabs defaultValue="adults" onValueChange={setActiveTab} className="flex flex-col flex-grow">
          <div className="flex items-center justify-center mb-6">
             <div className={appTheme.TABS_CONTAINER}>
                <TabsList className="bg-transparent h-auto flex p-0 gap-1">
                    <TabsTrigger value="adults" className={appTheme.TAB_TRIGGER}>Yetişkinler</TabsTrigger>
                    <TabsTrigger value="children" className={appTheme.TAB_TRIGGER}>Çocuklar</TabsTrigger>
                </TabsList>
             </div>
          </div>
          <TabsContent value="adults" className="mt-0"><BookShelf books={adultBooks} onViewDetails={setViewingBook} onEdit={handleOpenAddDialog} onDelete={handleDeleteBook} onAddToLibrary={handleAddToLibrary} familyMembers={familyMembers} /></TabsContent>
          <TabsContent value="children" className="mt-0"><BookShelf books={childrenBooks} onViewDetails={setViewingBook} onEdit={handleOpenAddDialog} onDelete={handleDeleteBook} onAddToLibrary={handleAddToLibrary} familyMembers={familyMembers} /></TabsContent>
        </Tabs>
      ) : (
        <div className="animate-in fade-in duration-300">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 px-2">Raf Yönetimi</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {allTags.map((tag) => (
                    <div key={tag} className="flex items-center justify-between p-4 bg-white dark:bg-[#1C1C1E] rounded-2xl border border-slate-100 dark:border-white/10 shadow-sm dark:shadow-none">
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-50 dark:bg-indigo-500/10 p-2 rounded-xl text-indigo-500"><FolderOpen className="w-5 h-5" /></div>
                            <p className="font-semibold text-slate-700 dark:text-slate-200">{tag}</p>
                        </div>
                        <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-full"><Trash2 className="w-4 h-4"/></Button></AlertDialogTrigger>
                            <AlertDialogContent className="bg-white dark:bg-[#1C1C1E] rounded-[2rem] border-slate-100 dark:border-white/10 p-6 text-slate-900 dark:text-white">
                                <AlertDialogHeader><AlertDialogTitle className="text-xl">Rafı Sil</AlertDialogTitle><AlertDialogDescription className="text-slate-500 dark:text-slate-400">"{tag}" rafı tüm kitaplardan kaldırılacak. Kitaplar silinmez, sadece bu etiket kalkar.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter className="mt-4"><AlertDialogCancel className="rounded-xl border-slate-200 dark:border-white/10 dark:text-white">İptal</AlertDialogCancel><AlertDialogAction onClick={() => deleteTag("libraryTags", tag, "book")} className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md">Rafı Sil</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                ))}
            </div>
        </div>
      )}
      </main>

      {/* FLOATING ACTION BUTTON (FAB) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <button className={appTheme.FAB}>
                <Plus className="w-7 h-7" />
            </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={15} className="bg-white dark:bg-[#1C1C1E] border-slate-100 dark:border-white/10 rounded-2xl shadow-2xl p-2 w-56 mb-4 text-slate-900 dark:text-white">
            <DropdownMenuItem onClick={() => setIsSearchDialogOpen(true)} className="rounded-xl cursor-pointer py-3 text-[15px] font-medium text-slate-700 dark:text-slate-200 dark:focus:bg-[#2C2C2E]">
                <Search className="mr-3 h-5 w-5 text-indigo-500 dark:text-indigo-400"/> İnternette Ara
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleOpenAddDialog()} className="rounded-xl cursor-pointer py-3 text-[15px] font-medium text-slate-700 dark:text-slate-200 dark:focus:bg-[#2C2C2E]">
                <Edit className="mr-3 h-5 w-5 text-indigo-500 dark:text-indigo-400"/> Manuel Ekle
            </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* DIALOGS (Bottom Sheet Styling for Mobile) */}
      <BookDetailDialog book={viewingBook} isOpen={!!viewingBook} onOpenChange={setViewingBook} onEdit={handleOpenAddDialog} onAddToLibrary={handleAddToLibrary} familyMembers={familyMembers} />

      <Dialog open={isAddBookDialogOpen} onOpenChange={setIsAddBookDialogOpen}>
          <DialogContent className="w-[95vw] md:max-w-2xl lg:max-w-3xl flex flex-col max-h-[90dvh] bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 rounded-[2rem] p-0 overflow-hidden shadow-2xl text-slate-900 dark:text-white">
            <FormProvider {...formMethods}>
              <form onSubmit={formMethods.handleSubmit(handleAddOrUpdateBook)} className="flex flex-col min-h-0 flex-1">
                <DialogHeader className="p-6 pb-4 shrink-0 border-b border-slate-100 dark:border-slate-800">
                    <DialogTitle className="text-xl font-bold">{editingBook ? 'Kitabı Düzenle' : 'Yeni Kitap'}</DialogTitle>
                </DialogHeader>
                 <div className="overflow-y-auto px-6 py-4 flex-1 min-h-0">
                     <BookForm existingTags={allTags} />
                 </div>
                <DialogFooter className="p-4 shrink-0 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex flex-row justify-end gap-2 sm:gap-3">
                    <Button variant="ghost" type="button" onClick={() => setIsAddBookDialogOpen(false)} className="rounded-full font-medium px-5">İptal</Button>
                    <Button type="submit" disabled={isSubmitting} className="rounded-full font-medium px-6 bg-indigo-600 text-white hover:bg-indigo-700 shadow-md">
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {editingBook ? 'Kaydet' : 'Ekle'}
                    </Button>
                </DialogFooter>
              </form>
            </FormProvider>
          </DialogContent>
      </Dialog>
      
      <Dialog open={isSearchDialogOpen} onOpenChange={setIsSearchDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 rounded-[2rem] p-6 shadow-2xl text-slate-900 dark:text-white">
            <DialogHeader><DialogTitle className="text-xl font-bold">Kitap Ara</DialogTitle></DialogHeader>
            <div className="flex gap-2 pt-2">
                <Input placeholder="Kitap veya yazar adı..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)} className={appTheme.INPUT_BG}/>
                <Button disabled={isSearching} onClick={() => handleSearch(searchQuery)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 shadow-md">
                    {isSearching ? <Loader2 className="animate-spin w-5 h-5" /> : <Search className="w-5 h-5" />}
                </Button>
            </div>
            
            {searchError && <p className="text-sm text-rose-500 mt-2 px-1">{searchError}</p>}
            
            <ScrollArea className="h-[50vh] sm:h-72 mt-4">
                <div className="space-y-3 pr-3">
                  {searchResults.map((book, idx) => (
                    <div key={idx} onClick={() => handleSelectSearchResult(book)} className="flex items-start gap-4 p-3 bg-white dark:bg-[#2C2C2E] border border-slate-100 dark:border-transparent shadow-sm rounded-2xl cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-500 transition-all active:scale-[0.98]">
                      <div className="w-12 h-16 relative rounded-lg overflow-hidden shrink-0 shadow-sm border border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-black">
                          <Image src={book.image || 'https://placehold.co/80x120.png'} alt={book.title || ''} fill className="object-cover" />
                      </div>
                      <div className="flex-grow pt-1">
                          <p className="font-bold text-sm text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight mb-1">{book.title}</p>
                          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{book.author}</p>
                      </div>
                      <div className="bg-indigo-50 dark:bg-indigo-500/20 p-1.5 rounded-full text-indigo-600 dark:text-indigo-400 mt-1">
                          <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  ))}
                  {searchResults.length === 0 && !isSearching && searchQuery && !searchError && (
                      <p className="text-center text-slate-500 dark:text-slate-400 mt-10">Sonuç bulunamadı.</p>
                  )}
                </div>
            </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BookShelf({ books, onEdit, onDelete, onAddToLibrary, familyMembers, onViewDetails }: { books: Book[], onEdit: (book: Book) => void, onDelete: (id: string) => void, onAddToLibrary: (bookId: string, memberId: string) => void, familyMembers: any[], onViewDetails: (book: Book) => void }) {
  const shelves = useMemo(() => {
    const grouped: Record<string, Book[]> = {};
    books.forEach(book => {
      const tags = book.tags && book.tags.length > 0 ? book.tags : ["Kategorisiz"];
      tags.forEach(tag => {
        if (!grouped[tag]) grouped[tag] = [];
        if(!grouped[tag].some(b => b.id === book.id)) grouped[tag].push(book);
      });
    });
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b, 'tr'));
  }, [books]);
  
  if (books.length === 0) return (
      <div className="p-12 mt-10 flex flex-col items-center text-center bg-slate-100/50 dark:bg-[#1C1C1E]/50 border border-dashed border-slate-300 dark:border-slate-700 rounded-[2rem]">
          <BookOpen className="w-10 h-10 text-slate-400 dark:text-slate-600 mb-3" />
          <h3 className="text-slate-700 dark:text-slate-300 font-bold text-lg">Bu Bölüm Boş</h3>
          <p className="text-slate-500 dark:text-slate-500 text-sm mt-1">Sağ alt köşedeki + butonundan kitap ekleyebilirsiniz.</p>
      </div>
  );
  
  return (
    <div className="space-y-10 pb-10">
      {shelves.map(([name, shelfBooks]) => (
        <div key={name} className="flex flex-col">
            <div className="flex items-center justify-between mb-4 px-2">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    {name} <span className="text-xs font-semibold bg-slate-200 dark:bg-[#2C2C2E] text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">{shelfBooks.length}</span>
                </h2>
                <ChevronRight className="w-5 h-5 text-slate-400" />
            </div>
            
            <div className="flex overflow-x-auto gap-4 pb-4 px-2 snap-x snap-mandatory scrollbar-hide -mx-2">
                {shelfBooks.map(book => (
                    <div key={book.id} className="snap-start w-[110px] sm:w-32 shrink-0 flex flex-col gap-2 group">
                        
                        {/* Kitap Kapağı */}
                        <div 
                            onClick={() => onViewDetails(book)} 
                            className="relative aspect-[2/3] rounded-xl shadow-md border border-slate-100 dark:border-transparent overflow-hidden cursor-pointer bg-slate-100 dark:bg-slate-800 transition-transform active:scale-95"
                        >
                            <Image src={book.image || `https://placehold.co/300x450.png`} alt={book.title} fill sizes="(max-width: 640px) 110px, 128px" className="object-cover" />
                        </div>
                        
                        {/* Kitap Bilgisi ve Menü */}
                        <div className="flex items-start justify-between gap-1 px-1">
                            <div className="flex flex-col">
                                <span className="text-[12px] font-bold text-slate-800 dark:text-slate-200 line-clamp-2 leading-tight" title={book.title}>{book.title}</span>
                                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{book.author || "Bilinmiyor"}</span>
                            </div>
                            
                            {/* Mobilde Hover Olmadığı İçin Native 3 Nokta Menüsü */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full -mr-2 text-slate-400 dark:text-slate-500 shrink-0 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300">
                                        <MoreVertical className="w-4 h-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-xl border-slate-100 dark:border-white/10 w-40 p-1 text-slate-900 dark:text-white">
                                    <DropdownMenuItem onClick={() => onViewDetails(book)} className="rounded-xl py-2 cursor-pointer font-medium text-slate-700 dark:text-slate-200 dark:focus:bg-[#2C2C2E]">
                                        <BookOpen className="w-4 h-4 mr-2 text-indigo-500 dark:text-indigo-400"/> İncele
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onEdit(book)} className="rounded-xl py-2 cursor-pointer font-medium text-slate-700 dark:text-slate-200 dark:focus:bg-[#2C2C2E]">
                                        <Edit className="w-4 h-4 mr-2 text-indigo-500 dark:text-indigo-400"/> Düzenle
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/10 my-1"/>
                                    <DropdownMenuItem onClick={() => onDelete(book.id)} className="rounded-xl py-2 cursor-pointer font-medium text-rose-600 dark:text-rose-400 focus:bg-rose-50 dark:focus:bg-rose-500/10 focus:text-rose-700 dark:focus:text-rose-300">
                                        <Trash2 className="w-4 h-4 mr-2"/> Sil
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      ))}
    </div>
  );
}