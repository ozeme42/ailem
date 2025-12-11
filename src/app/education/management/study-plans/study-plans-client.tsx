"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2, ArrowLeft, BookHeart, FileText, CheckCircle, Plus } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { onStudyPlansUpdate, addStudyPlan, updateStudyPlan, deleteStudyPlan, onStudyAssignmentsUpdate } from '@/lib/dataService';
import type { StudyPlan, StudyAssignment } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { NewStudyPlanForm } from '@/components/new-study-plan-form';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// --- DESIGN SYSTEM: Glassmorphism ---
const glassColors = {
    HEADER_BG: "bg-slate-950/70 backdrop-blur-lg border-b border-white/5",
    CARD_BG: "bg-white/5 border border-white/10 shadow-lg backdrop-blur-md",
    ICON_BOX: "bg-gradient-to-br p-2.5 rounded-xl shadow-lg",
    BUTTON_GLASS: "bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow-sm",
};

export function StudyPlansClient() {
    const { familyId } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [plans, setPlans] = useState<StudyPlan[]>([]);
    const [assignments, setAssignments] = useState<StudyAssignment[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<StudyPlan | null>(null);

    useEffect(() => {
        if (!familyId) return;
        const unsubPlans = onStudyPlansUpdate(setPlans);
        const unsubAssignments = onStudyAssignmentsUpdate(setAssignments);
        return () => {
            unsubPlans();
            unsubAssignments();
        };
    }, [familyId]);

    const handleOpenForm = (plan: StudyPlan | null) => {
        setEditingPlan(plan);
        setIsFormOpen(true);
    };

    const handleFormSubmit = async (data: Omit<StudyPlan, 'id' | 'familyId'>) => {
        try {
            if (editingPlan) {
                await updateStudyPlan(editingPlan.id, data);
                toast({ title: "Plan Güncellendi" });
            } else {
                await addStudyPlan(data);
                toast({ title: "Yeni Plan Oluşturuldu" });
            }
            setIsFormOpen(false);
            setEditingPlan(null);
        } catch (error) {
            toast({ title: "Hata", variant: "destructive" });
        }
    };
    
    const handleDeletePlan = async (planId: string) => {
        try {
            await deleteStudyPlan(planId);
            toast({ title: "Plan Silindi", variant: "destructive" });
        } catch(e) {
            toast({ title: "Hata", variant: "destructive" });
        }
    }
    
    const handleManagePlan = (planId: string) => {
        router.push(`/education/management/study-plans/${planId}`);
    }

    const planProgress = useMemo(() => {
        const progressMap = new Map<string, { completed: number, total: number }>();
        assignments.forEach(assignment => {
            const planId = assignment.studyPlanId;
            const current = progressMap.get(planId) || { completed: 0, total: 0 };
            current.total++;
            if (assignment.status === 'completed') {
                current.completed++;
            }
            progressMap.set(planId, current);
        });
        return progressMap;
    }, [assignments]);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden flex flex-col">
            {/* FIXED BACKGROUND */}
            <div className="fixed inset-0 bg-slate-950 -z-50" />
            
            {/* AMBIENT BACKGROUND */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-pink-900/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[20%] right-[-5%] w-[400px] h-[400px] bg-rose-900/20 rounded-full blur-[120px]" />
            </div>

            {/* HEADER */}
            <div className={cn("sticky top-0 z-40 w-full transition-all duration-300", glassColors.HEADER_BG)}>
                <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                         <Link href="/education/management">
                            <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors -ml-2">
                                <ArrowLeft className="h-6 w-6" />
                            </Button>
                        </Link>
                        <div className={cn("from-pink-500 to-rose-600", glassColors.ICON_BOX)}>
                             <BookHeart className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tight text-slate-100 leading-none">
                                Konu Anlatım
                            </h1>
                            <p className="text-xs font-medium text-slate-400 mt-0.5">Eğitim Planları</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button 
                            onClick={() => handleOpenForm(null)}
                            className="rounded-xl px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-500/20 border border-indigo-400/20 h-9 text-sm"
                        >
                            <Plus className="mr-1.5 h-4 w-4" /> Yeni Plan
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 relative z-10 flex flex-col min-h-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plans.length > 0 ? (
                        plans.map(plan => {
                            const totalSubjects = plan.subjects?.length || 0;
                            const totalTopics = plan.subjects?.reduce((sum, s) => sum + (s.topics?.length || 0), 0) || 0;
                            const progress = planProgress.get(plan.id);
                            const progressPercentage = progress && progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
                            
                            return (
                                <Card key={plan.id} className={cn("flex flex-col h-full group hover:-translate-y-1 transition-all duration-300", glassColors.CARD_BG)}>
                                    <CardHeader>
                                        <CardTitle className="text-lg font-bold text-slate-200 group-hover:text-white transition-colors">{plan.title}</CardTitle>
                                        <CardDescription className="text-slate-400 line-clamp-2">{plan.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-grow space-y-4">
                                            <div className="space-y-3 text-sm text-slate-300">
                                                <div className="flex items-center gap-2 bg-white/5 p-2 rounded-lg border border-white/5">
                                                    <FileText className="h-4 w-4 text-pink-400" /><span>{totalSubjects} Ders</span>
                                                </div>
                                                <div className="flex items-center gap-2 bg-white/5 p-2 rounded-lg border border-white/5">
                                                    <CheckCircle className="h-4 w-4 text-emerald-400" /><span>{totalTopics} Konu</span>
                                                </div>
                                            </div>
                                            {progress && progress.total > 0 && (
                                                <div className="pt-2">
                                                    <div className="flex justify-between text-xs text-slate-400 mb-1 font-medium">
                                                        <span>İlerleme</span>
                                                        <span className="text-pink-300">{progress.completed} / {progress.total} atama</span>
                                                    </div>
                                                    <Progress value={progressPercentage} className="h-2 bg-pink-900/20" indicatorClassName="bg-pink-500" />
                                                </div>
                                            )}
                                    </CardContent>
                                    <CardFooter className="flex justify-end gap-2 pt-4 border-t border-white/5 bg-white/5 mt-auto">
                                        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white border-0 shadow-lg shadow-indigo-500/20" onClick={() => handleManagePlan(plan.id)}>Yönet</Button>
                                        <Button size="icon" variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/10" onClick={() => handleOpenForm(plan)}><Edit className="h-4 w-4"/></Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger>
                                            <AlertDialogContent className="bg-slate-900 border-white/10 text-slate-100">
                                                <AlertDialogHeader><AlertDialogTitle>Planı Sil</AlertDialogTitle><AlertDialogDescription className="text-slate-400">"{plan.title}" planını ve ilgili tüm atamaları kalıcı olarak silmek istediğinizden emin misiniz?</AlertDialogDescription></AlertDialogHeader>
                                                <AlertDialogFooter><AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-200">İptal</AlertDialogCancel><AlertDialogAction onClick={() => handleDeletePlan(plan.id)} className="bg-rose-600 hover:bg-rose-700">Evet, Sil</AlertDialogAction></AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </CardFooter>
                                </Card>
                            );
                        })
                    ) : (
                         <div className="md:col-span-2 lg:col-span-3">
                            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10 w-full">
                                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
                                    <BookHeart className="h-8 w-8 text-slate-500" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-200">Plan Yok</h3>
                                    <p className="text-slate-400 mt-1 text-sm">Başlamak için "Yeni Plan" butonuna tıklayın.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                
                 <Dialog open={isFormOpen} onOpenChange={(open) => {if (!open) setEditingPlan(null); setIsFormOpen(open);}}>
                    <DialogContent className="max-w-2xl bg-slate-900 border-white/10 text-slate-100 rounded-2xl">
                        <NewStudyPlanForm
                            onSubmit={handleFormSubmit}
                            initialData={editingPlan}
                        />
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}