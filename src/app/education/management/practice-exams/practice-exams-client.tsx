"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2, ArrowLeft, BookCopy, FileText, HelpCircle, ClipboardList, Plus, Settings } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { onPracticeExamsUpdate, addPracticeExam, updatePracticeExam, deletePracticeExam } from '@/lib/dataService';
import type { PracticeExam } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { NewPracticeExamForm } from '@/components/new-practice-exam-form';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

// --- DESIGN SYSTEM: Glassmorphism ---
const glassColors = {
    HEADER_BG: "bg-slate-950/70 backdrop-blur-lg border-b border-white/5",
    CARD_BG: "bg-white/5 border border-white/10 shadow-lg backdrop-blur-md",
    ICON_BOX: "bg-gradient-to-br p-2.5 rounded-xl shadow-lg",
    BUTTON_GLASS: "bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow-sm",
};

export function PracticeExamsClient() {
    const { familyId } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [exams, setExams] = useState<PracticeExam[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingExam, setEditingExam] = useState<PracticeExam | null>(null);

    useEffect(() => {
        if (!familyId) return;
        const unsub = onPracticeExamsUpdate(setExams);
        return () => unsub();
    }, [familyId]);

    const handleOpenForm = (exam: PracticeExam | null) => {
        setEditingExam(exam);
        setIsFormOpen(true);
    };

    const handleFormSubmit = async (data: Pick<PracticeExam, 'name'>) => {
        try {
            if (editingExam) {
                await updatePracticeExam(editingExam.id, data);
                toast({ title: "Deneme Güncellendi" });
            } else {
                const newExamId = await addPracticeExam({ ...data, subjects: [] });
                toast({ title: "Yeni Deneme Sınavı Oluşturuldu" });
                if (newExamId) {
                    router.push(`/education/management/practice-exams/${newExamId.id}`);
                }
            }
            setIsFormOpen(false);
            setEditingExam(null);
        } catch (error) {
            toast({ title: "Hata", variant: "destructive" });
        }
    };
    
    const handleDeleteExam = async (examId: string) => {
        try {
            await deletePracticeExam(examId);
            toast({ title: "Deneme Silindi", variant: "destructive" });
        } catch(e) {
            toast({ title: "Hata", variant: "destructive" });
        }
    }
    
    const handleManageExam = (examId: string) => {
        router.push(`/education/management/practice-exams/${examId}`);
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden flex flex-col">
             {/* FIXED BACKGROUND */}
            <div className="fixed inset-0 bg-slate-950 -z-50" />
            
            {/* AMBIENT BACKGROUND */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-amber-900/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[20%] right-[-5%] w-[400px] h-[400px] bg-orange-900/20 rounded-full blur-[120px]" />
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
                        <div className={cn("from-amber-500 to-orange-600", glassColors.ICON_BOX)}>
                             <ClipboardList className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tight text-slate-100 leading-none">
                                Deneme Sınavları
                            </h1>
                            <p className="text-xs font-medium text-slate-400 mt-0.5">Sınav Yönetimi</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button 
                            onClick={() => handleOpenForm(null)}
                            className="rounded-xl px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-500/20 border border-indigo-400/20 h-9 text-sm"
                        >
                            <Plus className="mr-1.5 h-4 w-4" /> Yeni Deneme
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 relative z-10 flex flex-col min-h-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {exams.length > 0 ? (
                        exams.map(exam => {
                            const totalSubjects = exam.subjects?.length || 0;
                            const totalQuestions = exam.subjects?.reduce((sum, s) => sum + s.questionCount, 0) || 0;
                            
                            return (
                                <Card key={exam.id} className={cn("flex flex-col h-full group hover:-translate-y-1 transition-all duration-300", glassColors.CARD_BG)}>
                                    <CardHeader>
                                        <CardTitle className="text-lg font-bold text-slate-200 group-hover:text-white transition-colors">{exam.name}</CardTitle>
                                        <CardDescription className="text-slate-400">Genel deneme sınavı şablonu</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-grow space-y-3">
                                        <div className="flex items-center gap-2 text-sm text-slate-300 bg-white/5 p-2 rounded-lg border border-white/5">
                                            <FileText className="h-4 w-4 text-amber-400" />
                                            <span>{totalSubjects} Ders</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-300 bg-white/5 p-2 rounded-lg border border-white/5">
                                            <HelpCircle className="h-4 w-4 text-indigo-400" />
                                            <span>{totalQuestions} Soru</span>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex justify-end gap-2 pt-4 border-t border-white/5 bg-white/5 mt-auto">
                                        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white border-0 shadow-lg shadow-indigo-500/20" onClick={() => handleManageExam(exam.id)}>Yönet</Button>
                                        <Button size="icon" variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/10" onClick={() => handleOpenForm(exam)}><Edit className="h-4 w-4"/></Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger>
                                            <AlertDialogContent className="bg-slate-900 border-white/10 text-slate-100">
                                                <AlertDialogHeader><AlertDialogTitle>Denemeyi Sil</AlertDialogTitle><AlertDialogDescription className="text-slate-400">"{exam.name}" denemesini kalıcı olarak silmek istediğinizden emin misiniz?</AlertDialogDescription></AlertDialogHeader>
                                                <AlertDialogFooter><AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-200">İptal</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteExam(exam.id)} className="bg-rose-600 hover:bg-rose-700">Evet, Sil</AlertDialogAction></AlertDialogFooter>
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
                                    <BookCopy className="h-8 w-8 text-slate-500" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-200">Deneme Sınavı Yok</h3>
                                    <p className="text-slate-400 mt-1 text-sm">Başlamak için "Yeni Deneme" butonuna tıklayın.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
             <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-md bg-slate-900 border-white/10 text-slate-100 rounded-2xl">
                    <NewPracticeExamForm
                        onSubmit={handleFormSubmit}
                        initialData={editingExam}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}