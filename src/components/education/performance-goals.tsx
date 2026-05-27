"use client";

import * as React from "react";
import { 
    Flag, Plus, Target, CheckCircle2, Trash2, Edit3, 
    BarChart3, Percent, Calculator, Flame, Clock, 
    ChevronRight, Loader2, BookOpen, Sparkles
} from "lucide-react";
import { format, startOfDay, endOfDay, isWithinInterval, subDays, subWeeks, subMonths, startOfWeek, startOfMonth, startOfYear } from "date-fns";
import { tr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

import { 
    PerformanceGoal, PerformanceGoalType, PerformanceGoalPeriod, 
    FamilyMember, Test 
} from "@/lib/data";
import { 
    addPerformanceGoal, updatePerformanceGoal, deletePerformanceGoal, 
    onPerformanceGoalsUpdate 
} from "@/lib/dataService";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface PerformanceGoalsProps {
    member: FamilyMember;
    solvedTests: Test[];
    availableSubjects: string[];
}

export function PerformanceGoals({ member, solvedTests, availableSubjects }: PerformanceGoalsProps) {
    const { toast } = useToast();
    const [goals, setGoals] = React.useState<PerformanceGoal[]>([]);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [editingGoal, setEditingGoal] = React.useState<PerformanceGoal | null>(null);
    const [loading, setLoading] = React.useState(false);

    // Form states
    const [goalForm, setGoalForm] = React.useState<{
        type: PerformanceGoalType;
        subject: string;
        target: string;
        label: string;
        period: PerformanceGoalPeriod;
    }>({
        type: 'questions',
        subject: 'all',
        target: '',
        label: '',
        period: 'weekly',
    });

    React.useEffect(() => {
        const unsub = onPerformanceGoalsUpdate(member.id, setGoals);
        return () => unsub();
    }, [member.id]);

    const calculateProgress = React.useCallback((goal: PerformanceGoal) => {
        const now = new Date();
        let startDate = new Date();
        
        switch (goal.period) {
            case 'daily': startDate = startOfDay(now); break;
            case 'weekly': startDate = startOfWeek(now, { weekStartsOn: 1 }); break;
            case 'monthly': startDate = startOfMonth(now); break;
            case 'yearly': startDate = startOfYear(now); break;
            case 'custom': startDate = new Date(goal.startDate); break;
        }

        const periodTests = solvedTests.filter(t => {
            const solvedDate = new Date(t.updatedAt || t.assignedDate);
            const inPeriod = solvedDate >= startDate && solvedDate <= now;
            
            // Helper function logic used within calculation
            const getCategory = (test: Test): string => {
              if (test.sourceType === 'exam') return 'Genel Deneme Sınavları';
              if (test.sourceType === 'mistake') return 'Yanlışlarım';
              return test.subject || 'Diğer';
            };

            const subjectMatch = goal.subject === 'all' || getCategory(t) === goal.subject;
            return inPeriod && subjectMatch;
        });

        let current = 0;
        if (goal.type === 'questions') {
            current = periodTests.reduce((acc, t) => acc + (t.questionCount || 0), 0);
        } else if (goal.type === 'net') {
            current = periodTests.reduce((acc, t) => acc + ((t.correctAnswers || 0) - (t.incorrectAnswers || 0) / 3), 0);
        } else if (goal.type === 'successRate') {
            const total = periodTests.reduce((acc, t) => acc + (t.questionCount || 0), 0);
            const correct = periodTests.reduce((acc, t) => acc + (t.correctAnswers || 0), 0);
            current = total > 0 ? (correct / total) * 100 : 0;
        }

        const pct = Math.min(100, goal.target > 0 ? (current / goal.target) * 100 : 0);
        return { current, pct, done: pct >= 100 };
    }, [solvedTests]);

    const handleSaveGoal = async () => {
        const targetVal = parseFloat(goalForm.target);
        if (isNaN(targetVal) || targetVal <= 0) {
            toast({ title: "Hata", description: "Geçerli bir hedef değeri girin.", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            const goalData = {
                memberId: member.id,
                type: goalForm.type,
                subject: goalForm.subject,
                target: targetVal,
                label: goalForm.label || `${goalForm.period === 'weekly' ? 'Haftalık' : goalForm.period === 'monthly' ? 'Aylık' : 'Günlük'} Hedef`,
                period: goalForm.period,
                startDate: new Date().toISOString(),
            };

            if (editingGoal) {
                await updatePerformanceGoal(editingGoal.id, goalData);
                toast({ title: "Güncellendi ✨" });
            } else {
                await addPerformanceGoal(goalData);
                toast({ title: "Hedef Eklendi 🎯" });
            }
            setIsModalOpen(false);
            setEditingGoal(null);
        } catch (e) {
            toast({ title: "Hata", description: "Hedef kaydedilemedi.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteGoal = async (id: string) => {
        try {
            await deletePerformanceGoal(id);
            toast({ title: "Hedef Silindi" });
        } catch (e) {
            toast({ title: "Hata", description: "Hedef silinemedi.", variant: "destructive" });
        }
    };

    const openEdit = (g: PerformanceGoal) => {
        setEditingGoal(g);
        setGoalForm({
            type: g.type,
            subject: g.subject || 'all',
            target: g.target.toString(),
            label: g.label,
            period: g.period,
        });
        setIsModalOpen(true);
    };

    return (
        <section className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Flag className="w-6 h-6 text-indigo-500" /> Hedefler
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Kişisel gelişim hedefleri ve ilerleme durumu</p>
                </div>
                <Button 
                    onClick={() => { setEditingGoal(null); setIsModalOpen(true); }}
                    className="rounded-xl h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-500/20"
                >
                    <Plus className="w-4 h-4 mr-1.5" /> Hedef Koy
                </Button>
            </div>

            {goals.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 p-16 text-center">
                    <Target className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                    <p className="font-bold text-slate-500 dark:text-slate-400">Henüz aktif bir hedef yok.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {goals.map((goal, i) => {
                        const { current, pct, done } = calculateProgress(goal);
                        const typeIcon = goal.type === 'questions' ? BarChart3 : goal.type === 'successRate' ? Percent : Calculator;
                        const unit = goal.type === 'questions' ? 'soru' : goal.type === 'successRate' ? '%' : 'net';
                        
                        return (
                            <motion.div 
                                key={goal.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className={cn(
                                    "group relative rounded-[2rem] p-5 bg-white dark:bg-slate-900 border transition-all duration-300",
                                    done ? "border-emerald-500/30 bg-emerald-50/10 dark:bg-emerald-950/10 shadow-emerald-500/10" : "border-slate-200 dark:border-slate-800 shadow-sm"
                                )}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                            done ? "bg-emerald-500 text-white" : "bg-indigo-50 dark:bg-indigo-950 text-indigo-600"
                                        )}>
                                            {done ? <CheckCircle2 className="w-5 h-5" /> : React.createElement(typeIcon, { className: "w-5 h-5" })}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-slate-100 leading-tight">{goal.label}</h4>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                {goal.subject === 'all' ? 'Tüm Dersler' : goal.subject} • {goal.period}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openEdit(goal)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600"><Edit3 className="w-3.5 h-3.5"/></button>
                                        <button onClick={() => handleDeleteGoal(goal.id)} className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 text-slate-400 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5"/></button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-end justify-between">
                                        <span className="text-2xl font-black tabular-nums">
                                            {goal.type === 'successRate' ? `%${current.toFixed(0)}` : Math.round(current)}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">HEDEF: {goal.target}{unit}</span>
                                    </div>
                                    <Progress value={pct} className="h-2 bg-slate-100 dark:bg-slate-800" indicatorClassName={cn(done ? "bg-emerald-500" : "bg-indigo-500")} />
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            <Dialog open={isModalOpen} onOpenChange={(o) => { if(!o) setEditingGoal(null); setIsModalOpen(o); }}>
                <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingGoal ? 'Hedefi Düzenle' : 'Yeni Hedef Belirle'}</DialogTitle>
                        <DialogDescription>Gelişim hedeflerinizi belirleyin.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <div className="space-y-3">
                            <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Hedef Türü</Label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'questions', label: 'Soru', icon: BarChart3 },
                                    { id: 'successRate', label: 'Başarı %', icon: Percent },
                                    { id: 'net', label: 'Net', icon: Calculator },
                                ].map(t => (
                                    <button 
                                        key={t.id} 
                                        onClick={() => setGoalForm({ ...goalForm, type: t.id as any })}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all gap-1.5",
                                            goalForm.type === t.id ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700" : "border-slate-100 dark:border-slate-800 text-slate-500"
                                        )}
                                    >
                                        <t.icon className="w-5 h-5" />
                                        <span className="text-[10px] font-bold uppercase">{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Ders</Label>
                                <Select value={goalForm.subject} onValueChange={(v) => setGoalForm({ ...goalForm, subject: v })}>
                                    <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tümü</SelectItem>
                                        {availableSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Periyot</Label>
                                <Select value={goalForm.period} onValueChange={(v) => setGoalForm({ ...goalForm, period: v as any })}>
                                    <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="daily">Günlük</SelectItem>
                                        <SelectItem value="weekly">Haftalık</SelectItem>
                                        <SelectItem value="monthly">Aylık</SelectItem>
                                        <SelectItem value="yearly">Yıllık</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Hedef Değeri</Label>
                            <Input 
                                type="number" 
                                className="h-12 rounded-xl text-lg font-bold"
                                value={goalForm.target}
                                onChange={(e) => setGoalForm({ ...goalForm, target: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Etiket (Opsiyonel)</Label>
                            <Input 
                                placeholder="Örn: Haftalık Matematik Hedefi" 
                                className="h-12 rounded-xl"
                                value={goalForm.label}
                                onChange={(e) => setGoalForm({ ...goalForm, label: e.target.value })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsModalOpen(false)}>İptal</Button>
                        <Button disabled={loading} onClick={handleSaveGoal} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12 px-8 font-bold">
                            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Kaydet'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </section>
    );
}
