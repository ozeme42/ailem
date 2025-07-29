
"use client";

import * as React from "react";
import Link from 'next/link';
import { useAuth } from "@/components/auth-provider";
import { onTasksUpdate, updateTask, deleteTask } from "@/lib/dataService";
import type { Task, FamilyMember, Subtask } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { NewTaskForm } from "@/components/new-task-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle, Edit, Trash2, MoreVertical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { format, isSameDay, parseISO } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogTrigger } from "@/components/ui/alert-dialog";


function HabitListItem({ task, onEdit, onDelete }: { task: Task, onEdit: (task: Task) => void, onDelete: (id: string) => void }) {
    
    const frequencyText = {
        daily: "Günlük",
        weekly: "Haftalık",
        monthly: "Aylık"
    }[task.recurrenceType || "daily"] || "Tek Seferlik";
    
    return (
        <Link href={`/habits/${task.id}`} className="block">
            <Card className="p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors">
                <div className="flex-grow">
                    <p className="font-semibold text-lg">{task.title}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                        <span>Mevcut Seri: <strong className="text-foreground">{task.streak || 0} gün</strong></span>
                        <span>En İyi Seri: <strong className="text-foreground">{task.bestStreak || 0} gün</strong></span>
                        {task.totalOccurrences && <span>İlerleme: <strong className="text-foreground">{task.completedOccurrences || 0}/{task.totalOccurrences}</strong></span>}
                        <span>Sıklık: <strong className="text-foreground">{frequencyText}</strong></span>
                    </div>
                </div>
                <div className="flex-shrink-0">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={(e) => e.preventDefault()}><MoreVertical className="h-4 w-4"/></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.preventDefault()}>
                            <DropdownMenuItem onClick={() => onEdit(task)}><Edit className="mr-2 h-4 w-4"/> Düzenle</DropdownMenuItem>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4"/>Sil
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitleComponent>Alışkanlığı Sil</AlertDialogTitleComponent>
                                        <AlertDialogDescription>"{task.title}" alışkanlığını kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>İptal</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => onDelete(task.id)}>Evet, Sil</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </DropdownMenuContent>
                    </DropdownMenu>
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
  const { toast } = useToast();

  React.useEffect(() => {
    const unsubscribe = onTasksUpdate(setTasks);
    return () => unsubscribe();
  }, []);

  const habitTasks = React.useMemo(() => {
    return tasks.filter(task => task.isRecurring);
  }, [tasks]);

  const handleOpenNewTask = () => {
    setEditingTask(null);
    setIsTaskFormOpen(true);
  };
  
  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskFormOpen(true);
  };
  
  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      toast({ title: "Alışkanlık Silindi", variant: "destructive" });
    } catch (e) {
      toast({
        title: "Hata",
        description: "Alışkanlık silinirken bir hata oluştu.",
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
            {habitTasks.map(task => (
                <HabitListItem
                    key={task.id}
                    task={task}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                />
            ))}
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
