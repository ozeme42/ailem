
"use client";

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { onGoalUpdate, updateGoal, getGoal } from '@/lib/dataService';
import type { Goal, GoalSection, GoalTask } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowLeft, Check, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

const CircularProgress = ({ progress }: { progress: number }) => {
    const radius = 16;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div className="relative size-10">
            <svg className="size-full" width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
                <circle cx="18" cy="18" r={radius} fill="transparent" stroke="hsl(var(--muted))" strokeWidth="3"></circle>
                <circle
                    cx="18"
                    cy="18"
                    r={radius}
                    fill="transparent"
                    stroke="hsl(var(--primary))"
                    strokeWidth="3"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    transform="rotate(-90 18 18)"
                    className="transition-all duration-300"
                ></circle>
            </svg>
            {progress < 100 ? (
                 <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-primary">
                    {Math.round(progress)}%
                </span>
            ) : (
                 <Check className="h-5 w-5 absolute inset-0 m-auto text-primary"/>
            )}
        </div>
    );
};

export default function GoalDetailClient() {
    const params = useParams();
    const router = useRouter();
    const goalId = params.goalId as string;
    const { user } = useAuth();
    const { toast } = useToast();

    const [goal, setGoal] = React.useState<Goal | null>(null);

    React.useEffect(() => {
        if (!goalId || !user) return;
        const unsubscribe = onGoalUpdate(goalId, setGoal);
        return () => unsubscribe();
    }, [goalId, user]);

    const handleTaskToggle = async (sectionId: string, taskId: string) => {
        const originalGoal = await getGoal(goalId);
        if (!originalGoal) {
            toast({ title: "Hata", description: "Hedef bulunamadı.", variant: "destructive" });
            return;
        }

        const newSections = JSON.parse(JSON.stringify(originalGoal.sections));
        let taskUpdated = false;

        const section = newSections.find((s: GoalSection) => s.id === sectionId);
        if (section) {
            const task = section.tasks.find((t: GoalTask) => t.id === taskId);
            if (task) {
                task.completed = !task.completed;
                taskUpdated = true;
            }
        }

        if (!taskUpdated) return;

        newSections.forEach((currentSection: GoalSection) => {
            const allTasksInSectionCompleted = currentSection.tasks.every((t: GoalTask) => t.completed);
            if (allTasksInSectionCompleted) {
                currentSection.status = 'completed';
            } else {
                currentSection.status = 'unlocked';
            }
        });
    
        const isGoalComplete = newSections.every((s: GoalSection) => s.status === 'completed');
        const newGoalStatus = isGoalComplete ? 'completed' : 'in-progress';
      
        try {
            await updateGoal(originalGoal.id, { sections: newSections, status: newGoalStatus });
            if (newGoalStatus === 'completed' && originalGoal.status !== 'completed') {
                 toast({ title: '🎉 Hedef Tamamlandı!', description: `Tebrikler! "${originalGoal.title}" hedefini başarıyla tamamladın.` });
            }
        } catch (error) {
            toast({ title: "Hata", description: "Görev güncellenemedi.", variant: "destructive" });
            console.error("Failed to update goal task:", error);
        }
    };


    if (!goal) {
        return <div>Yükleniyor...</div>;
    }

    const calculateSectionProgress = (section: GoalSection) => {
        if (section.tasks.length === 0) return section.status === 'completed' ? 100 : 0;
        const completedTasks = section.tasks.filter(t => t.completed).length;
        return (completedTasks / section.tasks.length) * 100;
    };
    
    const sortedSections = [...goal.sections].sort((a,b) => a.order - b.order);

    return (
        <div className="space-y-6">
            <PageHeader title={goal.title}>
                <Button variant="outline" onClick={() => router.push('/goals')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Tüm Hedefler
                </Button>
            </PageHeader>
            
            <Accordion type="multiple" defaultValue={sortedSections.map(s => s.id)} className="w-full space-y-4">
                {sortedSections.map((section) => {
                    const progress = calculateSectionProgress(section);

                    return (
                        <Card key={section.id}>
                            <AccordionItem value={section.id} className="border-b-0">
                                <AccordionTrigger className="p-4 hover:no-underline">
                                    <div className="flex items-center gap-4 w-full">
                                        <CircularProgress progress={progress} />
                                        <div className="text-left flex-grow">
                                            <h3 className="text-lg font-semibold">{section.title}</h3>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-4 pt-0">
                                    <div className="space-y-2 pl-14">
                                        {section.tasks.sort((a,b) => a.order - b.order).map(task => (
                                            <div key={task.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted">
                                                <Checkbox
                                                    id={`${section.id}-${task.id}`}
                                                    checked={task.completed}
                                                    onCheckedChange={() => handleTaskToggle(section.id, task.id)}
                                                    className="size-5"
                                                />
                                                <label
                                                    htmlFor={`${section.id}-${task.id}`}
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                >
                                                    {task.title}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Card>
                    );
                })}
            </Accordion>
        </div>
    );
}
