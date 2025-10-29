
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2, ArrowLeft, BookHeart, FileText, CheckCircle } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { onStudyPlansUpdate, addStudyPlan, updateStudyPlan, deleteStudyPlan, onStudyAssignmentsUpdate } from '@/lib/dataService';
import type { StudyPlan, StudyAssignment } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { NewStudyPlanForm } from '@/components/new-study-plan-form';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';


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
        <div className="space-y-6">
            <PageHeader title="Konu Anlatım Planları">
                <div className="flex gap-2">
                    <Link href="/education/management">
                        <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none">
                            <ArrowLeft className="mr-2 h-4 w-4" /> İçerik Yönetimi
                        </Button>
                    </Link>
                    <Button onClick={() => handleOpenForm(null)} className="bg-white/20 text-white hover:bg-white/30 border-none">
                        <PlusCircle className="mr-2 h-4 w-4"/> Yeni Plan Oluştur
                    </Button>
                </div>
            </PageHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {plans.length > 0 ? (
                    plans.map(plan => {
                        const totalSubjects = plan.subjects?.length || 0;
                        const totalTopics = plan.subjects?.reduce((sum, s) => sum + (s.topics?.length || 0), 0) || 0;
                        const progress = planProgress.get(plan.id);
                        const progressPercentage = progress && progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
                        
                        return (
                            <Card key={plan.id} className="flex flex-col">
                                <CardHeader>
                                    <CardTitle>{plan.title}</CardTitle>
                                    <CardDescription>{plan.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow space-y-4">
                                     <div className="space-y-3 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-2"><FileText className="h-4 w-4" /><span>{totalSubjects} Ders</span></div>
                                        <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4" /><span>{totalTopics} Konu</span></div>
                                    </div>
                                    {progress && progress.total > 0 && (
                                        <div className="pt-2">
                                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                                <span>İlerleme</span>
                                                <span>{progress.completed} / {progress.total} atama</span>
                                            </div>
                                            <Progress value={progressPercentage} className="h-2"/>
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="flex justify-end gap-2 bg-muted/50 p-3">
                                    <Button size="sm" variant="secondary" onClick={() => handleManagePlan(plan.id)}>Yönet</Button>
                                    <Button size="sm" variant="outline" onClick={() => handleOpenForm(plan)}><Edit className="mr-2 h-4 w-4"/>Düzenle</Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild><Button size="sm" variant="destructive"><Trash2 className="mr-2 h-4 w-4"/>Sil</Button></AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>Planı Sil</AlertDialogTitle><AlertDialogDescription>"{plan.title}" planını ve ilgili tüm atamaları kalıcı olarak silmek istediğinizden emin misiniz?</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => handleDeletePlan(plan.id)}>Evet, Sil</AlertDialogAction></AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </CardFooter>
                            </Card>
                        );
                    })
                ) : (
                     <div className="md:col-span-2 lg:col-span-3">
                        <Card className="text-center p-12">
                            <BookHeart className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-semibold">Henüz konu anlatım planı oluşturulmadı.</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Başlamak için "Yeni Plan Oluştur" butonuna tıklayın.
                            </p>
                        </Card>
                    </div>
                )}
            </div>
            
             <Dialog open={isFormOpen} onOpenChange={(open) => {if (!open) setEditingPlan(null); setIsFormOpen(open);}}>
                <DialogContent className="max-w-2xl">
                    <NewStudyPlanForm
                        onSubmit={handleFormSubmit}
                        initialData={editingPlan}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
