
"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2, ArrowLeft, Send } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { onStudyPlansUpdate, onStudyAssignmentsUpdate, addStudyPlan, updateStudyPlan, deleteStudyPlan, addStudyAssignment } from '@/lib/dataService';
import type { StudyPlan, StudyAssignment, FamilyMember } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { NewStudyPlanForm } from '@/components/new-study-plan-form';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export function StudyPlansClient() {
    const { familyId, familyMembers } = useAuth();
    const { toast } = useToast();
    const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
    const [assignments, setAssignments] = useState<StudyAssignment[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<StudyPlan | null>(null);

    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
    const [assigningPlan, setAssigningPlan] = useState<StudyPlan | null>(null);
    const [assignFormData, setAssignFormData] = useState<{studentIds: string[], assignedDate: Date, dueDate: Date}>({ studentIds: [], assignedDate: new Date(), dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });

    useEffect(() => {
        const unsubPlans = onStudyPlansUpdate(setStudyPlans);
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
    
    const handleOpenAssignDialog = (plan: StudyPlan) => {
        setAssigningPlan(plan);
        setIsAssignDialogOpen(true);
    }

    const handleAssignPlan = async () => {
        if (!assigningPlan || assignFormData.studentIds.length === 0) {
            toast({ title: "Lütfen en az bir öğrenci seçin.", variant: "destructive"});
            return;
        }

        for (const topic of assigningPlan.topics) {
            for (const studentId of assignFormData.studentIds) {
                 const assignmentData: Omit<StudyAssignment, 'id' | 'familyId'> = {
                    studentId,
                    studyPlanId: assigningPlan.id,
                    subject: topic.subject,
                    topic: topic.name,
                    sources: topic.sources,
                    status: 'assigned',
                    startDate: assignFormData.assignedDate.toISOString(),
                    dueDate: assignFormData.dueDate.toISOString(),
                 };
                 await addStudyAssignment(assignmentData);
            }
        }
        
        toast({ title: "Atama Başarılı!", description: `${assigningPlan.title} planı ${assignFormData.studentIds.length} öğrenciye atandı.`});
        setIsAssignDialogOpen(false);
        setAssigningPlan(null);
    }
    
    const getPlanStats = (planId: string) => {
        const relevantAssignments = assignments.filter(a => a.studyPlanId === planId);
        const assignedTo = new Set(relevantAssignments.map(a => a.studentId));
        return {
            assignedToCount: assignedTo.size
        }
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
                    const stats = getPlanStats(plan.id);
                    return (
                        <Card key={plan.id} className="flex flex-col">
                            <CardHeader>
                                <CardTitle>{plan.title}</CardTitle>
                                <CardDescription>{plan.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <p className="text-sm font-semibold">{(plan.topics || []).length} Konu</p>
                                <p className="text-sm text-muted-foreground">{stats.assignedToCount} öğrenciye atandı.</p>
                            </CardContent>
                            <CardFooter className="flex justify-end gap-2 bg-muted/50 p-3">
                                <Button size="sm" variant="secondary" onClick={() => handleOpenAssignDialog(plan)}><Send className="mr-2 h-4 w-4"/>Ata</Button>
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
                <DialogContent className="max-w-2xl">
                    <NewStudyPlanForm
                        onSubmit={handleFormSubmit}
                        initialData={editingPlan}
                    />
                </DialogContent>
            </Dialog>
            <Dialog open={isAssignDialogOpen} onOpenChange={(open) => { if (!open) setAssigningPlan(null); setIsAssignDialogOpen(open)}}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>"{assigningPlan?.title}" Planını Ata</DialogTitle>
                        <DialogDescription>Bu konu anlatımı planını hangi öğrencilere atamak istediğinizi seçin.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Öğrenci(ler)</Label>
                            <div className="space-y-2">
                                {familyMembers.filter(m => m.role.includes("Çocuk")).map(s => (
                                    <div key={s.id} className="flex items-center gap-2">
                                        <Checkbox
                                            id={`student-${s.id}`}
                                            checked={assignFormData.studentIds.includes(s.id)}
                                            onCheckedChange={(checked) => {
                                                setAssignFormData(prev => ({
                                                    ...prev,
                                                    studentIds: checked
                                                        ? [...prev.studentIds, s.id]
                                                        : prev.studentIds.filter(id => id !== s.id)
                                                }));
                                            }}
                                        />
                                        <label htmlFor={`student-${s.id}`}>{s.name}</label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Başlangıç Tarihi</Label>
                                <Popover>
                                    <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !assignFormData.assignedDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{assignFormData.assignedDate ? format(assignFormData.assignedDate, "PPP", { locale: tr }) : <span>Tarih seç</span>}</Button></PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={assignFormData.assignedDate} onSelect={(d) => setAssignFormData(prev => ({...prev, assignedDate: d || new Date()}))} initialFocus /></PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label>Bitiş Tarihi</Label>
                                <Popover>
                                    <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !assignFormData.dueDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{assignFormData.dueDate ? format(assignFormData.dueDate, "PPP", { locale: tr }) : <span>Tarih seç</span>}</Button></PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={assignFormData.dueDate} onSelect={(d) => setAssignFormData(prev => ({...prev, dueDate: d || new Date()}))} initialFocus /></PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsAssignDialogOpen(false)}>İptal</Button>
                        <Button onClick={handleAssignPlan}>Ödevleri Ata</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

    