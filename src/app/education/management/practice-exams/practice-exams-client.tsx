"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2, ArrowLeft, BookCopy, FileText, HelpCircle, ClipboardList, Plus, Settings, FileJson, AlertCircle } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { onPracticeExamsUpdate, addPracticeExam, updatePracticeExam, deletePracticeExam } from '@/lib/dataService';
import type { PracticeExam } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { NewPracticeExamForm } from '@/components/new-practice-exam-form';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

// --- DESIGN SYSTEM: Modern Premium LMS Light Theme ---
const themeColors = {
    HEADER_BG: "bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-40",
    CARD_BG: "bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all duration-300",
    ICON_BOX: "bg-gradient-to-br from-amber-500 to-orange-500 p-2.5 rounded-xl shadow-md shadow-orange-500/20 text-white",
    BUTTON_GLASS: "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm transition-all",
    INPUT_BG: "bg-slate-50 border border-slate-200 text-slate-900 focus:border-indigo-500 transition-all",
};

export function PracticeExamsClient() {
    const { familyId } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    
    // States
    const [exams, setExams] = useState<PracticeExam[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingExam, setEditingExam] = useState<PracticeExam | null>(null);
    
    // Bulk Import States
    const [importModal, setImportModal] = useState<{isOpen: boolean, exam: PracticeExam | null}>({ isOpen: false, exam: null });
    const [jsonInput, setJsonInput] = useState("");

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
            toast({ title: "Hata", description: "Bir sorun oluştu.", variant: "destructive" });
        }
    };
    
    const handleDeleteExam = async (examId: string) => {
        try {
            await deletePracticeExam(examId);
            toast({ title: "Deneme Silindi", variant: "default" });
        } catch(e) {
            toast({ title: "Hata", description: "Silme işlemi başarısız.", variant: "destructive" });
        }
    }
    
    const handleManageExam = (examId: string) => {
        router.push(`/education/management/practice-exams/${examId}`);
    }

    // JSON İçe Aktarma İşlemi
    const handleImportJson = async () => {
        if (!importModal.exam || !jsonInput.trim()) return;
        
        try {
            const parsedData = JSON.parse(jsonInput);
            
            // Temel Format Doğrulaması
            if (!parsedData.subjects || !Array.isArray(parsedData.subjects)) {
                throw new Error("Geçersiz format: JSON verisi bir 'subjects' dizisi içermelidir.");
            }

            // Sınavı Güncelle
            await updatePracticeExam(importModal.exam.id, { 
                subjects: parsedData.subjects 
            });
            
            toast({ 
                title: "Toplu Veri Aktarıldı ✅", 
                description: `${importModal.exam.name} başarıyla güncellendi.` 
            });
            
            setImportModal({ isOpen: false, exam: null });
            setJsonInput("");
        } catch (error: any) {
            toast({ 
                title: "JSON Ayrıştırma Hatası", 
                description: error.message || "Geçersiz JSON formatı.", 
                variant: "destructive" 
            });
        }
    };

    const sampleJson = `{
  "subjects": [
    {
      "name": "Türkçe",
      "questionCount": 40,
      "answerKey": ["A", "B", "C", "D", "A", "B"]
    },
    {
      "name": "Matematik",
      "questionCount": 40,
      "answerKey": ["E", "D", "C", "B", "A"]
    }
  ]
}`;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative overflow-hidden flex flex-col pb-24">
             {/* Açık Tema Arka Plan */}
            <div className="fixed inset-0 bg-slate-50 -z-50" />
            
            {/* AMBIENT BACKGROUND */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-amber-200/40 rounded-full blur-[120px]" />
                <div className="absolute bottom-[20%] right-[-5%] w-[400px] h-[400px] bg-orange-200/40 rounded-full blur-[120px]" />
            </div>

            {/* HEADER */}
            <div className={cn("sticky top-0 z-40 w-full transition-all duration-300", themeColors.HEADER_BG)}>
                <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                         <Link href="/education/management">
                            <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors -ml-2 h-9 w-9 sm:h-10 sm:w-10">
                                <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                            </Button>
                        </Link>
                        <div className={themeColors.ICON_BOX}>
                             <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="flex flex-col justify-center">
                            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900 leading-none">
                                Deneme Sınavları
                            </h1>
                            <p className="text-[10px] sm:text-xs font-medium text-slate-500 mt-1">Şablon ve Sınav Yönetimi</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button 
                            onClick={() => handleOpenForm(null)}
                            className="rounded-lg sm:rounded-xl px-3 sm:px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm h-9 text-xs sm:text-sm transition-all"
                        >
                            <Plus className="mr-1.5 h-4 w-4" /> <span className="hidden sm:inline">Yeni Deneme</span>
                        </Button>
                    </div>
                </div>
            </div>

            <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 relative z-10 flex flex-col min-h-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                    {exams.length > 0 ? (
                        exams.map(exam => {
                            const totalSubjects = exam.subjects?.length || 0;
                            const totalQuestions = exam.subjects?.reduce((sum, s) => sum + s.questionCount, 0) || 0;
                            
                            return (
                                <Card key={exam.id} className={cn("flex flex-col h-full group overflow-hidden", themeColors.CARD_BG)}>
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-lg font-bold text-slate-800 group-hover:text-indigo-700 transition-colors line-clamp-1">{exam.name}</CardTitle>
                                        <CardDescription className="text-slate-500">Genel deneme sınavı şablonu</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-grow space-y-3">
                                        <div className="flex items-center gap-3 text-sm text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                            <div className="bg-amber-100 p-1.5 rounded-lg text-amber-600">
                                                <FileText className="h-4 w-4" />
                                            </div>
                                            <span className="font-medium">{totalSubjects} Ders Alanı</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                            <div className="bg-indigo-100 p-1.5 rounded-lg text-indigo-600">
                                                <HelpCircle className="h-4 w-4" />
                                            </div>
                                            <span className="font-medium">{totalQuestions} Toplam Soru</span>
                                        </div>
                                    </CardContent>
                                    
                                    <CardFooter className="flex flex-wrap justify-end items-center gap-1.5 pt-4 border-t border-slate-100 bg-slate-50/50 mt-auto">
                                        <Button 
                                            size="sm" 
                                            className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-sm mr-auto" 
                                            onClick={() => handleManageExam(exam.id)}
                                        >
                                            Yönet
                                        </Button>
                                        
                                        {/* JSON İçe Aktar Butonu */}
                                        <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            title="JSON İle Toplu Veri Ekle"
                                            className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg" 
                                            onClick={() => {
                                                setJsonInput("");
                                                setImportModal({ isOpen: true, exam });
                                            }}
                                        >
                                            <FileJson className="h-4 w-4"/>
                                        </Button>

                                        <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" 
                                            onClick={() => handleOpenForm(exam)}
                                        >
                                            <Edit className="h-4 w-4"/>
                                        </Button>
                                        
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
                                                    <Trash2 className="h-4 w-4"/>
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="bg-white border-slate-200 text-slate-900 rounded-2xl shadow-xl">
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle className="text-xl">Denemeyi Sil</AlertDialogTitle>
                                                    <AlertDialogDescription className="text-slate-500">
                                                        <strong className="text-slate-800">{exam.name}</strong> denemesini kalıcı olarak silmek istediğinizden emin misiniz?
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter className="mt-4">
                                                    <AlertDialogCancel className="bg-white border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl">İptal</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteExam(exam.id)} className="bg-rose-600 hover:bg-rose-700 text-white border-none shadow-sm rounded-xl">Evet, Sil</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </CardFooter>
                                </Card>
                            );
                        })
                    ) : (
                         <div className="md:col-span-2 lg:col-span-3">
                            <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-300 w-full max-w-2xl mx-auto mt-10">
                                <div className="w-16 h-16 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm">
                                    <BookCopy className="h-8 w-8 text-slate-400" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">Deneme Sınavı Yok</h3>
                                    <p className="text-slate-500 mt-2 text-sm max-w-sm">Şablon oluşturmaya başlamak için yukarıdaki "Yeni Deneme" butonuna tıklayın.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
            
            {/* Sınav Düzenleme/Ekleme Modalı */}
             <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-md bg-white border-slate-200 text-slate-900 rounded-2xl shadow-xl">
                    <NewPracticeExamForm
                        onSubmit={handleFormSubmit}
                        initialData={editingExam}
                    />
                </DialogContent>
            </Dialog>

            {/* JSON İçe Aktar Modalı */}
            <Dialog open={importModal.isOpen} onOpenChange={(open) => setImportModal({ ...importModal, isOpen: open })}>
                <DialogContent className="sm:max-w-2xl bg-white border-slate-200 text-slate-900 rounded-3xl shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
                            <FileJson className="w-5 h-5 text-emerald-500" />
                            Toplu Veri İçe Aktar
                        </DialogTitle>
                        <DialogDescription className="text-slate-500">
                            <strong>{importModal.exam?.name}</strong> denemesine dersleri, soru sayılarını ve cevap anahtarlarını JSON formatında tek seferde ekleyin.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4 space-y-4">
                        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                            <div className="flex gap-2 items-start text-blue-800">
                                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <p className="font-semibold mb-1">Örnek JSON Formatı:</p>
                                    <pre className="bg-white/60 p-2 rounded-lg border border-blue-100 text-xs overflow-x-auto whitespace-pre-wrap">
                                        {sampleJson}
                                    </pre>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">JSON Verisini Buraya Yapıştırın</label>
                            <textarea
                                autoFocus
                                value={jsonInput}
                                onChange={(e) => setJsonInput(e.target.value)}
                                placeholder='{"subjects": [...]}'
                                className={cn(
                                    "w-full h-64 p-4 rounded-xl text-sm font-mono resize-none outline-none shadow-inner",
                                    themeColors.INPUT_BG
                                )}
                                spellCheck={false}
                            />
                        </div>
                    </div>
                    
                    <DialogFooter className="gap-2 sm:gap-0 mt-2">
                        <Button variant="ghost" onClick={() => setImportModal({ isOpen: false, exam: null })} className="rounded-xl text-slate-600">Vazgeç</Button>
                        <Button onClick={handleImportJson} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 px-8">
                            Verileri Aktar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}