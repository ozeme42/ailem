
"use client";

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { onGoalsUpdate, addGoal, deleteGoal, updateGoal } from '@/lib/dataService';
import type { Goal, FamilyMember } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Progress } from '@/components/ui/progress';
import { Plus, Target, Trash2, Edit, Youtube, User, Map, Trophy, ArrowRight, Sparkles } from 'lucide-react';
import { NewGoalForm } from '@/components/new-goal-form';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// --- DESIGN SYSTEM: Themes ---
const glassColors = {
    HEADER_BG: "bg-slate-950/70 backdrop-blur-lg border-b border-white/5",
    BUTTON_GLASS: "bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow-lg",
};

const goalThemes = [
    { 
        id: 'blue',
        bg: 'bg-blue-500/10 border-blue-500/20 hover:border-blue-500/40',
        iconBox: 'bg-blue-500/20 text-blue-400',
        title: 'text-blue-100',
        progress: 'bg-blue-500',
        glow: 'shadow-blue-500/10'
    },
    { 
        id: 'emerald',
        bg: 'bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40',
        iconBox: 'bg-emerald-500/20 text-emerald-400',
        title: 'text-emerald-100',
        progress: 'bg-emerald-500',
        glow: 'shadow-emerald-500/10'
    },
    { 
        id: 'violet',
        bg: 'bg-violet-500/10 border-violet-500/20 hover:border-violet-500/40',
        iconBox: 'bg-violet-500/20 text-violet-400',
        title: 'text-violet-100',
        progress: 'bg-violet-500',
        glow: 'shadow-violet-500/10'
    },
    { 
        id: 'amber',
        bg: 'bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40',
        iconBox: 'bg-amber-500/20 text-amber-400',
        title: 'text-amber-100',
        progress: 'bg-amber-500',
        glow: 'shadow-amber-500/10'
    },
    { 
        id: 'rose',
        bg: 'bg-rose-500/10 border-rose-500/20 hover:border-rose-500/40',
        iconBox: 'bg-rose-500/20 text-rose-400',
        title: 'text-rose-100',
        progress: 'bg-rose-500',
        glow: 'shadow-rose-500/10'
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
                toast({ title: 'Yol Haritası Güncellendi!', description: `"${data.title}" başarıyla güncellendi.` });
            } else {
                await addGoal(data);
                toast({ title: 'Yeni Yol Haritası Oluşturuldu!', description: `"${data.title}" hedefine doğru ilk adımı attın.` });
            }
            setIsFormOpen(false);
            setEditingGoal(null);
        } catch (error) {
            console.error("Goal submission error: ", error)
            toast({ title: 'Hata', description: 'İşlem sırasında bir hata oluştu.', variant: 'destructive' });
        }
    };
    
    const handleDeleteGoal = async (goalId: string) => {
        try {
            await deleteGoal(goalId);
            toast({ title: 'Yol Haritası Silindi', variant: 'destructive' });
        } catch (error) {
            toast({ title: 'Hata', description: 'Hedef silinirken bir sorun oluştu.', variant: 'destructive' });
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
        
        if (totalCompletedUnits >= goal.totalUnits) {
             return "Tüm hedefler tamamlandı!";
        }

        if (isVideoGoal) {
             return `Sıradaki: Video ${totalCompletedUnits + 1}`;
        }
        
        for (const section of goal.sections.sort((a, b) => a.order - b.order)) {
            if (section.status !== 'completed') {
                return `${section.title}`;
            }
        }
        return "Tüm hedefler tamamlandı!";
    };

    const filteredGoals = React.useMemo(() => {
        if (selectedMemberId === 'all') {
            return goals;
        }
        return goals.filter(goal => goal.assigneeId === selectedMemberId);
    }, [goals, selectedMemberId]);


    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden flex flex-col">
            
            {/* FIXED BACKGROUND LAYER */}
            <div className="fixed inset-0 bg-slate-950 -z-50" />
            
            {/* AMBIENT BACKGROUND */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[20%] right-[-5%] w-[400px] h-[400px] bg-indigo-900/20 rounded-full blur-[120px]" />
                <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] bg-blue-900/20 rounded-full blur-[100px]" />
            </div>

            {/* HEADER */}
            <div className={cn("sticky top-0 z-40 w-full transition-all duration-300", glassColors.HEADER_BG)}>
                <div className="max-w-7xl mx-auto px-4 md:px-6">
                    <div className="flex flex-row items-center justify-between py-4 gap-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
                                <Map className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-black tracking-tight text-slate-100 leading-none">
                                    Yol Haritaları
                                </h1>
                                <p className="text-xs font-medium text-slate-400 mt-0.5">Hedefler ve Gelişim</p>
                            </div>
                        </div>

                        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={() => handleOpenDialog(null)} className="rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-500/20 border border-indigo-400/20">
                                    <Plus className="mr-2 h-4 w-4" /> Yeni Hedef
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="w-[100vw] h-[100dvh] md:w-full md:h-auto md:max-w-xl md:max-h-[85vh] p-0 bg-slate-900 border-none md:border md:border-white/10 text-slate-100 md:rounded-3xl flex flex-col">
                                <DialogHeader className="p-4 md:p-6 border-b border-white/10 shrink-0">
                                    <DialogTitle className="text-xl font-bold">
                                        {editingGoal ? 'Yol Haritasını Düzenle' : 'Yeni Yol Haritası Oluştur'}
                                    </DialogTitle>
                                    <DialogDescription className="text-slate-400">
                                        {editingGoal ? 'Mevcut yol haritasının ayrıntılarını değiştir.' : 'Yeni bir kitap veya video hedefi belirle.'}
                                    </DialogDescription>
                                </DialogHeader>
                                <NewGoalForm
                                    formId="goal-form"
                                    familyMembers={familyMembers}
                                    onCreate={handleFormSubmit}
                                    initialData={editingGoal}
                                />
                                <DialogFooter className="p-4 md:p-6 border-t border-white/5 bg-slate-900/80 backdrop-blur-md shrink-0 safe-area-pb">
                                     <DialogClose asChild>
                                        <Button type="button" variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/5">İptal</Button>
                                    </DialogClose>
                                    <Button type="submit" form="goal-form" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-11 rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95">
                                        {editingGoal ? "Değişiklikleri Kaydet" : "Hedefi Oluştur"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>
            
            <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 relative z-10">
                
                {/* Member Tabs */}
                <div className="flex items-center gap-3 overflow-x-auto pb-6 scrollbar-hide">
                    <button
                        onClick={() => setSelectedMemberId('all')}
                        className={cn(
                            "relative flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 border select-none shrink-0",
                            selectedMemberId === 'all'
                                ? "bg-white/10 border-white/20 shadow-lg shadow-indigo-500/10 text-white" 
                                : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/5 text-slate-400 hover:text-slate-200"
                        )}
                    >
                        <span className="text-sm font-bold">Tümü</span>
                        {selectedMemberId === 'all' && (
                            <div className="absolute inset-x-0 -bottom-2 mx-auto w-1 h-1 rounded-full bg-indigo-400 shadow-[0_0_10px_currentColor]" />
                        )}
                    </button>

                    {familyMembers.map((member) => {
                        const isSelected = selectedMemberId === member.id;
                        return (
                            <button
                                key={member.id}
                                onClick={() => setSelectedMemberId(member.id)}
                                className={cn(
                                    "relative flex items-center gap-2 px-1 pr-4 py-1 rounded-full transition-all duration-300 border select-none shrink-0",
                                    isSelected 
                                        ? "bg-white/10 border-white/20 shadow-lg shadow-indigo-500/10" 
                                        : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/5 opacity-60 hover:opacity-100"
                                )}
                            >
                                <div 
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md ring-2 ring-white/10" 
                                    style={{ backgroundColor: member.color }}
                                >
                                    {member.name.charAt(0).toUpperCase()}
                                </div>
                                <span className={cn("text-sm font-bold", isSelected ? "text-white" : "text-slate-400")}>
                                    {member.name}
                                </span>
                                {isSelected && (
                                    <div className="absolute inset-x-0 -bottom-2 mx-auto w-1 h-1 rounded-full bg-indigo-400 shadow-[0_0_10px_currentColor]" />
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredGoals.length > 0 ? (
                        filteredGoals.map((goal, index) => {
                            const progress = calculateOverallProgress(goal);
                            const assignee = familyMembers.find(m => m.id === goal.assigneeId);
                            const isVideoGoal = goal.platform === 'YouTube';
                            const totalCompletedUnits = goal.sections.reduce((acc, section) => acc + (section.completedUnits || 0), 0);
                            const totalSections = goal.sections.length;
                            const completedSections = goal.sections.filter(s => s.status === 'completed').length;
                            
                            // Select Theme
                            const theme = goalThemes[index % goalThemes.length];

                            return (
                                <div 
                                    key={goal.id} 
                                    className={cn(
                                        "group relative flex flex-col h-full rounded-[2rem] overflow-hidden border backdrop-blur-md transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl",
                                        theme.bg, theme.glow
                                    )}
                                >
                                    <Link href={`/goals/${goal.id}`} className="flex flex-col h-full p-6 relative z-10">
                                        
                                        {/* Header */}
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("p-2.5 rounded-xl", theme.iconBox)}>
                                                    {isVideoGoal ? <Youtube className="w-5 h-5" /> : <Target className="w-5 h-5" />}
                                                </div>
                                                {assignee && (
                                                    <div 
                                                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ring-2 ring-white/10" 
                                                        style={{ backgroundColor: assignee.color }}
                                                        title={assignee.name}
                                                    >
                                                        {assignee.name.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Actions (Hover) */}
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 rounded-full hover:bg-white/10 text-slate-300 hover:text-white" 
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleOpenDialog(goal); }}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 rounded-full hover:bg-rose-500/20 text-slate-300 hover:text-rose-400" 
                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="bg-slate-900 border-white/10 text-slate-100" onClick={(e) => e.stopPropagation()}>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                                            <AlertDialogDescription className="text-slate-400">"{goal.title}" yol haritasını kalıcı olarak silmek istediğinizden emin misiniz?</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-200">İptal</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteGoal(goal.id)} className="bg-rose-600 hover:bg-rose-700">Evet, Sil</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="mb-6 flex-grow">
                                            <h3 className={cn("text-xl font-bold mb-1 line-clamp-1", theme.title)}>{goal.title}</h3>
                                            <p className="text-sm text-slate-400 line-clamp-2 min-h-[2.5rem]">{goal.description}</p>
                                        </div>

                                        {/* Stats Grid */}
                                        <div className="bg-slate-950/30 rounded-2xl p-4 mb-4 border border-white/5">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Sparkles className="w-4 h-4 text-amber-400" />
                                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Sıradaki Adım</span>
                                            </div>
                                            <p className="text-sm font-semibold text-slate-200 line-clamp-1">{getNextStepTitle(goal)}</p>
                                        </div>

                                        {/* Progress */}
                                        <div className="mt-auto">
                                            <div className="flex justify-between items-end mb-2">
                                                <div>
                                                    <span className="text-xs text-slate-500 font-medium">Toplam İlerleme</span>
                                                    <div className="text-lg font-black text-white">{Math.round(progress)}%</div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xs text-slate-500 font-medium block">Detay</span>
                                                    <span className="text-xs font-bold text-slate-300">
                                                        {isVideoGoal 
                                                            ? `${totalCompletedUnits}/${goal.totalUnits} Video` 
                                                            : `${completedSections}/${totalSections} Bölüm`
                                                        }
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="h-3 w-full bg-slate-900/50 rounded-full overflow-hidden border border-white/5">
                                                <div 
                                                    className={cn("h-full rounded-full transition-all duration-500", theme.progress)} 
                                                    style={{ width: `${progress}%` }} 
                                                />
                                            </div>
                                        </div>
                                    </Link>
                                </div>
                            )
                        })
                    ) : (
                        <div className="md:col-span-2 lg:col-span-3 flex flex-col items-center justify-center py-20 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
                            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                <Trophy className="w-10 h-10 text-slate-500" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-200">Yol Haritası Yok</h3>
                            <p className="text-slate-400 mt-2 max-w-xs text-center">Bu filtreye uygun bir hedef bulunamadı. Yeni bir hedef ekleyerek başlayın.</p>
                            <Button onClick={() => handleOpenDialog(null)} className="mt-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white">
                                <Plus className="mr-2 h-4 w-4" /> İlk Hedefi Oluştur
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
