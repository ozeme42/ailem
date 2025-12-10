"use client";

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { getGoal, updateGoal } from '@/lib/dataService';
import type { Goal, GoalSection } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowLeft, Check, Plus, Lock, PlayCircle, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription as DialogDescriptionComponent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// --- DESIGN SYSTEM ---
const glassColors = {
    HEADER_BG: "bg-slate-950/70 backdrop-blur-lg border-b border-white/5",
    CARD_BG: "bg-white/5 border border-white/10 shadow-lg backdrop-blur-md",
    ACCORDION_BG: "bg-white/5 hover:bg-white/10 border border-white/5 transition-all",
    ACCORDION_LOCKED: "opacity-50 bg-slate-900/50 border-white/5 grayscale",
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
                <circle cx="22" cy="22" r={radius} fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-800" />
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
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                {progress >= 100 ? <Check className="w-5 h-5 text-emerald-400" /> : `${Math.round(progress)}%`}
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
        return <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400">Yükleniyor...</div>;
    }
    
    const sortedSections = [...goal.sections].sort((a,b) => a.order - b.order);

    const isVideoGoal = goal.platform === 'YouTube';
    const totalCompletedUnits = (goal.sections || []).reduce((sum, section) => sum + (section.completedUnits || 0), 0);
    const overallProgress = (goal.totalUnits || 0) > 0 ? (totalCompletedUnits / goal.totalUnits!) * 100 : 0;


    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden flex flex-col">
            
            {/* FIXED BACKGROUND */}
            <div className="fixed inset-0 bg-slate-950 -z-50" />
            
            {/* AMBIENT BACKGROUND */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[10%] left-[-5%] w-[400px] h-[400px] bg-purple-900/20 rounded-full blur-[120px]" />
            </div>

            {/* HEADER */}
            <div className={cn("sticky top-0 z-40 w-full transition-all duration-300", glassColors.HEADER_BG)}>
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-4">
                    <Button 
                        onClick={() => router.push('/goals')} 
                        variant="ghost" 
                        size="icon"
                        className="rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <h1 className="text-lg font-bold tracking-tight text-slate-100 truncate flex-1">
                        {goal.title}
                    </h1>
                </div>
            </div>
            
            <div className="flex-1 max-w-3xl mx-auto w-full p-4 md:p-6 relative z-10 space-y-6">
                
                {/* Genel İlerleme Kartı */}
                <Card className={cn("rounded-3xl border-0 overflow-hidden", glassColors.CARD_BG)}>
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                    <CardContent className="p-6 md:p-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-1">
                                <h2 className="text-xl font-bold text-white">Genel İlerleme</h2>
                                <p className="text-slate-400 text-sm font-medium">
                                    {isVideoGoal 
                                        ? `Sıradaki: Video ${totalCompletedUnits + 1}` 
                                        : `Sıradaki: ${goal.unitName.charAt(0).toUpperCase() + goal.unitName.slice(1)} ${totalCompletedUnits + 1}`
                                    }
                                </p>
                            </div>
                            <div className="text-right hidden md:block">
                                <span className="text-3xl font-black text-indigo-400">{Math.round(overallProgress)}%</span>
                            </div>
                        </div>

                        <div className="mt-6 space-y-2">
                            <div className="flex justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                <span>İlerleme</span>
                                <span>{totalCompletedUnits} / {goal.totalUnits} {goal.unitName}</span>
                            </div>
                            <div className="h-4 w-full bg-slate-900/50 rounded-full overflow-hidden border border-white/5">
                                <div 
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700 ease-out rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
                                    style={{ width: `${overallProgress}%` }} 
                                />
                            </div>
                        </div>

                        {goal.status !== 'completed' && !isVideoGoal && (
                             <div className="mt-6">
                                <Dialog open={!!editingSection} onOpenChange={(open) => {if (!open) { setEditingSection(null); progressForm.reset({ progress: '' as any }); }}}>
                                    <DialogTrigger asChild>
                                        <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-12 font-semibold shadow-lg shadow-indigo-500/20" onClick={() => setEditingSection(goal.sections[0])}>
                                            <Plus className="mr-2 h-5 w-5" /> Hızlı İlerleme Ekle
                                        </Button>
                                    </DialogTrigger>
                                    {/* Dialog Content (Aşağıda tanımlı, tekrarı önlemek için burada sadece tetikleyici) */}
                                </Dialog>
                             </div>
                        )}
                    </CardContent>
                </Card>

                {/* Bölümler Listesi */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest pl-2">Bölümler</h3>
                    
                    {isVideoGoal ? (
                        <div className="grid gap-3">
                             {/* YouTube tarzı liste görünümü eklenebilir, şimdilik accordion ile devam */}
                             {/* ... */}
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
                                            "rounded-2xl border-0 overflow-hidden transition-all duration-300",
                                            isUnlocked ? glassColors.ACCORDION_BG : glassColors.ACCORDION_LOCKED
                                        )}
                                    >
                                        <AccordionTrigger className="px-5 py-4 hover:no-underline group">
                                            <div className="flex items-center gap-4 w-full">
                                                <div className="shrink-0">
                                                    {isCompleted ? (
                                                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/30">
                                                            <Check className="w-5 h-5" />
                                                        </div>
                                                    ) : isUnlocked ? (
                                                        <CircularProgress progress={progress} />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-600 border border-slate-700">
                                                            <Lock className="w-4 h-4" />
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                <div className="flex-grow text-left">
                                                    <h4 className={cn("text-base font-semibold transition-colors", isCompleted ? "text-emerald-400" : "text-slate-200")}>
                                                        {section.title}
                                                    </h4>
                                                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                                                        {section.completedUnits || 0} / {section.sectionTotalUnits} {goal.unitName}
                                                    </p>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        
                                        <AccordionContent className="px-5 pb-5 pt-0">
                                            <div className="pl-[3.5rem] space-y-4">
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                                                        <span>İlerleme</span>
                                                        <span>{Math.round(progress)}%</span>
                                                    </div>
                                                    <Progress value={progress} className="h-2 bg-slate-900/50 border border-white/5" indicatorClassName={isCompleted ? "bg-emerald-500" : "bg-indigo-500"} />
                                                </div>

                                                {!isCompleted && isUnlocked && (
                                                    <Dialog open={editingSection?.id === section.id} onOpenChange={(open) => {if (!open) { setEditingSection(null); progressForm.reset({ progress: '' as any }); }}}>
                                                        <DialogTrigger asChild>
                                                            <Button size="sm" variant="secondary" className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 h-9 rounded-lg" onClick={() => setEditingSection(section)}>
                                                                <Plus className="mr-1.5 h-3.5 w-3.5" /> İlerleme Gir
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="bg-slate-900 border-white/10 text-slate-100 sm:max-w-md rounded-2xl">
                                                            <DialogHeader>
                                                                <DialogTitle className="text-xl">İlerleme Ekle</DialogTitle>
                                                                <DialogDescriptionComponent className="text-slate-400">
                                                                    <span className="font-semibold text-white">"{section.title}"</span> bölümü için miktar girin.
                                                                </DialogDescriptionComponent>
                                                            </DialogHeader>
                                                            <Form {...progressForm}>
                                                                <form onSubmit={progressForm.handleSubmit(handleProgressSubmit)} className="space-y-6 pt-4">
                                                                    <FormField
                                                                        control={progressForm.control}
                                                                        name="progress"
                                                                        render={({ field }) => (
                                                                            <FormItem>
                                                                                <FormLabel className="text-slate-300">Eklenen Miktar ({goal.unitName})</FormLabel>
                                                                                <FormControl>
                                                                                    <div className="relative">
                                                                                        <Input 
                                                                                            type="number" 
                                                                                            className="bg-slate-950/50 border-white/10 text-lg h-12 pl-4 focus:border-indigo-500/50 focus:ring-indigo-500/20" 
                                                                                            autoFocus 
                                                                                            {...field} 
                                                                                        />
                                                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">
                                                                                            /{section.sectionTotalUnits - (section.completedUnits || 0)}
                                                                                        </div>
                                                                                    </div>
                                                                                </FormControl>
                                                                                <FormMessage className="text-rose-400" />
                                                                            </FormItem>
                                                                        )}
                                                                    />
                                                                    <DialogFooter className="gap-2 sm:gap-0">
                                                                        <Button type="button" variant="ghost" onClick={() => setEditingSection(null)} className="text-slate-400 hover:text-white hover:bg-white/5">İptal</Button>
                                                                        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20">Kaydet</Button>
                                                                    </DialogFooter>
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