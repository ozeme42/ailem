
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { Book as BookType, UserLibrary, FamilyMember, ReadingGoals } from '@/lib/data';
import { onBooksUpdate, onUserLibrariesUpdate, updateUserBookStatus, removeBookFromMemberLibrary } from '@/lib/dataService';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, CheckSquare, Target, Library, BookUp, BookCheck, Trash2, ChevronDown, PlusCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { SetReadingGoalForm } from '@/components/reading-goal-form';

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
  
  const handleUpdateStatus = async (bookId: string, newStatus: 'reading' | 'finished') => {
      if (!familyId || !selectedMember) return;
      try {
        await updateUserBookStatus(familyId, selectedMember.id, bookId, newStatus);
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

    const myBookDetails: (BookType & { progress?: number })[] = [];
    memberLibrary.books.forEach(libBook => {
      const bookDetail = allBooks.find(b => b.id === libBook.bookId);
      if (bookDetail) {
        myBookDetails.push({ ...bookDetail, progress: libBook.status === 'reading' ? (libBook.progress || 50) : (libBook.status === 'finished' ? 100 : 0) });
      }
    });

    const reading = myBookDetails.filter(b => b.progress > 0 && b.progress < 100);
    const toRead = myBookDetails.filter(b => b.progress === 0);
    const finished = myBookDetails.filter(b => b.progress >= 100);
    
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

  // This is a mock calculation. In a real app, this data would come from a more detailed tracking system.
  const currentProgress = {
      daily: { pages: 25, books: 0 },
      weekly: { pages: 150, books: 0 },
      monthly: { books: finishedBooks.length, bookGoal: monthly?.books || 4 },
      yearly: { books: finishedBooks.length, bookGoal: yearly?.books || 20 },
  }


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
                      <CardTitle className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-base"><BookOpen className="text-blue-500 size-4 sm:size-5"/> Kalan</CardTitle>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {readingBooks.map(book => <BookCard key={book.id} book={book} onUpdateStatus={handleUpdateStatus} onRemove={handleRemoveFromLibrary}/>)}
                </div>
            </div>
        )}

        {toReadBooks.length > 0 && (
            <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Sıradakiler</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {toReadBooks.map(book => <BookCard key={book.id} book={book} onUpdateStatus={handleUpdateStatus} onRemove={handleRemoveFromLibrary}/>)}
                </div>
            </div>
        )}

        {finishedBooks.length > 0 && (
            <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Bitirdiklerim</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

function BookCard({ book, onUpdateStatus, onRemove }: { book: BookType & { progress?: number }, onUpdateStatus: (bookId: string, status: 'reading' | 'finished') => void, onRemove: (bookId: string) => void }) {
    return (
        <Card className="overflow-hidden flex flex-col group">
            <div className="relative">
                <Image src={book.image || `https://placehold.co/400x600.png`} alt={book.title} width={400} height={600} className="w-full h-auto object-cover aspect-[2/3] group-hover:scale-105 transition-transform" data-ai-hint="book cover"/>
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="secondary">
                                Durumu Değiştir <ChevronDown className="ml-2 h-4 w-4"/>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            {(book.progress || 0) < 100 && (
                                <DropdownMenuItem onClick={() => onUpdateStatus(book.id, 'reading')}>
                                    <BookUp className="mr-2 h-4 w-4"/> Okumaya Başla / Devam Et
                                </DropdownMenuItem>
                            )}
                             {(book.progress || 0) < 100 && (
                                <DropdownMenuItem onClick={() => onUpdateStatus(book.id, 'finished')}>
                                    <BookCheck className="mr-2 h-4 w-4"/> Bitirildi Olarak İşaretle
                                </DropdownMenuItem>
                            )}
                             <DropdownMenuItem className="text-destructive" onClick={() => onRemove(book.id)}>
                                <Trash2 className="mr-2 h-4 w-4"/> Kütüphaneden Kaldır
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
             <CardHeader className="p-3">
                <CardTitle className="truncate">{book.title}</CardTitle>
                <CardDescription className="text-xs truncate">{book.author}</CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-0 flex-grow">
               {(book.progress || 0) > 0 && book.progress < 100 && (
                   <div>
                       <Progress value={book.progress} />
                       <p className="text-xs text-muted-foreground mt-1">{book.progress}% tamamlandı</p>
                   </div>
               )}
                {(book.progress || 0) >= 100 && (
                     <div className="text-sm font-medium text-green-600 flex items-center gap-2">
                        <CheckSquare className="h-4 w-4" />
                        <span>Tamamlandı</span>
                    </div>
                )}
                 {(book.progress || 0) === 0 && (
                     <div className="text-sm font-medium text-blue-600 flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        <span>Okunacak</span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
