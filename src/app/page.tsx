"use client";

import * as React from "react";
import { 
  CheckSquare, Calendar, BookOpen, ShoppingCart, UtensilsCrossed, 
  PlusCircle, ListChecks, Check, Users, Target, User, Flame, 
  BarChart2, BookCheck, ChevronRight, LayoutDashboard, 
  Settings2, Pencil, Sparkles, Trophy, Star, Bell, Menu, ArrowLeft, GraduationCap, Sun, Moon, PlaySquare 
} from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/components/auth-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { FamilyMember, ShoppingList, MealPlan, CalendarEvent, Task, UserLibrary, Book, Test, StudyAssignment, Goal, GoalSection, StudyPlan, MemorizationProgress, MemorizationItem, PrayerProgress, Video, ReadingSession, TrackedBook } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NewFamilyMemberForm } from "@/components/new-family-member-form";
import { EditFamilyMemberForm } from "@/components/edit-family-member-form";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { onShoppingListsUpdate, onMealPlanUpdate, onCalendarEventsUpdate, onTasksUpdate, onUserLibrariesUpdate, onBooksUpdate, onTestsUpdate, onStudyAssignmentsUpdate, onGoalsUpdate, updateGoal, onStudyPlansUpdate, addBookToMemberLibrary, onMemorizationItemsUpdate, onMemorizationProgressUpdate, onPrayerProgressUpdate, onVideosUpdate, onReadingSessionsUpdate, onTrackedBooksUpdate, updateBook, updateTags, onTagsUpdate } from "@/lib/dataService";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FormProvider } from "react-hook-form";
import { BookForm, BookFormData } from "@/components/new-book-form";

// --- TASARIM SİSTEMİ: DİNAMİK TEMA SINIFLARI ---
const themeClasses = {
  PAGE_BG: "bg-slate-50 dark:bg-slate-950", 
  HEADER_BG: "bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 supports-[backdrop-filter]:bg-white/60",
  CARD_BG: "bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm",
  CARD_HOVER: "active:scale-[0.98] md:active:scale-100 hover:shadow-md md:hover:-translate-y-1 transition-all duration-300 dark:hover:shadow-slate-800/50",
  TEXT_MAIN: "text-slate-900 dark:text-slate-50",
  TEXT_MUTED: "text-slate-500 dark:text-slate-400",
  ICON_BOX: "bg-gradient-to-br p-2 md:p-3 rounded-xl md:rounded-2xl shadow-sm text-white flex-shrink-0",
  SECTION_TITLE: "text-lg md:text-xl font-bold flex items-center gap-2 md:gap-3 text-slate-800 dark:text-slate-200",
  PROGRESS_BG: "bg-slate-100 dark:bg-slate-800",
};

const progressFormSchema = z.object({
  progress: z.coerce.number().min(1, "En az 1 birim ilerleme girilmelidir."),
});

const bookFormSchema = z.object({
  title: z.string().min(2, "Kitap adı en az 2 karakter olmalıdır."),
  author: z.string().optional(),
  pageCount: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.coerce.number().min(1, "Sayfa sayısı pozitif bir sayı olmalı.").optional()
  ),
  isForChildren: z.boolean().default(false),
  image: z.string().optional(),
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
  rating: z.number().optional(),
});

