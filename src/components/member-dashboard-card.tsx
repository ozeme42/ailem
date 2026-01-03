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
import { format, isToday, parseISO, subDays } from 'date-fns';
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

// --- Bölüm Temaları (Açık Tema / Light Theme) ---
const sectionThemes = {
    prayer: { 
        container: "bg-teal-50 border-teal-200 shadow-sm",
        title: "text-teal-800",
        icon: "text-teal-600",
        itemBg: "bg-white border-teal-100 hover:bg-teal-50",
        activeItem: "bg-teal-500 text-white shadow-md shadow-teal-500/20"
    },
    habits: { 
        container: "bg-orange-50 border-orange-200 shadow-sm",
        title: "text-orange-800",
        icon: "text-orange-600",
        itemBg: "bg-white border-orange-100 hover:bg-orange-50",
        progressCheck: "bg-orange-500"
    },
    memorization: { 
        container: "bg-violet-50 border-violet-200 shadow-sm",
        title: "text-violet-800",
        icon: "text-violet-600",
        itemHover: "hover:border-violet-300 hover:bg-violet-100 transition-all bg-white border-violet-100",
        badge: "bg-violet-100 text-violet-700 border-violet-200"
    },
    videos: { 
        container: "bg-rose-50 border-rose-200 shadow-sm",
        title: "text-rose-800",
        icon: "text-rose-600",
        itemHover: "hover:border-rose-300 hover:bg-rose-100 transition-all bg-white border-rose-100",
        progressIndicator: "bg-rose-500"
    },
    reading: { 
        container: "bg-amber-50 border-amber-200 shadow-sm",
        title: "text-amber-800",
        icon: "text-amber-600",
        itemHover: "hover:border-amber-300 hover:bg-amber-100 transition-all bg-white border-amber-100",
        bookCover: "bg-amber-100 text-amber-600 border-amber-200",
        progressIndicator: "bg-amber-500"
    },
    todo: { 
        container: "bg-indigo-50 border-indigo-200 shadow-sm",
        title: "text-indigo-800",
        icon: "text-indigo-600",
        itemHover: "hover:border-indigo-300 hover:bg-indigo-100 transition-all bg-white border-indigo-100",
        checkbox: "data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 border-indigo-300 text-white"
    }
};

