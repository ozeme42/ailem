
"use client";

import * as React from "react";
import { CheckSquare, Calendar, BookOpen, ShoppingCart, UtensilsCrossed, PlusCircle, Sun, Moon, ListChecks, Check, Users, Target, User, Flame, BarChart2, BookCheck, Wallet, ChevronRight, LayoutDashboard, Settings2, Pencil } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { FamilyMember, ShoppingList, MealPlan, CalendarEvent, Task, UserLibrary, Book, Test, StudyAssignment, Goal, GoalSection, StudyPlan, MemorizationProgress, MemorizationItem, PrayerProgress, Video, Transaction, Account, ReadingSession, TrackedBook } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NewFamilyMemberForm } from "@/components/new-family-member-form";
import { EditFamilyMemberForm } from "@/components/edit-family-member-form";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { onShoppingListsUpdate, onMealPlanUpdate, onCalendarEventsUpdate, onTasksUpdate, onUserLibrariesUpdate, onBooksUpdate, onTestsUpdate, onStudyAssignmentsUpdate, onGoalsUpdate, updateGoal, onStudyPlansUpdate, addBookToMemberLibrary, onMemorizationItemsUpdate, onMemorizationProgressUpdate, onPrayerProgressUpdate, onVideosUpdate, onTransactionsUpdate, onAccountsUpdate, onReadingSessionsUpdate, onTrackedBooksUpdate } from "@/lib/dataService";
import { format, isWithinInterval, startOfMonth, endOfMonth, parseISO, compareAsc, isFuture, differenceInDays, isToday, startOfWeek, endOfWeek, addDays, subMonths, addMonths } from "date-fns";
import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { tr } from 'date-fns/locale';
import { useTheme } from "next-themes";
import Image from "next/image";
import { BookDetailDialog } from "@/components/book-detail-dialog";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { useForm } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { MemberDashboardCard } from "@/components/member-dashboard-card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

// --- (Chart Configs ve Schema aynı kalıyor) ---
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
            className="rounded-full bg-white/10 hover:bg-white/20 text-foreground border border-transparent hover:border-border transition-all"
        >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Temayı değiştir</span>
        </Button>
    )
}

