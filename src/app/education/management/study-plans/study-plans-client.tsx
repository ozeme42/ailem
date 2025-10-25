
"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { onStudyPlansUpdate, onStudyAssignmentsUpdate, addStudyPlan, updateStudyPlan, deleteStudyPlan } from '@/lib/dataService';
import type { StudyPlan } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { NewStudyPlanForm } from '@/components/new-study-plan-form';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function StudyPlansClient() {
    const { familyId } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<StudyPlan | null>(null);

    useEffect(() => {
        const unsubPlans = onStudyPlansUpdate(setStudyPlans);
        return () => {
            unsubPlans();
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
                toast({ title: "Yol Haritası Güncellendi" });
            } else {
                await addStudyPlan(data);
                toast({ title: "Yeni Yol Haritası Oluşturuldu" });
            }
            setIsFormOpen(false);
        } catch (error) {
            toast({ title: "Hata", variant: "destructive" });
        }
    };
    
    const handleDeletePlan = async (planId: string) => {
        try {
            await deleteStudyPlan(planId);
            toast({ title: "Yol Haritası Silindi", variant: "destructive" });
        } catch(e) {
            toast({ title: "Hata", variant: "destructive" });
        }
    }
    
    const handleManagePlan = (planId: string) => {
        router.push(`/education/management/study-plans/${planId}`);
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Konu Anlatımı Planları">
                <div className="flex gap-2">
                    <Link href="/education/management">
                        <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none">
                            <ArrowLeft className="mr-2 h-4 w-4" /> İçerik Yönetimi
                        </Button>
                    </Link>
                    <Button onClick={() => handleOpenForm(null)}>
                        <PlusCircle className="mr-2 h-4 w-4"/> Yeni Plan Oluştur
                    </Button>
                </div>
            </PageHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {studyPlans.map(plan => {
                    const totalTopics = plan.subjects?.reduce((acc, s) => acc + (s.topics?.length || 0), 0) || 0;
                    return (
                        <Card key={plan.id} className="flex flex-col">
                            <CardHeader>
                                <CardTitle>{plan.title}</CardTitle>
                                <CardDescription>{plan.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <p className="text-sm font-semibold">{plan.subjects?.length || 0} Ders</p>
                                <p className="text-sm text-muted-foreground">{totalTopics} Konu</p>
                            </CardContent>
                            <CardFooter className="flex justify-end gap-2 bg-muted/50 p-3">
                                 <Button size="sm" variant="secondary" onClick={() => handleManagePlan(plan.id)}>Planı Yönet</Button>
                                <Button size="sm" variant="outline" onClick={() => handleOpenForm(plan)}><Edit className="mr-2 h-4 w-4"/>Düzenle</Button>
                                 <AlertDialog>
                                    <AlertDialogTrigger asChild><Button size="sm" variant="destructive"><Trash2 className="mr-2 h-4 w-4"/>Sil</Button></AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Planı Sil</AlertDialogTitle><AlertDialogDescription>"{plan.title}" planını kalıcı olarak silmek istediğinizden emin misiniz?</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => handleDeletePlan(plan.id)}>Evet, Sil</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>
             <Dialog open={isFormOpen} onOpenChange={(open) => {if(!open) setEditingPlan(null); setIsFormOpen(open)}}>
                <DialogContent className="max-w-3xl">
                    <NewStudyPlanForm
                        onSubmit={handleFormSubmit}
                        initialData={editingPlan}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
