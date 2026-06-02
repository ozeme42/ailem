"use client";

import * as React from "react";
import Image from "next/image";
import { Star, GripVertical, ChevronDown, Paperclip, Mic, Pause, Play, Trash2, Edit, Flame, Repeat, History, ListTodo } from "lucide-react";
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
import { cn } from "@/lib/utils";

interface TaskItemProps {
  task: Task;
  assignee?: FamilyMember;
  onEdit: (task: Task) => void;
  colorClass?: string;
  onDelete?: () => void;
}

export function TaskItem({ task, assignee, onEdit, colorClass, onDelete }: TaskItemProps) {
  const { familyId } = useAuth();
  const [isCompleted, setIsCompleted] = React.useState(task.completed);
  const [subtasks, setSubtasks] = React.useState<Subtask[]>(task.subtasks || []);
  const [completedOccurrences, setCompletedOccurrences] = React.useState(task.completedOccurrences || 0);

  const { toast } = useToast();

  const handleCompletion = async () => {
    if (!familyId || !assignee) return;

    const newCompletionState = !isCompleted;
    try {
        const updateData: Partial<Task> = { completed: newCompletionState };

        if (task.isRecurring) {
            const newCompletedOccurrences = completedOccurrences + (newCompletionState ? 1 : -1);
            updateData.completedOccurrences = newCompletedOccurrences;
            updateData.lastCompletedDate = new Date().toISOString();
        }

        await updateTask(task.id, updateData);
        
        // Award points and badges only on completion
        if (newCompletionState) {
          await checkAndAwardBadges(assignee.id, familyId, { type: 'task_completed', task });

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
            await updateTask(task.id, { completed: true });
            handleCompletion(); // Call main completion handler to award points etc.
        } else if (!allSubtasksCompleted && task.completed) {
             // If a subtask is un-checked, un-complete the main task
             await updateTask(task.id, { completed: false });
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
      <Card className={cn(
          'transition-all duration-300 rounded-[1.5rem] overflow-hidden', 
          isCompleted && !task.isRecurring 
              ? 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/5 opacity-60 hover:opacity-100 shadow-none' 
              : cn('hover:shadow-lg', colorClass || 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm')
        )}>
        <CardContent className="p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
          <GripVertical className="h-5 w-5 text-slate-400 cursor-grab shrink-0 hidden sm:block" />
          <Checkbox
            id={`task-${task.id}`}
            checked={isCompleted}
            onCheckedChange={handleCompletion}
            className="h-6 w-6 shrink-0 rounded-lg border-2 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
          />
          <div className="flex-grow min-w-0">
            <label
              htmlFor={`task-${task.id}`}
              className={cn(
                  "font-bold text-base transition-colors cursor-pointer block truncate", 
                  isCompleted && !task.isRecurring ? 'line-through text-slate-500 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'
              )}
            >
              {task.title}
            </label>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                <p>{task.dueDate}</p>
                {task.isRecurring && <Repeat className="h-3.5 w-3.5" />}
                
                {(subtasks && subtasks.length > 0) && (
                    <div className="flex items-center gap-2">
                        <Progress value={subtaskProgress} className="h-1.5 w-16 bg-black/10 dark:bg-white/10" />
                        <span className="text-[10px] font-bold">{completedSubtasks}/{subtasks.length}</span>
                    </div>
                )}
                {task.isRecurring && task.totalOccurrences && (
                    <div className="flex items-center gap-2">
                        <Progress value={occurrenceProgress} className="h-1.5 w-16 bg-black/10 dark:bg-white/10" />
                        <span className="text-[10px] font-bold">{completedOccurrences}/{task.totalOccurrences}</span>
                    </div>
                )}
            </div>
          </div>
          
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            {(task.recurrenceType === 'daily' || task.recurrenceType === 'weekly') && task.streak && task.streak > 1 && (
                <Badge variant="outline" className="border-orange-200 bg-orange-100 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/20 dark:text-orange-400 rounded-full font-bold">
                    <Flame className="w-3.5 h-3.5 mr-1"/> {task.streak} Seri
                </Badge>
            )}
            <Badge variant="secondary" className="flex items-center gap-1.5 py-1 px-3 text-sm bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 rounded-full">
                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                <span className="font-black">{task.points}</span>
            </Badge>
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
            {assignee && (
                <div 
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shadow-sm" 
                    style={{ backgroundColor: assignee.color, color: '#fff' }}
                >
                    {assignee.name.charAt(0).toUpperCase()}
                </div>
            )}
            <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-white/10 dark:hover:text-white" onClick={() => onEdit(task)}>
                    <Edit className="h-4 w-4"/>
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10">
                            <Trash2 className="h-4 w-4"/>
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 rounded-[2rem] p-6 shadow-2xl">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl font-black">Görevi Sil</AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-500 dark:text-slate-400 font-medium">
                                <span className="font-bold text-slate-700 dark:text-slate-300">"{task.title}"</span> görevini kalıcı olarak silmek istediğinize emin misiniz?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="mt-6 gap-3">
                            <AlertDialogCancel className="h-12 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/5 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10 border-none flex-1 sm:flex-none">İptal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => {
                                if (onDelete) onDelete();
                                else deleteTask(task.id);
                            }} className="h-12 rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white flex-1 sm:flex-none">Sil</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                {(task.subtasks && task.subtasks.length > 0) && (
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-white/10 dark:hover:text-white">
                            <ChevronDown className="h-4 w-4 transition-transform duration-300 [&[data-state=open]]:rotate-180" />
                        </Button>
                    </CollapsibleTrigger>
                )}
            </div>
          </div>
        </CardContent>
        
        {(task.subtasks && task.subtasks.length > 0) && (
            <CollapsibleContent className="animate-in slide-in-from-top-2 duration-300">
                 <div className="px-5 pb-5 ml-14 border-t border-slate-200/50 dark:border-white/5 pt-4 mt-1 space-y-4">
                    {subtasks.length > 0 && (
                        <div>
                            <h4 className="font-bold mb-3 text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <ListTodo className="w-4 h-4 text-slate-400" />
                                Alt Görevler
                            </h4>
                            <div className="space-y-3">
                            {subtasks.map(subtask => (
                                <div key={subtask.id} className="flex items-center gap-3">
                                    <Checkbox 
                                        id={`subtask-${subtask.id}`} 
                                        checked={subtask.completed}
                                        onCheckedChange={() => handleSubtaskToggle(subtask.id)}
                                        className="h-5 w-5 rounded-md data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                    />
                                    <label htmlFor={`subtask-${subtask.id}`} className={cn("text-sm font-medium transition-colors cursor-pointer", subtask.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-300')}>
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
