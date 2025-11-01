

"use client";

import * as React from "react";
import { CheckSquare, Calendar, BookOpen, ShoppingCart, TrendingUp, Star, Settings, UserPlus, Edit, UtensilsCrossed, PlusCircle, GraduationCap, LogOut, Sun, Moon, Library, ArrowRight, Notebook, ListChecks, Check, Users, BookHeart, Target, User, Flame, BrainCircuit, Gamepad2, Youtube, Wallet } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from "@/components/auth-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { FamilyMemberCard } from "@/components/family-member-card";
import { weeklyPoints, FamilyMember, ShoppingList, MealPlan, CalendarEvent, Recipe, Task, UserLibrary, Book, UserLibraryBook, Test, StudyAssignment, Goal, GoalSection, GoalTask, StudyPlan, MemorizationProgress, MemorizationItem, PrayerProgress, Video, Transaction, Account } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NewFamilyMemberForm } from "@/components/new-family-member-form";
import { EditFamilyMemberForm } from "@/components/edit-family-member-form";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { onShoppingListsUpdate, onMealPlanUpdate, onCalendarEventsUpdate, onTasksUpdate, onUserLibrariesUpdate, onBooksUpdate, updateTask, updateFamilyMemberInFamily, checkAndAwardBadges, onTestsUpdate, onStudyAssignmentsUpdate, onGoalsUpdate, updateGoal, getGoal, onStudyPlansUpdate, addBookToMemberLibrary, deleteBook, updateBook, onMemorizationProgressUpdate, onMemorizationItemsUpdate, addBook, onPrayerProgressUpdate, onVideosUpdate, onTransactionsUpdate, onAccountsUpdate } from "@/lib/dataService";
import { format, isWithinInterval, startOfMonth, endOfMonth, parseISO, compareAsc, isFuture, compareDesc, differenceInDays, isToday, subDays, isSameDay } from "date-fns";
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
import { Progress } from "@/components/ui/progress";
import { useForm } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { NewBookForm } from "@/components/new-book-form";
import { MemberDashboardCard } from "@/components/member-dashboard-card";


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

const progressFormSchema = z.object({
  progress: z.coerce.number().min(1, "En az 1 birim ilerleme girilmelidir."),
});


function ModeToggle() {
  const { setTheme, theme } = useTheme()

  return (
      <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="rounded-full"
          aria-label="Toggle theme"
      >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Temayı değiştir</span>
      </Button>
  )
}

