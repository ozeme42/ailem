"use client";

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, BrainCircuit, Check, Flame, GraduationCap, Users, ListChecks, Gamepad2, Youtube, Heart, Clock, Trophy, CheckCircle2, Sparkles, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { updateTask, checkAndAwardBadges, updateFamilyMemberInFamily, updateHabitCompletion } from '@/lib/dataService';
import { FamilyMember, Task, Test, StudyAssignment, UserLibrary, MemorizationProgress, MemorizationItem, Book as BookType, StudyPlan, PrayerProgress, Video, TrackedBook } from '@/lib/data';
import { Progress } from './ui/progress';
import { format, isToday, parseISO, subDays, isValid } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface MemberDashboardCardProps {
    member: FamilyMember;
    tasks: Task[];
    tests: Test[];
    studyAssignments: StudyAssignment[];
    studyPlans: StudyPlan[];
    userLibraries: UserLibrary[];
    books: BookType[];
    videos: Video[];
    memorizationItems: MemorizationItem[];
    memorizationProgress: MemorizationProgress[];
    prayerProgress: PrayerProgress[];
    trackedBooks: TrackedBook[];
}

// --- Bölüm Temaları (Light & Dark Mode Uyumlu App-Like Tasarım) ---
const sectionThemes = {
    prayer: { 
        container: "bg-teal-50/50 dark:bg-teal-950/20 border-teal-100/50 dark:border-teal-900/30 shadow-sm",
        title: "text-teal-800 dark:text-teal-400",
        icon: "text-teal-600 dark:text-teal-500",
        itemBg: "bg-white dark:bg-slate-900 border-teal-100 dark:border-teal-900/50 hover:bg-teal-50 dark:hover:bg-teal-900/30",
        activeItem: "bg-teal-500 dark:bg-teal-600 text-white shadow-md shadow-teal-500/20"
    },
    habits: { 
        container: "bg-orange-50/50 dark:bg-orange-950/20 border-orange-100/50 dark:border-orange-900/30 shadow-sm",
        title: "text-orange-800 dark:text-orange-400",
        icon: "text-orange-600 dark:text-orange-500",
        itemBg: "bg-white dark:bg-slate-900 border-orange-100 dark:border-orange-900/50 hover:bg-orange-50 dark:hover:bg-orange-900/30",
        progressCheck: "bg-gradient-to-br from-orange-400 to-orange-500 dark:from-orange-500 dark:to-orange-600 border-none"
    },
    memorization: { 
        container: "bg-violet-50/50 dark:bg-violet-950/20 border-violet-100/50 dark:border-violet-900/30 shadow-sm",
        title: "text-violet-800 dark:text-violet-400",
        icon: "text-violet-600 dark:text-violet-500",
        itemHover: "active:scale-[0.98] transition-transform bg-white dark:bg-slate-900 border border-violet-100 dark:border-violet-900/50",
        badge: "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800"
    },
    videos: { 
        container: "bg-rose-50/50 dark:bg-rose-950/20 border-rose-100/50 dark:border-rose-900/30 shadow-sm",
        title: "text-rose-800 dark:text-rose-400",
        icon: "text-rose-600 dark:text-rose-500",
        itemHover: "active:scale-[0.98] transition-transform bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900/50",
        progressIndicator: "bg-rose-500 dark:bg-rose-600"
    },
    reading: { 
        container: "bg-amber-50/50 dark:bg-amber-950/20 border-amber-100/50 dark:border-amber-900/30 shadow-sm",
        title: "text-amber-800 dark:text-amber-400",
        icon: "text-amber-600 dark:text-amber-500",
        itemHover: "active:scale-[0.98] transition-transform bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-900/50",
        bookCover: "bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 text-amber-600 dark:text-amber-500 border border-amber-200 dark:border-amber-800",
        progressIndicator: "bg-gradient-to-r from-amber-400 to-orange-500"
    },
    todo: { 
        container: "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-100/50 dark:border-indigo-900/30 shadow-sm",
        title: "text-indigo-800 dark:text-indigo-400",
        icon: "text-indigo-600 dark:text-indigo-500",
        itemHover: "active:scale-[0.98] transition-all bg-white dark:bg-slate-900 border border-indigo-100/50 dark:border-indigo-900/50",
        checkbox: "data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500 border-indigo-300 dark:border-indigo-700 text-white"
    }
};

