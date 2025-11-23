
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Trash2, BookMarked, Library, FileText, HelpCircle, CheckCircle, XCircle, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { onTrackedBooksUpdate, addTrackedBook, deleteTrackedBook, updateTrackedBook } from "@/lib/dataService";
import type { TrackedBook } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const cardColors = [
    'from-blue-500 to-indigo-600',
    'from-green-500 to-teal-600',
    'from-pink-500 to-purple-600',
    'from-orange-400 to-rose-400',
    'from-yellow-400 to-amber-500',
    'from-lime-500 to-green-600',
];

export function BooksClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [books, setBooks] = useState<TrackedBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<TrackedBook | null>(null);
  const [newBook, setNewBook] = useState({ title: "", publisher: "", bookType: "standard" as "standard" | "open_ended" });

  useEffect(() => {
    const unsubscribe = onTrackedBooksUpdate((books) => {
        setBooks(books);
        setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    if (editingBook) {
        setNewBook({ title: editingBook.title, publisher: editingBook.publisher, bookType: editingBook.bookType || 'standard' });
    } else {
        setNewBook({ title: "", publisher: "", bookType: "standard" });
    }
  }, [editingBook])

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
    <div className="space-y-6 pb-24">
        <PageHeader title="Kitap Takibi">
            <Dialog open={isDialogOpen} onOpenChange={(open) => { if(!open) setEditingBook(null); setIsDialogOpen(open)}}>
            <DialogTrigger asChild>
                <Button onClick={() => openDialog(null)}>
                <Plus className="h-4 w-4 mr-2" />
                Yeni Kitap Ekle
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                <DialogTitle>{editingBook ? "Kitabı Düzenle" : "Yeni Kitap Ekle"}</DialogTitle>
                <DialogDescription>{editingBook ? "Kitap bilgilerini güncelleyin." : "Takip edilecek yeni bir kitap oluşturun."}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="title">Kitap Adı</Label>
                    <Input
                    id="title"
                    value={newBook.title}
                    onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                    placeholder="Örn: TYT Matematik Soru Bankası"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="publisher">Yayınevi</Label>
                    <Input
                    id="publisher"
                    value={newBook.publisher}
                    onChange={(e) => setNewBook({ ...newBook, publisher: e.target.value })}
                    placeholder="Örn: Merkez Yayınları"
                    />
                </div>
                 <div className="space-y-3">
                    <Label>Kitap Türü</Label>
                    <RadioGroup
                        value={newBook.bookType}
                        onValueChange={(value: "standard" | "open_ended") => setNewBook({ ...newBook, bookType: value })}
                        className="flex gap-4"
                    >
                        <div className="flex items-center space-x-2">
                        <RadioGroupItem value="standard" id="standard" />
                        <Label htmlFor="standard">Standart Soru Bankası</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                        <RadioGroupItem value="open_ended" id="open_ended" />
                        <Label htmlFor="open_ended">Açık Uçlu Kitap</Label>
                        </div>
                    </RadioGroup>
                </div>
                </div>
                <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>İptal</Button>
                <Button onClick={handleAddOrUpdateBook}>{editingBook ? "Güncelle" : "Ekle"}</Button>
                </DialogFooter>
            </DialogContent>
            </Dialog>
      </PageHeader>
      

      {isLoading ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Yükleniyor...
          </CardContent>
        </Card>
      ) : books.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
             <BookMarked className="mx-auto h-12 w-12 text-muted-foreground" />
             <h3 className="mt-4 text-lg font-medium">Henüz kitap eklenmemiş</h3>
             <p className="mt-2 text-sm text-muted-foreground">Yukarıdaki butona tıklayarak ilk kitabınızı ekleyin.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book, index) => (
            <Card key={book.id} className={cn("flex flex-col text-white border-0 bg-gradient-to-br", cardColors[index % cardColors.length])}>
              <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg">{book.title}</CardTitle>
                        <CardDescription className="text-white/80">{book.publisher}</CardDescription>
                    </div>
                     <div className="flex items-center -mt-2 -mr-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20" onClick={() => openDialog(book)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Kitabı silmek istediğinizden emin misiniz?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Bu işlem "{book.title}" adlı kitabı ve içindeki tüm verileri (dersler, konular, testler) kalıcı olarak silecektir. Bu işlem geri alınamaz.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>İptal</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteBook(book.id)}>
                                        Evet, Sil
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                     </div>
                </div>
                 <Badge variant={book.bookType === 'open_ended' ? 'outline' : 'secondary'} className="w-fit mt-2 bg-white/20 text-white border-none">{book.bookType === 'open_ended' ? 'Açık Uçlu' : 'Standart Soru Bankası'}</Badge>
              </CardHeader>
              <CardContent className="flex-grow space-y-4">
                 <div className="space-y-3 text-sm text-white/80">
                    <h4 className="font-semibold text-white">Kitap İçeriği</h4>
                    <div className="flex items-center gap-2"><Library className="h-4 w-4" /><span>{book.subjectCount || 0} Ders</span></div>
                    <div className="flex items-center gap-2"><FileText className="h-4 w-4" /><span>{book.testCount || 0} Test</span></div>
                    <div className="flex items-center gap-2"><HelpCircle className="h-4 w-4" /><span>{book.questionCount || 0} Soru</span></div>
                </div>
                {(book.solvedTestCount || 0) > 0 && (
                    <div className="space-y-3 text-sm text-white/80 pt-4 border-t border-white/20">
                        <h4 className="font-semibold text-white">Çözüm İstatistikleri</h4>
                        <div className="flex items-center gap-2"><FileText className="h-4 w-4" /><span>{book.solvedTestCount || 0} Test Çözüldü</span></div>
                        <div className="flex items-center gap-2 text-green-300"><CheckCircle className="h-4 w-4" /><span>{book.totalCorrectAnswers || 0} Doğru</span></div>
                        <div className="flex items-center gap-2 text-red-300"><XCircle className="h-4 w-4" /><span>{book.totalIncorrectAnswers || 0} Yanlış</span></div>
                    </div>
                )}
              </CardContent>
              <CardFooter className="p-4">
                <Button className="w-full bg-white/90 text-primary hover:bg-white" onClick={() => handleManageBook(book.id)}>Kitabı Yönet</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
