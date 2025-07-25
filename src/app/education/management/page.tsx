
"use client";

import * as React from "react";
import Link from "next/link";
import { PlusCircle, Edit, Trash2, ArrowLeft, Ruler, TestTube2, BookCopy, Globe, MessageSquare, Gamepad2, ClipboardList } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
            categories[s] = { banks: [], exams: [] };
        });
        categories['Genel Deneme Sınavları'] = { banks: [], exams: [] };
        categories['Serbest Etkinlikler'] = { banks: [], exams: [] };

        questionBanks.forEach(bank => {
            bank.subjects.forEach(subject => {
                if (categories[subject.name]) {
                    if (!categories[subject.name].banks.find(b => b.id === bank.id)) {
                        categories[subject.name].banks.push(bank);
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
                    <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Geri</Button>
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

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {Object.entries(contentByCategory).map(([category, content]) => {
                    const Icon = categoryIcons[category] || BookCopy;
                    const colorClass = categoryColors[category] || 'border-gray-500/80 text-gray-600';
                    const totalCount = content.banks.length + content.exams.length;
                    
                    if (totalCount === 0 && category !== 'Genel Deneme Sınavları' && !availableSubjects.includes(category)) return null;

                    return (
                        <Card key={category} className={`group relative cursor-pointer hover:shadow-lg transition-shadow border-2 ${colorClass} bg-card`}>
                            <CardHeader className="items-center text-center p-4">
                                <Icon className="w-16 h-16 mb-2" />
                                <CardTitle className="text-xl">{category}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0 text-center">
                                <p className="text-muted-foreground">{totalCount} Adet Sınav</p>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
            
            <Dialog open={isBankDialogOpen} onOpenChange={setIsBankDialogOpen}>
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

            <Dialog open={isExamDialogOpen} onOpenChange={setIsExamDialogOpen}>
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
}

    