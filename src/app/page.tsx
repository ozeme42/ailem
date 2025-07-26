
"use client";

import * as React from "react";
import { CheckSquare, Calendar, BookOpen, ShoppingCart, TrendingUp, Star, Bell, Settings, UserPlus, Edit, UtensilsCrossed, PlusCircle, GraduationCap, LogOut, Sun, Moon, Library, ArrowRight } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from "@/components/auth-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { FamilyMemberCard } from "@/components/family-member-card";
import { weeklyPoints, FamilyMember, ShoppingList, MealPlan, CalendarEvent, Recipe, Task, UserLibrary, Book } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NewFamilyMemberForm } from "@/components/new-family-member-form";
import { EditFamilyMemberForm } from "@/components/edit-family-member-form";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { onShoppingListsUpdate, onMealPlanUpdate, onCalendarEventsUpdate, onTasksUpdate, onUserLibrariesUpdate, onBooksUpdate } from "@/lib/dataService";
import { format, isWithinInterval, startOfMonth, endOfMonth, parseISO, compareAsc, isFuture, compareDesc, differenceInDays, isToday } from "date-fns";
import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useTheme } from "next-themes";
import Image from "next/image";

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

const activityIcons = {
    task: { icon: CheckSquare, color: 'from-green-500 to-emerald-500' },
    book: { icon: BookOpen, color: 'from-yellow-500 to-amber-500' },
    event: { icon: Calendar, color: 'from-blue-500 to-sky-500' },
};

function ModeToggle() {
  const { setTheme, theme } = useTheme()

  return (
      <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="rounded-full p-2 transition-colors hover:bg-white/20 text-primary-foreground"
          aria-label="Toggle theme"
      >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Temayı değiştir</span>
      </Button>
  )
}

