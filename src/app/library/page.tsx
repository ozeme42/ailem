
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { mediaItems, familyMembers, Book } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Calendar, CheckSquare, Target, Library } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Label } from '@/components/ui/label';

export default function LibraryPage() {
  // This is a placeholder for the current user. In a real app, you'd get this from an auth context.
  const currentUser = familyMembers[0]; 
  
  // This is placeholder logic to assign some books to the current user.
  const myBooks = mediaItems.slice(0, 5).map((book, i) => ({
      ...book,
      // Fake some progress
      progress: (i * 25) % 101
  }));
  const readingBooks = myBooks.filter(b => b.progress < 100 && b.progress > 0);
  const toReadBooks = myBooks.filter(b => b.progress === 0);
  const finishedBooks = myBooks.filter(b => b.progress >= 100);

  const stats = {
      finished: finishedBooks.length,
      total: myBooks.length,
      reading: readingBooks.length,
      percentage: myBooks.length > 0 ? (finishedBooks.length / myBooks.length) * 100 : 0
  }

  return (
    <>
      <PageHeader title={`${currentUser.name}'in Kütüphanesi`}>
        <Link href="/library/archive">
            <Button variant="outline">
                <Library className="mr-2 h-4 w-4" />
                Kitaplığımız'a Göz At
            </Button>
        </Link>
      </PageHeader>
      
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {readingBooks.map(book => <BookCard key={book.id} book={book} />)}
              </div>
          </div>
      )}

      {toReadBooks.length > 0 && (
          <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Sıradakiler</h2>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {toReadBooks.map(book => <BookCard key={book.id} book={book} />)}
              </div>
          </div>
      )}

       {finishedBooks.length > 0 && (
          <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Bitirdiklerim</h2>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {finishedBooks.map(book => <BookCard key={book.id} book={book} />)}
              </div>
          </div>
      )}

    </>
  );
}

function BookCard({ book }: { book: Book & { progress: number } }) {
    return (
        <Card className="overflow-hidden flex flex-col group">
            <div className="relative">
                <Image src={book.image || `https://placehold.co/400x600.png`} alt={book.title} width={400} height={600} className="w-full h-auto object-cover aspect-[2/3] group-hover:scale-105 transition-transform" data-ai-hint="book cover"/>
            </div>
             <CardHeader>
                <CardTitle className="truncate">{book.title}</CardTitle>
                <CardDescription>{book.author}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
               {book.progress > 0 && (
                   <div>
                       <Progress value={book.progress} />
                       <p className="text-xs text-muted-foreground mt-1">{book.progress}% tamamlandı</p>
                   </div>
               )}
            </CardContent>
        </Card>
    )
}
