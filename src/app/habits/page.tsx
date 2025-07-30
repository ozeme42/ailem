
"use client";

import * as React from "react";
import Link from 'next/link';
import { useAuth } from "@/components/auth-provider";
import { onTasksUpdate, updateTask, deleteTask } from "@/lib/dataService";
import type { Task, FamilyMember } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { NewTaskForm } from "@/components/new-task-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle, Edit, Trash2, MoreVertical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const brightColors = [
    'from-blue-500 to-indigo-600',
    'from-green-500 to-emerald-600',
    'from-purple-500 to-violet-600',
    'from-amber-500 to-orange-600',
    'from-teal-500 to-cyan-600',
    'from-rose-500 to-pink-600',
];


function HabitListItem({ task, colorClass }: { task: Task, colorClass: string }) {
    
    const frequencyText = {
        daily: "Günlük",
        weekly: "Haftalık",
        monthly: "Aylık"
    }[task.recurrenceType || "daily"] || "Tek Seferlik";
    
    return (
        <Link href={`/habits/${task.id}`} className="block group">
            <Card className={cn(
                "p-4 flex items-center gap-4 transition-all duration-300 text-white shadow-lg",
                "group-hover:shadow-xl group-hover:-translate-y-1",
                colorClass
            )}>
                <div className="flex-grow">
                    <p className="font-semibold text-lg">{task.title}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/80 mt-1">
                        <span>Mevcut Seri: <strong className="text-white">{task.streak || 0} gün</strong></span>
                        <span>En İyi Seri: <strong className="text-white">{task.bestStreak || 0} gün</strong></span>
                        {task.totalOccurrences && <span>İlerleme: <strong className="text-white">{task.completedOccurrences || 0}/{task.totalOccurrences}</strong></span>}
                        <span>Sıklık: <strong className="text-white">{frequencyText}</strong></span>
                    </div>
                </div>
            </Card>
        </Link>
    );
}


export default function HabitsPage() {
  const { familyMembers, user } = useAuth();
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [isTaskFormOpen, setIsTaskFormOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);
  const [selectedMember, setSelectedMember] = React.useState<FamilyMember | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    const unsubscribe = onTasksUpdate(setTasks);
    return () => unsubscribe();
  }, []);
  
  React.useEffect(() => {
    if (familyMembers.length > 0 && !selectedMember) {
        // Try to select the logged-in user first, otherwise default to the first member
        const currentUserAsMember = familyMembers.find(m => m.id === user?.uid);
        setSelectedMember(currentUserAsMember || familyMembers[0]);
    }
  }, [familyMembers, selectedMember, user]);

  const { personalHabits, houseHabits } = React.useMemo(() => {
    if (!selectedMember) return { personalHabits: [], houseHabits: [] };

    const memberHabits = tasks.filter(task => 
        task.isRecurring && task.assigneeId === selectedMember.id
    );

    const personal = memberHabits.filter(task => task.category === 'Kişisel');
    const house = memberHabits.filter(task => task.category === 'Ev İşleri');

    return { personalHabits: personal, houseHabits: house };
  }, [tasks, selectedMember]);

  const handleOpenNewTask = () => {
    setEditingTask(null);
    setIsTaskFormOpen(true);
  };
  
  return (
    <div className="space-y-6">
      <PageHeader title="Alışkanlık Takibi 💪">
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

       <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="personal">Kişisel ({personalHabits.length})</TabsTrigger>
              <TabsTrigger value="house">Ev İşleri ({houseHabits.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="personal" className="mt-4">
                {personalHabits.length > 0 ? (
                    <div className="space-y-4">
                        {personalHabits.map((task, index) => (
                            <HabitListItem
                                key={task.id}
                                task={task}
                                colorClass={cn('bg-gradient-to-br', brightColors[index % brightColors.length])}
                            />
                        ))}
                    </div>
                ) : (
                    <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                            <p>Bu kategoride takip edilen bir alışkanlık yok.</p>
                        </CardContent>
                    </Card>
                )}
            </TabsContent>
            <TabsContent value="house" className="mt-4">
                 {houseHabits.length > 0 ? (
                    <div className="space-y-4">
                        {houseHabits.map((task, index) => (
                            <HabitListItem
                                key={task.id}
                                task={task}
                                colorClass={cn('bg-gradient-to-br', brightColors[(index + 2) % brightColors.length])} // Offset color
                            />
                        ))}
                    </div>
                ) : (
                    <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                            <p>Bu kategoride takip edilen bir alışkanlık yok.</p>
                        </CardContent>
                    </Card>
                )}
            </TabsContent>
        </Tabs>
    </div>
  );
}
