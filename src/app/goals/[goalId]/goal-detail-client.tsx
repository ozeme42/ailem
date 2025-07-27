
"use client";

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { getGoal, updateGoal } from '@/lib/dataService';
import type { Goal, GoalSection, GoalTask } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowLeft, Check, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Reorder } from 'framer-motion';

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
        
        const fetchAndSetGoal = async () => {
            const fetchedGoal = await getGoal(goalId);
            setGoal(fetchedGoal);
        };
        fetchAndSetGoal();

    }, [goalId, user]);

    const handleTaskToggle = async (sectionId: string, taskId: string) => {
        const originalGoal = await getGoal(goalId);
        if (!originalGoal) return;

        let newSections: GoalSection[] = JSON.parse(JSON.stringify(originalGoal.sections));
        let taskUpdated = false;

        for (const section of newSections) {
            if (section.id === sectionId) {
                const task = section.tasks.find(t => t.id === taskId);
                if (task) {
                    task.completed = !task.completed;
                    taskUpdated = true;
                }
            }
        }
        
        if (!taskUpdated) return;

        // Recalculate section status after task toggle
        newSections.forEach(section => {
            const allTasksCompleted = section.tasks.every(t => t.completed);
            if (allTasksCompleted) {
                section.status = 'completed';
            }
        });
        
        const isGoalComplete = newSections.every(s => s.status === 'completed');
        const newGoalStatus = isGoalComplete ? 'completed' : 'in-progress';

        try {
            await updateGoal(goalId, { sections: newSections, status: newGoalStatus });
            // Optimistically update UI
            const updatedGoal = { ...originalGoal, sections: newSections, status: newGoalStatus };
            setGoal(updatedGoal);
        } catch (error) {
            toast({ title: "Hata", description: "Görev güncellenemedi.", variant: "destructive" });
        }
    };
    
    const handleReorderTasks = async (sectionId: string, reorderedTasks: GoalTask[]) => {
        const originalGoal = await getGoal(goalId);
        if (!originalGoal) return;

        const newSections = JSON.parse(JSON.stringify(originalGoal.sections)) as GoalSection[];
        const sectionIndex = newSections.findIndex(s => s.id === sectionId);
        if (sectionIndex === -1) return;

        newSections[sectionIndex].tasks = reorderedTasks.map((task, index) => ({
            ...task,
            order: index + 1,
        }));
        
        // Optimistically update the local state for a smoother UI response
        setGoal({ ...originalGoal, sections: newSections });

        try {
            await updateGoal(originalGoal.id, { sections: newSections });
        } catch (error) {
            toast({ title: "Hata", description: "Sıralama kaydedilemedi.", variant: "destructive" });
            const revertedGoal = await getGoal(goalId);
            setGoal(revertedGoal);
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
                    const isUnlocked = section.status !== 'locked';
                    const completedTasks = section.tasks.filter(t => t.completed).length;
                    const totalTasks = section.tasks.length;

                    return (
                        <Card key={section.id} className={cn(!isUnlocked && "opacity-60 bg-muted/50")}>
                            <AccordionItem value={section.id} className="border-b-0">
                                <AccordionTrigger disabled={!isUnlocked} className="p-4 hover:no-underline">
                                    <div className="flex items-center gap-4 w-full">
                                        <CircularProgress progress={progress} />
                                        <div className="text-left flex-grow">
                                            <h3 className="text-lg font-semibold">
                                                {section.title}
                                                <span className="text-sm font-normal text-muted-foreground ml-2">
                                                    ({completedTasks}/{totalTasks})
                                                </span>
                                            </h3>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-4 pt-0">
                                    <Reorder.Group
                                        axis="y"
                                        values={section.tasks.sort((a,b) => a.order - b.order)}
                                        onReorder={(newOrder) => handleReorderTasks(section.id, newOrder)}
                                        className="space-y-2 pl-14"
                                    >
                                        {section.tasks.sort((a,b) => a.order - b.order).map(task => (
                                            <Reorder.Item key={task.id} value={task}>
                                                <div className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted bg-background">
                                                    <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                                                    <Checkbox
                                                        id={`${section.id}-${task.id}`}
                                                        checked={task.completed}
                                                        onCheckedChange={() => handleTaskToggle(section.id, task.id)}
                                                        className="size-5"
                                                    />
                                                    <label
                                                        htmlFor={`${section.id}-${task.id}`}
                                                        className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer", task.completed && "line-through text-muted-foreground")}
                                                    >
                                                        {task.title}
                                                    </label>
                                                </div>
                                            </Reorder.Item>
                                        ))}
                                    </Reorder.Group>
                                </AccordionContent>
                            </AccordionItem>
                        </Card>
                    );
                })}
            </Accordion>
        </div>
    );
}
