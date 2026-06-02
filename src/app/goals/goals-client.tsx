"use client";

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { onGoalsUpdate, addGoal, deleteGoal, updateGoal } from '@/lib/dataService';
import type { Goal, FamilyMember } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Plus, Target, Trash2, Edit, Youtube, Map, Trophy, Sparkles, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { NewGoalForm } from '@/components/new-goal-form';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// --- APP COLORS ---
const appColors = {
    bg: "bg-slate-50 dark:bg-slate-950",
    headerBg: "bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5",
    textMain: "text-slate-900 dark:text-slate-100",
    textMuted: "text-slate-500 dark:text-slate-400",
};

const goalThemes = [
    { 
        id: 'blue',
        bg: 'bg-white dark:bg-blue-950/10 border-slate-100 dark:border-blue-900/30 hover:border-blue-200 dark:hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/5',
        iconBox: 'bg-blue-50 text-blue-500 dark:bg-blue-500/20 dark:text-blue-400',
        title: 'text-slate-800 dark:text-blue-100',
        desc: 'text-slate-500 dark:text-blue-200/60',
        progressBg: 'bg-slate-100 dark:bg-blue-950/50',
        progress: 'bg-blue-500',
    },
    { 
        id: 'emerald',
        bg: 'bg-white dark:bg-emerald-950/10 border-slate-100 dark:border-emerald-900/30 hover:border-emerald-200 dark:hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/5',
        iconBox: 'bg-emerald-50 text-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-400',
        title: 'text-slate-800 dark:text-emerald-100',
        desc: 'text-slate-500 dark:text-emerald-200/60',
        progressBg: 'bg-slate-100 dark:bg-emerald-950/50',
        progress: 'bg-emerald-500',
    },
    { 
        id: 'violet',
        bg: 'bg-white dark:bg-violet-950/10 border-slate-100 dark:border-violet-900/30 hover:border-violet-200 dark:hover:border-violet-500/50 hover:shadow-xl hover:shadow-violet-500/5',
        iconBox: 'bg-violet-50 text-violet-500 dark:bg-violet-500/20 dark:text-violet-400',
        title: 'text-slate-800 dark:text-violet-100',
        desc: 'text-slate-500 dark:text-violet-200/60',
        progressBg: 'bg-slate-100 dark:bg-violet-950/50',
        progress: 'bg-violet-500',
    },
    { 
        id: 'amber',
        bg: 'bg-white dark:bg-amber-950/10 border-slate-100 dark:border-amber-900/30 hover:border-amber-200 dark:hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/5',
        iconBox: 'bg-amber-50 text-amber-500 dark:bg-amber-500/20 dark:text-amber-400',
        title: 'text-slate-800 dark:text-amber-100',
        desc: 'text-slate-500 dark:text-amber-200/60',
        progressBg: 'bg-slate-100 dark:bg-amber-950/50',
        progress: 'bg-amber-500',
    },
    { 
        id: 'rose',
        bg: 'bg-white dark:bg-rose-950/10 border-slate-100 dark:border-rose-900/30 hover:border-rose-200 dark:hover:border-rose-500/50 hover:shadow-xl hover:shadow-rose-500/5',
        iconBox: 'bg-rose-50 text-rose-500 dark:bg-rose-500/20 dark:text-rose-400',
        title: 'text-slate-800 dark:text-rose-100',
        desc: 'text-slate-500 dark:text-rose-200/60',
        progressBg: 'bg-slate-100 dark:bg-rose-950/50',
        progress: 'bg-rose-500',
    },
];

