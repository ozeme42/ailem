
"use client";

import * as React from "react";
import Image from "next/image";
import { Book, Film, Gamepad2, Heart, Mic, PlusCircle, Search, Star } from "lucide-react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MediaItem, mediaItems, MediaType } from "@/lib/data";

const genreData = [
  { name: 'Fantastik', value: 400, fill: "hsl(var(--chart-1))" },
  { name: 'Dram', value: 300, fill: "hsl(var(--chart-2))" },
  { name: 'Felsefe', value: 200, fill: "hsl(var(--chart-3))" },
  { name: 'Distopya', value: 200, fill: "hsl(var(--chart-4))" },
  { name: 'Simülasyon', value: 100, fill: "hsl(var(--chart-5))" },
  { name: 'Bilim Kurgu', value: 150, fill: "hsl(var(--chart-1))" },
  { name: 'RPG', value: 120, fill: "hsl(var(--chart-2))" },
];

const mediaTypeIcons: { [key in MediaType]: React.ElementType } = {
    "Kitap": Book,
    "Film": Film,
    "Sesli Kitap": Mic,
    "Oyun": Gamepad2,
}

export default function LibraryPage() {
  const [activeTab, setActiveTab] = React.useState<MediaType | "all">("all");
  const [searchTerm, setSearchTerm] = React.useState("");

  const filteredMedia = (mediaItems as MediaItem[]).filter(item => {
    const tabFilter = activeTab === "all" || item.type === activeTab;
    const searchFilter = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         item.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.genre.toLowerCase().includes(searchTerm.toLowerCase());
    return tabFilter && searchFilter;
  });

  const mostCommonGenre = genreData.reduce((prev, current) => (prev.value > current.value) ? prev : current).name
  const highestRated = [...mediaItems].sort((a,b) => b.rating - a.rating)[0];
  const mostCommonType = mediaItems.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
  }, {} as Record<MediaType, number>);

  const topType = Object.entries(mostCommonType).sort((a,b) => b[1] - a[1])[0][0] as MediaType;

  return (
    <>
      <PageHeader title="Aile Kütüphanesi 📚">
        <Button className="bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg hover:shadow-xl transition-shadow">
          <PlusCircle className="mr-2 h-4 w-4" />
          Yeni Medya Ekle
        </Button>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Medya</CardTitle>
            <Book className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mediaItems.length} Öğe</div>
            <p className="text-xs text-muted-foreground">Kitaplar, filmler ve daha fazlası</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Sevilen Tür</CardTitle>
            <Heart className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mostCommonGenre}</div>
            <p className="text-xs text-muted-foreground">Tüm zamanlar</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Yüksek Puanlı</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">{highestRated.title}</div>
            <p className="text-xs text-muted-foreground">{highestRated.rating.toFixed(1)} Ortalama Puan</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">En Çok Tüketilen</CardTitle>
                <Book className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{topType}</div>
                <p className="text-xs text-muted-foreground">Medya türü</p>
            </CardContent>
        </Card>
      </div>

       <Card className="mb-8">
          <CardHeader>
            <CardTitle>Türlere Göre Dağılım</CardTitle>
            <CardDescription>Kütüphanedeki medyaların türlere göre dağılımı.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
                 <PieChart>
                    <Pie data={genreData} cx="50%" cy="50%" labelLine={false} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {genreData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)"}} />
                    <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }}/>
                </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      <div>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-foreground">Medya Kütüphanesi</h2>
             <div className="w-full md:w-1/3 relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Kütüphanede ara..." 
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
        </div>
        
        <Tabs defaultValue="all" onValueChange={(value) => setActiveTab(value as MediaType | "all")}>
            <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full sm:w-auto">
                <TabsTrigger value="all">Hepsi</TabsTrigger>
                <TabsTrigger value="Kitap"><Book className="mr-2 h-4 w-4"/>Kitaplar</TabsTrigger>
                <TabsTrigger value="Film"><Film className="mr-2 h-4 w-4"/>Filmler</TabsTrigger>
                <TabsTrigger value="Sesli Kitap"><Mic className="mr-2 h-4 w-4"/>Sesli Kitaplar</TabsTrigger>
                <TabsTrigger value="Oyun"><Gamepad2 className="mr-2 h-4 w-4"/>Oyunlar</TabsTrigger>
            </TabsList>
            <TabsContent value={activeTab} className="mt-6">
                 {filteredMedia.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                        {filteredMedia.map(item => {
                            const Icon = mediaTypeIcons[item.type];
                            return (
                            <Dialog key={item.id}>
                                <DialogTrigger asChild>
                                    <div className="cursor-pointer group">
                                        <Card className="overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 relative">
                                            <Image src={item.coverImage} alt={item.title} width={300} height={450} className="w-full h-auto object-cover aspect-[2/3]" data-ai-hint="book cover" />
                                            <div className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full backdrop-blur-sm">
                                                <Icon className="h-4 w-4" />
                                            </div>
                                        </Card>
                                        <p className="mt-2 text-sm font-semibold truncate group-hover:text-primary">{item.title}</p>
                                        <p className="text-xs text-muted-foreground">{item.author}</p>
                                    </div>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[625px]">
                                    <div className="grid gap-8 sm:grid-cols-2">
                                        <div>
                                            <Image src={item.coverImage} alt={item.title} width={300} height={450} className="w-full h-auto object-cover rounded-md aspect-[2/3]" data-ai-hint="book cover" />
                                        </div>
                                        <div className="flex flex-col">
                                            <DialogHeader>
                                                <Badge variant="secondary" className="w-fit mb-2">{item.type}</Badge>
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
                                                <p><strong>Tür:</strong> {item.genre}</p>
                                                {item.pages && <p><strong>Sayfa Sayısı:</strong> {item.pages}</p>}
                                                {item.duration && <p><strong>Süre:</strong> {item.duration}</p>}
                                                {item.platform && <p><strong>Platform:</strong> {item.platform}</p>}
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
            </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
