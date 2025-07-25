
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckSquare, Crown, Flame, Star, Zap } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { onTasksUpdate } from "@/lib/dataService";
import { FamilyMember, Task } from "@/lib/data";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskItem } from "@/components/task-item";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";


const badgeDefinitions: { [key: string]: { name: string; description: string } } = {
    // Görev Rozetleri
    '✨': { name: 'İlk Adım', description: 'İlk görevini tamamladın!' },
    '🔥': { name: 'Görev Ustası', description: '10 görev tamamladın!' },
    '🚀': { name: 'Süper Kahraman', description: '50 görev tamamladın!' },
    '🏆': { name: 'Efsane', description: '100 görev tamamladın!' },
    '💪': { name: 'Güçlü', description: 'Zor seviyede bir görev tamamladın!' },
    '📅': { name: 'Azimli', description: '7 günlük görev serisi yakaladın!' },

    // Eğitim Rozetleri
    '🎓': { name: 'Bilge', description: 'İlk sınavını tamamladın!' },
    '🧠': { name: 'Zeka Küpü', description: '10 sınav tamamladın!' },
    '🦉': { name: 'Profesör', description: '25 sınav tamamladın!' },
    '🎯': { name: 'Tam İsabet', description: 'Bir sınavdan 90 üzeri puan aldın!' },
    '💯': { name: 'Mükemmeliyetçi', description: 'Bir sınavdan 100 tam puan aldın!' },

    // Kitap Okuma Rozetleri
    '📖': { name: 'Kitap Kurdu', description: 'İlk kitabını bitirdin!' },
    '📚': { name: 'Koleksiyoner', description: '10 kitap bitirdin!' },
    '🏛️': { name: 'Kütüphaneci', description: '25 kitap bitirdin!' },
    ' marathon': { name: 'Maratoncu', description: '500 sayfadan uzun bir kitap bitirdin!' },
};

export default function ProfileClient() {
  const router = useRouter();
  const params = useParams();
  const memberId = params.memberId as string;

  const { familyMembers, loading: authLoading } = useAuth();
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = React.useState(true);

  const member = React.useMemo(() => 
    familyMembers.find(m => m.id === memberId),
  [familyMembers, memberId]);

  React.useEffect(() => {
    const unsubscribe = onTasksUpdate(allTasks => {
        setTasks(allTasks);
        setLoadingTasks(false);
    });
    return () => unsubscribe();
  }, []);

  const memberTasks = React.useMemo(() => 
    tasks.filter(task => task.assigneeId === memberId),
  [tasks, memberId]);

  const todoTasks = memberTasks.filter(task => !task.completed);
  const completedTasks = memberTasks.filter(task => task.completed);
  
  if (authLoading || loadingTasks) {
      return <div>Profil Yükleniyor...</div> // Replace with a proper skeleton later
  }

  if (!member) {
      return (
           <div className="flex flex-col items-center justify-center h-full">
               <p className="text-xl font-semibold">Üye Bulunamadı</p>
               <Button onClick={() => router.back()} className="mt-4">
                   <ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön
                </Button>
           </div>
      )
  }
  
  const xpForNextLevel = 1000;
  const currentLevelXp = member.xp % xpForNextLevel;

  return (
    <div className="space-y-8">
      <PageHeader title={`${member.name} Profili`}>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön
        </Button>
      </PageHeader>
      
      <Card className="p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row items-center gap-6">
               <div 
                  className="w-24 h-24 rounded-full flex items-center justify-center text-5xl font-bold shrink-0" 
                  style={{ backgroundColor: member.color, color: '#fff' }}
              >
                  {member.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-grow w-full text-center sm:text-left">
                  <h2 className="text-3xl font-bold">{member.name}</h2>
                  <p className="text-lg text-muted-foreground">{member.role}</p>
                  <div className="mt-4">
                        <div className="flex justify-between items-center text-sm font-semibold mb-1 text-muted-foreground">
                            <span>Seviye {member.level}</span>
                            <span>{currentLevelXp} / {xpForNextLevel} XP</span>
                            <span>Seviye {member.level + 1}</span>
                        </div>
                        <Progress value={currentLevelXp / 10} className="h-3" />
                    </div>
              </div>
          </div>
      </Card>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Toplam XP</CardTitle>
                    <Star className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{member.xp.toLocaleString()}</div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Seviye</CardTitle>
                    <Crown className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{member.level}</div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tamamlanan Görev</CardTitle>
                    <CheckSquare className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{member.completedTasks}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Seri</CardTitle>
                    <Flame className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{member.streak}</div>
                </CardContent>
            </Card>
      </div>

       <Card>
            <CardHeader>
                <CardTitle>Rozetler</CardTitle>
                <CardDescription>Kazanılan ve kazanılabilecek tüm başarılar.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Object.entries(badgeDefinitions).map(([emoji, def]) => {
                        const isEarned = member.badges?.includes(emoji);
                        return (
                           <Card key={emoji} className={cn("text-center p-4 transition-all", !isEarned && "opacity-60 grayscale")}>
                                <div className="text-4xl mb-2">{emoji}</div>
                                <h3 className="font-semibold">{def.name}</h3>
                                <p className="text-xs text-muted-foreground">{def.description}</p>
                           </Card>
                        );
                    })}
                </div>
            </CardContent>
      </Card>
      
      <div>
          <h3 className="text-xl font-bold mb-4">Görevleri</h3>
          <Tabs defaultValue="todo">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="todo">Yapılacaklar ({todoTasks.length})</TabsTrigger>
              <TabsTrigger value="completed">Tamamlananlar ({completedTasks.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="todo" className="mt-4 space-y-3">
              {todoTasks.length > 0 ? (
                todoTasks.map((task) => (
                  <TaskItem key={task.id} task={task} assignee={member} />
                ))
              ) : (
                <Card><CardContent className="p-8 text-center text-muted-foreground">Bekleyen görev yok.</CardContent></Card>
              )}
            </TabsContent>
            <TabsContent value="completed" className="mt-4 space-y-3">
               {completedTasks.length > 0 ? (
                completedTasks.map((task) => (
                  <TaskItem key={task.id} task={task} assignee={member} />
                ))
               ) : (
                <Card><CardContent className="p-8 text-center text-muted-foreground">Henüz tamamlanan görev yok.</CardContent></Card>
               )}
            </TabsContent>
          </Tabs>
      </div>
      
    </div>
  );
}
