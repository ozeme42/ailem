
"use client";

import * as React from "react";
import Link from "next/link";
import { PlusCircle, Edit, Trash2, ArrowLeft, Ruler, TestTube2, BookCopy, Globe, MessageSquare, Gamepad2, ClipboardList } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { NewQuestionBankForm } from "@/components/new-question-bank-form";
import { NewPracticeExamForm } from "@/components/new-practice-exam-form";
import { QuestionBank, PracticeExam } from "@/lib/data";
import {
  onQuestionBanksUpdate,
  onPracticeExamsUpdate,
  onSubjectsUpdate,
  updateSubjects,
  addQuestionBank,
  updateQuestionBank,
  deleteQuestionBank,
  addPracticeExam,
  updatePracticeExam,
  deletePracticeExam,
} from "@/lib/dataService";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

const categoryIcons: { [key: string]: React.ElementType } = {
    'Genel Deneme Sınavları': ClipboardList,
    'Matematik': Ruler,
    'Fen Bilimleri': TestTube2,
    'Türkçe': BookCopy,
    'Sosyal Bilgiler': Globe,
    'İngilizce': MessageSquare,
    'Serbest Etkinlikler': Gamepad2
};

const categoryColors: { [key: string]: string } = {
    'Genel Deneme Sınavları': 'border-yellow-500/80 text-yellow-600',
    'Matematik': 'border-red-500/80 text-red-600',
    'Fen Bilimleri': 'border-orange-500/80 text-orange-600',
    'Türkçe': 'border-yellow-400/80 text-yellow-500',
    'Sosyal Bilgiler': 'border-cyan-500/80 text-cyan-600',
    'İngilizce': 'border-blue-500/80 text-blue-600',
    'Serbest Etkinlikler': 'border-purple-500/80 text-purple-600',
};


