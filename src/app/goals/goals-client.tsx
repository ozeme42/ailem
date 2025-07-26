
"use client";

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { onGoalsUpdate, addGoal } from '@/lib/dataService';
import type { Goal } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { PlusCircle, Target } from 'lucide-react';
import { NewGoalForm } from '@/components/new-goal-form';
import { useToast } from '@/hooks/use-toast';

export default function GoalsClient() {
    const { user, familyMembers } = useAuth();
    const [goals, setGoals] = React.useState<Goal[]>([]);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const { toast } = useToast();

    React.useEffect(() => {
        if (!user) return;
        const unsubscribe = onGoalsUpdate(setGoals);
        return () => unsubscribe();
    }, [user]);

    const handleCreateGoal = async (data: Omit<Goal, 'id' | 'familyId' | 'createdAt' | 'status' | 'sections'>) => {
        try {
            await addGoal(data);
            toast({ title: 'Yeni Yol Haritası Oluşturuldu!', description: `"${data.title}" hedefine doğru ilk adımı attın.` });
            setIsFormOpen(false);
        } catch (error) {
            toast({ title: 'Hata', description: 'Hedef oluşturulurken bir hata oluştu.', variant: 'destructive' });
        }
    };
    
    const calculateOverallProgress = (goal: Goal) => {
        const totalTasks = goal.sections.reduce((acc, section) => acc + section.tasks.length, 0);
        if (totalTasks === 0) return 0;
        const completedTasks = goal.sections.reduce((acc, section) => acc + section.tasks.filter(t => t.completed).length, 0);
        return (completedTasks / totalTasks) * 100;
    };
    
    const getNextTask = (goal: Goal) => {
        for (const section of goal.sections.sort((a,b) => a.order - b.order)) {
            if (section.status !== 'completed') {
                for (const task of section.tasks.sort((a,b) => a.order - b.order)) {
                    if (!task.completed) {
                        return task.title;
                    }
                }
            }
        }
        return "Tüm hedefler tamamlandı!";
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Yol Haritaları">
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Yeni Yol Haritası Oluştur
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Yeni Yol Haritası</DialogTitle>
                            <DialogDescription>
                                Büyük bir hedef belirle ve ona ulaşmak için adımlarını planla.
                            </DialogDescription>
                        </DialogHeader>
                        <NewGoalForm
                            familyMembers={familyMembers}
                            onCreate={handleCreateGoal}
                        />
                    </DialogContent>
                </Dialog>
            </PageHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {goals.map(goal => {
                    const progress = calculateOverallProgress(goal);
                    const assignee = familyMembers.find(m => m.id === goal.assigneeId);
                    return (
                        <Link key={goal.id} href={`/goals/${goal.id}`} className="block">
                            <Card className="flex flex-col h-full hover:shadow-lg hover:-translate-y-1 transition-transform">
                                <CardHeader>
                                    <div className="flex justify-between items-start gap-2">
                                        <CardTitle>{goal.title}</CardTitle>
                                        {assignee && (
                                            <div
                                                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                                                style={{ backgroundColor: assignee.color, color: '#fff' }}
                                                title={assignee.name}
                                            >
                                                {assignee.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <CardDescription>{goal.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                     <div className="space-y-1 text-sm">
                                        <p className="text-muted-foreground">Sıradaki Adım:</p>
                                        <p className="font-medium">{getNextTask(goal)}</p>
                                    </div>
                                </CardContent>
                                <CardFooter className="flex flex-col items-start">
                                    <div className="flex justify-between w-full text-xs text-muted-foreground mb-1">
                                        <span>İlerleme</span>
                                        <span>{Math.round(progress)}%</span>
                                    </div>
                                    <Progress value={progress} className="w-full h-2" />
                                </CardFooter>
                            </Card>
                        </Link>
                    )
                })}
            </div>
             {goals.length === 0 && (
                <Card className="text-center p-12">
                    <Target className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">Henüz yol haritası yok</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Yeni bir hedef oluşturarak başlayın.
                    </p>
                </Card>
            )}
        </div>
    );
}
