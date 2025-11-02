

"use client";

import * as React from "react";
import Image from "next/image";
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { Book, UserLibrary, FamilyMember, ReadingGoals, ReadingSession } from '@/lib/data';
import { onBooksUpdate, onUserLibrariesUpdate, updateUserBookStatus, removeBookFromMemberLibrary, addReadingSession, onReadingSessionsUpdate } from '@/lib/dataService';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, CheckSquare, Target, Library, BookUp, BookCheck, Trash2, ChevronDown, PlusCircle, MoreVertical, Edit, RotateCcw, Play, Pause, BarChart2, Book as BookIcon, Clock, Heart, Check } from 'lucide-react';
import { FormLabel } from '@/components/ui/form';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { SetReadingGoalForm } from '@/components/reading-goal-form';
import { format, parseISO, subDays, isFuture, isPast, isToday, startOfWeek, endOfWeek, addDays, isSameDay, isWithinInterval } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { PageHeader } from '@/components/page-header';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Bar } from 'recharts';
import { BookDetailDialog } from "@/components/book-detail-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { NewBookForm } from "@/components/new-book-form";
import { MemberDashboardCard } from "@/components/member-dashboard-card";
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';


function formatDuration(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return [
        h > 0 ? `${h}s` : '',
        m > 0 ? `${m}dk` : '',
        s > 0 ? `${s}sn` : '',
    ].filter(Boolean).join(' ');
}