// Rol Temaları (Açık ve Koyu Tema Uyumlu)
const roleThemes: { [key: string]: { text: string, badge: string, bgRing: string, gradient: string } } = {
    Baba: { text: "text-blue-900 dark:text-blue-100", badge: "bg-blue-100/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800", bgRing: "ring-blue-100 dark:ring-blue-900/50", gradient: "from-blue-500 to-indigo-500" },
    Anne: { text: "text-pink-900 dark:text-pink-100", badge: "bg-pink-100/80 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400 border border-pink-200 dark:border-pink-800", bgRing: "ring-pink-100 dark:ring-pink-900/50", gradient: "from-pink-500 to-purple-500" },
    'Kız Çocuk': { text: "text-violet-900 dark:text-violet-100", badge: "bg-violet-100/80 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800", bgRing: "ring-violet-100 dark:ring-violet-900/50", gradient: "from-purple-500 to-pink-500" },
    'Erkek Çocuk': { text: "text-emerald-900 dark:text-emerald-100", badge: "bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800", bgRing: "ring-emerald-100 dark:ring-emerald-900/50", gradient: "from-emerald-500 to-cyan-500" },
    Bebek: { text: "text-amber-900 dark:text-amber-100", badge: "bg-amber-100/80 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800", bgRing: "ring-amber-100 dark:ring-amber-900/50", gradient: "from-amber-500 to-orange-500" },
    'Ev İşleri': { text: "text-cyan-900 dark:text-cyan-100", badge: "bg-cyan-100/80 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800", bgRing: "ring-cyan-100 dark:ring-cyan-900/50", gradient: "from-cyan-500 to-blue-500" },
};

