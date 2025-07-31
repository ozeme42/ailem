
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, addDays, isSameMonth, isToday, isBefore, parseISO, isSameDay, getDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Check, X, Pencil } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Task } from "@/lib/data";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { updateHabitCompletion } from "@/lib/dataService";
import { Skeleton } from "@/components/ui/skeleton";


const dayIndexToId: { [key: number]: string } = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  0: 'Sun',
};

export default function HabitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const habitId = params.habitId as string;
  
  const [habit, setHabit] = React.useState<Task | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
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
    
    const dayKey = format(day, 'yyyy-MM-dd');
    const isCompleted = habit.completedDates?.includes(dayKey) || false;

    try {
        await updateHabitCompletion(habit, day, !isCompleted);
    } catch (e) {
        toast({ title: "Hata", description: "İşaretleme sırasında bir sorun oluştu.", variant: "destructive"});
    }
  }


  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = addDays(startDate, 41); // 6 weeks

  const days = [];
  let day = startDate;

  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }
  
  const weekHeaderDays = Array.from({ length: 7 }).map((_, i) => addDays(startOfWeek(new Date(), {weekStartsOn: 1}), i));

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
  
  const habitStartDate = habit.createdAt ? parseISO(habit.createdAt) : new Date(0);


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
                <CardTitle className="capitalize">{format(currentMonth, 'MMMM yyyy', { locale: tr })}</CardTitle>
             </div>
             <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                 <Button variant="outline" onClick={() => setCurrentMonth(new Date())}>Bugün</Button>
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
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
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const dayKey = format(day, 'yyyy-MM-dd');
                    const isCompleted = habit.completedDates?.includes(dayKey) || false;
                    
                    const todayForComparison = new Date();
                    todayForComparison.setHours(23, 59, 59, 999); // Allow marking today
                    
                    let isSelectable = !isBefore(day, habitStartDate) && day <= todayForComparison;

                    if (habit.recurrenceType === 'weekly' && habit.recurrenceDays && habit.recurrenceDays.length > 0) {
                      const dayId = dayIndexToId[getDay(day)];
                      if (!habit.recurrenceDays.includes(dayId)) {
                        isSelectable = false;
                      }
                    } else if (habit.recurrenceType === 'monthly') {
                      const habitStartDay = parseISO(habit.startDate).getDate();
                      if (day.getDate() !== habitStartDay) {
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