export default function EducationManagementPage() {
    const { toast } = useToast();

    const [questionBanks, setQuestionBanks] = React.useState<QuestionBank[]>([]);
    const [practiceExams, setPracticeExams] = React.useState<PracticeExam[]>([]);
    const [availableSubjects, setAvailableSubjects] = React.useState<string[]>([]);
    
    const [isBankDialogOpen, setIsBankDialogOpen] = React.useState(false);
    const [isExamDialogOpen, setIsExamDialogOpen] = React.useState(false);
    const [editingBank, setEditingBank] = React.useState<QuestionBank | null>(null);
    const [editingExam, setEditingExam] = React.useState<PracticeExam | null>(null);

    React.useEffect(() => {
        const unsubBanks = onQuestionBanksUpdate(setQuestionBanks);
        const unsubExams = onPracticeExamsUpdate(setPracticeExams);
        const unsubSubjects = onSubjectsUpdate(setAvailableSubjects);
        return () => {
            unsubBanks();
            unsubExams();
            unsubSubjects();
        };
    }, []);

    const handleCreateSubject = async (subjectName: string) => {
        const newSubjects = [...new Set([...availableSubjects, subjectName])];
        await updateSubjects(newSubjects);
    };
    
    const openEditBankDialog = (bank: QuestionBank) => {
        setEditingBank(bank);
        setIsBankDialogOpen(true);
    }
    
    const openEditExamDialog = (exam: PracticeExam) => {
        setEditingExam(exam);
        setIsExamDialogOpen(true);
    }

    const handleBankSubmit = async (bankData: Omit<QuestionBank, 'id' | 'familyId'>, id?: string) => {
        try {
            if (id) {
                await updateQuestionBank(id, bankData);
                toast({ title: "✅ Soru Bankası Güncellendi" });
            } else {
                await addQuestionBank(bankData);
                toast({ title: "✅ Soru Bankası Oluşturuldu" });
            }
            setEditingBank(null);
            setIsBankDialogOpen(false);
        } catch (error) {
             toast({ title: "❌ Kaydetme Hatası", variant: 'destructive'});
        }
    };

    const handleDeleteBank = async (bankId: string) => {
        try {
            await deleteQuestionBank(bankId);
            toast({ title: "🗑️ Soru Bankası Silindi", variant: "destructive" });
        } catch (error) {
             toast({ title: "❌ Silme Hatası", variant: 'destructive'});
        }
    };

    const handleExamSubmit = async (examData: Omit<PracticeExam, 'id' | 'familyId'>, id?: string) => {
        try {
            if (id) {
                await updatePracticeExam(id, examData);
                toast({ title: "✅ Deneme Sınavı Güncellendi" });
            } else {
                await addPracticeExam(examData);
                toast({ title: "✅ Deneme Sınavı Oluşturuldu" });
            }
            setEditingExam(null);
            setIsExamDialogOpen(false);
        } catch (error) {
            toast({ title: "❌ Kaydetme Hatası", variant: 'destructive'});
        }
    };

    const handleDeleteExam = async (examId: string) => {
        try {
            await deletePracticeExam(examId);
            toast({ title: "🗑️ Deneme Sınavı Silindi", variant: "destructive" });
        } catch (error) {
            toast({ title: "❌ Silme Hatası", variant: 'destructive'});
        }
    };

    const contentByCategory = React.useMemo(() => {
        const categories: { [key: string]: { banks: QuestionBank[], exams: PracticeExam[] } } = {};
        
        availableSubjects.forEach(s => {
            if (!categories[s]) categories[s] = { banks: [], exams: [] };
        });
        if (!categories['Genel Deneme Sınavları']) categories['Genel Deneme Sınavları'] = { banks: [], exams: [] };
        if (!categories['Serbest Etkinlikler']) categories['Serbest Etkinlikler'] = { banks: [], exams: [] };

        questionBanks.forEach(bank => {
            bank.subjects.forEach(subject => {
                if (categories[subject.name]) {
                    if (!categories[subject.name].banks.find(b => b.id === bank.id)) {
                        categories[subject.name].banks.push(bank);
                    }
                } else {
                     if (!categories['Serbest Etkinlikler'].banks.find(b => b.id === bank.id)) {
                        categories['Serbest Etkinlikler'].banks.push(bank);
                    }
                }
            });
        });

        practiceExams.forEach(exam => {
            categories['Genel Deneme Sınavları'].exams.push(exam);
        });

        return categories;
    }, [questionBanks, practiceExams, availableSubjects]);


    return (
        <>
            <PageHeader title="İçerik Yönetimi">
                <Link href="/education">
                    <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Eğitim Sayfası</Button>
                </Link>
                <Dialog>
                    <DialogTrigger asChild>
                       <Button><PlusCircle className="mr-2 h-4 w-4" /> Yeni İçerik Ekle</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Ne Oluşturmak İstersiniz?</DialogTitle>
                        </DialogHeader>
                         <div className="grid grid-cols-2 gap-4 py-4">
                            <Button variant="outline" className="h-24" onClick={() => setIsBankDialogOpen(true)}>Soru Bankası</Button>
                            <Button variant="outline" className="h-24" onClick={() => setIsExamDialogOpen(true)}>Deneme Sınavı</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </PageHeader>
            
            <Accordion type="multiple" defaultValue={Object.keys(contentByCategory)} className="w-full space-y-4">
                {Object.entries(contentByCategory).map(([category, content]) => {
                    const Icon = categoryIcons[category] || BookCopy;
                    const totalCount = content.banks.length + content.exams.length;
                    
                    if (totalCount === 0) return null;

                    return (
                        <Card key={category}>
                             <AccordionItem value={category} className="border-b-0">
                                <AccordionTrigger className="p-4 hover:no-underline">
                                    <div className="flex items-center gap-3">
                                        <Icon className="w-8 h-8" />
                                        <div className="text-left">
                                            <h3 className="text-lg font-semibold">{category}</h3>
                                            <p className="text-sm text-muted-foreground">{totalCount} içerik bulundu</p>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-4 pt-0">
                                    <div className="space-y-3">
                                        {content.banks.map(bank => (
                                            <Card key={bank.id} className="p-3">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="font-semibold">{bank.name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {bank.subjects.length} Ders, {bank.subjects.reduce((acc, s) => acc + s.topics.length, 0)} Konu
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Button variant="ghost" size="icon" onClick={() => openEditBankDialog(bank)}><Edit className="w-4 h-4"/></Button>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4"/></Button></AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader><AlertDialogTitle>Soru bankasını sil?</AlertDialogTitle><AlertDialogDescription>"{bank.name}" kalıcı olarak silinecektir.</AlertDialogDescription></AlertDialogHeader>
                                                                <AlertDialogFooter><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteBank(bank.id)}>Sil</AlertDialogAction></AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                         {content.exams.map(exam => (
                                            <Card key={exam.id} className="p-3">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="font-semibold">{exam.name}</p>
                                                         <p className="text-xs text-muted-foreground">
                                                            {exam.subjects.length} Ders, {exam.subjects.reduce((acc, s) => acc + s.questionCount, 0)} Soru
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Button variant="ghost" size="icon" onClick={() => openEditExamDialog(exam)}><Edit className="w-4 h-4"/></Button>
                                                         <AlertDialog>
                                                            <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4"/></Button></AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader><AlertDialogTitle>Deneme sınavını sil?</AlertDialogTitle><AlertDialogDescription>"{exam.name}" kalıcı olarak silinecektir.</AlertDialogDescription></AlertDialogHeader>
                                                                <AlertDialogFooter><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteExam(exam.id)}>Sil</AlertDialogAction></AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Card>
                    )
                })}
            </Accordion>
            
            <Dialog open={isBankDialogOpen} onOpenChange={(open) => { if(!open) setEditingBank(null); setIsBankDialogOpen(open); }}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingBank ? "Soru Bankasını Düzenle" : "Yeni Soru Bankası Oluştur"}</DialogTitle>
                    </DialogHeader>
                    <NewQuestionBankForm 
                        onSubmit={handleBankSubmit} 
                        initialData={editingBank}
                        availableSubjects={availableSubjects}
                        onSubjectCreated={handleCreateSubject}
                    />
                </DialogContent>
            </Dialog>

            <Dialog open={isExamDialogOpen} onOpenChange={(open) => { if(!open) setEditingExam(null); setIsExamDialogOpen(open); }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingExam ? "Deneme Sınavını Düzenle" : "Yeni Deneme Sınavı Oluştur"}</DialogTitle>
                    </DialogHeader>
                    <NewPracticeExamForm 
                        onSubmit={handleExamSubmit}
                        initialData={editingExam}
                        availableSubjects={availableSubjects}
                        onSubjectCreated={handleCreateSubject}
                    />
                </DialogContent>
            </Dialog>
        </>
    );

    