export default function GoalsClient() {
    const { user, familyMembers } = useAuth();
    const [goals, setGoals] = React.useState<Goal[]>([]);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingGoal, setEditingGoal] = React.useState<Goal | null>(null);
    const [selectedMemberId, setSelectedMemberId] = React.useState<string | 'all'>('all');
    const { toast } = useToast();

    React.useEffect(() => {
        if (!user) return;
        const unsubscribe = onGoalsUpdate(setGoals);
        return () => unsubscribe();
    }, [user]);

    const handleOpenDialog = (goal: Goal | null) => {
        setEditingGoal(goal);
        setIsFormOpen(true);
    };

    const handleFormSubmit = async (data: Omit<Goal, 'id' | 'familyId' | 'createdAt' | 'status'>) => {
        try {
            if (editingGoal) {
                await updateGoal(editingGoal.id, data);
                toast({ title: 'Güncellendi!', description: `"${data.title}" başarıyla güncellendi.` });
            } else {
                await addGoal(data);
                toast({ title: 'Oluşturuldu!', description: `"${data.title}" eklendi.` });
            }
            setIsFormOpen(false);
            setEditingGoal(null);
        } catch (error) {
            toast({ title: 'Hata', variant: 'destructive' });
        }
    };
    
    const handleDeleteGoal = async (goalId: string) => {
        try {
            await deleteGoal(goalId);
            toast({ title: 'Yol Haritası Silindi', variant: 'destructive' });
        } catch (error) {
            toast({ title: 'Hata', variant: 'destructive' });
        }
    };

    const calculateOverallProgress = (goal: Goal) => {
        if (!goal.totalUnits || goal.totalUnits === 0) return 0;
        const totalCompletedUnits = goal.sections.reduce((acc, section) => acc + (section.completedUnits || 0), 0);
        return (totalCompletedUnits / goal.totalUnits) * 100;
    };
    
    const getNextStepTitle = (goal: Goal) => {
        const isVideoGoal = goal.platform === 'YouTube';
        const totalCompletedUnits = goal.sections.reduce((acc, section) => acc + (section.completedUnits || 0), 0);
        
        if (totalCompletedUnits >= goal.totalUnits) return "Tüm hedefler tamamlandı!";
        if (isVideoGoal) return `Sıradaki: Video ${totalCompletedUnits + 1}`;
        
        for (const section of goal.sections.sort((a, b) => a.order - b.order)) {
            if (section.status !== 'completed') return `${section.title}`;
        }
        return "Tüm hedefler tamamlandı!";
    };

    const filteredGoals = React.useMemo(() => {
        if (selectedMemberId === 'all') return goals;
        return goals.filter(goal => goal.assigneeId === selectedMemberId);
    }, [goals, selectedMemberId]);


    return (
        <div className={cn("min-h-screen pb-24 md:pb-10 font-sans flex flex-col", appColors.bg)}>
            
            {/* HEADER */}
            <div className={cn("sticky top-0 z-40 w-full", appColors.headerBg)}>
                <div className="max-w-7xl mx-auto px-4 py-3 md:py-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-2xl shadow-sm text-white">
                                <Map className="w-5 h-5 md:w-6 md:h-6" />
                            </div>
                            <div>
                                <h1 className={cn("text-lg md:text-xl font-black tracking-tight leading-none", appColors.textMain)}>
                                    Yol Haritaları
                                </h1>
                                <p className={cn("text-[10px] md:text-xs font-bold uppercase tracking-wider mt-1", appColors.textMuted)}>
                                    Hedefler ve Gelişim
                                </p>
                            </div>
                        </div>

                        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={() => handleOpenDialog(null)} className="rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-500/20">
                                    <Plus className="md:mr-2 h-5 w-5 md:h-4 md:w-4" />
                                    <span className="hidden md:inline">Yeni Hedef</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="w-[100vw] h-[100dvh] md:w-full md:h-auto md:max-w-xl md:max-h-[85vh] p-0 bg-white dark:bg-slate-900 border-none md:border md:border-slate-200 dark:md:border-white/10 text-slate-900 dark:text-slate-100 md:rounded-[2rem] flex flex-col overflow-hidden">
                                <DialogHeader className="p-4 md:p-6 border-b border-slate-100 dark:border-white/10 shrink-0">
                                    <DialogTitle className="text-xl font-black">
                                        {editingGoal ? 'Haritayı Düzenle' : 'Yeni Harita Oluştur'}
                                    </DialogTitle>
                                </DialogHeader>
                                <NewGoalForm
                                    formId="goal-form"
                                    familyMembers={familyMembers}
                                    onCreate={handleFormSubmit}
                                    initialData={editingGoal}
                                />
                                <DialogFooter className="p-4 md:p-6 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-900/80 backdrop-blur-md shrink-0 safe-area-pb">
                                     <DialogClose asChild>
                                        <Button type="button" variant="ghost" className="text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/5 rounded-xl">İptal</Button>
                                    </DialogClose>
                                    <Button type="submit" form="goal-form" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-11 rounded-xl shadow-md shadow-indigo-500/20 active:scale-95">
                                        {editingGoal ? "Kaydet" : "Oluştur"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* STORY-LIKE AVATARS */}
                    <div className="flex items-center gap-4 mt-5 overflow-x-auto scrollbar-hide pb-2">
                        {/* "Tümü" Avatar */}
                        <div className="flex flex-col items-center gap-1.5 cursor-pointer" onClick={() => setSelectedMemberId('all')}>
                            <div className={cn(
                                "w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center shadow-sm transition-all duration-300",
                                selectedMemberId === 'all' 
                                    ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 ring-[3px] ring-offset-[3px] ring-indigo-500 dark:ring-offset-slate-950 scale-105" 
                                    : "bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 opacity-80 scale-95 hover:scale-100"
                            )}>
                                <Map className="w-6 h-6" />
                            </div>
                            <span className={cn("text-[11px] font-bold truncate w-16 text-center", selectedMemberId === 'all' ? appColors.textMain : appColors.textMuted)}>
                                Tümü
                            </span>
                        </div>

                        {familyMembers.map((member) => {
                            const isSelected = selectedMemberId === member.id;
                            return (
                                <div key={member.id} className="flex flex-col items-center gap-1.5 cursor-pointer" onClick={() => setSelectedMemberId(member.id)}>
                                    <div className={cn(
                                        "w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center text-xl font-black text-white shadow-sm transition-all duration-300",
                                        isSelected ? "ring-[3px] ring-offset-[3px] ring-indigo-500 dark:ring-offset-slate-950 scale-105" : "opacity-80 scale-95 hover:scale-100"
                                    )} style={{ backgroundColor: member.color }}>
                                        {member.name.charAt(0)}
                                    </div>
                                    <span className={cn("text-[11px] font-bold truncate w-16 text-center", isSelected ? appColors.textMain : appColors.textMuted)}>
                                        {member.name.split(' ')[0]}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            
            {/* CONTENT AREA */}
            <div className="flex-1 max-w-7xl mx-auto w-full px-4 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
                    {filteredGoals.length > 0 ? (
                        filteredGoals.map((goal, index) => {
                            const progress = calculateOverallProgress(goal);
                            const assignee = familyMembers.find(m => m.id === goal.assigneeId);
                            const isVideoGoal = goal.platform === 'YouTube';
                            const totalCompletedUnits = goal.sections.reduce((acc, section) => acc + (section.completedUnits || 0), 0);
                            const totalSections = goal.sections.length;
                            const completedSections = goal.sections.filter(s => s.status === 'completed').length;
                            
                            const theme = goalThemes[index % goalThemes.length];

                            return (
                                <div 
                                    key={goal.id} 
                                    className={cn(
                                        "group relative flex flex-col h-full rounded-[2rem] overflow-hidden border transition-all duration-300 hover:-translate-y-1 active:scale-[0.98]",
                                        theme.bg
                                    )}
                                >
                                    <Link href={`/goals/${goal.id}`} className="flex flex-col h-full p-6 relative z-10">
                                        
                                        {/* Header */}
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("p-3 rounded-[1rem]", theme.iconBox)}>
                                                    {isVideoGoal ? <Youtube className="w-6 h-6" /> : <Target className="w-6 h-6" />}
                                                </div>
                                                {assignee && (
                                                    <div 
                                                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white shadow-sm ring-4 ring-white dark:ring-slate-900" 
                                                        style={{ backgroundColor: assignee.color }}
                                                        title={assignee.name}
                                                    >
                                                        {assignee.name.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Actions (Dropdown Menu) */}
                                            <div onClick={(e) => e.preventDefault()}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                                            <MoreVertical className="w-5 h-5" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="rounded-xl border-slate-100 dark:border-slate-800">
                                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenDialog(goal); }} className="cursor-pointer">
                                                            <Edit className="w-4 h-4 mr-2" /> Düzenle
                                                        </DropdownMenuItem>
                                                        
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer text-rose-500 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/30">
                                                                    <Trash2 className="w-4 h-4 mr-2" /> Sil
                                                                </DropdownMenuItem>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent className="rounded-3xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle className="text-slate-900 dark:text-white">Silmek İstediğinize Emin Misiniz?</AlertDialogTitle>
                                                                    <AlertDialogDescription className="text-slate-500">"{goal.title}" yol haritası kalıcı olarak silinecek.</AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">İptal</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleDeleteGoal(goal.id)} className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white">Evet, Sil</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="mb-6 flex-grow">
                                            <h3 className={cn("text-xl font-black mb-1 line-clamp-1", theme.title)}>{goal.title}</h3>
                                            <p className={cn("text-sm line-clamp-2 min-h-[2.5rem] font-medium leading-relaxed", theme.desc)}>{goal.description}</p>
                                        </div>

                                        {/* Next Step Banner */}
                                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-[1rem] p-3 mb-5 border border-slate-100 dark:border-white/5 flex items-center gap-3">
                                            <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
                                            <div className="min-w-0">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Sıradaki</span>
                                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 line-clamp-1">{getNextStepTitle(goal)}</p>
                                            </div>
                                        </div>

                                        {/* Progress Capsule */}
                                        <div className="mt-auto">
                                            <div className="flex justify-between items-end mb-2">
                                                <div>
                                                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block mb-0.5">İlerleme</span>
                                                    <div className="text-2xl font-black text-slate-800 dark:text-white leading-none">{Math.round(progress)}%</div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block mb-0.5">Detay</span>
                                                    <span className="text-sm font-black text-slate-600 dark:text-slate-300">
                                                        {isVideoGoal 
                                                            ? `${totalCompletedUnits}/${goal.totalUnits}` 
                                                            : `${completedSections}/${totalSections}`
                                                        } <span className="text-xs font-bold text-slate-400 ml-0.5 uppercase">{isVideoGoal ? 'Video' : 'Bölüm'}</span>
                                                    </span>
                                                </div>
                                            </div>
                                            <div className={cn("h-4 w-full rounded-full overflow-hidden border border-white/10 shadow-inner", theme.progressBg)}>
                                                <div 
                                                    className={cn("h-full rounded-full transition-all duration-700 ease-out", theme.progress)} 
                                                    style={{ width: `${progress}%` }} 
                                                />
                                            </div>
                                        </div>
                                    </Link>
                                </div>
                            )
                        })
                    ) : (
                        <div className="md:col-span-2 lg:col-span-3 flex flex-col items-center justify-center py-20 px-4 bg-slate-100/50 dark:bg-slate-900/50 rounded-[3rem] border border-dashed border-slate-300 dark:border-slate-800 text-center">
                            <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mb-5 shadow-sm">
                                <Trophy className="w-10 h-10 text-slate-400" />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 dark:text-slate-200">Hedef Bulunamadı</h3>
                            <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-sm font-medium">Bu filtreye uygun bir hedef görünmüyor. Kendine yeni hedefler belirleyerek başlayabilirsin.</p>
                            <Button onClick={() => handleOpenDialog(null)} className="mt-8 rounded-full h-12 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xl shadow-indigo-500/20 active:scale-95 transition-all">
                                <Plus className="mr-2 h-5 w-5" /> İlk Hedefi Oluştur
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
