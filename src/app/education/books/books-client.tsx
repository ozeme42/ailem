
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Trash2, BookMarked, Library, FileText, HelpCircle, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { onTrackedBooksUpdate, addTrackedBook, deleteTrackedBook } from "@/lib/dataService";
import type { TrackedBook } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function BooksClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [books, setBooks] = useState<TrackedBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newBook, setNewBook] = useState({ title: "", publisher: "", bookType: "standard" as "standard" | "open_ended" });

  useEffect(() => {
    const unsubscribe = onTrackedBooksUpdate((books) => {
        setBooks(books);
        setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddBook = async () => {
    if (!newBook.title.trim() || !newBook.publisher.trim()) {
      toast({
        title: "Hata",
        description: "Lütfen tüm alanları doldurun!",
        variant: "destructive"
      });
      return;
    }

    try {
      await addTrackedBook(newBook);
      setNewBook({ title: "", publisher: "", bookType: "standard" });
      setIsDialogOpen(false);
      toast({ title: "Kitap başarıyla eklendi!" });
    } catch (error: any) {
      console.error('Error adding book:', error);
      toast({
        title: "Hata",
        description: error.message || 'Kitap eklenemedi!',
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
  
  return (
    <div className="space-y-6">
        <PageHeader title="Kitap Takibi">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button>
                <Plus className="h-4 w-4 mr-2" />
                Yeni Kitap Ekle
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                <DialogTitle>Yeni Kitap Ekle</DialogTitle>
                <DialogDescription>Takip edilecek yeni bir kitap oluşturun.</DialogDescription>
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
                <Button onClick={handleAddBook}>Ekle</Button>
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
          {books.map((book) => (
            <Card key={book.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg">{book.title}</CardTitle>
                        <CardDescription>{book.publisher}</CardDescription>
                    </div>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive -mt-2 -mr-2">
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
                 <Badge variant={book.bookType === 'open_ended' ? 'outline' : 'secondary'} className="w-fit mt-2">{book.bookType === 'open_ended' ? 'Açık Uçlu' : 'Standart Soru Bankası'}</Badge>
              </CardHeader>
              <CardContent className="flex-grow space-y-4">
                 <div className="space-y-3 text-sm text-muted-foreground">
                    <h4 className="font-semibold text-foreground">Kitap İçeriği</h4>
                    <div className="flex items-center gap-2"><Library className="h-4 w-4" /><span>{book.subjectCount || 0} Ders</span></div>
                    <div className="flex items-center gap-2"><FileText className="h-4 w-4" /><span>{book.testCount || 0} Test</span></div>
                    <div className="flex items-center gap-2"><HelpCircle className="h-4 w-4" /><span>{book.questionCount || 0} Soru</span></div>
                </div>
                {(book.solvedTestCount || 0) > 0 && (
                    <div className="space-y-3 text-sm text-muted-foreground pt-4 border-t">
                        <h4 className="font-semibold text-foreground">Çözüm İstatistikleri</h4>
                        <div className="flex items-center gap-2"><FileText className="h-4 w-4" /><span>{book.solvedTestCount || 0} Test Çözüldü</span></div>
                        <div className="flex items-center gap-2 text-green-600"><CheckCircle className="h-4 w-4" /><span>{book.totalCorrectAnswers || 0} Doğru</span></div>
                        <div className="flex items-center gap-2 text-red-600"><XCircle className="h-4 w-4" /><span>{book.totalIncorrectAnswers || 0} Yanlış</span></div>
                    </div>
                )}
              </CardContent>
              <CardHeader>
                <Button className="w-full" onClick={() => handleManageBook(book.id)}>Kitabı Yönet</Button>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
