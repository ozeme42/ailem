

"use client";

import { useState, useEffect, useMemo, FC, useRef } from 'react';
import Image from "next/image";
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { Book as BookType, UserLibrary, FamilyMember, ReadingGoals, ReadingSession } from '@/lib/data';
import { onBooksUpdate, onUserLibrariesUpdate, updateUserBookStatus, removeBookFromMemberLibrary, addReadingSession, onReadingSessionsUpdate } from '@/lib/dataService';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, CheckSquare, Target, Library, BookUp, BookCheck, Trash2, ChevronDown, PlusCircle, MoreVertical, Edit, RotateCcw, Play, Pause, BarChart, Book, Clock } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { SetReadingGoalForm } from '@/components/reading-goal-form';
import { format, parseISO, subDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Input } from "@/components/ui/input";
import { Slider } from '@/components/ui/slider';
import { PageHeader } from '@/components/page-header';
import { BarChart as RechartsBarChart, Bar as RechartsBar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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
  const [allBooks, setAllBooks] = useState<BookType[]>([]);
  const [userLibraries, setUserLibraries] = useState<UserLibrary[]>([]);
  const [readingSessions, setReadingSessions] = useState<ReadingSession[]>([]);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (familyMembers.length > 0 && !selectedMember) {
      setSelectedMember(familyMembers[0]);
    }
  }, [familyMembers, selectedMember]);

  useEffect(() => {
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
         endTime: session.endTime.toISOString(),
         durationSeconds: durationSeconds,
         pagesRead: session.pagesRead,
     }
     await addReadingSession(newSession);

     // Update book progress
    if (book.pageCount) {
        const currentProgressPages = ((book as any).progress || 0) / 100 * book.pageCount;
        const newTotalPagesRead = currentProgressPages + session.pagesRead;
        const newProgressPercent = Math.min(Math.round((newTotalPagesRead / book.pageCount) * 100), 100);
        await updateUserBookStatus(familyId, selectedMember.id, book.id, newProgressPercent === 100 ? 'finished' : 'reading', newProgressPercent);
    }
  };

  const { readingBooks, toReadBooks, finishedBooks, stats } = useMemo(() => {
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
  
  const memberSessions = useMemo(() => {
    if (!selectedMember) return [];
    return readingSessions.filter(s => s.memberId === selectedMember.id);
  }, [readingSessions, selectedMember]);
  
  const readingStats = useMemo(() => {
    const today = new Date();
    const startOfWeek = subDays(today, today.getDay() - 1); // Assuming Monday is the start of the week
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const dailyData: { [day: string]: { duration: number, pages: number }} = {};
    for (let i = 6; i >= 0; i--) {
        const day = subDays(today, i);
        dailyData[format(day, 'EEE', { locale: tr })] = { duration: 0, pages: 0 };
    }

    let totalDuration = 0;
    let totalPages = 0;
    memberSessions.forEach(session => {
        totalDuration += session.durationSeconds;
        totalPages += session.pagesRead;

        const sessionDate = parseISO(session.startTime);
        if (sessionDate >= subDays(today, 7)) {
             const dayKey = format(sessionDate, 'EEE', { locale: tr });
             if (dailyData[dayKey]) {
                dailyData[dayKey].duration += session.durationSeconds;
                dailyData[dayKey].pages += session.pagesRead;
             }
        }
    });
    
    const avgReadingSpeed = totalPages > 0 ? totalDuration / totalPages / 60 : 0; // minutes per page
    
    const weeklyChartData = Object.entries(dailyData).map(([day, data]) => ({
        day,
        "Okuma Süresi (dk)": Math.round(data.duration / 60)
    }));
    
    return {
        avgReadingSpeed: avgReadingSpeed.toFixed(1),
        weeklyChartData
    }

  }, [memberSessions]);

  const readingGoals = selectedMember?.readingGoals;
  const monthlyGoalProgress = useMemo(() => {
    if (!readingGoals?.monthly || !selectedMember) return { pages: 0, books: 0, pagesRead: 0, booksRead: 0 };
    
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const monthlySessions = memberSessions.filter(s => parseISO(s.startTime) >= startOfMonth);
    const pagesRead = monthlySessions.reduce((sum, s) => sum + s.pagesRead, 0);

    const finishedBookIds = new Set(
        userLibraries.find(lib => lib.memberId === selectedMember.id)?.books
            .filter(b => b.status === 'finished' && b.finishedAt && parseISO(b.finishedAt) >= startOfMonth)
            .map(b => b.bookId)
    );
    const booksRead = finishedBookIds.size;

    return {
        pages: (pagesRead / (readingGoals.monthly.pages || 1)) * 100,
        books: (booksRead / (readingGoals.monthly.books || 1)) * 100,
        pagesRead,
        booksRead
    };
  }, [readingGoals, memberSessions, userLibraries, selectedMember]);


  return (
    <>
      <div className="space-y-6">
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
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>Aylık Okuma Hedefleri</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-6">
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Sayfa Hedefi</span>
                            <span className="font-semibold">{monthlyGoalProgress.pagesRead} / {readingGoals.monthly?.pages || 0}</span>
                        </div>
                        <Progress value={monthlyGoalProgress.pages} />
                    </div>
                     <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Kitap Hedefi</span>
                             <span className="font-semibold">{monthlyGoalProgress.booksRead} / {readingGoals.monthly?.books || 0}</span>
                        </div>
                        <Progress value={monthlyGoalProgress.books} indicatorClassName="bg-green-500" />
                    </div>
                </CardContent>
            </Card>
        )}

        <Card className="mb-8">
          <CardHeader>
              <CardTitle>Okuma İstatistikleri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <Card className="p-4">
                      <CardTitle className="flex items-center justify-center gap-2 text-base"><CheckSquare className="text-green-500"/> Okunan</CardTitle>
                      <p className="text-2xl font-bold mt-2">{stats.finished}</p>
                  </Card>
                  <Card className="p-4">
                      <CardTitle className="flex items-center justify-center gap-2 text-base"><BookOpen className="text-blue-500"/> Okunacak</CardTitle>
                      <p className="text-2xl font-bold mt-2">{stats.reading + toReadBooks.length}</p>
                  </Card>
                  <Card className="p-4">
                      <CardTitle className="flex items-center justify-center gap-2 text-base"><Clock className="text-purple-500"/> Hız</CardTitle>
                      <p className="text-2xl font-bold mt-2">{readingStats.avgReadingSpeed} <span className="text-base text-muted-foreground">dk/sf</span></p>
                  </Card>
                   <Card className="p-4">
                      <CardTitle className="flex items-center justify-center gap-2 text-base"><Book className="text-orange-500"/> Toplam</CardTitle>
                      <p className="text-2xl font-bold mt-2">{stats.total}</p>
                  </Card>
              </div>
              <div>
                  <h3 className="font-semibold mb-2">Haftalık Okuma Süresi</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <RechartsBarChart data={readingStats.weeklyChartData}>
                            <XAxis dataKey="day" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}/>
                            <RechartsBar dataKey="Okuma Süresi (dk)" radius={[4, 4, 0, 0]}>
                                {readingStats.weeklyChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill="hsl(var(--primary))" />
                                ))}
                            </RechartsBar>
                        </RechartsBarChart>
                    </ResponsiveContainer>
              </div>
          </CardContent>
        </Card>
        
        {readingBooks.length > 0 && (
            <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Şu An Okudukların</h2>
                <div className="grid grid-cols-1 gap-6">
                    {readingBooks.map(book => <ReadingBookCard key={book.id} book={book} onUpdateStatus={handleUpdateStatus} onRemove={handleRemoveFromLibrary} />)}
                </div>
            </div>
        )}
        
        {finishedBooks.length > 0 && (
            <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Bitirdiklerim</h2>
                 <div className="grid grid-cols-1 gap-6">
                    {finishedBooks.map(book => <FinishedBookCard key={book.id} book={book} onUpdateStatus={handleUpdateStatus} onRemove={handleRemoveFromLibrary}/>)}
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
    </>
  );
}

