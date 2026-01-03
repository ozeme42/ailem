"use client";

import * as React from "react";
import { 
  CheckSquare, Calendar, BookOpen, ShoppingCart, UtensilsCrossed, 
  PlusCircle, ListChecks, Check, Users, Target, User, Flame, 
  BarChart2, BookCheck, Wallet, ChevronRight, LayoutDashboard, 
  Settings2, Pencil, Sparkles, Trophy, Star, Bell, Menu, ArrowLeft, GraduationCap 
} from "lucide-react";
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

// --- TASARIM SİSTEMİ: AÇIK TEMA (LIGHT GLASS) ---
const themeColors = {
    PAGE_BG: "bg-slate-50", // Sayfa arka planı
    HEADER_BG: "bg-white/80 backdrop-blur-xl border-b border-slate-200", // Header
    CARD_BG: "bg-white border border-slate-200 shadow-sm", // Kartlar
    CARD_HOVER: "hover:shadow-md hover:-translate-y-1 transition-all duration-300",
    TEXT_MAIN: "text-slate-900", // Ana metin (Siyah/Koyu Gri)
    TEXT_MUTED: "text-slate-500", // İkincil metin
    ICON_BOX: "bg-gradient-to-br p-3 rounded-2xl shadow-sm text-white", // İkon kutuları (Gradyanlar aynı kalır, text beyaz)
    SECTION_TITLE: "text-xl font-bold flex items-center gap-3 text-slate-800",
    PROGRESS_BG: "bg-slate-100",
};

const progressFormSchema = z.object({
  progress: z.coerce.number().min(1, "En az 1 birim ilerleme girilmelidir."),
});

