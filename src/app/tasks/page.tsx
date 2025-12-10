"use client";

import * as React from "react";
import { 
  Plus, Search, Star, 
  Trophy, Target, CheckCircle2, 
  ListTodo, Flame, LayoutGrid, Zap, Check, Edit, Trash2, MoreHorizontal, ArrowLeft
} from "lucide-react"; 
import { useRouter } from "next/navigation"; 
import { 
  subDays, isSameDay, startOfDay, format, 
} from "date-fns";
import { tr } from "date-fns/locale";

import { useAuth } from "@/components/auth-provider"; 

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NewTaskForm } from "@/components/new-task-form"; 
import { TaskItem } from "@/components/task-item"; 
import { Task } from "@/lib/data";
import { onTasksUpdate, updateHabitCompletion, deleteTask } from "@/lib/dataService";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

// --- TASARIM: Glassmorphism Renk Paleti ---
const glassColors = {
    CARD_BG: "bg-white/5 backdrop-blur-md border border-white/10 shadow-lg",
    CARD_HOVER: "hover:bg-white/10",
    TEXT_MAIN: "text-slate-100",
    TEXT_MUTED: "text-slate-400",
    BUTTON_GLASS: "bg-white/10 hover:bg-white/20 text-white border border-white/20",
    ICON_GRADIENT: "bg-gradient-to-tr from-indigo-400 to-fuchsia-400 p-2 rounded-xl shadow-md",
    HEADER_BG: "bg-slate-950/70 backdrop-blur-lg border-b border-white/5"
};

const taskColors = [
    'bg-blue-600/30 border-blue-400/50 text-blue-200',
    'bg-emerald-600/30 border-emerald-400/50 text-emerald-200',
    'bg-amber-600/30 border-amber-400/50 text-amber-200',
    'bg-rose-600/30 border-rose-400/50 text-rose-200',
    'bg-violet-600/30 border-violet-400/50 text-violet-200',
];

// --- HABIT TRACKER CARD (Lokal Tanım) ---
interface HabitTrackerCardProps {
  task: Task;
  assignee?: { name: string; avatar?: string; color?: string };
  onToggleDay: (day: Date, isCompleted: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  colorClass?: string;
}

const HabitTrackerCard = React.forwardRef<HTMLDivElement, HabitTrackerCardProps>(({ 
  task, 
  assignee, 
  onToggleDay, 
  onEdit, 
  onDelete,
  colorClass 
}, ref) => {
  
  const days = React.useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = subDays(new Date(), 6 - i);
      return startOfDay(d);
    });
  }, []);

  const isDayCompleted = (day: Date) => {
    return task.completedDates?.some(d => isSameDay(new Date(d), day));
  };

  const currentStreak = React.useMemo(() => {
    let streak = 0;
    const today = startOfDay(new Date());
    let checkDate = isDayCompleted(today) ? today : subDays(today, 1);
    
    while (task.completedDates?.some(d => isSameDay(new Date(d), checkDate))) {
        streak++;
        checkDate = subDays(checkDate, 1);
    }
    return streak;
  }, [task.completedDates]);

  return (
    <div ref={ref} className={cn("rounded-2xl p-4 border shadow-md", glassColors.CARD_BG, glassColors.CARD_HOVER, "border-white/10")}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        <div className="flex items-start gap-3 flex-1">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-1", "bg-fuchsia-600/40 text-fuchsia-200 border border-fuchsia-500/50")}>
                <Flame className={cn("w-5 h-5", currentStreak > 2 ? "fill-current animate-pulse" : "")} />
            </div>
            
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h4 className={cn("font-bold truncate", glassColors.TEXT_MAIN)}>{task.title}</h4>
                    {currentStreak > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-600/50 text-orange-200 flex items-center gap-1 border border-orange-400/50">
                             🔥 {currentStreak} Gün
                        </span>
                    )}
                </div>
                
                <div className="flex items-center gap-2 mt-1">
                    {assignee && (
                        <div className={cn("flex items-center gap-1 text-xs px-2 py-0.5 rounded-full", glassColors.TEXT_MUTED, "bg-white/5 border border-white/10")}>
                            <span 
                                className="w-1.5 h-1.5 rounded-full" 
                                style={{backgroundColor: assignee.color || '#ccc'}} 
                            />
                            {assignee.name}
                        </div>
                    )}
                </div>
            </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto">
             {days.map((day) => {
                 const completed = isDayCompleted(day);
                 const isTodayDate = isSameDay(day, new Date());
                 
                 return (
                     <div key={day.toISOString()} className="flex flex-col items-center gap-1">
                         <span className={cn("text-[10px] font-medium uppercase", glassColors.TEXT_MUTED)}>
                             {format(day, 'EEE', { locale: tr }).slice(0, 1)}
                         </span>
                         <button
                            onClick={() => onToggleDay(day, !completed)}
                            className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 border",
                                completed 
                                    ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105" 
                                    : "bg-white/5 border-white/10 text-transparent hover:border-emerald-300/50 hover:bg-white/10",
                                isTodayDate && !completed && "ring-2 ring-emerald-400/50 border-emerald-300/50"
                            )}
                         >
                             <Check className={cn("w-4 h-4 stroke-[3]", completed ? "opacity-100" : "opacity-0")} /> 
                         </button>
                     </div>
                 )
             })}

             <div className="ml-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className={cn("h-8 w-8 p-0 rounded-full", glassColors.TEXT_MUTED, "hover:bg-white/10 hover:text-white")}>
                            <MoreHorizontal className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-slate-900 border-white/10 text-slate-100" align="end">
                        <DropdownMenuItem onClick={onEdit} className="hover:bg-white/10">
                            <Edit className="mr-2 h-4 w-4 text-blue-400" /> Düzenle
                        </DropdownMenuItem>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-rose-500 focus:text-rose-400 focus:bg-rose-500/10 cursor-pointer">
                                    <Trash2 className="mr-2 h-4 w-4" /> Sil
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-slate-900 border-white/10 text-slate-100">
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Emin misin?</AlertDialogTitle>
                                    <AlertDialogDescription className={glassColors.TEXT_MUTED}>Bu alışkanlığı ve tüm geçmişini silmek üzeresin.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-white/10 text-slate-100 border-white/10 hover:bg-white/20">Vazgeç</AlertDialogCancel>
                                    <AlertDialogAction onClick={onDelete} className="bg-rose-600 hover:bg-rose-700 text-white">Sil</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </DropdownMenuContent>
                </DropdownMenu>
             </div>
        </div>
      </div>
    </div>
  );
});
HabitTrackerCard.displayName = 'HabitTrackerCard';