function ReadingBookCard({ book, onUpdateStatus, onRemove }: { book: any, onUpdateStatus: (bookId: string, status: 'reading' | 'finished', progress?: number) => void, onRemove: (bookId: string) => void }) {
    const [pagesReadInput, setPagesReadInput] = useState("");
    const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);
    
    const handleProgressSave = () => {
        const pages = parseInt(pagesReadInput, 10);
        if (isNaN(pages) || pages <= 0 || !book.pageCount) return;
        
        const currentProgressPages = (book.progress || 0) / 100 * book.pageCount;
        const newTotalPagesRead = currentProgressPages + pages;
        const newProgressPercent = Math.min(Math.round((newTotalPagesRead / book.pageCount) * 100), 100);

        onUpdateStatus(book.id, newProgressPercent === 100 ? 'finished' : 'reading', newProgressPercent);
        setIsProgressDialogOpen(false);
        setPagesReadInput("");
    }

    const pagesRead = Math.round((book.progress || 0) / 100 * (book.pageCount || 0));

    return (
        <Card className="overflow-hidden shadow-lg border-border/50">
            <div className="p-4 flex flex-col sm:flex-row gap-4">
                <Image src={book.image} alt={book.title} width={100} height={150} className="w-24 sm:w-28 h-auto rounded-md aspect-[2/3] object-cover shadow-md mx-auto sm:mx-0" data-ai-hint="book cover"/>
                <div className="flex-grow flex flex-col min-w-0">
                    <div className="flex-grow min-w-0">
                        <h3 className="font-bold text-lg leading-tight truncate">{book.title}</h3>
                        <p className="text-sm text-muted-foreground truncate">{book.author}</p>
                        {book.startedAt && <p className="text-xs text-muted-foreground mt-1">Başlangıç: {format(parseISO(book.startedAt), 'dd MMM yyyy', {locale: tr})}</p>}
                    </div>
                    
                    <div className="mt-4 space-y-2">
                        <Progress value={book.progress || 0} className="h-2"/>
                        <div className="flex justify-between text-xs sm:text-sm text-muted-foreground">
                            <span>{pagesRead} / {book.pageCount || '?'} sayfa</span>
                            <span className="font-semibold text-primary">{book.progress || 0}%</span>
                        </div>
                        <div className="flex gap-2 pt-2 items-center justify-center">
                            <Dialog open={isProgressDialogOpen} onOpenChange={setIsProgressDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="flex-1">İlerleme Gir</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>İlerleme Ekle: {book.title}</DialogTitle>
                                        <DialogDescription>Kaç sayfa daha okudun?</DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4">
                                        <Label htmlFor="pagesRead">Okunan Sayfa Sayısı</Label>
                                        <Input id="pagesRead" type="number" placeholder="Örn: 50" value={pagesReadInput} onChange={(e) => setPagesReadInput(e.target.value)} />
                                    </div>
                                    <DialogFooter>
                                        <Button variant="ghost" onClick={() => setIsProgressDialogOpen(false)}>İptal</Button>
                                        <Button onClick={handleProgressSave}>Kaydet</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                             <Link href={`/library/session/${book.id}`}>
                                <Button size="icon" className="rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                                    <Clock className="h-5 w-5"/>
                                </Button>
                            </Link>
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-10 w-10">
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
        <Card className="overflow-hidden shadow-lg border-border/50 bg-muted/30">
            <div className="p-4 flex flex-row gap-4">
                <Image src={book.image} alt={book.title} width={100} height={150} className="w-20 h-auto rounded-md aspect-[2/3] object-cover shadow-md" data-ai-hint="book cover"/>
                <div className="flex-grow flex flex-col">
                    <h3 className="font-bold text-lg leading-tight">{book.title}</h3>
                    <p className="text-sm text-muted-foreground">{book.author}</p>
                    <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                        {book.startedAt && <p>Başlangıç: {format(parseISO(book.startedAt), 'dd MMM yyyy', {locale: tr})}</p>}
                        {book.finishedAt && <p>Bitiş: {format(parseISO(book.finishedAt), 'dd MMM yyyy', {locale: tr})}</p>}
                    </div>
                     <div className="mt-auto pt-4 flex gap-2">
                        <Button variant="outline" size="sm" className="w-full" onClick={() => onUpdateStatus(book.id, 'reading', 0)}>
                             <RotateCcw className="mr-2 h-4 w-4"/> Tekrar Oku
                        </Button>
                        <Button variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive" onClick={() => onRemove(book.id)}>
                            <Trash2 className="mr-2 h-4 w-4"/> Kaldır
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    )
}

function BookCard({ book, onUpdateStatus, onRemove }: { book: any, onUpdateStatus: (bookId: string, status: 'reading' | 'finished', progress?: number) => void, onRemove: (bookId: string) => void }) {
    return (
        <Card className="overflow-hidden flex flex-col group text-center transition-all hover:shadow-md hover:-translate-y-1 relative">
            <Image src={book.image} alt={book.title} width={150} height={225} className="w-full object-cover aspect-[2/3]" data-ai-hint="book cover"/>
            <div className="p-2 flex flex-col flex-grow">
                <p className="font-semibold text-sm leading-tight flex-grow line-clamp-2" title={book.title}>{book.title}</p>
                <p className="text-xs text-muted-foreground truncate">{book.author}</p>
            </div>
             <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="h-7 w-7">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => onUpdateStatus(book.id, 'reading', 0)}>
                            <BookUp className="mr-2 h-4 w-4"/> Okumaya Başla
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onRemove(book.id)}>
                            <Trash2 className="mr-2 h-4 w-4"/> Kütüphaneden Kaldır
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </Card>
    )
}