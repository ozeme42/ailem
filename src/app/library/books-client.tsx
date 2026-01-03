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
import { Book as BookType, monthlyReadingStats } from "@/lib/data";
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { NewBookForm } from "@/components/new-book-form";
import { useToast } from "@/hooks/use-toast";
import { addBook, onBooksUpdate } from "@/lib/dataService";


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
    const unsubscribe = onBooksUpdate(setMediaItems);
    return () => unsubscribe();
  }, []);

  const handleAddBook = async (newBookData: Omit<BookType, 'id' | 'type' | 'rating' | 'familyId'>) => {
    try {
        const newBook: Omit<BookType, 'id' | 'familyId'> = {
            ...newBookData,
            type: "Kitap",
            rating: 0, 
            image: newBookData.image || 'https://placehold.co/300x450.png',
        };
        await addBook(newBook);
        toast({ title: "✅ Kitap Eklendi", description: `"${newBook.title}" kütüphaneye başarıyla eklendi.` });
        setIsNewBookDialogOpen(false);
    } catch (error) {
        toast({ title: "❌ Kaydetme Hatası", description: "Kitap kaydedilirken bir hata oluştu.", variant: 'destructive' });
    }
  }


  const filteredMedia = mediaItems.filter(item => {
    const searchFilter = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (item.author && item.author.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));
    return searchFilter;
  });

  return (
    <div className="min-h-screen bg-slate-50/50 pb-10"> {/* Açık renk sayfa arka planı */}
      <div className="container mx-auto py-6 px-4 sm:px-6">
        
        <PageHeader title="Aile Kütüphanesi 📚">
          <Dialog open={isNewBookDialogOpen} onOpenChange={setIsNewBookDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-600 hover:bg-orange-700 text-white shadow-md transition-all">
                <PlusCircle className="mr-2 h-4 w-4" />
                Yeni Kitap Ekle
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white sm:max-w-[500px]">
               <DialogHeader>
                  <DialogTitle className="text-slate-900">Yeni Kitap Ekle</DialogTitle>
                  <DialogDescription className="text-slate-500">
                      Kütüphaneye yeni bir kitap ekleyin.
                  </DialogDescription>
              </DialogHeader>
              <NewBookForm onSubmit={handleAddBook} />
            </DialogContent>
          </Dialog>
        </PageHeader>

        <div className="grid gap-6 md:grid-cols-2 mb-8 mt-6">
          {/* İstatistik Kartı 1 */}
          <Card className="bg-white shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-800">Aylık Okuma İstatistikleri</CardTitle>
              <CardDescription className="text-slate-500">Son 6 aydaki okuma performansı.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={readingChartConfig} className="h-[250px] w-full">
                <ComposedChart data={monthlyReadingStats}>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" /> {/* Daha açık ızgara çizgileri */}
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: '#64748b' }} />
                  <YAxis yAxisId="left" orientation="left" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false}/>
                  <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false}/>
                  <Tooltip content={<ChartTooltipContent className="bg-white border-slate-200 text-slate-700" />} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="books" yAxisId="left" fill="var(--color-books)" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="pages" yAxisId="right" stroke="var(--color-pages)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-pages)" }} />
                </ComposedChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* İstatistik Kartı 2 */}
          <Card className="bg-white shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-800">Kitap Türleri Dağılımı</CardTitle>
              <CardDescription className="text-slate-500">Kütüphanedeki kitapların türlere göre dağılımı.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <ChartContainer config={{}} className="h-[250px] w-full">
                   <PieChart>
                      <Tooltip content={<ChartTooltipContent hideLabel className="bg-white border-slate-200 text-slate-700" />} />
                      <Pie 
                        data={genreData} 
                        dataKey="value" 
                        nameKey="name" 
                        cx="50%" 
                        cy="50%" 
                        outerRadius={100} 
                        innerRadius={60} // Halka görünümü için
                        paddingAngle={2}
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                          {genreData.map((entry) => (
                              <Cell key={`cell-${entry.name}`} fill={entry.fill} stroke="#fff" strokeWidth={2} />
                          ))}
                      </Pie>
                  </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Kitap Listesi</h2>
               <div className="w-full sm:w-auto md:w-1/3 relative">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Kütüphanede ara..." 
                    className="pl-10 bg-white border-slate-200 focus:border-orange-500 focus:ring-orange-500"
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
                                      <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 relative bg-white border-slate-200">
                                              <Image src={item.image} alt={item.title} width={300} height={450} className="w-full h-auto object-cover aspect-[2/3]" data-ai-hint="book cover" />
                                      </Card>
                                      <div className="mt-3">
                                        <p className="text-sm font-bold text-slate-800 truncate group-hover:text-orange-600 transition-colors">{item.title}</p>
                                        <p className="text-xs text-slate-500">{item.author}</p>
                                      </div>
                                  </div>
                              </DialogTrigger>
                              <DialogContent className="bg-white sm:max-w-[625px]">
                                  <div className="grid gap-8 grid-cols-1 sm:grid-cols-2">
                                      <div className="shadow-lg rounded-md overflow-hidden h-fit">
                                          <Image src={item.image} alt={item.title} width={300} height={450} className="w-full h-auto object-cover aspect-[2/3]" data-ai-hint="book cover" />
                                      </div>
                                      <div className="flex flex-col">
                                          <DialogHeader>
                                              <Badge variant="secondary" className="w-fit mb-2 bg-orange-100 text-orange-700 hover:bg-orange-200">Kitap</Badge>
                                              <DialogTitle className="text-3xl font-bold text-slate-900">{item.title}</DialogTitle>
                                              <DialogDescription className="text-lg text-slate-600 font-medium">{item.author}</DialogDescription>
                                          </DialogHeader>
                                          <div className="flex items-center gap-2 my-4">
                                              <div className="flex items-center">
                                                  {[...Array(5)].map((_, i) => <Star key={i} className={`h-5 w-5 ${i < Math.floor(item.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'}`} />)}
                                              </div>
                                              <span className="text-sm text-slate-500">({item.rating.toFixed(1)})</span>
                                          </div>
                                          <p className="text-sm text-slate-600 flex-grow leading-relaxed">{item.description}</p>
                                          <div className="text-sm text-slate-500 mt-4 space-y-1 p-3 bg-slate-50 rounded-lg">
                                              <p><strong className="text-slate-700">Tür:</strong> {item.tags.join(', ')}</p>
                                              {item.pageCount && <p><strong className="text-slate-700">Sayfa Sayısı:</strong> {item.pageCount}</p>}
                                          </div>
                                          <DialogFooter className="mt-6 sm:justify-start gap-2">
                                              <Button variant="outline" size="icon" className="group border-slate-200 hover:bg-red-50 hover:border-red-200"><Heart className="text-slate-400 group-hover:fill-red-500 group-hover:text-red-500 transition-colors"/></Button>
                                              <Button className="w-full sm:w-auto bg-slate-900 text-white hover:bg-slate-800">Okundu Olarak İşaretle</Button>
                                          </DialogFooter>
                                      </div>
                                  </div>
                              </DialogContent>
                          </Dialog>
                      )})}
                  </div>
               ) : (
                  <Card className="bg-white border-dashed border-slate-300 shadow-none">
                    <CardContent className="p-12 text-center text-slate-500">
                      <Book className="h-10 w-10 mx-auto mb-4 opacity-20" />
                      <p>Bu arama kriterine uygun kitap bulunamadı.</p>
                    </CardContent>
                  </Card>
               )}
          </div>
        </div>
      </div>
    </div>
  );
}