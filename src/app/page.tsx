
"use client";

import * as React from "react";
import { CheckSquare, Calendar, BookOpen, ShoppingCart, TrendingUp, Star, Bell, Settings, UserPlus, Edit, UtensilsCrossed, PlusCircle, GraduationCap, LogOut, Sun, Moon, Library, ArrowRight, Notebook, ListChecks, Check, Users, BookHeart } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from "@/components/auth-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { FamilyMemberCard } from "@/components/family-member-card";
import { weeklyPoints, FamilyMember, ShoppingList, MealPlan, CalendarEvent, Recipe, Task, UserLibrary, Book, UserLibraryBook, Test, StudyAssignment } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NewFamilyMemberForm } from "@/components/new-family-member-form";
import { EditFamilyMemberForm } from "@/components/edit-family-member-form";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { onShoppingListsUpdate, onMealPlanUpdate, onCalendarEventsUpdate, onTasksUpdate, onUserLibrariesUpdate, onBooksUpdate, updateTask, updateFamilyMemberInFamily, checkAndAwardBadges, onTestsUpdate, onStudyAssignmentsUpdate } from "@/lib/dataService";
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
import { BookDetailDialog } from "@/components/book-detail-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";


const familyXpChartConfig = {
  xp: { label: "XP", },
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
  const { toast } = useToast();
  const [isMemberFormOpen, setIsMemberFormOpen] = React.useState(false);
  const [editingMember, setEditingMember] = React.useState<FamilyMember | null>(null);
  
  const [shoppingLists, setShoppingLists] = React.useState<ShoppingList[]>([]);
  const [mealPlan, setMealPlan] = React.useState<MealPlan>({});
  const [calendarEvents, setCalendarEvents] = React.useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [tests, setTests] = React.useState<Test[]>([]);
  const [studyAssignments, setStudyAssignments] = React.useState<StudyAssignment[]>([]);
  const [userLibraries, setUserLibraries] = React.useState<UserLibrary[]>([]);
  const [books, setBooks] = React.useState<Book[]>([]);
  const [viewingBook, setViewingBook] = React.useState<Book | null>(null);


  React.useEffect(() => {
    const unsubShopping = onShoppingListsUpdate(setShoppingLists);
    const unsubMeal = onMealPlanUpdate(setMealPlan);
    const unsubCalendar = onCalendarEventsUpdate(setCalendarEvents);
    const unsubTasks = onTasksUpdate(setTasks);
    const unsubTests = onTestsUpdate(setTests);
    const unsubStudyAssignments = onStudyAssignmentsUpdate(setStudyAssignments);
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
      unsubTests();
      unsubStudyAssignments();
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
    const upcomingEventsCount = calendarEvents.filter(e => isFuture(parseISO(e.startDate))).length;
    const finishedBooksCount = userLibraries.reduce((acc, lib) => {
        return acc + lib.books.filter(b => b.status === 'finished').length;
    }, 0);

    return {
        upcomingEvents: upcomingEventsCount,
        finishedBooks: finishedBooksCount
    }
  }, [calendarEvents, userLibraries]);

  const pendingTasksSummary = React.useMemo(() => {
    return tasks
      .filter(task => !task.completed)
      .sort((a, b) => compareAsc(parseISO(a.dueDate), parseISO(b.dueDate)))
      .map(task => ({
        ...task,
        assignee: familyMembers.find(m => m.id === task.assigneeId)
      }))
      .slice(0, 5); // Show top 5 pending tasks
  }, [tasks, familyMembers]);

  const { pendingTests, pendingStudies } = React.useMemo(() => {
    const students = familyMembers.filter(m => m.role.includes('Çocuk'));
    const studentIds = new Set(students.map(s => s.id));

    const testsPending = tests
        .filter(t => studentIds.has(t.studentId) && t.status === 'Atandı')
        .map(t => ({ ...t, type: 'test' as const, student: familyMembers.find(m => m.id === t.studentId) }))
        .sort((a, b) => compareAsc(parseISO(a.dueDate), parseISO(b.dueDate)));
        
    const studiesPending = studyAssignments
        .filter(a => studentIds.has(a.studentId) && a.status === 'assigned')
        .map(a => ({ ...a, type: 'study' as const, title: a.topic, dueDate: a.dueDate, student: familyMembers.find(m => m.id === a.studentId) }))
        .sort((a, b) => compareAsc(parseISO(a.dueDate), parseISO(b.dueDate)));

    return { pendingTests, pendingStudies };
  }, [tests, studyAssignments, familyMembers]);


  const familyXpData = familyMembers.map(member => ({ name: member.name, xp: member.xp, fill: member.color }));
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
      return [...books].reverse().slice(0, 10);
  }, [books]);
  
  const libraryStats = React.useMemo(() => {
    return familyMembers.map(member => {
        const memberLibrary = userLibraries.find(lib => lib.memberId === member.id);
        if (!memberLibrary) {
            return { memberId: member.id, name: member.name, color: member.color, booksRead: 0, pagesRead: 0 };
        }

        const finishedBookIds = new Set(
            memberLibrary.books
                .filter(b => b.status === 'finished')
                .map(b => b.bookId)
        );

        const pagesRead = books
            .filter(b => finishedBookIds.has(b.id))
            .reduce((sum, b) => sum + (b.pageCount || 0), 0);

        return {
            memberId: member.id,
            name: member.name,
            color: member.color,
            booksRead: finishedBookIds.size,
            pagesRead: pagesRead
        };
    });
  }, [familyMembers, userLibraries, books]);


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

  const handleTaskCompletion = async (task: Task, assignee: FamilyMember) => {
    if (!familyId) return;
    try {
        await updateTask(task.id, { completed: true });
        
        const xpChange = task.points;
        const completedTasksChange = 1;
        
        const newXp = (assignee.xp || 0) + xpChange;
        const newLevel = Math.floor(newXp / 1000) + 1;

        await updateFamilyMemberInFamily(familyId, assignee.id, {
            xp: newXp,
            completedTasks: (assignee.completedTasks || 0) + completedTasksChange,
            level: newLevel,
        });
        
        await checkAndAwardBadges(assignee.id, familyId, { type: 'task_completed', task });

        toast({
            title: "🎉 Görev Tamamlandı!",
            description: `Harika iş, ${assignee?.name || ''}! ${task.points} XP kazandın.`,
        });
    } catch (error) {
        toast({ title: "Hata", description: "Görev güncellenirken bir sorun oluştu.", variant: "destructive"});
    }
  };


  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between gap-4 p-4 bg-gradient-to-br from-primary to-accent/80 text-primary-foreground rounded-xl shadow-lg">
          <div className="flex items-center gap-4">
              <SidebarTrigger className="text-primary-foreground hover:bg-white/20 hover:text-primary-foreground" />
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

      
        <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2">
                <Link href="/shopping" className="group block rounded-l-xl overflow-hidden">
                    <div className="flex flex-col p-4 shadow-lg text-white bg-gradient-to-br from-green-500 to-emerald-600 h-full transition-transform group-hover:-translate-y-1">
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
                <Link href="/yemek" className="group block rounded-r-xl overflow-hidden">
                    <div className="flex flex-col p-4 shadow-lg text-white bg-gradient-to-br from-orange-500 to-red-600 h-full transition-transform group-hover:-translate-y-1">
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
             <div className="grid grid-cols-2">
                 <Link href="/shopping" className="group block">
                    <div className="flex flex-col p-4 rounded-l-xl shadow-lg text-white bg-gradient-to-br from-cyan-500 to-sky-600 h-full transition-transform group-hover:-translate-y-1">
                        <h3 className="flex items-center gap-3 text-base md:text-lg font-semibold"><ListChecks /> İhtiyaçlar</h3>
                    </div>
                </Link>
                <Link href="/shopping" className="group block">
                    <div className="flex flex-col p-4 rounded-r-xl shadow-lg text-white bg-gradient-to-br from-purple-500 to-fuchsia-600 h-full transition-transform group-hover:-translate-y-1">
                        <h3 className="flex items-center gap-3 text-base md:text-lg font-semibold"><Notebook /> Notlar</h3>
                    </div>
                </Link>
            </div>
            <Link href="/calendar" className="group block">
                <div className="flex flex-col p-4 rounded-xl shadow-lg text-white bg-gradient-to-br from-blue-500 to-purple-600 h-full transition-transform group-hover:-translate-y-1">
                    <h3 className="flex items-center gap-3 text-base md:text-lg font-semibold"><Calendar /> Yaklaşan Etkinlikler</h3>
                    <div className="flex-grow my-4 space-y-2">
                        {calendarSummary.upcomingEvents.length > 0 ? (
                           calendarSummary.upcomingEvents.slice(0, 3).map(event => (
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
                        {calendarSummary.upcomingEvents.length > 3 && (
                            <p className="text-xs text-white/80 pt-1">+ {calendarSummary.upcomingEvents.length - 3} etkinlik daha...</p>
                        )}
                    </div>
                     <p className="w-full mt-auto text-sm text-center text-white/80 opacity-0 group-hover:opacity-100 transition-opacity">Takvime git →</p>
                </div>
            </Link>
             <Link href="/library/archive" className="group block rounded-xl overflow-hidden transition-transform hover:-translate-y-1">
                <Card className="bg-gradient-to-r from-orange-400 to-rose-400 text-white shadow-lg h-full">
                    <CardHeader>
                        <CardTitle className="text-lg md:text-xl">Yeni Eklenen Kitaplar</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="relative">
                            <div className="-mx-6 px-6 overflow-x-auto pb-4 -mb-4">
                                <div className="flex flex-nowrap gap-4">
                                    {latestBooks.map(book => (
                                        <div key={book.id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViewingBook(book); }} className="group/book relative w-40 sm:w-48 shrink-0 cursor-pointer">
                                            <Image 
                                                src={book.image || `https://placehold.co/300x450.png`} 
                                                alt={book.title} 
                                                width={300} 
                                                height={450} 
                                                className="w-full h-auto object-cover aspect-[2/3] rounded-md shadow-lg transition-transform duration-300 group-hover/book:scale-105"
                                                data-ai-hint="book cover" 
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent rounded-md"></div>
                                            <div className="absolute bottom-0 left-0 p-2 text-white">
                                                <p className="font-bold text-xs whitespace-normal break-words line-clamp-2" title={book.title}>{book.title}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </Link>
        </div>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-lg bg-gradient-to-br from-teal-500 to-cyan-500 text-white">
          <CardHeader>
            <CardTitle>Bekleyen Görevler</CardTitle>
            <CardDescription className="text-white/80">Tüm aile için yaklaşan görevler.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingTasksSummary.length > 0 ? (
              pendingTasksSummary.map(task => (
                <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/20 backdrop-blur-sm">
                  <Checkbox
                    id={`home-task-${task.id}`}
                    onCheckedChange={() => task.assignee && handleTaskCompletion(task, task.assignee)}
                    className="border-white text-white ring-offset-white data-[state=checked]:bg-white data-[state=checked]:text-teal-600"
                  />
                  <div className="flex-grow">
                    <label htmlFor={`home-task-${task.id}`} className="font-semibold cursor-pointer">{task.title}</label>
                    <p className="text-xs text-white/80">{format(parseISO(task.dueDate), "d MMM", { locale: tr })}</p>
                  </div>
                  {task.assignee && (
                     <div 
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" 
                        style={{ backgroundColor: task.assignee.color, color: '#fff' }}
                        title={task.assignee.name}
                    >
                        {task.assignee.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 bg-white/10 rounded-lg">
                <Check className="mx-auto h-8 w-8 text-white/80" />
                <p className="mt-2 text-sm text-white/90">Bekleyen görev yok. Harika!</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Link href="/education" className="block group">
            <Card className="shadow-lg bg-gradient-to-br from-rose-500 to-fuchsia-600 text-white h-full">
              <CardHeader>
                <CardTitle>Ödev Takibi</CardTitle>
                <CardDescription className="text-white/80">Öğrencilerin bekleyen eğitim görevleri.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(pendingTests.length > 0 || pendingStudies.length > 0) ? (
                  <>
                    {pendingTests.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-white/90 mb-2">Bekleyen Testler</h4>
                        <div className="space-y-2">
                           {pendingTests.slice(0, 2).map(test => (
                             <div key={test.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                               <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold shrink-0 border-2 border-white/30" style={{backgroundColor: test.student?.color}}>{test.student?.name.charAt(0)}</div>
                               <div className="truncate"><p className="font-semibold truncate text-sm">{test.title}</p><p className="text-xs text-white/80 truncate">{test.student?.name}</p></div>
                             </div>
                           ))}
                        </div>
                      </div>
                    )}
                     {pendingStudies.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-white/90 mb-2">Konu Anlatımları</h4>
                         <div className="space-y-2">
                           {pendingStudies.slice(0, 2).map(study => (
                              <div key={study.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                               <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold shrink-0 border-2 border-white/30" style={{backgroundColor: study.student?.color}}>{study.student?.name.charAt(0)}</div>
                               <div className="truncate"><p className="font-semibold truncate text-sm">{study.topic}</p><p className="text-xs text-white/80 truncate">{study.student?.name}</p></div>
                             </div>
                           ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 bg-white/10 rounded-lg">
                    <GraduationCap className="mx-auto h-8 w-8 text-white/80" />
                    <p className="mt-2 text-sm text-white/90">Bekleyen ödev yok. Mükemmel!</p>
                  </div>
                )}
              </CardContent>
            </Card>
        </Link>
      </section>

      <Card className="shadow-lg bg-gradient-to-br from-pink-500 to-purple-600 text-white">
        <CardHeader>
            <CardTitle>Kişisel Kitaplıklar</CardTitle>
            <CardDescription className="text-white/80">Herkesin okuma ilerlemesi.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {libraryStats.map(stat => (
                <div key={stat.memberId} className="flex items-center gap-4 p-3 rounded-lg bg-white/20">
                    <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold shrink-0 border-2 border-white/50" 
                        style={{ backgroundColor: stat.color, color: '#fff' }}
                    >
                        {stat.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-grow">
                        <p className="font-semibold">{stat.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="font-bold">{stat.booksRead} <span className="font-normal text-sm text-white/80">kitap</span></p>
                        <p className="font-bold">{stat.pagesRead.toLocaleString()} <span className="font-normal text-sm text-white/80">sayfa</span></p>
                    </div>
                </div>
            ))}
        </CardContent>
      </Card>
      
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
        
        <BookDetailDialog 
            book={viewingBook} 
            isOpen={!!viewingBook} 
            onOpenChange={(open) => {if(!open) setViewingBook(null)}}
        />
    </div>
  );
}