export default function Home() {
  const { user, familyId, familyMembers, loading, logout } = useAuth();
  const [isMemberFormOpen, setIsMemberFormOpen] = React.useState(false);
  const [editingMember, setEditingMember] = React.useState<FamilyMember | null>(null);
  
  const [shoppingLists, setShoppingLists] = React.useState<ShoppingList[]>([]);
  const [mealPlan, setMealPlan] = React.useState<MealPlan>({});
  const [calendarEvents, setCalendarEvents] = React.useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [userLibraries, setUserLibraries] = React.useState<UserLibrary[]>([]);
  const [books, setBooks] = React.useState<Book[]>([]);


  React.useEffect(() => {
    const unsubShopping = onShoppingListsUpdate(setShoppingLists);
    const unsubMeal = onMealPlanUpdate(setMealPlan);
    const unsubCalendar = onCalendarEventsUpdate(setCalendarEvents);
    const unsubTasks = onTasksUpdate(setTasks);
    const unsubBooks = onBooksUpdate(setBooks);
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
      unsubBooks();
    };
  }, [familyId]);

  const recentActivities = React.useMemo(() => {
    const activities: any[] = [];

    // Completed Tasks
    tasks.filter(t => t.completed).forEach(task => {
        // NOTE: We don't have a `completedAt` timestamp. We'll use dueDate for sorting.
        const member = familyMembers.find(m => m.id === task.assigneeId);
        activities.push({
            id: `task-${task.id}`,
            user: member?.name || 'Bilinmeyen',
            title: `'${task.title}' görevini tamamladı`,
            date: parseISO(task.dueDate), // Using due date as a proxy for sorting
            type: 'task',
        });
    });

    // Finished Books
    userLibraries.forEach(lib => {
        const member = familyMembers.find(m => m.id === lib.memberId);
        if (member) {
            lib.books.filter(b => b.status === 'finished' && b.finishedAt).forEach(userBook => {
                const bookInfo = books.find(b => b.id === userBook.bookId);
                activities.push({
                    id: `book-${lib.memberId}-${userBook.bookId}`,
                    user: member.name,
                    title: `'${bookInfo?.title || 'bir kitap'}' okumayı bitirdi`,
                    date: parseISO(userBook.finishedAt!),
                    type: 'book',
                });
            });
        }
    });

    // Added Calendar Events
    calendarEvents.forEach(event => {
        activities.push({
            id: `event-${event.id}`,
            user: 'Sistem', // Or the user who added it, if tracked
            title: `'${event.title}' etkinliği eklendi`,
            date: parseISO(event.startDate),
            type: 'event',
        });
    });

    return activities
        .sort((a, b) => compareDesc(a.date, b.date))
        .slice(0, 5); // Get latest 5 activities

  }, [tasks, userLibraries, calendarEvents, books, familyMembers]);

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
  const todaysPlan = mealPlan[format(new Date(), 'yyyy-MM-dd')];

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
      .map(event => ({
        ...event,
        date: parseISO(event.startDate),
        daysLeft: differenceInDays(parseISO(event.startDate), today),
      }))
      .filter(event => isFuture(event.date) || isToday(event.date))
      .sort((a, b) => compareAsc(a.date, b.date));

    return {
      upcomingEvents: upcoming,
    };
  }, [calendarEvents]);


  const latestBooks = React.useMemo(() => {
      // Assuming the books array is roughly in creation order. Reverse and take 10.
      return [...books].reverse().slice(0, 10);
  }, [books]);


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
  
  const handleEditCurrentUser = () => {
    const currentUserMember = familyMembers.find(m => m.id === user?.uid);
    if (currentUserMember) {
        setEditingMember(currentUserMember);
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between gap-4 p-4 bg-gradient-to-br from-primary to-accent/80 text-primary-foreground rounded-xl shadow-lg">
          <div className="flex items-center gap-4">
              <SidebarTrigger className="md:hidden text-primary-foreground hover:bg-white/20 hover:text-primary-foreground" />
              <h1 className="text-2xl font-bold tracking-tight">Özgürdere Ailesi</h1>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative rounded-full p-2 transition-colors hover:bg-white/20">
                    <Bell className="h-5 w-5" />
                    {recentActivities.length > 0 && <Badge className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0 bg-red-500 text-white border-2 border-background">{recentActivities.length}</Badge>}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Son Bildirimler</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {recentActivities.map((activity) => {
                    const ActivityIcon = activityIcons[activity.type as keyof typeof activityIcons].icon || Star;
                    const color = activityIcons[activity.type as keyof typeof activityIcons].color || 'from-gray-500 to-gray-600';
                    return (
                        <DropdownMenuItem key={activity.id} className="flex items-start gap-3 p-2">
                             <div className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br text-white ${color}`}>
                                <ActivityIcon className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">
                                    <span className="font-bold">{activity.user}</span> <span className="text-muted-foreground font-normal">{activity.title}</span>
                                </p>
                                <p className="text-xs text-muted-foreground">{formatDistanceToNow(activity.date, { addSuffix: true, locale: tr })}</p>
                            </div>
                        </DropdownMenuItem>
                    );
                })}
                 {recentActivities.length === 0 && <p className="text-xs text-muted-foreground text-center p-4">Henüz yeni bir bildirim yok.</p>}
              </DropdownMenuContent>
            </DropdownMenu>
            <ModeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="rounded-full p-2 transition-colors hover:bg-white/20">
                        <Settings className="h-5 w-5" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Ayarlar</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={handleEditCurrentUser}>
                        <Edit className="mr-2 h-4 w-4" />
                        <span>Profilimi Düzenle</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                     <DropdownMenuItem onSelect={logout} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Çıkış Yap</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
          </div>
      </header>

      {latestBooks.length > 0 && (
         <Card className="shadow-lg bg-gradient-to-r from-orange-400 to-rose-400 text-white md:bg-card md:text-card-foreground">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-white md:text-card-foreground text-xl">Yeni Eklenen Kitaplar</CardTitle>
                    </div>
                    <Link href="/library/archive">
                        <Button variant="ghost" className="text-white/80 hover:text-white md:text-muted-foreground md:hover:text-foreground">
                            Tümünü Gör <ArrowRight className="ml-2 h-4 w-4"/>
                        </Button>
                    </Link>
                </div>
            </CardHeader>
            <CardContent>
                 <div className="relative">
                    <div className="overflow-x-auto pb-4 -mb-4">
                        <div className="flex flex-nowrap gap-4">
                            {latestBooks.map(book => (
                               <Link key={book.id} href="/library/archive" className="group block w-24 sm:w-32 shrink-0">
                                  <Card className="overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1">
                                    <Image 
                                      src={book.image || `https://placehold.co/300x450.png`} 
                                      alt={book.title} 
                                      width={300} 
                                      height={450} 
                                      className="w-full h-auto object-cover aspect-[2/3]"
                                      data-ai-hint="book cover" 
                                    />
                                  </Card>
                                  <p className="mt-2 text-sm font-semibold truncate group-hover:text-primary">{book.title}</p>
                                  <p className="text-xs text-white/80 md:text-muted-foreground truncate">{book.author}</p>
                               </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </CardContent>
         </Card>
      )}
      
        <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2">
                <Link href="/shopping" className="group block">
                    <div className="flex flex-col p-4 rounded-l-xl shadow-lg text-white bg-gradient-to-br from-green-500 to-emerald-600 h-full transition-transform group-hover:-translate-y-1">
                        <h3 className="flex items-center gap-3 text-base md:text-lg font-semibold"><ShoppingCart /> Alışveriş Listesi</h3>
                        <div className="flex-grow my-4 space-y-2">
                            {shoppingSummary.totalPending > 0 ? (
                                <>
                                    {shoppingSummary.itemsToShow.map(item => (
                                        <div key={item.id} className="flex items-center gap-2 text-xs md:text-sm p-1.5 md:p-2 rounded-md bg-white/20 backdrop-blur-sm">
                                            <span>{item.name}</span>
                                        </div>
                                    ))}
                                    {shoppingSummary.totalPending > 3 && (
                                        <p className="text-[11px] md:text-xs text-white/80 pt-1">+ {shoppingSummary.totalPending - 3} ürün daha...</p>
                                    )}
                                </>
                            ) : (
                            <div className="p-1.5 md:p-2 rounded-md bg-white/20 backdrop-blur-sm">
                                    <p className="text-xs md:text-sm text-white/90">Alınacak ürün yok. Harika!</p>
                            </div>
                            )}
                        </div>
                        <p className="w-full mt-auto text-sm text-center text-white/80 opacity-0 group-hover:opacity-100 transition-opacity">Listeye git →</p>
                    </div>
                </Link>
                <Link href="/yemek" className="group block">
                    <div className="flex flex-col p-4 rounded-r-xl shadow-lg text-white bg-gradient-to-br from-orange-500 to-red-600 h-full transition-transform group-hover:-translate-y-1">
                        <h3 className="flex items-center gap-3 text-base md:text-lg font-semibold"><UtensilsCrossed /> Günün Menüsü</h3>
                        <div className="flex-grow my-4 space-y-2">
                        <div className="space-y-1 md:space-y-2">
                                <p className="font-semibold text-xs md:text-sm text-white/90">Kahvaltı</p>
                                <div className="p-1.5 md:p-2 rounded-md bg-white/20 backdrop-blur-sm min-h-[36px] md:min-h-[40px]">
                                    <p className="text-xs md:text-sm truncate">{todaysPlan?.['Kahvaltı']?.title || <span className="text-white/70">Planlanmadı</span>}</p>
                                </div>
                            </div>
                            <div className="space-y-1 md:space-y-2">
                                <p className="font-semibold text-xs md:text-sm text-white/90">Akşam Yemeği</p>
                                <div className="p-1.5 md:p-2 rounded-md bg-white/20 backdrop-blur-sm min-h-[36px] md:min-h-[40px]">
                                    <p className="text-xs md:text-sm truncate">{todaysPlan?.['Akşam Yemeği']?.title || <span className="text-white/70">Planlanmadı</span>}</p>
                                </div>
                            </div>
                        </div>
                        <p className="w-full mt-auto text-sm text-center text-white/80 opacity-0 group-hover:opacity-100 transition-opacity">Yemek planına git →</p>
                    </div>
                </Link>
            </div>
            <Link href="/calendar" className="group block">
                <div className="flex flex-col p-4 rounded-xl shadow-lg text-white bg-gradient-to-br from-blue-500 to-purple-600 h-full transition-transform group-hover:-translate-y-1">
                    <h3 className="flex items-center gap-3 text-base md:text-lg font-semibold"><Calendar /> Yaklaşan Etkinlikler</h3>
                    <div className="flex-grow my-4 space-y-2">
                        {calendarSummary.upcomingEvents.length > 0 ? (
                           calendarSummary.upcomingEvents.map(event => (
                            <div key={event.id} className="p-1.5 md:p-2 rounded-md bg-white/20 backdrop-blur-sm flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-sm md:text-base">{event.title}</p>
                                    <p className="text-xs md:text-sm text-white/90">{format(event.date, 'dd MMMM yyyy', { locale: tr })}</p>
                                </div>
                                <Badge variant="secondary" className="bg-white/30 text-white">
                                    {event.daysLeft > 0 ? `${event.daysLeft} gün sonra` : "Bugün"}
                                </Badge>
                           </div>
                           ))
                        ) : (
                           <div className="p-1.5 md:p-2 rounded-md bg-white/20 backdrop-blur-sm">
                             <p className="text-xs md:text-sm text-white/90">Yaklaşan bir etkinlik bulunmuyor.</p>
                           </div>
                        )}
                    </div>
                     <p className="w-full mt-auto text-sm text-center text-white/80 opacity-0 group-hover:opacity-100 transition-opacity">Takvime git →</p>
                </div>
            </Link>
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

      <section className="grid grid-cols-1 lg:grid-cols-1 gap-8">
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
