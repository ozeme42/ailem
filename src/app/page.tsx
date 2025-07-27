

"use client";

import * as React from "react";
import { CheckSquare, Calendar, BookOpen, ShoppingCart, TrendingUp, Star, Settings, UserPlus, Edit, UtensilsCrossed, PlusCircle, GraduationCap, LogOut, Sun, Moon, Library, ArrowRight, Notebook, ListChecks, Check, Users, BookHeart, Target, User, Flame } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from "@/components/auth-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { FamilyMemberCard } from "@/components/family-member-card";
import { weeklyPoints, FamilyMember, ShoppingList, MealPlan, CalendarEvent, Recipe, Task, UserLibrary, Book, UserLibraryBook, Test, StudyAssignment, Goal, GoalSection, GoalTask } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NewFamilyMemberForm } from "@/components/new-family-member-form";
import { EditFamilyMemberForm } from "@/components/edit-family-member-form";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { onShoppingListsUpdate, onMealPlanUpdate, onCalendarEventsUpdate, onTasksUpdate, onUserLibrariesUpdate, onBooksUpdate, updateTask, updateFamilyMemberInFamily, checkAndAwardBadges, onTestsUpdate, onStudyAssignmentsUpdate, onGoalsUpdate, updateGoal, getGoal } from "@/lib/dataService";
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
  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [viewingBook, setViewingBook] = React.useState<Book | null>(null);


  React.useEffect(() => {
    const unsubShopping = onShoppingListsUpdate(setShoppingLists);
    const unsubMeal = onMealPlanUpdate(setMealPlan);
    const unsubCalendar = onCalendarEventsUpdate(setCalendarEvents);
    const unsubTasks = onTasksUpdate(setTasks);
    const unsubTests = onTestsUpdate(setTests);
    const unsubStudyAssignments = onStudyAssignmentsUpdate(setStudyAssignments);
    const unsubBooks = onBooksUpdate(setBooks);
    const unsubGoals = onGoalsUpdate(setGoals);
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
      unsubGoals();
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

  const pendingHouseTasks = React.useMemo(() => {
    return tasks
      .filter(task => !task.completed && task.recurrenceType !== 'daily' && task.category === 'Ev İşleri')
      .sort((a, b) => compareAsc(parseISO(a.dueDate), parseISO(b.dueDate)))
      .map(task => ({
        ...task,
        assignee: familyMembers.find(m => m.id === task.assigneeId)
      }))
      .slice(0, 5);
  }, [tasks, familyMembers]);
  
  const personalTasksByMember = React.useMemo(() => {
    const grouped: { [key: string]: Task[] } = {};
    tasks
      .filter(task => !task.completed && task.category === 'Kişisel')
      .forEach(task => {
        if (!grouped[task.assigneeId]) {
          grouped[task.assigneeId] = [];
        }
        grouped[task.assigneeId].push(task);
      });
    return grouped;
  }, [tasks]);


  const dailyTasksSummary = React.useMemo(() => {
    return tasks
      .filter(task => task.recurrenceType === 'daily')
      .map(task => ({
        ...task,
        assignee: familyMembers.find(m => m.id === task.assigneeId)
      }));
  }, [tasks, familyMembers]);


  const { pendingTests, pendingStudies } = React.useMemo(() => {
    const students = familyMembers.filter(m => m.role.includes('Çocuk'));
    const studentIds = new Set(students.map(s => s.id));

    const pendingTests = tests
        .filter(t => studentIds.has(t.studentId) && t.status === 'Atandı')
        .map(t => ({ ...t, type: 'test' as const, student: familyMembers.find(m => m.id === t.studentId) }))
        .sort((a, b) => compareAsc(parseISO(a.dueDate), parseISO(b.dueDate)));
        
    const pendingStudies = studyAssignments
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

  const activeGoals = React.useMemo(() => {
    return goals
      .filter(goal => goal.status === 'in-progress')
      .map(goal => {
        const sortedSections = [...(goal.sections || [])].sort((a, b) => a.order - b.order);
        let nextTask: GoalTask | null = null;
        let currentSection: GoalSection | null = null;
        
        for (const section of sortedSections) {
            if (!section.tasks.every(t => t.completed)) {
                currentSection = section;
                break;
            }
        }
        
        if (!currentSection && sortedSections.length > 0) {
            currentSection = sortedSections[sortedSections.length - 1];
        }

        if (currentSection) {
            for (const task of [...currentSection.tasks].sort((a,b) => a.order - b.order)) {
                if (!task.completed) {
                    nextTask = task;
                    break;
                }
            }
        }
        
        const completedUnits = (goal.sections || [])
          .flatMap(section => section.tasks)
          .filter(task => task.completed)
          .reduce((sum, task) => {
              const units = parseInt(task.title.match(/^(\d+)/)?.[1] || '0');
              return sum + units;
          }, 0);
        
        const overallProgress = (goal.totalUnits || 0) > 0 ? (completedUnits / goal.totalUnits!) * 100 : 0;
        
        let sectionCompletedUnits = 0;
        let sectionTotalUnits = 0;
        if (currentSection) {
             currentSection.tasks.forEach(task => {
                const units = parseInt(task.title.match(/^(\d+)/)?.[1] || '0');
                sectionTotalUnits += units;
                if (task.completed) {
                    sectionCompletedUnits += units;
                }
            });
        }
        const sectionProgress = sectionTotalUnits > 0 ? (sectionCompletedUnits / sectionTotalUnits) * 100 : 0;
        
        return {
          ...goal,
          nextTask,
          currentSection,
          completedUnits,
          overallProgress,
          sectionCompletedUnits,
          sectionTotalUnits,
          sectionProgress,
          assignee: familyMembers.find(m => m.id === goal.assigneeId)
        };
      });
  }, [goals, familyMembers]);


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

  const handleDailyTaskCompletion = async (task: Task, assignee: FamilyMember) => {
    if (!familyId) return;
    
    const today = new Date();
    const lastCompleted = task.lastCompletedDate ? parseISO(task.lastCompletedDate) : null;
    
    if (lastCompleted && isSameDay(today, lastCompleted)) {
      toast({
        title: "✋ Zaten Tamamlandı",
        description: "Bu görevi bugün için zaten tamamladın.",
      });
      return;
    }

    try {
      const xpChange = task.points;
      const newXp = (assignee.xp || 0) + xpChange;
      const newLevel = Math.floor(newXp / 1000) + 1;
      let newStreak = task.streak || 0;

      if (lastCompleted && isSameDay(subDays(today, 1), lastCompleted)) {
        newStreak++; // Consecutive day
      } else {
        newStreak = 1; // Streak broken or first time
      }

      await updateTask(task.id, {
        lastCompletedDate: today.toISOString(),
        streak: newStreak,
      });

      await updateFamilyMemberInFamily(familyId, assignee.id, {
        xp: newXp,
        completedTasks: (assignee.completedTasks || 0) + 1,
        level: newLevel,
        streak: newStreak > (assignee.streak || 0) ? newStreak : assignee.streak,
      });

      await checkAndAwardBadges(assignee.id, familyId, { type: 'task_completed', task });

      toast({
        title: "🎉 Seri Devam Ediyor!",
        description: `${assignee.name}, ${task.points} XP kazandın! Serin: ${newStreak}`,
      });
    } catch (error) {
      toast({ title: "Hata", description: "Görev güncellenirken bir sorun oluştu.", variant: "destructive"});
    }
  };

  const handleGoalTaskToggle = async (goalId: string, sectionId: string, taskId: string) => {
    const originalGoal = await getGoal(goalId);
    if (!originalGoal) return;

    const newSections = JSON.parse(JSON.stringify(originalGoal.sections)) as GoalSection[];

    let taskUpdated = false;
    for (const section of newSections) {
        if (section.id === sectionId) {
            const task = section.tasks.find((t) => t.id === taskId);
            if (task) {
                task.completed = !task.completed;
                taskUpdated = true;
                break;
            }
        }
    }

    if (!taskUpdated) return;

    // Recalculate section status
    newSections.forEach((section) => {
        const allTasksCompleted = section.tasks.every((t) => t.completed);
        if (allTasksCompleted) {
            section.status = 'completed';
        }
    });
    
    const isGoalComplete = newSections.every((s) => s.status === 'completed');
    const newGoalStatus = isGoalComplete ? 'completed' : 'in-progress';

    try {
        await updateGoal(originalGoal.id, { sections: newSections, status: newGoalStatus });
    } catch (error) {
        toast({ title: "Hata", description: "Görev güncellenemedi.", variant: "destructive" });
        console.error("Failed to update goal task:", error);
    }
  };


  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4 p-4 bg-gradient-to-br from-primary to-accent/80 text-primary-foreground rounded-xl shadow-lg">
          <div className="flex items-center gap-4">
              <SidebarTrigger className="text-primary-foreground hover:bg-white/20 hover:text-primary-foreground" />
              <h1 className="text-2xl font-bold tracking-tight">Özgürdere Ailesi</h1>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user?.name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleEditCurrentUser}>
                  <Edit className="mr-2 h-4 w-4" />
                  <span>Profili Düzenle</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsMemberFormOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  <span>Üye Ekle</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
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
      
      <Card className="shadow-lg bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Target /> Yol Haritaları</CardTitle>
          <CardDescription className="text-white/80">Aktif hedefler ve sıradaki adımlar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeGoals.length > 0 ? (
            activeGoals.map(goal => (
              <Link key={goal.id} href={`/goals/${goal.id}`} className="block p-4 bg-white/20 rounded-lg hover:bg-white/30 transition-colors">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-grow">
                    <p className="font-bold">{goal.title}</p>
                    <p className="text-sm text-white/80">{goal.assignee?.name}</p>
                  </div>
                   {goal.nextTask && (
                        <div className="text-right text-xs shrink-0">
                            <p className="font-semibold">{goal.currentSection?.title}</p>
                            <p>Sıradaki Adım</p>
                        </div>
                    )}
                </div>
                
                 {goal.nextTask ? (
                    <div className="mt-4 pt-3 border-t border-white/20">
                         <div className="space-y-2" onClick={(e) => {e.preventDefault();}}>
                            <div className="flex items-center gap-3">
                                <Checkbox
                                    id={`goal-task-${goal.nextTask.id}`}
                                    checked={goal.nextTask.completed}
                                    onCheckedChange={() => handleGoalTaskToggle(goal.id, goal.currentSection!.id, goal.nextTask!.id)}
                                    className="border-white text-white ring-offset-background data-[state=checked]:bg-white data-[state=checked]:text-indigo-600"
                                />
                                <div className="flex-grow">
                                    <label htmlFor={`goal-task-${goal.nextTask.id}`} className="font-semibold cursor-pointer text-sm">{goal.nextTask.title}</label>
                                </div>
                            </div>
                         </div>
                    </div>
                ) : (
                    <p className="mt-2 text-sm text-center font-semibold text-green-300">🎉 Tüm hedefler tamamlandı!</p>
                )}

                <div className="mt-4 space-y-4">
                    {goal.currentSection && (
                        <div>
                            <div className="flex justify-between text-xs text-white/80 mb-1">
                                <span>{goal.currentSection.title}</span>
                                <span>{Math.round(goal.sectionProgress)}%</span>
                            </div>
                            <Progress value={goal.sectionProgress} className="h-1.5 bg-white/30" indicatorClassName="bg-amber-300" />
                        </div>
                    )}
                    <div>
                        <div className="flex justify-between text-xs text-white/80 mb-1">
                             <span>Genel İlerleme ({goal.completedUnits}/{goal.totalUnits} {goal.unitName})</span>
                            <span>{Math.round(goal.overallProgress)}%</span>
                        </div>
                        <Progress value={goal.overallProgress} className="h-1.5 bg-white/30" indicatorClassName="bg-green-300" />
                    </div>
                </div>
              </Link>
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
        <Card className="shadow-lg bg-gradient-to-br from-red-500 to-orange-500 text-white">
          <CardHeader>
            <CardTitle>Günlük Alışkanlıklar</CardTitle>
            <CardDescription className="text-white/80">Günlük tekrarlanan seri görevleri.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
             {dailyTasksSummary.length > 0 ? (
              dailyTasksSummary.map(task => {
                const isCompletedToday = task.lastCompletedDate ? isToday(parseISO(task.lastCompletedDate)) : false;
                return (
                    <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/20 backdrop-blur-sm">
                      <Button
                        variant={isCompletedToday ? "ghost" : "default"}
                        size="icon"
                        className={cn(
                          "w-12 h-12 rounded-full text-white flex-col shrink-0",
                          isCompletedToday 
                            ? "bg-white/10 border-2 border-dashed border-white/50" 
                            : "bg-white/30 hover:bg-white/40"
                        )}
                        onClick={() => task.assignee && handleDailyTaskCompletion(task, task.assignee)}
                        disabled={isCompletedToday}
                      >
                        {isCompletedToday ? <Check /> : <Flame />}
                        <span className="text-xs mt-0.5">{task.streak || 0}</span>
                      </Button>
                      <div className="flex-grow">
                        <label className="font-semibold cursor-pointer">{task.title}</label>
                        <p className="text-xs text-white/80">Günlük Görev</p>
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
                  );
              })
            ) : (
              <div className="text-center py-8 bg-white/10 rounded-lg">
                <Check className="mx-auto h-8 w-8 text-white/80" />
                <p className="mt-2 text-sm text-white/90">Günlük görev yok.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg bg-gradient-to-br from-teal-500 to-cyan-500 text-white">
          <CardHeader>
            <CardTitle>Bekleyen Ev İşleri</CardTitle>
            <CardDescription className="text-white/80">Ailenin genel ev işleri ve sorumlulukları.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingHouseTasks.length > 0 ? (
              pendingHouseTasks.map(task => {
                return (
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
                );
              })
            ) : (
              <div className="text-center py-8 bg-white/10 rounded-lg">
                <Check className="mx-auto h-8 w-8 text-white/80" />
                <p className="mt-2 text-sm text-white/90">Bekleyen ev işi yok. Harika!</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {familyMembers.map(member => {
            const memberPersonalTasks = personalTasksByMember[member.id] || [];
            if (memberPersonalTasks.length === 0) return null;
            return (
                <Card key={`personal-tasks-${member.id}`} className="shadow-lg" style={{ borderTop: `4px solid ${member.color}`}}>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                             <div 
                                className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0" 
                                style={{ backgroundColor: member.color }}
                                title={member.name}
                            >
                                {member.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <CardTitle>{member.name}'in Kişisel Görevleri</CardTitle>
                                <CardDescription>{memberPersonalTasks.length} bekleyen görev</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {memberPersonalTasks.map(task => (
                            <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
                                <Checkbox
                                    id={`personal-task-${task.id}`}
                                    onCheckedChange={() => handleTaskCompletion(task, member)}
                                    className="border-primary"
                                />
                                <div className="flex-grow">
                                    <label htmlFor={`personal-task-${task.id}`} className="font-semibold cursor-pointer">{task.title}</label>
                                    <p className="text-xs text-muted-foreground">{format(parseISO(task.dueDate), "d MMM", { locale: tr })}</p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )
        })}

        <Link href="/education" className="block group lg:col-span-2">
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
