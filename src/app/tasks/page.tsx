
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
  const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = React.useState(false);

  React.useEffect(() => {
    setLoading(true);
    const unsubscribe = onTasksUpdate((updatedTasks) => {
      setTasks(updatedTasks);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);
  
  const getAssignee = (assigneeId: string) => {
    return familyMembers.find((m) => m.id === assigneeId);
  };
  
  const leaderboard = [...familyMembers].sort((a,b) => b.xp - a.xp);

  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (getAssignee(task.assigneeId) && getAssignee(task.assigneeId)!.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const todoTasks = filteredTasks.filter((task) => !task.completed);
  const completedTasks = filteredTasks.filter((task) => task.completed);
  
  return (
    <>
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-xl shadow-lg mb-6">
        <h1 className="text-2xl font-bold">Görev Yönetimi 📝</h1>
        <Dialog open={isNewTaskDialogOpen} onOpenChange={setIsNewTaskDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none">
              <PlusCircle className="mr-2 h-4 w-4" />
              Yeni Görev Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Yeni Görev Oluştur</DialogTitle>
              <DialogDescription>
                Yeni bir görev ekleyerek ailenizin düzenine katkıda bulunun.
              </DialogDescription>
            </DialogHeader>
            <NewTaskForm 
                familyMembers={familyMembers}
                onTaskCreated={() => setIsNewTaskDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
      
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
                <DropdownMenuLabel>Kategoriye Göre</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem>Ev İşleri</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem>Okul</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem>Aile</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem>Kişisel</DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Zorluğa Göre</DropdownMenuLabel>
                <DropdownMenuSeparator />
                 <DropdownMenuCheckboxItem>Kolay</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem>Orta</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem>Zor</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Tabs defaultValue="todo">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="todo">Yapılacaklar ({todoTasks.length})</TabsTrigger>
              <TabsTrigger value="completed">Tamamlananlar ({completedTasks.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="todo" className="mt-4 space-y-3">
              {todoTasks.length > 0 ? (
                todoTasks.map((task) => (
                  <TaskItem key={task.id} task={task} assignee={getAssignee(task.assigneeId)} />
                ))
              ) : (
                <Card className="mt-4"><CardContent className="p-8 text-center text-muted-foreground">Bekleyen görev yok. Harika!</CardContent></Card>
              )}
            </TabsContent>
            <TabsContent value="completed" className="mt-4 space-y-3">
               {completedTasks.length > 0 ? (
                completedTasks.map((task) => (
                  <TaskItem key={task.id} task={task} assignee={getAssignee(task.assigneeId)} />
                ))
               ) : (
                <Card className="mt-4"><CardContent className="p-8 text-center text-muted-foreground">Henüz tamamlanan görev yok.</CardContent></Card>
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
                      <Image src={member.avatar} alt={member.name} width={40} height={40} className="rounded-full object-cover" data-ai-hint="person" />
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
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Kategori Dağılımı</CardTitle>
               <CardDescription>Görevlerin kategorilere göre dağılımı.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                <div className="flex justify-between items-center text-sm"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Ev İşleri</span> <Badge variant="outline">{tasks.filter(t => t.category === "Ev İşleri").length}</Badge></div>
                <div className="flex justify-between items-center text-sm"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span> Okul</span> <Badge variant="outline">{tasks.filter(t => t.category === "Okul").length}</Badge></div>
                <div className="flex justify-between items-center text-sm"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-purple-500"></span> Aile</span> <Badge variant="outline">{tasks.filter(t => t.category === "Aile").length}</Badge></div>
                <div className="flex justify-between items-center text-sm"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Kişisel</span> <Badge variant="outline">{tasks.filter(t => t.category === "Kişisel").length}</Badge></div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}
