"use client";

import * as React from "react";
import Image from "next/image";
import { BarChart, Book, Clock, Heart, PlusCircle, Star } from "lucide-react";
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Pie, PieChart, Cell } from "recharts";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { books, familyMembers } from "@/lib/data";

const readingStats = [
  { name: 'Ahmet', books: 5 },
  { name: 'Zeynep', books: 8 },
  { name: 'Elif', books: 12 },
];

const genreData = [
  { name: 'Macera', value: 400 },
  { name: 'Fantastik', value: 300 },
  { name: 'Klasik', value: 300 },
  { name: 'Distopya', value: 200 },
];
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];


export default function LibraryPage() {
  return (
    <>
      <PageHeader title="Aile Kütüphanesi 📚">
        <Button className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
          <PlusCircle className="mr-2 h-4 w-4" />
          Yeni Kitap Ekle
        </Button>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Okunan</CardTitle>
            <Book className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">25 Kitap</div>
            <p className="text-xs text-muted-foreground">Aile toplamı</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bu Ay</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+4 Kitap</div>
            <p className="text-xs text-muted-foreground">Geçen aya göre +1</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Favori Tür</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Macera</div>
            <p className="text-xs text-muted-foreground">Tüm zamanlar</p>
          </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Okuma Lideri</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">Elif</div>
                <p className="text-xs text-muted-foreground">12 kitap ile</p>
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Aylık Okuma Performansı</CardTitle>
            <CardDescription>Aile üyelerinin bu ay okuduğu kitap sayısı.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={300}>
              <RechartsBarChart data={readingStats}>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                    contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)"}}
                    cursor={{ fill: "hsl(var(--muted))" }}
                />
                <Bar dataKey="books" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Okunan Türler</CardTitle>
            <CardDescription>Okunan kitapların türlere göre dağılımı.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
                 <PieChart>
                    <Pie data={genreData} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value">
                        {genreData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)"}} />
                </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4 text-foreground">Kitaplık</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {books.map(book => (
                <Dialog key={book.id}>
                    <DialogTrigger asChild>
                        <div className="cursor-pointer group">
                            <Card className="overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1">
                                <Image src={book.coverImage} alt={book.title} width={300} height={450} className="w-full h-auto object-cover" data-ai-hint="book cover" />
                            </Card>
                            <p className="mt-2 text-sm font-semibold truncate group-hover:text-primary">{book.title}</p>
                            <p className="text-xs text-muted-foreground">{book.author}</p>
                        </div>
                    </DialogTrigger>
                     <DialogContent className="sm:max-w-[625px]">
                        <div className="grid gap-8 sm:grid-cols-2">
                            <div>
                                <Image src={book.coverImage} alt={book.title} width={300} height={450} className="w-full h-auto object-cover rounded-md" data-ai-hint="book cover" />
                            </div>
                            <div className="flex flex-col">
                                <DialogHeader>
                                    <DialogTitle className="text-3xl font-bold">{book.title}</DialogTitle>
                                    <DialogDescription className="text-lg">{book.author}</DialogDescription>
                                </DialogHeader>
                                <div className="flex items-center gap-2 my-4">
                                    <div className="flex items-center">
                                        {[...Array(5)].map((_, i) => <Star key={i} className={`h-5 w-5 ${i < book.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />)}
                                    </div>
                                    <span className="text-sm text-muted-foreground">({book.rating}.0)</span>
                                </div>
                                <p className="text-sm text-muted-foreground flex-grow">{book.description}</p>
                                <div className="text-sm text-muted-foreground mt-4">
                                    <p>{book.pages} sayfa</p>
                                </div>
                                <div className="mt-6 flex gap-2">
                                    <Button className="w-full">Okundu Olarak İşaretle</Button>
                                    <Button variant="outline" size="icon"><Heart/></Button>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            ))}
        </div>
      </div>
    </>
  );
}
