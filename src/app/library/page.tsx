
"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from 'react';
import Image from "next/image";
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { Book as BookType, UserLibrary, FamilyMember, ReadingGoals } from '@/lib/data';
import { onBooksUpdate, onUserLibrariesUpdate, updateUserBookStatus, removeBookFromMemberLibrary } from '@/lib/dataService';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, CheckSquare, Target, Library, BookUp, BookCheck, Trash2, ChevronDown, PlusCircle, MoreVertical } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { SetReadingGoalForm } from '@/components/reading-goal-form';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Input } from "@/components/ui/input";


export default function LibraryPage() {
  const { familyId, familyMembers, updateFamilyMember } = useAuth();
  const [allBooks, setAllBooks] = useState<BookType[]>([]);
  const [userLibraries, setUserLibraries] = useState<UserLibrary[]>([]);
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
    let unsubscribeLibraries = () => {};
    if (familyId) {
      unsubscribeLibraries = onUserLibrariesUpdate(familyId, setUserLibraries);
    }
    return () => {
      unsubscribeBooks();
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
  
  const readingGoals = selectedMember?.readingGoals || {};
  const { daily, weekly, monthly, yearly } = readingGoals;
  
  const currentProgress = useMemo(() => {
    const allMemberBooks = (userLibraries.find(lib => lib.memberId === selectedMember?.id)?.books || [])
      .map(libBook => {
        const bookDetail = allBooks.find(b => b.id === libBook.bookId);
        return bookDetail ? { ...libBook, ...bookDetail } : null;
      })
      .filter(Boolean) as (BookType & { status: 'to-read' | 'reading' | 'finished', progress?: number, startedAt?: string, finishedAt?: string })[];

    const pagesReadToday = allMemberBooks.reduce((acc, book) => {
        // This is a simplification. A real app would need a history of progress.
        // For now, we assume progress is linear and spread across the days since start.
        if (book.status === 'reading' && book.startedAt && book.pageCount) {
             const daysSinceStart = (new Date().getTime() - parseISO(book.startedAt).getTime()) / (1000 * 3600 * 24);
             if (daysSinceStart >= 1) {
                 const totalPagesRead = (book.pageCount * (book.progress || 0)) / 100;
                 return acc + (totalPagesRead / daysSinceStart);
             }
        }
        return acc;
    }, 0);

    const pagesReadThisWeek = pagesReadToday * 7; // Simplification
    const finishedBooks = allMemberBooks.filter(b => b.status === 'finished');
    const monthlyBooks = finishedBooks.filter(b => b.finishedAt && new Date().getMonth() === parseISO(b.finishedAt).getMonth()).length;
    const yearlyBooks = finishedBooks.filter(b => b.finishedAt && new Date().getFullYear() === parseISO(b.finishedAt).getFullYear()).length;


    return {
        daily: { pages: Math.round(pagesReadToday), books: 0 },
        weekly: { pages: Math.round(pagesReadThisWeek), books: 0 },
        monthly: { books: monthlyBooks, bookGoal: monthly?.books || 4 },
        yearly: { books: yearlyBooks, bookGoal: yearly?.books || 20 },
    };
  }, [allBooks, userLibraries, selectedMember, monthly, yearly]);


  return (
    <>
      <div className="space-y-6">
        <Card className="bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg rounded-xl mb-6">
              <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                      <Library/>
                      Kişisel Kütüphanesi
                  </CardTitle>
                  <CardDescription>
                      <Link href="/library/archive" className="text-white/80 hover:text-white underline">
                          Kitaplığımıza Göz At
                      </Link>
                  </CardDescription>
              </CardHeader>
        </Card>
        
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

        <Card className="mb-8">
          <CardHeader>
              <CardTitle>Okuma İlerlemesi</CardTitle>
              <CardDescription>Kişisel okuma hedeflerin ve istatistiklerin.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                  <Card className="p-2 sm:p-4">
                      <CardTitle className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-base"><CheckSquare className="text-green-500 size-4 sm:size-5"/> Okunan</CardTitle>
                      <p className="text-xl sm:text-2xl font-bold mt-1 sm:mt-2">{stats.finished}</p>
                  </Card>
                  <Card className="p-2 sm:p-4">
                      <CardTitle className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-base"><BookOpen className="text-blue-500 size-4 sm:size-5"/> Okunacak</CardTitle>
                      <p className="text-xl sm:text-2xl font-bold mt-1 sm:mt-2">{stats.reading + toReadBooks.length}</p>
                  </Card>
                  <Card className="p-2 sm:p-4">
                      <CardTitle className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-base"><Target className="text-purple-500 size-4 sm:size-5"/> Toplam</CardTitle>
                      <p className="text-xl sm:text-2xl font-bold mt-1 sm:mt-2">{stats.total}</p>
                  </Card>
              </div>
              <div>
                  <Label className="text-sm sm:text-base">Okuma Hedefleri</Label>
                  <div className="space-y-3 mt-2">
                      <div className="space-y-1">
                          <div className="flex justify-between items-baseline text-xs text-muted-foreground">
                              <span className="font-medium">Günlük</span>
                              <span>{currentProgress.daily.pages}/{daily?.pages || 0} sayfa</span>
                          </div>
                          <Progress value={(daily?.pages ? (currentProgress.daily.pages / daily.pages) : 0) * 100} className="h-2"/>
                      </div>
                      <div className="space-y-1">
                          <div className="flex justify-between items-baseline text-xs text-muted-foreground">
                              <span className="font-medium">Haftalık</span>
                              <span>{currentProgress.weekly.pages}/{weekly?.pages || 0} sayfa</span>
                          </div>
                          <Progress value={(weekly?.pages ? (currentProgress.weekly.pages / weekly.pages) : 0) * 100} className="h-2"/>
                      </div>
                      <div className="space-y-1">
                          <div className="flex justify-between items-baseline text-xs text-muted-foreground">
                              <span className="font-medium">Aylık</span>
                              <span>{currentProgress.monthly.books}/{currentProgress.monthly.bookGoal} kitap</span>
                          </div>
                          <Progress value={(currentProgress.monthly.bookGoal ? (currentProgress.monthly.books / currentProgress.monthly.bookGoal) : 0) * 100} className="h-2"/>
                      </div>
                      <div className="space-y-1">
                          <div className="flex justify-between items-baseline text-xs text-muted-foreground">
                              <span className="font-medium">Yıllık</span>
                              <span>{currentProgress.yearly.books}/{currentProgress.yearly.bookGoal} kitap</span>
                          </div>
                          <Progress value={(currentProgress.yearly.bookGoal ? (currentProgress.yearly.books / currentProgress.yearly.bookGoal) : 0) * 100} className="h-2"/>
                      </div>
                  </div>
              </div>
          </CardContent>
        </Card>
        
        {readingBooks.length > 0 && (
            <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Şu An Okudukların</h2>
                <div className="space-y-4">
                    {readingBooks.map(book => <ReadingBookCard key={book.id} book={book} onUpdateStatus={handleUpdateStatus} onRemove={handleRemoveFromLibrary}/>)}
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
            <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Bitirdiklerim</h2>
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {finishedBooks.map(book => <BookCard key={book.id} book={book} onUpdateStatus={handleUpdateStatus} onRemove={handleRemoveFromLibrary}/>)}
                </div>
            </div>
        )}

      </div>

      {selectedMember && (
          <div className="fixed bottom-20 right-6 md:bottom-6 md:right-6 z-50">
              <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
                  <DialogTrigger asChild>
                      <Button className="rounded-full w-14 h-14 shadow-lg bg-gradient-to-br from-blue-500 to-purple-600 hover:scale-105 transition-transform">
                          <PlusCircle className="w-7 h-7" />
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

function ProgressDialog({ book, onUpdateStatus, open, onOpenChange }: { book: any, onUpdateStatus: (bookId: string, status: 'reading' | 'finished', progress: number) => void, open: boolean, onOpenChange: (open: boolean) => void }) {
    const initialPage = Math.round(((book.progress || 0) / 100) * (book.pageCount || 1));
    const [currentPage, setCurrentPage] = useState(initialPage);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (book.pageCount) {
            const newProgress = Math.min(Math.round((currentPage / book.pageCount) * 100), 100);
            onUpdateStatus(book.id, newProgress === 100 ? 'finished' : 'reading', newProgress);
        }
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>İlerleme Gir: {book.title}</DialogTitle>
                    <DialogDescription>Kitabın hangi sayfasında olduğunu gir.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSave} className="py-4 space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="currentPage">Okuduğun Sayfa / {book.pageCount || '?'}</Label>
                        <Input
                            id="currentPage"
                            type="number"
                            value={currentPage}
                            onChange={(e) => setCurrentPage(Number(e.target.value))}
                            max={book.pageCount}
                            min={0}
                            autoFocus
                        />
                     </div>
                    <div className="text-center font-bold text-2xl text-primary">
                        {book.pageCount ? `${Math.round((currentPage / book.pageCount) * 100)}%` : '??%'}
                    </div>
                <DialogFooter>
                     <DialogClose asChild>
                        <Button type="button" variant="secondary">İptal</Button>
                    </DialogClose>
                    <Button type="submit">Kaydet</Button>
                </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function ReadingBookCard({ book, onUpdateStatus, onRemove }: { book: any, onUpdateStatus: (bookId: string, status: 'reading' | 'finished', progress?: number) => void, onRemove: (bookId: string) => void }) {
    const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);

    return (
        <>
            <Card className="flex items-center gap-4 p-4 transition-all hover:shadow-md">
                <Image src={book.image} alt={book.title} width={80} height={120} className="rounded-md aspect-[2/3] object-cover shadow-md" data-ai-hint="book cover"/>
                <div className="flex-grow space-y-2">
                    <div>
                        <p className="font-semibold leading-tight" title={book.title}>{book.title}</p>
                        <p className="text-sm text-muted-foreground">{book.author}</p>
                        {book.startedAt && <p className="text-xs text-muted-foreground">Başlangıç: {format(parseISO(book.startedAt), 'dd.MM.yy')}</p>}
                    </div>
                    <Progress value={book.progress || 0} />
                    <div className="text-xs text-muted-foreground flex justify-between items-center">
                        <span>{book.pageCount ? `${Math.round(((book.progress || 0) / 100) * book.pageCount)}/${book.pageCount} sayfa` : `${book.progress || 0}%`}</span>
                        <span className="font-semibold text-primary">{book.progress || 0}%</span>
                    </div>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="shrink-0 self-start">
                            <MoreVertical className="h-4 w-4"/>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setIsProgressDialogOpen(true)}>İlerleme Gir</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onUpdateStatus(book.id, 'finished', 100)}>
                            <BookCheck className="mr-2 h-4 w-4"/> Bitirildi Olarak İşaretle
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => onRemove(book.id)}>
                            <Trash2 className="mr-2 h-4 w-4"/> Kütüphaneden Kaldır
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </Card>
            {isProgressDialogOpen && <ProgressDialog open={isProgressDialogOpen} onOpenChange={setIsProgressDialogOpen} book={book} onUpdateStatus={onUpdateStatus} />}
        </>
    )
}

function BookCard({ book, onUpdateStatus, onRemove }: { book: any, onUpdateStatus: (bookId: string, status: 'reading' | 'finished', progress?: number) => void, onRemove: (bookId: string) => void }) {
    return (
        <Card className="overflow-hidden flex flex-col group text-center transition-all hover:shadow-md hover:-translate-y-1">
            <Image src={book.image} alt={book.title} width={150} height={225} className="w-full object-cover aspect-[2/3]" data-ai-hint="book cover"/>
            <div className="p-2 flex flex-col flex-grow">
                <p className="font-semibold text-sm leading-tight flex-grow line-clamp-2" title={book.title}>{book.title}</p>
                <p className="text-xs text-muted-foreground truncate">{book.author}</p>
            </div>
            <CardFooter className="p-2 bg-muted/50 mt-auto">
                {book.status === 'to-read' && (
                    <Button className="w-full" size="sm" onClick={() => onUpdateStatus(book.id, 'reading', 0)}>
                        <BookUp className="mr-2 h-4 w-4" /> Başla
                    </Button>
                )}
                {book.status === 'finished' && (
                     <div className="w-full text-center text-xs text-muted-foreground space-y-1">
                        <p className="font-medium text-green-600 flex items-center justify-center gap-1"><CheckSquare size={14}/>Tamamlandı</p>
                        {book.finishedAt && <p>Bitiş: {format(parseISO(book.finishedAt), 'dd.MM.yy')}</p>}
                    </div>
                )}
            </CardFooter>
        </Card>
    )
}

    