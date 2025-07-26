
"use client";

import * as React from "react";
import Image from "next/image";
import { PlusCircle, Search, Star, Mic, Filter, ChevronDown, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskItem } from "@/components/task-item";
import { Task } from "@/lib/data";
import { onTasksUpdate, addTask } from "@/lib/dataService";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NewTaskForm } from "@/components/new-task-form";

export default function TasksPage() {
  const { user, familyMembers, loading: authLoading } = useAuth();
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isTaskFormOpen, setIsTaskFormOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);

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
  
  const getAssignee = (assigneeId: string) => {
    return familyMembers.find((m) => m.id === assigneeId);
  };
  
  const leaderboard = [...familyMembers].sort((a,b) => b.xp - a.xp);

  const filteredTasks = tasks.filter(task => {
    const searchMatch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (getAssignee(task.assigneeId) && getAssignee(task.assigneeId)!.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const categoryMatch = task.category === 'Ev İşleri' || task.category === 'Kişisel';
    return searchMatch && categoryMatch;
  });

  const houseTasks = filteredTasks.filter((task) => task.category === 'Ev İşleri');
  const personalTasks = filteredTasks.filter((task) => task.category === 'Kişisel');
  
  return (
    <>
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-xl shadow-lg mb-6">
        <h1 className="text-2xl font-bold">Görev Yönetimi 📝</h1>
        <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none" onClick={handleOpenNewTask}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Yeni Görev Ekle
        </Button>
      </div>

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
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder={"Görev, sorumlu veya kategori ara..."}
                className="pl-10 pr-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7">
                <Mic className={`h-4 w-4`}/>
              </Button>
            </div>
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="shrink-0">
                  <Filter className="mr-2 h-4 w-4" />
                  Filtrele
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Zorluğa Göre</DropdownMenuLabel>
                <DropdownMenuSeparator />
                 <DropdownMenuCheckboxItem>Kolay</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem>Orta</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem>Zor</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Tabs defaultValue="Ev İşleri">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="Ev İşleri">Ev İşleri ({houseTasks.length})</TabsTrigger>
              <TabsTrigger value="Kişisel">Kişisel ({personalTasks.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="Ev İşleri" className="mt-4 space-y-3">
              {houseTasks.length > 0 ? (
                houseTasks.map((task) => (
                  <TaskItem key={task.id} task={task} assignee={getAssignee(task.assigneeId)} onEdit={handleOpenEditTask} />
                ))
              ) : (
                <Card className="mt-4"><CardContent className="p-8 text-center text-muted-foreground">Bu kategoride görev yok.</CardContent></Card>
              )}
            </TabsContent>
            <TabsContent value="Kişisel" className="mt-4 space-y-3">
               {personalTasks.length > 0 ? (
                personalTasks.map((task) => (
                  <TaskItem key={task.id} task={task} assignee={getAssignee(task.assigneeId)} onEdit={handleOpenEditTask} />
                ))
               ) : (
                <Card className="mt-4"><CardContent className="p-8 text-center text-muted-foreground">Bu kategoride görev yok.</CardContent></Card>
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
                      <Badge variant="secondary">Lvl {member.level}</Badge>
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