const roleGradients: { [key: string]: string } = {
    Baba: "from-blue-500 to-indigo-600",
    Anne: "from-pink-500 to-purple-600",
    'Kız Çocuk': "from-purple-400 to-violet-500",
    'Erkek Çocuk': "from-teal-400 to-cyan-500",
    Bebek: "from-yellow-400 to-orange-500",
};

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
  const [studyPlans, setStudyPlans] = React.useState<StudyPlan[]>([]);
  const [userLibraries, setUserLibraries] = React.useState<UserLibrary[]>([]);
  const [books, setBooks] = React.useState<Book[]>([]);
  const [videos, setVideos] = React.useState<Video[]>([]);
  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [memorizationItems, setMemorizationItems] = React.useState<MemorizationItem[]>([]);
  const [memorizationProgress, setMemorizationProgress] = React.useState<MemorizationProgress[]>([]);
  const [prayerProgress, setPrayerProgress] = React.useState<PrayerProgress[]>([]);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [accounts, setAccounts] = React.useState<Account[]>([]);

  const [viewingBook, setViewingBook] = React.useState<Book | null>(null);
  const [isAddBookDialogOpen, setIsAddBookDialogOpen] = React.useState(false);
  const [editingBook, setEditingBook] = React.useState<Book | null>(null);
  const [editingGoal, setEditingGoal] = React.useState<{ goal: Goal; section: GoalSection } | null>(null);

  const progressForm = useForm<z.infer<typeof progressFormSchema>>({
      resolver: zodResolver(progressFormSchema),
      defaultValues: { progress: '' as any },
  });


  React.useEffect(() => {
    const today = new Date();
    const unsubShopping = onShoppingListsUpdate(setShoppingLists);
    const unsubMeal = onMealPlanUpdate(setMealPlan);
    const unsubCalendar = onCalendarEventsUpdate(setCalendarEvents);
    const unsubTasks = onTasksUpdate(setTasks);
    const unsubTests = onTestsUpdate(setTests);
    const unsubStudyAssignments = onStudyAssignmentsUpdate(setStudyAssignments);
    const unsubStudyPlans = onStudyPlansUpdate(setStudyPlans);
    const unsubBooks = onBooksUpdate(setBooks);
    const unsubVideos = onVideosUpdate(setVideos);
    const unsubGoals = onGoalsUpdate(setGoals);
    const unsubMemorizationItems = onMemorizationItemsUpdate(setMemorizationItems);
    const unsubMemorizationProgress = onMemorizationProgressUpdate(setMemorizationProgress);
    const unsubPrayerProgress = onPrayerProgressUpdate(setPrayerProgress);
    const unsubTransactions = onTransactionsUpdate(setTransactions, startOfMonth(today), endOfMonth(today));
    const unsubAccounts = onAccountsUpdate(setAccounts);

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
      unsubStudyPlans();
      unsubLibraries();
      unsubBooks();
      unsubVideos();
      unsubGoals();
      unsubMemorizationItems();
      unsubMemorizationProgress();
      unsubPrayerProgress();
      unsubTransactions();
      unsubAccounts();
    };
  }, [familyId]);
  
  const handleProgressSubmit = async (values: z.infer<typeof progressFormSchema>) => {
      if (!editingGoal) return;
      const { goal, section } = editingGoal;

      const newCompletedUnits = (section.completedUnits || 0) + values.progress;
      const sectionProgress = Math.min(newCompletedUnits, section.sectionTotalUnits);

      const newSections = goal.sections.map(s => 
          s.id === section.id 
              ? { ...s, completedUnits: sectionProgress } 
              : s
      );
      
      try {
          await updateGoal(goal.id, { sections: newSections });
          toast({ title: "İlerleme Kaydedildi!", description: `${values.progress} ${goal.unitName} eklendi.` });
          setEditingGoal(null);
          progressForm.reset({ progress: '' as any });
      } catch(e) {
          toast({ title: "Hata", variant: 'destructive' });
      }
  };

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
    return [...books]
        .sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            if (!dateA) return 1;
            if (!dateB) return -1;
            return dateB - dateA;
        })
        .slice(0, 10);
  }, [books]);


   const activeGoals = React.useMemo(() => {
    return goals
      .filter(goal => goal.status === 'in-progress')
      .map(goal => {
        const isVideoGoal = goal.platform === 'YouTube';
        const sortedSections = [...(goal.sections || [])].sort((a, b) => a.order - b.order);
        let currentSection: GoalSection | null = null;
        
        for (const section of sortedSections) {
            if (section.status !== 'completed') {
                currentSection = section;
                break;
            }
        }
        
        if (!currentSection && sortedSections.length > 0) {
            currentSection = sortedSections[sortedSections.length - 1];
        }
        
        const totalCompletedUnits = (goal.sections || []).reduce((sum, section) => sum + (section.completedUnits || 0), 0);
        const overallProgress = (goal.totalUnits || 0) > 0 ? (totalCompletedUnits / goal.totalUnits!) * 100 : 0;
        
        const sectionProgress = currentSection && currentSection.sectionTotalUnits > 0 
            ? ((currentSection.completedUnits || 0) / currentSection.sectionTotalUnits) * 100 
            : 0;
        
        return {
          ...goal,
          currentSection,
          totalCompletedUnits,
          overallProgress,
          sectionProgress,
          assignee: familyMembers.find(m => m.id === goal.assigneeId),
          isVideoGoal,
        };
      });
  }, [goals, familyMembers]);
  
    const monthlyBudgetSummary = React.useMemo(() => {
        const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        return { income, expense };
    }, [transactions]);

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
  
    const handleOpenEditDialog = React.useCallback((bookToEdit: Book) => {
        setEditingBook(bookToEdit);
        setIsAddBookDialogOpen(true);
    }, []);

    const handleAddToLibrary = async (bookId: string, memberId: string) => {
        if (!familyId) return;
        try {
            await addBookToMemberLibrary(familyId, memberId, bookId);
            const member = familyMembers.find(m => m.id === memberId);
            const book = books.find(b => b.id === bookId);
            toast({
                title: `"${book?.title}"`,
                description: `${member?.name} adlı üyenin kitaplığına eklendi.`
            });
        } catch (e) {
            toast({ title: "Hata", description: "Kitap eklenirken bir sorun oluştu.", variant: "destructive" });
        }
    };


  return (
    <div className="space-y-6">
       <header className={cn(
        "flex items-center justify-between gap-4 p-4",
        "bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg",
        "-mx-4 -mt-4 sm:-mx-6 sm:-mt-8 mb-6", // Full-bleed on mobile
        "rounded-b-2xl"
      )}>
          <div className="flex items-center gap-4">
              <SidebarTrigger />
              <h1 className="text-2xl font-extrabold tracking-tighter" style={{textShadow: '1px 1px 3px rgba(0,0,0,0.2)'}}>Özgürdere Ailesi</h1>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
          </div>
      </header>

      
        <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2">
                <Link href="/shopping" className="group block rounded-l-xl overflow-hidden">
                    <div className="flex flex-col p-4 shadow-lg text-white bg-gradient-to-br from-teal-500 to-cyan-500 h-full transition-transform group-hover:-translate-y-1">
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
                    <div className="flex flex-col p-4 shadow-lg text-white bg-gradient-to-br from-cyan-500 to-sky-600 h-full transition-transform group-hover:-translate-y-1">
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
             <Link href="/budget" className="group block">
                <div className="flex flex-col p-4 rounded-xl shadow-lg text-white bg-gradient-to-br from-lime-600 to-green-600 transition-transform group-hover:-translate-y-1">
                    <h3 className="flex items-center gap-3 text-base md:text-lg font-semibold"><Wallet /> Bütçe Özeti</h3>
                    <div className="flex-grow my-4 grid grid-cols-2 gap-4">
                        <div className="p-2 rounded-md bg-white/20 backdrop-blur-sm text-center">
                            <p className="text-xs font-semibold text-white/90">Gelir</p>
                            <p className="text-lg font-bold truncate">{monthlyBudgetSummary.income.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                        </div>
                         <div className="p-2 rounded-md bg-white/20 backdrop-blur-sm text-center">
                            <p className="text-xs font-semibold text-white/90">Gider</p>
                            <p className="text-lg font-bold truncate text-red-200">{monthlyBudgetSummary.expense.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                        </div>
                    </div>
                     <p className="w-full mt-auto text-sm text-center text-white/80 opacity-0 group-hover:opacity-100 transition-opacity">Bütçe detaylarına git →</p>
                </div>
            </Link>
            <Link href="/library/archive" className="block rounded-xl overflow-hidden transition-transform hover:-translate-y-1">
                <Card className="bg-gradient-to-r from-orange-400 to-rose-400 text-white shadow-lg h-full">
                    <CardHeader>
                        <CardTitle className="text-lg md:text-xl">Yeni Eklenen Kitaplar</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="relative">
                            <div className="-mx-6 px-6 overflow-x-auto pb-4 -mb-4">
                                <div className="flex flex-nowrap gap-4">
                                    {latestBooks.map(book => (
                                        <div key={book.id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViewingBook(book); }} className="group/book relative w-32 sm:w-40 shrink-0 cursor-pointer">
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
                                                <p className="font-bold text-[11px] leading-tight whitespace-normal line-clamp-2" title={book.title}>{book.title}</p>
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
      
      <Card className="shadow-lg bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Target /> Yol Haritaları</CardTitle>
          <CardDescription className="text-white/80">Aktif hedefler ve sıradaki adımlar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeGoals.length > 0 ? (
            activeGoals.map(goal => (
              <div key={goal.id} className="p-4 bg-white/20 rounded-lg">
                <div className="flex justify-between items-start gap-4">
                    <Link href={`/goals/${goal.id}`} className="block flex-grow group">
                        <p className="font-bold group-hover:underline">{goal.title}</p>
                        <p className="text-sm text-white/80">{goal.assignee?.name}</p>
                    </Link>
                    {goal.currentSection && goal.currentSection.status !== 'completed' && (
                       <Button size="sm" variant="secondary" className="shrink-0 bg-amber-300 text-amber-900 hover:bg-amber-400" onClick={() => setEditingGoal({goal, section: goal.currentSection!})}>
                            İlerleme Ekle
                        </Button>
                    )}
                </div>
                
                <div className="mt-4 space-y-4">
                    {goal.isVideoGoal ? (
                        <div>
                             <div className="flex justify-between text-xs text-white/80 mb-1">
                                <span>Sıradaki: {goal.unitName} {goal.totalCompletedUnits + 1}</span>
                                <span>{goal.totalCompletedUnits}/{goal.totalUnits}</span>
                            </div>
                            <Progress value={goal.overallProgress} className="h-1.5 bg-white/30" indicatorClassName="bg-green-300" />
                        </div>
                    ) : (
                       goal.currentSection && (
                        <>
                            <div>
                                <div className="flex justify-between text-xs text-white/80 mb-1">
                                    <span>{goal.currentSection.title}</span>
                                    <span>{goal.currentSection.completedUnits || 0}/{goal.currentSection.sectionTotalUnits} {goal.unitName}</span>
                                </div>
                                <Progress value={goal.sectionProgress || 0} className="h-1.5 bg-white/30" indicatorClassName="bg-amber-300" />
                            </div>
                            <div>
                                <div className="flex justify-between text-xs text-white/80 mb-1">
                                    <span>Genel İlerleme</span>
                                    <span>{Math.round(goal.overallProgress)}%</span>
                                </div>
                                <Progress value={goal.overallProgress} className="h-1.5 bg-white/30" indicatorClassName="bg-green-300" />
                            </div>
                        </>
                       )
                    )}
                </div>
              </div>
            ))
          ) : (
            <Link href="/goals" className="block text-center py-8 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
              <Target className="mx-auto h-8 w-8 text-white/80" />
              <p className="mt-2 text-sm text-white/90 font-semibold">Aktif yol haritası yok.</p>
              <p className="text-xs text-white/80">Yeni bir hedef oluşturmak için tıkla.</p>
            </Link>
          )}
        </CardContent>
      </Card>


      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {familyMembers.map(member => (
                <MemberDashboardCard 
                  key={member.id}
                  member={member}
                  tasks={tasks}
                  tests={tests}
                  studyAssignments={studyAssignments}
                  studyPlans={studyPlans}
                  userLibraries={userLibraries}
                  books={books}
                  videos={videos}
                  memorizationItems={memorizationItems}
                  memorizationProgress={memorizationProgress}
                  prayerProgress={prayerProgress}
                />
            ))}
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
          {familyMembers.map((member) => {
            return (
              <FamilyMemberCard key={member.id} member={member} onEdit={() => handleEditMember(member)} />
            )
          })}
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
            onEdit={handleOpenEditDialog}
            onAddToLibrary={handleAddToLibrary}
            familyMembers={familyMembers}
        />

      <Dialog open={!!editingGoal} onOpenChange={(open) => {if (!open) { setEditingGoal(null); progressForm.reset({ progress: '' as any }); }}}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>İlerleme Ekle: {editingGoal?.section.title}</DialogTitle>
                  <DialogDescription>
                      Bu bölüm için ne kadar ilerlediğini gir. (Örn: okunan sayfa sayısı)
                  </DialogDescription>
              </DialogHeader>
              <Form {...progressForm}>
                  <form onSubmit={progressForm.handleSubmit(handleProgressSubmit)} className="space-y-4 pt-4">
                      <FormField
                          control={progressForm.control}
                          name="progress"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Tamamlanan Birim ({editingGoal?.goal.unitName})</FormLabel>
                                  <FormControl><Input type="number" autoFocus {...field} /></FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                      <DialogFooter>
                          <Button type="button" variant="ghost" onClick={() => setEditingGoal(null)}>İptal</Button>
                          <Button type="submit">Kaydet</Button>
                      </DialogFooter>
                  </form>
              </Form>
          </DialogContent>
      </Dialog>
    </div>
  );
}