export default function LibraryPage() {
  const { familyId, familyMembers, updateFamilyMember } = useAuth();
  const [allBooks, setAllBooks] = React.useState<BookType[]>([]);
  const [userLibraries, setUserLibraries] = React.useState<UserLibrary[]>([]);
  const [readingSessions, setReadingSessions] = React.useState<ReadingSession[]>([]);
  const [selectedMember, setSelectedMember] = React.useState<FamilyMember | null>(null);
  const [isGoalDialogOpen, setIsGoalDialogOpen] = React.useState(false);
  const [viewingBook, setViewingBook] = React.useState<any | null>(null);
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
      await updateFamilyMember(selectedMember.id, { readingGoals: goals });
      toast({ title: "Hedefler Güncellendi", description: `${selectedMember.name} için yeni okuma hedefleri kaydedildi.` });
      setIsGoalDialogOpen(false);
    } catch (e) {
       toast({ title: "Hata", description: "Hedefler kaydedilirken bir sorun oluştu.", variant: "destructive" });
    }
  };
  
  const handleSaveSession = async (book: BookType, session: { startTime: Date, endTime: Date, pagesRead: number }) => {
     if (!familyId || !selectedMember) return;
     const durationSeconds = Math.round((session.endTime.getTime() - session.startTime.getTime()) / 1000);
     
     const newSession: Omit<ReadingSession, 'id' | 'familyId'> = {
         memberId: selectedMember.id,
         bookId: book.id,
         startTime: session.startTime.toISOString(),
         endTime: new Date().toISOString(),
         durationSeconds: durationSeconds,
         pagesRead: session.pagesRead,
     }
     await addReadingSession(newSession);

    if (book.pageCount) {
        const currentProgressPages = ((book as any).progress || 0) / 100 * book.pageCount;
        const newTotalPagesRead = currentProgressPages + session.pagesRead;
        const newProgressPercent = Math.min(Math.round((newTotalPagesRead / book.pageCount) * 100), 100);
        await updateUserBookStatus(familyId, selectedMember.id, book.id, newProgressPercent === 100 ? 'finished' : 'reading', newProgressPercent);
    }
  };

  const { readingBooks, toReadBooks, finishedBooks, stats } = React.useMemo(() => {
    if (!selectedMember) {
        return { readingBooks: [], toReadBooks: [], finishedBooks: [], stats: { finished: 0, total: 0, reading: 0, percentage: 0 }};
    }
    
    const memberLibrary = userLibraries.find(lib => lib.memberId === selectedMember.id);
    if (!memberLibrary) {
        return { readingBooks: [], toReadBooks: [], finishedBooks: [], stats: { finished: 0, total: 0, reading: 0, percentage: 0 }};
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
      total: myBookDetails.length,
      reading: reading.length,
      percentage: myBookDetails.length > 0 ? (finished.length / myBookDetails.length) * 100 : 0
    };

    return { readingBooks: reading, toReadBooks: toRead, finishedBooks: finished, stats: statistics };

  }, [selectedMember, userLibraries, allBooks]);
  
  const memberSessions = React.useMemo(() => {
    if (!selectedMember) return [];
    return readingSessions.filter(s => s.memberId === selectedMember.id);
  }, [readingSessions, selectedMember]);
  
    const readingStats = React.useMemo(() => {
    if (!selectedMember) return { weeklyChartData: [] };

    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    
    const dailyPages: { [key: string]: number } = {};
    const weekDaysKeys = Array.from({ length: 7 }).map((_, i) => format(addDays(weekStart, i), 'EEE', { locale: tr }));
    weekDaysKeys.forEach(key => dailyPages[key] = 0);

    memberSessions.forEach(session => {
        const sessionDate = parseISO(session.startTime);
        if (isWithinInterval(sessionDate, { start: weekStart, end: weekEnd })) {
            const dayKey = format(sessionDate, 'EEE', { locale: tr });
            dailyPages[dayKey] = (dailyPages[dayKey] || 0) + session.pagesRead;
        }
    });
    
    const weeklyChartData = weekDaysKeys.map(dayKey => ({
        day: dayKey,
        "Okunan Sayfa Sayısı": dailyPages[dayKey] || 0,
    }));
    
    return {
        weeklyChartData
    };
}, [memberSessions, selectedMember]);


  const readingGoals = selectedMember?.readingGoals;
  const monthlyGoalProgress = React.useMemo(() => {
    if (!readingGoals?.monthly || !selectedMember) return { pages: 0, books: 0, pagesRead: 0, booksRead: 0 };
    
    const startOfMonthDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

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
  }, [readingGoals, memberSessions, userLibraries, selectedMember]);

  const chartConfig = {
    pages: {
      label: "Sayfa",
      color: "hsl(var(--primary-foreground))",
    },
  } satisfies ChartConfig;

  return (
    <>
      <div className="space-y-6 pb-24 md:pb-8">
        <PageHeader title="Kişisel Kütüphanem">
            <Link href="/library/archive">
                <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none">
                    <Library className="mr-2 h-4 w-4"/>
                    Kitaplığımız
                </Button>
            </Link>
        </PageHeader>
        
        <div className="flex items-center gap-4 border-b pb-4 overflow-x-auto">
          {familyMembers.map((member) => (
            <Button
              key={member.id}
              variant={selectedMember?.id === member.id ? "default" : "outline"}
              className={`h-auto p-2 flex items-center gap-2 rounded-full transition-all duration-200 shrink-0 ${selectedMember?.id === member.id ? 'scale-105 shadow-lg' : 'hover:bg-accent'}`}
              onClick={() => setSelectedMember(member)}
            >
              <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" 
                  style={{ backgroundColor: member.color, color: '#fff' }}
              >
                  {member.name.charAt(0).toUpperCase()}
              </div>
              <p className="font-bold text-sm">{member.name}</p>
            </Button>
          ))}
        </div>
        
        {readingGoals && (
             <Card className="shadow-lg bg-gradient-to-br from-pink-500 to-purple-600 text-white">
                <CardHeader>
                    <CardTitle>Aylık Okuma Hedefleri</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-6">
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-white/80">Sayfa Hedefi</span>
                            <span className="font-semibold">{monthlyGoalProgress.pagesRead} / {readingGoals.monthly?.pages || 0}</span>
                        </div>
                        <Progress value={monthlyGoalProgress.pages} className="h-1.5 bg-white/30" indicatorClassName="bg-white" />
                    </div>
                     <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-white/80">Kitap Hedefi</span>
                             <span className="font-semibold">{monthlyGoalProgress.booksRead} / {readingGoals.monthly?.books || 0}</span>
                        </div>
                        <Progress value={monthlyGoalProgress.books} className="h-1.5 bg-white/30" indicatorClassName="bg-green-300" />
                    </div>
                </CardContent>
            </Card>
        )}

        <Card className="shadow-lg bg-gradient-to-r from-orange-400 to-rose-400 text-white">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                    <BarChart2 /> Haftalık Okunan Sayfa Sayısı
                </CardTitle>
            </CardHeader>
             <CardContent className="overflow-x-auto -mx-6 px-2 sm:px-6">
                <div className="min-w-[300px] h-52">
                    <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={readingStats.weeklyChartData} margin={{ right: 20, left: -20 }}>
                        <defs>
                            <linearGradient id="fillColor" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary-foreground))" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="hsl(var(--primary-foreground))" stopOpacity={0.1} />
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} stroke="hsl(var(--primary-foreground))" className="text-xs" />
                        <Tooltip
                          cursor={{ fill: 'hsla(0, 0%, 100%, 0.1)' }}
                          content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                  return (
                                      <div className="p-3 rounded-lg bg-background/80 text-foreground backdrop-blur-sm shadow-lg">
                                          <p className="font-bold text-center text-base mb-1">{label}</p>
                                          <p className="text-center">{`${payload[0].value} sayfa`}</p>
                                      </div>
                                  );
                              }
                              return null;
                          }}
                        />
                        <Area type="monotone" dataKey="Okunan Sayfa Sayısı" stroke="hsl(var(--primary-foreground))" strokeWidth={2} fill="url(#fillColor)" activeDot={{ r: 6, className: 'stroke-white fill-orange-400' }} />
                    </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
        
        {readingBooks.length > 0 && (
            <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Şu An Okudukların</h2>
                <div className="grid grid-cols-1 gap-6">
                    {readingBooks.map(book => <ReadingBookCard key={book.id} book={book} onUpdateStatus={handleUpdateStatus} onRemove={handleRemoveFromLibrary} onViewDetails={() => setViewingBook(book)} onSaveSession={handleSaveSession} />)}
                </div>
            </div>
        )}
        
        {toReadBooks.length > 0 && (
            <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Sıradakiler</h2>
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {toReadBooks.map(book => <BookCard key={book.id} book={book} onUpdateStatus={handleUpdateStatus} onRemove={handleRemoveFromLibrary}/>)}
                </div>
            </div>
        )}

        {finishedBooks.length > 0 && (
             <div className="mb-8 p-4 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2 text-amber-900"><BookCheck/> Bitirdiklerim</h2>
                 <div className="relative">
                    <div className="-mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto pb-4 -mb-4">
                        <div className="flex flex-nowrap gap-4">
                            {finishedBooks.map(book => <FinishedBookCard key={book.id} book={book} onUpdateStatus={handleUpdateStatus} onRemove={handleRemoveFromLibrary}/>)}
                        </div>
                    </div>
                </div>
            </div>
        )}

      </div>

      {selectedMember && (
          <div className="fixed bottom-20 right-6 md:bottom-6 md:right-6 z-50">
              <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
                  <DialogTrigger asChild>
                      <Button className="rounded-full w-14 h-14 shadow-lg bg-gradient-to-br from-blue-500 to-purple-600 hover:scale-105 transition-transform">
                          <Target className="w-7 h-7" />
                      </Button>
                  </DialogTrigger>
                  <DialogContent>
                      <DialogHeader>
                          <DialogTitle>{selectedMember.name} için Hedef Belirle</DialogTitle>
                      </DialogHeader>
                      <SetReadingGoalForm
                          initialGoals={selectedMember.readingGoals}
                          onSave={handleSaveGoals}
                      />
                  </DialogContent>
              </Dialog>
          </div>
      )}
      
      <BookDetailDialog 
        book={viewingBook} 
        isOpen={!!viewingBook}
        onOpenChange={() => setViewingBook(null)}
      />
    </>
  );
}

