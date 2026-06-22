"use client";

import * as React from "react";
import { subDays, isSameDay, startOfDay, format } from "date-fns";
import { tr } from "date-fns/locale";
import { Flame, Check, MoreHorizontal, Edit, Trash2, CalendarDays, TrendingUp, Trophy } from "lucide-react";

import { Task } from "@/lib/data";
import { cn } from "@/lib/utils";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

const glassColors = {
    CARD_BG: "bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm",
    CARD_HOVER: "hover:bg-slate-50 dark:hover:bg-white/5",
    TEXT_MAIN: "text-slate-900 dark:text-slate-100",
    TEXT_MUTED: "text-slate-500 dark:text-slate-400",
};

interface HabitTrackerCardProps {
  task: Task;
  assignee?: { name: string; avatar?: string; color?: string };
  onToggleDay: (day: Date, isCompleted: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  colorClass?: string;
}

export const HabitTrackerCard = React.forwardRef<HTMLDivElement, HabitTrackerCardProps>(({ 
  task, 
  assignee, 
  onToggleDay, 
  onEdit, 
  onDelete,
  colorClass 
}, ref) => {
  const [isStatsOpen, setIsStatsOpen] = React.useState(false);

  // 1. Dört günlük geçmişi hesapla (Listede göstermek için)
  const recentDays = React.useMemo(() => {
    return Array.from({ length: 4 }).map((_, i) => {
      const d = subDays(new Date(), 3 - i);
      return startOfDay(d);
    });
  }, []);

  const isDayCompleted = (day: Date) => {
    return task.completedDates?.some(d => isSameDay(new Date(d), day));
  };

  // 2. İstatistikleri hesapla
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

  const bestStreak = React.useMemo(() => {
     let best = task.bestStreak || 0;
     if (currentStreak > best) best = currentStreak;
     return best;
  }, [currentStreak, task.bestStreak]);

  const totalCompletions = task.completedDates?.length || 0;
  
  // Basit Skor (Son 30 güne göre)
  const score = React.useMemo(() => {
      const thirtyDaysAgo = subDays(new Date(), 30);
      const completionsLast30Days = task.completedDates?.filter(d => new Date(d) >= thirtyDaysAgo).length || 0;
      return Math.round((completionsLast30Days / 30) * 100);
  }, [task.completedDates]);

  return (
    <>
        {/* LİSTE ÖĞESİ GÖRÜNÜMÜ */}
        <div ref={ref} className={cn("group flex items-center justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all duration-300 relative overflow-hidden cursor-pointer", glassColors.CARD_BG, glassColors.CARD_HOVER)} onClick={() => setIsStatsOpen(true)}>
            <div className={cn("absolute left-0 top-0 bottom-0 w-1 sm:w-1.5 opacity-60", colorClass?.split(' ')[0] || "bg-indigo-500")} />
            
            <div className="flex flex-col flex-1 min-w-0 pl-1 sm:pl-2">
                <h4 className={cn("font-bold truncate text-sm sm:text-base", glassColors.TEXT_MAIN)}>{task.title}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                    {assignee && (
                        <div className="flex items-center gap-1 opacity-70">
                            <span className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: assignee.color || '#ccc'}} />
                            <span className="text-[10px] sm:text-xs font-medium dark:text-slate-400">{assignee.name}</span>
                        </div>
                    )}
                    {currentStreak > 0 && (
                        <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-700 dark:bg-orange-600/30 dark:text-orange-400 flex items-center gap-1">
                            🔥 {currentStreak}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 ml-4" onClick={(e) => e.stopPropagation()}>
                {recentDays.map((day) => {
                    const completed = isDayCompleted(day);
                    const isTodayDate = isSameDay(day, new Date());
                    
                    return (
                        <div key={day.toISOString()} className="flex flex-col items-center gap-1">
                            <span className={cn("text-[8px] sm:text-[9px] font-bold uppercase", isTodayDate ? "text-indigo-500" : glassColors.TEXT_MUTED)}>
                                {format(day, 'E', { locale: tr }).slice(0, 1)}
                            </span>
                            <button
                                onClick={() => onToggleDay(day, !completed)}
                                className={cn(
                                    "w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                                    completed 
                                        ? "bg-emerald-500 border-emerald-500 text-white scale-110 shadow-sm" 
                                        : "bg-transparent border-slate-200 hover:border-emerald-300 dark:border-white/10 dark:hover:border-emerald-500/50",
                                    isTodayDate && !completed && "ring-2 ring-offset-1 ring-emerald-500/30 border-emerald-400 dark:ring-offset-slate-900"
                                )}
                            >
                                <Check className={cn("w-3 h-3 sm:w-4 sm:h-4 stroke-[3]", completed ? "opacity-100" : "opacity-0")} /> 
                            </button>
                        </div>
                    )
                })}
            </div>
        </div>

        {/* DETAYLI İSTATİSTİK MODALI */}
        <Dialog open={isStatsOpen} onOpenChange={setIsStatsOpen}>
            <DialogContent aria-describedby={undefined} className="sm:max-w-md bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/10 p-0 overflow-hidden rounded-[2rem] shadow-2xl">
                <div className="p-6 pb-4 border-b border-slate-200 dark:border-white/10">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <DialogTitle className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{task.title}</DialogTitle>
                            {assignee && (
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1">
                                    <span className="w-2 h-2 rounded-full" style={{backgroundColor: assignee.color || '#ccc'}} />
                                    {assignee.name}
                                </p>
                            )}
                        </div>
                        
                        {/* Actions Menu */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-200 dark:hover:bg-white/10">
                                    <MoreHorizontal className="h-5 w-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl">
                                <DropdownMenuItem onClick={() => { setIsStatsOpen(false); onEdit(); }} className="cursor-pointer">
                                    <Edit className="mr-2 h-4 w-4" /> Düzenle
                                </DropdownMenuItem>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-rose-600 cursor-pointer">
                                            <Trash2 className="mr-2 h-4 w-4" /> Sil
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="rounded-[2rem]">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Emin misin?</AlertDialogTitle>
                                            <AlertDialogDescription>Bu alışkanlığı ve tüm istatistiklerini silmek üzeresin.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel className="rounded-xl">Vazgeç</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => { setIsStatsOpen(false); onDelete(); }} className="rounded-xl bg-rose-600 hover:bg-rose-700">Sil</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    
                    {/* Score & Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 mt-6">
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm flex flex-col items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-indigo-500 mb-2" />
                            <span className="text-3xl font-black text-slate-900 dark:text-white">{score}%</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">Alışkanlık Skoru</span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm flex flex-col items-center justify-center">
                            <Flame className="w-5 h-5 text-orange-500 mb-2" />
                            <span className="text-3xl font-black text-slate-900 dark:text-white">{currentStreak}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">Mevcut Seri</span>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mt-3">
                         <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-white/5 flex items-center gap-3">
                             <div className="bg-amber-100 dark:bg-amber-500/20 p-2 rounded-lg text-amber-600 dark:text-amber-400">
                                 <Trophy className="w-4 h-4" />
                             </div>
                             <div>
                                 <p className="text-[10px] font-bold text-slate-500">En İyi Seri</p>
                                 <p className="text-sm font-black">{bestStreak} gün</p>
                             </div>
                         </div>
                         <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-white/5 flex items-center gap-3">
                             <div className="bg-emerald-100 dark:bg-emerald-500/20 p-2 rounded-lg text-emerald-600 dark:text-emerald-400">
                                 <Check className="w-4 h-4" />
                             </div>
                             <div>
                                 <p className="text-[10px] font-bold text-slate-500">Toplam</p>
                                 <p className="text-sm font-black">{totalCompletions} kez</p>
                             </div>
                         </div>
                    </div>
                </div>

                {/* History Calendar */}
                <div className="p-6">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                        <CalendarDays className="w-4 h-4 text-slate-400" />
                        Tarihçe (Son 28 Gün)
                    </h3>
                    
                    {/* 28 Günlük Grid Takvimi */}
                    <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                        {Array.from({ length: 28 }).map((_, i) => {
                            const d = subDays(new Date(), 27 - i);
                            const completed = isDayCompleted(d);
                            const isToday = isSameDay(d, new Date());
                            return (
                                <div key={d.toISOString()} className="flex flex-col items-center">
                                    {i < 7 && (
                                        <span className="text-[8px] font-bold text-slate-400 mb-1">
                                            {format(d, 'EE', { locale: tr }).slice(0,1)}
                                        </span>
                                    )}
                                    <div 
                                        className={cn(
                                            "w-full aspect-square rounded-md sm:rounded-lg flex items-center justify-center transition-all cursor-pointer",
                                            completed 
                                                ? "bg-emerald-500 text-white shadow-sm" 
                                                : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700",
                                            isToday && !completed && "border-2 border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10"
                                        )}
                                        onClick={() => onToggleDay(d, !completed)}
                                    >
                                        {completed && <Check className="w-3 h-3 stroke-[4]" />}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    </>
  );
});
HabitTrackerCard.displayName = 'HabitTrackerCard';
