"use client";

import * as React from "react";
import Image from "next/image";
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { Book, UserLibrary, FamilyMember, ReadingGoals, ReadingSession, Book as BookType } from '@/lib/data';
import { onBooksUpdate, onUserLibrariesUpdate, updateUserBookStatus, removeBookFromMemberLibrary, addReadingSession, onReadingSessionsUpdate, updateFamilyMemberInFamily } from '@/lib/dataService';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, CheckSquare, Target, Library, BookUp, BookCheck, Trash2, ChevronDown, PlusCircle, MoreVertical, Edit, RotateCcw, Play, Pause, BarChart2, Book as BookIcon, Clock, Heart, Check, ChevronLeft, ChevronRight, Calendar as CalendarIcon, ArrowLeft } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter as AlertDialogFooterComponent, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { SetReadingGoalForm } from '@/components/reading-goal-form';
import { format, parseISO, subDays, isFuture, isPast, isToday, startOfWeek, endOfWeek, addDays, isSameDay, isWithinInterval, startOfMonth, endOfMonth, eachMonthOfInterval, getYear } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/page-header';
import { BookDetailDialog } from "@/components/book-detail-dialog";
import { useForm } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, Legend, LabelList } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { useRouter } from "next/navigation";

// --- TASARIM DEĞİŞKENLERİ (AÇIK TEMA) ---
const themeColors = {
    PAGE_BG: "bg-slate-50", // Sayfa arka planı
    HEADER_BG: "bg-white/80 backdrop-blur-lg border-b border-slate-200", // Header
    CARD_BG: "bg-white border border-slate-200 shadow-sm", // Kartlar
    CARD_HOVER: "hover:shadow-md transition-all duration-300",
    TEXT_MAIN: "text-slate-900",
    TEXT_MUTED: "text-slate-500",
    ICON_BOX: "bg-gradient-to-br from-amber-500 to-orange-600 p-2 rounded-xl shadow-md text-white",
    BUTTON_Ghost: "hover:bg-slate-100 text-slate-600 hover:text-slate-900",
};

const progressFormSchema = z.object({
  currentPage: z.coerce.number().min(0, "Sayfa numarası negatif olamaz."),
});

// --- HELPER COMPONENTS ---

function ProgressDialog({ open, onOpenChange, book, onSaveSession }: { 
    open: boolean,
    onOpenChange: (open: boolean) => void,
    book: (BookType & { progress?: number }) | null, 
    onSaveSession: (book: BookType, session: { pagesRead: number }) => void,
}) {
    const form = useForm<z.infer<typeof progressFormSchema>>({
        resolver: zodResolver(progressFormSchema),
    });

    React.useEffect(() => {
        if (book && open) {
            const initialPage = book.pageCount && book.progress ? Math.round((book.progress / 100) * book.pageCount) : 0;
            form.reset({ currentPage: initialPage });
        }
    }, [open, book, form]);
    
    if (!book) return null;

    const handleProgressSave = (data: z.infer<typeof progressFormSchema>) => {
        const targetPage = data.currentPage;
        if (isNaN(targetPage) || targetPage < 0 || !book.pageCount) return;

        const pagesReadCurrently = book.pageCount && book.progress ? Math.round((book.progress / 100) * book.pageCount) : 0;
        
        let newPagesReadThisSession = 0;
        if (targetPage > pagesReadCurrently) {
            newPagesReadThisSession = targetPage - pagesReadCurrently;
        }

        onSaveSession(book, { pagesRead: newPagesReadThisSession });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-white border-slate-200 text-slate-900 rounded-2xl shadow-xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-slate-900">İlerleme Gir: {book.title}</DialogTitle>
                    <DialogDescription className="text-slate-500">Şu an kitabın kaçıncı sayfasındasın?</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleProgressSave)} className="py-4 space-y-4">
                        <FormField
                            control={form.control}
                            name="currentPage"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-slate-700 font-bold text-xs uppercase tracking-wider">Sayfa Numarası</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} autoFocus className="bg-slate-50 border-slate-200 text-slate-900 h-12 rounded-xl focus:border-amber-500 transition-all focus:ring-amber-500" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter className="gap-2">
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-500 hover:text-slate-900 hover:bg-slate-100">İptal</Button>
                            <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl px-6 font-bold shadow-md">Kaydet</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

