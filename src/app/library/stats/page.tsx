
"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Book, User, Library, Star } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Book as BookType, monthlyReadingStats, UserLibrary } from "@/lib/data";
import { onBooksUpdate, onUserLibrariesUpdate } from "@/lib/dataService";
import { useAuth } from '@/components/auth-provider';
import { Button } from "@/components/ui/button";

const readingChartConfig = {
  books: { label: "Kitap Sayısı", color: "hsl(var(--chart-2))" },
  pages: { label: "Sayfa Sayısı", color: "hsl(var(--chart-4))" },
} satisfies ChartConfig;

export default function LibraryStatsPage() {
    const { familyId, familyMembers } = useAuth();
    const [books, setBooks] = React.useState<BookType[]>([]);
    const [userLibraries, setUserLibraries] = React.useState<UserLibrary[]>([]);

    const memberReadingConfig = React.useMemo(() => {
        const config: ChartConfig = { booksRead: { label: "Okunan Kitap" } };
        familyMembers.forEach(member => {
            const color = member.color || `hsl(${(Math.random() * 360).toFixed(0)}, 70%, 50%)`;
            config[member.name] = { label: member.name, color: color };
        });
        return config;
    }, [familyMembers]);


    React.useEffect(() => {
        const unsubscribeBooks = onBooksUpdate(setBooks);
        let unsubscribeLibraries = () => {};
        if (familyId) {
            unsubscribeLibraries = onUserLibrariesUpdate(familyId, setUserLibraries);
        }

        return () => {
          unsubscribeBooks();
          unsubscribeLibraries();
        };
    }, [familyId]);

    const stats = React.useMemo(() => {
        const totalBooks = books.length;
        const totalAuthors = new Set(books.map(b => b.author)).size;
        const totalPages = books.reduce((sum, book) => sum + (book.pageCount || 0), 0);
        const ratedBooks = books.filter(b => b.rating > 0);
        const avgRating = ratedBooks.length > 0
            ? (ratedBooks.reduce((sum, book) => sum + book.rating, 0) / ratedBooks.length).toFixed(1)
            : "0.0";
        
        return { totalBooks, totalAuthors, totalPages, avgRating };
    }, [books]);
    
    const genreData = React.useMemo(() => {
        if (books.length === 0) return [];
        const tagCounts = new Map<string, number>();
        books.forEach(book => {
            (book.tags || []).forEach(tag => {
                const mainTag = tag.split('/')[0]; // Only count main shelves/tags
                tagCounts.set(mainTag, (tagCounts.get(mainTag) || 0) + 1);
            });
        });
        
        const chartColors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];
        return Array.from(tagCounts.entries())
            .map(([name, value], index) => ({
                name,
                value,
                fill: chartColors[index % chartColors.length]
            }))
            .sort((a, b) => b.value - a.value);

    }, [books]);
    
     const memberReadingData = React.useMemo(() => {
        if (familyMembers.length === 0 || userLibraries.length === 0) return [];

        return familyMembers.map(member => {
            const memberLib = userLibraries.find(lib => lib.memberId === member.id);
            const finishedCount = memberLib ? memberLib.books.filter((b: any) => b.status === 'finished').length : 0;
            return {
                name: member.name,
                booksRead: finishedCount,
                fill: member.color || `hsl(${(Math.random() * 360).toFixed(0)}, 70%, 50%)`,
            };
        });
    }, [userLibraries, familyMembers]);


  return (
    <>
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-white rounded-xl shadow-lg mb-6">
        <h1 className="text-2xl font-bold">Kütüphane İstatistikleri 📈</h1>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Kitap</CardTitle>
            <Library className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBooks}</div>
            <p className="text-xs text-muted-foreground">Kütüphanedeki toplam eser sayısı</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Yazar</CardTitle>
            <User className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAuthors}</div>
            <p className="text-xs text-muted-foreground">Farklı yazar sayısı</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ortalama Puan</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgRating} / 5.0</div>
            <p className="text-xs text-muted-foreground">Puanlanan kitapların ortalaması</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Sayfa</CardTitle>
            <Book className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPages.toLocaleString('tr-TR')}</div>
             <p className="text-xs text-muted-foreground">Kütüphanedeki toplam sayfa sayısı</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Aylık Okuma İstatistikleri</CardTitle>
            <CardDescription>Son 6 aydaki okuma performansı.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={readingChartConfig} className="h-[300px] w-full">
              <ComposedChart data={monthlyReadingStats}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis yAxisId="left" orientation="left" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
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
            {genreData.length > 0 ? (
                <ChartContainer config={{}} className="h-[300px] w-full">
                <PieChart>
                    <Tooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie 
                    data={genreData} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" 
                    cy="50%" 
                    outerRadius={110} 
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                    {genreData.map((entry) => (
                        <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                    ))}
                    </Pie>
                </PieChart>
                </ChartContainer>
            ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Grafiği gösterecek yeterli veri yok.
                </div>
            )}
          </CardContent>
        </Card>
      </div>

       <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>En Çok Okuyanlar</CardTitle>
                <CardDescription>Aile üyelerinin bitirdiği kitap sayısı.</CardDescription>
            </CardHeader>
            <CardContent>
                {memberReadingData.length > 0 ? (
                 <ChartContainer config={memberReadingConfig} className="h-[300px] w-full">
                    <BarChart data={memberReadingData} layout="vertical" margin={{ left: 10, right: 10 }}>
                        <CartesianGrid horizontal={false} />
                        <YAxis
                            dataKey="name"
                            type="category"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={10}
                            width={80}
                        />
                        <XAxis dataKey="booksRead" type="number" hide />
                        <Tooltip cursor={false} content={<ChartTooltipContent />} />
                        <Bar dataKey="booksRead" name="Bitirilen Kitap" radius={8}>
                           {memberReadingData.map((entry) => (
                             <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                           ))}
                        </Bar>
                    </BarChart>
                </ChartContainer>
                ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Grafiği gösterecek yeterli veri yok.
                </div>
                )}
            </CardContent>
        </Card>
    </>
  );
}
