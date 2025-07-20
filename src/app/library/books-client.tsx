
"use client";

import * as React from "react";
import Image from "next/image";
import { Book, Heart, PlusCircle, Search, Star } from "lucide-react";
import { Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Book as BookType, mediaItems as initialMediaItems, monthlyReadingStats } from "@/lib/data";
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { NewBookForm } from "@/components/new-book-form";
import { useToast } from "@/hooks/use-toast";

const genreData = [
  { name: 'Fantastik', value: 400, fill: "hsl(var(--chart-1))" },
  { name: 'Dram', value: 300, fill: "hsl(var(--chart-2))" },
  { name: 'Klasik', value: 280, fill: "hsl(var(--chart-4))" },
  { name: 'Felsefe', value: 200, fill: "hsl(var(--chart-3))" },
  { name: 'Bilim Kurgu', value: 180, fill: "hsl(var(--chart-5))" },
];

const readingChartConfig = {
  books: {
    label: "Kitap Sayısı",
    color: "hsl(var(--chart-2))",
  },
  pages: {
    label: "Sayfa Sayısı",
    color: "hsl(var(--chart-4))",
  },
} satisfies ChartConfig;


export default function BooksClient() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [mediaItems, setMediaItems] = React.useState<BookType[]>([]);
  const [isNewBookDialogOpen, setIsNewBookDialogOpen] = React.useState(false);

  React.useEffect(() => {
    try {
        const storedMedia = localStorage.getItem('mediaItems');
        if (storedMedia) {
            setMediaItems(JSON.parse(storedMedia));
        } else {
            setMediaItems(initialMediaItems);
            localStorage.setItem('mediaItems', JSON.stringify(initialMediaItems));
        }
    } catch (error) {
        console.error("Failed to load media from localStorage", error);
        setMediaItems(initialMediaItems);
    }
  }, []);

  const handleAddBook = (newBookData: Omit<BookType, 'id' | 'type' | 'rating'>) => {
    const newBook: BookType = {
      ...newBookData,
      id: Date.now(),
      type: "Kitap",
      rating: 0, // New books start with 0 rating
      image: newBookData.image || 'https://placehold.co/300x450.png',
    };

    setMediaItems(prevItems => {
        const updatedItems = [...prevItems, newBook];
        try {
            localStorage.setItem('mediaItems', JSON.stringify(updatedItems));
            toast({ title: "✅ Kitap Eklendi", description: `"${newBook.title}" kütüphaneye başarıyla eklendi.` });
        } catch (error) {
            toast({ title: "❌ Kaydetme Hatası", description: "Kitap kaydedilirken bir hata oluştu.", variant: 'destructive' });
        }
        return updatedItems;
    });
    setIsNewBookDialogOpen(false);
  }


  const filteredMedia = mediaItems.filter(item => {
    const searchFilter = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         item.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return searchFilter;
  });

  return (
    <>
      <PageHeader title="Aile Kütüphanesi 📚">
        <Dialog open={isNewBookDialogOpen} onOpenChange={setIsNewBookDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg hover:shadow-xl transition-shadow">
              <PlusCircle className="mr-2 h-4 w-4" />
              Yeni Kitap Ekle
            </Button>
          </DialogTrigger>
          <DialogContent>
             <DialogHeader>
                <DialogTitle>Yeni Kitap Ekle</DialogTitle>
                <DialogDescription>
                    Kütüphaneye yeni bir kitap ekleyin.
                </DialogDescription>
            </DialogHeader>
            <NewBookForm onSubmit={handleAddBook} />
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Aylık Okuma İstatistikleri</CardTitle>
            <CardDescription>Son 6 aydaki okuma performansı.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={readingChartConfig} className="h-[250px] w-full">
              <ComposedChart data={monthlyReadingStats}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis yAxisId="left" orientation="left" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                <YAxis yAxisId="right" orientation="right" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                <Tooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="books" yAxisId="left" fill="var(--color-books)" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="pages" yAxisId="right" stroke="var(--color-pages)" strokeWidth={2} dot={{ r: 4 }} />
              </ComposedChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Kitap Türleri Dağılımı</CardTitle>
            <CardDescription>Kütüphanedeki kitapların türlere göre dağılımı.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ChartContainer config={{}} className="h-[250px] w-full">
                 <PieChart>
                    <Tooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie 
                      data={genreData} 
                      dataKey="value" 
                      nameKey="name" 
                      cx="50%" 
                      cy="50%" 
                      outerRadius={100} 
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                        {genreData.map((entry) => (
                            <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                        ))}
                    </Pie>
                </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
      
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
            <h2 className="text-2xl font-semibold text-foreground">Kitap Listesi</h2>
             <div className="w-full sm:w-auto md:w-1/3 relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Kütüphanede ara..." 
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
        </div>
        
        <div className="mt-6">
             {filteredMedia.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
                    {filteredMedia.map(item => {
                        return (
                        <Dialog key={item.id}>
                            <DialogTrigger asChild>
                                <div className="cursor-pointer group">
                                    <Card className="overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 relative">
                                        <Image src={item.image} alt={item.title} width={300} height={450} className="w-full h-auto object-cover aspect-[2/3]" data-ai-hint="book cover" />
                                    </Card>
                                    <p className="mt-2 text-sm font-semibold truncate group-hover:text-primary">{item.title}</p>
                                    <p className="text-xs text-muted-foreground">{item.author}</p>
                                </div>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[625px]">
                                <div className="grid gap-8 grid-cols-1 sm:grid-cols-2">
                                    <div>
                                        <Image src={item.image} alt={item.title} width={300} height={450} className="w-full h-auto object-cover rounded-md aspect-[2/3]" data-ai-hint="book cover" />
                                    </div>
                                    <div className="flex flex-col">
                                        <DialogHeader>
                                            <Badge variant="secondary" className="w-fit mb-2">Kitap</Badge>
                                            <DialogTitle className="text-3xl font-bold">{item.title}</DialogTitle>
                                            <DialogDescription className="text-lg">{item.author}</DialogDescription>
                                        </DialogHeader>
                                        <div className="flex items-center gap-2 my-4">
                                            <div className="flex items-center">
                                                {[...Array(5)].map((_, i) => <Star key={i} className={`h-5 w-5 ${i < Math.floor(item.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />)}
                                            </div>
                                            <span className="text-sm text-muted-foreground">({item.rating.toFixed(1)})</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground flex-grow">{item.description}</p>
                                        <div className="text-sm text-muted-foreground mt-4 space-y-1">
                                            <p><strong>Tür:</strong> {item.tags.join(', ')}</p>
                                            {item.pages && <p><strong>Sayfa Sayısı:</strong> {item.pages}</p>}
                                        </div>
                                        <DialogFooter className="mt-6 sm:justify-start">
                                            <Button variant="outline" size="icon" className="group"><Heart className="group-hover:fill-red-500 group-hover:text-red-500 transition-colors"/></Button>
                                            <Button className="w-full sm:w-auto">Okundu Olarak İşaretle</Button>
                                        </DialogFooter>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )})}
                </div>
             ) : (
                <Card><CardContent className="p-8 text-center text-muted-foreground">Bu kategoride sonuç bulunamadı.</CardContent></Card>
             )}
        </div>
      </div>
    </>
  );
}
