

"use client";

import * as React from "react";
import { PlusCircle, Search, Star, Mic, Filter, ChevronDown, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskItem } from "@/components/task-item";
import { Task } from "@/lib/data";
import { onTasksUpdate, addTask, updateTask, updateHabitCompletion, deleteTask } from "@/lib/dataService";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NewTaskForm } from "@/components/new-task-form";
import { PageHeader } from "@/components/page-header";
import { HabitTrackerCard } from "@/components/habit-tracker-card";
import { useToast } from "@/hooks/use-toast";

export default function TasksPage() {
  const { user, familyMembers, loading: authLoading } = useAuth();
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isTaskFormOpen, setIsTaskFormOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    setLoading(true);
    const unsubscribe = onTasksUpdate((updatedTasks) => {
      setTasks(updatedTasks);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleOpenEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskFormOpen(true);
  };

  const handleOpenNewTask = () => {
    setEditingTask(null);
    setIsTaskFormOpen(true);
  };
  
  const handleDeleteTask = async (taskId: string) => {
    try {
        await deleteTask(taskId);
        toast({ title: "Görev Silindi", description: "Görev başarıyla kaldırıldı.", variant: "destructive" });
    } catch (error) {
        toast({ title: "Hata", description: "Görev silinirken bir hata oluştu.", variant: "destructive"});
    }
  }
  
  const getAssignee = (assigneeId: string) => {
    return familyMembers.find((m) => m.id === assigneeId);
  };

  const handleToggleDay = async (taskId: string, day: Date, isCompleted: boolean) => {
      try {
          await updateHabitCompletion(taskId, day, isCompleted);
      } catch(e) {
          console.error("Error in handleToggleDay:", e);
          toast({ title: 'Hata', description: 'İşaretleme sırasında bir sorun oluştu.', variant: 'destructive'});
      }
  }
  
  const leaderboard = [...familyMembers].sort((a,b) => b.xp - a.xp);

  const {
    pendingTasks,
    completedTasks,
    habits,
  } = React.useMemo(() => {
    const filteredTasks = tasks.filter(task => {
        const searchMatch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (getAssignee(task.assigneeId) && getAssignee(task.assigneeId)!.name.toLowerCase().includes(searchTerm.toLowerCase()));
        return searchMatch;
    });

    return {
        pendingTasks: filteredTasks.filter(t => !t.isRecurring && !t.completed),
        completedTasks: filteredTasks.filter(t => !t.isRecurring && t.completed),
        habits: filteredTasks.filter(t => t.isRecurring)
    };
  }, [tasks, searchTerm, familyMembers]);

  
  return (
    <>
      <PageHeader title="Görevler & Alışkanlıklar">
        <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none" onClick={handleOpenNewTask}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Yeni Görev / Alışkanlık
        </Button>
      </PageHeader>

       <Dialog open={isTaskFormOpen} onOpenChange={setIsTaskFormOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Görevi Düzenle' : 'Yeni Görev Oluştur'}</DialogTitle>
              <DialogDescription>
                {editingTask ? 'Mevcut görevin ayrıntılarını güncelleyin.' : 'Yeni bir görev ekleyerek ailenizin düzenine katkıda bulunun.'}
              </DialogDescription>
            </DialogHeader>
            <NewTaskForm 
                familyMembers={familyMembers}
                onTaskProcessed={() => setIsTaskFormOpen(false)}
                taskToEdit={editingTask}
            />
          </DialogContent>
        </Dialog>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
            <Tabs defaultValue="tasks" className="w-full">
                 <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="tasks">Görevler</TabsTrigger>
                    <TabsTrigger value="habits">Alışkanlıklar</TabsTrigger>
                </TabsList>
                <TabsContent value="tasks" className="mt-4">
                     <div className="flex flex-col sm:flex-row gap-2 mb-4">
                        <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder={"Görev veya sorumlu ara..."}
                            className="pl-10 pr-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        </div>
                    </div>
                     <Tabs defaultValue="pending" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="pending">Devam Eden ({pendingTasks.length})</TabsTrigger>
                            <TabsTrigger value="completed">Tamamlananlar ({completedTasks.length})</TabsTrigger>
                        </TabsList>
                        <TabsContent value="pending" className="mt-4 space-y-3">
                            {pendingTasks.length > 0 ? (
                                pendingTasks.map((task) => (
                                <TaskItem key={task.id} task={task} assignee={getAssignee(task.assigneeId)} onEdit={handleOpenEditTask} />
                                ))
                            ) : (
                                <Card><CardContent className="p-8 text-center text-muted-foreground">Devam eden görev yok.</CardContent></Card>
                            )}
                        </TabsContent>
                        <TabsContent value="completed" className="mt-4 space-y-3">
                            {completedTasks.length > 0 ? (
                                completedTasks.map((task) => (
                                <TaskItem key={task.id} task={task} assignee={getAssignee(task.assigneeId)} onEdit={handleOpenEditTask} />
                                ))
                            ) : (
                                <Card><CardContent className="p-8 text-center text-muted-foreground">Henüz tamamlanan görev yok.</CardContent></Card>
                            )}
                        </TabsContent>
                    </Tabs>
                </TabsContent>
                <TabsContent value="habits" className="mt-4 space-y-4">
                    {habits.length > 0 ? (
                    habits.map((habit) => (
                        <HabitTrackerCard 
                            key={habit.id}
                            task={habit} 
                            assignee={familyMembers.find(m => m.id === habit.assigneeId)} 
                            onToggleDay={(day, isCompleted) => handleToggleDay(habit.id, day, isCompleted)}
                            onEdit={() => handleOpenEditTask(habit)}
                            onDelete={() => handleDeleteTask(habit.id)}
                        />
                    ))
                    ) : (
                    <Card><CardContent className="p-8 text-center text-muted-foreground">Takip edilen alışkanlık yok.</CardContent></Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>

        <aside className="space-y-6">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Liderlik Tablosu 🏆</CardTitle>
              <CardDescription>En çok XP kazanan üyeler.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {leaderboard.map((member, index) => (
                    <li key={member.id} className="flex items-center gap-3">
                      <span className="font-bold text-lg w-6">{index + 1}.</span>
                        <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold" 
                            style={{ backgroundColor: member.color, color: '#fff' }}
                        >
                            {member.name.charAt(0).toUpperCase()}
                        </div>
                      <div className="flex-grow">
                        <p className="font-semibold">{member.name}</p>
                        <div className="flex items-center text-sm text-yellow-500">
                          <Star className="w-4 h-4 mr-1 fill-current" />
                          <span>{member.xp.toLocaleString()} XP</span>
                        </div>
                      </div>
                      <Badge variant="secondary">Seviye {member.level}</Badge>
                    </li>
                  ))}
              </ul>
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}
