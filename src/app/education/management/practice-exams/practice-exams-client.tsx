
"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2, ArrowLeft, BookCopy, FileText, HelpCircle } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { onPracticeExamsUpdate, addPracticeExam, updatePracticeExam, deletePracticeExam } from '@/lib/dataService';
import type { PracticeExam } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { NewPracticeExamForm } from '@/components/new-practice-exam-form';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter } from '@/components/ui/alert-dialog';


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
                await addPracticeExam({ ...data, subjects: [] });
                toast({ title: "Yeni Deneme Sınavı Oluşturuldu" });
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
        <div className="space-y-6">
            <PageHeader title="Deneme Sınavları">
                <div className="flex gap-2">
                    <Link href="/education/management">
                        <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none">
                            <ArrowLeft className="mr-2 h-4 w-4" /> İçerik Yönetimi
                        </Button>
                    </Link>
                    <Button onClick={() => handleOpenForm(null)}>
                        <PlusCircle className="mr-2 h-4 w-4"/> Yeni Deneme Oluştur
                    </Button>
                </div>
            </PageHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {exams.length > 0 ? (
                    exams.map(exam => {
                        const totalSubjects = exam.subjects?.length || 0;
                        const totalQuestions = exam.subjects?.reduce((sum, s) => sum + s.questionCount, 0) || 0;
                        
                        return (
                            <Card key={exam.id} className="flex flex-col">
                                <CardHeader>
                                    <CardTitle>{exam.name}</CardTitle>
                                    <CardDescription>{totalSubjects} ders, {totalQuestions} soru</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow space-y-3 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2"><FileText className="h-4 w-4" /><span>{totalSubjects} Ders</span></div>
                                    <div className="flex items-center gap-2"><HelpCircle className="h-4 w-4" /><span>{totalQuestions} Soru</span></div>
                                </CardContent>
                                <CardFooter className="flex justify-end gap-2 bg-muted/50 p-3">
                                    <Button size="sm" variant="secondary" onClick={() => handleManageExam(exam.id)}>Yönet</Button>
                                    <Button size="sm" variant="outline" onClick={() => handleOpenForm(exam)}><Edit className="mr-2 h-4 w-4"/>Düzenle</Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild><Button size="sm" variant="destructive"><Trash2 className="mr-2 h-4 w-4"/>Sil</Button></AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>Denemeyi Sil</AlertDialogTitle><AlertDialogDescription>"{exam.name}" denemesini kalıcı olarak silmek istediğinizden emin misiniz?</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteExam(exam.id)}>Evet, Sil</AlertDialogAction></AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </CardFooter>
                            </Card>
                        );
                    })
                ) : (
                     <div className="md:col-span-2 lg:col-span-3">
                        <Card className="text-center p-12">
                            <BookCopy className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-semibold">Henüz deneme sınavı oluşturulmadı.</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Başlamak için "Yeni Deneme Oluştur" butonuna tıklayın.
                            </p>
                        </Card>
                    </div>
                )}
            </div>
            
             <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent>
                    <NewPracticeExamForm
                        onSubmit={handleFormSubmit}
                        initialData={editingExam}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