function ReadingBookCard({ book, onUpdateStatus, onRemove, onViewDetails, onSaveSession }: { book: any, onUpdateStatus: (bookId: string, status: 'reading' | 'finished', progress?: number) => void, onRemove: (bookId: string) => void, onViewDetails: () => void, onSaveSession: (book: BookType, session: { startTime: Date, endTime: Date, pagesRead: number }) => void }) {
    const [isProgressDialogOpen, setIsProgressDialogOpen] = React.useState(false);

    const progressForm = useForm<{ currentPage: number }>({
        defaultValues: {
            currentPage: book.pageCount && book.progress ? Math.round((book.progress / 100) * book.pageCount) : 0,
        }
    });
    
    React.useEffect(() => {
        progressForm.setValue('currentPage', book.pageCount && book.progress ? Math.round((book.progress / 100) * book.pageCount) : 0);
    }, [book.progress, book.pageCount, progressForm]);


    const handleProgressSave = (data: { currentPage: number }) => {
        const targetPage = data.currentPage;
        if (isNaN(targetPage) || targetPage < 0 || !book.pageCount) return;

        const pagesReadCurrently = book.pageCount && book.progress ? Math.round((book.progress / 100) * book.pageCount) : 0;
        const newPagesReadThisSession = targetPage - pagesReadCurrently;
        
        if (newPagesReadThisSession > 0) {
             const sessionData = {
                startTime: subDays(new Date(),1),
                endTime: new Date(),
                pagesRead: newPagesReadThisSession,
            };
            onSaveSession(book, sessionData);
        } else {
             const newProgressPercent = Math.min(Math.round((targetPage / book.pageCount) * 100), 100);
             onUpdateStatus(book.id, newProgressPercent >= 100 ? 'finished' : 'reading', newProgressPercent);
        }
        
        setIsProgressDialogOpen(false);
    }

    const pagesRead = book.pageCount ? Math.round((book.progress || 0) / 100 * book.pageCount) : 0;

    return (
        <Card className="overflow-hidden shadow-lg border-0 bg-gradient-to-br from-blue-500 to-purple-600 text-white">
            <div className="p-4 flex flex-col sm:flex-row gap-4">
                <Image 
                    src={book.image} 
                    alt={book.title} 
                    width={100} 
                    height={150} 
                    className="w-24 sm:w-28 h-auto rounded-md aspect-[2/3] object-cover shadow-md mx-auto sm:mx-0 cursor-pointer" 
                    onClick={onViewDetails}
                    data-ai-hint="book cover"
                />
                <div className="flex-grow flex flex-col min-w-0">
                    <div className="flex-grow min-w-0 cursor-pointer" onClick={onViewDetails}>
                        <h3 className="font-bold text-lg leading-tight truncate">{book.title}</h3>
                        <p className="text-sm text-white/80 truncate">{book.author}</p>
                        {book.startedAt && <p className="text-xs text-white/80 mt-1">Başlangıç: {format(parseISO(book.startedAt), 'dd MMM yyyy', {locale: tr})}</p>}
                    </div>
                    
                    <div className="mt-4 space-y-2">
                        <div className="relative h-4">
                            <Progress value={book.progress || 0} className="h-full bg-white/30" indicatorClassName="bg-white" />
                            <div className="absolute inset-0 flex justify-between items-center px-2 text-xs font-medium text-purple-900">
                                <span>{pagesRead} / {book.pageCount || '?'} sayfa</span>
                                <span className="font-semibold">{book.progress || 0}%</span>
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2 items-center justify-center">
                            <Dialog open={isProgressDialogOpen} onOpenChange={setIsProgressDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="secondary" className="flex-1 bg-white/20 text-white hover:bg-white/30">İlerleme Gir</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>İlerleme Gir: {book.title}</DialogTitle>
                                        <DialogDescription>Şu an kitabın kaçıncı sayfasındasın?</DialogDescription>
                                    </DialogHeader>
                                     <Form {...progressForm}>
                                        <form onSubmit={progressForm.handleSubmit(handleProgressSave)} className="py-4 space-y-4">
                                            <FormField
                                                control={progressForm.control}
                                                name="currentPage"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Geldiğin Sayfa Numarası</FormLabel>
                                                        <FormControl><Input type="number" {...field} /></FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <DialogFooter>
                                                <Button variant="ghost" type="button" onClick={() => setIsProgressDialogOpen(false)}>İptal</Button>
                                                <Button type="submit">Kaydet</Button>
                                            </DialogFooter>
                                        </form>
                                     </Form>
                                </DialogContent>
                            </Dialog>
                             <Link href={`/library/session/${book.id}`}>
                                <Button size="icon" className="rounded-full bg-amber-400 text-amber-900 hover:bg-amber-500">
                                    <Clock className="h-5 w-5"/>
                                </Button>
                            </Link>
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-10 w-10 text-white hover:text-white hover:bg-white/20">
                                        <MoreVertical className="h-5 w-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => onUpdateStatus(book.id, 'finished', 100)}>
                                        <BookCheck className="mr-2 h-4 w-4"/> Kitabı Bitir
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onRemove(book.id)}>
                                        <Trash2 className="mr-2 h-4 w-4"/> Kütüphaneden Kaldır
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    )
}

