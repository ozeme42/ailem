
"use client";

import * as React from "react";
import Link from "next/link";
import { PlusCircle, Edit, Trash2, ArrowLeft, Ruler, TestTube2, BookCopy, Globe, MessageSquare, Gamepad2, ClipboardList, Send, FilePen, Archive } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { NewQuestionBankForm } from "@/components/new-question-bank-form";
import { NewPracticeExamForm } from "@/components/new-practice-exam-form";
import { NewTestForm } from "@/components/new-test-form";
import { QuestionBank, PracticeExam, Test } from "@/lib/data";
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
  onTestsUpdate,
  deleteTest,
  addTest,
  updateTest,
  checkAndAwardBadges
} from "@/lib/dataService";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-provider";
import { ManualGradeForm, ManualGradeData } from "@/components/manual-grade-form";

const categoryIcons: { [key: string]: React.ElementType } = {
    'Genel Deneme Sınavları': ClipboardList,
    'Atanmış Ödevler': Send,
    'Matematik': Ruler,
    'Fen Bilimleri': TestTube2,
    'Türkçe': BookCopy,
    'Sosyal Bilgiler': Globe,
    'İngilizce': MessageSquare,
    'Serbest Etkinlikler': Gamepad2
};

const categoryColors: { [key: string]: string } = {
    'Genel Deneme Sınavları': 'border-yellow-500/80 text-yellow-600',
    'Atanmış Ödevler': 'border-teal-500/80 text-teal-600',
    'Matematik': 'border-red-500/80 text-red-600',
    'Fen Bilimleri': 'border-orange-500/80 text-orange-600',
    'Türkçe': 'border-yellow-400/80 text-yellow-500',
    'Sosyal Bilgiler': 'border-cyan-500/80 text-cyan-600',
    'İngilizce': 'border-blue-500/80 text-blue-600',
    'Serbest Etkinlikler': 'border-purple-500/80 text-purple-600',
};