export default function Home() {
  const { user, familyId, familyMembers, loading } = useAuth();
  const { toast } = useToast();
  
  // UI States
  const [isMemberFormOpen, setIsMemberFormOpen] = React.useState(false);
  const [editingMember, setEditingMember] = React.useState<FamilyMember | null>(null);
  const [activeMemberId, setActiveMemberId] = React.useState<string>("");
  
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
          toast({ title: "Harika Gidiyorsun! 🚀", description: `${values.progress} ${goal.unitName} daha eklendi.`, className: "bg-emerald-100 border-emerald-200 text-emerald-800" });
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

  const activeMember = familyMembers.find(m => m.id === activeMemberId) || familyMembers[0];
  const upcomingDays = React.useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(new Date(), i)), []);

  const handleOpenEditDialog = (bookToEdit: Book) => { setEditingBook(bookToEdit); setIsAddBookDialogOpen(true); };
  const handleAddToLibrary = async (bookId: string, memberId: string) => {
      if (!familyId) return;
      try {
          await addBookToMemberLibrary(familyId, memberId, bookId);
          toast({ title: "Başarılı", description: "Kitap kütüphaneye eklendi.", className: "bg-emerald-100 text-emerald-800 border-emerald-200" });
      } catch (e) { toast({ title: "Hata", variant: "destructive" }); }
  };
  
  const { pendingTests } = React.useMemo(() => {
      if (!activeMember) return { pendingTests: [] };
      const memberId = activeMember.id;
      const memberTests = tests.filter(t => t.studentId === memberId && t.status === 'Atandı');
      return { pendingTests: memberTests };
  }, [activeMember, tests]);


  if (loading) return <div className="p-8 flex items-center justify-center min-h-screen bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className={cn("min-h-screen font-sans pb-32 md:pb-10 relative overflow-hidden", themeColors.PAGE_BG, themeColors.TEXT_MAIN)}>
           
           {/* AMBIENT BACKGROUND (Light Mode için Opacity Düşürüldü) */}
           <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden opacity-40">
              <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-200/60 rounded-full blur-[120px]" />
              <div className="absolute bottom-[20%] right-[-5%] w-[400px] h-[400px] bg-fuchsia-200/60 rounded-full blur-[120px]" />
              <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] bg-blue-200/60 rounded-full blur-[100px]" />
           </div>

          {/* --- HEADER --- */}
          <div className={cn("sticky top-0 z-50 w-full transition-all duration-300", themeColors.HEADER_BG)}>
              <div className="w-full px-4">
                  <div className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-3">
                          
                          {/* MOBİL İÇİN MENÜ BUTONU */}
                          <SidebarTrigger className="md:hidden -ml-2 mr-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 p-2 rounded-lg">
                              <Menu className="w-6 h-6" />
                          </SidebarTrigger>

                          {/* DESKTOP İÇİN LOGO */}
                          <SidebarTrigger className={cn("hidden md:flex p-2 rounded-xl text-white", "bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20")}>
                               <GraduationCap className="w-6 h-6" />
                          </SidebarTrigger>
                          
                          <div className="flex flex-col">
                              <h1 className="text-xl font-black tracking-tight text-slate-800 leading-none">
                                  Özgürdere
                              </h1>
                              <span className={cn("text-[10px] font-bold uppercase tracking-widest", themeColors.TEXT_MUTED)}>Ailesi</span>
                          </div>
                      </div>

                      <div className="flex items-center gap-3">
                          <Link href="/education">
                              <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hover:bg-slate-100 text-slate-500 relative">
                                  <GraduationCap className="h-5 w-5" />
                                  {pendingTests.length > 0 && <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white"></span>}
                              </Button>
                          </Link>

                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-[2px] shadow-md shadow-indigo-500/20 cursor-pointer hover:scale-105 transition-transform">
                               <div className="h-full w-full rounded-full bg-white flex items-center justify-center">
                                  <span className="text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-purple-600 font-bold text-sm">
                                      {user?.displayName?.charAt(0) || "A"}
                                  </span>
                               </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>

          <div className="w-full space-y-8 relative z-10 pt-8">
              
              {/* --- GRID DASHBOARD --- */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-2 md:px-4">
                    
                    {/* Alışveriş Kartı */}
                    <Link href="/shopping" className="group block h-full">
                      <div className={cn("relative overflow-hidden rounded-[2rem] p-6 h-full", themeColors.CARD_BG, themeColors.CARD_HOVER)}>
                          <div className="absolute top-0 right-0 p-4 opacity-10 transition-all group-hover:scale-110">
                              <ShoppingCart className="w-24 h-24 text-emerald-500" />
                          </div>
                          <div className="relative z-10">
                              <div className="flex items-center gap-3 mb-4">
                                  <div className={cn(themeColors.ICON_BOX, "from-emerald-500 to-teal-500")}>
                                      <ShoppingCart className="w-6 h-6" />
                                  </div>
                                  <h3 className={cn("font-bold text-lg", themeColors.TEXT_MAIN)}>Alışveriş</h3>
                              </div>
                              <div className="space-y-3">
                                  {shoppingSummary.totalPending > 0 ? (
                                      <>
                                          <div className="flex flex-wrap gap-2">
                                              {shoppingSummary.itemsToShow.map(item => (
                                                  <span key={item.id} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                      {item.name}
                                                  </span>
                                              ))}
                                          </div>
                                          {shoppingSummary.totalPending > 3 && (
                                              <p className="text-xs text-emerald-600 font-bold">+ {shoppingSummary.totalPending - 3} ürün daha</p>
                                          )}
                                      </>
                                  ) : (
                                      <div className="flex items-center gap-2 text-emerald-600/70">
                                          <Check className="w-4 h-4" />
                                          <p className="text-sm font-medium">Sepet boş, her şey tamam!</p>
                                      </div>
                                  )}
                              </div>
                          </div>
                      </div>
                  </Link>

                  {/* Yemek Kartı (Carousel Slider) */}
                  <div className={cn("relative overflow-hidden rounded-[2rem] group", themeColors.CARD_BG, themeColors.CARD_HOVER)}>
                      <div className="absolute top-0 right-0 p-4 opacity-10 transition-all group-hover:scale-110">
                          <UtensilsCrossed className="w-24 h-24 text-orange-500" />
                      </div>
                      
                      <Carousel opts={{ loop: true }} className="w-full h-full">
                          <CarouselContent className="h-full">
                              {upcomingDays.map((day, index) => {
                                  const dayKey = format(day, 'yyyy-MM-dd');
                                  const plan = mealPlan[dayKey];
                                  const isTodayDay = isToday(day);

                                  return (
                                      <CarouselItem key={index} className="h-full">
                                          <Link href="/yemek" className="block h-full p-6 relative z-10 flex flex-col justify-between">
                                              <div className="flex justify-between items-start mb-2">
                                                  <div className="flex items-center gap-3">
                                                      <div className={cn(themeColors.ICON_BOX, "from-orange-500 to-amber-500")}>
                                                          <UtensilsCrossed className="w-6 h-6" />
                                                      </div>
                                                      <div>
                                                          <h3 className={cn("font-bold text-lg", themeColors.TEXT_MAIN)}>Menü</h3>
                                                          <p className={cn("text-xs font-bold uppercase tracking-wider", isTodayDay ? "text-orange-600" : themeColors.TEXT_MUTED)}>
                                                              {isTodayDay ? "Bugün" : format(day, 'EEEE', { locale: tr })}
                                                          </p>
                                                      </div>
                                                  </div>
                                                  <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-0 hover:bg-slate-200">
                                                      {format(day, 'd MMM', { locale: tr })}
                                                  </Badge>
                                              </div>

                                              <div className="space-y-3 mt-2">
                                                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                                      <p className="text-[10px] uppercase tracking-wider text-orange-400 font-bold mb-1">Kahvaltı</p>
                                                      <p className={cn("text-sm font-semibold truncate", themeColors.TEXT_MAIN)}>{plan?.['Kahvaltı']?.title || "Planlanmadı"}</p>
                                                  </div>
                                                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                                      <p className="text-[10px] uppercase tracking-wider text-orange-400 font-bold mb-1">Akşam</p>
                                                      <p className={cn("text-sm font-semibold truncate", themeColors.TEXT_MAIN)}>{plan?.['Akşam Yemeği']?.title || "Planlanmadı"}</p>
                                                  </div>
                                              </div>
                                          </Link>
                                      </CarouselItem>
                                  );
                              })}
                          </CarouselContent>
                          <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-white border border-slate-200 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-100" />
                          <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-white border border-slate-200 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-100" />
                      </Carousel>
                  </div>

                  {/* Finans Slider */}
                  <div className={cn("col-span-1 sm:col-span-2 relative overflow-hidden rounded-[2rem]", themeColors.CARD_BG, themeColors.CARD_HOVER)}>
                      <Link href="/budget" className="block h-full relative z-10">
                          <Carousel opts={{ loop: true, startIndex: 4 }} className="w-full h-full">
                              <CarouselContent className="h-full">
                                  {monthlyBudgetSummary.map((summary, index) => (
                                      <CarouselItem key={index} className="h-full">
                                          <div className="p-6 h-full flex flex-col justify-between">
                                              <div className="flex items-center justify-between">
                                                  <div className="flex items-center gap-3">
                                                      <div className={cn(themeColors.ICON_BOX, "from-indigo-500 to-blue-500")}>
                                                          <Wallet className="w-6 h-6" />
                                                      </div>
                                                      <div>
                                                          <h3 className={cn("font-bold text-lg", themeColors.TEXT_MAIN)}>{summary.monthName}</h3>
                                                          <p className={cn("text-xs font-medium", themeColors.TEXT_MUTED)}>Finansal Durum</p>
                                                      </div>
                                                  </div>
                                              </div>
                                              <div className="grid grid-cols-3 gap-4 mt-6">
                                                  <div className="bg-slate-50 p-3 rounded-2xl text-center border border-slate-200">
                                                      <p className="text-xs text-slate-500 font-semibold mb-1">Gelir</p>
                                                      <p className="text-lg font-black text-emerald-600">{summary.income.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</p>
                                                  </div>
                                                  <div className="bg-slate-50 p-3 rounded-2xl text-center border border-slate-200">
                                                      <p className="text-xs text-slate-500 font-semibold mb-1">Gider</p>
                                                      <p className="text-lg font-black text-rose-500">{summary.expense.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</p>
                                                  </div>
                                                  <div className="bg-slate-50 p-3 rounded-2xl text-center border border-slate-200">
                                                      <p className="text-xs text-slate-500 font-semibold mb-1">Kalan</p>
                                                      <p className={cn("text-lg font-black", summary.net < 0 ? 'text-rose-600' : 'text-blue-600')}>{summary.net.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</p>
                                                  </div>
                                              </div>
                                          </div>
                                      </CarouselItem>
                                  ))}
                              </CarouselContent>
                              <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100" />
                              <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100" />
                          </Carousel>
                      </Link>
                  </div>

                  {/* Takvim ve Görevler */}
                  <div className="grid grid-cols-2 gap-4 col-span-1 sm:col-span-2 lg:col-span-4 xl:col-span-4">
                      {/* Takvim */}
                      <Link href="/calendar" className="group block">
                          <div className={cn("h-full rounded-[2rem] p-6", themeColors.CARD_BG, themeColors.CARD_HOVER)}>
                              <div className="flex items-center gap-3 mb-4">
                                   <div className={cn(themeColors.ICON_BOX, "from-pink-500 to-rose-500")}>
                                      <Calendar className="w-5 h-5" />
                                   </div>
                                   <h3 className={cn("font-bold", themeColors.TEXT_MAIN)}>Etkinlikler</h3>
                              </div>
                              {calendarSummary.upcomingEvents.length > 0 ? (
                                  <div className="space-y-3">
                                      {calendarSummary.upcomingEvents.slice(0, 2).map(event => (
                                          <div key={event.id} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                              <span className={cn("truncate font-semibold text-sm", themeColors.TEXT_MAIN)}>{event.title}</span>
                                              <Badge variant="secondary" className={cn("bg-white text-xs font-bold border border-slate-200", event.daysLeft <= 1 ? "text-rose-600 bg-rose-50" : "text-pink-600 bg-pink-50")}>
                                                  {event.daysLeft === 0 ? "Bugün" : `${event.daysLeft} gün`}
                                              </Badge>
                                          </div>
                                      ))}
                                  </div>
                              ) : <p className={cn("text-sm font-medium", themeColors.TEXT_MUTED)}>Yaklaşan etkinlik yok.</p>}
                          </div>
                      </Link>

                      {/* Görevler */}
                      <Link href="/tasks" className="group block">
                          <div className={cn("h-full rounded-[2rem] p-6", themeColors.CARD_BG, themeColors.CARD_HOVER)}>
                              <div className="flex items-center justify-between mb-2">
                                   <div className="flex items-center gap-3">
                                      <div className={cn(themeColors.ICON_BOX, "from-violet-500 to-purple-500")}>
                                          <ListChecks className="w-5 h-5" />
                                      </div>
                                      <h3 className={cn("font-bold", themeColors.TEXT_MAIN)}>Görevler</h3>
                                   </div>
                              </div>
                              <div className="flex flex-col items-center justify-center py-2">
                                  <div className="text-4xl font-black text-violet-600">{tasks.filter(t => !t.completed).length}</div>
                                  <p className={cn("text-xs font-bold uppercase tracking-widest mt-1", themeColors.TEXT_MUTED)}>Bekleyen</p>
                              </div>
                          </div>
                      </Link>
                  </div>
              </div>

              {/* --- ORTA BÖLÜM: Hedefler ve Kitaplar --- */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-2 md:px-4">
                    <div className="lg:col-span-2 space-y-6">
                      {/* Kitaplar */}
                      <section className={cn("rounded-[2rem] p-6", themeColors.CARD_BG)}>
                          <div className="flex items-center justify-between mb-6">
                              <h2 className={themeColors.SECTION_TITLE}>
                                  <div className={cn(themeColors.ICON_BOX, "from-amber-500 to-orange-500")}><BookOpen className="w-5 h-5" /></div>
                                  Kütüphane
                              </h2>
                              <Link href="/library/archive" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full transition-colors border border-indigo-100">Tümü</Link>
                          </div>
                          <div className="relative group">
                              <div className="flex overflow-x-auto gap-5 px-2 pb-4 snap-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                  {latestBooks.map(book => (
                                      <div key={book.id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViewingBook(book); }} className="snap-start shrink-0 w-32 md:w-36 group/book cursor-pointer">
                                          <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-md transition-all duration-300 group-hover/book:shadow-xl group-hover/book:-translate-y-2 ring-1 ring-slate-200">
                                              <Image src={book.image || `https://placehold.co/300x450.png`} alt={book.title} width={300} height={450} className="w-full h-full object-cover" />
                                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/book:opacity-100 transition-opacity duration-300 flex items-end p-3">
                                                  <p className="text-white text-xs font-bold line-clamp-2">{book.title}</p>
                                              </div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </section>

                      {/* Hedefler */}
                      <section className={cn("rounded-[2rem] p-6", themeColors.CARD_BG)}>
                          <div className="flex items-center justify-between mb-6">
                              <h2 className={themeColors.SECTION_TITLE}>
                                  <div className={cn(themeColors.ICON_BOX, "from-rose-500 to-pink-500")}><Target className="w-5 h-5" /></div>
                                  Aktif Hedefler
                              </h2>
                          </div>
                          <div className="grid gap-5">
                              {activeGoals.length > 0 ? activeGoals.map(goal => (
                                  <div key={goal.id} className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-sm p-6 group hover:shadow-md transition-all">
                                          <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-rose-500 to-purple-500"></div>
                                          <div className="pl-4">
                                              <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center mb-5">
                                                  <div className="space-y-1">
                                                      <div className="flex items-center gap-2">
                                                          <Link href={`/goals/${goal.id}`} className={cn("font-bold text-lg hover:text-rose-600 transition-colors", themeColors.TEXT_MAIN)}>{goal.title}</Link>
                                                          {goal.isVideoGoal && <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wider border border-red-200">VIDEO</span>}
                                                      </div>
                                                      <div className={cn("flex items-center gap-2 text-sm font-medium", themeColors.TEXT_MUTED)}>
                                                          <User className="w-3.5 h-3.5" /> {goal.assignee?.name}
                                                      </div>
                                                  </div>
                                                  {goal.currentSection && goal.currentSection.status !== 'completed' && (
                                                      <Button size="sm" className="bg-rose-600 hover:bg-rose-700 text-white rounded-full px-5 shadow-md" onClick={() => setEditingGoal({ goal, section: goal.currentSection! })}>
                                                          <Flame className="w-4 h-4 mr-1.5" /> İlerleme
                                                      </Button>
                                                  )}
                                              </div>
                                              <div className="space-y-4">
                                                  {goal.currentSection && (
                                                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                          <div className="flex justify-between text-xs font-bold mb-2">
                                                              <span className={cn("truncate pr-2", themeColors.TEXT_MAIN)}>{goal.currentSection.title}</span>
                                                              <span className="text-rose-500">{goal.currentSection.completedUnits || 0} / {goal.currentSection.sectionTotalUnits} {goal.unitName}</span>
                                                          </div>
                                                          <Progress value={goal.sectionProgress || 0} className={cn("h-3 rounded-full", themeColors.PROGRESS_BG)} indicatorClassName="bg-gradient-to-r from-rose-500 to-orange-500" />
                                                      </div>
                                                  )}
                                                  <div>
                                                      <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                                          <span>Genel İlerleme</span>
                                                          <span>%{Math.round(goal.overallProgress)}</span>
                                                      </div>
                                                      <Progress value={goal.overallProgress} className={cn("h-1.5 rounded-full", themeColors.PROGRESS_BG)} indicatorClassName="bg-emerald-500" />
                                                  </div>
                                              </div>
                                          </div>
                                  </div>
                              )) : (
                                  <div className="text-center py-16 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                      <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                      <p className={cn("text-sm font-medium", themeColors.TEXT_MUTED)}>Henüz aktif bir yol haritası yok.</p>
                                  </div>
                              )}
                          </div>
                      </section>
                    </div>

                    {/* Sağ Kolon: Liderlik Tablosu */}
                    <div className="space-y-6">
                      <div className={cn("rounded-[2rem] p-6 overflow-hidden relative", themeColors.CARD_BG)}>
                          {/* Dekoratif daireler (Açık tema için daha hafif) */}
                          <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-100 rounded-full blur-2xl opacity-50"></div>
                          <div className="absolute bottom-10 -left-10 w-24 h-24 bg-fuchsia-100 rounded-full blur-xl opacity-50"></div>
                          
                          <div className="relative z-10">
                              <div className="flex items-center gap-3 mb-6">
                                  <div className={cn(themeColors.ICON_BOX, "from-yellow-500 to-amber-500")}>
                                      <Trophy className="w-6 h-6" />
                                  </div>
                                  <h2 className={cn("text-lg font-bold", themeColors.TEXT_MAIN)}>Okuma Liderleri</h2>
                              </div>
                              <div className="space-y-4">
                                  {readingStats.map((stat, index) => (
                                      <Link key={stat.memberId} href="/library" className="group block">
                                          <div className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all border border-slate-100 hover:border-slate-200">
                                              <div className="relative">
                                                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-black text-white shadow-md ring-2 ring-white" style={{ backgroundColor: stat.color }}>
                                                      {stat.name.charAt(0)}
                                                  </div>
                                                  {index === 0 && <div className="absolute -top-1 -right-1 bg-yellow-400 text-white rounded-full p-0.5 shadow-sm"><Star className="w-3 h-3 fill-current" /></div>}
                                              </div>
                                              <div className="flex-grow">
                                                  <p className={cn("font-bold text-sm", themeColors.TEXT_MAIN)}>{stat.name}</p>
                                                  <div className="flex items-center gap-3 text-xs text-blue-600 font-medium mt-1">
                                                      <span className="flex items-center gap-1"><BookCheck className="w-3.5 h-3.5 opacity-70" /> {stat.finishedBooks} Kitap</span>
                                                  </div>
                                              </div>
                                              <div className="text-right">
                                                  <span className={cn("block text-lg font-black", themeColors.TEXT_MAIN)}>{stat.pagesRead}</span>
                                                  <span className={cn("text-[10px] uppercase font-bold", themeColors.TEXT_MUTED)}>Sayfa</span>
                                              </div>
                                          </div>
                                      </Link>
                                  ))}
                              </div>
                          </div>
                      </div>
                    </div>
              </div>

              {/* --- KİŞİSEL PANOLAR --- */}
              <section className="pt-10 px-2 md:px-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 gap-4">
                      <div>
                          <h2 className={cn("text-3xl font-black flex items-center gap-3", themeColors.TEXT_MAIN)}>
                              <LayoutDashboard className="w-8 h-8 text-indigo-600" />
                              Kişisel Panolar
                          </h2>
                          <p className={cn("font-medium mt-1 ml-11", themeColors.TEXT_MUTED)}>Bireysel gelişim raporları ve görevler.</p>
                      </div>
                      <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => setIsMemberFormOpen(true)} className="rounded-full border-dashed border-slate-300 text-slate-500 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50">
                              <PlusCircle className="w-4 h-4 mr-1.5" /> Üye Ekle
                          </Button>
                      </div>
                  </div>

                  {/* Member Tabs (Carousel Slider) */}
                  <div className="mb-8 px-10 relative"> 
                      <Carousel opts={{ align: "start", dragFree: true }} className="w-full">
                          <CarouselContent className="-ml-2">
                              {familyMembers.map((member) => (
                                  <CarouselItem key={member.id} className="pl-2 basis-auto">
                                      <button
                                          onClick={() => setActiveMemberId(member.id)}
                                          className={cn(
                                              "flex items-center gap-3 pl-2 pr-5 py-2 rounded-full transition-all duration-300 border font-bold whitespace-nowrap",
                                              activeMemberId === member.id
                                                  ? "bg-slate-900 text-white border-slate-900 shadow-lg scale-105"
                                                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700 hover:bg-slate-50"
                                          )}
                                      >
                                          <div
                                              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
                                              style={{ backgroundColor: member.color }}
                                          >
                                              {member.name.charAt(0)}
                                          </div>
                                          <span className="text-sm">{member.name}</span>
                                      </button>
                                  </CarouselItem>
                              ))}
                          </CarouselContent>
                          <CarouselPrevious className="absolute -left-10 h-10 w-10 bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900" />
                          <CarouselNext className="absolute -right-10 h-10 w-10 bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900" />
                      </Carousel>
                  </div>

                  {/* Active Member Content */}
                  <div className="relative min-h-[500px]">
                      {activeMember ? (
                          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                              <div className={cn("relative rounded-[2.5rem] overflow-hidden shadow-xl", themeColors.CARD_BG)}>
                                  {/* Dashboard Üst Renk Bandı */}
                                  <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-indigo-50/80 to-transparent -z-10 pointer-events-none"></div>
                                  
                                  <div className="p-2 sm:p-8">
                                      <div className="flex justify-end mb-2 sm:mb-6 px-4 pt-4 sm:px-0 sm:pt-0">
                                          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full" onClick={() => setEditingMember(activeMember)}>
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
                          <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                              <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                              <h3 className={cn("text-lg font-bold", themeColors.TEXT_MAIN)}>Üye Bulunamadı</h3>
                              <p className={themeColors.TEXT_MUTED}>Lütfen yeni bir aile üyesi ekleyin.</p>
                          </div>
                      )}
                  </div>
              </section>
          </div>

          {/* --- Dialoglar --- */}
          <Dialog open={isMemberFormOpen} onOpenChange={setIsMemberFormOpen}>
              <DialogContent className="sm:max-w-md rounded-3xl bg-white text-slate-900">
                  <DialogHeader>
                      <DialogTitle className="text-xl font-bold">Yeni Aile Üyesi Ekle</DialogTitle>
                      <DialogDescription className="text-slate-500">Ailenize yeni bir üye ekleyin.</DialogDescription>
                  </DialogHeader>
                  <div className="text-slate-900 [&_label]:text-slate-700 [&_input]:bg-slate-50 [&_input]:border-slate-200">
                      <NewFamilyMemberForm onMemberAdded={() => setIsMemberFormOpen(false)} />
                  </div>
              </DialogContent>
          </Dialog>

          <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
              <DialogContent className="sm:max-w-md rounded-3xl bg-white text-slate-900">
                  <DialogHeader>
                      <DialogTitle className="text-xl font-bold">Profili Düzenle</DialogTitle>
                  </DialogHeader>
                  <div className="text-slate-900 [&_label]:text-slate-700 [&_input]:bg-slate-50 [&_input]:border-slate-200">
                      {editingMember && <EditFamilyMemberForm member={editingMember} onMemberUpdated={() => setEditingMember(null)} />}
                  </div>
              </DialogContent>
          </Dialog>

          <BookDetailDialog book={viewingBook} isOpen={!!viewingBook} onOpenChange={(open) => { if(!open) setViewingBook(null) }} onEdit={handleOpenEditDialog} onAddToLibrary={handleAddToLibrary} familyMembers={familyMembers} />

          <Dialog open={!!editingGoal} onOpenChange={(open) => { if (!open) { setEditingGoal(null); progressForm.reset({ progress: '' as any }); } }}>
              <DialogContent className="sm:max-w-md rounded-3xl border border-slate-200 bg-white text-slate-900">
                  <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-rose-600"><Flame className="w-5 h-5 fill-rose-600" /> İlerleme Ekle</DialogTitle>
                      <DialogDescription className="font-medium text-slate-500">{editingGoal?.section.title}</DialogDescription>
                  </DialogHeader>
                  <Form {...progressForm}>
                      <form onSubmit={progressForm.handleSubmit(handleProgressSubmit)} className="space-y-4">
                          <FormField control={progressForm.control} name="progress" render={({ field }) => (
                              <FormItem>
                                  <FormLabel className="font-bold text-slate-700">Miktar ({editingGoal?.goal.unitName})</FormLabel>
                                  <FormControl><Input type="number" className="rounded-xl bg-slate-50 border-slate-200 text-slate-900 focus:ring-rose-500" autoFocus {...field} /></FormControl>
                                  <FormMessage />
                              </FormItem>
                          )} />
                          <DialogFooter><Button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white rounded-xl py-6 text-lg font-bold shadow-md">Kaydet</Button></DialogFooter>
                      </form>
                  </Form>
              </DialogContent>
          </Dialog>
    </div>
  );
}