"use client";

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { getGoal, updateGoal } from '@/lib/dataService';
import type { Goal, GoalSection } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowLeft, Check, Plus, Lock, PlayCircle, BookOpen, Target, Sparkles, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription as DialogDescriptionComponent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// --- DESIGN SYSTEM ---
const appColors = {
    bg: "bg-slate-50 dark:bg-slate-950",
    headerBg: "bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5",
    textMain: "text-slate-900 dark:text-slate-100",
    textMuted: "text-slate-500 dark:text-slate-400",
    cardBg: "bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 shadow-sm",
    accordionBg: "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-slate-100 dark:border-white/5 transition-all shadow-sm",
    accordionLocked: "opacity-60 bg-slate-100/50 dark:bg-slate-900/30 border-slate-200/50 dark:border-white/5 grayscale-[50%]",
};

const progressFormSchema = z.object({
  progress: z.coerce.number().min(1, "En az 1 birim ilerleme girilmelidir."),
});

const CircularProgress = ({ progress }: { progress: number }) => {
    const radius = 18;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div className="relative w-12 h-12 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r={radius} fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-100 dark:text-slate-800" />
                <circle
                    cx="22"
                    cy="22"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="text-indigo-500 transition-all duration-500 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-slate-700 dark:text-slate-300">
                {progress >= 100 ? <Check className="w-5 h-5 text-emerald-500" /> : `${Math.round(progress)}%`}
            </div>
        </div>
    );
};

