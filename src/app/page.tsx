
"use client";

import * as React from "react";
import { CheckSquare, Calendar, BookOpen, ShoppingCart, TrendingUp, Star, Bell, Settings, UserPlus, Edit, UtensilsCrossed, PlusCircle } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from "@/components/auth-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { FamilyMemberCard } from "@/components/family-member-card";
import { weeklyPoints, recentActivities, FamilyMember, ShoppingList, MealPlan, CalendarEvent, Recipe, Task, UserLibrary } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NewFamilyMemberForm } from "@/components/new-family-member-form";
import { EditFamilyMemberForm } from "@/components/edit-family-member-form";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { onShoppingListsUpdate, onMealPlanUpdate, onCalendarEventsUpdate, onTasksUpdate, onUserLibrariesUpdate } from "@/lib/dataService";
import { format, isWithinInterval, startOfMonth, endOfMonth, parseISO, compareAsc, isFuture } from "date-fns";
import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";

const familyXpChartConfig = {
  xp: { label: "XP", },
  Ahmet: { label: "Ahmet", color: "hsl(var(--chart-1))" },
  Zeynep: { label: "Zeynep", color: "hsl(var(--chart-2))" },
  Elif: { label: "Elif", color: "hsl(var(--chart-3))" },
  Murat: { label: "Murat", color: "hsl(var(--chart-4))" },
} satisfies ChartConfig

