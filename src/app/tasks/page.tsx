"use client";

import * as React from "react";
import Image from "next/image";
import { PlusCircle, Search, Star } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskItem } from "@/components/task-item";
import { tasks, familyMembers } from "@/lib/data";

export default function TasksPage() {
  const [searchTerm, setSearchTerm] = React.useState("");

  const getAssignee = (assigneeId: number) => {
    return familyMembers.find((m) => m.id === assigneeId)!;
  };
  
  const leaderboard = [...familyMembers].sort((a,b) => {
    const pointsA = tasks.filter(t => t.assigneeId === a.id && t.completed).reduce((sum, t) => sum + t.points, 0);
    const pointsB = tasks.filter(t => t.assigneeId === b.id && t.completed).reduce((sum, t) => sum + t.points, 0);
    return pointsB - pointsA;
  });

  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getAssignee(task.assigneeId).name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const todoTasks = filteredTasks.filter((task) => !task.completed);
  const completedTasks = filteredTasks.filter((task) => task.completed);

  return (
    <>
      <PageHeader title="Görev Yönetimi 📝">
        <Button className="bg-gradient-to-r from-blue-500 to-green-500 text-white shadow-lg hover:shadow-xl transition-shadow">
          <PlusCircle className="mr-2 h-4 w-4" />
          Yeni Görev Ekle
        </Button>
      </PageHeader>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Görev veya kişi ara..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Tabs defaultValue="todo">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="todo">Yapılacaklar ({todoTasks.length})</TabsTrigger>
              <TabsTrigger value="completed">Tamamlananlar ({completedTasks.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="todo" className="mt-4">
              {todoTasks.length > 0 ? (
                todoTasks.map((task) => (
                  <TaskItem key={task.id} task={task} assignee={getAssignee(task.assigneeId)} />
                ))
              ) : (
                <Card className="mt-4"><CardContent className="p-8 text-center text-muted-foreground">Bekleyen görev yok. Harika!</CardContent></Card>
              )}
            </TabsContent>
            <TabsContent value="completed" className="mt-4">
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
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {leaderboard.map((member, index) => {
                  const totalPoints = tasks
                    .filter(t => t.assigneeId === member.id && t.completed)
                    .reduce((sum, t) => sum + t.points, 0);
                  
                  return (
                    <li key={member.id} className="flex items-center gap-3">
                      <span className="font-bold text-lg w-6">{index + 1}.</span>
                      <Image src={member.avatar} alt={member.name} width={40} height={40} className="rounded-full" />
                      <div className="flex-grow">
                        <p className="font-semibold">{member.name}</p>
                        <div className="flex items-center text-sm text-yellow-500">
                          <Star className="w-4 h-4 mr-1 fill-current" />
                          <span>{totalPoints} Puan</span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Kategori Dağılımı</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                <div className="flex justify-between items-center text-sm"><span className="text-blue-500">●</span> Ev İşleri <span className="font-semibold">{tasks.filter(t => t.category === "Ev İşleri").length}</span></div>
                <div className="flex justify-between items-center text-sm"><span className="text-green-500">●</span> Okul <span className="font-semibold">{tasks.filter(t => t.category === "Okul").length}</span></div>
                <div className="flex justify-between items-center text-sm"><span className="text-purple-500">●</span> Aile <span className="font-semibold">{tasks.filter(t => t.category === "Aile").length}</span></div>
                <div className="flex justify-between items-center text-sm"><span className="text-orange-500">●</span> Kişisel <span className="font-semibold">{tasks.filter(t => t.category === "Kişisel").length}</span></div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}