function FinishedBookCard({ book, onUpdateStatus, onRemove }: { book: any, onUpdateStatus: (bookId: string, status: 'reading' | 'finished', progress?: number) => void, onRemove: (bookId: string) => void }) {
    return (
        <div className="group relative w-32 shrink-0">
             <Image src={book.image} alt={book.title} width={150} height={225} className="w-full object-cover aspect-[2/3] rounded-lg shadow-md transition-transform duration-300 group-hover:scale-105" data-ai-hint="book cover"/>
            <div className="absolute inset-0 bg-black/60 rounded-lg flex flex-col items-center justify-center p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="font-semibold text-xs text-white leading-tight text-center line-clamp-3">{book.title}</p>
                <div className="flex gap-2 mt-3">
                     <Button variant="secondary" size="sm" className="h-7 px-2 text-xs" onClick={() => onUpdateStatus(book.id, 'reading', 0)}>
                         <RotateCcw className="mr-1 h-3 w-3"/> Tekrar
                    </Button>
                     <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => onRemove(book.id)}>
                        <Trash2 className="h-3 w-3"/>
                    </Button>
                </div>
            </div>
        </div>
    )
}

function BookCard({ book, onUpdateStatus, onRemove }: { book: any, onUpdateStatus: (bookId: string, status: 'reading' | 'finished', progress?: number) => void, onRemove: (bookId: string) => void }) {
    return (
        <Card className="overflow-hidden flex flex-col group text-center transition-all hover:shadow-md hover:-translate-y-1 relative bg-gradient-to-br from-green-400 to-teal-500 text-white">
            <Image src={book.image} alt={book.title} width={150} height={225} className="w-full object-cover aspect-[2/3]" data-ai-hint="book cover"/>
            <div className="p-2 flex flex-col flex-grow">
                <p className="font-semibold text-sm leading-tight flex-grow line-clamp-2 text-white/90" title={book.title}>{book.title}</p>
                <p className="text-xs text-white/70 truncate">{book.author}</p>
            </div>
            <CardFooter className="p-2">
                 <Button variant="secondary" size="sm" className="w-full bg-white/20 text-white hover:bg-white/30" onClick={() => onUpdateStatus(book.id, 'reading', 0)}>
                    <BookUp className="mr-2 h-4 w-4"/> Başla
                </Button>
            </CardFooter>
             <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="h-7 w-7 bg-black/20 hover:bg-black/30 border-none text-white">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onRemove(book.id)}>
                            <Trash2 className="mr-2 h-4 w-4"/> Kütüphaneden Kaldır
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </Card>
    )
}


    