const weeklyProgressChartConfig = {
  points: {
    label: "Puan",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

export default function Home() {
  const { user, familyId, familyMembers, loading } = useAuth();
  const [isMemberFormOpen, setIsMemberFormOpen] = React.useState(false);
  const [editingMember, setEditingMember] = React.useState<FamilyMember | null>(null);
  
  const [shoppingLists, setShoppingLists] = React.useState<ShoppingList[]>([]);
  const [mealPlan, setMealPlan] = React.useState<MealPlan>({});
  const [calendarEvents, setCalendarEvents] = React.useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [userLibraries, setUserLibraries] = React.useState<UserLibrary[]>([]);


  React.useEffect(() => {
    const unsubShopping = onShoppingListsUpdate(setShoppingLists);
    const unsubMeal = onMealPlanUpdate(setMealPlan);
    const unsubCalendar = onCalendarEventsUpdate(setCalendarEvents);
    const unsubTasks = onTasksUpdate(setTasks);
    let unsubLibraries = () => {};
    if (familyId) {
      unsubLibraries = onUserLibrariesUpdate(familyId, setUserLibraries);
    }

    return () => {
      unsubShopping();
      unsubMeal();
      unsubCalendar();
      unsubTasks();
      unsubLibraries();
    };
  }, [familyId]);

  const dailySummary = React.useMemo(() => {
    const completedTasksCount = tasks.filter(t => t.completed).length;
    const upcomingEventsCount = calendarEvents.filter(e => isFuture(parseISO(e.startDate))).length;
    const finishedBooksCount = userLibraries.reduce((acc, lib) => {
        return acc + lib.books.filter(b => b.status === 'finished').length;
    }, 0);

    return {
        completedTasks: completedTasksCount,
        upcomingEvents: upcomingEventsCount,
        finishedBooks: finishedBooksCount
    }
  }, [tasks, calendarEvents, userLibraries])

  const familyXpData = familyMembers.map(member => ({ name: member.name, xp: member.xp }));
  const todaysMeal = mealPlan[format(new Date(), 'yyyy-MM-dd')]?.['Akşam Yemeği'] as Recipe | undefined;

  const shoppingSummary = React.useMemo(() => {
    const allPendingItems = shoppingLists.flatMap(list => list.items?.filter(item => !item.isBought) || []);
    return {
        totalPending: allPendingItems.length,
        itemsToShow: allPendingItems.slice(0, 3), // Show first 3 items
    };
  }, [shoppingLists]);

  const calendarSummary = React.useMemo(() => {
    const today = new Date();
    const upcoming = calendarEvents
        .map(event => ({ ...event, date: parseISO(event.startDate) }))
        .filter(event => event.date >= today)
        .sort((a, b) => compareAsc(a.date, b.date));
    
    return {
        totalUpcoming: upcoming.length,
        nextEvent: upcoming[0], // Show the very next event
    };
  }, [calendarEvents]);


  if (loading) {
    return (
        <div className="space-y-8">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-24 w-full" />
             <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        </div>
    );
  }
  
  const handleEditMember = (member: FamilyMember) => {
      setEditingMember(member);
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between gap-4 p-4 bg-gradient-to-br from-primary to-accent/80 text-primary-foreground rounded-xl shadow-lg">
          <div className="flex items-center gap-4">
              <SidebarTrigger className="md:hidden text-primary-foreground hover:bg-white/20 hover:text-primary-foreground" />
              <h1 className="text-2xl font-bold tracking-tight">Özgürdere Ailesi</h1>
          </div>
          <div className="flex items-center gap-2">
              <button className="relative rounded-full p-2 transition-colors hover:bg-white/20">
                  <Bell className="h-5 w-5" />
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0 bg-red-500 text-white border-2 border-background">3</Badge>
              </button>
              <button className="rounded-full p-2 transition-colors hover:bg-white/20">
                  <Settings className="h-5 w-5" />
              </button>
          </div>
      </header>
      
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="flex flex-col p-6 rounded-xl shadow-lg text-white bg-gradient-to-br from-green-500 to-emerald-600">
                <h3 className="flex items-center gap-3 text-lg font-semibold"><ShoppingCart /> Alışveriş Listesi</h3>
                <div className="flex-grow my-4">
                    {shoppingSummary.totalPending > 0 ? (
                        <div className="space-y-2">
                            {shoppingSummary.itemsToShow.map(item => (
                                <div key={item.id} className="flex items-center gap-2 text-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
                                    <span>{item.name}</span>
                                </div>
                            ))}
                            {shoppingSummary.totalPending > 3 && (
                                <p className="text-xs text-white/80 pt-1">+ {shoppingSummary.totalPending - 3} ürün daha...</p>
                            )}
                        </div>
                    ) : (
                       <p className="text-sm text-white/90">Alınacak ürün yok. Harika!</p>
                    )}
                </div>
                <Link href="/shopping" className="w-full mt-auto">
                    <Button variant="outline" className="w-full bg-white/20 text-white hover:bg-white/30 border-none">Listeye Git</Button>
                </Link>
            </div>
            <div className="flex flex-col p-6 rounded-xl shadow-lg text-white bg-gradient-to-br from-orange-500 to-red-600">
                <h3 className="flex items-center gap-3 text-lg font-semibold"><UtensilsCrossed /> Günün Menüsü</h3>
                <div className="flex-grow my-4">
                     {todaysMeal ? (
                         <>
                            <p className="font-semibold truncate">{todaysMeal.title}</p>
                            <p className="text-sm text-white/90">Akşam yemeği için planlandı.</p>
                         </>
                    ) : (
                        <div className="text-white/90">
                            <p className="font-semibold">Bugün ne pişirsem?</p>
                            <p className="text-sm">Akşam yemeği için henüz bir plan yok.</p>
                        </div>
                    )}
                </div>
                <Link href="/yemek" className="w-full mt-auto">
                    <Button variant="outline" className="w-full bg-white/20 text-white hover:bg-white/30 border-none">
                        {todaysMeal ? 'Menüyü Görüntüle' : 'Yemek Planla'}
                    </Button>
                </Link>
            </div>
            <div className="flex flex-col p-6 rounded-xl shadow-lg text-white bg-gradient-to-br from-blue-500 to-purple-600">
                <h3 className="flex items-center gap-3 text-lg font-semibold"><Calendar /> Yaklaşan Etkinlikler</h3>
                <div className="flex-grow my-4">
                    {calendarSummary.nextEvent ? (
                        <>
                            <p className="font-semibold">{calendarSummary.nextEvent.title}</p>
                            <p className="text-sm text-white/90">{format(calendarSummary.nextEvent.date, 'dd MMMM yyyy')}</p>
                             {calendarSummary.totalUpcoming > 1 && (
                                <p className="text-xs text-white/80 pt-1">+ {calendarSummary.totalUpcoming - 1} etkinlik daha...</p>
                            )}
                        </>
                    ) : (
                        <p className="text-sm text-white/90">Yaklaşan bir etkinlik bulunmuyor.</p>
                    )}
                </div>
                <Link href="/calendar" className="w-full mt-auto">
                    <Button variant="outline" className="w-full bg-white/20 text-white hover:bg-white/30 border-none">Takvime Git</Button>
                </Link>
            </div>
        </div>


      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">📊 Günlük Özet</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="overflow-hidden border-0 shadow-lg transition-transform hover:scale-105 bg-green-500/10">
                <CardContent className="p-4">
                   <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-white to-gray-100 shadow-inner">
                      <CheckSquare size={24} className="text-green-500" />
                   </div>
                   <div className="text-center">
                     <p className="text-3xl font-extrabold text-green-500">{dailySummary.completedTasks}</p>
                     <p className="text-sm font-semibold text-foreground">Tamamlanan Görevler</p>
                   </div>
                </CardContent>
            </Card>
             <Card className="overflow-hidden border-0 shadow-lg transition-transform hover:scale-105 bg-blue-500/10">
                <CardContent className="p-4">
                   <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-white to-gray-100 shadow-inner">
                      <Calendar size={24} className="text-blue-500" />
                   </div>
                   <div className="text-center">
                     <p className="text-3xl font-extrabold text-blue-500">{dailySummary.upcomingEvents}</p>
                     <p className="text-sm font-semibold text-foreground">Yaklaşan Etkinlikler</p>
                   </div>
                </CardContent>
            </Card>
             <Card className="overflow-hidden border-0 shadow-lg transition-transform hover:scale-105 bg-purple-500/10">
                <CardContent className="p-4">
                   <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-white to-gray-100 shadow-inner">
                      <BookOpen size={24} className="text-purple-500" />
                   </div>
                   <div className="text-center">
                     <p className="text-3xl font-extrabold text-purple-500">{dailySummary.finishedBooks}</p>
                     <p className="text-sm font-semibold text-foreground">Okunan Kitaplar</p>
                   </div>
                </CardContent>
            </Card>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-foreground">👨‍👩‍👧‍👦 Aile Üyeleri</h2>
            <Dialog open={isMemberFormOpen} onOpenChange={setIsMemberFormOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Üye Ekle
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                    <DialogTitle>Yeni Aile Üyesi Ekle</DialogTitle>
                    <DialogDescription>
                        Ailenize yeni bir üye (çocuk veya başka bir veli) ekleyin.
                    </DialogDescription>
                </DialogHeader>
                <NewFamilyMemberForm onMemberAdded={() => setIsMemberFormOpen(false)} />
              </DialogContent>
            </Dialog>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {familyMembers.map((member) => (
            <FamilyMemberCard key={member.id} member={member} onEdit={() => handleEditMember(member)} />
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-lg">
           <CardHeader>
             <CardTitle>Haftalık İlerleme</CardTitle>
             <CardDescription>Ailenin bu hafta kazandığı toplam XP puanları.</CardDescription>
           </CardHeader>
           <CardContent>
             <ChartContainer config={weeklyProgressChartConfig} className="h-[250px] w-full">
                <AreaChart
                  accessibilityLayer
                  data={weeklyPoints}
                  margin={{
                    left: -20,
                    right: 10,
                    top: 10,
                    bottom: 0
                  }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                   <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                  <Tooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <defs>
                    <linearGradient id="fillPoints" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--color-points)"
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-points)"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                  <Area
                    dataKey="points"
                    type="natural"
                    fill="url(#fillPoints)"
                    stroke="var(--color-points)"
                    stackId="a"
                  />
                </AreaChart>
             </ChartContainer>
           </CardContent>
        </Card>
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>Aile XP Karşılaştırması</CardTitle>
                <CardDescription>Aile üyelerinin toplam tecrübe puanları.</CardDescription>
            </CardHeader>
            <CardContent>
                 <ChartContainer config={familyXpChartConfig} className="h-[250px] w-full">
                    <BarChart data={familyXpData} layout="vertical" margin={{ left: 10, right: 10 }}>
                        <CartesianGrid horizontal={false} />
                        <YAxis
                            dataKey="name"
                            type="category"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={10}
                            width={60}
                        />
                        <XAxis dataKey="xp" type="number" hide />
                        <Tooltip cursor={false} content={<ChartTooltipContent />} />
                        <Bar dataKey="xp" radius={8}>
                           {familyXpData.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={familyXpChartConfig[entry.name as keyof typeof familyXpChartConfig]?.color} />
                           ))}
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
      </section>

       <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Profili Düzenle</DialogTitle>
                    <DialogDescription>
                        {editingMember?.name} adlı üyenin bilgilerini güncelleyin.
                    </DialogDescription>
                </DialogHeader>
                {editingMember && (
                    <EditFamilyMemberForm 
                        member={editingMember}
                        onMemberUpdated={() => setEditingMember(null)}
                    />
                )}
            </DialogContent>
        </Dialog>
    </div>
  );
}