export default function Home() {
    const { user, familyId, familyMembers, loading } = useAuth();
    const { toast } = useToast();
    
    // UI States
    const [isMemberFormOpen, setIsMemberFormOpen] = React.useState(false);
    const [editingMember, setEditingMember] = React.useState<FamilyMember | null>(null);
    const [activeMemberId, setActiveMemberId] = React.useState<string>(""); // Yeni: Aktif üye state'i

    // Data States
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
    const [readingSessions, setReadingSessions] = React.useState<ReadingSession[]>([]);
    const [trackedBooks, setTrackedBooks] = React.useState<TrackedBook[]>([]);

    const [viewingBook, setViewingBook] = React.useState<Book | null>(null);
    const [isAddBookDialogOpen, setIsAddBookDialogOpen] = React.useState(false);
    const [editingBook, setEditingBook] = React.useState<Book | null>(null);
    const [editingGoal, setEditingGoal] = React.useState<{ goal: Goal; section: GoalSection } | null>(null);

    const progressForm = useForm<z.infer<typeof progressFormSchema>>({
        resolver: zodResolver(progressFormSchema),
        defaultValues: { progress: '' as any },
    });

    // İlk yüklemede ilk çocuğu aktif yap
    React.useEffect(() => {
        if (familyMembers.length > 0 && !activeMemberId) {
            const childMember = familyMembers.find(m => m.role.includes('Çocuk'));
            if (childMember) {
                setActiveMemberId(childMember.id);
            } else {
                setActiveMemberId(familyMembers[0].id);
            }
        }
    }, [familyMembers, activeMemberId]);

    React.useEffect(() => {
        if (!familyId) return;

        const today = new Date();
        const sixMonthsAgo = startOfMonth(subMonths(today, 5));
        
        // Veri abonelikleri (Aynı kalıyor)
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
        const unsubTransactions = onTransactionsUpdate(setTransactions, sixMonthsAgo, endOfMonth(addMonths(today, 1)));
        const unsubAccounts = onAccountsUpdate(setAccounts);
        const unsubSessions = onReadingSessionsUpdate(setReadingSessions);
        const unsubLibraries = onUserLibrariesUpdate(familyId, setUserLibraries);
        const unsubTrackedBooks = onTrackedBooksUpdate(setTrackedBooks);

        return () => {
            unsubShopping(); unsubMeal(); unsubCalendar(); unsubTasks(); unsubTests();
            unsubStudyAssignments(); unsubStudyPlans(); unsubLibraries(); unsubBooks();
            unsubVideos(); unsubGoals(); unsubMemorizationItems(); unsubMemorizationProgress();
            unsubPrayerProgress(); unsubTransactions(); unsubAccounts(); unsubSessions(); unsubTrackedBooks();
        };
    }, [familyId]);

    // --- Hesaplamalar (Bütçe, Alışveriş, Takvim vb.) ---
    const monthlyBudgetSummary = React.useMemo(() => {
        const today = new Date();
        const summaries = [];
        for (let i = -4; i <= 1; i++) {
            const targetMonthDate = addMonths(today, i);
            const monthKey = format(targetMonthDate, 'yyyy-MM');
            const monthTransactions = transactions.filter(t => t.date.startsWith(monthKey));
            const income = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
            const expense = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
            const net = income - expense;
            const monthName = format(targetMonthDate, 'MMMM', { locale: tr });
            summaries.push({ monthName, income, expense, net });
        }
        return summaries;
    }, [transactions]);

    const handleProgressSubmit = async (values: z.infer<typeof progressFormSchema>) => {
        if (!editingGoal) return;
        const { goal, section } = editingGoal;
        const newCompletedUnits = (section.completedUnits || 0) + values.progress;
        const sectionProgress = Math.min(newCompletedUnits, section.sectionTotalUnits);
        const newSections = goal.sections.map(s => s.id === section.id ? { ...s, completedUnits: sectionProgress } : s);
        
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
        return { totalPending: allPendingItems.length, itemsToShow: allPendingItems.slice(0, 3) };
    }, [shoppingLists]);

    const calendarSummary = React.useMemo(() => {
        const today = new Date();
        const upcoming = calendarEvents
            .map(event => ({ ...event, date: parseISO(event.startDate), daysLeft: differenceInDays(parseISO(event.startDate), today) }))
            .filter(event => isFuture(event.date) || isToday(event.date))
            .sort((a, b) => compareAsc(a.date, b.date));
        return { upcomingEvents: upcoming };
    }, [calendarEvents]);

    const latestBooks = React.useMemo(() => {
        return [...books].sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        }).slice(0, 10);
    }, [books]);

    const activeGoals = React.useMemo(() => {
        return goals.filter(goal => goal.status === 'in-progress').map(goal => {
            const sortedSections = [...(goal.sections || [])].sort((a, b) => a.order - b.order);
            let currentSection = sortedSections.find(s => s.status !== 'completed') || sortedSections[sortedSections.length - 1];
            const totalCompletedUnits = (goal.sections || []).reduce((sum, section) => sum + (section.completedUnits || 0), 0);
            const overallProgress = (goal.totalUnits || 0) > 0 ? (totalCompletedUnits / goal.totalUnits!) * 100 : 0;
            const sectionProgress = currentSection && currentSection.sectionTotalUnits > 0 ? ((currentSection.completedUnits || 0) / currentSection.sectionTotalUnits) * 100 : 0;
            return {
                ...goal, currentSection, totalCompletedUnits, overallProgress, sectionProgress,
                assignee: familyMembers.find(m => m.id === goal.assigneeId),
                isVideoGoal: goal.platform === 'YouTube',
            };
        });
    }, [goals, familyMembers]);

    const readingStats = React.useMemo(() => {
        return familyMembers.map(member => {
            const memberLib = userLibraries.find(lib => lib.memberId === member.id);
            if (!memberLib) return { memberId: member.id, name: member.name, color: member.color, finishedBooks: 0, pagesRead: 0 };
            let pagesRead = 0;
            const finishedBooks = memberLib.books.filter(b => {
                if (b.status === 'finished') {
                    const bookDetail = books.find(bd => bd.id === b.bookId);
                    if (bookDetail?.pageCount) pagesRead += bookDetail.pageCount;
                    return true;
                }
                return false;
            });
            return { memberId: member.id, name: member.name, color: member.color, finishedBooks: finishedBooks.length, pagesRead: pagesRead };
        }).sort((a,b) => b.finishedBooks - a.finishedBooks);
    }, [familyMembers, userLibraries, books]);

    if (loading) return <div className="p-8"><Skeleton className="h-64 w-full rounded-2xl" /></div>;

    const handleOpenEditDialog = (bookToEdit: Book) => { setEditingBook(bookToEdit); setIsAddBookDialogOpen(true); };
    const handleAddToLibrary = async (bookId: string, memberId: string) => {
        if (!familyId) return;
        try {
            await addBookToMemberLibrary(familyId, memberId, bookId);
            toast({ title: "Başarılı", description: "Kitap eklendi." });
        } catch (e) { toast({ title: "Hata", variant: "destructive" }); }
    };
    
    // Aktif üyeyi bul
    const activeMember = familyMembers.find(m => m.id === activeMemberId) || familyMembers[0];

    return (
        <div className="min-h-screen bg-background/50 relative pb-20">
             {/* Background Decoration */}
             <div className="fixed inset-0 -z-10 h-full w-full bg-white dark:bg-zinc-950 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] opacity-50"></div>

            <div className="max-w-7xl mx-auto md:p-6 p-4 space-y-8">
                {/* Header */}
                <header className="flex flex-col md:flex-row items-center justify-between gap-4 py-2 sticky top-2 z-40 bg-background/80 backdrop-blur-lg border border-border/50 rounded-2xl px-4 shadow-sm">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <SidebarTrigger className="-ml-2 md:ml-0" />
                        <div>
                            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                                Özgürdere Ailesi
                            </h1>
                            <p className="text-xs text-muted-foreground hidden sm:block">Ailenizin dijital yönetim merkezi</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                        <ModeToggle />
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
                            {user?.displayName?.charAt(0) || "A"}
                        </div>
                    </div>
                </header>

                {/* --- Üst Grid (Özetler) --- */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                     {/* Alışveriş Kartı */}
                     <Link href="/shopping" className="group block h-full">
                        <div className="relative overflow-hidden rounded-2xl border border-border bg-white dark:bg-card p-5 h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-emerald-500/50">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <ShoppingCart className="w-16 h-16 text-emerald-500" />
                            </div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                    <ShoppingCart className="w-5 h-5" />
                                </div>
                                <h3 className="font-semibold text-foreground">Alışveriş</h3>
                            </div>
                            <div className="space-y-2">
                                {shoppingSummary.totalPending > 0 ? (
                                    <>
                                        <div className="flex flex-wrap gap-1.5">
                                            {shoppingSummary.itemsToShow.map(item => (
                                                <Badge key={item.id} variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border-0">
                                                    {item.name}
                                                </Badge>
                                            ))}
                                        </div>
                                        {shoppingSummary.totalPending > 3 && (
                                            <p className="text-xs text-muted-foreground font-medium">+ {shoppingSummary.totalPending - 3} ürün daha</p>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-sm text-muted-foreground">Liste tertemiz! 🎉</p>
                                )}
                            </div>
                        </div>
                    </Link>

                    {/* Yemek Kartı */}
                    <Link href="/yemek" className="group block h-full">
                        <div className="relative overflow-hidden rounded-2xl border border-border bg-white dark:bg-card p-5 h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-orange-500/50">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <UtensilsCrossed className="w-16 h-16 text-orange-500" />
                            </div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
                                    <UtensilsCrossed className="w-5 h-5" />
                                </div>
                                <h3 className="font-semibold text-foreground">Menü</h3>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Kahvaltı</p>
                                    <p className="text-sm font-medium truncate text-foreground">{todaysPlan?.['Kahvaltı']?.title || "Planlanmadı"}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Akşam</p>
                                    <p className="text-sm font-medium truncate text-foreground">{todaysPlan?.['Akşam Yemeği']?.title || "Planlanmadı"}</p>
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* Finans Slider */}
                    <div className="col-span-1 sm:col-span-2 relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-card p-0 shadow-sm transition-all hover:shadow-md">
                        <Link href="/budget" className="block h-full">
                            <Carousel opts={{ loop: true, startIndex: 4 }} className="w-full h-full">
                                <CarouselContent className="h-full">
                                    {monthlyBudgetSummary.map((summary, index) => (
                                        <CarouselItem key={index} className="h-full">
                                            <div className="p-5 h-full flex flex-col justify-between">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                                            <Wallet className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-semibold text-foreground">{summary.monthName} Bütçesi</h3>
                                                            <p className="text-xs text-muted-foreground">Finansal Özet</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4 mt-4">
                                                    <div className="space-y-1"><p className="text-xs text-muted-foreground">Gelir</p><p className="text-base font-bold text-emerald-600">{summary.income.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })}</p></div>
                                                    <div className="space-y-1"><p className="text-xs text-muted-foreground">Gider</p><p className="text-base font-bold text-rose-600">{summary.expense.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })}</p></div>
                                                    <div className="space-y-1"><p className="text-xs text-muted-foreground">Kalan</p><p className={cn("text-base font-bold", summary.net < 0 ? 'text-rose-600' : 'text-blue-600')}>{summary.net.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })}</p></div>
                                                </div>
                                            </div>
                                        </CarouselItem>
                                    ))}
                                </CarouselContent>
                                <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100" />
                                <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100" />
                            </Carousel>
                        </Link>
                    </div>

                    {/* Takvim ve Görevler */}
                    <div className="grid grid-cols-2 gap-4 col-span-1 sm:col-span-2 lg:col-span-4 xl:col-span-4">
                        <Link href="/calendar" className="group block">
                            <Card className="h-full border-l-4 border-l-blue-500 hover:shadow-lg transition-all">
                                <CardHeader className="p-4 pb-2">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-blue-500" /> Etkinlikler
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                    {calendarSummary.upcomingEvents.length > 0 ? (
                                        <div className="space-y-2">
                                            {calendarSummary.upcomingEvents.slice(0, 2).map(event => (
                                                <div key={event.id} className="flex justify-between items-center text-sm">
                                                    <span className="truncate max-w-[120px] font-medium">{event.title}</span>
                                                    <span className={cn("text-xs px-2 py-0.5 rounded-full", event.daysLeft <= 1 ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700")}>
                                                        {event.daysLeft === 0 ? "Bugün" : `${event.daysLeft} gün`}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-xs text-muted-foreground">Yaklaşan etkinlik yok.</p>}
                                </CardContent>
                            </Card>
                        </Link>

                        <Link href="/tasks" className="group block">
                            <Card className="h-full border-l-4 border-l-purple-500 hover:shadow-lg transition-all">
                                <CardHeader className="p-4 pb-2">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <ListChecks className="w-4 h-4 text-purple-500" /> Görevler
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 pt-0 flex items-center justify-between">
                                    <div className="text-2xl font-bold">{tasks.filter(t => !t.isCompleted).length}</div>
                                    <p className="text-xs text-muted-foreground text-right w-full ml-2">Bekleyen görev</p>
                                </CardContent>
                            </Card>
                        </Link>
                    </div>
                </div>

                {/* --- Orta Bölüm: Hedefler ve Kitaplar --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                     <div className="lg:col-span-2 space-y-8">
                        {/* Kitaplar */}
                        <section>
                            <div className="flex items-center justify-between mb-4 px-1">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-amber-500" /> Yeni Kitaplar
                                </h2>
                                <Link href="/library/archive" className="text-sm text-primary hover:underline">Tümünü gör</Link>
                            </div>
                            <div className="relative group">
                                <div className="flex overflow-x-auto pb-6 -mb-6 gap-4 px-1 scrollbar-hide snap-x">
                                    {latestBooks.map(book => (
                                        <div key={book.id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViewingBook(book); }} className="snap-start shrink-0 w-32 md:w-40 group/book cursor-pointer">
                                            <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-md transition-all duration-300 group-hover/book:shadow-xl group-hover/book:-translate-y-1">
                                                <Image src={book.image || `https://placehold.co/300x450.png`} alt={book.title} width={300} height={450} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/book:opacity-100 transition-opacity duration-300 flex items-end p-3">
                                                    <p className="text-white text-xs font-semibold line-clamp-2">{book.title}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* Hedefler */}
                        <section>
                            <div className="flex items-center justify-between mb-4 px-1">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <Target className="w-5 h-5 text-rose-500" /> Aktif Yol Haritaları
                                </h2>
                            </div>
                            <div className="grid gap-4">
                                {activeGoals.length > 0 ? activeGoals.map(goal => (
                                    <Card key={goal.id} className="overflow-hidden border-l-4 border-l-rose-500/50 hover:border-l-rose-500 transition-all shadow-sm">
                                        <CardContent className="p-5">
                                            <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center mb-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <Link href={`/goals/${goal.id}`} className="font-bold text-lg hover:text-primary transition-colors">{goal.title}</Link>
                                                        {goal.isVideoGoal && <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-bold">VIDEO</span>}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <User className="w-3 h-3" /> {goal.assignee?.name}
                                                    </div>
                                                </div>
                                                {goal.currentSection && goal.currentSection.status !== 'completed' && (
                                                    <Button size="sm" className="bg-rose-500 hover:bg-rose-600 text-white rounded-full px-4" onClick={() => setEditingGoal({ goal, section: goal.currentSection! })}>
                                                        <PlusCircle className="w-4 h-4 mr-1.5" /> İlerleme Ekle
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="space-y-4">
                                                {goal.currentSection && (
                                                    <div className="bg-muted/50 p-3 rounded-xl border border-border/50">
                                                        <div className="flex justify-between text-xs font-medium mb-2">
                                                            <span className="text-foreground/80 truncate pr-2">{goal.currentSection.title}</span>
                                                            <span className="text-muted-foreground">{goal.currentSection.completedUnits || 0} / {goal.currentSection.sectionTotalUnits} {goal.unitName}</span>
                                                        </div>
                                                        <Progress value={goal.sectionProgress || 0} className="h-2" indicatorClassName="bg-rose-500" />
                                                    </div>
                                                )}
                                                <Progress value={goal.overallProgress} className="h-1" indicatorClassName="bg-emerald-500" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                )) : <div className="text-center py-12 bg-muted/30 rounded-2xl"><p className="text-sm text-muted-foreground">Henüz aktif bir yol haritası yok.</p></div>}
                            </div>
                        </section>
                     </div>

                     {/* Sağ Kolon: Okuma İstatistikleri */}
                     <div className="space-y-8">
                        <Card className="shadow-sm border-0 bg-gradient-to-br from-card to-muted overflow-hidden">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <BarChart2 className="w-5 h-5 text-blue-500" /> Okuma Liderleri
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {readingStats.map((stat, index) => (
                                    <Link key={stat.memberId} href="/library" className="group block">
                                        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/50 dark:hover:bg-black/20 transition-colors">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm ring-2 ring-white dark:ring-zinc-800" style={{ backgroundColor: stat.color }}>
                                                {stat.name.charAt(0)}
                                            </div>
                                            <div className="flex-grow">
                                                <p className="font-semibold text-sm">{stat.name}</p>
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1"><BookCheck className="w-3 h-3" /> {stat.finishedBooks}</span>
                                                    <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {stat.pagesRead}</span>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                                        </div>
                                    </Link>
                                ))}
                            </CardContent>
                        </Card>
                     </div>
                </div>

                {/* --- Kişisel Panolar (YENİLENMİŞ BÖLÜM) --- */}
                <section className="pt-8 border-t border-border/50">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <LayoutDashboard className="w-6 h-6 text-primary" />
                                Kişisel Panolar
                            </h2>
                            <p className="text-sm text-muted-foreground">Detaylı gelişim raporları ve görevler.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setIsMemberFormOpen(true)} className="rounded-full">
                                <PlusCircle className="w-4 h-4 mr-1.5" /> Üye Ekle
                            </Button>
                        </div>
                    </div>

                    {/* Member Selector Tabs */}
                    <div className="mb-6 overflow-x-auto pb-2 scrollbar-hide">
                        <div className="flex gap-2 min-w-max">
                            {familyMembers.map((member) => (
                                <button
                                    key={member.id}
                                    onClick={() => setActiveMemberId(member.id)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-full transition-all border",
                                        activeMemberId === member.id
                                            ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                                            : "bg-card hover:bg-muted text-muted-foreground border-border hover:border-primary/50"
                                    )}
                                >
                                    <div 
                                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" 
                                        style={{ backgroundColor: member.color }}
                                    >
                                        {member.name.charAt(0)}
                                    </div>
                                    <span className="text-sm font-medium">{member.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Active Member Dashboard Content */}
                    <div className="relative min-h-[500px]">
                        {activeMember ? (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Dashboard Wrapper for Style */}
                                <div className="relative rounded-3xl overflow-hidden border border-border/50 shadow-2xl bg-white/40 dark:bg-black/20 backdrop-blur-xl">
                                    
                                    {/* Dashboard Header decoration */}
                                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/5 to-transparent -z-10 pointer-events-none"></div>
                                    
                                    <div className="p-1 sm:p-6">
                                        <div className="flex justify-end mb-4 px-4 pt-4 sm:px-0 sm:pt-0">
                                            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" onClick={() => setEditingMember(activeMember)}>
                                                <Settings2 className="w-4 h-4 mr-2" /> Profili Düzenle
                                            </Button>
                                        </div>

                                        <MemberDashboardCard
                                            member={activeMember}
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
                                            trackedBooks={trackedBooks}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-muted/30 rounded-3xl border border-dashed">
                                <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-foreground">Üye Bulunamadı</h3>
                                <p className="text-muted-foreground">Lütfen yeni bir aile üyesi ekleyin.</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* --- Dialoglar --- */}
            <Dialog open={isMemberFormOpen} onOpenChange={setIsMemberFormOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Yeni Aile Üyesi Ekle</DialogTitle>
                        <DialogDescription>Ailenize yeni bir üye ekleyin.</DialogDescription>
                    </DialogHeader>
                    <NewFamilyMemberForm onMemberAdded={() => setIsMemberFormOpen(false)} />
                </DialogContent>
            </Dialog>

            <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Profili Düzenle</DialogTitle>
                    </DialogHeader>
                    {editingMember && <EditFamilyMemberForm member={editingMember} onMemberUpdated={() => setEditingMember(null)} />}
                </DialogContent>
            </Dialog>

            <BookDetailDialog book={viewingBook} isOpen={!!viewingBook} onOpenChange={(open) => { if(!open) setViewingBook(null) }} onEdit={handleOpenEditDialog} onAddToLibrary={handleAddToLibrary} familyMembers={familyMembers} />

            <Dialog open={!!editingGoal} onOpenChange={(open) => { if (!open) { setEditingGoal(null); progressForm.reset({ progress: '' as any }); } }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Flame className="w-5 h-5 text-orange-500" /> İlerleme Ekle</DialogTitle>
                        <DialogDescription>{editingGoal?.section.title}</DialogDescription>
                    </DialogHeader>
                    <Form {...progressForm}>
                        <form onSubmit={progressForm.handleSubmit(handleProgressSubmit)} className="space-y-4">
                            <FormField control={progressForm.control} name="progress" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Miktar ({editingGoal?.goal.unitName})</FormLabel>
                                    <FormControl><Input type="number" autoFocus {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <DialogFooter><Button type="submit">Kaydet</Button></DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
