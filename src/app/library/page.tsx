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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter as AlertDialogFooterComponent, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { SetReadingGoalForm } from '@/components/reading-goal-form';
import { format, parseISO, subDays, isFuture, isPast, isToday, startOfWeek, endOfWeek, addDays, isSameDay, isWithinInterval, startOfMonth, endOfMonth, eachMonthOfInterval, getYear } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { BookDetailDialog } from "@/components/book-detail-dialog";
import { useForm } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, Legend, LabelList } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { useRouter } from "next/navigation";

// --- TASARIM DEĞİŞKENLERİ (Mobil/iOS Odaklı) ---
const themeClasses = {
    PAGE_BG: "bg-[#F2F2F7] dark:bg-black transition-colors duration-300",
    HEADER_BG: "bg-white/85 dark:bg-[#1C1C1E]/85 backdrop-blur-xl border-b border-black/[0.05] dark:border-white/[0.05]",
    CARD_BG: "bg-white dark:bg-[#1C1C1E] shadow-sm",
    TEXT_MAIN: "text-[#1C1C1E] dark:text-white",
    TEXT_MUTED: "text-[#8E8E93] dark:text-[#EBEBF5]/60",
    ACCENT: "text-[#FF9500]", // iOS Orange/Amber
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
            <DialogContent className="sm:max-w-md bg-white dark:bg-[#1C1C1E] border-0 text-[#1C1C1E] dark:text-white rounded-[24px] shadow-2xl p-0 overflow-hidden">
                <div className="p-6">
                    <DialogHeader className="mb-4 text-left">
                        <DialogTitle className="text-xl font-bold">İlerleme Gir</DialogTitle>
                        <DialogDescription className="text-sm text-[#8E8E93] line-clamp-1">{book.title} kitabında kaçıncı sayfadasın?</DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleProgressSave)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="currentPage"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <div className="relative flex items-center">
                                                <Input type="number" {...field} autoFocus className="bg-[#F2F2F7] dark:bg-[#2C2C2E] border-0 text-center text-2xl font-bold text-[#1C1C1E] dark:text-white h-16 rounded-2xl focus:ring-2 focus:ring-[#FF9500]/50" />
                                                <span className="absolute right-4 text-[#8E8E93] font-medium">/ {book.pageCount}</span>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter className="gap-2 sm:justify-between flex-row">
                                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 rounded-[14px] text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-white h-12">İptal</Button>
                                <Button type="submit" className="flex-1 bg-[#FF9500] hover:bg-[#FF9500]/90 text-white rounded-[14px] font-semibold text-[16px] h-12 shadow-md">Kaydet</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </div>
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
  const [chartReferenceDate, setChartReferenceDate] = React.useState(new Date());

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
        toast({ title: "Kitap Kaldırıldı", description: "Kitap kütüphanenizden çıkarıldı.", variant: "destructive" });
    } catch(e) {
        toast({ title: "Hata", description: "Kitap kaldırılırken bir sorun oluştu.", variant: "destructive" });
    }
  }

  const handleSaveGoals = async (goals: ReadingGoals) => {
    if (!selectedMember) return;
    try {
      await updateFamilyMemberInFamily(familyId!, selectedMember.id, { readingGoals: goals });
      toast({ title: "Hedefler Kaydedildi", description: "Yeni okuma hedefleri ayarlandı." });
      setIsGoalDialogOpen(false);
    } catch (e) {
       toast({ title: "Hata", description: "Hedefler kaydedilirken sorun oluştu.", variant: "destructive" });
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
        toast({ title: "Harika!", description: `${session.pagesRead} sayfa okuma kaydedildi.` });
     } catch(e) {
         toast({ title: "Hata", description: "Oturum kaydedilirken sorun oluştu.", variant: "destructive" });
     }
  };

  const handlePrevWeek = () => setChartReferenceDate(prev => subDays(prev, 7));
  const handleNextWeek = () => setChartReferenceDate(prev => addDays(prev, 7));
  const handleResetDate = () => setChartReferenceDate(new Date());

  const { readingBooks, toReadBooks, finishedBooks, stats } = React.useMemo(() => {
    if (!selectedMember) return { readingBooks: [], toReadBooks: [], finishedBooks: [], stats: { finished: 0, total: 0, reading: 0, toRead: 0, percentage: 0 }};
    const memberLibrary = userLibraries.find(lib => lib.memberId === selectedMember.id);
    if (!memberLibrary) return { readingBooks: [], toReadBooks: [], finishedBooks: [], stats: { finished: 0, total: 0, reading: 0, toRead: 0, percentage: 0 }};

    const myBookDetails = memberLibrary.books.map(libBook => {
      const bookDetail = allBooks.find(b => b.id === libBook.bookId);
      return bookDetail ? { ...libBook, ...bookDetail } : null;
    }).filter(Boolean) as (BookType & { status: 'to-read' | 'reading' | 'finished', progress?: number, startedAt?: string, finishedAt?: string })[];

    const reading = myBookDetails.filter(b => b.status === 'reading');
    const toRead = myBookDetails.filter(b => b.status === 'to-read');
    const finished = myBookDetails.filter(b => b.status === 'finished');
    
    return { readingBooks: reading, toReadBooks: toRead, finishedBooks: finished, stats: { finished: finished.length, reading: reading.length, toRead: toRead.length, total: myBookDetails.length }};
  }, [selectedMember, userLibraries, allBooks]);
  
  const readingGoals = selectedMember?.readingGoals;
  
  const readingStatsByPeriod = React.useMemo(() => {
    if (!selectedMember) return { weeklyChartData: [], monthlyPageData: [], weekLabel: "" };
  
    const memberSessions = readingSessions.filter(s => s.memberId === selectedMember.id);
    const today = chartReferenceDate; 
  
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
      fullDate: format(parseISO(dayKey), 'd MMM', { locale: tr }),
      pagesRead: dailyPages.get(dayKey) || 0,
    }));
  
    const currentYear = getYear(today);
    const monthsOfYear = eachMonthOfInterval({ start: new Date(currentYear, 0, 1), end: new Date(currentYear, 11, 31) });

    const monthlyPageData = monthsOfYear.map(month => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        const pagesRead = memberSessions.filter(s => isWithinInterval(parseISO(s.startTime), { start: monthStart, end: monthEnd })).reduce((sum, s) => sum + s.pagesRead, 0);
        return { month: format(month, 'MMM', { locale: tr }), pagesRead };
    });

    const weekLabel = `${format(weekStart, 'd MMM', { locale: tr })} - ${format(weekEnd, 'd MMM', { locale: tr })}`;
    return { weeklyChartData, monthlyPageData, weekLabel };
  }, [readingSessions, selectedMember, chartReferenceDate]);

  const monthlyGoalProgress = React.useMemo(() => {
    if (!readingGoals?.monthly || !selectedMember) return { pages: 0, books: 0, pagesRead: 0, booksRead: 0 };
    const startOfMonthDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const memberSessions = readingSessions.filter(s => s.memberId === selectedMember.id);
    const pagesRead = memberSessions.filter(s => parseISO(s.startTime) >= startOfMonthDate).reduce((sum, s) => sum + s.pagesRead, 0);
    const finishedBookIds = new Set(userLibraries.find(lib => lib.memberId === selectedMember.id)?.books.filter(b => b.status === 'finished' && b.finishedAt && parseISO(b.finishedAt) >= startOfMonthDate).map(b => b.bookId));
    const booksRead = finishedBookIds.size;

    return {
        pages: Math.min((pagesRead / (readingGoals.monthly?.pages || 1)) * 100, 100),
        books: Math.min((booksRead / (readingGoals.monthly?.books || 1)) * 100, 100),
        pagesRead, booksRead
    };
  }, [readingGoals, readingSessions, userLibraries, selectedMember]);

  return (
    <div className={cn("min-h-[100dvh] font-sans pb-[calc(80px+env(safe-area-inset-bottom))] relative", themeClasses.PAGE_BG, themeClasses.TEXT_MAIN)}>
        
        {/* MOBİL APP BAR */}
        <header className={cn("sticky top-0 z-40 w-full pt-[env(safe-area-inset-top)]", themeClasses.HEADER_BG)}>
            <div className="flex items-center justify-between px-2 h-12 md:h-14 max-w-2xl mx-auto relative">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-[#FF9500] hover:bg-transparent active:opacity-50">
                    <ChevronLeft className="w-7 h-7" />
                </Button>
                <h1 className="text-[17px] font-semibold tracking-tight absolute left-1/2 -translate-x-1/2">
                    Kişisel Kütüphane
                </h1>
                <Link href="/library/archive">
                    <Button variant="ghost" size="icon" className="text-[#FF9500] hover:bg-transparent active:opacity-50">
                        <Library className="w-6 h-6" />
                    </Button>
                </Link>
            </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 pt-4 space-y-6">
            
            {/* HAP TASARIMLI KİŞİ SEÇİCİ */}
             <div className="overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
                <div className="flex gap-2.5 min-w-max">
                  {familyMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => setSelectedMember(member)}
                      className={cn(
                        "flex items-center gap-2 pl-2 pr-4 py-1.5 rounded-full transition-all duration-200 font-semibold text-[14px]",
                        selectedMember?.id === member.id
                          ? "bg-[#1C1C1E] dark:bg-white text-white dark:text-black shadow-md"
                          : "bg-white dark:bg-[#1C1C1E] text-[#8E8E93] border border-transparent shadow-sm"
                      )}
                    >
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-inner" style={{ backgroundColor: member.color }}>
                            {member.name.charAt(0)}
                        </div>
                        {member.name}
                    </button>
                  ))}
                </div>
            </div>

            {/* iOS WIDGET STILI İSTATİSTİKLER (2x2 Grid) */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className={cn("p-4 rounded-[22px] flex flex-col justify-between h-[100px]", themeClasses.CARD_BG)}>
                    <div className="flex items-center gap-2 mb-1">
                        <BookOpen className="w-4 h-4 text-[#FF9500]" />
                        <span className="text-[12px] font-medium text-[#8E8E93] uppercase tracking-wider">Okunuyor</span>
                    </div>
                    <p className="text-3xl font-bold tracking-tight text-[#1C1C1E] dark:text-white">{stats.reading}</p>
                </div>
                <div className={cn("p-4 rounded-[22px] flex flex-col justify-between h-[100px]", themeClasses.CARD_BG)}>
                    <div className="flex items-center gap-2 mb-1">
                        <BookCheck className="w-4 h-4 text-[#34C759]" />
                        <span className="text-[12px] font-medium text-[#8E8E93] uppercase tracking-wider">Biten</span>
                    </div>
                    <p className="text-3xl font-bold tracking-tight text-[#1C1C1E] dark:text-white">{stats.finished}</p>
                </div>
                <div className={cn("p-4 rounded-[22px] flex flex-col justify-between h-[100px]", themeClasses.CARD_BG)}>
                    <div className="flex items-center gap-2 mb-1">
                        <BookUp className="w-4 h-4 text-[#5856D6]" />
                        <span className="text-[12px] font-medium text-[#8E8E93] uppercase tracking-wider">Sırada</span>
                    </div>
                    <p className="text-3xl font-bold tracking-tight text-[#1C1C1E] dark:text-white">{stats.toRead}</p>
                </div>
                <div className={cn("p-4 rounded-[22px] flex flex-col justify-between h-[100px]", themeClasses.CARD_BG)}>
                    <div className="flex items-center gap-2 mb-1">
                        <BookIcon className="w-4 h-4 text-[#007AFF]" />
                        <span className="text-[12px] font-medium text-[#8E8E93] uppercase tracking-wider">Toplam</span>
                    </div>
                    <p className="text-3xl font-bold tracking-tight text-[#1C1C1E] dark:text-white">{stats.total}</p>
                </div>
            </div>

            {/* HEDEFLER KARTI */}
            {readingGoals && (
                <div className={cn("rounded-[24px] p-5 relative overflow-hidden", themeClasses.CARD_BG)}>
                    <h3 className="text-[15px] font-semibold mb-4 text-[#1C1C1E] dark:text-white">Aylık Hedefler</h3>
                    <div className="space-y-5 relative z-10">
                        <div>
                            <div className="flex justify-between text-[13px] font-medium mb-1.5">
                                <span className="text-[#8E8E93]">Okunan Sayfa</span>
                                <span className="text-[#FF9500] font-bold">{monthlyGoalProgress.pagesRead} / {readingGoals.monthly?.pages || 0}</span>
                            </div>
                            <div className="h-2.5 w-full bg-[#E3E3E8] dark:bg-[#2C2C2E] rounded-full overflow-hidden">
                                <div className="h-full bg-[#FF9500] rounded-full transition-all duration-500" style={{width: `${monthlyGoalProgress.pages}%`}} />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-[13px] font-medium mb-1.5">
                                <span className="text-[#8E8E93]">Biten Kitap</span>
                                <span className="text-[#34C759] font-bold">{monthlyGoalProgress.booksRead} / {readingGoals.monthly?.books || 0}</span>
                            </div>
                             <div className="h-2.5 w-full bg-[#E3E3E8] dark:bg-[#2C2C2E] rounded-full overflow-hidden">
                                <div className="h-full bg-[#34C759] rounded-full transition-all duration-500" style={{width: `${monthlyGoalProgress.books}%`}} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* OKUMA GRAFİĞİ */}
            <div className={cn("rounded-[24px] p-5", themeClasses.CARD_BG)}>
                <div className="flex flex-row items-center justify-between mb-4">
                    <h3 className="text-[15px] font-semibold text-[#1C1C1E] dark:text-white">Okuma Grafiği</h3>
                    <div className="bg-[#E3E3E8] dark:bg-[#2C2C2E] p-1 rounded-lg flex">
                        <button onClick={() => setReadingStatsPeriod('weekly')} className={cn("px-3 py-1 text-[12px] font-medium rounded-md transition-colors", readingStatsPeriod === 'weekly' ? 'bg-white dark:bg-[#1C1C1E] text-black dark:text-white shadow-sm' : 'text-[#8E8E93]')}>Hafta</button>
                        <button onClick={() => setReadingStatsPeriod('monthly')} className={cn("px-3 py-1 text-[12px] font-medium rounded-md transition-colors", readingStatsPeriod === 'monthly' ? 'bg-white dark:bg-[#1C1C1E] text-black dark:text-white shadow-sm' : 'text-[#8E8E93]')}>Ay</button>
                    </div>
                </div>
                
                {readingStatsPeriod === 'weekly' && (
                    <div className="flex items-center justify-between mb-2">
                        <Button variant="ghost" size="icon" onClick={handlePrevWeek} className="h-8 w-8 text-[#007AFF]"><ChevronLeft className="h-5 w-5" /></Button>
                        <div className="flex items-center gap-2 cursor-pointer" onClick={handleResetDate}>
                            <span className="text-[13px] font-semibold text-[#1C1C1E] dark:text-white">{readingStatsByPeriod.weekLabel}</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={handleNextWeek} className="h-8 w-8 text-[#007AFF]"><ChevronRight className="h-5 w-5" /></Button>
                    </div>
                )}

                <div className="h-[180px] w-full">
                    <ChartContainer config={{ pages: { label: "Sayfa", color: "#FF9500" } }} className="h-full w-full">
                        <BarChart data={readingStatsPeriod === 'weekly' ? readingStatsByPeriod.weeklyChartData : readingStatsByPeriod.monthlyPageData} margin={{ top: 20, right: 0, left: -25, bottom: 0 }}>
                            <XAxis dataKey={readingStatsPeriod === 'weekly' ? "day" : "month"} tickLine={false} axisLine={false} tick={{fill: '#8E8E93', fontSize: 11, fontWeight: 500}} />
                            <Tooltip cursor={{fill: 'rgba(142,142,147,0.1)'}} content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="bg-white dark:bg-[#2C2C2E] border-0 rounded-xl shadow-xl p-2 px-3 text-center">
                                            <p className="font-bold text-[13px] text-[#1C1C1E] dark:text-white mb-0.5">{payload[0].payload.fullDate || payload[0].payload.month}</p>
                                            <p className="text-[#FF9500] text-[12px] font-semibold">{payload[0].value} Sayfa</p>
                                        </div>
                                    );
                                }
                                return null;
                            }} />
                            <Bar dataKey="pagesRead" fill="#FF9500" radius={[4, 4, 4, 4]} maxBarSize={30}>
                                <LabelList dataKey="pagesRead" position="top" offset={5} className="fill-[#1C1C1E] dark:fill-white font-bold" fontSize={10} formatter={(value: any) => value > 0 ? value : ""} />
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                </div>
            </div>

            {/* ŞU AN OKUDUKLARIN LİSTESİ */}
            {readingBooks.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-[18px] font-bold text-[#1C1C1E] dark:text-white px-1">Şu An Okudukların</h2>
                    <div className="grid gap-3">
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
            
            {/* SIRADAKİLER (YATAY KAYDIRMA) */}
            {toReadBooks.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-[18px] font-bold text-[#1C1C1E] dark:text-white px-1">Sıradakiler</h2>
                    <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide -mx-4 px-4 snap-x">
                        {toReadBooks.map(book => <BookCard key={book.id} book={book} onUpdateStatus={handleUpdateStatus} onRemove={handleRemoveFromLibrary}/>)}
                    </div>
                </div>
            )}

            {/* BİTİRDİKLERİM (YATAY KAYDIRMA) */}
            {finishedBooks.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-[18px] font-bold text-[#1C1C1E] dark:text-white px-1">Bitirdiklerim</h2>
                    <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide -mx-4 px-4 snap-x">
                        {finishedBooks.map(book => <FinishedBookCard key={book.id} book={book} onUpdateStatus={handleUpdateStatus} onRemove={handleRemoveFromLibrary}/>)}
                    </div>
                </div>
            )}
        </div>

        {/* FAB (HEDEF BELİRLE) */}
        {selectedMember && (
            <div className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-6 z-50">
                <Button 
                    onClick={() => setIsGoalDialogOpen(true)}
                    className="rounded-full w-14 h-14 bg-[#FF9500] hover:bg-[#FF9500]/90 text-white shadow-[0_4px_14px_0_rgba(255,149,0,0.4)] transition-transform active:scale-95 p-0 flex items-center justify-center"
                >
                    <Target className="w-6 h-6" />
                </Button>
            </div>
        )}
      
      <BookDetailDialog book={viewingBook} isOpen={!!viewingBook} onOpenChange={() => setViewingBook(null)} />
      <ProgressDialog book={editingProgressForBook} open={!!editingProgressForBook} onOpenChange={() => setEditingProgressForBook(null)} onSaveSession={handleSaveSession} />
      
      <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
          <DialogContent className="sm:max-w-md bg-white dark:bg-[#1C1C1E] border-0 text-[#1C1C1E] dark:text-white rounded-[24px] shadow-2xl p-0 overflow-hidden">
             <div className="p-6">
                <DialogHeader className="mb-4 text-left">
                    <DialogTitle className="text-xl font-bold">Hedef Belirle</DialogTitle>
                    <DialogDescription className="text-sm text-[#8E8E93]">{selectedMember?.name} için aylık hedefleri güncelle.</DialogDescription>
                </DialogHeader>
                <SetReadingGoalForm initialGoals={selectedMember?.readingGoals} onSave={handleSaveGoals} />
              </div>
          </DialogContent>
      </Dialog>
    </div>
  );
}

