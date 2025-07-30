

"use client";

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Book, BookHeart, BookOpen, BrainCircuit, Check, Flame, GraduationCap, UtensilsCrossed, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { updateTask, checkAndAwardBadges, updateFamilyMemberInFamily } from '@/lib/dataService';
import { FamilyMember, Task, Test, StudyAssignment, UserLibrary, MemorizationProgress, MemorizationItem, Book as BookType, StudyPlan } from '@/lib/data';

interface MemberDashboardCardProps {
    member: FamilyMember;
    tasks: Task[];
    tests: Test[];
    studyAssignments: StudyAssignment[];
    studyPlans: StudyPlan[];
    userLibraries: UserLibrary[];
    books: BookType[];
    memorizationItems: MemorizationItem[];
    memorizationProgress: MemorizationProgress[];
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
    memorizationItems,
    memorizationProgress,
}: MemberDashboardCardProps) {
    const { toast } = useToast();
    const { familyId } = useAuth();
    
    const { habits, otherTasks, pendingTests, pendingStudies, readingBooks, pendingMemorization } = React.useMemo(() => {
        const memberTasks = tasks.filter(t => t.assigneeId === member.id && !t.completed);
        const habits = memberTasks.filter(t => t.isRecurring);
        const otherTasks = memberTasks.filter(t => !t.isRecurring && t.category === 'Kişisel');
        
        const pendingTests = tests.filter(t => t.studentId === member.id && t.status === 'Atandı');
        
        const pendingStudies = studyAssignments
            .filter(sa => sa.studentId === member.id && sa.status === 'assigned')
            .map(sa => ({...sa, studyPlanTitle: studyPlans.find(p => p.id === sa.studyPlanId)?.title }));

        const memberLib = userLibraries.find(lib => lib.memberId === member.id);
        const readingBooks = memberLib?.books
            .filter(b => b.status === 'to-read' || b.status === 'reading')
            .map(b => books.find(book => book.id === b.bookId))
            .filter((b): b is BookType => !!b)
            .sort((a,b) => (memberLib.books.find(ub => ub.bookId === a.id)?.status === 'reading' ? -1 : 1)) || [];
            
        const memberProgress = new Set(memorizationProgress.filter(p => p.memberId === member.id && !p.completed).map(p => p.itemId));
        const pendingMemorization = memorizationItems.filter(item => memberProgress.has(item.id));

        return { habits, otherTasks, pendingTests, pendingStudies, readingBooks, pendingMemorization };
    }, [member, tasks, tests, studyAssignments, studyPlans, userLibraries, books, memorizationItems, memorizationProgress]);

    const handleTaskCompletion = async (task: Task) => {
        if (!familyId) return;
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
    
    if (member.id === 'house') {
        const houseTasks = tasks.filter(t => t.category === 'Ev İşleri' && !t.completed);
        if (houseTasks.length === 0) return null;
        
        return (
             <Link href="/tasks" className="block transition-transform hover:-translate-y-1 group">
                <Card className="shadow-lg bg-gradient-to-br from-teal-500 to-cyan-500 text-white h-full">
                    <CardHeader>
                    <CardTitle className='flex items-center gap-2'><Users/> Ev İşleri</CardTitle>
                    <CardDescription className="text-white/80">Ailenin genel ev işleri ve sorumlulukları.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                    {houseTasks.map(task => {
                        const assignee = familyId ? { id: task.assigneeId, name: 'Bilinmeyen' } as FamilyMember : undefined;
                        return (
                            <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/20 backdrop-blur-sm">
                            <Checkbox id={`home-task-${task.id}`} className="border-white text-white ring-offset-white data-[state=checked]:bg-white data-[state=checked]:text-teal-600" />
                            <div className="flex-grow">
                                <label htmlFor={`home-task-${task.id}`} className="font-semibold cursor-pointer">{task.title}</label>
                            </div>
                            </div>
                        );
                    })}
                    </CardContent>
                </Card>
            </Link>
        )
    }

    const allPendingItems = [
        ...habits,
        ...otherTasks,
        ...pendingTests,
        ...pendingStudies,
        ...readingBooks,
        ...pendingMemorization
    ];

    if (allPendingItems.length === 0) return null;
    
    const gradient = roleGradients[member.role] || 'from-gray-500 to-gray-600';

    return (
        <Card className="shadow-lg overflow-hidden">
            <CardHeader className={cn("text-white", `bg-gradient-to-br ${gradient}`)}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0 bg-white/20">
                        {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <CardTitle>{member.name}'in Görevleri</CardTitle>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
                {habits.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-sm mb-2 text-muted-foreground">Alışkanlıklar</h4>
                        <div className="space-y-2">
                            {habits.map(task => (
                                <Link href="/habits" key={task.id} className="block">
                                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-orange-500/10 text-orange-900 hover:bg-orange-500/20">
                                        <Flame className="h-5 w-5 shrink-0" />
                                        <div className="truncate flex-grow"><p className="font-semibold truncate text-sm">{task.title}</p></div>
                                        <Badge variant="outline" className="border-orange-500/50 bg-transparent">{task.streak || 0} seri</Badge>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
                {readingBooks.length > 0 && (
                   <div>
                        <h4 className="font-semibold text-sm mb-2 text-muted-foreground">Okunacak Kitaplar</h4>
                        <div className="space-y-2">
                            {readingBooks.map(book => (
                                 <Link href="/library" key={book.id} className="block">
                                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-amber-500/10 text-amber-900 hover:bg-amber-500/20">
                                        <BookOpen className="h-5 w-5 shrink-0" />
                                        <div className="truncate"><p className="font-semibold truncate text-sm">{book.title}</p><p className="text-xs text-amber-800/80 truncate">{book.author}</p></div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
                {pendingMemorization.length > 0 && (
                   <div>
                        <h4 className="font-semibold text-sm mb-2 text-muted-foreground">Ezberlenecekler</h4>
                        <div className="space-y-2">
                            {pendingMemorization.map(item => (
                                <Link href="/memorization" key={item.id} className="block">
                                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-purple-500/10 text-purple-900 hover:bg-purple-500/20">
                                        <BrainCircuit className="h-5 w-5 shrink-0" />
                                        <div className="truncate"><p className="font-semibold truncate text-sm">{item.title}</p></div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
                {(pendingTests.length > 0 || pendingStudies.length > 0) && (
                   <div>
                        <h4 className="font-semibold text-sm mb-2 text-muted-foreground">Ödevler</h4>
                        <div className="space-y-2">
                            {pendingTests.map(test => (
                                <Link href={`/education/${test.id}`} key={test.id} className="block">
                                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-red-500/10 text-red-900 hover:bg-red-500/20">
                                        <GraduationCap className="h-5 w-5 shrink-0" />
                                        <div className="truncate"><p className="font-semibold truncate text-sm">{test.title}</p><p className="text-xs text-red-800/80 truncate">{test.subject}</p></div>
                                    </div>
                                </Link>
                            ))}
                            {pendingStudies.map(study => (
                                <Link href="/education/study" key={study.id} className="block">
                                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-blue-500/10 text-blue-900 hover:bg-blue-500/20">
                                        <BookHeart className="h-5 w-5 shrink-0" />
                                         <div className="truncate">
                                            <p className="font-semibold truncate text-sm">{study.topic}</p>
                                            <p className="text-xs text-blue-800/80 truncate">{study.studyPlanTitle} - {study.subject}</p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
                {otherTasks.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-sm mb-2 text-muted-foreground">Diğer Görevler</h4>
                        <div className="space-y-3">
                        {otherTasks.map(task => (
                            <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
                                <Checkbox
                                    id={`personal-task-${task.id}`}
                                    onCheckedChange={() => handleTaskCompletion(task)}
                                    className="border-primary"
                                />
                                <div className="flex-grow">
                                    <label htmlFor={`personal-task-${task.id}`} className="font-semibold cursor-pointer">{task.title}</label>
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
