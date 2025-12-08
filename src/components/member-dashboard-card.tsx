"use client";

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, BrainCircuit, Check, Flame, GraduationCap, Users, ListChecks, Gamepad2, Youtube, Heart, Clock, Trophy } from 'lucide-react';
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

const roleGradients: { [key: string]: string } = {
    Baba: "from-blue-600 to-indigo-800",
    Anne: "from-pink-600 to-purple-800",
    'Kız Çocuk': "from-violet-600 to-fuchsia-800",
    'Erkek Çocuk': "from-teal-600 to-emerald-800",
    Bebek: "from-amber-400 to-orange-600",
    'Ev İşleri': "from-cyan-600 to-blue-700",
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
    
    const { habits, pendingTasks, pendingTests, pendingStudies, completedStudies, readingBooks, pendingMemorization, todaysPrayers, earnedFreeTimeMinutes, pendingVideos } = React.useMemo(() => {
        const memberId = member.id;
        let completedActivityCount = 0;
        const todayKey = format(new Date(), 'yyyy-MM-dd');

        const memberTasks = tasks.filter(t => t.assigneeId === memberId);
        
        // Count completed recurring tasks (habits) for today
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
            earnedFreeTimeMinutes: earnedTime,
        };
    }, [member.id, tasks, tests, studyAssignments, studyPlans, userLibraries, books, videos, memorizationItems, memorizationProgress, prayerProgress, isClient, trackedBooks]);

    const handleTaskCompletion = async (task: Task) => {
        if (!familyId || !member) return;
        try {
            await updateTask(task.id, { completed: true });
            const xpChange = task.points;
            const completedTasksChange = 1;
            const newXp = (member.xp || 0) + xpChange;
            const newLevel = Math.floor(newXp / 1000) + 1;

            await updateFamilyMemberInFamily(familyId, member.id, {
                xp: newXp,
                completedTasks: (member.completedTasks || 0) + completedTasksChange,
                level: newLevel,
            });
            await checkAndAwardBadges(member.id, familyId, { type: 'task_completed', task });
            toast({ title: "🎉 Görev Tamamlandı!", description: `Harika iş, ${member.name}! ${task.points} XP kazandın.` });
        } catch (error) {
            toast({ title: "Hata", description: "Görev güncellenirken bir sorun oluştu.", variant: "destructive" });
        }
    };
    
    const handleHabitCompletion = async (habitId: string, day: Date) => {
        const habit = habits.find(h => h.id === habitId);
        if (!habit) return;

        const dateKey = format(day, 'yyyy-MM-dd');
        const isCompleted = habit.completedDates?.includes(dateKey) || false;
        
        try {
            await updateHabitCompletion(habit.id, day, !isCompleted);
             if (!isCompleted) {
                 toast({ title: '🎉 Alışkanlık tamamlandı!', description: `"${habit.title}" alışkanlığını bugün de tamamladın.` });
             }
        } catch(e) {
            toast({ title: 'Hata', description: 'İşaretleme sırasında bir sorun oluştu.', variant: 'destructive'});
        }
    };
    
    const gradient = roleGradients[member.role] || 'from-gray-700 to-gray-900';

    if (member.id === 'house') {
        const houseTasks = tasks.filter(t => (t.category === 'Ev İşleri' || t.category === 'Görev') && !t.completed);
        if (houseTasks.length === 0) return null;
        
        return (
             <Link href="/tasks" className="block transition-all hover:-translate-y-1 group">
                <Card className="shadow-xl border-0 overflow-hidden bg-gradient-to-br from-teal-600 to-cyan-700 text-white h-full relative">
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
                    <CardHeader className="pb-2">
                        <CardTitle className='flex items-center gap-3 text-xl'>
                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm"><Users className="w-5 h-5"/></div>
                            Ev Görevleri
                        </CardTitle>
                        <CardDescription className="text-teal-100/80">Ortak sorumluluklar</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-4">
                    {houseTasks.slice(0, 3).map(task => {
                        const assignee = familyMembers.find(m => m.id === task.assigneeId);
                        return (
                            <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 hover:bg-white/20 transition-colors">
                            <Checkbox id={`home-task-${task.id}`} className="border-teal-200 text-teal-700 data-[state=checked]:bg-white data-[state=checked]:text-teal-700" />
                            <div className="flex-grow">
                                <label htmlFor={`home-task-${task.id}`} className="font-medium cursor-pointer text-sm">{task.title}</label>
                            </div>
                            {assignee && <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-0 text-[10px]">{assignee.name}</Badge>}
                            </div>
                        );
                    })}
                     {houseTasks.length > 3 && <p className="text-xs text-center text-teal-100/70 pt-2 font-medium">+ {houseTasks.length - 3} görev daha</p>}
                    </CardContent>
                </Card>
            </Link>
        )
    }

    const allPendingItems = [
        ...habits,
        ...pendingTasks,
        ...pendingTests,
        ...pendingStudies,
        ...readingBooks,
        ...pendingMemorization,
        ...todaysPrayers.filter(p => !p.completed),
        ...pendingVideos,
    ];

    if (allPendingItems.length === 0 && completedStudies.length === 0) return null;
    
    const lastSevenDays = Array.from({ length: 7 }).map((_, i) => subDays(new Date(), i)).reverse();


    return (
        <Card className={cn("shadow-xl border-0 overflow-hidden flex flex-col relative transition-all duration-300 hover:shadow-2xl", `bg-gradient-to-br text-white ${gradient}`)}>
            {/* Dekoratif Arka Plan Efektleri */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-48 h-48 bg-black/10 rounded-full blur-3xl pointer-events-none"></div>

            <CardHeader className="border-b border-white/10 relative z-10 pb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white shrink-0 bg-white/20 backdrop-blur-md border-2 border-white/20 shadow-inner">
                                {member.name.charAt(0).toUpperCase()}
                            </div>
                            {['Baba', 'Anne'].includes(member.role) && (
                                <div className="absolute -bottom-1 -right-1 bg-yellow-400 rounded-full p-1 shadow-md">
                                    <Trophy className="w-3 h-3 text-yellow-900" />
                                </div>
                            )}
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-bold tracking-tight">{member.name}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-white border-white/30 bg-white/10 text-[10px] uppercase tracking-wider">{member.role}</Badge>
                                {member.xp ? <span className="text-xs text-white/70 font-medium">{member.xp.toLocaleString()} XP</span> : null}
                            </div>
                        </div>
                    </div>
                </div>
            </CardHeader>
            
            <CardContent className="space-y-6 pt-6 flex-grow relative z-10">
                 {/* Serbest Zaman Widget */}
                 {member.role.includes('Çocuk') && (
                    <div className="relative overflow-hidden rounded-2xl bg-black/20 backdrop-blur-sm border border-white/10 p-4">
                        <div className="flex items-center justify-between relative z-10">
                             <div>
                                <h4 className="font-medium text-sm text-white/90 flex items-center gap-2 mb-1">
                                    <Gamepad2 className="h-4 w-4 text-emerald-300"/> Serbest Zaman
                                </h4>
                                <p className="text-xs text-white/60">Aktivitelerden kazanılan</p>
                             </div>
                             <div className="text-right">
                                <p className="font-bold text-3xl tabular-nums leading-none tracking-tight">{earnedFreeTimeMinutes}<span className="text-sm font-medium ml-1 opacity-70">dk</span></p>
                             </div>
                         </div>
                    </div>
                )}

                {/* Namaz Widget */}
                {member.role.includes('Çocuk') && (todaysPrayers.filter(p=>!p.completed).length > 0) && (
                    <div>
                        <h4 className="font-bold text-[11px] uppercase tracking-widest text-white/70 mb-3 flex items-center gap-2 pl-1">
                            <Clock className="h-3 w-3"/> Namaz Takibi
                        </h4>
                        <Link href="/prayers">
                            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 hover:bg-white/15 transition-colors flex justify-between items-center">
                                {todaysPrayers.map(prayer => (
                                    <div key={prayer.name} className="flex flex-col items-center gap-2 group">
                                         <div className={cn("p-2 rounded-full transition-all duration-300 group-hover:scale-110", prayer.completed ? "bg-emerald-500/20 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "bg-black/20 text-white/30")}>
                                            <Heart className={cn("size-5 transition-all", prayer.completed ? "fill-current" : "")} />
                                         </div>
                                        <p className={cn("text-[10px] font-medium transition-colors", prayer.completed ? "text-emerald-200" : "text-white/40")}>{prayer.name}</p>
                                    </div>
                                ))}
                            </div>
                        </Link>
                    </div>
                )}

                {/* Alışkanlıklar Listesi */}
                {habits.length > 0 && (
                      <div>
                        <h4 className="font-bold text-[11px] uppercase tracking-widest text-white/70 mb-3 flex items-center gap-2 pl-1">
                            <Flame className="h-3 w-3"/> Alışkanlık Zinciri
                        </h4>
                        <div className="space-y-3">
                             {habits.map(habit => {
                                const todayKey = format(new Date(), 'yyyy-MM-dd');
                                return (
                                    <div key={habit.id} className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                                      <p className="font-semibold text-sm mb-3 flex items-center justify-between">
                                          {habit.title}
                                          <Badge className="bg-white/20 hover:bg-white/30 text-[10px] border-0">Haftalık</Badge>
                                      </p>
                                      <div className="flex justify-between items-center px-1">
                                        {lastSevenDays.map(day => {
                                          const dayKey = format(day, 'yyyy-MM-dd');
                                          const isCompleted = habit.completedDates?.includes(dayKey) || false;
                                          const isTodayDate = isToday(day);
                                          return (
                                              <div key={dayKey} className="flex flex-col items-center gap-2" onClick={() => handleHabitCompletion(habit.id, day)}>
                                                  <div className={cn(
                                                      "w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 border",
                                                      isCompleted 
                                                        ? "bg-rose-500 border-rose-400 text-white shadow-lg scale-110" 
                                                        : "bg-white/5 border-white/10 text-white/20 hover:border-white/40",
                                                      isTodayDate && !isCompleted && "ring-2 ring-white/30 ring-offset-2 ring-offset-transparent"
                                                  )}>
                                                      <Check className={cn("w-4 h-4", isCompleted ? "opacity-100" : "opacity-0")} />
                                                  </div>
                                                  <p className={cn("text-[10px] font-medium", isTodayDate ? "text-white" : "text-white/50")}>{format(day, 'EEE', { locale: tr })}</p>
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

                {/* Video Dersler */}
                {pendingVideos.length > 0 && (
                      <div>
                        <h4 className="font-bold text-[11px] uppercase tracking-widest text-white/70 mb-3 flex items-center gap-2 pl-1">
                            <Youtube className="h-3 w-3"/> Video Dersler
                        </h4>
                        <div className="space-y-3">
                        {pendingVideos.slice(0, 2).map(video => (
                             <Link href="/videos" key={video.id} className="block group">
                                <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 hover:bg-white/20 transition-all">
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="font-semibold text-sm line-clamp-1">{video.title}</p>
                                        <div className="bg-red-500/20 p-1 rounded-md"><Youtube className="w-3 h-3 text-red-200"/></div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Progress value={((video.completedVideos || 0) / video.totalVideos) * 100} className="h-1.5 bg-black/20" indicatorClassName="bg-white/90"/>
                                        <p className="text-[10px] text-white/60 text-right font-medium">{video.completedVideos || 0} / {video.totalVideos} tamamlandı</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                        </div>
                    </div>
                )}

                {/* Okunan Kitaplar */}
                 {readingBooks.length > 0 && (
                    <div>
                        <h4 className="font-bold text-[11px] uppercase tracking-widest text-white/70 mb-3 flex items-center gap-2 pl-1">
                            <BookOpen className="h-3 w-3"/> Okuma Köşesi
                        </h4>
                        <div className="space-y-3">
                            {readingBooks.slice(0, 2).map(book => {
                                const pagesRead = book.pageCount && book.progress ? Math.round((book.progress / 100) * book.pageCount) : 0;
                                return (
                                 <Link href="/library" key={book.id} className="block group">
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 hover:bg-white/20 transition-all">
                                        <div className="w-10 h-14 bg-white/20 rounded shadow-sm flex items-center justify-center shrink-0">
                                            <BookOpen className="w-5 h-5 text-white/50"/>
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <p className="font-semibold text-sm truncate">{book.title}</p>
                                            <p className="text-xs text-white/70 truncate mb-1.5">{book.author}</p>
                                            {book.libraryStatus === 'reading' && book.progress !== undefined && (
                                                <div className="flex items-center gap-2">
                                                    <Progress value={book.progress} className="h-1 bg-black/20 flex-grow" indicatorClassName="bg-yellow-300"/>
                                                    <span className="text-[10px] font-bold text-yellow-200">%{book.progress.toFixed(0)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            )})}
                        </div>
                    </div>
                )}

                {/* Ezberler */}
                {pendingMemorization.length > 0 && (
                   <div>
                        <h4 className="font-bold text-[11px] uppercase tracking-widest text-white/70 mb-3 flex items-center gap-2 pl-1">
                            <BrainCircuit className="h-3 w-3"/> Hafızlık & Ezber
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                            {pendingMemorization.slice(0,2).map(item => (
                                <Link href="/memorization" key={item.id} className="block group">
                                    <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 hover:bg-white/20 transition-all text-center">
                                        <p className="font-semibold text-sm truncate">{item.title}</p>
                                        <p className="text-[10px] text-white/60 mt-1 group-hover:text-white/80">Devam ediyor</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Eğitim ve Görevler */}
                {(pendingTests.length > 0 || pendingStudies.length > 0 || completedStudies.length > 0 || pendingTasks.length > 0) && (
                    <div>
                        <h4 className="font-bold text-[11px] uppercase tracking-widest text-white/70 mb-3 flex items-center gap-2 pl-1">
                            <ListChecks className="h-3 w-3"/> Görevler & Ödevler
                        </h4>
                        <div className="space-y-2">
                            {/* Testler */}
                            {pendingTests.map(test => (
                                <Link href={`/education/${test.id}`} key={test.id} className="block group">
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 hover:bg-white/20 transition-all border-l-4 border-l-blue-400">
                                        <div className="truncate">
                                            <p className="font-semibold text-sm truncate">{test.displayName}</p>
                                            <p className="text-[10px] text-white/70 truncate uppercase tracking-wider mt-0.5">Sınav • {test.subject}</p>
                                        </div>
                                    </div>
                                </Link>
                            ))}

                            {/* Çalışmalar */}
                            {pendingStudies.map(study => (
                                <Link href="/education/study" key={study.id} className="block group">
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 hover:bg-white/20 transition-all border-l-4 border-l-purple-400">
                                         <div className="truncate">
                                            <p className="font-semibold text-sm truncate">{study.topic}</p>
                                            <p className="text-[10px] text-white/70 truncate uppercase tracking-wider mt-0.5">Çalışma • {study.subject}</p>
                                        </div>
                                    </div>
                                </Link>
                            ))}

                            {/* Tamamlanan Çalışmalar Accordion */}
                             {completedStudies.length > 0 && (
                                <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="item-1" className="border-0">
                                    <AccordionTrigger className="text-[11px] font-medium text-white/60 hover:text-white hover:no-underline justify-start gap-2 py-2 px-1">
                                        <Check className="w-3 h-3"/> {completedStudies.length} tamamlanan çalışma
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-2 pt-1 pb-2">
                                    {completedStudies.map(study => (
                                        <div key={study.id} className="flex items-center gap-3 p-2 rounded-lg bg-black/20 opacity-70">
                                            <div className="truncate">
                                                <p className="font-medium text-xs text-white/80 line-through">{study.topic}</p>
                                            </div>
                                        </div>
                                    ))}
                                    </AccordionContent>
                                </AccordionItem>
                                </Accordion>
                            )}

                            {/* Normal Görevler */}
                            {pendingTasks.slice(0, 3).map(task => (
                                <div key={task.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/5 hover:bg-white/10 transition-colors">
                                    <Checkbox
                                        id={`personal-task-${task.id}-${member.id}`}
                                        onCheckedChange={() => handleTaskCompletion(task)}
                                        className="mt-0.5 border-white/40 text-emerald-600 data-[state=checked]:bg-white data-[state=checked]:text-emerald-600 ring-offset-transparent"
                                    />
                                    <div className="flex-grow">
                                        <label htmlFor={`personal-task-${task.id}-${member.id}`} className="text-sm font-medium leading-tight cursor-pointer block">{task.title}</label>
                                        {task.points > 0 && <span className="text-[10px] text-emerald-300 font-bold mt-1 inline-block">+{task.points} XP</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}