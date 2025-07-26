
"use client";

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { onGoalUpdate, updateGoal } from '@/lib/dataService';
import type { Goal, GoalSection, GoalTask } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowLeft, Check, Lock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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
        if (!goal) return;
        
        const newSections = goal.sections.map(section => {
            if (section.id === sectionId) {
                const newTasks = section.tasks.map(task => {
                    if (task.id === taskId) {
                        return { ...task, completed: !task.completed };
                    }
                    return task;
                });
                return { ...section, tasks: newTasks };
            }
            return section;
        });

        // Check if a section is completed and unlock the next one
        const updatedSectionsWithUnlocks = checkAndUnlockSections(newSections);

        const updatedGoal = { ...goal, sections: updatedSectionsWithUnlocks };
        await updateGoal(goalId, { sections: updatedSectionsWithUnlocks });
        setGoal(updatedGoal); // Optimistic update
    };

    const checkAndUnlockSections = (sections: GoalSection[]): GoalSection[] => {
        const sortedSections = [...sections].sort((a,b) => a.order - b.order);
        let allPreviousCompleted = true;

        return sortedSections.map((section, index) => {
            if (index === 0) { // First section is always unlocked
                section.status = section.tasks.every(t => t.completed) ? 'completed' : 'unlocked';
                allPreviousCompleted = section.status === 'completed';
                return section;
            }

            if (allPreviousCompleted && section.status === 'locked') {
                toast({ title: 'Yeni Bölüm Açıldı!', description: `"${section.title}" bölümüne başlayabilirsin.` });
                section.status = 'unlocked';
            }
            
            if (section.status === 'unlocked' && section.tasks.every(t => t.completed)) {
                section.status = 'completed';
            }

            allPreviousCompleted = section.status === 'completed';
            return section;
        });
    };

    if (!goal) {
        return <div>Yükleniyor...</div>;
    }

    const calculateSectionProgress = (section: GoalSection) => {
        if (section.tasks.length === 0) return 0;
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
            
            <Accordion type="multiple" defaultValue={sortedSections.filter(s => s.status === 'unlocked').map(s => s.id)} className="w-full space-y-4">
                {sortedSections.map((section, index) => {
                    const progress = calculateSectionProgress(section);
                    const isLocked = section.status === 'locked';

                    return (
                        <Card key={section.id} className={cn(isLocked && "bg-muted/50")}>
                            <AccordionItem value={section.id} className="border-b-0">
                                <AccordionTrigger className="p-4 hover:no-underline" disabled={isLocked}>
                                    <div className="flex items-center gap-3 w-full">
                                        {isLocked ? (
                                            <Lock className="w-6 h-6 text-muted-foreground" />
                                        ) : section.status === 'completed' ? (
                                            <Check className="w-6 h-6 text-green-500"/>
                                        ) : (
                                            <div className="w-6 h-6 text-primary font-bold text-lg flex items-center justify-center">{index + 1}</div>
                                        )}
                                        <div className="text-left flex-grow">
                                            <h3 className="text-lg font-semibold">{section.title}</h3>
                                            <Progress value={progress} className="h-1 mt-1" />
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-4 pt-0">
                                    <div className="space-y-2 pl-9">
                                        {section.tasks.sort((a,b) => a.order - b.order).map(task => (
                                            <div key={task.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`${section.id}-${task.id}`}
                                                    checked={task.completed}
                                                    onCheckedChange={() => handleTaskToggle(section.id, task.id)}
                                                />
                                                <label
                                                    htmlFor={`${section.id}-${task.id}`}
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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

