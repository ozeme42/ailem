

"use client";

import * as React from "react";
import { useAuth } from "@/components/auth-provider";
import { onTasksUpdate, updateHabitCompletion } from "@/lib/dataService";
import type { Task, FamilyMember } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { NewTaskForm } from "@/components/new-task-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle, Filter, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format, addDays, startOfWeek, isToday, isBefore } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Skeleton } from "@/components/ui/skeleton";

const habitColors = [
  'text-sky-600', 'text-sky-600', 'text-sky-600', 'text-sky-600',
  'text-rose-600', 'text-rose-600',
  'text-amber-600', 'text-amber-600',
  'text-violet-600', 'text-violet-600', 'text-violet-600'
];

export default function HabitsPage() {
  const { familyMembers, user } = useAuth();
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isTaskFormOpen, setIsTaskFormOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);
  const [selectedMember, setSelectedMember] = React.useState<FamilyMember | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    const unsubscribe = onTasksUpdate((tasks) => {
        setTasks(tasks);
        setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);
  
  React.useEffect(() => {
    if (familyMembers.length > 0 && !selectedMember) {
        const student = familyMembers.find(m => m.role === 'Kız Çocuk' || m.role === 'Erkek Çocuk');
        setSelectedMember(student || familyMembers.find(m => m.id === user?.uid) || familyMembers[0]);
    }
  }, [familyMembers, selectedMember, user]);

  const memberHabits = React.useMemo(() => {
    if (!selectedMember) return [];
    return tasks.filter(task => task.isRecurring && task.assigneeId === selectedMember.id);
  }, [tasks, selectedMember]);

  const handleOpenNewTask = () => {
    setEditingTask(null);
    setIsTaskFormOpen(true);
  };
  
  const handleToggleDay = async (task: Task, day: Date) => {
      const dayKey = format(day, 'yyyy-MM-dd');
      const isCompleted = task.completedDates?.includes(dayKey) || false;
      try {
          await updateHabitCompletion(task, day, !isCompleted);
      } catch(e) {
          toast({ title: 'Hata', description: 'İşaretleme sırasında bir sorun oluştu.', variant: 'destructive'});
      }
  }

  const today = new Date();
  const weekDates = Array.from({length: 5}).map((_, i) => addDays(today, -i)).reverse();

  if (isLoading) {
      return (
          <div className="space-y-4">
              <PageHeader title="Alışkanlıklar Yükleniyor..."/>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-64 w-full" />
          </div>
      )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Alışkanlıklar 💪">
        <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none"><Filter className="mr-2"/> Filtrele</Button>
        <Dialog open={isTaskFormOpen} onOpenChange={setIsTaskFormOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary" onClick={handleOpenNewTask}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Yeni Alışkanlık Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Alışkanlığı Düzenle' : 'Yeni Alışkanlık Ekle'}</DialogTitle>
              <DialogDescription>
                {editingTask ? 'Mevcut alışkanlığın ayrıntılarını güncelleyin.' : 'Yeni bir alışkanlık oluşturarak kendinize meydan okuyun.'}
              </DialogDescription>
            </DialogHeader>
            <NewTaskForm 
                familyMembers={familyMembers}
                onTaskProcessed={() => setIsTaskFormOpen(false)}
                taskToEdit={editingTask}
            />
          </DialogContent>
        </Dialog>
      </PageHeader>
      
      <div className="flex items-center gap-4 border-b pb-4 overflow-x-auto">
        {familyMembers.map((member) => (
          <Button
            key={member.id}
            variant={selectedMember?.id === member.id ? "default" : "outline"}
            className={`flex-shrink-0 h-auto p-2 flex items-center gap-2 rounded-full transition-all duration-200 ${selectedMember?.id === member.id ? 'scale-105 shadow-lg' : 'hover:bg-accent'}`}
            onClick={() => setSelectedMember(member)}
          >
            <div 
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" 
                style={{ backgroundColor: member.color, color: '#fff' }}
            >
                {member.name.charAt(0).toUpperCase()}
            </div>
            <p className="font-bold text-sm">{member.name}</p>
          </Button>
        ))}
      </div>

       <div className="overflow-x-auto">
         <div className="grid w-full min-w-[500px]" style={{gridTemplateColumns: '1fr repeat(5, 56px)'}}>
            <div className="text-sm font-semibold text-muted-foreground p-2">Alışkanlık</div>
             {weekDates.map(date => (
                <div key={date.toISOString()} className="text-center text-sm font-semibold text-muted-foreground p-2">
                    <p className="capitalize">{format(date, 'EEE', {locale: tr})}</p>
                    <p>{format(date, 'd')}</p>
                </div>
            ))}
            
            {memberHabits.map((habit, index) => {
                const color = habitColors[index % habitColors.length];
                const completedDates = new Set(habit.completedDates || []);
                return (
                    <React.Fragment key={habit.id}>
                        <div className="p-2 border-t flex items-center gap-2">
                             <div className={cn('w-2 h-2 rounded-full', color.replace('text-', 'bg-'))}></div>
                             <p className="font-medium text-sm truncate">{habit.title}</p>
                        </div>
                        {weekDates.map(date => {
                             const dateKey = format(date, 'yyyy-MM-dd');
                             const isCompleted = completedDates.has(dateKey);
                             const isPastOrToday = isBefore(date, addDays(new Date(), 1));
                             return (
                                 <div 
                                    key={date.toISOString()}
                                    className="p-2 border-t flex items-center justify-center"
                                >
                                    {isPastOrToday ? (
                                        <button onClick={() => handleToggleDay(habit, date)} className="w-8 h-8 flex items-center justify-center">
                                            {isCompleted ? (
                                                <Check className={cn("h-5 w-5", color)} />
                                            ) : (
                                                <X className="h-5 w-5 text-muted-foreground/50" />
                                            )}
                                        </button>
                                    ) : null}
                                </div>
                            )
                        })}
                    </React.Fragment>
                )
            })}
         </div>
      </div>
    </div>
  );
}