// --- SUB COMPONENTS (Mobil Odaklı) ---

function ReadingBookCard({ book, onUpdateStatus, onRemove, onViewDetails, onOpenProgressDialog }: { book: any, onUpdateStatus: (bookId: string, status: 'reading' | 'finished', progress?: number) => void, onRemove: (bookId: string) => void, onViewDetails: () => void, onOpenProgressDialog: () => void }) {
    const pagesRead = book.pageCount ? Math.round((book.progress || 0) / 100 * book.pageCount) : 0;
    
    return (
        <div className={cn("rounded-[20px] p-3.5 flex gap-4 bg-white dark:bg-[#1C1C1E] shadow-sm relative overflow-hidden")}>
             {/* İlerleme Çubuğu (Kartın Altına İnce Çizgi Olarak Entegre Edildi) */}
             <div className="absolute bottom-0 left-0 h-[3px] bg-[#E3E3E8] dark:bg-[#2C2C2E] w-full">
                 <div className="h-full bg-[#FF9500]" style={{ width: `${book.progress || 0}%` }} />
             </div>

            <div className="relative shrink-0" onClick={onViewDetails}>
                <Image src={book.image} alt={book.title} width={80} height={120} className="w-[72px] h-[108px] rounded-xl object-cover shadow-sm" />
                <div className="absolute inset-0 ring-1 ring-inset ring-black/10 dark:ring-white/10 rounded-xl pointer-events-none" />
            </div>

            <div className="flex-grow flex flex-col justify-between py-0.5">
                <div onClick={onViewDetails}>
                    <h3 className="font-semibold text-[15px] leading-snug text-[#1C1C1E] dark:text-white line-clamp-2">{book.title}</h3>
                    <p className="text-[12px] text-[#8E8E93] truncate mt-0.5">{book.author}</p>
                </div>
                
                <div className="mt-2 space-y-2">
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-[17px] font-bold text-[#FF9500]">{book.progress || 0}%</span>
                        <span className="text-[11px] text-[#8E8E93] font-medium">{pagesRead} / {book.pageCount || '?'} syf</span>
                    </div>

                    <div className="flex items-center gap-2">
                         <Link href={`/library/session/${book.id}`} className="flex-1">
                            <Button className="w-full rounded-[10px] bg-[#FF9500] hover:bg-[#FF9500]/90 text-white font-semibold h-9 px-3 text-[13px]">
                                <Play className="h-3.5 w-3.5 fill-current mr-1.5"/> Oku
                            </Button>
                        </Link>
                         <Button size="icon" variant="outline" className="h-9 w-9 rounded-[10px] border-slate-200 dark:border-white/10 text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-white" onClick={onOpenProgressDialog}>
                             <Edit className="w-4 h-4"/>
                         </Button>
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="h-9 w-9 rounded-[10px] border-slate-200 dark:border-white/10 text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-white">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-white dark:bg-[#2C2C2E] border-0 text-[#1C1C1E] dark:text-white rounded-xl shadow-xl" align="end">
                                <DropdownMenuItem onClick={() => onUpdateStatus(book.id, 'finished', 100)} className="py-2.5 font-medium">
                                    <Check className="mr-2 h-4 w-4 text-[#34C759]"/> Kitabı Bitir
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-[#FF3B30] focus:text-[#FF3B30] focus:bg-[#FF3B30]/10 py-2.5 font-medium" onClick={() => onRemove(book.id)}>
                                    <Trash2 className="mr-2 h-4 w-4"/> Listeden Kaldır
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
                 <div className="relative w-[100px] shrink-0 snap-start">
                    <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden shadow-sm mb-1.5">
                        <Image src={book.image} alt={book.title} fill className="object-cover" />
                        <div className="absolute inset-0 ring-1 ring-inset ring-black/10 dark:ring-white/10 rounded-xl pointer-events-none" />
                        <div className="absolute top-1.5 right-1.5 bg-[#34C759] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-[#1C1C1E]">
                            <Check className="w-3 h-3 text-white" />
                        </div>
                    </div>
                    <p className="text-[12px] font-semibold text-[#1C1C1E] dark:text-white line-clamp-2 leading-tight">{book.title}</p>
                </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xs bg-white dark:bg-[#1C1C1E] border-0 text-[#1C1C1E] dark:text-white rounded-[24px] shadow-2xl p-6 overflow-hidden">
                 <div className="text-center mb-4">
                    <DialogTitle className="text-[18px] font-bold">{book.title}</DialogTitle>
                    <DialogDescription className="text-[14px] font-medium text-[#8E8E93]">{book.author}</DialogDescription>
                </div>
                <div className="flex justify-center mb-6">
                     <div className="relative w-[120px] aspect-[2/3] shadow-lg rounded-xl overflow-hidden border border-black/5 dark:border-white/5">
                        <Image src={book.image} alt={book.title} fill className="object-cover" />
                     </div>
                </div>
                <div className="flex flex-col gap-2.5">
                     <Button className="w-full rounded-[14px] h-12 bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-white hover:bg-[#E3E3E8] dark:hover:bg-[#3A3A3C] font-semibold" onClick={() => { onUpdateStatus(book.id, 'reading', 0); setIsOpen(false); }}>
                        <RotateCcw className="mr-2 h-4 w-4"/> Tekrar Oku
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                             <Button variant="ghost" className="w-full rounded-[14px] h-12 text-[#FF3B30] hover:bg-[#FF3B30]/10 font-semibold">
                                <Trash2 className="mr-2 h-4 w-4"/> Kaldır
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-white dark:bg-[#1C1C1E] border-0 rounded-[24px]">
                            <AlertDialogHeader><AlertDialogTitle>Kitabı Kaldır</AlertDialogTitle><AlertDialogDescription>Kütüphanenizden kaldırmak istediğinize emin misiniz?</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooterComponent className="flex-row gap-2 mt-4 sm:space-x-0"><AlertDialogCancel className="flex-1 mt-0 rounded-[12px] h-11 bg-[#F2F2F7] dark:bg-[#2C2C2E] border-0 text-[#1C1C1E] dark:text-white">İptal</AlertDialogCancel><AlertDialogAction onClick={() => {onRemove(book.id); setIsOpen(false);}} className="flex-1 mt-0 rounded-[12px] h-11 bg-[#FF3B30] text-white">Kaldır</AlertDialogAction></AlertDialogFooterComponent>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function BookCard({ book, onUpdateStatus, onRemove }: { book: any, onUpdateStatus: (bookId: string, status: 'reading' | 'finished', progress?: number) => void, onRemove: (bookId: string) => void }) {
    return (
        <div className="relative w-[100px] shrink-0 snap-start">
            <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden shadow-sm mb-1.5">
                <Image src={book.image} alt={book.title} fill className="object-cover" />
                <div className="absolute inset-0 ring-1 ring-inset ring-black/10 dark:ring-white/10 rounded-xl pointer-events-none" />
            </div>
            <p className="text-[12px] font-semibold text-[#1C1C1E] dark:text-white line-clamp-1 leading-tight mb-0.5">{book.title}</p>
            
            <div className="flex gap-1.5 mt-1.5">
                <Button className="flex-1 h-7 rounded-lg bg-[#007AFF] text-white text-[10px] font-bold px-0 shadow-sm" onClick={() => onUpdateStatus(book.id, 'reading', 0)}>
                    Başla
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg border-slate-200 dark:border-white/10 bg-white dark:bg-[#1C1C1E] text-[#8E8E93]">
                            <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-white dark:bg-[#2C2C2E] border-0 text-[#1C1C1E] dark:text-white rounded-xl shadow-xl min-w-[140px]">
                        <DropdownMenuItem className="text-[#FF3B30] focus:text-[#FF3B30] focus:bg-[#FF3B30]/10 py-2.5 font-medium" onClick={() => onRemove(book.id)}>
                            <Trash2 className="mr-2 h-4 w-4"/> Kaldır
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    )
}