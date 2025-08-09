
"use client";

import * as React from "react";
import Link from 'next/link';
import { format, addDays, startOfWeek, isSameDay, parseISO, subDays } from "date-fns";
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
    if (!task.completedDates || task.completedDates.length === 0) return 0;
    
    // Create a set of date strings for efficient lookup
    const completedDateSet = new Set(task.completedDates);
    let currentStreak = 0;
    
    // Start checking from today
    let checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);

    // If today is not completed, start checking from yesterday
    if (!completedDateSet.has(format(checkDate, 'yyyy-MM-dd'))) {
        checkDate = subDays(checkDate, 1);
    }

    // Iterate backwards from checkDate
    while (true) {
        const dateKey = format(checkDate, 'yyyy-MM-dd');
        if (completedDateSet.has(dateKey)) {
            currentStreak++;
            checkDate = subDays(checkDate, 1);
        } else {
            break; // Streak is broken
        }
    }

    return currentStreak;
  }, [task.completedDates]);

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
