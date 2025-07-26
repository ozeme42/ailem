
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { Book as BookType, UserLibrary, FamilyMember } from '@/lib/data';
import { onBooksUpdate, onUserLibrariesUpdate, updateUserBookStatus, removeBookFromMemberLibrary } from '@/lib/dataService';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, CheckSquare, Target, Library, BookUp, BookCheck, Trash2, ChevronDown } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function LibraryPage() {
  const { familyId, familyMembers } = useAuth();
  const [allBooks, setAllBooks] = useState<BookType[]>([]);
  const [userLibraries, setUserLibraries] = useState<UserLibrary[]>([]);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
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


  return (
    <div className="space-y-6">
       <Card className="bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg rounded-xl mb-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-3">
                    <Library/>
                    Kişisel Kütüphanesi
                </CardTitle>
                <CardDescription>
                    <Link href="/library/archive" className="text-white/80 hover:text-white underline">
                        Tüm ailenin kitaplığına göz atmak için buraya tıklayın.
                    </Link>
                </CardDescription>
            </CardHeader>
       </Card>
      
      <div className="flex items-center gap-4 border-b pb-4">
         {familyMembers.map((member) => (
          <Button
            key={member.id}
            variant={selectedMember?.id === member.id ? "default" : "outline"}
            className={`h-auto p-2 flex items-center gap-2 rounded-full transition-all duration-200 ${selectedMember?.id === member.id ? 'scale-105 shadow-lg' : 'hover:bg-accent'}`}
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
            <div className="grid md:grid-cols-3 gap-6 text-center">
                 <Card className="p-4">
                    <CardTitle className="flex items-center justify-center gap-2"><CheckSquare className="text-green-500"/> Okunan Kitap</CardTitle>
                    <p className="text-3xl font-bold mt-2">{stats.finished}</p>
                 </Card>
                 <Card className="p-4">
                    <CardTitle className="flex items-center justify-center gap-2"><BookOpen className="text-blue-500"/> Okunacak Kitap</CardTitle>
                    <p className="text-3xl font-bold mt-2">{stats.reading + toReadBooks.length}</p>
                 </Card>
                 <Card className="p-4">
                    <CardTitle className="flex items-center justify-center gap-2"><Target className="text-purple-500"/> Toplam Kitap</CardTitle>
                    <p className="text-3xl font-bold mt-2">{stats.total}</p>
                 </Card>
            </div>
            <div>
              <Label>Genel Tamamlama Oranı</Label>
              <Progress value={stats.percentage} className="mt-2" />
              <p className="text-sm text-muted-foreground mt-1 text-right">{stats.percentage.toFixed(0)}% Tamamlandı</p>
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