export default function Home() {
  const { setTheme, theme } = useTheme();
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
  const [readingSessions, setReadingSessions] = React.useState<ReadingSession[]>([]);
  const [trackedBooks, setTrackedBooks] = React.useState<TrackedBook[]>([]);

  const [viewingBook, setViewingBook] = React.useState<Book | null>(null);
  const [isAddBookDialogOpen, setIsAddBookDialogOpen] = React.useState(false);
  const [editingBook, setEditingBook] = React.useState<Book | null>(null);
  const [editingGoal, setEditingGoal] = React.useState<{ goal: Goal; section: GoalSection } | null>(null);
  const [allTags, setAllTags] = React.useState<string[]>([]);
  const [isSubmittingBook, setIsSubmittingBook] = React.useState(false);

  const progressForm = useForm<z.infer<typeof progressFormSchema>>({
      resolver: zodResolver(progressFormSchema),
      defaultValues: { progress: '' as any },
  });

  const bookFormMethods = useForm<BookFormData>({ resolver: zodResolver(bookFormSchema) });

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
      const unsubSessions = onReadingSessionsUpdate(setReadingSessions);
      const unsubLibraries = onUserLibrariesUpdate(familyId, setUserLibraries);
      const unsubTrackedBooks = onTrackedBooksUpdate(setTrackedBooks);
      const unsubTags = onTagsUpdate("libraryTags", setAllTags);

      return () => {
          unsubShopping(); unsubMeal(); unsubCalendar(); unsubTasks(); unsubTests();
          unsubStudyAssignments(); unsubStudyPlans(); unsubLibraries(); unsubBooks();
          unsubVideos(); unsubGoals(); unsubMemorizationItems(); unsubMemorizationProgress();
          unsubPrayerProgress(); unsubSessions(); unsubTrackedBooks(); unsubTags();
      };
  }, [familyId]);

  const handleProgressSubmit = async (values: z.infer<typeof progressFormSchema>) => {
      if (!editingGoal) return;
      const { goal, section } = editingGoal;
      const newCompletedUnits = (section.completedUnits || 0) + values.progress;
      const sectionProgress = Math.min(newCompletedUnits, section.sectionTotalUnits);
      const newSections = goal.sections.map(s => s.id === section.id ? { ...s, completedUnits: sectionProgress } : s);
      
      try {
          await updateGoal(goal.id, { sections: newSections });
          toast({ title: "Harika Gidiyorsun! 🚀", description: `${values.progress} ${goal.unitName} daha eklendi.`, className: "bg-emerald-100 border-emerald-200 text-emerald-800 dark:bg-emerald-900/50 dark:border-emerald-800 dark:text-emerald-200" });
          setEditingGoal(null);
          progressForm.reset({ progress: '' as any });
      } catch(e) {
          toast({ title: "Hata", variant: 'destructive' });
      }
  };

  const todaysPlan = mealPlan[format(new Date(), 'yyyy-MM-dd')];
  const shoppingSummary = React.useMemo(() => {
      const allPendingItems = shoppingLists.flatMap(list => list.items?.filter(item => !item.isBought) || []);
      return { totalPending: allPendingItems.length, itemsToShow: allPendingItems.slice(0, 2) }; // Mobilde daha az göster
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

  const handleOpenEditDialog = (bookToEdit: Book) => { 
      setEditingBook(bookToEdit); 
      bookFormMethods.reset({
        title: bookToEdit.title,
        author: bookToEdit.author,
        pageCount: bookToEdit.pageCount,
        image: bookToEdit.image,
        isForChildren: bookToEdit.isForChildren,
        tags: bookToEdit.tags || [],
        description: bookToEdit.description || '',
        rating: bookToEdit.rating || 0,
      });
      setIsAddBookDialogOpen(true); 
  };
  
  const handleUpdateBook = async (formData: BookFormData) => {
      if (!editingBook) return;
      setIsSubmittingBook(true);
      try {
          const bookData: any = { ...formData };
          if (bookData.pageCount === undefined) delete bookData.pageCount;
          
          const newTags = new Set([...allTags, ...(bookData.tags || [])]);
          await updateTags(Array.from(newTags));
          await updateBook(editingBook.id, bookData);
          
          toast({ title: "Başarılı", description: "Kitap güncellendi.", className: "bg-emerald-100 text-emerald-800" });
          setIsAddBookDialogOpen(false);
          setEditingBook(null);
      } catch (e) {
          toast({ title: "Hata", description: "Güncellenirken bir sorun oluştu", variant: 'destructive' });
      } finally {
          setIsSubmittingBook(false);
      }
  };

  const handleAddToLibrary = async (bookId: string, memberId: string) => {
      if (!familyId) return;
      try {
          await addBookToMemberLibrary(familyId, memberId, bookId);
          toast({ title: "Başarılı", description: "Kitap kütüphaneye eklendi.", className: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/50 dark:border-emerald-800 dark:text-emerald-200" });
      } catch (e) { toast({ title: "Hata", variant: "destructive" }); }
  };
  
  const { pendingTests } = React.useMemo(() => {
      if (!activeMember) return { pendingTests: [] };
      const memberId = activeMember.id;
      const memberTests = tests.filter(t => t.studentId === memberId && t.status === 'Atandı');
      return { pendingTests: memberTests };
  }, [activeMember, tests]);


  if (loading) return <div className="p-8 flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>;

return (
    <div className={cn("min-h-screen font-sans pb-28 md:pb-10 relative overflow-x-hidden transition-colors duration-300", themeClasses.PAGE_BG, themeClasses.TEXT_MAIN)}>

      {/* AMBIENT BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-30 dark:opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-indigo-300/60 dark:bg-indigo-900/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] right-[-5%] w-[350px] h-[350px] bg-fuchsia-300/60 dark:bg-fuchsia-900/40 rounded-full blur-[100px]" />
      </div>

      {/* ──────────────────────────────
          HEADER
      ────────────────────────────── */}
      <div className={cn("sticky top-0 z-50 w-full transition-all duration-300", themeClasses.HEADER_BG)}>
        <div className="w-full px-4 md:px-6">
          <div className="flex items-center justify-between py-3 md:py-4">
            <div className="flex items-center gap-2 md:gap-3">
              <SidebarTrigger className="md:hidden text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-full transition-colors">
                <Menu className="w-5 h-5" />
              </SidebarTrigger>
              <SidebarTrigger className={cn("hidden md:flex p-2.5 rounded-xl text-white", "bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20")}>
                <GraduationCap className="w-5 h-5" />
              </SidebarTrigger>
              <div className="flex flex-col ml-1 md:ml-0">
                <h1 className="text-lg md:text-xl font-black tracking-tight text-slate-800 dark:text-slate-100 leading-none">Özgürdere</h1>
                <span className={cn("text-[9px] md:text-[10px] font-bold uppercase tracking-widest", themeClasses.TEXT_MUTED)}>Ailesi</span>
              </div>
            </div>

            <div className="flex items-center gap-1 md:gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400">
                    <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl">
                  <DropdownMenuItem onClick={() => setTheme("light")} className="rounded-xl m-1 py-3">Açık</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")} className="rounded-xl m-1 py-3">Koyu</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")} className="rounded-xl m-1 py-3">Sistem</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Link href="/education">
                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 relative">
                  <GraduationCap className="h-5 w-5" />
                  {pendingTests.length > 0 && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />}
                </Button>
              </Link>

              <div className="h-9 w-9 ml-1 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-[2px] shadow-sm cursor-pointer hover:scale-105 active:scale-95 transition-transform">
                <div className="h-full w-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center">
                  <span className="text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-purple-600 font-bold text-xs">
                    {user?.displayName?.charAt(0) || "A"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 space-y-6 pt-5 md:pt-8">

        {/* ──────────────────────────────
            HERO — Kişisel Karşılama
        ────────────────────────────── */}

        <div className="px-4 md:px-6">
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-5 md:p-8 text-white shadow-xl shadow-indigo-500/20">
            <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 -left-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />

            {/* Tarih + Selamlama */}
            <div className="relative z-10 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-white/70 text-xs font-semibold mb-0.5">
                  {format(new Date(), "d MMMM, EEEE", { locale: tr })}
                </p>
                <h2 className="text-xl md:text-3xl font-black leading-tight">
                  {new Date().getHours() < 12 ? "Günaydın ☀️" : new Date().getHours() < 18 ? "İyi günler 🌤️" : "İyi akşamlar 🌙"}
                </h2>
                <p className="text-white/80 text-sm font-medium mt-0.5 truncate">
                  {user?.displayName || "Hoş geldiniz"}!
                </p>
              </div>
              {/* Kullanıcı avatarı */}
              <div className="shrink-0 w-12 h-12 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-xl font-black backdrop-blur-sm">
                {user?.displayName?.charAt(0)?.toUpperCase() || "👋"}
              </div>
            </div>

            {/* 2×2 İstatistik Grid — kaydırma olmadan sığar */}
            <div className="relative z-10 grid grid-cols-2 gap-2 mt-4">
              {[
                { label: "Bekleyen Görev", value: tasks.filter(t => !t.completed).length, emoji: "📋" },
                { label: "Aktif Hedef",    value: activeGoals.length,                     emoji: "🎯" },
                { label: "Alışveriş",      value: shoppingSummary.totalPending,            emoji: "🛒" },
                { label: "Kütüphane",      value: books.length,                            emoji: "📚" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border border-white/20 bg-white/15 backdrop-blur-sm">
                  <span className="text-lg leading-none">{item.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-base font-black leading-none">{item.value}</p>
                    <p className="text-[10px] font-bold text-white/75 leading-tight mt-0.5 truncate">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>


        {/* ──────────────────────────────
            ANA ÖZELLİK KARTLARI (2×2)
        ────────────────────────────── */}
        <div className="px-4 md:px-6">
          <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">

            {/* Alışveriş */}
            <Link href="/shopping" className="group block">
              <div className={cn("relative overflow-hidden rounded-[1.75rem] p-5 h-full flex flex-col min-h-[140px] md:min-h-[160px]", themeClasses.CARD_BG, themeClasses.CARD_HOVER)}>
                <div className="absolute -top-4 -right-4 opacity-[0.07]">
                  <ShoppingCart className="w-24 h-24 text-emerald-500" />
                </div>
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3 shadow-sm bg-gradient-to-br from-emerald-500 to-teal-500">
                  <ShoppingCart className="w-5 h-5 text-white" />
                </div>
                <h3 className={cn("font-black text-sm md:text-base mb-1", themeClasses.TEXT_MAIN)}>Alışveriş</h3>
                <div className="mt-auto">
                  {shoppingSummary.totalPending > 0 ? (
                    <p className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">{shoppingSummary.totalPending} ürün bekliyor</p>
                  ) : (
                    <p className="text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Tamamlandı</p>
                  )}
                </div>
              </div>
            </Link>

            {/* Menü */}
            <div className={cn("relative overflow-hidden rounded-[1.75rem] group h-full min-h-[140px] md:min-h-[160px]", themeClasses.CARD_BG, themeClasses.CARD_HOVER)}>
              <div className="absolute -top-4 -right-4 opacity-[0.07] pointer-events-none">
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
                        <Link href="/yemek" className="block h-full p-5 flex flex-col">
                          <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3 shadow-sm bg-gradient-to-br from-orange-500 to-amber-500">
                            <UtensilsCrossed className="w-5 h-5 text-white" />
                          </div>
                          <h3 className={cn("font-black text-sm md:text-base mb-1", themeClasses.TEXT_MAIN)}>
                            {isTodayDay ? "Bugünkü Menü" : format(day, 'EEEE', { locale: tr }).slice(0, 3) + " Menüsü"}
                          </h3>
                          <p className={cn("text-xs font-semibold mt-auto truncate", themeClasses.TEXT_MUTED)}>
                            {plan?.['Akşam Yemeği']?.title || "Planlanmadı"}
                          </p>
                        </Link>
                      </CarouselItem>
                    );
                  })}
                </CarouselContent>
              </Carousel>
            </div>

            {/* Takvim */}
            <Link href="/calendar" className="group block">
              <div className={cn("relative overflow-hidden rounded-[1.75rem] p-5 h-full flex flex-col min-h-[140px] md:min-h-[160px]", themeClasses.CARD_BG, themeClasses.CARD_HOVER)}>
                <div className="absolute -top-4 -right-4 opacity-[0.07]">
                  <Calendar className="w-24 h-24 text-pink-500" />
                </div>
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3 shadow-sm bg-gradient-to-br from-pink-500 to-rose-500">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <h3 className={cn("font-black text-sm md:text-base mb-1", themeClasses.TEXT_MAIN)}>Etkinlik</h3>
                <div className="mt-auto">
                  {calendarSummary.upcomingEvents.length > 0 ? (
                    <div>
                      <p className={cn("text-xs font-semibold truncate", themeClasses.TEXT_MAIN)}>{calendarSummary.upcomingEvents[0].title}</p>
                      <p className="text-pink-600 dark:text-pink-400 text-[10px] font-bold mt-0.5">
                        {calendarSummary.upcomingEvents[0].daysLeft === 0 ? "Bugün!" : `${calendarSummary.upcomingEvents[0].daysLeft} gün sonra`}
                      </p>
                    </div>
                  ) : (
                    <p className={cn("text-xs font-medium", themeClasses.TEXT_MUTED)}>Yaklaşan etkinlik yok</p>
                  )}
                </div>
              </div>
            </Link>

            {/* Görevler */}
            <Link href="/tasks" className="group block">
              <div className={cn("relative overflow-hidden rounded-[1.75rem] p-5 h-full flex flex-col min-h-[140px] md:min-h-[160px]", themeClasses.CARD_BG, themeClasses.CARD_HOVER)}>
                <div className="absolute -top-4 -right-4 opacity-[0.07]">
                  <ListChecks className="w-24 h-24 text-violet-500" />
                </div>
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3 shadow-sm bg-gradient-to-br from-violet-500 to-purple-600">
                  <ListChecks className="w-5 h-5 text-white" />
                </div>
                <h3 className={cn("font-black text-sm md:text-base mb-1", themeClasses.TEXT_MAIN)}>Görevler</h3>
                <div className="mt-auto flex items-end gap-2">
                  <span className="text-3xl font-black text-violet-600 dark:text-violet-400 leading-none">{tasks.filter(t => !t.completed).length}</span>
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider mb-1", themeClasses.TEXT_MUTED)}>Bekleyen</span>
                </div>
              </div>
            </Link>
          </div>

          {/* İkinci Satır: Notlar ve Videolar */}
          <div className="grid grid-cols-2 gap-3 md:gap-4 mt-3 md:mt-4">
            <Link href="/notes" className={cn("group block rounded-[1.75rem] p-5 relative overflow-hidden", themeClasses.CARD_BG, themeClasses.CARD_HOVER)}>
              <div className="absolute -top-4 -right-4 opacity-[0.07]"><BookCheck className="w-20 h-20 text-amber-500" /></div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0 bg-gradient-to-br from-amber-400 to-amber-600">
                  <BookCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className={cn("font-black text-sm", themeClasses.TEXT_MAIN)}>Notlar</h3>
                  <p className={cn("text-[10px] font-medium", themeClasses.TEXT_MUTED)}>Çalışma notları</p>
                </div>
              </div>
            </Link>

            <Link href="/videos" className={cn("group block rounded-[1.75rem] p-5 relative overflow-hidden", themeClasses.CARD_BG, themeClasses.CARD_HOVER)}>
              <div className="absolute -top-4 -right-4 opacity-[0.07]"><PlaySquare className="w-20 h-20 text-rose-500" /></div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0 bg-gradient-to-br from-rose-400 to-rose-600">
                  <PlaySquare className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className={cn("font-black text-sm", themeClasses.TEXT_MAIN)}>Videolar</h3>
                  <p className={cn("text-[10px] font-medium", themeClasses.TEXT_MUTED)}>Eğitim videoları</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* ──────────────────────────────
            KÜTÜPHANEarband
        ────────────────────────────── */}
        <div className="px-4 md:px-6">
          <div className={cn("rounded-[2rem] p-5 md:p-6", themeClasses.CARD_BG)}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm bg-gradient-to-br from-amber-500 to-orange-500">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className={cn("font-black text-base", themeClasses.TEXT_MAIN)}>Kütüphane</h2>
                  <p className={cn("text-[10px] font-bold uppercase tracking-wider", themeClasses.TEXT_MUTED)}>{books.length} kitap</p>
                </div>
              </div>
              <Link href="/library/archive" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1.5 rounded-full border border-indigo-100 dark:border-indigo-900 hover:bg-indigo-100 transition-colors">
                Tümü →
              </Link>
            </div>
            <div className="flex overflow-x-auto gap-3 pb-3 snap-x snap-mandatory scrollbar-hide -mx-5 px-5">
              {latestBooks.map(book => (
                <div key={book.id} onClick={() => setViewingBook(book)} className="snap-start shrink-0 w-[88px] cursor-pointer active:scale-95 transition-transform group/book">
                  <div className="relative aspect-[2/3] rounded-2xl overflow-hidden shadow-md ring-1 ring-slate-200 dark:ring-slate-700 group-hover/book:-translate-y-1 transition-transform duration-300">
                    <Image src={book.image || `https://placehold.co/300x450.png`} alt={book.title} width={300} height={450} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                      <p className="text-white text-[9px] font-bold line-clamp-2 leading-tight">{book.title}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ──────────────────────────────
            HEDEFLER + LİDERLİK
        ────────────────────────────── */}
        <div className="px-4 md:px-6 grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">

          {/* Aktif Hedefler */}
          <div className="lg:col-span-2">
            <div className={cn("rounded-[2rem] p-5 md:p-6", themeClasses.CARD_BG)}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm bg-gradient-to-br from-rose-500 to-pink-500">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className={cn("font-black text-base", themeClasses.TEXT_MAIN)}>Aktif Hedefler</h2>
                  <p className={cn("text-[10px] font-bold uppercase tracking-wider", themeClasses.TEXT_MUTED)}>{activeGoals.length} devam ediyor</p>
                </div>
              </div>
              <div className="space-y-3">
                {activeGoals.length > 0 ? activeGoals.map(goal => (
                  <div key={goal.id} className="relative overflow-hidden rounded-[1.5rem] bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 p-4 md:p-5">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-rose-500 to-purple-500 rounded-l-[1.5rem]" />
                    <div className="pl-3">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <Link href={`/goals/${goal.id}`} className={cn("font-black text-sm md:text-base hover:text-rose-600 transition-colors truncate block", themeClasses.TEXT_MAIN)}>{goal.title}</Link>
                          <div className={cn("flex items-center gap-1.5 text-xs font-medium mt-0.5", themeClasses.TEXT_MUTED)}>
                            <User className="w-3.5 h-3.5" /> {goal.assignee?.name}
                          </div>
                        </div>
                        {goal.currentSection && goal.currentSection.status !== 'completed' && (
                          <Button size="sm" className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl px-4 shadow-sm h-9 shrink-0" onClick={() => setEditingGoal({ goal, section: goal.currentSection! })}>
                            <Flame className="w-3.5 h-3.5 mr-1.5" /> İlerleme
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {goal.currentSection && (
                          <div>
                            <div className="flex justify-between text-[10px] font-bold mb-1.5">
                              <span className={cn("truncate pr-2", themeClasses.TEXT_MAIN)}>{goal.currentSection.title}</span>
                              <span className="text-rose-500 shrink-0">{goal.currentSection.completedUnits || 0}/{goal.currentSection.sectionTotalUnits} {goal.unitName}</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                              <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-400 transition-all duration-700" style={{ width: `${goal.sectionProgress || 0}%` }} />
                            </div>
                          </div>
                        )}
                        <div>
                          <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            <span>Genel İlerleme</span><span>%{Math.round(goal.overallProgress)}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${goal.overallProgress}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/30 rounded-[1.5rem] border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <Target className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className={cn("text-sm font-medium", themeClasses.TEXT_MUTED)}>Henüz aktif hedef yok.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Okuma Liderleri */}
          <div>
            <div className={cn("rounded-[2rem] p-5 md:p-6 overflow-hidden relative", themeClasses.CARD_BG)}>
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-100 dark:bg-indigo-900/30 rounded-full blur-2xl opacity-50" />
              <div className="absolute bottom-10 -left-10 w-24 h-24 bg-fuchsia-100 dark:bg-fuchsia-900/30 rounded-full blur-xl opacity-50" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm bg-gradient-to-br from-yellow-500 to-amber-500">
                    <Trophy className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className={cn("font-black text-base", themeClasses.TEXT_MAIN)}>Okuma Liderleri</h2>
                    <p className={cn("text-[10px] font-bold uppercase tracking-wider", themeClasses.TEXT_MUTED)}>Kitap sıralaması</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {readingStats.map((stat, index) => (
                    <Link key={stat.memberId} href="/library" className="group block">
                      <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700 transition-colors">
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white shadow-sm ring-2 ring-white dark:ring-slate-700" style={{ backgroundColor: stat.color }}>
                            {stat.name.charAt(0)}
                          </div>
                          {index === 0 && (
                            <div className="absolute -top-1 -right-1 bg-yellow-400 text-white rounded-full p-0.5 shadow-sm">
                              <Star className="w-2.5 h-2.5 fill-current" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("font-bold text-sm truncate", themeClasses.TEXT_MAIN)}>{stat.name}</p>
                          <p className="text-blue-600 dark:text-blue-400 text-[10px] font-bold">{stat.finishedBooks} kitap</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={cn("block text-lg font-black leading-none", themeClasses.TEXT_MAIN)}>{stat.pagesRead}</span>
                          <span className={cn("text-[9px] font-bold uppercase", themeClasses.TEXT_MUTED)}>Sayfa</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ──────────────────────────────
            KİŞİSEL PANOLAR
        ────────────────────────────── */}
        <section className="pb-4">
          {/* Başlık */}
          <div className="flex items-center justify-between mb-4 px-4 md:px-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm bg-gradient-to-br from-indigo-500 to-purple-600">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className={cn("font-black text-base", themeClasses.TEXT_MAIN)}>Kişisel Panolar</h2>
                <p className={cn("text-[10px] font-bold uppercase tracking-wider", themeClasses.TEXT_MUTED)}>Bireysel gelişim</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsMemberFormOpen(true)}
              className="rounded-xl border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 h-9 px-3 text-xs font-bold">
              <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Üye Ekle
            </Button>
          </div>

          {/* Üye Kartları — Yatay Kaydırmalı Carousel */}
          <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x pb-2 px-4 md:px-6">
            {familyMembers.map((member) => {
              const isActive = activeMemberId === member.id;
              const memberTasks = tasks.filter(t => t.assigneeId === member.id && !t.completed);
              return (
                <button
                  key={member.id}
                  onClick={() => setActiveMemberId(member.id)}
                  className={cn(
                    "snap-start shrink-0 flex flex-col items-center gap-2 p-4 rounded-[1.75rem] border transition-all duration-300 active:scale-95 w-28",
                    isActive
                      ? "bg-slate-900 dark:bg-white border-slate-900 dark:border-white shadow-xl scale-105"
                      : cn("bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm", themeClasses.CARD_HOVER)
                  )}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-md transition-all",
                      isActive ? "ring-4 ring-white/30 dark:ring-slate-900/30" : ""
                    )}
                    style={{ backgroundColor: member.color }}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  {/* Ad */}
                  <div className="text-center">
                    <p className={cn(
                      "font-black text-xs leading-tight",
                      isActive ? "text-white dark:text-slate-900" : themeClasses.TEXT_MAIN
                    )}>
                      {member.name.split(' ')[0]}
                    </p>
                    <p className={cn(
                      "text-[9px] font-bold uppercase tracking-wider mt-0.5",
                      isActive ? "text-white/70 dark:text-slate-600" : themeClasses.TEXT_MUTED
                    )}>
                      {member.role.replace(' Çocuk','').replace('Kız ','').replace('Erkek ','')}
                    </p>
                  </div>
                  {/* Bekleyen görev sayısı */}
                  {memberTasks.length > 0 && (
                    <div className={cn(
                      "px-2.5 py-1 rounded-xl text-[10px] font-black",
                      isActive
                        ? "bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900"
                        : "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400"
                    )}>
                      {memberTasks.length} görev
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Aktif Üye Pano İçeriği */}
          <div className="mt-4 px-4 md:px-6">
            {activeMember ? (
              <div className="animate-in fade-in slide-in-from-bottom-3 duration-400">
                {/* Üye Başlık Kartı */}
                <div
                  className="relative overflow-hidden rounded-[2rem] p-5 mb-4 text-white shadow-xl"
                  style={{ background: `linear-gradient(135deg, ${activeMember.color}dd, ${activeMember.color}88)` }}
                >
                  <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/10 rounded-full blur-2xl" />
                  <div className="absolute -bottom-6 -left-4 w-20 h-20 bg-white/10 rounded-full blur-xl" />
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-2xl font-black backdrop-blur-sm">
                        {activeMember.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-xl font-black leading-tight">{activeMember.name}</h3>
                        <p className="text-white/75 text-xs font-bold mt-0.5">{activeMember.role}</p>
                        {activeMember.xp ? (
                          <p className="text-white/90 text-xs font-black mt-1 flex items-center gap-1">
                            ✨ {activeMember.xp.toLocaleString()} XP
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingMember(activeMember)}
                      className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center hover:bg-white/30 transition-colors"
                    >
                      <Settings2 className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>

                {/* Dashboard Kartı */}
                <div className={cn("rounded-[2rem] overflow-hidden shadow-sm", themeClasses.CARD_BG)}>
                  <div className="p-4 md:p-6">
                    <MemberDashboardCard
                      member={activeMember} tasks={tasks} tests={tests}
                      studyAssignments={studyAssignments} studyPlans={studyPlans}
                      userLibraries={userLibraries} books={books} videos={videos}
                      memorizationItems={memorizationItems} memorizationProgress={memorizationProgress}
                      prayerProgress={prayerProgress} trackedBooks={trackedBooks}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 bg-slate-50 dark:bg-slate-800/30 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <h3 className={cn("text-base font-black", themeClasses.TEXT_MAIN)}>Üye Bulunamadı</h3>
                <p className={cn("text-sm font-medium mt-1", themeClasses.TEXT_MUTED)}>Lütfen yeni bir aile üyesi ekleyin.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* MODALLER */}
      <Dialog open={isAddBookDialogOpen} onOpenChange={setIsAddBookDialogOpen}>
        <DialogContent className="w-[95vw] md:max-w-2xl lg:max-w-3xl flex flex-col max-h-[90dvh] bg-white dark:bg-slate-900 rounded-[2rem] border-slate-200 dark:border-slate-800 overflow-hidden p-0">
          <FormProvider {...bookFormMethods}>
            <form onSubmit={bookFormMethods.handleSubmit(handleUpdateBook)} className="flex flex-col min-h-0 flex-1">
              <DialogHeader className="p-6 pb-4 shrink-0 border-b border-slate-100 dark:border-slate-800">
                <DialogTitle className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  {editingBook ? 'Kitabı Düzenle' : 'Yeni Kitap Ekle'}
                </DialogTitle>
              </DialogHeader>
              <div className="overflow-y-auto p-6 flex-1 min-h-0"><BookForm existingTags={allTags} /></div>
              <DialogFooter className="p-4 shrink-0 border-t border-slate-100 dark:border-slate-800 flex flex-row justify-end gap-2">
                <Button variant="ghost" type="button" onClick={() => setIsAddBookDialogOpen(false)} disabled={isSubmittingBook} className="rounded-xl font-medium px-5">İptal</Button>
                <Button type="submit" disabled={isSubmittingBook} className="rounded-xl font-bold px-6 bg-indigo-600 text-white hover:bg-indigo-700 shadow-md h-11">Kaydet</Button>
              </DialogFooter>
            </form>
          </FormProvider>
        </DialogContent>
      </Dialog>

      <Dialog open={isMemberFormOpen} onOpenChange={setIsMemberFormOpen}>
        <DialogContent className="w-[95%] max-w-md rounded-[2rem] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Yeni Aile Üyesi Ekle</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">Ailenize yeni bir üye ekleyin.</DialogDescription>
          </DialogHeader>
          <div className="mt-2"><NewFamilyMemberForm onMemberAdded={() => setIsMemberFormOpen(false)} /></div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent className="w-[95%] max-w-md rounded-[2rem] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 p-6">
          <DialogHeader><DialogTitle className="text-xl font-black">Profili Düzenle</DialogTitle></DialogHeader>
          <div className="mt-2">{editingMember && <EditFamilyMemberForm member={editingMember} onMemberUpdated={() => setEditingMember(null)} />}</div>
        </DialogContent>
      </Dialog>

      <BookDetailDialog book={viewingBook} isOpen={!!viewingBook} onOpenChange={(open) => { if (!open) setViewingBook(null) }} onEdit={handleOpenEditDialog} onAddToLibrary={handleAddToLibrary} familyMembers={familyMembers} />

      <Dialog open={!!editingGoal} onOpenChange={(open) => { if (!open) { setEditingGoal(null); progressForm.reset({ progress: '' as any }); } }}>
        <DialogContent className="w-[95%] max-w-md rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 text-xl font-black">
              <Flame className="w-5 h-5 fill-rose-600" /> İlerleme Ekle
            </DialogTitle>
            <DialogDescription className="font-medium text-sm text-slate-500 dark:text-slate-400">{editingGoal?.section.title}</DialogDescription>
          </DialogHeader>
          <Form {...progressForm}>
            <form onSubmit={progressForm.handleSubmit(handleProgressSubmit)} className="space-y-4 mt-2">
              <FormField control={progressForm.control} name="progress" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold text-sm text-slate-700 dark:text-slate-300">Miktar ({editingGoal?.goal.unitName})</FormLabel>
                  <FormControl><Input type="number" className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xl font-bold" autoFocus {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full h-14 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-base font-black shadow-md active:scale-[0.98] transition-transform">Kaydet</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}