// --- YARDIMCI BİLEŞENLER ---
const GlassStatCard = ({ icon: Icon, label, value, color }: any) => (
    <div className={cn("p-3 rounded-2xl flex items-center gap-3 flex-1", glassColors.CARD_BG)}>
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", color)}>
            <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
            <p className={cn("text-xs font-medium uppercase tracking-wider", glassColors.TEXT_MUTED)}>{label}</p>
            <p className={cn("text-lg font-bold leading-none", glassColors.TEXT_MAIN)}>{value}</p>
        </div>
    </div>
);

const GlassEmptyState = ({ title, desc, icon: Icon }: { title: string, desc: string, icon: any }) => (
    <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center rounded-2xl border border-dashed", glassColors.CARD_BG, "border-white/20")}>
        <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center mb-3">
            <Icon className="w-7 h-7 text-slate-400" />
        </div>
        <h3 className={cn("font-semibold", glassColors.TEXT_MAIN)}>{title}</h3>
        <p className={cn("text-sm mt-1 max-w-[200px]", glassColors.TEXT_MUTED)}>{desc}</p>
    </div>
);

// --- ANA COMPONENT ---
export default function TasksPage() {
  const router = useRouter(); 
  const { user, familyMembers } = useAuth();
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isFormDialogOpen, setIsFormDialogOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);
  const [activeTab, setActiveTab] = React.useState<'tasks' | 'habits'>('tasks');
  const [taskFilter, setTaskFilter] = React.useState<'pending' | 'completed'>('pending');
  
  const { toast } = useToast();

  React.useEffect(() => {
    const unsubscribe = onTasksUpdate((updatedTasks) => {
      setTasks(updatedTasks);
    });
    return () => unsubscribe();
  }, []);

  const handleOpenEditTask = (task: Task) => {
    setEditingTask(task);
    setIsFormDialogOpen(true);
  };

  const handleOpenNewTask = () => {
    setEditingTask(null);
    setIsFormDialogOpen(true);
  };
  
  const handleDeleteTask = async (taskId: string) => {
    try {
        await deleteTask(taskId);
        toast({ title: "🗑️ Silindi", description: "Görev listeden uçtu gitti.", variant: 'destructive' });
    } catch (error) {
        toast({ title: "Hata", description: "Silinirken bir sorun oluştu.", variant: "destructive"});
    }
  }
  
  const getAssignee = (assigneeId: string) => familyMembers.find((m) => m.id === assigneeId);

  const handleToggleDay = async (taskId: string, day: Date, isCompleted: boolean) => {
      try {
          await updateHabitCompletion(taskId, day, isCompleted);
      } catch(e) {
          toast({ title: 'Hata', description: 'İşaretleme başarısız.', variant: 'destructive'});
      }
  }
  
  const leaderboard = React.useMemo(() => [...familyMembers].sort((a,b) => b.xp - a.xp), [familyMembers]);

  const { pendingTasks, completedTasks, habits, stats } = React.useMemo(() => {
    const filteredTasks = tasks.filter(task => {
        const searchMatch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (getAssignee(task.assigneeId)?.name.toLowerCase().includes(searchTerm.toLowerCase()));
        return searchMatch;
    });

    const pending = filteredTasks.filter(t => !t.isRecurring && !t.completed);
    const completed = filteredTasks.filter(t => !t.isRecurring && t.completed);
    const habitList = filteredTasks.filter(t => t.isRecurring);

    return {
        pendingTasks: pending,
        completedTasks: completed,
        habits: habitList,
        stats: {
            totalPending: pending.length,
            totalHabits: habitList.length,
            userXP: user ? familyMembers.find(m => m.id === user.uid)?.xp || 0 : 0
        }
    };
  }, [tasks, searchTerm, familyMembers, user]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-32 md:pb-10 selection:bg-indigo-500/30 relative overflow-hidden">
      
      {/* AMBIENT BACKGROUND BLOBS */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-5%] left-[60%] w-[500px] h-[500px] bg-indigo-600/30 rounded-full blur-[120px]" />
          <div className="absolute bottom-[10%] left-[-10%] w-[400px] h-[400px] bg-fuchsia-600/20 rounded-full blur-[100px]" />
      </div>

      {/* 1. HEADER & SEARCH (DİNAMİK GLASS HEADER) */}
      <div className={cn("sticky top-0 z-40 py-4 sm:px-6 transition-all duration-300", glassColors.HEADER_BG)}>
        <div className="max-w-7xl mx-auto px-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => router.back()} 
                        className={cn("rounded-full mr-1", glassColors.TEXT_MUTED, "hover:bg-white/10 hover:text-white")}
                      >
                          <ArrowLeft className="w-5 h-5" />
                      </Button>
                      <div className={glassColors.ICON_GRADIENT}>
                          <CheckCircle2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                          <p className={cn("text-xs font-semibold uppercase tracking-wider", glassColors.TEXT_MUTED)}>Planlayıcı</p>
                          <h1 className={cn("text-lg font-bold leading-none", glassColors.TEXT_MAIN)}>Görevler</h1>
                      </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto">
                      <div className="relative flex-1 md:w-64">
                          <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", glassColors.TEXT_MUTED)} />
                          <Input 
                            placeholder="Görev ara..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={cn("pl-9 rounded-xl border-white/10", glassColors.CARD_BG, glassColors.TEXT_MAIN, "placeholder:text-slate-500")} 
                          />
                      </div>
                      <Button onClick={handleOpenNewTask} className={cn("hidden md:flex rounded-full px-6", glassColors.BUTTON_GLASS)}>
                           <Plus className="w-4 h-4 mr-2" /> Yeni Ekle
                       </Button>
                  </div>
              </div>

              {/* MOBİL İSTATİSTİKLER (Horizontal Scroll) */}
              <div className="flex gap-3 mt-4 overflow-x-auto pb-2 scrollbar-hide md:hidden">
                  <GlassStatCard icon={ListTodo} label="Bekleyen" value={stats.totalPending} color="bg-blue-600/50" />
                  <GlassStatCard icon={Target} label="Alışkanlık" value={stats.totalHabits} color="bg-emerald-600/50" />
                  <GlassStatCard icon={Star} label="XP Puanın" value={stats.userXP} color="bg-amber-600/50" />
              </div>
          </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* SOL KOLON: ANA İÇERİK */}
        <div className="lg:col-span-8 space-y-6">
            
            {/* TAB SELECTOR (GLASS STYLE) */}
            <div className={cn("p-1 rounded-2xl flex relative", glassColors.CARD_BG)}>
                <button 
                    onClick={() => setActiveTab('tasks')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
                        activeTab === 'tasks' ? "bg-white/10 text-white shadow-lg shadow-black/30" : glassColors.TEXT_MUTED + " hover:text-slate-300"
                    )}
                >
                    <ListTodo className="w-4 h-4" /> Görevler
                    {pendingTasks.length > 0 && <span className="bg-blue-600/50 text-blue-100 px-1.5 py-0.5 rounded-md text-[10px] border border-blue-400/50">{pendingTasks.length}</span>}
                </button>
                <button 
                    onClick={() => setActiveTab('habits')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
                        activeTab === 'habits' ? "bg-white/10 text-white shadow-lg shadow-black/30" : glassColors.TEXT_MUTED + " hover:text-slate-300"
                    )}
                >
                    <Target className="w-4 h-4" /> Alışkanlıklar
                </button>
            </div>

            {/* --- GÖREVLER GÖRÜNÜMÜ --- */}
            {activeTab === 'tasks' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Alt Filtreler */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        <button onClick={() => setTaskFilter('pending')} className={cn("px-4 py-1.5 rounded-full text-xs font-medium border transition-colors", taskFilter === 'pending' ? "bg-white text-gray-900 border-white/20" : glassColors.BUTTON_GLASS)}>
                            Yapılacaklar ({pendingTasks.length})
                        </button>
                        <button onClick={() => setTaskFilter('completed')} className={cn("px-4 py-1.5 rounded-full text-xs font-medium border transition-colors", taskFilter === 'completed' ? "bg-white text-gray-900 border-white/20" : glassColors.BUTTON_GLASS)}>
                            Tamamlananlar ({completedTasks.length})
                        </button>
                    </div>

                    <div className="space-y-3">
                        {taskFilter === 'pending' ? (
                            pendingTasks.length > 0 ? (
                                pendingTasks.map((task, index) => (
                                    <div key={task.id} className="transform transition-all hover:scale-[1.01]">
                                        <TaskItem 
                                            task={task} 
                                            assignee={getAssignee(task.assigneeId)} 
                                            onEdit={handleOpenEditTask} 
                                            colorClass={taskColors[index % taskColors.length]} 
                                            onDelete={() => handleDeleteTask(task.id)}
                                        />
                                    </div>
                                ))
                            ) : (
                                <GlassEmptyState title="Süpersin! 🎉" desc="Yapılacak hiç görev kalmadı." icon={Zap} />
                            )
                        ) : (
                            completedTasks.length > 0 ? (
                                completedTasks.map((task) => (
                                    <div key={task.id} className="opacity-70 hover:opacity-100 transition-opacity">
                                        <TaskItem 
                                            task={task} 
                                            assignee={getAssignee(task.assigneeId)} 
                                            onEdit={handleOpenEditTask} 
                                            onDelete={() => handleDeleteTask(task.id)}
                                        />
                                    </div>
                                ))
                            ) : (
                                <GlassEmptyState title="Henüz biten yok" desc="Tamamlanan görevler burada görünür." icon={ListTodo} />
                            )
                        )}
                    </div>
                </div>
            )}

            {/* --- ALIŞKANLIKLAR GÖRÜNÜMÜ --- */}
            {activeTab === 'habits' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                     {habits.length > 0 ? (
                        habits.map((habit, index) => (
                            <HabitTrackerCard
                                key={habit.id}
                                task={habit} 
                                assignee={familyMembers.find(m => m.id === habit.assigneeId)} 
                                onToggleDay={(day, isCompleted) => handleToggleDay(habit.id, day, isCompleted)}
                                onEdit={() => handleOpenEditTask(habit)}
                                onDelete={() => handleDeleteTask(habit.id)}
                                colorClass={taskColors[index % taskColors.length]}
                            />
                        ))
                    ) : (
                        <GlassEmptyState title="Alışkanlık Edin" desc="Zinciri kırmadan devam edeceğin hedefler ekle." icon={Flame} />
                    )}
                </div>
            )}
        </div>

        {/* SAĞ KOLON: LİDERLİK & İSTATİSTİK */}
        <aside className="lg:col-span-4 space-y-6">
            
            {/* Desktop Stats */}
            <div className="hidden md:grid grid-cols-2 gap-3">
                 <GlassStatCard icon={ListTodo} label="Bekleyen" value={stats.totalPending} color="bg-blue-600/50" />
                 <GlassStatCard icon={Star} label="XP Puanın" value={stats.userXP} color="bg-amber-600/50" />
            </div>

            {/* LEADERBOARD CARD */}
            <div className={cn("rounded-3xl shadow-sm overflow-hidden sticky top-24", glassColors.CARD_BG)}>
                <div className="p-5 border-b border-white/10 bg-white/10">
                    <div className="flex items-center gap-2 mb-1">
                        <Trophy className="w-5 h-5 text-amber-300" />
                        <h3 className={cn("font-bold text-amber-200", glassColors.TEXT_MAIN)}>Liderlik Tablosu</h3>
                    </div>
                    <p className={cn("text-xs", glassColors.TEXT_MUTED)}>En çok XP kazanan üyeler.</p>
                </div>
                
                <ScrollArea className="max-h-[400px]">
                    <div className="p-2 space-y-1">
                        {leaderboard.map((member, index) => (
                            <div key={member.id} className={cn("flex items-center gap-3 p-3 rounded-2xl transition-colors", glassColors.CARD_HOVER)}>
                                <div className={cn(
                                    "w-8 h-8 flex items-center justify-center font-bold rounded-full text-sm shadow-md",
                                    index === 0 ? "bg-yellow-500 text-slate-900 shadow-yellow-500/30" :
                                    index === 1 ? "bg-slate-400 text-slate-900" :
                                    index === 2 ? "bg-orange-500 text-slate-900" : "bg-white/10 text-slate-400"
                                )}>
                                    {index + 1}
                                </div>
                                
                                <Avatar className="w-10 h-10 border-2 border-white/20 shadow-sm">
                                    <AvatarImage src={member.avatar} />
                                    <AvatarFallback style={{backgroundColor: member.color}} className="text-white font-bold">
                                        {member.name[0].toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>

                                <div className="flex-1 min-w-0">
                                    <p className={cn("font-semibold text-sm truncate", glassColors.TEXT_MAIN)}>{member.name}</p>
                                    <p className={cn("text-xs", glassColors.TEXT_MUTED)}>Seviye {member.level}</p>
                                </div>
                                
                                <div className="text-right">
                                    <span className={cn("block font-bold text-sm text-amber-400")}>{member.xp.toLocaleString()}</span>
                                    <span className={cn("text-[10px]", glassColors.TEXT_MUTED)}>XP</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-lg shadow-indigo-500/30 relative overflow-hidden hidden md:block border border-indigo-400/50">
                 <div className="relative z-10">
                     <p className="font-medium text-lg mb-1">"Zinciri Kırma!"</p>
                     <p className="text-indigo-100 text-sm opacity-90">Her gün yapılan küçük bir adım, yarın büyük bir başarıya dönüşür.</p>
                 </div>
                 <Flame className="absolute -bottom-4 -right-4 w-24 h-24 text-indigo-500 opacity-50 rotate-12" />
            </div>
        </aside>
      </div>

      {/* FAB: MOBİL BUTON */}
      <button 
        onClick={handleOpenNewTask}
        className="fixed bottom-24 right-6 md:hidden z-50 w-14 h-14 bg-white text-slate-900 rounded-full shadow-xl shadow-white/30 flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* FORM DIALOG */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
          <DialogContent className="sm:max-w-md bg-slate-900 border-white/10 shadow-2xl rounded-3xl text-slate-100">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                 {editingTask ? <LayoutGrid className="w-5 h-5 text-blue-400" /> : <Target className="w-5 h-5 text-indigo-400" />}
                 {editingTask ? 'Görevi Düzenle' : 'Yeni Görev Ekle'}
              </DialogTitle>
              <DialogDescription className={glassColors.TEXT_MUTED}>
                 Aileniz veya kendiniz için yeni bir hedef belirleyin.
              </DialogDescription>
            </DialogHeader>
            
            {/* CSS Wrapper for styling form internals */}
            <div className="
                text-slate-100
                [&_label]:text-slate-300 [&_label]:font-medium
                [&_input]:bg-white/5 [&_input]:border-white/10 [&_input]:text-slate-100 [&_input]:placeholder:text-slate-500
                [&_select]:bg-white/5 [&_select]:border-white/10 [&_select]:text-slate-100
                [&_button]:shadow-sm
            ">
                <NewTaskForm 
                    familyMembers={familyMembers}
                    onTaskProcessed={() => setIsFormDialogOpen(false)}
                    taskToEdit={editingTask}
                />
            </div>
          </DialogContent>
      </Dialog>
    </div>
  );
}