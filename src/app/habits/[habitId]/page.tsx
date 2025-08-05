
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, addDays, isBefore, parseISO, isSameDay, getDay, subWeeks, addWeeks, isToday, subDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Check, X, Pencil, CheckSquare } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Task } from "@/lib/data";
import { onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { updateHabitCompletion } from "@/lib/dataService";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";


const dayIndexToId: { [key: number]: string } = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  0: 'Sun',
};

const dayIdToName: { [key: string]: string } = {
  Mon: 'Pazartesi',
  Tue: 'Salı',
  Wed: 'Çarşamba',
  Thu: 'Perşembe',
  Fri: 'Cuma',
  Sat: 'Cumartesi',
  Sun: 'Pazar',
};

const orderedWeekDays: (keyof typeof dayIdToName)[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function HabitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const habitId = params.habitId as string;
  
  const [habit, setHabit] = React.useState<Task | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const { toast } = useToast();

  React.useEffect(() => {
    if (!habitId) return;
    const docRef = doc(db, "tasks", habitId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setHabit({ id: docSnap.id, ...docSnap.data() } as Task);
      } else {
        setHabit(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [habitId]);

  const handleToggleDay = async (day: Date) => {
    if (!habit) return;
    const isCompleted = habit.completedDates?.includes(format(day, 'yyyy-MM-dd')) || false;
    try {
        await updateHabitCompletion(habit.id, day, !isCompleted);
    } catch (e) {
        console.error("Error in handleToggleDay:", e);
        toast({ title: "Hata", description: "İşaretleme sırasında bir sorun oluştu.", variant: "destructive"});
    }
  };


  if (loading) {
    return (
        <div className="space-y-6">
            <PageHeader title="Yükleniyor..."><Skeleton className="h-10 w-24" /></PageHeader>
            <Card><CardContent className="p-4"><Skeleton className="h-96 w-full"/></CardContent></Card>
        </div>
    );
  }

  if (!habit) {
    return <PageHeader title="Alışkanlık Bulunamadı" />;
  }
  
  const habitStartDate = habit.dueDate ? parseISO(habit.dueDate) : new Date(0);

  if (habit.recurrenceType === 'weekly' && habit.recurrenceDays && habit.recurrenceDays.length > 0) {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 6);
    
    const relevantWeekDays = orderedWeekDays
        .filter(dayId => habit.recurrenceDays?.includes(dayId))
        .map(dayId => {
            const dayIndex = orderedWeekDays.indexOf(dayId);
            const date = addDays(weekStart, dayIndex);
            const isCompleted = habit.completedDates?.includes(format(date, 'yyyy-MM-dd')) || false;
            
            const todayForComparison = new Date();
            todayForComparison.setHours(23, 59, 59, 999);
            const isSelectable = !isBefore(date, subDays(habitStartDate, 1));
            
            return { date, name: dayIdToName[dayId], isCompleted, isSelectable };
        });

    return (
      <div className="space-y-6">
        <PageHeader title={habit.title}>
            <Button onClick={() => router.back()} variant="outline">
            <ChevronLeft className="mr-2 h-4 w-4" /> Geri
            </Button>
        </PageHeader>
        <Card>
           <CardHeader className="flex flex-row items-center justify-between">
             <div>
                <CardTitle className="capitalize">{format(weekStart, 'd MMMM', { locale: tr })} - {format(weekEnd, 'd MMMM yyyy', { locale: tr })}</CardTitle>
                <CardDescription>Haftalık alışkanlık takibi</CardDescription>
             </div>
             <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => subWeeks(d, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                 <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Bu Hafta</Button>
                <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => addWeeks(d, 1))}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
           </CardHeader>
           <CardContent className="space-y-3">
            {relevantWeekDays.map(day => (
                <div 
                    key={day.date.toString()}
                    onClick={() => day.isSelectable && handleToggleDay(day.date)}
                    className={cn(
                        "p-4 border rounded-lg flex items-center justify-between transition-colors",
                        day.isCompleted && "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-800",
                        day.isSelectable ? "cursor-pointer hover:bg-muted/50" : "opacity-50 cursor-not-allowed",
                    )}
                >
                    <div className="flex flex-col">
                        <p className="font-semibold">{day.name}</p>
                        <p className="text-sm text-muted-foreground">{format(day.date, 'd MMMM', { locale: tr })}</p>
                    </div>
                    {day.isCompleted 
                        ? <CheckSquare className="h-6 w-6 text-green-600 dark:text-green-400" />
                        : <div className="h-6 w-6 w-6 border-2 rounded bg-background" />
                    }
                </div>
            ))}
           </CardContent>
        </Card>
      </div>
    );
  }

  // --- Fallback to monthly calendar for other types ---
  const monthStart = startOfMonth(currentDate);
  const endDate = addDays(startOfWeek(monthStart, { weekStartsOn: 1 }), 41); // 6 weeks
  const days = [];
  let day = startOfWeek(monthStart, { weekStartsOn: 1 });
  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }
  const weekHeaderDays = Array.from({ length: 7 }).map((_, i) => addDays(startOfWeek(new Date(), {weekStartsOn: 1}), i));

  return (
    <div className="space-y-6">
      <PageHeader title={habit.title}>
        <Button onClick={() => router.back()} variant="outline">
          <ChevronLeft className="mr-2 h-4 w-4" /> Geri
        </Button>
      </PageHeader>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
             <div>
                <CardTitle className="capitalize">{format(currentDate, 'MMMM yyyy', { locale: tr })}</CardTitle>
             </div>
             <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setCurrentDate(m => subMonths(m, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                 <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Bugün</Button>
                <Button variant="outline" size="icon" onClick={() => setCurrentDate(m => addMonths(m, 1))}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-7 border-l border-t">
                 {weekHeaderDays.map(day => (
                    <div key={day.toISOString()} className="p-2 border-r border-b text-center font-semibold text-sm capitalize">
                        {format(day, 'EEE', { locale: tr })}
                    </div>
                ))}
                {days.map((day, index) => {
                    const isCurrentMonth = isSameDay(addDays(monthStart, day.getDate() - monthStart.getDate()), day);

                    const dayKey = format(day, 'yyyy-MM-dd');
                    const isCompleted = habit.completedDates?.includes(dayKey) || false;
                    
                    const todayForComparison = new Date();
                    todayForComparison.setHours(23, 59, 59, 999);
                    
                    let isSelectable = !isBefore(day, subDays(habitStartDate,1));

                    if (habit.recurrenceType === 'monthly') {
                      if (day.getDate() !== habitStartDate.getDate()) {
                        isSelectable = false;
                      }
                    }

                    const isMissed = isSelectable && !isCompleted && isBefore(day, new Date()) && !isSameDay(day, new Date());
                    
                    return (
                        <div
                            key={index}
                            onClick={() => isSelectable && handleToggleDay(day)}
                            className={cn(
                                "aspect-square border-b border-r p-2 flex flex-col justify-start items-start transition-colors",
                                !isCurrentMonth && "bg-muted/50 text-muted-foreground/50",
                                isSelectable ? "cursor-pointer hover:bg-muted" : "cursor-not-allowed opacity-50"
                            )}
                        >
                           <span className={cn('font-semibold', isToday(day) && 'text-primary')}>{format(day, 'd')}</span>
                           <div className="flex-grow flex items-center justify-center w-full">
                            {isCompleted && <Check className="h-8 w-8 text-green-500" />}
                            {isMissed && <X className="h-8 w-8 text-destructive" />}
                           </div>
                        </div>
                    )
                })}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
    

    