const defaultTheme = { text: "text-slate-900 dark:text-slate-100", badge: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700", bgRing: "ring-slate-100 dark:ring-slate-800", gradient: "from-slate-500 to-slate-600" };

export function MemberDashboardCard({
    member,
    tasks,
    tests,
    studyAssignments,
    studyPlans,
    userLibraries,
    books,
    videos,
    memorizationItems,
    memorizationProgress,
    prayerProgress,
    trackedBooks,
}: MemberDashboardCardProps) {
    const { toast } = useToast();
    const { familyId, familyMembers } = useAuth();
    
    const [isClient, setIsClient] = React.useState(false);
    React.useEffect(() => {
        setIsClient(true);
    }, []);
    
    // --- Veri Hesaplamaları ---
    const { habits, pendingTasks, pendingTests, pendingStudies, readingBooks, pendingMemorization, todaysPrayers, earnedFreeTimeMinutes, pendingVideos } = React.useMemo(() => {
        const memberId = member.id;
        let completedActivityCount = 0;
        const todayKey = format(new Date(), 'yyyy-MM-dd');

        const memberTasks = tasks.filter(t => t.assigneeId === memberId);
        
        const habits = memberTasks.filter(t => t.isRecurring);
        habits.forEach(habit => {
            if (habit.completedDates?.includes(todayKey)) {
                completedActivityCount++;
            }
        });

        const otherTasks = memberTasks.filter(t => !t.isRecurring && !t.completed);
        
        const allTopics = trackedBooks?.flatMap(book => 
            (book.subjects || []).flatMap(subject => 
                (subject.topics || []).map(topic => ({...topic, subjectName: subject.name}))
            )
        ) || [];

        const memberTests = tests.filter(t => t.studentId === memberId && t.status === 'Atandı')
            .map(test => {
                const topicName = allTopics.find(t => t.id === test.topicId)?.name;
                return {
                    ...test,
                    displayName: topicName ? `${topicName} - ${test.title}` : test.title
                }
            });
        
        const memberStudyAssignments = studyAssignments.filter(sa => sa.studentId === memberId);
        const pendingStudies = memberStudyAssignments
            .filter(sa => sa.status === 'assigned')
            .map(sa => ({...sa, studyPlanTitle: studyPlans.find(p => p.id === sa.studyPlanId)?.title }));
            
        const todaysCompletedStudies = memberStudyAssignments.filter(sa =>
            sa.status === 'completed' &&
            sa.completedAt &&
            isClient && isToday(parseISO(sa.completedAt))
        ).length;
        completedActivityCount += todaysCompletedStudies;
        
        const memberLib = userLibraries.find(lib => lib.memberId === memberId);
        let readingBooksData: (BookType & { libraryStatus: 'reading' | 'to-read', progress?: number })[] = [];
        if (memberLib?.books) {
            readingBooksData = memberLib.books
                .filter(libBook => libBook.status === 'reading')
                .map(libBook => {
                    const bookDetail = books.find(b => b.id === libBook.bookId);
                    return bookDetail ? { ...bookDetail, libraryStatus: libBook.status, progress: libBook.progress } : null;
                })
                .filter(Boolean) as (BookType & { libraryStatus: 'reading' | 'to-read', progress?: number })[];
        }
            
        const memberProgress = memorizationProgress.filter(p => p.memberId === memberId);
        const completedMemorizationIds = new Set(memberProgress.filter(p => p.completed && p.completedAt && isClient && isToday(parseISO(p.completedAt))).map(p => p.itemId));
        completedActivityCount += completedMemorizationIds.size;
        
        const pendingMemorizationData = memberProgress
            .filter(p => !p.completed)
            .map(p => memorizationItems.find(item => item.id === p.itemId))
            .filter((item): item is MemorizationItem => !!item);
        
        const memberPrayerData = prayerProgress.find(p => p.memberId === member.id);
        const todaysCompletions = memberPrayerData?.completions?.[todayKey] || [];
        completedActivityCount += todaysCompletions.length;
        
        const prayerTimes = ["Sabah", "Öğle", "İkindi", "Akşam", "Yatsı"];
        const todaysPrayersData = prayerTimes.map(prayer => ({
            name: prayer,
            completed: todaysCompletions.includes(prayer),
        }));

        const memberVideos = videos.filter(v => v.assigneeId === memberId && (v.completedVideos || 0) > 0 && (v.completedVideos || 0) < v.totalVideos);
        
        const earnedTime = completedActivityCount * 15;

        return { 
            habits, 
            pendingTasks: otherTasks, 
            pendingTests: memberTests, 
            pendingStudies, 
            readingBooks: readingBooksData, 
            pendingVideos: memberVideos, 
            pendingMemorization: pendingMemorizationData, 
            todaysPrayers: todaysPrayersData, 
            earnedFreeTimeMinutes: earnedTime 
        };
    }, [member.id, tasks, tests, studyAssignments, studyPlans, userLibraries, books, videos, memorizationItems, memorizationProgress, prayerProgress, isClient, trackedBooks]);
    
    // --- Aksiyonlar ---
    const handleTaskCompletion = async (task: Task) => {
        if (!familyId || !member) return;
        try {
            await updateTask(task.id, { completed: true });
            const xpChange = task.points;
            await updateFamilyMemberInFamily(familyId, member.id, {
                xp: (member.xp || 0) + xpChange,
                completedTasks: (member.completedTasks || 0) + 1,
                level: Math.floor(((member.xp || 0) + xpChange) / 1000) + 1,
            });
            await checkAndAwardBadges(member.id, familyId, { type: 'task_completed', task });
            toast({ title: "🎉 Görev Tamamlandı!", description: `${task.points} XP kazandın.`, className: "bg-indigo-100 dark:bg-indigo-900 border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200" });
        } catch (error) {
            toast({ title: "Hata", variant: "destructive" });
        }
    };
    
    const handleHabitCompletion = async (habitId: string, day: Date) => {
        const habit = habits.find(h => h.id === habitId);
        if (!habit) return;
        const dateKey = format(day, 'yyyy-MM-dd');
        const isCompleted = habit.completedDates?.includes(dateKey) || false;
        try {
            await updateHabitCompletion(habit.id, day, !isCompleted);
             if (!isCompleted) toast({ title: '🎉 Süper!', description: `"${habit.title}" tamamlandı.`, className: "bg-orange-100 dark:bg-orange-900 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200" });
        } catch(e) {
            toast({ title: 'Hata', variant: 'destructive'});
        }
    };
    
    const theme = roleThemes[member.role] || defaultTheme;
    const allPendingItems = [...habits, ...pendingTasks, ...pendingTests, ...pendingStudies, ...readingBooks, ...pendingMemorization, ...pendingVideos, ...todaysPrayers.filter(p => !p.completed)];
    const lastSevenDays = Array.from({ length: 7 }).map((_, i) => subDays(new Date(), i)).reverse();

    // --- EV KARTI (APP-LIKE) ---
    if (member.id === 'house') {
        const houseTasks = tasks.filter(t => (t.category === 'Ev İşleri' || t.category === 'Görev') && !t.completed);
        if (houseTasks.length === 0) return null;
        
        return (
             <Link href="/tasks" className="block active:scale-[0.98] transition-transform duration-200 group relative z-10">
                <Card className="shadow-sm border border-cyan-100 dark:border-cyan-900/50 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30 overflow-hidden h-full rounded-[1.5rem] md:rounded-[2rem]">
                    <div className="absolute top-0 right-0 -mt-8 -mr-8 w-24 h-24 bg-cyan-200/50 dark:bg-cyan-900/30 rounded-full blur-2xl pointer-events-none"></div>
                    <CardHeader className="pb-3 border-b border-cyan-100 dark:border-cyan-900/30 relative">
                        <CardTitle className='flex items-center gap-2 text-base md:text-lg text-cyan-800 dark:text-cyan-400 font-bold'>
                            <div className="p-1.5 md:p-2 bg-white dark:bg-slate-900 shadow-sm rounded-xl text-cyan-600 dark:text-cyan-500 border border-cyan-100 dark:border-cyan-800"><Users className="w-4 h-4 md:w-5 md:h-5"/></div>
                            Ev Görevleri
                        </CardTitle>
                        <CardDescription className="text-cyan-600/80 dark:text-cyan-500/80 font-medium text-xs">Ortak sorumluluklar</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 md:space-y-3 pt-4 relative">
                    {houseTasks.slice(0, 3).map(task => {
                        const assignee = familyMembers.find(m => m.id === task.assigneeId);
                        return (
                            <div key={task.id} className="flex items-center gap-3 p-2.5 md:p-3 rounded-[1rem] md:rounded-2xl bg-white dark:bg-slate-900 border border-cyan-100/50 dark:border-cyan-900/50 shadow-sm transition-all">
                            <Checkbox id={`home-task-${task.id}`} className="border-cyan-300 dark:border-cyan-700 text-cyan-600 data-[state=checked]:bg-cyan-600 data-[state=checked]:border-cyan-600 rounded-full w-4 h-4" />
                            <div className="flex-grow">
                                <label htmlFor={`home-task-${task.id}`} className="font-semibold cursor-pointer text-xs md:text-sm text-slate-700 dark:text-slate-300 leading-tight block">{task.title}</label>
                            </div>
                            {assignee && <Badge variant="secondary" className="bg-cyan-100/50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800 text-[9px] md:text-[10px] font-bold px-1.5 md:px-2 py-0">
                                {assignee.name.split(' ')[0]}
                            </Badge>}
                            </div>
                        );
                    })}
                     {houseTasks.length > 3 && <p className="text-[10px] md:text-xs text-center text-cyan-600/70 dark:text-cyan-500/70 pt-1 font-bold flex items-center justify-center gap-1"><Sparkles className="w-3 h-3"/> + {houseTasks.length - 3} görev daha</p>}
                    </CardContent>
                </Card>
            </Link>
        )
    }

    if (allPendingItems.length === 0) return null;

    return (
        <Card className="shadow-none border-0 bg-transparent flex flex-col gap-4 md:gap-6 relative z-10 px-0 md:px-2">
            
            {/* --- HEADER --- */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-slate-100 dark:bg-slate-800 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none opacity-50"></div>
                 
                 <div className="relative shrink-0 z-10">
                    <div className={cn("w-16 h-16 md:w-20 md:h-20 rounded-[1.2rem] flex items-center justify-center text-2xl md:text-3xl font-black text-white shadow-sm bg-gradient-to-br ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900", theme.gradient, theme.bgRing)}>
                        {member.name.charAt(0).toUpperCase()}
                    </div>
                    {['Baba', 'Anne'].includes(member.role) && (
                        <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-full p-1.5 shadow-sm border-2 border-white dark:border-slate-900">
                            <Trophy className="w-3 h-3 md:w-4 md:h-4 fill-current" />
                        </div>
                    )}
                </div>
                <div className="text-center sm:text-left flex-grow z-10">
                    <h3 className={cn("text-xl md:text-2xl font-black tracking-tight", theme.text)}>{member.name}</h3>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 mt-1">
                        <Badge variant="outline" className={cn("text-[9px] md:text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full", theme.badge)}>
                            {member.role}
                        </Badge>
                        {member.xp ? <span className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1"><Sparkles className="w-3 h-3 text-amber-500 fill-amber-500"/> {member.xp.toLocaleString()} XP</span> : null}
                    </div>
                </div>

                {/* Serbest Zaman */}
                {member.role.includes('Çocuk') && (
                    <div className="sm:ml-auto w-full sm:w-auto mt-2 sm:mt-0 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-[1.2rem] md:rounded-[1.5rem] p-3 md:p-4 flex items-center justify-between sm:justify-start gap-3 md:gap-4 shadow-sm z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 md:p-2.5 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-[10px] text-white shadow-sm">
                                <Gamepad2 className="w-4 h-4 md:w-5 md:h-5" />
                            </div>
                            <div className="text-left">
                                <p className="text-[9px] md:text-[10px] text-emerald-600/80 dark:text-emerald-500/80 font-extrabold uppercase tracking-wider">Serbest Zaman</p>
                                <p className="text-lg md:text-xl font-black text-emerald-600 dark:text-emerald-400 leading-none mt-0.5">{earnedFreeTimeMinutes}<span className="text-[10px] md:text-xs font-bold ml-0.5 opacity-80">dk</span></p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* --- GRID --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5 items-start">
                
                {/* SOL KOLON */}
                <div className="space-y-4 md:space-y-5">
                      
                      {/* 1. NAMAZ TAKİBİ */}
                    {member.role.includes('Çocuk') && (todaysPrayers.filter(p=>!p.completed).length > 0) && (
                        <div className={cn("rounded-[1.5rem] md:rounded-[2rem] p-4 border", sectionThemes.prayer.container)}>
                            <h4 className={cn("font-extrabold text-[10px] md:text-xs uppercase tracking-widest mb-3 md:mb-4 flex items-center gap-1.5 md:gap-2", sectionThemes.prayer.title)}>
                                <Clock className={cn("h-3.5 w-3.5 md:h-4 md:w-4", sectionThemes.prayer.icon)}/> Namaz Takibi
                            </h4>
                            <div className="flex justify-between items-center gap-1 p-1.5 md:p-2 bg-white dark:bg-slate-900 rounded-[1.2rem] border border-teal-100 dark:border-teal-900/50 shadow-sm">
                                {todaysPrayers.map(prayer => (
                                    <div key={prayer.name} className="flex flex-col items-center gap-1 flex-1 py-1 group">
                                                 <div className={cn(
                                                "w-8 h-8 md:w-10 md:h-10 rounded-[12px] flex items-center justify-center transition-all duration-300 shadow-sm",
                                                prayer.completed 
                                                    ? `${sectionThemes.prayer.activeItem} scale-105` 
                                                    : "bg-teal-50 dark:bg-teal-900/30 border border-teal-100 dark:border-teal-800 text-slate-400 dark:text-slate-500 group-active:scale-95"
                                            )}>
                                                <Heart className={cn("w-3.5 h-3.5 md:w-4 md:h-4 transition-all", prayer.completed ? "fill-white" : "fill-none")} />
                                             </div>
                                            <p className={cn("text-[9px] md:text-[10px] font-bold transition-colors", prayer.completed ? "text-teal-600 dark:text-teal-400" : "text-slate-400 dark:text-slate-500")}>{prayer.name}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 2. ALIŞKANLIKLAR */}
                    {habits.length > 0 && (
                          <div className={cn("rounded-[1.5rem] md:rounded-[2rem] p-4 border", sectionThemes.habits.container)}>
                            <h4 className={cn("font-extrabold text-[10px] md:text-xs uppercase tracking-widest mb-3 md:mb-4 flex items-center gap-1.5 md:gap-2", sectionThemes.habits.title)}>
                                <Flame className={cn("h-3.5 w-3.5 md:h-4 md:w-4", sectionThemes.habits.icon)}/> Alışkanlık Zinciri
                            </h4>
                            <div className="space-y-3">
                                 {habits.map(habit => {
                                    return (
                                              <div key={habit.id} className={cn("rounded-[1.2rem] p-3 md:p-4 border shadow-sm", sectionThemes.habits.itemBg)}>
                                                <div className="flex justify-between items-center mb-3">
                                                  <p className="font-bold text-xs md:text-sm text-slate-800 dark:text-slate-200 line-clamp-1">{habit.title}</p>
                                                  <Badge variant="secondary" className="bg-orange-100/80 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 text-[8px] md:text-[9px] border border-orange-200 dark:border-orange-800 font-bold px-1.5 py-0">Haftalık</Badge>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                  {lastSevenDays.map(day => {
                                                    const dayKey = format(day, 'yyyy-MM-dd');
                                                    const isCompleted = habit.completedDates?.includes(dayKey) || false;
                                                    const isTodayDate = isToday(day);
                                                    return (
                                                        <div key={dayKey} className="flex flex-col items-center gap-1 cursor-pointer group active:scale-90 transition-transform" onClick={() => handleHabitCompletion(habit.id, day)}>
                                                              <div className={cn(
                                                                "w-7 h-7 md:w-8 md:h-8 rounded-[10px] flex items-center justify-center transition-all duration-200",
                                                                isCompleted 
                                                                  ? `${sectionThemes.habits.progressCheck} text-white shadow-sm` 
                                                                  : "bg-orange-50 dark:bg-orange-900/30 border border-orange-100 dark:border-orange-800 text-transparent",
                                                                isTodayDate && !isCompleted && "ring-2 ring-orange-400 dark:ring-orange-500 ring-offset-1 ring-offset-white dark:ring-offset-slate-900"
                                                              )}>
                                                                  <Check className="w-3.5 h-3.5 md:w-4 md:h-4" strokeWidth={3} />
                                                              </div>
                                                              <p className={cn("text-[8px] md:text-[9px] font-bold uppercase", isTodayDate ? "text-orange-600 dark:text-orange-400" : "text-slate-400 dark:text-slate-500")}>{format(day, 'EEE', { locale: tr }).slice(0,1)}</p>
                                                        </div>
                                                    )
                                                  })}
                                                </div>
                                              </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* 3. EZBERLER */}
                    {pendingMemorization.length > 0 && (
                        <div className={cn("rounded-[1.5rem] md:rounded-[2rem] p-4 border", sectionThemes.memorization.container)}>
                            <h4 className={cn("font-extrabold text-[10px] md:text-xs uppercase tracking-widest mb-3 md:mb-4 flex items-center gap-1.5 md:gap-2", sectionThemes.memorization.title)}>
                                <BrainCircuit className={cn("h-3.5 w-3.5 md:h-4 md:w-4", sectionThemes.memorization.icon)}/> Ezberler
                            </h4>
                            <div className="grid grid-cols-2 gap-2 md:gap-3">
                                {pendingMemorization.slice(0,2).map(item => (
                                    <Link href="/memorization" key={item.id} className="block group">
                                              <div className={cn("p-3 rounded-[1rem] md:rounded-2xl text-center shadow-sm flex flex-col items-center justify-center min-h-[80px]", sectionThemes.memorization.itemHover)}>
                                                  <p className="font-bold text-xs md:text-sm text-slate-800 dark:text-slate-200 line-clamp-2 leading-tight">{item.title}</p>
                                                  <span className={cn("text-[8px] md:text-[9px] font-bold mt-2 inline-block px-2 py-0.5 rounded-sm", sectionThemes.memorization.badge)}>Çalışılıyor</span>
                                              </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* SAĞ KOLON */}
                <div className="space-y-4 md:space-y-5">
                    
                    {/* 4. VIDEO DERSLER */}
                    {pendingVideos.length > 0 && (
                          <div className={cn("rounded-[1.5rem] md:rounded-[2rem] p-4 border", sectionThemes.videos.container)}>
                            <h4 className={cn("font-extrabold text-[10px] md:text-xs uppercase tracking-widest mb-3 md:mb-4 flex items-center gap-1.5 md:gap-2", sectionThemes.videos.title)}>
                                <Youtube className={cn("h-3.5 w-3.5 md:h-4 md:w-4", sectionThemes.videos.icon)}/> Video Dersler
                            </h4>
                            <div className="space-y-2 md:space-y-3">
                                {pendingVideos.slice(0, 2).map(video => (
                                     <Link href="/videos" key={video.id} className="block group">
                                              <div className={cn("p-3 md:p-4 rounded-[1rem] md:rounded-2xl shadow-sm", sectionThemes.videos.itemHover)}>
                                                  <div className="flex justify-between items-start mb-2 md:mb-3">
                                                      <p className="font-bold text-xs md:text-sm text-slate-800 dark:text-slate-200 line-clamp-1 pr-2">{video.title}</p>
                                                      <div className="bg-rose-100 dark:bg-rose-900/30 p-1 md:p-1.5 rounded-[8px] shadow-sm shrink-0 border border-rose-200 dark:border-rose-800">
                                                          <Youtube className="w-3.5 h-3.5 md:w-4 md:h-4 text-rose-500 dark:text-rose-400"/>
                                                      </div>
                                                  </div>
                                                  <div className="space-y-1 md:space-y-1.5">
                                                      <Progress value={((video.completedVideos || 0) / video.totalVideos) * 100} className="h-1.5 md:h-2 bg-rose-100 dark:bg-rose-950/50 rounded-full" indicatorClassName={sectionThemes.videos.progressIndicator}/>
                                                      <p className="text-[9px] md:text-[10px] text-rose-500 dark:text-rose-400 text-right font-bold">{video.completedVideos || 0} / {video.totalVideos} izlendi</p>
                                                  </div>
                                              </div>
                                      </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 5. OKUMA KÖŞESİ */}
                    {readingBooks.length > 0 && (
                        <div className={cn("rounded-[1.5rem] md:rounded-[2rem] p-4 border", sectionThemes.reading.container)}>
                             <h4 className={cn("font-extrabold text-[10px] md:text-xs uppercase tracking-widest mb-3 md:mb-4 flex items-center gap-1.5 md:gap-2", sectionThemes.reading.title)}>
                                <BookOpen className={cn("h-3.5 w-3.5 md:h-4 md:w-4", sectionThemes.reading.icon)}/> Okuma Köşesi
                            </h4>
                            <div className="space-y-2 md:space-y-3">
                                {readingBooks.slice(0, 2).map(book => (
                                    <Link href="/library" key={book.id} className="block group">
                                              <div className={cn("flex items-center gap-3 p-2.5 md:p-3 rounded-[1rem] md:rounded-2xl shadow-sm", sectionThemes.reading.itemHover)}>
                                                  <div className={cn("w-10 h-14 md:w-12 md:h-16 rounded-[8px] md:rounded-[10px] shadow-sm flex items-center justify-center shrink-0", sectionThemes.reading.bookCover)}>
                                                      <BookOpen className="w-4 h-4 md:w-5 md:h-5 opacity-70"/>
                                                  </div>
                                                  <div className="flex-grow min-w-0">
                                                      <div>
                                                          <p className="font-bold text-xs md:text-sm text-slate-800 dark:text-slate-200 truncate">{book.title}</p>
                                                          <p className="text-[9px] md:text-[10px] text-slate-500 dark:text-slate-400 truncate font-medium mt-0.5">{book.author}</p>
                                                      </div>
                                                      {book.libraryStatus === 'reading' && book.progress !== undefined && (
                                                          <div className="space-y-1 md:space-y-1.5 mt-2">
                                                              <div className="flex justify-between items-center text-[9px] font-bold text-amber-600 dark:text-amber-500">
                                                                  <span>%{book.progress.toFixed(0)}</span>
                                                                  <span>{Math.round((book.progress / 100) * (book.pageCount || 0))} / {book.pageCount} sf</span>
                                                              </div>
                                                              <div className="w-full bg-amber-100 dark:bg-amber-950/50 rounded-full h-1.5 overflow-hidden">
                                                                  <div className={cn("h-full rounded-full transition-all", sectionThemes.reading.progressIndicator)} style={{ width: `${book.progress}%` }}></div>
                                                              </div>
                                                          </div>
                                                      )}
                                                  </div>
                                              </div>
                                      </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 6. YAPILACAKLAR */}
                    {(pendingTests.length > 0 || pendingStudies.length > 0 || pendingTasks.length > 0) && (
                        <div className={cn("rounded-[1.5rem] md:rounded-[2rem] p-4 border", sectionThemes.todo.container)}>
                             <h4 className={cn("font-extrabold text-[10px] md:text-xs uppercase tracking-widest mb-3 md:mb-4 flex items-center gap-1.5 md:gap-2", sectionThemes.todo.title)}>
                                <ListChecks className={cn("h-3.5 w-3.5 md:h-4 md:w-4", sectionThemes.todo.icon)}/> Yapılacaklar
                            </h4>
                            <div className="space-y-4">
                                {(() => {
                                    const todoItems: { id: string; type: 'test' | 'study' | 'task'; item: any; dueDate: Date | null; categoryGroup: string; }[] = [];
                                    
                                    const safeParseDate = (dateStr: string | undefined | null) => {
                                        if (!dateStr) return null;
                                        const parsed = parseISO(dateStr);
                                        return isValid(parsed) ? parsed : null;
                                    };
                                    
                                    pendingTests.forEach(t => todoItems.push({ id: `test-${t.id}`, type: 'test', item: t, dueDate: safeParseDate(t.dueDate), categoryGroup: 'Eğitim & Sınavlar' }));
                                    pendingStudies.forEach(s => todoItems.push({ id: `study-${s.id}`, type: 'study', item: s, dueDate: safeParseDate(s.dueDate), categoryGroup: 'Eğitim & Sınavlar' }));
                                    pendingTasks.forEach(t => {
                                        let group = 'Diğer Görevler';
                                        if (t.category === 'Okul') group = 'Eğitim & Sınavlar';
                                        else if (t.category === 'Ev İşleri' || t.category === 'Aile') group = 'Ev İşleri';
                                        todoItems.push({ id: `task-${t.id}`, type: 'task', item: t, dueDate: safeParseDate(t.dueDate), categoryGroup: group });
                                    });

                                    todoItems.sort((a, b) => {
                                        if (!a.dueDate && !b.dueDate) return 0;
                                        if (!a.dueDate) return 1;
                                        if (!b.dueDate) return -1;
                                        return a.dueDate.getTime() - b.dueDate.getTime();
                                    });

                                    const groups = [
                                        { name: 'Eğitim & Sınavlar', items: todoItems.filter(t => t.categoryGroup === 'Eğitim & Sınavlar') },
                                        { name: 'Ev İşleri', items: todoItems.filter(t => t.categoryGroup === 'Ev İşleri') },
                                        { name: 'Diğer Görevler', items: todoItems.filter(t => t.categoryGroup === 'Diğer Görevler') }
                                    ];

                                    return groups.map(group => {
                                        if (group.items.length === 0) return null;
                                        return (
                                            <div key={group.name} className="space-y-2">
                                                <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">{group.name}</h5>
                                                {group.items.map(todo => {
                                                    if (todo.type === 'test') {
                                                        const test = todo.item as Test & { displayName: string };
                                                        return (
                                                            <Link href={`/education/${test.id}`} key={todo.id} className="block group">
                                                                <div className={cn("flex items-center gap-2.5 p-2 md:p-2.5 rounded-[1rem] relative overflow-hidden pl-3 shadow-sm", sectionThemes.todo.itemHover)}>
                                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
                                                                    <div className="bg-indigo-100 dark:bg-indigo-900/40 p-1.5 rounded-[8px] text-indigo-500 dark:text-indigo-400 shrink-0">
                                                                        <GraduationCap className="w-4 h-4" />
                                                                    </div>
                                                                    <div className="truncate flex-grow">
                                                                        <p className="font-bold text-xs md:text-sm text-slate-800 dark:text-slate-200 truncate">{test.displayName}</p>
                                                                        <div className="flex items-center gap-2 mt-0.5">
                                                                            <p className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">Sınav • {test.subject}</p>
                                                                            {todo.dueDate && <span className="text-[9px] text-rose-500 font-bold">{format(todo.dueDate, 'dd MMM', { locale: tr })}</span>}
                                                                        </div>
                                                                    </div>
                                                                    <ChevronRight className="w-4 h-4 text-indigo-300 dark:text-indigo-700"/>
                                                                </div>
                                                            </Link>
                                                        );
                                                    }
                                                    
                                                    if (todo.type === 'study') {
                                                        const study = todo.item as StudyAssignment;
                                                        return (
                                                            <Link href="/education/study" key={todo.id} className="block group">
                                                                <div className={cn("flex items-center gap-2.5 p-2 md:p-2.5 rounded-[1rem] relative overflow-hidden pl-3 shadow-sm", sectionThemes.todo.itemHover)}>
                                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                                                                    <div className="bg-blue-100 dark:bg-blue-900/40 p-1.5 rounded-[8px] text-blue-500 dark:text-blue-400 shrink-0">
                                                                        <BookOpen className="w-4 h-4" />
                                                                    </div>
                                                                    <div className="truncate flex-grow">
                                                                        <p className="font-bold text-xs md:text-sm text-slate-800 dark:text-slate-200 truncate">{study.topic}</p>
                                                                        <div className="flex items-center gap-2 mt-0.5">
                                                                            <p className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">Çalışma • {study.subject}</p>
                                                                            {todo.dueDate && <span className="text-[9px] text-rose-500 font-bold">{format(todo.dueDate, 'dd MMM', { locale: tr })}</span>}
                                                                        </div>
                                                                    </div>
                                                                    <ChevronRight className="w-4 h-4 text-blue-300 dark:text-blue-700"/>
                                                                </div>
                                                            </Link>
                                                        );
                                                    }

                                                    if (todo.type === 'task') {
                                                        const task = todo.item as Task;
                                                        return (
                                                            <div key={todo.id} className={cn("flex items-start gap-2.5 p-2.5 md:p-3 rounded-[1rem] shadow-sm", sectionThemes.todo.itemHover)}>
                                                                <Checkbox
                                                                    id={`personal-task-${task.id}-${member.id}`}
                                                                    onCheckedChange={() => handleTaskCompletion(task)}
                                                                    className={cn("mt-0.5 rounded-full size-4", sectionThemes.todo.checkbox)}
                                                                />
                                                                <div className="flex-grow pt-0.5">
                                                                    <label htmlFor={`personal-task-${task.id}-${member.id}`} className="text-xs md:text-sm font-bold text-slate-700 dark:text-slate-300 leading-tight cursor-pointer block">{task.title}</label>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        {task.points > 0 && <span className="text-[8px] md:text-[9px] text-indigo-600 dark:text-indigo-400 font-bold inline-block bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded-sm">+{task.points} XP</span>}
                                                                        {todo.dueDate && <span className="text-[9px] text-rose-500 font-bold">{format(todo.dueDate, 'dd MMM', { locale: tr })}</span>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    }

                                                    return null;
                                                })}
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
}
