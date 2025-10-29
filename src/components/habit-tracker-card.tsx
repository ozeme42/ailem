

"use client";

import * as React from "react";
import Link from 'next/link';
import { format, addDays, startOfWeek, isSameDay, parseISO, subDays, isFuture } from "date-fns";
import { tr } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Task, FamilyMember } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Flame, Check, Edit, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";

interface HabitTrackerCardProps {
  task: Task;
  assignee?: FamilyMember;
  onToggleDay: (day: Date, isCompleted: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function HabitTrackerCard({ task, assignee, onToggleDay, onEdit, onDelete }: HabitTrackerCardProps) {
  const [currentWeekStart, setCurrentWeekStart] = React.useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const completedDates = React.useMemo(() => {
      return new Set(task.completedDates || []);
  }, [task.completedDates]);
  
  const streak = React.useMemo(() => {
    const allCompletedDates = new Set(task.completedDates || []);
    if (allCompletedDates.size === 0) return 0;
    
    let currentStreak = 0;

    if (task.recurrenceType === 'daily') {
        let checkDate = new Date();
        checkDate.setHours(0, 0, 0, 0);

        if (!allCompletedDates.has(format(checkDate, 'yyyy-MM-dd'))) {
            checkDate = subDays(checkDate, 1);
        }
        
        while (allCompletedDates.has(format(checkDate, 'yyyy-MM-dd'))) {
            currentStreak++;
            checkDate = subDays(checkDate, 1);
        }

    } else if (task.recurrenceType === 'weekly' && task.recurrenceDays && task.recurrenceDays.length > 0) {
        let checkWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

        const isWeekComplete = (weekStart: Date): boolean => {
            return task.recurrenceDays!.every(dayId => {
                const dayIndex = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(dayId);
                const dateToCheck = addDays(weekStart, dayIndex);
                 if (isFuture(dateToCheck) && !isSameDay(dateToCheck, new Date())) {
                    return false;
                }
                return allCompletedDates.has(format(dateToCheck, 'yyyy-MM-dd'));
            });
        };

        // Check if current week is complete. If not, start checking from last week.
        if (!isWeekComplete(checkWeekStart)) {
            checkWeekStart = subDays(checkWeekStart, 7);
        }
        
        while(isWeekComplete(checkWeekStart)) {
            currentStreak++;
            checkWeekStart = subDays(checkWeekStart, 7);
        }
    }

    return currentStreak;
  }, [task.completedDates, task.recurrenceType, task.recurrenceDays]);


  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));

  return (
    <Card className="transition-all hover:shadow-lg hover:border-primary/30">
    <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                 <Link href={`/habits/${task.id}`} className="group block">
                    <CardTitle className="group-hover:text-primary transition-colors">{task.title}</CardTitle>
                 </Link>
                <CardDescription>
                    Sorumlu: {assignee?.name || 'Bilinmeyen'}
                </CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-300 px-3 py-1.5 rounded-full">
                    <Flame className="w-5 h-5"/>
                    <span className="font-bold text-lg">{streak}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}><Edit className="h-4 w-4"/></Button>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4"/></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Alışkanlığı Sil</AlertDialogTitle>
                            <AlertDialogDescription>"{task.title}" alışkanlığını kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>İptal</AlertDialogCancel>
                            <AlertDialogAction onClick={onDelete}>Sil</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    </CardHeader>
    <CardContent>
        <div className="flex items-center justify-between gap-1">
        {weekDays.map(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const isCompleted = completedDates.has(dayKey);
            return (
                <TooltipProvider key={dayKey}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div 
                                className="flex flex-col items-center gap-2"
                                onClick={(e) => {
                                    e.preventDefault(); // Prevent link navigation
                                    e.stopPropagation(); // Stop event bubbling
                                    onToggleDay(day, !isCompleted);
                                }}
                            >
                                <div className={cn(
                                    "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer",
                                    isCompleted ? "bg-green-500 border-green-600" : "bg-muted border-muted-foreground/30 hover:border-primary"
                                )}>
                                    {isCompleted && <Check className="h-6 w-6 text-white"/>}
                                </div>
                                <span className="text-xs capitalize font-medium text-muted-foreground">{format(day, 'EEE', { locale: tr })}</span>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                        <p>{format(day, 'd MMMM yyyy', { locale: tr })}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )
        })}
        </div>
    </CardContent>
    </Card>
  );
}
