
"use client";

import * as React from "react";
import { format, addDays, startOfWeek, isSameDay, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Task, FamilyMember } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Flame } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

interface HabitTrackerCardProps {
  task: Task;
  assignee?: FamilyMember;
  onToggleDay: (task: Task, day: Date, isCompleted: boolean) => void;
}

export function HabitTrackerCard({ task, assignee, onToggleDay }: HabitTrackerCardProps) {
  const [currentWeekStart, setCurrentWeekStart] = React.useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));

  const completedDates = React.useMemo(() => {
      return new Set(task.completedDates || []);
  }, [task.completedDates]);
  
  const streak = React.useMemo(() => {
    if (!task.completedDates || task.completedDates.length === 0) return 0;
    const sortedDates = task.completedDates.map(d => parseISO(d)).sort((a,b) => b.getTime() - a.getTime());

    let currentStreak = 0;
    let today = new Date();
    today.setHours(0,0,0,0);

    // Check if today is completed
    const todayCompleted = sortedDates.some(d => isSameDay(d, today));
    if (todayCompleted) {
        currentStreak = 1;
        let lastDate = today;
        for (let i = 0; i < sortedDates.length; i++) {
            const date = sortedDates[i];
            const expectedPrevious = addDays(lastDate, -1);
            if(isSameDay(date, expectedPrevious)) {
                if (i > 0 && isSameDay(sortedDates[i-1], date)) continue; // skip duplicates
                currentStreak++;
                lastDate = date;
            } else if (!isSameDay(date, lastDate)) {
                 break;
            }
        }
    } else { // Check for streak ending yesterday
        let lastDate = addDays(today, -1);
        const yesterdayCompleted = sortedDates.some(d => isSameDay(d, lastDate));
        if (yesterdayCompleted) {
            currentStreak = 1;
             for (let i = 0; i < sortedDates.length; i++) {
                const date = sortedDates[i];
                if (isSameDay(date, lastDate)) continue;

                const expectedPrevious = addDays(lastDate, -1);
                if(isSameDay(date, expectedPrevious)) {
                    currentStreak++;
                    lastDate = date;
                } else {
                    break;
                }
            }
        }
    }


    return currentStreak;
  }, [task.completedDates]);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>{task.title}</CardTitle>
                <CardDescription>
                    Sorumlu: {assignee?.name || 'Bilinmeyen'}
                </CardDescription>
            </div>
            <div className="flex items-center gap-2 bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-300 px-3 py-1.5 rounded-full">
                <Flame className="w-5 h-5"/>
                <span className="font-bold text-lg">{streak}</span>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center gap-1 md:gap-2">
          {weekDays.map(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const isCompleted = completedDates.has(dayKey);
            return (
                <TooltipProvider key={dayKey}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "h-14 w-14 md:h-16 md:w-16 flex-col border-2",
                                    isCompleted ? "bg-green-500/20 border-green-500/50 text-green-700 dark:text-green-300" : ""
                                )}
                                onClick={() => onToggleDay(task, day, !isCompleted)}
                            >
                                <span className="font-bold text-lg">{format(day, 'd')}</span>
                                <span className="text-xs capitalize">{format(day, 'EEE', { locale: tr })}</span>
                            </Button>
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