export default function EducationManagementPage() {
    const { toast } = useToast();
    const { familyMembers, familyId } = useAuth();

    const [questionBanks, setQuestionBanks] = React.useState<QuestionBank[]>([]);
    const [practiceExams, setPracticeExams] = React.useState<PracticeExam[]>([]);
    const [tests, setTests] = React.useState<Test[]>([]);
    const [availableSubjects, setAvailableSubjects] = React.useState<string[]>([]);
    
    const [isBankDialogOpen, setIsBankDialogOpen] = React.useState(false);
    const [isExamDialogOpen, setIsExamDialogOpen] = React.useState(false);
    const [isTestDialogOpen, setIsTestDialogOpen] = React.useState(false);
    const [isGradeDialogOpen, setIsGradeDialogOpen] = React.useState(false);

    const [editingBank, setEditingBank] = React.useState<QuestionBank | null>(null);
    const [editingExam, setEditingExam] = React.useState<PracticeExam | null>(null);
    const [editingTest, setEditingTest] = React.useState<Test | null>(null);
    const [gradingTest, setGradingTest] = React.useState<Test | null>(null);
    
    const studentMembers = React.useMemo(() => 
        familyMembers.filter(m => m.role.includes('Çocuk')), 
    [familyMembers]);

    React.useEffect(() => {
        const unsubBanks = onQuestionBanksUpdate(setQuestionBanks);
        const unsubExams = onPracticeExamsUpdate(setPracticeExams);
        const unsubSubjects = onSubjectsUpdate(setAvailableSubjects);
        const unsubTests = onTestsUpdate(setTests);
        return () => {
            unsubBanks();
            unsubExams();
            unsubSubjects();
            unsubTests();
        };
    }, []);

    const testsAwaitingGrading = React.useMemo(() => {
        return tests.filter(test => test.status === 'Değerlendirme Bekliyor');
    }, [tests]);

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
    
    const openEditTestDialog = (test: Test) => {
        setEditingTest(test);
        setIsTestDialogOpen(true);
    }

    const openGradeDialog = (test: Test) => {
        setGradingTest(test);
        setIsGradeDialogOpen(true);
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

    const handleTestSubmit = async (testData: Omit<Test, 'id' | 'status' | 'familyId' | 'isArchived'>, id?: string) => {
        try {
            if (id) {
                await updateTest(id, testData);
                toast({ title: "✅ Ödev Güncellendi" });
            } else {
                await addTest({ ...testData, status: 'Atandı', isArchived: false });
                toast({ title: "✅ Ödev Atandı" });
            }
            setEditingTest(null);
            setIsTestDialogOpen(false);
        } catch (error) {
             toast({ title: "❌ Kaydetme Hatası", variant: 'destructive'});
        }
    };

    const handleDeleteTest = async (testId: string) => {
        try {
            await deleteTest(testId);
            toast({ title: "🗑️ Ödev Silindi", variant: "destructive" });
        } catch (error) {
             toast({ title: "❌ Silme Hatası", variant: 'destructive'});
        }
    };

    const handleArchiveTest = async (test: Test) => {
        try {
            await updateTest(test.id, { isArchived: true });
            toast({ title: "Ödev Arşivlendi", description: `"${test.title}" arşive taşındı.` });
        } catch (error) {
            toast({ title: "❌ Arşivleme Hatası", variant: 'destructive'});
        }
    }

    const handleGradeSubmit = async (gradeData: ManualGradeData) => {
        if (!gradingTest || !familyId) return;
        try {
            const score = gradingTest.questionCount > 0
                ? (gradeData.correct / gradingTest.questionCount) * 100
                : 0;

            const updatedData: Partial<Test> = {
                status: 'Sonuçlandı',
                correctAnswers: gradeData.correct,
                incorrectAnswers: gradeData.incorrect,
                emptyAnswers: gradeData.empty,
                score: score,
                studentTextAnswersEvaluation: gradeData.evaluations,
            };

            await updateTest(gradingTest.id, updatedData);
            await checkAndAwardBadges(gradingTest.studentId, familyId, { type: 'test_completed', test: { ...gradingTest, ...updatedData } });
            
            toast({ title: "✅ Test Değerlendirildi", description: `${gradingTest.title} için sonuçlar kaydedildi.` });
            setIsGradeDialogOpen(false);
            setGradingTest(null);
        } catch (error) {
            toast({ title: "❌ Değerlendirme Hatası", description: "Sonuçlar kaydedilirken bir hata oluştu.", variant: 'destructive' });
        }
    };
    
    const contentByCategory = React.useMemo(() => {
        const categories: { [key: string]: { banks: QuestionBank[], exams: PracticeExam[], tests: Test[] } } = {};
        
        availableSubjects.forEach(s => {
            if (!categories[s]) categories[s] = { banks: [], exams: [], tests: [] };
        });
        if (!categories['Genel Deneme Sınavları']) categories['Genel Deneme Sınavları'] = { banks: [], exams: [], tests: [] };
        if (!categories['Atanmış Ödevler']) categories['Atanmış Ödevler'] = { banks: [], exams: [], tests: [] };
        if (!categories['Serbest Etkinlikler']) categories['Serbest Etkinlikler'] = { banks: [], exams: [], tests: [] };
        
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

        // "Değerlendirme Bekliyor" ve arşivlenmiş olanlar bu listede gösterilmeyecek
        tests.filter(t => t.status !== 'Değerlendirme Bekliyor' && !t.isArchived).forEach(test => {
            categories['Atanmış Ödevler'].tests.push(test);
        });

        return categories;
    }, [questionBanks, practiceExams, tests, availableSubjects]);

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
            
            {testsAwaitingGrading.length > 0 && (
                <Card className="mb-6 border-primary/50 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-primary">
                            <FilePen />
                            Değerlendirme Bekleyenler ({testsAwaitingGrading.length})
                        </CardTitle>
                        <CardDescription>
                            Öğrenciler tarafından tamamlanan ve sonucunu girmeniz gereken testler.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {testsAwaitingGrading.map(test => {
                             const student = familyMembers.find(m => m.id === test.studentId);
                             return (
                                 <div key={test.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                                     <div>
                                        <p className="font-semibold">{test.title}</p>
                                        <p className="text-sm text-muted-foreground">{student?.name || 'Bilinmeyen Öğrenci'}</p>
                                     </div>
                                     <Button size="sm" onClick={() => openGradeDialog(test)}>
                                        Sonuç Gir
                                     </Button>
                                 </div>
                             )
                        })}
                    </CardContent>
                </Card>
            )}

            <Accordion type="multiple" defaultValue={Object.keys(contentByCategory)} className="w-full space-y-4">
                {Object.entries(contentByCategory).map(([category, content]) => {
                    const Icon = categoryIcons[category] || BookCopy;
                    const totalCount = content.banks.length + content.exams.length + content.tests.length;
                    
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
                                        {content.tests.map(test => {
                                            const student = familyMembers.find(m => m.id === test.studentId);
                                            return (
                                                <Card key={test.id} className="p-3">
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-semibold">{test.title}</p>
                                                                <Badge variant={test.status === 'Sonuçlandı' ? 'default' : 'outline'}>
                                                                    {test.status}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground">
                                                                {student?.name || 'Bilinmeyen Öğrenci'} - Son Teslim: {test.dueDate}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            {test.status === 'Sonuçlandı' && (
                                                                <Button variant="ghost" size="icon" onClick={() => handleArchiveTest(test)} title="Arşivle">
                                                                    <Archive className="w-4 h-4 text-muted-foreground"/>
                                                                </Button>
                                                            )}
                                                            <Button variant="ghost" size="icon" onClick={() => openEditTestDialog(test)}><Edit className="w-4 h-4"/></Button>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4"/></Button></AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader><AlertDialogTitle>Ödevi sil?</AlertDialogTitle><AlertDialogDescription>"{test.title}" ödevi kalıcı olarak silinecektir.</AlertDialogDescription></AlertDialogHeader>
                                                                    <AlertDialogFooter><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteTest(test.id)}>Sil</AlertDialogAction></AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </div>
                                                    </div>
                                                </Card>
                                            )
                                        })}
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
            
            <Dialog open={isTestDialogOpen} onOpenChange={(open) => { if(!open) setEditingTest(null); setIsTestDialogOpen(open); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingTest ? "Ödevi Düzenle" : "Yeni Ödev Ata"}</DialogTitle>
                    </DialogHeader>
                    <NewTestForm 
                        students={studentMembers} 
                        questionBanks={questionBanks}
                        practiceExams={practiceExams}
                        onAssign={handleTestSubmit}
                        initialData={editingTest}
                        availableSubjects={availableSubjects}
                        onSubjectCreated={handleCreateSubject}
                    />
                </DialogContent>
            </Dialog>

            <Dialog open={isGradeDialogOpen} onOpenChange={setIsGradeDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Testi Değerlendir</DialogTitle>
                        <DialogDescription>
                            {gradingTest?.title} testinin sonuçlarını girin.
                        </DialogDescription>
                    </DialogHeader>
                    {gradingTest && (
                        <ManualGradeForm
                            test={gradingTest}
                            onSave={handleGradeSubmit}
                            onCancel={() => setIsGradeDialogOpen(false)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
