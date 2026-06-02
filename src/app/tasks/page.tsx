"use client";

import * as React from "react";
import { 
  Plus, Search, Star, X,
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
    CARD_BG: "bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm",
    CARD_HOVER: "hover:bg-slate-50 dark:hover:bg-white/5",
    TEXT_MAIN: "text-slate-900 dark:text-slate-100",
    TEXT_MUTED: "text-slate-500 dark:text-slate-400",
    BUTTON_GLASS: "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white dark:border-white/20",
    ICON_GRADIENT: "bg-gradient-to-tr from-indigo-500 to-fuchsia-500 p-2 rounded-xl shadow-md",
    HEADER_BG: "bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5"
};

const taskColors = [
    'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-600/20 dark:border-blue-400/30 dark:text-blue-200',
    'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-600/20 dark:border-emerald-400/30 dark:text-emerald-200',
    'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-600/20 dark:border-amber-400/30 dark:text-amber-200',
    'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-600/20 dark:border-rose-400/30 dark:text-rose-200',
    'bg-violet-50 border-violet-200 text-violet-900 dark:bg-violet-600/20 dark:border-violet-400/30 dark:text-violet-200',
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
    <div ref={ref} className={cn("rounded-2xl p-4 transition-all duration-300 relative overflow-hidden", glassColors.CARD_BG, glassColors.CARD_HOVER)}>
      <div className={cn("absolute left-0 top-0 bottom-0 w-1.5 opacity-60", colorClass?.split(' ')[0] || "bg-indigo-500")} />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pl-2">
        <div className="flex items-start gap-3 flex-1">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 shadow-sm", "bg-fuchsia-100 text-fuchsia-600 border border-fuchsia-200 dark:bg-fuchsia-600/30 dark:text-fuchsia-300 dark:border-fuchsia-500/30")}>
                <Flame className={cn("w-5 h-5", currentStreak > 2 ? "fill-current animate-pulse text-fuchsia-500 dark:text-fuchsia-400" : "")} />
            </div>
            
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h4 className={cn("font-bold truncate text-base", glassColors.TEXT_MAIN)}>{task.title}</h4>
                    {currentStreak > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-600/30 dark:text-orange-300 dark:border-orange-500/30 flex items-center gap-1 shadow-sm">
                             🔥 {currentStreak} Gün
                        </span>
                    )}
                </div>
                
                <div className="flex items-center gap-2 mt-1">
                    {assignee && (
                        <div className={cn("flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium shadow-sm", "bg-slate-100 border-slate-200 text-slate-700 dark:bg-white/5 dark:border-white/10 dark:text-slate-300")}>
                            <span 
                                className="w-2 h-2 rounded-full" 
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
                     <div key={day.toISOString()} className="flex flex-col items-center gap-1.5">
                         <span className={cn("text-[10px] font-bold uppercase", glassColors.TEXT_MUTED)}>
                             {format(day, 'EEE', { locale: tr }).slice(0, 1)}
                         </span>
                         <button
                            onClick={() => onToggleDay(day, !completed)}
                            className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                                completed 
                                    ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-110" 
                                    : "bg-slate-100 border-slate-200 text-transparent hover:border-emerald-300 hover:bg-slate-50 dark:bg-white/5 dark:border-white/10 dark:hover:border-emerald-500/50 dark:hover:bg-white/10",
                                isTodayDate && !completed && "ring-2 ring-offset-2 ring-emerald-500/50 border-emerald-400 dark:ring-offset-slate-900"
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
                        <Button variant="ghost" className={cn("h-8 w-8 p-0 rounded-full", glassColors.TEXT_MUTED, "hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white")}>
                            <MoreHorizontal className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 rounded-xl shadow-xl" align="end">
                        <DropdownMenuItem onClick={onEdit} className="hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer font-medium m-1 rounded-lg">
                            <Edit className="mr-2 h-4 w-4 text-blue-500 dark:text-blue-400" /> Düzenle
                        </DropdownMenuItem>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-rose-600 dark:text-rose-400 focus:text-rose-700 dark:focus:text-rose-300 focus:bg-rose-50 dark:focus:bg-rose-500/10 cursor-pointer font-medium m-1 rounded-lg">
                                    <Trash2 className="mr-2 h-4 w-4" /> Sil
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 rounded-[2rem] p-6 shadow-2xl">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-xl font-black">Emin misin?</AlertDialogTitle>
                                    <AlertDialogDescription className={glassColors.TEXT_MUTED}>Bu alışkanlığı ve tüm geçmişini silmek üzeresin.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="mt-6 gap-3">
                                    <AlertDialogCancel className="h-12 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/5 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10 border-none flex-1 sm:flex-none">Vazgeç</AlertDialogCancel>
                                    <AlertDialogAction onClick={onDelete} className="h-12 rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white flex-1 sm:flex-none">Sil</AlertDialogAction>
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
    <div className={cn("p-3 rounded-2xl flex flex-col items-center justify-center gap-2 text-center", glassColors.CARD_BG)}>
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shadow-sm", color)}>
            <Icon className="w-4 h-4 text-white" />
        </div>
        <div>
            <p className={cn("text-[10px] font-bold uppercase tracking-wider leading-none", glassColors.TEXT_MUTED)}>{label}</p>
            <p className={cn("text-xl font-black leading-none mt-1", glassColors.TEXT_MAIN)}>{value}</p>
        </div>
    </div>
);

const GlassEmptyState = ({ title, desc, icon: Icon }: { title: string, desc: string, icon: any }) => (
    <div className={cn("flex flex-col items-center justify-center py-16 px-6 text-center rounded-3xl border-2 border-dashed", glassColors.CARD_BG, "border-slate-200 dark:border-white/10")}>
        <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4 shadow-inner">
            <Icon className="w-10 h-10 text-slate-400 dark:text-slate-500" />
        </div>
        <h3 className={cn("text-xl font-black", glassColors.TEXT_MAIN)}>{title}</h3>
        <p className={cn("text-sm mt-2 max-w-[250px] font-medium", glassColors.TEXT_MUTED)}>{desc}</p>
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-32 md:pb-10 selection:bg-indigo-500/30 relative overflow-hidden transition-colors duration-300">
      
      {/* AMBIENT BACKGROUND BLOBS */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 opacity-40 dark:opacity-100 transition-opacity duration-700">
          <div className="absolute top-[-5%] left-[60%] w-[600px] h-[600px] bg-indigo-500/20 dark:bg-indigo-600/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-fuchsia-500/10 dark:bg-fuchsia-600/10 rounded-full blur-[100px]" />
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
                        className={cn("rounded-full mr-1", glassColors.TEXT_MUTED, "hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white")}
                      >
                          <ArrowLeft className="w-5 h-5" />
                      </Button>
                      <div className={glassColors.ICON_GRADIENT}>
                          <CheckCircle2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                          <p className={cn("text-xs font-bold uppercase tracking-wider", glassColors.TEXT_MUTED)}>Planlayıcı</p>
                          <h1 className={cn("text-xl font-black tracking-tight", glassColors.TEXT_MAIN)}>Görevler</h1>
                      </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto">
                      <div className="relative flex-1 md:w-72">
                          <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", glassColors.TEXT_MUTED)} />
                          <Input 
                            placeholder="Görev veya kişi ara..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={cn("pl-9 rounded-2xl h-12 font-medium focus-visible:ring-indigo-500/50", glassColors.CARD_BG, glassColors.TEXT_MAIN, "placeholder:text-slate-400 dark:placeholder:text-slate-500")} 
                          />
                      </div>
                      <Button onClick={handleOpenNewTask} className={cn("hidden md:flex rounded-2xl h-12 px-6 font-bold", glassColors.BUTTON_GLASS)}>
                           <Plus className="w-5 h-5 mr-2" /> Yeni Ekle
                       </Button>
                  </div>
              </div>

              {/* MOBİL İSTATİSTİKLER (3 Kolon Grid) */}
              <div className="grid grid-cols-3 gap-2 mt-4 md:hidden">
                  <GlassStatCard icon={ListTodo} label="Bekleyen" value={stats.totalPending} color="bg-blue-500 shadow-blue-500/20 text-white" />
                  <GlassStatCard icon={Target} label="Alışkanlık" value={stats.totalHabits} color="bg-emerald-500 shadow-emerald-500/20 text-white" />
                  <GlassStatCard icon={Star} label="XP Puanın" value={stats.userXP} color="bg-amber-500 shadow-amber-500/20 text-white" />
              </div>
          </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 relative z-10">
        
        {/* SOL KOLON: ANA İÇERİK */}
        <div className="lg:col-span-8 space-y-8">
            
            {/* TAB SELECTOR (GLASS STYLE) */}
            <div className={cn("p-1.5 rounded-[1.5rem] flex relative shadow-sm", glassColors.CARD_BG)}>
                <button 
                    onClick={() => setActiveTab('tasks')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all duration-300",
                        activeTab === 'tasks' ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white" : glassColors.TEXT_MUTED + " hover:text-slate-900 dark:hover:text-slate-200"
                    )}
                >
                    <ListTodo className="w-4 h-4" /> Görevler
                    {pendingTasks.length > 0 && <span className={cn("px-2 py-0.5 rounded-lg text-[10px] font-black", activeTab === 'tasks' ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300" : "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400")}>{pendingTasks.length}</span>}
                </button>
                <button 
                    onClick={() => setActiveTab('habits')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all duration-300",
                        activeTab === 'habits' ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white" : glassColors.TEXT_MUTED + " hover:text-slate-900 dark:hover:text-slate-200"
                    )}
                >
                    <Target className="w-4 h-4" /> Alışkanlıklar
                </button>
            </div>

            {/* --- GÖREVLER GÖRÜNÜMÜ --- */}
            {activeTab === 'tasks' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Alt Filtreler */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        <button onClick={() => setTaskFilter('pending')} className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm", taskFilter === 'pending' ? "bg-indigo-600 text-white shadow-indigo-500/20" : glassColors.BUTTON_GLASS)}>
                            Yapılacaklar ({pendingTasks.length})
                        </button>
                        <button onClick={() => setTaskFilter('completed')} className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm", taskFilter === 'completed' ? "bg-indigo-600 text-white shadow-indigo-500/20" : glassColors.BUTTON_GLASS)}>
                            Tamamlananlar ({completedTasks.length})
                        </button>
                    </div>

                    <div className="space-y-4">
                        {taskFilter === 'pending' ? (
                            pendingTasks.length > 0 ? (
                                pendingTasks.map((task, index) => (
                                    <div key={task.id} className="transform transition-all hover:-translate-y-1">
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
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
        <aside className="lg:col-span-4 space-y-8">
            
            {/* Desktop Stats */}
            <div className="hidden md:flex flex-col gap-4">
                 <GlassStatCard icon={ListTodo} label="Bekleyen" value={stats.totalPending} color="bg-blue-500 text-white shadow-lg shadow-blue-500/20" />
                 <GlassStatCard icon={Star} label="XP Puanın" value={stats.userXP} color="bg-amber-500 text-white shadow-lg shadow-amber-500/20" />
            </div>

            {/* LEADERBOARD CARD */}
            <div className={cn("rounded-[2rem] shadow-sm overflow-hidden sticky top-32", glassColors.CARD_BG)}>
                <div className="p-6 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2 mb-1.5">
                        <Trophy className="w-6 h-6 text-amber-500" />
                        <h3 className={cn("text-lg font-black text-slate-900 dark:text-white")}>Liderlik Tablosu</h3>
                    </div>
                    <p className={cn("text-sm font-medium", glassColors.TEXT_MUTED)}>En çok XP kazanan üyeler.</p>
                </div>
                
                <ScrollArea className="max-h-[450px]">
                    <div className="p-3 space-y-2">
                        {leaderboard.map((member, index) => (
                            <div key={member.id} className={cn("flex items-center gap-4 p-4 rounded-[1.5rem] transition-colors border border-transparent", glassColors.CARD_HOVER)}>
                                <div className={cn(
                                    "w-10 h-10 flex items-center justify-center font-black rounded-full text-base shadow-sm border",
                                    index === 0 ? "bg-amber-100 text-amber-600 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30" :
                                    index === 1 ? "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-500/30" :
                                    index === 2 ? "bg-orange-100 text-orange-600 border-orange-200 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/30" : 
                                    "bg-slate-50 text-slate-400 border-slate-100 dark:bg-white/5 dark:text-slate-500 dark:border-white/5"
                                )}>
                                    {index + 1}
                                </div>
                                
                                <Avatar className="w-12 h-12 border-2 border-white dark:border-slate-800 shadow-sm">
                                    <AvatarImage src={member.avatar} />
                                    <AvatarFallback style={{backgroundColor: member.color}} className="text-white font-bold text-lg">
                                        {member.name[0].toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>

                                <div className="flex-1 min-w-0">
                                    <p className={cn("font-bold text-base truncate", glassColors.TEXT_MAIN)}>{member.name}</p>
                                    <p className={cn("text-xs font-medium", glassColors.TEXT_MUTED)}>Seviye {member.level}</p>
                                </div>
                                
                                <div className="text-right">
                                    <span className={cn("block font-black text-lg text-amber-500")}>{member.xp.toLocaleString()}</span>
                                    <span className={cn("text-[10px] font-bold uppercase", glassColors.TEXT_MUTED)}>XP</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            <div className="bg-indigo-600 rounded-[2rem] p-8 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden hidden md:block">
                 <div className="relative z-10">
                     <p className="font-black text-2xl mb-2">"Zinciri Kırma!"</p>
                     <p className="text-indigo-100 font-medium opacity-90 leading-relaxed">Her gün yapılan küçük bir adım, yarın büyük bir başarıya dönüşür.</p>
                 </div>
                 <Flame className="absolute -bottom-8 -right-8 w-32 h-32 text-indigo-400 opacity-30 rotate-12" />
            </div>
        </aside>
      </div>

      {/* FAB: MOBİL BUTON */}
      <button 
        onClick={handleOpenNewTask}
        className="fixed bottom-24 right-6 md:hidden z-50 w-16 h-16 bg-indigo-600 text-white rounded-[2rem] shadow-xl shadow-indigo-500/30 flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus className="w-8 h-8" />
      </button>

      {/* FORM SHEET — Mobilde alttan açılan native sheet, masaüstünde ortalı modal */}
      {isFormDialogOpen && (
        <div className="fixed inset-x-0 top-0 bottom-16 sm:inset-0 z-[60] flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setIsFormDialogOpen(false)}
          />

          {/* Sheet / Modal */}
          <div className={cn(
            "relative w-full sm:max-w-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100",
            "flex flex-col overflow-hidden",
            "animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-400 ease-out",
            // Mobile: full-width bottom sheet with top-rounded corners
            "rounded-t-[2.5rem] sm:rounded-[2rem]",
            // Mobile: sheet height adapts to available space above nav, desktop: auto
            "max-h-full sm:max-h-[90vh] sm:shadow-2xl",
          )}>
            {/* Sürükleme çubuğu – sadece mobilde görünür */}
            <div className="flex justify-center pt-4 pb-1 sm:hidden">
              <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>

            {/* Başlık */}
            <div className="flex items-center justify-between px-6 pt-4 pb-4 sm:pt-6 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  {editingTask ? <LayoutGrid className="w-5 h-5 text-white" /> : <Target className="w-5 h-5 text-white" />}
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight">
                    {editingTask ? 'Görevi Düzenle' : 'Yeni Görev'}
                  </h2>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                    {editingTask ? 'Mevcut görevi güncelle' : 'Aile için yeni bir hedef ekle'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormDialogOpen(false)}
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors text-slate-500 dark:text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form içeriği */}
            <div className="overflow-y-auto flex-1 px-6 py-4 overscroll-contain">
              <NewTaskForm 
                familyMembers={familyMembers}
                onTaskProcessed={() => setIsFormDialogOpen(false)}
                taskToEdit={editingTask}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}