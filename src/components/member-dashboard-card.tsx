
"use client";

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Book, BookHeart, BookOpen, BrainCircuit, Check, Flame, GraduationCap, UtensilsCrossed, Users, ListChecks, Gamepad2, Youtube, Heart } from 'lucide-react';
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
    Baba: "from-blue-500 to-indigo-600",
    Anne: "from-pink-500 to-purple-600",
    'Kız Çocuk': "from-purple-400 to-violet-500",
    'Erkek Çocuk': "from-teal-400 to-cyan-500",
    Bebek: "from-yellow-400 to-orange-500",
    'Ev İşleri': "from-teal-500 to-cyan-500",
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
        
        const allTopics = trackedBooks.flatMap(book => 
            book.subjects.flatMap(subject => 
                subject.topics.map(topic => ({...topic, subjectName: subject.name}))
            )
        );

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
        
        // This logic is tricky. How do we count a "completed" video activity for the day?
        // Let's assume for now any progress is an activity.
        // A better approach would be to use the daily tracking system.
        // For simplicity, we are not counting videos towards daily free time yet.


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
    
    const gradient = roleGradients[member.role] || 'from-gray-500 to-gray-600';

    if (member.id === 'house') {
        const houseTasks = tasks.filter(t => (t.category === 'Ev İşleri' || t.category === 'Görev') && !t.completed);
        if (houseTasks.length === 0) return null;
        
        return (
             <Link href="/tasks" className="block transition-transform hover:-translate-y-1 group">
                <Card className="shadow-lg bg-gradient-to-br from-teal-500 to-cyan-500 text-white h-full">
                    <CardHeader>
                    <CardTitle className='flex items-center gap-2'><Users/> Ev Görevleri</CardTitle>
                    <CardDescription className="text-white/80">Ailenin genel görevleri ve sorumlulukları.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                    {houseTasks.slice(0, 3).map(task => {
                        const assignee = familyMembers.find(m => m.id === task.assigneeId);
                        return (
                            <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/20 backdrop-blur-sm">
                            <Checkbox id={`home-task-${task.id}`} className="border-white text-white ring-offset-white data-[state=checked]:bg-white data-[state=checked]:text-teal-600" />
                            <div className="flex-grow">
                                <label htmlFor={`home-task-${task.id}`} className="font-semibold cursor-pointer">{task.title}</label>
                            </div>
                            {assignee && <Badge variant="secondary" className="bg-white/30 text-white">{assignee.name}</Badge>}
                            </div>
                        );
                    })}
                     {houseTasks.length > 3 && <p className="text-xs text-center text-white/80">+ {houseTasks.length - 3} görev daha</p>}
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
        <Card className={cn("shadow-lg overflow-hidden flex flex-col", `bg-gradient-to-br text-white ${gradient}`)}>
            <CardHeader className="border-b border-white/20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0 bg-white/20">
                        {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <CardTitle>{member.name}'in Panosu</CardTitle>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 flex-grow">
                 {member.role.includes('Çocuk') && (
                    <div>
                         <h4 className="font-semibold text-sm mb-2 text-white/80 flex items-center gap-2"><Gamepad2 className="h-4 w-4"/> Bugünkü Serbest Zaman</h4>
                         <div className="p-3 rounded-lg bg-white/20 backdrop-blur-sm text-center">
                            <p className="font-bold text-2xl">{earnedFreeTimeMinutes} <span className="text-base font-medium">dakika</span></p>
                            <p className="text-xs text-white/80">Tamamlanan {Math.floor(earnedFreeTimeMinutes / 15)} aktivite için</p>
                         </div>
                    </div>
                )}
                {member.role.includes('Çocuk') && (todaysPrayers.filter(p=>!p.completed).length > 0) && (
                    <div>
                        <h4 className="font-semibold text-sm mb-2 text-white/80 flex items-center gap-2"><Check className="h-4 w-4"/> Bugünkü Namazlar</h4>
                        <Link href="/prayers">
                            <div className="p-2.5 rounded-lg bg-white/20 backdrop-blur-sm flex justify-around items-center gap-1">
                                {todaysPrayers.map(prayer => (
                                    <div key={prayer.name} className="flex flex-col items-center gap-1">
                                         <Heart className={cn("size-6 cursor-pointer transition-all hover:scale-110", prayer.completed ? "text-red-400 fill-current" : "text-white/30")} />
                                        <p className="text-xs text-white/80">{prayer.name}</p>
                                    </div>
                                ))}
                            </div>
                        </Link>
                    </div>
                )}
                {habits.length > 0 && (
                     <div>
                        <h4 className="font-semibold text-sm mb-2 text-white/80 flex items-center gap-2"><Flame className="h-4 w-4"/> Bugünkü Alışkanlıklar</h4>
                        <div className="space-y-3">
                             {habits.map(habit => {
                                const todayKey = format(new Date(), 'yyyy-MM-dd');
                                return (
                                    <div key={habit.id} className="p-2.5 rounded-lg bg-white/20 backdrop-blur-sm">
                                      <p className="font-semibold text-sm mb-2">{habit.title}</p>
                                      <div className="flex justify-around items-center">
                                        {lastSevenDays.map(day => {
                                          const dayKey = format(day, 'yyyy-MM-dd');
                                          const isCompleted = habit.completedDates?.includes(dayKey) || false;
                                          return (
                                            <div key={dayKey} className="flex flex-col items-center gap-1" onClick={() => handleHabitCompletion(habit.id, day)}>
                                                <Heart className={cn("size-6 cursor-pointer transition-all hover:scale-110", isCompleted ? "text-red-400 fill-current" : "text-white/30")} />
                                                <p className="text-xs text-white/80">{format(day, 'EEE', { locale: tr })}</p>
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
                {pendingVideos.length > 0 && (
                     <div>
                        <h4 className="font-semibold text-sm mb-2 text-white/80 flex items-center gap-2"><Youtube className="h-4 w-4"/> Video Dersler</h4>
                        <div className="space-y-3">
                        {pendingVideos.slice(0, 2).map(video => (
                             <Link href="/videos" key={video.id} className="block">
                                <div className="flex flex-col gap-2 p-2.5 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/30">
                                    <div className="truncate"><p className="font-semibold truncate text-sm">{video.title}</p></div>
                                    <div>
                                        <Progress value={((video.completedVideos || 0) / video.totalVideos) * 100} className="h-1.5 bg-white/20" indicatorClassName="bg-white"/>
                                        <p className="text-xs text-white/80 mt-1 text-right">{video.completedVideos || 0} / {video.totalVideos} video</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                        </div>
                    </div>
                )}
                 {readingBooks.length > 0 && (
                   <div>
                        <h4 className="font-semibold text-sm mb-2 text-white/80 flex items-center gap-2"><BookOpen className="h-4 w-4"/> Okunan Kitaplar</h4>
                        <div className="space-y-3">
                            {readingBooks.slice(0, 2).map(book => {
                                const pagesRead = book.pageCount && book.progress ? Math.round((book.progress / 100) * book.pageCount) : 0;
                                return (
                                 <Link href="/library" key={book.id} className="block">
                                    <div className="flex flex-col gap-2 p-2.5 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/30">
                                        <div className="truncate"><p className="font-semibold truncate text-sm">{book.title}</p><p className="text-xs text-white/80 truncate">{book.author}</p></div>
                                        {book.libraryStatus === 'reading' && book.progress !== undefined && (
                                            <div>
                                                <Progress value={book.progress} className="h-1.5 bg-white/20" indicatorClassName="bg-white"/>
                                                {book.pageCount ? (
                                                     <p className="text-xs text-white/80 mt-1 text-right">{pagesRead} / {book.pageCount} sayfa</p>
                                                ) : (
                                                    <p className="text-xs text-white/80 mt-1 text-right">%{book.progress.toFixed(0)}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            )})}
                        </div>
                    </div>
                )}
                {pendingMemorization.length > 0 && (
                   <div>
                        <h4 className="font-semibold text-sm mb-2 text-white/80 flex items-center gap-2"><BrainCircuit className="h-4 w-4"/> Ezberlenecekler</h4>
                        <div className="space-y-2">
                            {pendingMemorization.slice(0,2).map(item => (
                                <Link href="/memorization" key={item.id} className="block">
                                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/30">
                                        <div className="truncate"><p className="font-semibold truncate text-sm">{item.title}</p></div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
                {(pendingTests.length > 0 || pendingStudies.length > 0 || completedStudies.length > 0) && (
                   <div>
                        <h4 className="font-semibold text-sm mb-2 text-white/80 flex items-center gap-2"><GraduationCap className="h-4 w-4"/> Eğitim</h4>
                        <div className="space-y-2">
                            {pendingTests.map(test => (
                                <Link href={`/education/${test.id}`} key={test.id} className="block">
                                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/30">
                                        <div className="truncate">
                                            <p className="font-semibold truncate text-sm">{test.displayName}</p>
                                            <p className="text-xs text-white/80 truncate">{test.subject}</p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                            {pendingStudies.map(study => (
                                <Link href="/education/study" key={study.id} className="block">
                                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/30">
                                         <div className="truncate">
                                            <p className="font-semibold truncate text-sm">{study.topic}</p>
                                            <p className="text-xs text-white/80 truncate">{study.studyPlanTitle} - {study.subject}</p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                             {completedStudies.length > 0 && (
                                <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="item-1" className="border-b-0">
                                    <AccordionTrigger className="text-xs text-white/80 hover:no-underline justify-start gap-1 p-1">
                                        Tamamlanan {completedStudies.length} Konuyu Göster
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-2 pt-2">
                                    {completedStudies.map(study => (
                                        <div key={study.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-black/10">
                                            <Check className="h-4 w-4 text-white/70" />
                                            <div className="truncate">
                                                <p className="font-semibold truncate text-sm text-white/70 line-through">{study.topic}</p>
                                                <p className="text-xs text-white/60 truncate">{study.studyPlanTitle} - {study.subject}</p>
                                            </div>
                                        </div>
                                    ))}
                                    </AccordionContent>
                                </AccordionItem>
                                </Accordion>
                            )}
                        </div>
                    </div>
                )}
                {pendingTasks.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-sm mb-2 text-white/80 flex items-center gap-2"><ListChecks className="h-4 w-4"/> Bekleyen Görevler</h4>
                        <div className="space-y-3">
                        {pendingTasks.slice(0, 2).map(task => (
                            <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/20 backdrop-blur-sm">
                                <Checkbox
                                    id={`personal-task-${task.id}-${member.id}`}
                                    onCheckedChange={() => handleTaskCompletion(task)}
                                    className="border-white text-white ring-offset-background data-[state=checked]:bg-white data-[state=checked]:text-primary"
                                />
                                <div className="flex-grow">
                                    <label htmlFor={`personal-task-${task.id}-${member.id}`} className="font-semibold cursor-pointer">{task.title}</label>
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