// --- MAIN COMPONENT ---

export default function LibraryPage() {
  const router = useRouter();
  const { familyId, familyMembers } = useAuth();
  const [allBooks, setAllBooks] = React.useState<BookType[]>([]);
  const [userLibraries, setUserLibraries] = React.useState<UserLibrary[]>([]);
  const [readingSessions, setReadingSessions] = React.useState<ReadingSession[]>([]);
  const [selectedMember, setSelectedMember] = React.useState<FamilyMember | null>(null);
  const [isGoalDialogOpen, setIsGoalDialogOpen] = React.useState(false);
  const [viewingBook, setViewingBook] = React.useState<any | null>(null);
  const [editingProgressForBook, setEditingProgressForBook] = React.useState<any | null>(null);
  const [readingStatsPeriod, setReadingStatsPeriod] = React.useState<'weekly' | 'monthly'>('weekly');
  
  const { toast } = useToast();

  React.useEffect(() => {
    if (familyMembers.length > 0 && !selectedMember) {
      setSelectedMember(familyMembers[0]);
    }
  }, [familyMembers, selectedMember]);

  React.useEffect(() => {
    const unsubscribeBooks = onBooksUpdate(setAllBooks);
    const unsubscribeSessions = onReadingSessionsUpdate(setReadingSessions);
    let unsubscribeLibraries = () => {};
    if (familyId) {
      unsubscribeLibraries = onUserLibrariesUpdate(familyId, setUserLibraries);
    }
    return () => {
      unsubscribeBooks();
      unsubscribeSessions();
      unsubscribeLibraries();
    };
  }, [familyId]);
  
  const handleUpdateStatus = async (bookId: string, newStatus: 'reading' | 'finished', progress?: number) => {
      if (!familyId || !selectedMember) return;
      try {
        await updateUserBookStatus(familyId, selectedMember.id, bookId, newStatus, progress);
        toast({ title: "Durum Güncellendi", description: "Kitabın okuma durumu değiştirildi." });
      } catch (e) {
        toast({ title: "Hata", description: "Durum güncellenirken bir sorun oluştu.", variant: "destructive" });
      }
  };

  const handleRemoveFromLibrary = async (bookId: string) => {
    if (!familyId || !selectedMember) return;
    try {
        await removeBookFromMemberLibrary(familyId, selectedMember.id, bookId);
        toast({ title: "Kitap Kaldırıldı", description: "Kitap, kütüphanenizden çıkarıldı.", variant: "destructive" });
    } catch(e) {
        toast({ title: "Hata", description: "Kitap kaldırılırken bir sorun oluştu.", variant: "destructive" });
    }
  }

  const handleSaveGoals = async (goals: ReadingGoals) => {
    if (!selectedMember) return;
    try {
      await updateFamilyMemberInFamily(familyId!, selectedMember.id, { readingGoals: goals });
      toast({ title: "Hedefler Güncellendi", description: `${selectedMember.name} için yeni okuma hedefleri kaydedildi.` });
      setIsGoalDialogOpen(false);
    } catch (e) {
       toast({ title: "Hata", description: "Hedefler kaydedilirken bir sorun oluştu.", variant: "destructive" });
    }
  };
  
  const handleSaveSession = async (book: BookType, session: { pagesRead: number }) => {
     if (!familyId || !selectedMember) return;
     
     try {
        await addReadingSession({
            memberId: selectedMember.id,
            bookId: book.id,
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
            durationSeconds: 0, 
            pagesRead: session.pagesRead,
        });
        toast({ title: "Okuma Oturumu Kaydedildi!", description: `${session.pagesRead} sayfa okudun.` });
     } catch(e) {
         toast({ title: "Hata", description: "Oturum kaydedilirken bir sorun oluştu.", variant: "destructive" });
     }
  };

  const { readingBooks, toReadBooks, finishedBooks, stats } = React.useMemo(() => {
    if (!selectedMember) {
        return { readingBooks: [], toReadBooks: [], finishedBooks: [], stats: { finished: 0, total: 0, reading: 0, toRead: 0, percentage: 0 }};
    }
    
    const memberLibrary = userLibraries.find(lib => lib.memberId === selectedMember.id);
    if (!memberLibrary) {
        return { readingBooks: [], toReadBooks: [], finishedBooks: [], stats: { finished: 0, total: 0, reading: 0, toRead: 0, percentage: 0 }};
    }

    const myBookDetails = memberLibrary.books.map(libBook => {
      const bookDetail = allBooks.find(b => b.id === libBook.bookId);
      return bookDetail ? { ...libBook, ...bookDetail } : null;
    }).filter(Boolean) as (BookType & { status: 'to-read' | 'reading' | 'finished', progress?: number, startedAt?: string, finishedAt?: string })[];

    const reading = myBookDetails.filter(b => b.status === 'reading');
    const toRead = myBookDetails.filter(b => b.status === 'to-read');
    const finished = myBookDetails.filter(b => b.status === 'finished');
    
    const statistics = {
      finished: finished.length,
      reading: reading.length,
      toRead: toRead.length,
      total: myBookDetails.length,
    };

    return { readingBooks: reading, toReadBooks: toRead, finishedBooks: finished, stats: statistics };

  }, [selectedMember, userLibraries, allBooks]);
  
  const readingGoals = selectedMember?.readingGoals;
  
  const readingStatsByPeriod = React.useMemo(() => {
    if (!selectedMember) return { weeklyChartData: [], monthlyPageData: [] };
  
    const memberSessions = readingSessions.filter(s => s.memberId === selectedMember.id);
    const today = new Date();
  
    // Weekly Stats
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const dailyPages = new Map<string, number>();
    const weekDaysKeys = Array.from({ length: 7 }).map((_, i) => {
      const day = addDays(weekStart, i);
      const dayKey = format(day, 'yyyy-MM-dd');
      dailyPages.set(dayKey, 0);
      return dayKey;
    });
  
    memberSessions.forEach(session => {
      const sessionDate = parseISO(session.startTime);
      if (isWithinInterval(sessionDate, { start: weekStart, end: weekEnd })) {
        const dayKey = format(sessionDate, 'yyyy-MM-dd');
        dailyPages.set(dayKey, (dailyPages.get(dayKey) || 0) + session.pagesRead);
      }
    });
  
    const weeklyChartData = weekDaysKeys.map(dayKey => ({
      day: format(parseISO(dayKey), 'EEE', { locale: tr }),
      pagesRead: dailyPages.get(dayKey) || 0,
    }));
  
    // Monthly Stats for Chart
    const currentYear = getYear(today);
    const monthsOfYear = eachMonthOfInterval({
        start: new Date(currentYear, 0, 1),
        end: new Date(currentYear, 11, 31),
    });

    const monthlyPageData = monthsOfYear.map(month => {
        const monthKey = format(month, 'MMM', { locale: tr });
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);

        const pagesRead = memberSessions
            .filter(s => {
                const sessionDate = parseISO(s.startTime);
                return isWithinInterval(sessionDate, { start: monthStart, end: monthEnd });
            })
            .reduce((sum, s) => sum + s.pagesRead, 0);
        
        return {
            month: monthKey,
            pagesRead,
        };
    });

    return { weeklyChartData, monthlyPageData };
  }, [readingSessions, selectedMember]);

  const monthlyGoalProgress = React.useMemo(() => {
    if (!readingGoals?.monthly || !selectedMember) return { pages: 0, books: 0, pagesRead: 0, booksRead: 0 };
    
    const startOfMonthDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const memberSessions = readingSessions.filter(s => s.memberId === selectedMember.id);
    const monthlySessions = memberSessions.filter(s => parseISO(s.startTime) >= startOfMonthDate);
    const pagesRead = monthlySessions.reduce((sum, s) => sum + s.pagesRead, 0);
    
    const finishedBookIds = new Set(
        userLibraries.find(lib => lib.memberId === selectedMember.id)?.books
            .filter(b => {
                if (b.status !== 'finished' || !b.finishedAt) return false;
                const finishedDate = parseISO(b.finishedAt);
                return finishedDate >= startOfMonthDate;
            })
            .map(b => b.bookId)
    );
    const booksRead = finishedBookIds.size;

    return {
        pages: (pagesRead / (readingGoals.monthly?.pages || 1)) * 100,
        books: (booksRead / (readingGoals.monthly?.books || 1)) * 100,
        pagesRead,
        booksRead
    };
  }, [readingGoals, readingSessions, userLibraries, selectedMember]);

  return (
    <div className={cn("min-h-[100dvh] font-sans pb-24 relative overflow-hidden", themeColors.PAGE_BG, themeColors.TEXT_MAIN)}>
         {/* Minimalist Background (Açık Tema İçin) */}
         <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-amber-100/60 rounded-full blur-[120px]" />
            <div className="absolute bottom-[20%] left-[-5%] w-[400px] h-[400px] bg-orange-100/60 rounded-full blur-[100px]" />
        </div>

        {/* HEADER */}
        <div className={cn("sticky top-0 z-40 py-4 sm:px-6 transition-all duration-300", themeColors.HEADER_BG)}>
            <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className={cn("rounded-full mr-1", themeColors.BUTTON_Ghost)}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className={themeColors.ICON_BOX}>
                        <Library className="w-6 h-6" />
                    </div>
                    <div>
                        <p className={cn("text-xs font-semibold uppercase tracking-wider", themeColors.TEXT_MUTED)}>Eğitim</p>
                        <h1 className={cn("text-lg font-bold leading-none text-slate-800")}>Kişisel Kütüphane</h1>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                    <Link href="/library/archive">
                        <Button variant="outline" className="rounded-full px-6 font-bold border-slate-200 text-slate-600 hover:bg-slate-50">
                            <Library className="mr-2 h-4 w-4"/> Arşiv
                        </Button>
                    </Link>
                </div>
            </div>
        </div>

        <div className="max-w-7xl mx-auto md:p-6 p-4 relative z-10 space-y-8">
            
            {/* Member Selection */}
             <div className="overflow-x-auto pb-2 scrollbar-hide">
                <div className="flex gap-3 min-w-max">
                  {familyMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => setSelectedMember(member)}
                      className={cn(
                        "flex items-center gap-2 pl-2 pr-4 py-2 rounded-full transition-all duration-300 border font-bold text-sm",
                        selectedMember?.id === member.id
                          ? "bg-slate-900 text-white border-slate-900 shadow-md scale-105"
                          : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700 hover:bg-slate-50"
                      )}
                    >
                          <div 
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm" 
                            style={{ backgroundColor: member.color }}
                        >
                            {member.name.charAt(0)}
                        </div>
                      {member.name}
                    </button>
                  ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sol Kolon: İstatistikler ve Hedefler */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Kütüphane Özeti */}
                    <Card className={cn(themeColors.CARD_BG)}>
                        <CardHeader className="pb-2">
                            <CardTitle className={cn("text-sm font-bold uppercase tracking-wider text-slate-400")}>Kütüphane Özeti</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
                                <BookOpen className="h-6 w-6 text-amber-500 mb-1" />
                                <p className="text-2xl font-black text-slate-800">{stats.reading}</p>
                                <p className="text-xs text-slate-500 font-bold uppercase">Okunuyor</p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
                                <BookCheck className="h-6 w-6 text-emerald-500 mb-1" />
                                <p className="text-2xl font-black text-slate-800">{stats.finished}</p>
                                <p className="text-xs text-slate-500 font-bold uppercase">Bitti</p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
                                <BookUp className="h-6 w-6 text-blue-500 mb-1" />
                                <p className="text-2xl font-black text-slate-800">{stats.toRead}</p>
                                <p className="text-xs text-slate-500 font-bold uppercase">Sırada</p>
                            </div>
                             <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
                                <BookIcon className="h-6 w-6 text-purple-500 mb-1" />
                                <p className="text-2xl font-black text-slate-800">{stats.total}</p>
                                <p className="text-xs text-slate-500 font-bold uppercase">Toplam</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Hedefler */}
                    {readingGoals && (
                        <Card className={cn(themeColors.CARD_BG, "relative overflow-hidden")}>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                            <CardHeader className="pb-2 relative z-10">
                                <CardTitle className={cn("text-sm font-bold uppercase tracking-wider text-slate-400")}>Bu Ayki Hedefler</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6 relative z-10">
                                <div>
                                    <div className="flex justify-between text-xs font-bold mb-2">
                                        <span className="text-slate-500">Sayfa Hedefi</span>
                                        <span className="text-amber-600">{monthlyGoalProgress.pagesRead} / {readingGoals.monthly?.pages || 0}</span>
                                    </div>
                                    <Progress value={monthlyGoalProgress.pages} className="h-2 bg-slate-100" indicatorClassName="bg-amber-500" />
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs font-bold mb-2">
                                        <span className="text-slate-500">Kitap Hedefi</span>
                                        <span className="text-orange-600">{monthlyGoalProgress.booksRead} / {readingGoals.monthly?.books || 0}</span>
                                    </div>
                                    <Progress value={monthlyGoalProgress.books} className="h-2 bg-slate-100" indicatorClassName="bg-orange-500" />
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Okuma İstatistikleri Grafik */}
                    <Card className={cn(themeColors.CARD_BG)}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400">Okuma Grafiği</CardTitle>
                             <Tabs value={readingStatsPeriod} onValueChange={(v) => setReadingStatsPeriod(v as any)}>
                                <TabsList className="bg-slate-100 border border-slate-200 h-8 p-0.5">
                                    <TabsTrigger value="weekly" className="text-xs h-7 px-3 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-slate-500">Haftalık</TabsTrigger>
                                    <TabsTrigger value="monthly" className="text-xs h-7 px-3 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-slate-500">Aylık</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </CardHeader>
                         <CardContent>
                             <div className="h-40 w-full mt-4">
                                <ChartContainer config={{ pages: { label: "Sayfa", color: "#f59e0b" } }} className="h-full w-full">
                                    <BarChart 
                                        data={readingStatsPeriod === 'weekly' ? readingStatsByPeriod.weeklyChartData : readingStatsByPeriod.monthlyPageData} 
                                        margin={{ top: 20 }}
                                    >
                                        <XAxis 
                                            dataKey={readingStatsPeriod === 'weekly' ? "day" : "month"} 
                                            tickLine={false} 
                                            axisLine={false} 
                                            tick={{fill: '#64748b', fontSize: 10}} 
                                        />
                                        <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} content={<ChartTooltipContent hideLabel className="bg-white border-slate-200 text-slate-700 shadow-lg"/>} />
                                        <Bar dataKey="pagesRead" fill="var(--color-pages)" radius={[4, 4, 4, 4]}>
                                             <LabelList 
                                                dataKey="pagesRead" 
                                                position="top" 
                                                offset={8} 
                                                className="fill-slate-500 font-bold" 
                                                fontSize={10} 
                                                formatter={(value: any) => value > 0 ? value : ""}
                                            />
                                        </Bar>
                                    </BarChart>
                                </ChartContainer>
                             </div>
                         </CardContent>
                    </Card>
                </div>

                {/* Sağ Kolon: Kitap Listeleri */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* Okunanlar */}
                    {readingBooks.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-amber-500" /> Şu An Okudukların
                            </h2>
                            <div className="grid gap-4">
                                {readingBooks.map(book => (
                                    <ReadingBookCard 
                                        key={book.id} 
                                        book={book} 
                                        onUpdateStatus={handleUpdateStatus} 
                                        onRemove={handleRemoveFromLibrary} 
                                        onViewDetails={() => setViewingBook(book)} 
                                        onOpenProgressDialog={() => setEditingProgressForBook(book)} 
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Sıradakiler */}
                    {toReadBooks.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <BookUp className="w-5 h-5 text-blue-500" /> Sıradakiler
                            </h2>
                             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {toReadBooks.map(book => <BookCard key={book.id} book={book} onUpdateStatus={handleUpdateStatus} onRemove={handleRemoveFromLibrary}/>)}
                            </div>
                        </div>
                    )}

                    {/* Bitirilenler */}
                    {finishedBooks.length > 0 && (
                         <div className={cn("p-6 rounded-[2rem] relative overflow-hidden", themeColors.CARD_BG)}>
                             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-green-500"></div>
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-4">
                                <BookCheck className="w-5 h-5 text-emerald-500" /> Bitirdiklerim
                            </h2>
                            <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-hide -mx-2 px-2">
                                {finishedBooks.map(book => <FinishedBookCard key={book.id} book={book} onUpdateStatus={handleUpdateStatus} onRemove={handleRemoveFromLibrary}/>)}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {selectedMember && (
            <div className="fixed bottom-24 md:bottom-8 right-6 z-50">
                <Button 
                    onClick={() => setIsGoalDialogOpen(true)}
                    className="rounded-full w-14 h-14 bg-amber-600 text-white shadow-2xl shadow-amber-900/30 hover:bg-amber-700 transition-transform hover:scale-105 active:scale-95"
                >
                    <Target className="w-6 h-6" />
                </Button>
            </div>
        )}
      
      <BookDetailDialog 
        book={viewingBook} 
        isOpen={!!viewingBook}
        onOpenChange={() => setViewingBook(null)}
      />
      <ProgressDialog 
        book={editingProgressForBook}
        open={!!editingProgressForBook}
        onOpenChange={() => setEditingProgressForBook(null)}
        onSaveSession={handleSaveSession}
      />
      <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
          <DialogContent className="sm:max-w-md bg-white border-slate-200 text-slate-900 rounded-2xl shadow-xl">
              <DialogHeader>
                  <DialogTitle>Hedef Belirle</DialogTitle>
                  <DialogDescription className="text-slate-500">{selectedMember?.name} için okuma hedeflerini düzenle.</DialogDescription>
              </DialogHeader>
              <div className="text-slate-900 [&_label]:text-slate-700 [&_input]:bg-slate-50 [&_input]:border-slate-200">
                  <SetReadingGoalForm
                      initialGoals={selectedMember?.readingGoals}
                      onSave={handleSaveGoals}
                  />
              </div>
          </DialogContent>
      </Dialog>
    </div>
  );
}

// --- SUB COMPONENTS (AÇIK TEMA) ---

function ReadingBookCard({ book, onUpdateStatus, onRemove, onViewDetails, onOpenProgressDialog }: { book: any, onUpdateStatus: (bookId: string, status: 'reading' | 'finished', progress?: number) => void, onRemove: (bookId: string) => void, onViewDetails: () => void, onOpenProgressDialog: () => void }) {
    const pagesRead = book.pageCount ? Math.round((book.progress || 0) / 100 * book.pageCount) : 0;
    
    return (
        <div className={cn("p-4 rounded-2xl flex flex-col sm:flex-row gap-4 sm:gap-5 transition-all group relative overflow-hidden bg-white border border-slate-200 shadow-sm hover:shadow-md")}>
             {/* Progress Bar Background */}
             <div className="absolute bottom-0 left-0 h-1 bg-amber-100 w-full">
                 <div className="h-full bg-amber-500 transition-all duration-1000" style={{ width: `${book.progress || 0}%` }}></div>
             </div>

            {/* Kitap Resmi */}
            <div className="relative shrink-0 mx-auto sm:mx-0">
                <Image 
                    src={book.image} 
                    alt={book.title} 
                    width={100} 
                    height={150} 
                    className="w-24 sm:w-28 h-auto rounded-lg aspect-[2/3] object-cover shadow-md cursor-pointer hover:scale-105 transition-transform" 
                    onClick={onViewDetails}
                    data-ai-hint="book cover"
                />
            </div>

            {/* İçerik Alanı */}
            <div className="flex-grow flex flex-col min-w-0 py-1">
                {/* Üst Kısım: Başlık ve Yazar */}
                <div className="mb-2 cursor-pointer" onClick={onViewDetails}>
                    <h3 className={cn("font-bold text-lg leading-tight text-slate-800 group-hover:text-amber-600 transition-colors line-clamp-2")}>
                        {book.title}
                    </h3>
                    <p className="text-sm text-slate-500 truncate mt-1">{book.author}</p>
                </div>
                
                {/* Alt Kısım: İstatistikler ve Butonlar */}
                <div className="mt-auto pt-2 space-y-3">
                    
                    {/* İlerleme Bilgisi */}
                    <div>
                         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">İlerleme</p>
                         <div className="flex items-baseline gap-1">
                             <span className="text-2xl font-black text-amber-500">{book.progress || 0}%</span>
                             <span className="text-sm text-slate-400 font-medium">({pagesRead} / {book.pageCount || '?'} syf)</span>
                         </div>
                    </div>

                    {/* Aksiyon Butonları Grubu */}
                    <div className="flex flex-wrap items-center gap-2">
                         {/* Oynat / Devam Et */}
                         <Link href={`/library/session/${book.id}`} className="flex-1 sm:flex-none">
                            <Button className="w-full sm:w-auto rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-md h-10 px-4">
                                <Play className="h-4 w-4 fill-current mr-2"/> Oku
                            </Button>
                        </Link>

                        {/* Güncelle Butonu */}
                         <Button size="icon" variant="outline" className="h-10 w-10 rounded-xl border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50" onClick={onOpenProgressDialog}>
                             <Edit className="w-4 h-4"/>
                         </Button>

                         {/* Diğer İşlemler Menüsü */}
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-white border-slate-200 text-slate-700 mb-2 shadow-lg" align="end">
                                <DropdownMenuItem onClick={() => onUpdateStatus(book.id, 'finished', 100)} className="hover:bg-slate-50 cursor-pointer h-10 focus:bg-slate-50">
                                    <BookCheck className="mr-2 h-4 w-4 text-emerald-500"/> Kitabı Bitir
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-rose-500 focus:text-rose-600 hover:bg-rose-50 focus:bg-rose-50 cursor-pointer h-10" onClick={() => onRemove(book.id)}>
                                    <Trash2 className="mr-2 h-4 w-4"/> Kütüphaneden Kaldır
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
        </div>
    )
}

function FinishedBookCard({ book, onUpdateStatus, onRemove }: { book: any, onUpdateStatus: (bookId: string, status: 'reading' | 'finished', progress?: number) => void, onRemove: (bookId: string) => void }) {
    const [isOpen, setIsOpen] = React.useState(false);
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                 <div className="group/book relative w-28 shrink-0 cursor-pointer transition-transform hover:-translate-y-2 duration-300">
                    <Image src={book.image} alt={book.title} width={150} height={225} className="w-full object-cover aspect-[2/3] rounded-lg shadow-sm" data-ai-hint="book cover" />
                    
                    {/* Overlay */}
                     <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent rounded-lg opacity-0 group-hover/book:opacity-100 transition-opacity flex flex-col justify-end p-2">
                        <div className="text-center">
                             <div className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-1 shadow-sm">Tamamlandı</div>
                             <p className="text-[10px] text-white/90">{book.finishedAt ? format(parseISO(book.finishedAt), 'dd.MM.yy') : ''}</p>
                        </div>
                    </div>
                </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xs bg-white border-slate-200 text-slate-900 rounded-3xl shadow-xl">
                 <DialogHeader>
                    <DialogTitle className="text-center text-lg text-slate-800">{book.title}</DialogTitle>
                    <DialogDescription className="text-center text-slate-500">{book.author}</DialogDescription>
                </DialogHeader>
                <div className="py-6 flex justify-center">
                     <div className="relative w-32 shadow-lg rotate-3 transition-transform hover:rotate-0">
                        <Image src={book.image} alt={book.title} width={150} height={225} className="w-full object-cover rounded-lg aspect-[2/3]" />
                     </div>
                </div>
                <DialogFooter className="flex-col gap-2 sm:gap-2">
                     <Button variant="secondary" className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 border-0" onClick={() => { onUpdateStatus(book.id, 'reading', 0); setIsOpen(false); }}>
                        <RotateCcw className="mr-2 h-4 w-4"/> Tekrar Oku
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                             <Button variant="ghost" className="w-full text-rose-500 hover:text-rose-600 hover:bg-rose-50">
                                <Trash2 className="mr-2 h-4 w-4"/> Kütüphaneden Kaldır
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-white border-slate-200 text-slate-900">
                            <AlertDialogHeader><AlertDialogTitle>Kitabı Kaldır</AlertDialogTitle><AlertDialogDescription className="text-slate-500">"{book.title}" kitabını kütüphanenizden kaldırmak istediğinize emin misiniz?</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooterComponent><AlertDialogCancel className="bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-600">İptal</AlertDialogCancel><AlertDialogAction onClick={() => {onRemove(book.id); setIsOpen(false);}} className="bg-rose-600 hover:bg-rose-700 text-white">Kaldır</AlertDialogAction></AlertDialogFooterComponent>
                        </AlertDialogContent>
                    </AlertDialog>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function BookCard({ book, onUpdateStatus, onRemove }: { book: any, onUpdateStatus: (bookId: string, status: 'reading' | 'finished', progress?: number) => void, onRemove: (bookId: string) => void }) {
    return (
        <Card className={cn("overflow-hidden flex flex-col group text-center transition-all relative p-0 border-0 bg-transparent h-full shadow-none")}>
            <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-md mb-3 group-hover:-translate-y-1 transition-transform duration-300">
                 <Image src={book.image} alt={book.title} width={150} height={225} className="w-full h-full object-cover" data-ai-hint="book cover"/>
                 
                 {/* Hover Overlay */}
                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                     <Button size="sm" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md" onClick={() => onUpdateStatus(book.id, 'reading', 0)}>
                        <BookUp className="mr-2 h-4 w-4"/> Başla
                    </Button>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                             <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full bg-white/90 hover:bg-white text-slate-700 border-0">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-white border-slate-200 text-slate-700 shadow-lg">
                            <DropdownMenuItem className="text-rose-500 focus:text-rose-600 hover:bg-rose-50 cursor-pointer" onClick={() => onRemove(book.id)}>
                                <Trash2 className="mr-2 h-4 w-4"/> Kütüphaneden Kaldır
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                 </div>
            </div>
            
            <div className="px-1">
                <p className="font-bold text-sm leading-tight line-clamp-2 text-slate-800 mb-0.5 group-hover:text-amber-600 transition-colors" title={book.title}>{book.title}</p>
                <p className="text-xs text-slate-500 truncate font-medium">{book.author}</p>
            </div>
        </Card>
    )
}