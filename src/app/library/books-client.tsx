"use client";

import * as React from "react";
import Image from "next/image";
import { Book, Heart, Plus, Search, Star, ChevronLeft, BarChart2, PieChart as PieChartIcon } from "lucide-react";
import { Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, Tooltip, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Book as BookType, monthlyReadingStats } from "@/lib/data";
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { NewBookForm } from "@/components/new-book-form";
import { useToast } from "@/hooks/use-toast";
import { addBook, onBooksUpdate } from "@/lib/dataService";
import { cn } from "@/lib/utils";

// --- TEMA VE RENKLER (iOS / Mobil Odaklı) ---
const themeClasses = {
  PAGE_BG: "bg-[#F2F2F7] dark:bg-black transition-colors duration-300",
  HEADER_BG: "bg-white/85 dark:bg-[#1C1C1E]/85 backdrop-blur-xl border-b border-black/[0.05] dark:border-white/[0.05]",
  CARD_BG: "bg-white dark:bg-[#1C1C1E] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-none border-transparent",
  TEXT_MAIN: "text-[#1C1C1E] dark:text-white",
  TEXT_MUTED: "text-[#8E8E93] dark:text-[#EBEBF5]/60",
  ACCENT: "text-[#FF9500]", // iOS Orange
  ACCENT_BG: "bg-[#FF9500]",
};

const genreData = [
  { name: 'Fantastik', value: 400, fill: "#FF9500" }, // Orange
  { name: 'Dram', value: 300, fill: "#5856D6" },      // Indigo
  { name: 'Klasik', value: 280, fill: "#34C759" },    // Green
  { name: 'Felsefe', value: 200, fill: "#007AFF" },   // Blue
  { name: 'Bilim Kurgu', value: 180, fill: "#FF2D55" },// Pink
];

