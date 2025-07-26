
"use client";

import * as React from "react";
import Image from "next/image";
import { Star, GripVertical, ChevronDown, Paperclip, Mic, Pause, Play, Trash2, Edit, Flame, Repeat, History } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { Task, FamilyMember, Subtask } from "@/lib/data";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";
import { updateTask, updateFamilyMemberInFamily, checkAndAwardBadges, deleteTask } from "@/lib/dataService";
import { useAuth } from "./auth-provider";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";


interface TaskItemProps {
  task: Task;
  assignee?: FamilyMember;
  onEdit: (task: Task) => void;
}

export function TaskItem({ task, assignee, onEdit }: TaskItemProps) {
  const { familyId } = useAuth();
  const [isCompleted, setIsCompleted] = React.useState(task.completed);
  const [subtasks, setSubtasks] = React.useState<Subtask[]>(task.subtasks || []);
  const [completedOccurrences, setCompletedOccurrences] = React.useState(task.completedOccurrences || 0);

  const { toast } = useToast();

  const handleCompletion = async () => {
    if (!familyId || !assignee) return;

    const newCompletionState = !isCompleted;
    try {
        
        let xpChange = newCompletionState ? task.points : -task.points;
        const completedTasksChange = newCompletionState ? 1 : -1;
        
        const updateData: Partial<Task> = { completed: newCompletionState };

        if (task.isRecurring) {
            const newCompletedOccurrences = completedOccurrences + (newCompletionState ? 1 : -1);
            updateData.completedOccurrences = newCompletedOccurrences;
            updateData.lastCompletedDate = new Date().toISOString();
             // For recurring tasks, completion might reset. Let's assume it doesn't for now.
             // But we might want to handle daily reset logic elsewhere.
        }

        await updateTask(task.id, updateData);

        const newXp = (assignee.xp || 0) + xpChange;
        const newLevel = Math.floor(newXp / 1000) + 1;

        await updateFamilyMemberInFamily(familyId, assignee.id, {
            xp: newXp,
            completedTasks: (assignee.completedTasks || 0) + completedTasksChange,
            level: newLevel,
        });
        
        if (newCompletionState) {
            await checkAndAwardBadges(assignee.id, familyId, { type: 'task_completed', task });
        }

        if (newCompletionState) {
          toast({
            title: "🎉 Görev Tamamlandı!",
            description: `Harika iş, ${assignee?.name || ''}! ${task.points} XP kazandın.`,
          });
        }
    } catch (error) {
        toast({ title: "Hata", description: "Görev güncellenirken bir sorun oluştu.", variant: "destructive"});
    }
  };

  const handleSubtaskToggle = async (subtaskId: string) => {
    if (!familyId || !assignee) return;
    
    const newSubtasks = subtasks.map(st =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );

    try {
        await updateTask(task.id, { subtasks: newSubtasks });

        const allSubtasksCompleted = newSubtasks.every(st => st.completed);
        if (allSubtasksCompleted && !task.completed) {
            handleCompletion(); // Call main completion handler to award points etc.
        } else if (!allSubtasksCompleted && task.completed) {
             // If a subtask is un-checked, un-complete the main task
             await updateTask(task.id, { completed: false });
             
             // Revert points and task count
             const newXp = (assignee.xp || 0) - task.points;
             await updateFamilyMemberInFamily(familyId, assignee.id, {
                xp: newXp < 0 ? 0 : newXp,
                completedTasks: (assignee.completedTasks || 1) - 1,
                level: Math.floor(newXp / 1000) + 1,
            });
        }
    } catch (error) {
        toast({ title: "Hata", description: "Alt görev güncellenirken bir sorun oluştu.", variant: "destructive"});
    }
  };
  
  React.useEffect(() => {
    setIsCompleted(task.completed);
    setSubtasks(task.subtasks || []);
    setCompletedOccurrences(task.completedOccurrences || 0);
  }, [task]);


  const completedSubtasks = subtasks.filter(st => st.completed).length;
  const subtaskProgress = subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : (isCompleted ? 100 : 0);
  const occurrenceProgress = task.totalOccurrences ? (completedOccurrences / task.totalOccurrences) * 100 : 0;

  return (
    <Collapsible>
      <Card className={`transition-all duration-300 ${isCompleted && !task.isRecurring ? 'bg-muted/50 border-dashed' : 'bg-card hover:shadow-md'}`}>
        <CardContent className="p-4 flex items-center gap-4">
          <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab shrink-0" />
          <Checkbox
            id={`task-${task.id}`}
            checked={isCompleted}
            onCheckedChange={handleCompletion}
            className="h-5 w-5 shrink-0"
          />
          <div className="flex-grow">
            <label
              htmlFor={`task-${task.id}`}
              className={`font-medium transition-colors cursor-pointer ${isCompleted && !task.isRecurring ? 'line-through text-muted-foreground' : 'text-foreground'}`}
            >
              {task.title}
            </label>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <p>{task.dueDate}</p>
                {task.isRecurring && <Repeat className="h-3 w-3" />}
            </div>
             {(subtasks && subtasks.length > 0) && (
                <div className="flex items-center gap-2 mt-1">
                    <Progress value={subtaskProgress} className="h-1 w-24" />
                    <span className="text-xs text-muted-foreground">{completedSubtasks}/{subtasks.length}</span>
                </div>
            )}
            {task.isRecurring && task.totalOccurrences && (
                <div className="flex items-center gap-2 mt-1">
                    <Progress value={occurrenceProgress} className="h-1 w-24" />
                    <span className="text-xs text-muted-foreground">{completedOccurrences}/{task.totalOccurrences}</span>
                </div>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-2">
            {task.recurrenceType === 'daily' && task.streak && task.streak > 1 && (
                <Badge variant="outline" className="border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-400">
                    <Flame className="w-3.5 h-3.5 mr-1"/> {task.streak} Seri
                </Badge>
            )}
            <Badge variant="secondary" className="flex items-center gap-1.5 py-1 px-2.5 text-sm">
                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-500" />
                <span className="font-bold">{task.points}</span>
            </Badge>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {assignee && (
                <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" 
                    style={{ backgroundColor: assignee.color, color: '#fff' }}
                >
                    {assignee.name.charAt(0).toUpperCase()}
                </div>
            )}
          </div>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(task)}><Edit className="h-4 w-4"/></Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive"><Trash2 className="h-4 w-4"/></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Görevi Sil</AlertDialogTitle>
                        <AlertDialogDescription>"{task.title}" görevini kalıcı olarak silmek istediğinize emin misiniz?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteTask(task.id)}>Sil</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {(task.subtasks && task.subtasks.length > 0) && (
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ChevronDown className="h-4 w-4 transition-transform duration-200 [&[data-state=open]]:rotate-180" />
                    </Button>
                </CollapsibleTrigger>
            )}
          </div>
        </CardContent>
        {(task.subtasks && task.subtasks.length > 0) && (
            <CollapsibleContent>
                 <div className="px-4 pb-4 ml-14 border-t pt-4 mt-2 space-y-4">
                    {subtasks.length > 0 && (
                        <div>
                            <h4 className="font-semibold mb-2 text-sm">Alt Görevler</h4>
                            <div className="space-y-2">
                            {subtasks.map(subtask => (
                                <div key={subtask.id} className="flex items-center gap-3">
                                    <Checkbox 
                                        id={`subtask-${subtask.id}`} 
                                        checked={subtask.completed}
                                        onCheckedChange={() => handleSubtaskToggle(subtask.id)}
                                    />
                                    <label htmlFor={`subtask-${subtask.id}`} className={`text-sm ${subtask.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                        {subtask.title}
                                    </label>
                                </div>
                            ))}
                            </div>
                        </div>
                    )}
                 </div>
            </CollapsibleContent>
        )}
      </Card>
    </Collapsible>
  );
}
