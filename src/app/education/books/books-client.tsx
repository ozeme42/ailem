
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Trash2, BookMarked, Library, FileText, HelpCircle, CheckCircle, XCircle, Edit, MoreVertical, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { onTrackedBooksUpdate, addTrackedBook, deleteTrackedBook, updateTrackedBook, onAllTrackedBookTestsUpdate, onTestsUpdate } from "@/lib/dataService";
import type { TrackedBook, TrackedBookTest, Test } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// --- DESIGN SYSTEM: Glassmorphism ---
const glassColors = {
    HEADER_BG: "bg-slate-950/70 backdrop-blur-lg border-b border-white/5",
    CARD_BG: "bg-white/5 border border-white/10 shadow-lg backdrop-blur-md",
    ICON_BOX: "bg-gradient-to-br p-2.5 rounded-xl shadow-lg",
    BUTTON_GLASS: "bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow-sm",
    INPUT_BG: "bg-slate-900/50 border-white/10 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500/50",
};

const cardColors = [
    'from-blue-600 to-indigo-700',
    'from-emerald-600 to-teal-700',
    'from-rose-600 to-pink-700',
    'from-orange-500 to-red-600',
    'from-amber-500 to-orange-600',
    'from-violet-600 to-purple-700',
];

export function BooksClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [books, setBooks] = useState<TrackedBook[]>([]);
  const [allBookTests, setAllBookTests] = useState<TrackedBookTest[]>([]);
  const [allTests, setAllTests] = useState<Test[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<TrackedBook | null>(null);
  const [newBook, setNewBook] = useState({ title: "", publisher: "", bookType: "standard" as "standard" | "open_ended" });

  useEffect(() => {
    const unsubBooks = onTrackedBooksUpdate((books) => {
        setBooks(books);
        setIsLoading(false);
    });
    const unsubTests = onAllTrackedBookTestsUpdate(setAllBookTests);
    const unsubAssignments = onTestsUpdate((tests) => {
        setAllTests(tests.filter(t => t.sourceType === 'trackedBook'));
    });

    return () => {
        unsubBooks();
        unsubTests();
        unsubAssignments();
    };
  }, []);
  
  useEffect(() => {
    if (editingBook) {
        setNewBook({ title: editingBook.title, publisher: editingBook.publisher, bookType: editingBook.bookType || 'standard' });
    } else {
        setNewBook({ title: "", publisher: "", bookType: "standard" });
    }
  }, [editingBook])

  const enrichedBooks = useMemo(() => {
    return books.map(book => {
        const bookTests = allBookTests.filter(bt => bt.bookId === book.id);
        const testIds = bookTests.map(bt => bt.id);
        const associatedTests = allTests.filter(t => testIds.includes(t.sourceId || ''));
        const solvedTests = associatedTests.filter(t => t.status === 'Sonuçlandı');
        
        const subjectCount = new Set(bookTests.map(bt => bt.subjectId)).size;
        const testCount = bookTests.length;
        const questionCount = bookTests.reduce((acc, bt) => acc + bt.questionCount, 0);
        
        const totalCorrect = solvedTests.reduce((acc, t) => acc + (t.correctAnswers || 0), 0);
        const totalIncorrect = solvedTests.reduce((acc, t) => acc + (t.incorrectAnswers || 0), 0);

        return {
            ...book,
            subjectCount,
            testCount,
            questionCount,
            solvedTestCount: solvedTests.length,
            totalCorrectAnswers: totalCorrect,
            totalIncorrectAnswers: totalIncorrect
        };
    });
  }, [books, allBookTests, allTests]);

  const handleAddOrUpdateBook = async () => {
    if (!newBook.title.trim() || !newBook.publisher.trim()) {
      toast({
        title: "Hata",
        description: "Lütfen tüm alanları doldurun!",
        variant: "destructive"
      });
      return;
    }

    try {
        if(editingBook) {
            await updateTrackedBook(editingBook.id, newBook);
            toast({ title: "Kitap başarıyla güncellendi!" });
        } else {
            await addTrackedBook(newBook);
            toast({ title: "Kitap başarıyla eklendi!" });
        }
      setNewBook({ title: "", publisher: "", bookType: "standard" });
      setIsDialogOpen(false);
      setEditingBook(null);
    } catch (error: any) {
      console.error('Error processing book:', error);
      toast({
        title: "Hata",
        description: error.message || 'İşlem sırasında bir hata oluştu!',
        variant: "destructive"
      });
    }
  };

  const handleDeleteBook = async (id: string) => {
    try {
      await deleteTrackedBook(id);
      toast({ title: "Kitap silindi!", variant: "destructive" });
    } catch (error: any) {
      console.error('Error deleting book:', error);
      toast({
        title: "Hata",
        description: error.message || 'Kitap silinemedi!',
        variant: "destructive"
      });
    }
  };

  const handleManageBook = (bookId: string) => {
    router.push(`/education/books/${bookId}`);
  };
  
  const openDialog = (book: TrackedBook | null) => {
      setEditingBook(book);
      setIsDialogOpen(true);
  }
  
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden flex flex-col">
        {/* FIXED BACKGROUND */}
        <div className="fixed inset-0 bg-slate-950 -z-50" />
        
        {/* AMBIENT BACKGROUND */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[20%] right-[-5%] w-[400px] h-[400px] bg-cyan-900/20 rounded-full blur-[120px]" />
        </div>

        {/* HEADER */}
        <div className={cn("sticky top-0 z-40 w-full transition-all duration-300", glassColors.HEADER_BG)}>
            <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                     <Link href="/education/management">
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors -ml-2">
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                    </Link>
                    <div className={cn("from-blue-500 to-cyan-600", glassColors.ICON_BOX)}>
                         <BookMarked className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-slate-100 leading-none">
                            Kitap Takibi
                        </h1>
                        <p className="text-xs font-medium text-slate-400 mt-0.5">Kütüphane Yönetimi</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button 
                        onClick={() => openDialog(null)}
                        className="rounded-xl px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-500/20 border border-indigo-400/20 h-9 text-sm"
                    >
                        <Plus className="mr-1.5 h-4 w-4" /> Yeni Kitap
                    </Button>
                </div>
            </div>
        </div>

      <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 relative z-10 flex flex-col min-h-0">
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : enrichedBooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10 m-auto max-w-lg w-full">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
                <BookMarked className="h-8 w-8 text-slate-500" />
            </div>
            <div>
                <h3 className="text-lg font-bold text-slate-200">Kitap Yok</h3>
                <p className="text-slate-400 mt-1 text-sm">Takip edilecek henüz bir kitap eklenmemiş.</p>
                <Button variant="link" className="text-indigo-400 mt-2" onClick={() => openDialog(null)}>İlk kitabı ekle</Button>
            </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrichedBooks.map((book, index) => (
            <Card key={book.id} className={cn("flex flex-col text-white border-0 bg-gradient-to-br shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group", cardColors[index % cardColors.length])}>
                {/* Decorative Overlay */}
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                
              <CardHeader className="relative z-10 pb-2">
                <div className="flex justify-between items-start">
                    <div className="pr-8">
                        <CardTitle className="text-xl font-bold leading-tight line-clamp-2">{book.title}</CardTitle>
                        <CardDescription className="text-white/70 font-medium mt-1">{book.publisher}</CardDescription>
                    </div>
                     <div className="flex items-center -mt-2 -mr-2 absolute top-4 right-4">
                        <DropdownMenu>
                             <DropdownMenuTrigger asChild>
                                 <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/20 rounded-full">
                                     <MoreVertical className="h-4 w-4" />
                                 </Button>
                             </DropdownMenuTrigger>
                             <DropdownMenuContent align="end" className="bg-slate-900 border-white/10 text-slate-100">
                                 <DropdownMenuItem onClick={() => openDialog(book)} className="cursor-pointer">
                                     <Edit className="mr-2 h-4 w-4"/> Düzenle
                                 </DropdownMenuItem>
                                 <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                         <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-rose-400 focus:text-rose-300 focus:bg-rose-500/10 cursor-pointer">
                                            <Trash2 className="mr-2 h-4 w-4"/> Sil
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="bg-slate-900 border-white/10 text-slate-100">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Kitabı Sil?</AlertDialogTitle>
                                            <AlertDialogDescription className="text-slate-400">
                                                "{book.title}" kitabını ve içindeki tüm verileri kalıcı olarak silmek istediğinizden emin misiniz?
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-200">İptal</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteBook(book.id)} className="bg-rose-600 hover:bg-rose-700 text-white border-none">Evet, Sil</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                             </DropdownMenuContent>
                         </DropdownMenu>
                     </div>
                </div>
                 <Badge variant={book.bookType === 'open_ended' ? 'outline' : 'secondary'} className="w-fit mt-3 bg-black/20 text-white border-white/20 backdrop-blur-sm hover:bg-black/30 transition-colors">
                    {book.bookType === 'open_ended' ? 'Açık Uçlu' : 'Standart Soru Bankası'}
                 </Badge>
              </CardHeader>
              <CardContent className="flex-grow space-y-4 relative z-10">
                 <div className="space-y-2 text-sm text-white/90 bg-black/10 p-3 rounded-xl backdrop-blur-sm border border-white/5">
                    <div className="flex items-center justify-between"><span className="flex items-center gap-2 opacity-80"><Library className="h-3.5 w-3.5" /> Ders Sayısı</span> <span className="font-bold">{book.subjectCount || 0}</span></div>
                    <div className="flex items-center justify-between"><span className="flex items-center gap-2 opacity-80"><FileText className="h-3.5 w-3.5" /> Test Sayısı</span> <span className="font-bold">{book.testCount || 0}</span></div>
                    <div className="flex items-center justify-between"><span className="flex items-center gap-2 opacity-80"><HelpCircle className="h-3.5 w-3.5" /> Soru Sayısı</span> <span className="font-bold">{book.questionCount || 0}</span></div>
                </div>
                {(book.solvedTestCount || 0) > 0 && (
                    <div className="space-y-2 text-xs text-white/90 pt-2 border-t border-white/10">
                        <div className="flex justify-between items-center"><span className="opacity-70">Çözülen Test</span> <span className="font-mono bg-white/10 px-1.5 rounded">{book.solvedTestCount}</span></div>
                        <div className="flex justify-between items-center text-emerald-200"><span className="flex items-center gap-1"><CheckCircle className="h-3 w-3"/> Doğru</span> <span className="font-mono bg-emerald-500/20 px-1.5 rounded">{book.totalCorrectAnswers}</span></div>
                        <div className="flex justify-between items-center text-rose-200"><span className="flex items-center gap-1"><XCircle className="h-3 w-3"/> Yanlış</span> <span className="font-mono bg-rose-500/20 px-1.5 rounded">{book.totalIncorrectAnswers}</span></div>
                    </div>
                )}
              </CardContent>
              <CardFooter className="p-4 pt-0 relative z-10">
                <Button className="w-full bg-white/90 text-slate-900 hover:bg-white font-bold shadow-lg" onClick={() => handleManageBook(book.id)}>
                    Kitabı Yönet <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      </div>

       <Dialog open={isDialogOpen} onOpenChange={(open) => { if(!open) setEditingBook(null); setIsDialogOpen(open)}}>
            <DialogContent className="bg-slate-900 border-white/10 text-slate-100 sm:max-w-md rounded-2xl shadow-2xl">
                <DialogHeader>
                    <DialogTitle>{editingBook ? "Kitabı Düzenle" : "Yeni Kitap Ekle"}</DialogTitle>
                    <DialogDescription className="text-slate-400">{editingBook ? "Kitap bilgilerini güncelleyin." : "Takip edilecek yeni bir kitap oluşturun."}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="title" className="text-xs font-semibold text-slate-300 uppercase">Kitap Adı</Label>
                        <Input
                            id="title"
                            value={newBook.title}
                            onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                            placeholder="Örn: TYT Matematik Soru Bankası"
                            className={glassColors.INPUT_BG}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="publisher" className="text-xs font-semibold text-slate-300 uppercase">Yayınevi</Label>
                        <Input
                            id="publisher"
                            value={newBook.publisher}
                            onChange={(e) => setNewBook({ ...newBook, publisher: e.target.value })}
                            placeholder="Örn: Merkez Yayınları"
                            className={glassColors.INPUT_BG}
                        />
                    </div>
                    <div className="space-y-3">
                        <Label className="text-xs font-semibold text-slate-300 uppercase">Kitap Türü</Label>
                        <RadioGroup
                            value={newBook.bookType}
                            onValueChange={(value: "standard" | "open_ended") => setNewBook({ ...newBook, bookType: value })}
                            className="flex flex-col gap-2"
                        >
                            <div className="flex items-center space-x-2 p-3 rounded-xl border border-white/10 hover:bg-white/5 cursor-pointer transition-colors" onClick={() => setNewBook({ ...newBook, bookType: 'standard' })}>
                                <RadioGroupItem value="standard" id="standard" className="border-white/30 text-indigo-500" />
                                <Label htmlFor="standard" className="cursor-pointer flex-1">Standart Soru Bankası</Label>
                            </div>
                            <div className="flex items-center space-x-2 p-3 rounded-xl border border-white/10 hover:bg-white/5 cursor-pointer transition-colors" onClick={() => setNewBook({ ...newBook, bookType: 'open_ended' })}>
                                <RadioGroupItem value="open_ended" id="open_ended" className="border-white/30 text-indigo-500" />
                                <Label htmlFor="open_ended" className="cursor-pointer flex-1">Açık Uçlu Kitap</Label>
                            </div>
                        </RadioGroup>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-slate-400 hover:text-white hover:bg-white/10 rounded-xl">İptal</Button>
                    <Button onClick={handleAddOrUpdateBook} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-6">{editingBook ? "Güncelle" : "Ekle"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
