
"use client";

import * as React from "react";
import { useAuth } from "@/components/auth-provider";
import { onTasksUpdate, updateHabitCompletion } from "@/lib/dataService";
import type { Task } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { NewTaskForm } from "@/components/new-task-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { HabitTrackerCard } from "@/components/habit-tracker-card";
import { useToast } from "@/hooks/use-toast";

export default function HabitsPage() {
  const { familyMembers } = useAuth();
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [isTaskFormOpen, setIsTaskFormOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    const unsubscribe = onTasksUpdate(setTasks);
    return () => unsubscribe();
  }, []);

  const habitTasks = React.useMemo(() => {
    return tasks.filter(task => task.isRecurring && task.recurrenceType === 'daily');
  }, [tasks]);

  const handleOpenNewTask = () => {
    setEditingTask(null);
    setIsTaskFormOpen(true);
  };
  
  const handleToggleDay = async (task: Task, day: Date, isCompleted: boolean) => {
    try {
        await updateHabitCompletion(task, day, isCompleted);
    } catch (e) {
        console.error("Failed to update habit:", e);
        toast({
            title: "Hata",
            description: "Alışkanlık durumu güncellenirken bir hata oluştu.",
            variant: "destructive",
        });
    }
  };


  return (
    <div className="space-y-6">
      <PageHeader title="Alışkanlık Takibi 💪">
        <Dialog open={isTaskFormOpen} onOpenChange={setIsTaskFormOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none" onClick={handleOpenNewTask}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Yeni Alışkanlık Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Alışkanlığı Düzenle' : 'Yeni Alışkanlık Oluştur'}</DialogTitle>
              <DialogDescription>
                {editingTask ? 'Mevcut alışkanlığın ayrıntılarını güncelleyin.' : 'Takip etmek istediğiniz yeni bir günlük alışkanlık ekleyin.'}
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
      
      {habitTasks.length > 0 ? (
        <div className="space-y-4">
            {habitTasks.map(task => {
                const assignee = familyMembers.find(m => m.id === task.assigneeId);
                return (
                    <HabitTrackerCard 
                        key={task.id}
                        task={task}
                        assignee={assignee}
                        onToggleDay={handleToggleDay}
                    />
                )
            })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <p>Henüz takip edilen bir alışkanlık yok.</p>
            <p className="text-sm">Yeni bir alışkanlık ekleyerek başlayın.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
