
"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Book, User, Library, Star, ArrowRight } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Book as BookType, UserLibrary } from "@/lib/data";
import { onBooksUpdate, onUserLibrariesUpdate } from "@/lib/dataService";
import { useAuth } from '@/components/auth-provider';
import { Button } from "@/components/ui/button";
import { format, subMonths } from 'date-fns';
import { tr } from 'date-fns/locale';

const readingChartConfig = {
  books: { label: "Okunan Kitap", color: "hsl(var(--chart-2))" },
  pages: { label: "Okunan Sayfa", color: "hsl(var(--chart-4))" },
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
        const totalPages = books.reduce((sum, book) => sum + (book.pageCount || 0), 0);
        const ratedBooks = books.filter(b => b.rating > 0);
        const avgRating = ratedBooks.length > 0
            ? (ratedBooks.reduce((sum, book) => sum + book.rating, 0) / ratedBooks.length).toFixed(1)
            : "0.0";
        
        return { 
            totalBooks, 
            totalAuthors: new Set(books.map(b => b.author)).size, 
            totalPages, 
            avgRating,
        };
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

    const monthlyStats = React.useMemo(() => {
        const finishedBooks = userLibraries
            .flatMap(lib => lib.books)
            .filter(book => book.status === 'finished')
            .map(book => {
                const bookDetails = books.find(b => b.id === book.bookId);
                return {
                    ...book,
                    pageCount: bookDetails?.pageCount || 0,
                    date: new Date(book.finishedAt || book.addedAt),
                };
            });

        const statsByMonth: { [key: string]: { books: number, pages: number } } = {};
        const now = new Date();

        for (let i = 5; i >= 0; i--) {
            const monthDate = subMonths(now, i);
            const monthKey = format(monthDate, 'MMM yy', { locale: tr });
            statsByMonth[monthKey] = { books: 0, pages: 0 };
        }

        finishedBooks.forEach(book => {
            const monthKey = format(book.date, 'MMM yy', { locale: tr });
            if (statsByMonth[monthKey]) {
                statsByMonth[monthKey].books += 1;
                statsByMonth[monthKey].pages += book.pageCount;
            }
        });
        
        return Object.entries(statsByMonth).map(([month, data]) => ({ month, ...data }));
    }, [userLibraries, books]);

  return (
    <>
      <PageHeader title="Kütüphane İstatistikleri 📈" />
      
      <div className="flex flex-wrap gap-2 mb-8">
        <Link href="/library/stats/authors">
            <Button variant="outline">Yazar Sıralaması <ArrowRight className="ml-2 h-4 w-4"/></Button>
        </Link>
        <Link href="/library/stats/pages">
             <Button variant="outline">Sayfa Sayısı Sıralaması <ArrowRight className="ml-2 h-4 w-4"/></Button>
        </Link>
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
              <BarChart data={monthlyStats} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis />
                <Tooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="books" fill="var(--color-books)" radius={[4, 4, 0, 0]} name="Okunan Kitap"/>
                <Bar dataKey="pages" fill="var(--color-pages)" radius={[4, 4, 0, 0]} name="Okunan Sayfa" />
              </BarChart>
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