const readingChartConfig = {
  books: { label: "Kitap Sayısı", color: "#FF9500" },
  pages: { label: "Sayfa Sayısı", color: "#007AFF" },
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
        toast({ title: "Kitap Eklendi", description: `"${newBook.title}" başarıyla eklendi.` });
        setIsNewBookDialogOpen(false);
    } catch (error) {
        toast({ title: "Kayıt Hatası", description: "Kitap eklenirken bir sorun oluştu.", variant: 'destructive' });
    }
  }

  const filteredMedia = mediaItems.filter(item => {
    const searchFilter = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (item.author && item.author.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));
    return searchFilter;
  });

  return (
    <div className={cn("min-h-[100dvh] pb-[calc(80px+env(safe-area-inset-bottom))] relative font-sans", themeClasses.PAGE_BG)}>
      
      {/* MOBİL APP BAR */}
      <header className={cn("sticky top-0 z-40 w-full pt-[env(safe-area-inset-top)]", themeClasses.HEADER_BG)}>
        <div className="flex items-center justify-between px-2 h-12 md:h-14 max-w-3xl mx-auto relative">
            <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="text-[#FF9500] hover:bg-transparent active:opacity-50">
                <ChevronLeft className="w-7 h-7" />
            </Button>
            
            <h1 className={cn("text-[17px] font-semibold tracking-tight absolute left-1/2 -translate-x-1/2", themeClasses.TEXT_MAIN)}>
                Kütüphane
            </h1>

            {/* Dengeleyici */}
            <div className="w-10" />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-4 space-y-6">
        
        {/* ARAMA ÇUBUĞU */}
        <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#8E8E93]" />
            <Input 
                placeholder="Kitap, yazar veya tür ara..." 
                className="pl-11 h-12 rounded-[14px] bg-[#E3E3E8]/60 dark:bg-[#1C1C1E] border-transparent focus:bg-white dark:focus:bg-[#2C2C2E] focus:ring-2 focus:ring-[#FF9500]/20 text-[16px] shadow-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

        {/* WIDGET GRAFİKLER */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* İstatistik Kartı 1 */}
          <div className={cn("rounded-[24px] p-5", themeClasses.CARD_BG)}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#FF9500]/10 flex items-center justify-center">
                 <BarChart2 className="w-4 h-4 text-[#FF9500]" />
              </div>
              <div>
                <h3 className={cn("text-[15px] font-semibold", themeClasses.TEXT_MAIN)}>Aylık Okuma</h3>
                <p className="text-[12px] text-[#8E8E93]">Son 6 ay performansı</p>
              </div>
            </div>
            
            <ChartContainer config={readingChartConfig} className="h-[200px] w-full">
              <ComposedChart data={monthlyReadingStats} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgba(142,142,147,0.15)" /> 
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: '#8E8E93', fontSize: 11 }} />
                <YAxis yAxisId="left" orientation="left" tick={{ fill: '#8E8E93', fontSize: 11 }} tickLine={false} axisLine={false}/>
                <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} hide/>
                <Tooltip content={<ChartTooltipContent className="bg-white dark:bg-[#2C2C2E] border-0 shadow-xl rounded-xl" />} cursor={{fill: 'rgba(142,142,147,0.1)'}} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="books" yAxisId="left" fill="var(--color-books)" radius={[4, 4, 0, 0]} maxBarSize={30} />
                <Line type="monotone" dataKey="pages" yAxisId="right" stroke="var(--color-pages)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "white", stroke: "var(--color-pages)" }} />
              </ComposedChart>
            </ChartContainer>
          </div>

          {/* İstatistik Kartı 2 */}
          <div className={cn("rounded-[24px] p-5", themeClasses.CARD_BG)}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#007AFF]/10 flex items-center justify-center">
                 <PieChartIcon className="w-4 h-4 text-[#007AFF]" />
              </div>
              <div>
                <h3 className={cn("text-[15px] font-semibold", themeClasses.TEXT_MAIN)}>Tür Dağılımı</h3>
                <p className="text-[12px] text-[#8E8E93]">Kütüphane istatistiği</p>
              </div>
            </div>

            <ChartContainer config={{}} className="h-[200px] w-full flex items-center justify-center">
                <PieChart>
                  <Tooltip content={<ChartTooltipContent hideLabel className="bg-white dark:bg-[#2C2C2E] border-0 shadow-xl rounded-xl" />} />
                  <Pie 
                    data={genreData} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" 
                    cy="50%" 
                    outerRadius={75} 
                    innerRadius={50}
                    paddingAngle={4}
                    labelLine={false}
                    stroke="none"
                  >
                      {genreData.map((entry) => (
                          <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                      ))}
                  </Pie>
              </PieChart>
            </ChartContainer>
          </div>
        </div>
        
        {/* KİTAP LİSTESİ */}
        <div>
          <h2 className={cn("text-[18px] font-bold mb-4 px-1", themeClasses.TEXT_MAIN)}>Kitaplarım ({filteredMedia.length})</h2>
          
          {filteredMedia.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 sm:gap-4">
                {filteredMedia.map(item => (
                    <Dialog key={item.id}>
                        <DialogTrigger asChild>
                            <div className="cursor-pointer group flex flex-col active:scale-95 transition-transform duration-200">
                                <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.08)] mb-2">
                                    <Image src={item.image} alt={item.title} fill className="object-cover" sizes="(max-width: 768px) 33vw, 20vw" />
                                    {/* Zarif iç gölge */}
                                    <div className="absolute inset-0 ring-1 ring-inset ring-black/10 dark:ring-white/10 rounded-xl pointer-events-none" />
                                </div>
                                <p className={cn("text-[13px] font-semibold leading-tight line-clamp-2", themeClasses.TEXT_MAIN)}>{item.title}</p>
                                <p className="text-[11px] text-[#8E8E93] truncate mt-0.5">{item.author}</p>
                            </div>
                        </DialogTrigger>
                        
                        {/* APP STORE TARZI DETAY MODALI */}
                        <DialogContent className="p-0 border-0 bg-white dark:bg-[#1C1C1E] sm:max-w-md overflow-hidden rounded-[32px] shadow-2xl">
                            {/* Kitap Kapağı & Bulanık Arka Plan */}
                            <div className="relative w-full h-[260px] bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-end pb-6">
                                <div className="absolute inset-0 overflow-hidden bg-black">
                                    <Image src={item.image} alt="" fill className="object-cover blur-2xl opacity-50 scale-110" />
                                </div>
                                <div className="relative z-10 w-32 h-48 rounded-md shadow-2xl overflow-hidden border border-white/20">
                                    <Image src={item.image} alt={item.title} fill className="object-cover" />
                                </div>
                            </div>
                            
                            <div className="p-6 pt-5 flex flex-col gap-4">
                                <div className="text-center">
                                    <DialogTitle className={cn("text-2xl font-bold tracking-tight mb-1", themeClasses.TEXT_MAIN)}>
                                        {item.title}
                                    </DialogTitle>
                                    <DialogDescription className="text-lg font-medium text-[#FF9500]">
                                        {item.author}
                                    </DialogDescription>
                                </div>

                                {/* Bilgi Rozetleri */}
                                <div className="flex justify-center gap-8 py-4 border-y border-black/5 dark:border-white/5">
                                    <div className="text-center">
                                        <p className="text-[10px] text-[#8E8E93] uppercase font-bold tracking-wider mb-1">Puan</p>
                                        <div className="flex items-center gap-1 font-bold text-[15px] text-[#1C1C1E] dark:text-white">
                                            {item.rating.toFixed(1)} <Star className="w-4 h-4 fill-[#FF9500] text-[#FF9500] mb-0.5"/>
                                        </div>
                                    </div>
                                    <div className="w-px bg-black/5 dark:bg-white/5" />
                                    <div className="text-center">
                                        <p className="text-[10px] text-[#8E8E93] uppercase font-bold tracking-wider mb-1">Sayfa</p>
                                        <div className="font-bold text-[15px] text-[#1C1C1E] dark:text-white">
                                            {item.pageCount || '-'}
                                        </div>
                                    </div>
                                    <div className="w-px bg-black/5 dark:bg-white/5" />
                                    <div className="text-center">
                                        <p className="text-[10px] text-[#8E8E93] uppercase font-bold tracking-wider mb-1">Tür</p>
                                        <div className="font-bold text-[15px] text-[#1C1C1E] dark:text-white truncate max-w-[80px]">
                                            {item.tags[0] || '-'}
                                        </div>
                                    </div>
                                </div>

                                {/* Açıklama */}
                                <p className="text-[14px] text-[#3A3A3C] dark:text-[#EBEBF5]/80 leading-relaxed max-h-[140px] overflow-y-auto pr-2 custom-scrollbar">
                                    {item.description}
                                </p>

                                {/* Aksiyon Butonları */}
                                <DialogFooter className="mt-2 sm:justify-center flex-row gap-2">
                                    <Button variant="outline" size="icon" className="h-12 w-12 rounded-[14px] shrink-0 border-slate-200 dark:border-white/10 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10">
                                        <Heart className="w-6 h-6" />
                                    </Button>
                                    <Button className="flex-1 h-12 rounded-[14px] bg-[#1C1C1E] dark:bg-white text-white dark:text-black font-semibold text-[16px]">
                                        Okundu İşaretle
                                    </Button>
                                </DialogFooter>
                            </div>
                        </DialogContent>
                    </Dialog>
                ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <Book className="h-10 w-10 text-[#8E8E93] opacity-50" />
                </div>
                <p className={cn("text-[17px] font-semibold mb-1", themeClasses.TEXT_MAIN)}>Kitap Bulunamadı</p>
                <p className="text-[15px] text-[#8E8E93]">Farklı bir arama yapmayı deneyin.</p>
            </div>
          )}
        </div>
      </div>

      {/* YÜZEN EYLEM BUTONU (FAB) - YENİ KİTAP EKLE */}
      <Dialog open={isNewBookDialogOpen} onOpenChange={setIsNewBookDialogOpen}>
        <DialogTrigger asChild>
          <Button className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-6 z-50 h-14 w-14 rounded-full bg-[#FF9500] hover:bg-[#FF9500]/90 text-white shadow-[0_4px_14px_0_rgba(255,149,0,0.4)] transition-transform active:scale-95 p-0 flex items-center justify-center">
            <Plus className="h-7 w-7" />
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-white dark:bg-[#1C1C1E] sm:max-w-md rounded-[24px] border-0 shadow-2xl p-0 overflow-hidden text-[#1C1C1E] dark:text-white">
            <div className="p-6">
                <DialogHeader className="mb-4 text-left">
                    <DialogTitle className="text-xl font-bold">Yeni Kitap Ekle</DialogTitle>
                    <DialogDescription className="text-sm text-[#8E8E93]">
                        Kütüphanenize yeni bir eser kazandırın.
                    </DialogDescription>
                </DialogHeader>
                <NewBookForm onSubmit={handleAddBook} />
            </div>
        </DialogContent>
      </Dialog>
      
      {/* Scrollbar stilini özelleştirmek için */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #C6C6C8; border-radius: 4px; }
        @media (prefers-color-scheme: dark) { .custom-scrollbar::-webkit-scrollbar-thumb { background: #48484A; } }
      `}} />
    </div>
  );
}