// Rol Temaları (Açık Tema)
const roleThemes: { [key: string]: { text: string, badge: string, bgRing: string } } = {
    Baba: { text: "text-blue-900", badge: "bg-blue-100 text-blue-700 border-blue-200", bgRing: "ring-blue-200" },
    Anne: { text: "text-pink-900", badge: "bg-pink-100 text-pink-700 border-pink-200", bgRing: "ring-pink-200" },
    'Kız Çocuk': { text: "text-violet-900", badge: "bg-violet-100 text-violet-700 border-violet-200", bgRing: "ring-violet-200" },
    'Erkek Çocuk': { text: "text-emerald-900", badge: "bg-emerald-100 text-emerald-700 border-emerald-200", bgRing: "ring-emerald-200" },
    Bebek: { text: "text-amber-900", badge: "bg-amber-100 text-amber-700 border-amber-200", bgRing: "ring-amber-200" },
    'Ev İşleri': { text: "text-cyan-900", badge: "bg-cyan-100 text-cyan-700 border-cyan-200", bgRing: "ring-cyan-200" },
};

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
    const { habits, pendingTasks, pendingTests, pendingStudies, completedStudies, readingBooks, pendingMemorization, todaysPrayers, earnedFreeTimeMinutes, pendingVideos } = React.useMemo(() => {
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
            
        const completedStudies = memberStudyAssignments
            .filter(sa => sa.status === 'completed')
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
            completedStudies, 
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
            toast({ title: "🎉 Görev Tamamlandı!", description: `${task.points} XP kazandın.`, className: "bg-indigo-100 border-indigo-200 text-indigo-800" });
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
             if (!isCompleted) toast({ title: '🎉 Süper!', description: `"${habit.title}" tamamlandı.`, className: "bg-orange-100 border-orange-200 text-orange-800" });
        } catch(e) {
            toast({ title: 'Hata', variant: 'destructive'});
        }
    };
    
    const theme = roleThemes[member.role] || { text: "text-slate-800", badge: "bg-slate-100 text-slate-600 border-slate-200", bgRing: "ring-slate-200" };
    const allPendingItems = [...habits, ...pendingTasks, ...pendingTests, ...pendingStudies, ...readingBooks, ...pendingMemorization, ...pendingVideos, ...todaysPrayers.filter(p => !p.completed)];
    const lastSevenDays = Array.from({ length: 7 }).map((_, i) => subDays(new Date(), i)).reverse();

    // --- EV KARTI (LIGHT GLASS) ---
    if (member.id === 'house') {
        const houseTasks = tasks.filter(t => (t.category === 'Ev İşleri' || t.category === 'Görev') && !t.completed);
        if (houseTasks.length === 0) return null;
        
        return (
             <Link href="/tasks" className="block transition-all hover:-translate-y-1 group relative z-10">
                <Card className="shadow-md border border-cyan-100 bg-gradient-to-br from-cyan-50 to-blue-50 overflow-hidden h-full">
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 bg-cyan-100/50 rounded-full blur-2xl pointer-events-none"></div>
                    <CardHeader className="pb-3 border-b border-cyan-100 relative">
                        <CardTitle className='flex items-center gap-3 text-lg text-cyan-800 font-bold'>
                            <div className="p-2 bg-white shadow-sm rounded-xl text-cyan-600 border border-cyan-100"><Users className="w-5 h-5"/></div>
                            Ev Görevleri
                        </CardTitle>
                        <CardDescription className="text-cyan-600/80 font-medium">Ortak sorumluluklar</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-4 relative">
                    {houseTasks.slice(0, 3).map(task => {
                        const assignee = familyMembers.find(m => m.id === task.assigneeId);
                        return (
                            <div key={task.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-cyan-100 shadow-sm hover:bg-cyan-50/50 transition-all">
                            <Checkbox id={`home-task-${task.id}`} className="border-cyan-300 text-cyan-600 data-[state=checked]:bg-cyan-600 data-[state=checked]:text-white rounded-full" />
                            <div className="flex-grow">
                                <label htmlFor={`home-task-${task.id}`} className="font-semibold cursor-pointer text-sm text-slate-700">{task.title}</label>
                            </div>
                            {assignee && <Badge variant="secondary" className="bg-cyan-100 text-cyan-700 border border-cyan-200 text-[10px] font-bold px-2">{assignee.name}</Badge>}
                            </div>
                        );
                    })}
                     {houseTasks.length > 3 && <p className="text-xs text-center text-cyan-600/70 pt-2 font-bold flex items-center justify-center gap-1"><Sparkles className="w-3 h-3"/> + {houseTasks.length - 3} görev daha</p>}
                    </CardContent>
                </Card>
            </Link>
        )
    }

    if (allPendingItems.length === 0 && completedStudies.length === 0) return null;

    return (
        <Card className="shadow-none border-0 bg-transparent flex flex-col gap-6 relative z-10">
            
            {/* --- HEADER --- */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-6 rounded-[2rem] bg-white border border-slate-100 shadow-md relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                 
                 <div className="relative shrink-0 z-10">
                    <div className={cn("w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black text-white shadow-lg ring-4 ring-offset-2 ring-offset-white", theme.bgRing)} style={{ backgroundColor: member.color }}>
                        {member.name.charAt(0).toUpperCase()}
                    </div>
                    {['Baba', 'Anne'].includes(member.role) && (
                        <div className="absolute -bottom-2 -right-2 bg-amber-400 text-white rounded-full p-1.5 shadow-md border-2 border-white">
                            <Trophy className="w-4 h-4 fill-current" />
                        </div>
                    )}
                </div>
                <div className="text-center sm:text-left flex-grow z-10">
                    <h3 className={cn("text-3xl font-black tracking-tight", theme.text)}>{member.name}</h3>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                        <Badge variant="outline" className={cn("text-xs uppercase font-extrabold tracking-wider px-3 py-1 rounded-full", theme.badge)}>
                            {member.role}
                        </Badge>
                        {member.xp ? <span className="text-sm text-slate-500 font-bold flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500"/> {member.xp.toLocaleString()} XP</span> : null}
                    </div>
                </div>

                {/* Serbest Zaman */}
                {member.role.includes('Çocuk') && (
                    <div className="sm:ml-auto mt-3 sm:mt-0 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm min-w-[160px] z-10">
                        <div className="p-3 bg-white rounded-xl text-emerald-500 shadow-sm border border-emerald-100">
                             <Gamepad2 className="w-6 h-6" />
                        </div>
                        <div>
                             <p className="text-[10px] text-emerald-600/80 font-extrabold uppercase tracking-wider">Serbest Zaman</p>
                             <p className="text-2xl font-black text-emerald-600 leading-none mt-0.5">{earnedFreeTimeMinutes}<span className="text-sm font-bold ml-0.5 opacity-80">dk</span></p>
                        </div>
                    </div>
                )}
            </div>

            {/* --- GRID --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                
                {/* SOL KOLON */}
                <div className="space-y-6">
                      
                      {/* 1. NAMAZ TAKİBİ */}
                    {member.role.includes('Çocuk') && (todaysPrayers.filter(p=>!p.completed).length > 0) && (
                        <div className={cn("rounded-[2rem] p-6 border transition-all hover:shadow-md", sectionThemes.prayer.container)}>
                            <h4 className={cn("font-extrabold text-xs uppercase tracking-widest mb-5 flex items-center gap-2", sectionThemes.prayer.title)}>
                                <Clock className={cn("h-4 w-4", sectionThemes.prayer.icon)}/> Namaz Takibi
                            </h4>
                            <div className="flex justify-between items-center gap-2 p-3 bg-white rounded-2xl border border-teal-100 shadow-sm">
                                {todaysPrayers.map(prayer => (
                                    <div key={prayer.name} className="flex flex-col items-center gap-2 group">
                                                 <div className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm border-2",
                                                prayer.completed 
                                                    ? `${sectionThemes.prayer.activeItem} border-teal-500 scale-110` 
                                                    : "bg-teal-50 border-teal-100 text-slate-400 group-hover:border-teal-200 group-hover:text-teal-500"
                                            )}>
                                                <Heart className={cn("w-5 h-5 transition-all", prayer.completed ? "fill-white" : "fill-none")} />
                                             </div>
                                            <p className={cn("text-[10px] font-bold transition-colors", prayer.completed ? "text-teal-600" : "text-slate-400 group-hover:text-teal-500")}>{prayer.name}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 2. ALIŞKANLIKLAR */}
                    {habits.length > 0 && (
                          <div className={cn("rounded-[2rem] p-6 border transition-all hover:shadow-md", sectionThemes.habits.container)}>
                            <h4 className={cn("font-extrabold text-xs uppercase tracking-widest mb-5 flex items-center gap-2", sectionThemes.habits.title)}>
                                <Flame className={cn("h-4 w-4", sectionThemes.habits.icon)}/> Alışkanlık Zinciri
                            </h4>
                            <div className="space-y-4">
                                 {habits.map(habit => {
                                    return (
                                              <div key={habit.id} className={cn("rounded-2xl p-4 border shadow-sm", sectionThemes.habits.itemBg)}>
                                                <div className="flex justify-between items-center mb-4">
                                                  <p className="font-bold text-sm text-slate-700 line-clamp-1">{habit.title}</p>
                                                  <Badge variant="secondary" className="bg-orange-100 text-orange-600 text-[9px] border border-orange-200 font-bold px-2">Haftalık</Badge>
                                                </div>
                                                <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-orange-100 shadow-inner">
                                                  {lastSevenDays.map(day => {
                                                    const dayKey = format(day, 'yyyy-MM-dd');
                                                    const isCompleted = habit.completedDates?.includes(dayKey) || false;
                                                    const isTodayDate = isToday(day);
                                                    return (
                                                        <div key={dayKey} className="flex flex-col items-center gap-1.5 cursor-pointer group" onClick={() => handleHabitCompletion(habit.id, day)}>
                                                              <div className={cn(
                                                                "w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300 border-2",
                                                                isCompleted 
                                                                  ? `${sectionThemes.habits.progressCheck} border-orange-600 text-white shadow-md scale-105` 
                                                                  : "bg-orange-50 border-orange-100 text-transparent hover:border-orange-300 hover:bg-orange-100",
                                                                isTodayDate && !isCompleted && "ring-2 ring-orange-200 ring-offset-1 ring-offset-white border-orange-300"
                                                              )}>
                                                                  <Check className="w-4 h-4" strokeWidth={3} />
                                                              </div>
                                                              <p className={cn("text-[9px] font-bold uppercase", isTodayDate ? "text-orange-600" : "text-slate-400 group-hover:text-orange-500")}>{format(day, 'EEE', { locale: tr }).slice(0,1)}</p>
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
                        <div className={cn("rounded-[2rem] p-6 border transition-all hover:shadow-md", sectionThemes.memorization.container)}>
                            <h4 className={cn("font-extrabold text-xs uppercase tracking-widest mb-5 flex items-center gap-2", sectionThemes.memorization.title)}>
                                <BrainCircuit className={cn("h-4 w-4", sectionThemes.memorization.icon)}/> Ezberler
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                {pendingMemorization.slice(0,2).map(item => (
                                    <Link href="/memorization" key={item.id} className="block group">
                                              <div className={cn("p-4 rounded-2xl transition-all text-center shadow-sm", sectionThemes.memorization.itemHover)}>
                                                  <p className="font-bold text-sm text-slate-700 truncate">{item.title}</p>
                                                  <span className={cn("text-[10px] font-bold mt-2 inline-block px-2.5 py-0.5 rounded-full", sectionThemes.memorization.badge)}>Çalışılıyor</span>
                                              </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* SAĞ KOLON */}
                <div className="space-y-6">
                    
                    {/* 4. VIDEO DERSLER */}
                    {pendingVideos.length > 0 && (
                          <div className={cn("rounded-[2rem] p-6 border transition-all hover:shadow-md", sectionThemes.videos.container)}>
                            <h4 className={cn("font-extrabold text-xs uppercase tracking-widest mb-5 flex items-center gap-2", sectionThemes.videos.title)}>
                                <Youtube className={cn("h-4 w-4", sectionThemes.videos.icon)}/> Video Dersler
                            </h4>
                            <div className="space-y-4">
                                {pendingVideos.slice(0, 2).map(video => (
                                     <Link href="/videos" key={video.id} className="block group">
                                              <div className={cn("p-4 rounded-2xl shadow-sm", sectionThemes.videos.itemHover)}>
                                                  <div className="flex justify-between items-start mb-3">
                                                      <p className="font-bold text-sm text-slate-700 line-clamp-1 pr-2">{video.title}</p>
                                                      <div className="bg-rose-100 p-1.5 rounded-lg shadow-sm shrink-0 border border-rose-200"><Youtube className="w-4 h-4 text-rose-500"/></div>
                                                  </div>
                                                  <div className="space-y-2">
                                                      <Progress value={((video.completedVideos || 0) / video.totalVideos) * 100} className="h-2 bg-rose-100 rounded-full" indicatorClassName={sectionThemes.videos.progressIndicator}/>
                                                      <p className="text-[10px] text-rose-500 text-right font-bold">{video.completedVideos || 0} / {video.totalVideos} izlendi</p>
                                                  </div>
                                              </div>
                                      </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 5. OKUMA KÖŞESİ */}
                    {readingBooks.length > 0 && (
                        <div className={cn("rounded-[2rem] p-6 border transition-all hover:shadow-md", sectionThemes.reading.container)}>
                             <h4 className={cn("font-extrabold text-xs uppercase tracking-widest mb-5 flex items-center gap-2", sectionThemes.reading.title)}>
                                <BookOpen className={cn("h-4 w-4", sectionThemes.reading.icon)}/> Okuma Köşesi
                            </h4>
                            <div className="space-y-4">
                                {readingBooks.slice(0, 2).map(book => (
                                    <Link href="/library" key={book.id} className="block group">
                                              <div className={cn("flex items-center gap-4 p-4 rounded-2xl shadow-sm", sectionThemes.reading.itemHover)}>
                                                  <div className={cn("w-12 h-16 rounded-lg shadow-sm border flex items-center justify-center shrink-0", sectionThemes.reading.bookCover)}>
                                                      <BookOpen className="w-6 h-6"/>
                                                  </div>
                                                  <div className="flex-grow min-w-0">
                                                      <div>
                                                          <p className="font-bold text-sm text-slate-700 truncate">{book.title}</p>
                                                          <p className="text-xs text-slate-500 truncate font-medium">{book.author}</p>
                                                      </div>
                                                      {book.libraryStatus === 'reading' && book.progress !== undefined && (
                                                          <div className="space-y-1.5 mt-2">
                                                              <div className="flex justify-between items-center text-[10px] font-bold text-amber-600">
                                                                  <span>%{book.progress.toFixed(0)}</span>
                                                                  <span>{Math.round((book.progress / 100) * (book.pageCount || 0))} / {book.pageCount} sayfa</span>
                                                              </div>
                                                              <div className="w-full bg-amber-100 rounded-full h-2 overflow-hidden">
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
                    {(pendingTests.length > 0 || pendingStudies.length > 0 || pendingTasks.length > 0 || completedStudies.length > 0) && (
                        <div className={cn("rounded-[2rem] p-6 border transition-all hover:shadow-md", sectionThemes.todo.container)}>
                             <h4 className={cn("font-extrabold text-xs uppercase tracking-widest mb-5 flex items-center gap-2", sectionThemes.todo.title)}>
                                <ListChecks className={cn("h-4 w-4", sectionThemes.todo.icon)}/> Yapılacaklar
                            </h4>
                            <div className="space-y-3">
                                {/* Testler */}
                                {pendingTests.map(test => (
                                    <Link href={`/education/${test.id}`} key={test.id} className="block group">
                                              <div className={cn("flex items-center gap-4 p-3 rounded-2xl relative overflow-hidden pl-3 shadow-sm", sectionThemes.todo.itemHover)}>
                                                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500"></div>
                                                  <div className="bg-indigo-100 p-2 rounded-xl text-indigo-500 shadow-sm shrink-0 border border-indigo-200">
                                                      <GraduationCap className="w-4 h-4" />
                                                  </div>
                                                  <div className="truncate flex-grow">
                                                       <p className="font-bold text-sm text-slate-700 truncate">{test.displayName}</p>
                                                       <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">Sınav • {test.subject}</p>
                                                  </div>
                                                  <ChevronRight className="w-4 h-4 text-indigo-300 group-hover:text-indigo-500 transition-colors"/>
                                              </div>
                                      </Link>
                                ))}

                                {/* Çalışmalar/Ödevler */}
                                {pendingStudies.map(study => (
                                    <Link href="/education/study" key={study.id} className="block group">
                                              <div className={cn("flex items-center gap-4 p-3 rounded-2xl relative overflow-hidden pl-3 shadow-sm", sectionThemes.todo.itemHover)}>
                                                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500"></div>
                                                   <div className="bg-blue-100 p-2 rounded-xl text-blue-500 shadow-sm shrink-0 border border-blue-200">
                                                      <BookOpen className="w-4 h-4" />
                                                  </div>
                                                  <div className="truncate flex-grow">
                                                       <p className="font-bold text-sm text-slate-700 truncate">{study.topic}</p>
                                                       <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Çalışma • {study.subject}</p>
                                                  </div>
                                                  <ChevronRight className="w-4 h-4 text-blue-300 group-hover:text-blue-500 transition-colors"/>
                                              </div>
                                      </Link>
                                ))}

                                {/* Tamamlanan Çalışmalar (Accordion) */}
                                {completedStudies.length > 0 && (
                                    <Accordion type="single" collapsible className="w-full border border-indigo-100 rounded-2xl bg-indigo-50 shadow-sm overflow-hidden">
                                                <AccordionItem value="item-1" className="border-0">
                                                    <AccordionTrigger className="text-xs font-bold text-slate-500 hover:text-slate-700 justify-start gap-2 py-3 px-4 no-underline hover:bg-white transition-colors">
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-500"/> {completedStudies.length} tamamlanan çalışma
                                                    </AccordionTrigger>
                                                    <AccordionContent className="space-y-1 px-4 pb-4 bg-white">
                                                        {completedStudies.map(study => (
                                                            <div key={study.id} className="flex items-center gap-3 pl-2 py-1">
                                                                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
                                                                <p className="text-xs font-medium text-slate-400 line-through truncate">{study.topic}</p>
                                                            </div>
                                                        ))}
                                                    </AccordionContent>
                                                </AccordionItem>
                                        </Accordion>
                                )}

                                {/* Normal Görevler */}
                                {pendingTasks.slice(0, 4).map(task => (
                                    <div key={task.id} className={cn("flex items-start gap-3 p-3 rounded-2xl shadow-sm", sectionThemes.todo.itemHover)}>
                                              <Checkbox
                                                  id={`personal-task-${task.id}-${member.id}`}
                                                  onCheckedChange={() => handleTaskCompletion(task)}
                                                  className={cn("mt-0.5 rounded-full", sectionThemes.todo.checkbox)}
                                              />
                                              <div className="flex-grow">
                                                  <label htmlFor={`personal-task-${task.id}-${member.id}`} className="text-sm font-bold text-slate-600 leading-tight cursor-pointer block hover:text-slate-800 transition-colors">{task.title}</label>
                                                  {task.points > 0 && <span className="text-[10px] text-blue-600 font-bold mt-1 inline-block bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">+{task.points} XP</span>}
                                              </div>
                                      </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
}