export default function GoalDetailClient() {
    const params = useParams();
    const router = useRouter();
    const goalId = params.goalId as string;
    const { user } = useAuth();
    const { toast } = useToast();

    const [goal, setGoal] = React.useState<Goal | null>(null);
    const [editingSection, setEditingSection] = React.useState<GoalSection | null>(null);

    const progressForm = useForm<z.infer<typeof progressFormSchema>>({
        resolver: zodResolver(progressFormSchema),
        defaultValues: { progress: '' as any },
    });

    React.useEffect(() => {
        if (!goalId || !user) return;
        
        const fetchAndSetGoal = async () => {
            const fetchedGoal = await getGoal(goalId);
            setGoal(fetchedGoal);
        };
        fetchAndSetGoal();

    }, [goalId, user]);
    
    const handleProgressSubmit = async (values: z.infer<typeof progressFormSchema>) => {
        if (!goal || !editingSection) return;

        const newCompletedUnits = (editingSection.completedUnits || 0) + values.progress;
        const sectionProgress = Math.min(newCompletedUnits, editingSection.sectionTotalUnits);

        const newSections = goal.sections.map(s => 
            s.id === editingSection.id 
                ? { ...s, completedUnits: sectionProgress } 
                : s
        );
        
        // Recalculate section statuses
        newSections.forEach(section => {
            if ((section.completedUnits || 0) >= section.sectionTotalUnits) {
                section.status = 'completed';
            }
        });

        const isGoalComplete = newSections.every(s => s.status === 'completed');
        const newGoalStatus = isGoalComplete ? 'completed' : 'in-progress';
        
        try {
            await updateGoal(goalId, { sections: newSections, status: newGoalStatus });
            setGoal(prev => prev ? {...prev, sections: newSections, status: newGoalStatus} : null);
            toast({ title: "İlerleme Kaydedildi!", description: `${values.progress} ${goal.unitName} eklendi.` });
            setEditingSection(null);
            progressForm.reset({ progress: '' as any });
        } catch(e) {
            toast({ title: "Hata", variant: 'destructive' });
        }
    };

    if (!goal) {
        return <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500 font-medium">Yükleniyor...</div>;
    }
    
    const sortedSections = [...goal.sections].sort((a,b) => a.order - b.order);
    const isVideoGoal = goal.platform === 'YouTube';
    const totalCompletedUnits = (goal.sections || []).reduce((sum, section) => sum + (section.completedUnits || 0), 0);
    const overallProgress = (goal.totalUnits || 0) > 0 ? (totalCompletedUnits / goal.totalUnits!) * 100 : 0;

    return (
        <div className={cn("min-h-screen pb-24 md:pb-10 font-sans flex flex-col relative", appColors.bg)}>
            
            {/* HEADER */}
            <div className={cn("sticky top-0 z-40 w-full transition-all duration-300", appColors.headerBg)}>
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-4">
                    <Button 
                        onClick={() => router.push('/goals')} 
                        variant="ghost" 
                        size="icon"
                        className="rounded-full bg-slate-100/50 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors shrink-0"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-lg md:text-xl font-black tracking-tight text-slate-900 dark:text-slate-100 truncate">
                            {goal.title}
                        </h1>
                    </div>
                </div>
            </div>
            
            <div className="flex-1 max-w-3xl mx-auto w-full p-4 md:p-6 relative z-10 space-y-6">
                
                {/* Genel İlerleme Kartı */}
                <Card className={cn("rounded-[2rem] border-0 overflow-hidden relative shadow-sm", appColors.cardBg)}>
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                    <CardContent className="p-6 md:p-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                                    <Target className="w-5 h-5" />
                                    <h2 className="text-xl font-black text-slate-900 dark:text-white">Genel İlerleme</h2>
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                                    {isVideoGoal 
                                        ? `Sıradaki: Video ${totalCompletedUnits + 1}` 
                                        : `Sıradaki: ${goal.unitName.charAt(0).toUpperCase() + goal.unitName.slice(1)} ${totalCompletedUnits + 1}`
                                    }
                                </p>
                            </div>
                            <div className="text-right hidden md:block">
                                <span className="text-4xl font-black text-indigo-600 dark:text-indigo-400">{Math.round(overallProgress)}%</span>
                            </div>
                        </div>

                        <div className="mt-8 space-y-2.5">
                            <div className="flex justify-between items-end">
                                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block md:hidden">İlerleme: {Math.round(overallProgress)}%</span>
                                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest hidden md:block">Durum</span>
                                <span className="text-sm font-black text-slate-700 dark:text-slate-300">
                                    {totalCompletedUnits} <span className="text-slate-400 text-xs font-bold mx-0.5">/</span> {goal.totalUnits} <span className="text-xs text-slate-400 ml-0.5 uppercase">{goal.unitName}</span>
                                </span>
                            </div>
                            <div className="h-5 w-full bg-slate-100 dark:bg-slate-900/50 rounded-full overflow-hidden border border-slate-200 dark:border-white/5 shadow-inner">
                                <div 
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700 ease-out rounded-full shadow-[0_0_10px_rgba(99,102,241,0.3)] dark:shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
                                    style={{ width: `${overallProgress}%` }} 
                                />
                            </div>
                        </div>

                        {goal.status !== 'completed' && !isVideoGoal && (
                             <div className="mt-8">
                                <Button 
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-14 font-bold text-base shadow-xl shadow-indigo-500/20 active:scale-[0.98] transition-all" 
                                    onClick={() => {
                                        const firstUncompleted = sortedSections.find(s => s.status !== 'completed') || sortedSections[0];
                                        setEditingSection(firstUncompleted);
                                    }}
                                >
                                    <Plus className="mr-2 h-5 w-5" /> Hızlı İlerleme Ekle
                                </Button>
                             </div>
                        )}
                    </CardContent>
                </Card>

                {/* Bölümler Listesi */}
                <div className="space-y-4 pt-2">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Bölümler ve Hedefler</h3>
                    
                    {isVideoGoal ? (
                        <div className="grid gap-3">
                             {/* Placeholder for video list */}
                        </div>
                    ) : (
                        <Accordion type="multiple" defaultValue={sortedSections.map(s => s.id)} className="space-y-3">
                            {sortedSections.map((section, index) => {
                                const progress = section.sectionTotalUnits > 0 ? ((section.completedUnits || 0) / section.sectionTotalUnits) * 100 : 0;
                                const isUnlocked = index === 0 || (sortedSections[index - 1] && sortedSections[index - 1].status === 'completed');
                                const isCompleted = section.status === 'completed';

                                return (
                                    <AccordionItem 
                                        key={section.id} 
                                        value={section.id} 
                                        className={cn(
                                            "rounded-[1.5rem] border-0 overflow-hidden transition-all duration-300",
                                            isUnlocked ? appColors.accordionBg : appColors.accordionLocked
                                        )}
                                    >
                                        <AccordionTrigger className="px-5 py-4 hover:no-underline group">
                                            <div className="flex items-center gap-4 w-full pr-2">
                                                <div className="shrink-0">
                                                    {isCompleted ? (
                                                        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                                                            <Check className="w-6 h-6" strokeWidth={3} />
                                                        </div>
                                                    ) : isUnlocked ? (
                                                        <CircularProgress progress={progress} />
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800/50 flex items-center justify-center text-slate-400 dark:text-slate-600 border border-slate-300 dark:border-slate-700">
                                                            <Lock className="w-5 h-5" />
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                <div className="flex-grow text-left">
                                                    <h4 className={cn("text-base md:text-lg font-bold transition-colors leading-tight", isCompleted ? "text-emerald-700 dark:text-emerald-400" : appColors.textMain)}>
                                                        {section.title}
                                                    </h4>
                                                    <p className="text-xs md:text-sm text-slate-500 font-semibold mt-1">
                                                        <span className={cn(isCompleted ? "text-emerald-600 dark:text-emerald-300" : "text-slate-700 dark:text-slate-300")}>{section.completedUnits || 0}</span> / {section.sectionTotalUnits} <span className="uppercase text-[10px] ml-0.5">{goal.unitName}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        
                                        <AccordionContent className="px-5 pb-5 pt-0">
                                            <div className="pl-[4.25rem] space-y-5 pr-2">
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                                        <span>Bölüm İlerlemesi</span>
                                                        <span className={isCompleted ? "text-emerald-500" : ""}>{Math.round(progress)}%</span>
                                                    </div>
                                                    <Progress value={progress} className="h-2.5 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5" indicatorClassName={isCompleted ? "bg-emerald-500" : "bg-indigo-500"} />
                                                </div>

                                                {!isCompleted && isUnlocked && (
                                                    <Dialog open={editingSection?.id === section.id} onOpenChange={(open) => {if (!open) { setEditingSection(null); progressForm.reset({ progress: '' as any }); }}}>
                                                        <DialogTrigger asChild>
                                                            <Button size="sm" variant="secondary" className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 h-11 rounded-xl font-bold" onClick={() => setEditingSection(section)}>
                                                                <Plus className="mr-1.5 h-4 w-4" /> İlerleme Ekle
                                                            </Button>
                                                        </DialogTrigger>
                                                        
                                                        {/* BOTTOM SHEET / MODAL */}
                                                        <DialogContent className="bg-white dark:bg-slate-900 border-none sm:border sm:border-slate-200 dark:sm:border-white/10 sm:max-w-md w-full rounded-t-[2rem] sm:rounded-[2rem] p-0 overflow-hidden flex flex-col mt-auto sm:mt-0 h-auto">
                                                            <div className="p-6 border-b border-slate-100 dark:border-white/5 relative">
                                                                <DialogClose className="absolute right-4 top-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 transition-colors">
                                                                    <X className="w-5 h-5" />
                                                                </DialogClose>
                                                                <DialogTitle className="text-xl font-black text-slate-900 dark:text-white">İlerleme Ekle</DialogTitle>
                                                                <DialogDescriptionComponent className="text-slate-500 mt-2 font-medium">
                                                                    <span className="font-bold text-slate-700 dark:text-slate-300">"{section.title}"</span> bölümü için miktar girin.
                                                                </DialogDescriptionComponent>
                                                            </div>
                                                            <Form {...progressForm}>
                                                                <form onSubmit={progressForm.handleSubmit(handleProgressSubmit)} className="p-6 space-y-6">
                                                                    <FormField
                                                                        control={progressForm.control}
                                                                        name="progress"
                                                                        render={({ field }) => (
                                                                            <FormItem>
                                                                                <FormLabel className="text-slate-700 dark:text-slate-300 font-bold">Eklenen Miktar ({goal.unitName})</FormLabel>
                                                                                <FormControl>
                                                                                    <div className="relative">
                                                                                        <Input 
                                                                                            type="number" 
                                                                                            className="bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-xl font-bold h-14 pl-5 rounded-2xl focus:border-indigo-500/50 focus:ring-indigo-500/20" 
                                                                                            autoFocus 
                                                                                            {...field} 
                                                                                        />
                                                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                                                                                            / {section.sectionTotalUnits - (section.completedUnits || 0)}
                                                                                        </div>
                                                                                    </div>
                                                                                </FormControl>
                                                                                <FormMessage className="text-rose-500" />
                                                                            </FormItem>
                                                                        )}
                                                                    />
                                                                    <div className="pt-2">
                                                                        <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-14 rounded-2xl shadow-xl shadow-indigo-500/20 active:scale-[0.98] transition-all">
                                                                            Kaydet
                                                                        </Button>
                                                                    </div>
                                                                </form>
                                                            </Form>
                                                        </DialogContent>
                                                    </Dialog>
                                                )}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                );
                            })}
                        </Accordion>
                    )}
                </div>
            </div>
        </div>
    );
}