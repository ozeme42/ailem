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
  Loader2, PlusCircle, Search, Trash2, Library, FilePlus, 
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

// --- DESIGN SYSTEM ---
const glassColors = {
    CARD_BG: "bg-white/5 backdrop-blur-md border border-white/10 shadow-lg",
    CARD_HOVER: "hover:bg-white/10 hover:border-white/20 transition-all duration-300",
    TEXT_MAIN: "text-slate-100",
    TEXT_MUTED: "text-slate-400",
    HEADER_BG: "bg-slate-950/70 backdrop-blur-lg border-b border-white/5",
    ICON_BOX: "bg-gradient-to-br from-orange-500 to-orange-600 p-2 rounded-xl shadow-lg",
    BUTTON_GLASS: "bg-white/10 hover:bg-white/20 text-white border border-white/20",
    INPUT_BG: "bg-slate-900/50 border-white/10 text-slate-100 placeholder:text-slate-500 focus:border-orange-500/50",
};

const brightColors = [
    { id: 'blue-indigo', gradient: 'from-blue-500/20 to-indigo-600/20 border-blue-500/30 text-blue-200' },
    { id: 'teal-green', gradient: 'from-teal-400/20 to-green-500/20 border-teal-400/30 text-teal-200' },
    { id: 'amber-orange', gradient: 'from-amber-400/20 to-orange-500/20 border-amber-400/30 text-amber-200' },
    { id: 'rose-red', gradient: 'from-rose-400/20 to-red-500/20 border-rose-400/30 text-rose-200' },
    { id: 'cyan-sky', gradient: 'from-cyan-400/20 to-sky-500/20 border-cyan-400/30 text-cyan-200' },
    { id: 'violet-purple', gradient: 'from-violet-500/20 to-purple-600/20 border-violet-500/30 text-violet-200' },
];

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
        toast({ title: "❌ Hata", description: e.message, variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    try {
        await deleteBook(bookId);
        toast({ title: "Kitap Silindi", variant: 'destructive' });
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

  const handleShelfFormSubmit = async (data: ShelfFormData) => {
      if (!editingShelf) return;
      const newShelfName = data.name.trim();

      if (allTags.includes(newShelfName) && newShelfName !== editingShelf.originalName) {
          toast({ title: "Hata", description: "Bu kategori adı zaten mevcut.", variant: "destructive" });
          return;
      }
      
      try {
        if (editingShelf.isNew) {
            await updateTags("libraryTags", [...allTags, newShelfName]);
            toast({ title: "Kategori Eklendi"});
        }
      } catch (e) {
          toast({ title: "❌ Hata", variant: 'destructive'});
      }
      setEditingShelf(null);
  };

  return (
    <div className="min-h-[100dvh] bg-slate-950 font-sans text-slate-100 pb-24 relative overflow-hidden flex flex-col">
      <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-orange-900/30 rounded-full blur-[120px]" />
          <div className="absolute bottom-[20%] right-[-5%] w-[400px] h-[400px] bg-amber-900/20 rounded-full blur-[100px]" />
      </div>

      <div className={cn("sticky top-0 z-40 py-4 sm:px-6 transition-all duration-300", glassColors.HEADER_BG)}>
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full text-slate-400 hover:text-white">
                      <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div className={glassColors.ICON_BOX}>
                      <Library className="w-6 h-6 text-white" />
                  </div>
                  <div>
                      <p className={cn("text-xs font-semibold uppercase tracking-wider", glassColors.TEXT_MUTED)}>Kütüphane Arşivi</p>
                      <h1 className={cn("text-lg font-bold leading-none", glassColors.TEXT_MAIN)}>Kitaplığımız</h1>
                  </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                   <div className="relative flex-1 md:w-64">
                      <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", glassColors.TEXT_MUTED)} />
                      <Input 
                        placeholder="Kitap ara..." 
                        value={localSearchQuery}
                        onChange={(e) => setLocalSearchQuery(e.target.value)}
                        className={cn("pl-9 rounded-xl border-white/10", glassColors.CARD_BG)} 
                      />
                  </div>
                  <Button variant="outline" size="icon" className={cn("rounded-full", glassColors.BUTTON_GLASS)} onClick={() => setView(view === 'books' ? 'management' : 'books')}>
                      <Settings className="w-4 h-4" />
                  </Button>
                  <div className="flex gap-2">
                       <Button onClick={() => handleOpenAddDialog()} className="hidden md:flex rounded-full px-6 bg-orange-600 hover:bg-orange-700 shadow-md border-orange-500/50">
                           <PlusCircle className="w-4 h-4 mr-2" /> Yeni Kitap
                       </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="icon" className={cn("rounded-full", glassColors.BUTTON_GLASS)}>
                                <ChevronDown className="h-4 w-4"/>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-slate-900 border-white/10 text-slate-100">
                              <DropdownMenuItem onClick={() => setIsSearchDialogOpen(true)} className="cursor-pointer">
                                <Search className="mr-2 h-4 w-4"/> İnternette Ara
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setIsBulkJsonDialogOpen(true)} className="cursor-pointer">
                                <FilePlus className="mr-2 h-4 w-4"/> Toplu Ekle (JSON)
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-white/10" />
                              <DropdownMenuItem onClick={handleDownloadList} className="cursor-pointer text-emerald-400">
                                <Download className="mr-2 h-4 w-4"/> Listeyi İndir (CSV)
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                  </div>
              </div>
          </div>
      </div>
      
      <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 relative z-10 flex flex-col min-h-0">
      {view === 'books' ? (
        <Tabs defaultValue="adults" onValueChange={setActiveTab} className="flex flex-col flex-grow">
          <div className="flex items-center justify-center mb-6">
             <div className="p-1 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                <TabsList className="bg-transparent h-auto flex p-0 gap-2">
                    <TabsTrigger value="adults" className="rounded-xl px-6 py-2 data-[state=active]:bg-white/10 data-[state=active]:text-white">Yetişkin</TabsTrigger>
                    <TabsTrigger value="children" className="rounded-xl px-6 py-2 data-[state=active]:bg-white/10 data-[state=active]:text-white">Çocuk</TabsTrigger>
                </TabsList>
             </div>
          </div>
          <TabsContent value="adults"><BookShelf books={adultBooks} onViewDetails={setViewingBook} onEdit={handleOpenAddDialog} onDelete={handleDeleteBook} onAddToLibrary={handleAddToLibrary} familyMembers={familyMembers} /></TabsContent>
          <TabsContent value="children"><BookShelf books={childrenBooks} onViewDetails={setViewingBook} onEdit={handleOpenAddDialog} onDelete={handleDeleteBook} onAddToLibrary={handleAddToLibrary} familyMembers={familyMembers} /></TabsContent>
        </Tabs>
      ) : (
        <Card className={glassColors.CARD_BG}>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl font-bold">Raf Yönetimi</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allTags.map((tag, i) => (
                        <div key={tag} className={cn("flex items-center justify-between p-4 rounded-2xl border", brightColors[i % brightColors.length].gradient)}>
                            <p className="font-bold">{tag}</p>
                            <AlertDialog>
                                <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-rose-200"><Trash2 className="w-4 h-4"/></Button></AlertDialogTrigger>
                                <AlertDialogContent className="bg-slate-900 border-white/10 text-slate-100">
                                    <AlertDialogHeader><AlertDialogTitle>Rafı Sil?</AlertDialogTitle><AlertDialogDescription>"{tag}" rafı tüm kitaplardan kaldırılacak.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel className="bg-white/5">İptal</AlertDialogCancel><AlertDialogAction onClick={() => deleteTag("libraryTags", tag, "book")} className="bg-rose-600">Sil</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
      )}
      </div>

      <BookDetailDialog book={viewingBook} isOpen={!!viewingBook} onOpenChange={setViewingBook} onEdit={handleOpenAddDialog} onAddToLibrary={handleAddToLibrary} familyMembers={familyMembers} />

      <Dialog open={isAddBookDialogOpen} onOpenChange={setIsAddBookDialogOpen}>
          <DialogContent className="sm:max-w-lg flex flex-col h-full max-h-[90vh] bg-slate-900 border-white/10 text-slate-100 rounded-[2rem]">
            <FormProvider {...formMethods}>
              <form id="book-form" onSubmit={formMethods.handleSubmit(handleAddOrUpdateBook)} className="flex-1 flex flex-col min-h-0">
                <DialogHeader><DialogTitle>{editingBook ? 'Kitabı Düzenle' : 'Yeni Kitap'}</DialogTitle></DialogHeader>
                 <ScrollArea className="flex-1 pr-6 py-4"><BookForm existingTags={allTags} /></ScrollArea>
                <DialogFooter className="pt-4 border-t border-white/10"><Button variant="ghost" type="button" onClick={() => setIsAddBookDialogOpen(false)}>İptal</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingBook ? 'Kaydet' : 'Ekle'}</Button></DialogFooter>
              </form>
            </FormProvider>
          </DialogContent>
      </Dialog>
      
      <Dialog open={isSearchDialogOpen} onOpenChange={setIsSearchDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-slate-900 border-white/10 text-slate-100 rounded-[2rem]">
            <DialogHeader><DialogTitle>İnternette Ara</DialogTitle></DialogHeader>
            <div className="flex gap-2 pt-4">
                <Input placeholder="Kitap veya yazar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)} className={glassColors.INPUT_BG}/>
                <Button disabled={isSearching} onClick={() => handleSearch(searchQuery)} className="bg-orange-600">{isSearching ? <Loader2 className="animate-spin" /> : <Search className="w-4 h-4" />}</Button>
            </div>
            <ScrollArea className="h-64 mt-4">
                <div className="space-y-2 pr-4">
                  {searchResults.map((book, idx) => (
                    <div key={idx} onClick={() => handleSelectSearchResult(book)} className="flex items-center gap-4 p-3 border border-white/5 rounded-2xl cursor-pointer hover:bg-white/10 bg-white/5">
                      <Image src={book.image || 'https://placehold.co/80x120.png'} alt={book.title || ''} width={40} height={60} className="rounded" />
                      <div className="flex-grow"><p className="font-bold text-sm">{book.title}</p><p className="text-xs text-slate-400">{book.author}</p></div>
                      <PlusCircle className="w-5 h-5 text-orange-500" />
                    </div>
                  ))}
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
      const tags = book.tags && book.tags.length > 0 ? book.tags : ["Diğer"];
      tags.forEach(tag => {
        if (!grouped[tag]) grouped[tag] = [];
        if(!grouped[tag].some(b => b.id === book.id)) grouped[tag].push(book);
      });
    });
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b, 'tr'));
  }, [books]);
  
  if (books.length === 0) return <div className="p-12 text-center text-slate-500 border border-dashed rounded-[2rem]">Kütüphane Boş</div>;
  
  return (
    <div className="space-y-8">
      {shelves.map(([name, shelfBooks], i) => (
        <div key={name} className={cn("rounded-[2rem] p-6 border bg-gradient-to-br", brightColors[i % brightColors.length].gradient)}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white"><FolderOpen className="w-5 h-5"/>{name}</h2>
            <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide">
                {shelfBooks.map(book => (
                    <div key={book.id} onClick={() => onViewDetails(book)} className="group relative w-36 shrink-0 cursor-pointer hover:-translate-y-1 transition-all">
                        <Image src={book.image || `https://placehold.co/300x450.png`} alt={book.title} width={300} height={450} className="rounded-xl aspect-[2/3] object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 rounded-xl">
                            <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); onEdit(book); }}><Edit className="w-4 h-4"/></Button>
                            <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); onDelete(book.id); }}><Trash2 className="w-4 h-4"/></Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      ))}
    </div>
  );
}
