
"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Book, User, Library, Star } from "lucide-react";
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Book as BookType, monthlyReadingStats, familyMembers } from "@/lib/data";
import { onBooksUpdate } from "@/lib/dataService";

const genreData = [
  { name: 'Fantastik', value: 4, fill: "hsl(var(--chart-1))" },
  { name: 'Distopya', value: 1, fill: "hsl(var(--chart-2))" },
  { name: 'Felsefe', value: 1, fill: "hsl(var(--chart-3))" },
  { name: 'Tarih', value: 1, fill: "hsl(var(--chart-4))" },
  { name: 'Bilim Kurgu', value: 1, fill: "hsl(var(--chart-5))" },
  { name: 'Klasik', value: 2, fill: "hsl(var(--chart-1))" },
  { name: 'Çocuk Klasikleri', value: 2, fill: "hsl(var(--chart-2))" },
];

const readingChartConfig = {
  books: { label: "Kitap Sayısı", color: "hsl(var(--chart-2))" },
  pages: { label: "Sayfa Sayısı", color: "hsl(var(--chart-4))" },
} satisfies ChartConfig;

const memberReadingData = familyMembers.map(member => ({
  name: member.name,
  booksRead: Math.floor(member.xp / 500), // Approximate books read based on XP
  fill: member.color,
}));

const memberReadingConfig = {
  booksRead: { label: "Okunan Kitap" },
  ...familyMembers.reduce((acc, member) => {
    acc[member.name] = { label: member.name, color: member.color };
    return acc;
  }, {} as ChartConfig),
} satisfies ChartConfig;


export default function LibraryStatsPage() {
    const [books, setBooks] = React.useState<BookType[]>([]);

    React.useEffect(() => {
        const unsubscribe = onBooksUpdate(setBooks);
        return () => unsubscribe();
    }, []);

    const totalBooks = books.length;
    const totalAuthors = new Set(books.map(b => b.author)).size;
    const totalPages = books.reduce((sum, book) => sum + (book.pages || 0), 0);
    const avgRating = totalBooks > 0 ? (books.reduce((sum, book) => sum + book.rating, 0) / totalBooks).toFixed(1) : 0;

  return (
    <>
      <PageHeader title="Kütüphane İstatistikleri 📈" />
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Kitap</CardTitle>
            <Library className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBooks}</div>
            <p className="text-xs text-muted-foreground">Kütüphanedeki toplam eser sayısı</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Yazar</CardTitle>
            <User className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAuthors}</div>
            <p className="text-xs text-muted-foreground">Farklı yazar sayısı</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ortalama Puan</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgRating} / 5.0</div>
            <p className="text-xs text-muted-foreground">Tüm kitapların ortalaması</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Sayfa</CardTitle>
            <Book className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPages.toLocaleString('tr-TR')}</div>
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
          </CardContent>
        </Card>
      </div>

       <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>En Çok Okuyanlar</CardTitle>
                <CardDescription>Aile üyelerinin okuduğu kitap sayısı.</CardDescription>
            </CardHeader>
            <CardContent>
                 <ChartContainer config={memberReadingConfig} className="h-[300px] w-full">
                    <BarChart data={memberReadingData} layout="vertical" margin={{ left: 10, right: 10 }}>
                        <CartesianGrid horizontal={false} />
                        <YAxis
                            dataKey="name"
                            type="category"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={10}
                            width={60}
                        />
                        <XAxis dataKey="booksRead" type="number" hide />
                        <Tooltip cursor={false} content={<ChartTooltipContent />} />
                        <Legend />
                        <Bar dataKey="booksRead" name="Okunan Kitap" radius={8}>
                           {memberReadingData.map((entry) => (
                             <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                           ))}
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    </>
  );
}
