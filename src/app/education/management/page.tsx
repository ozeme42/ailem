
"use client";

import * as React from "react";
import Link from "next/link";
import { PlusCircle, Edit, Trash2, ArrowLeft, BookCopy, ClipboardList, Send, Archive, Settings, MoreVertical, BarChart3, CheckCircle, X, MinusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter as AlertDialogFooterComponent, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { NewQuestionBankForm } from "@/components/new-question-bank-form";
import { Test, FamilyMember } from "@/lib/data";
import {
  onTestsUpdate,
  deleteTest,
  updateTest
} from "@/lib/dataService";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-provider";
import { ManualGradeForm, ManualGradeData } from "@/components/manual-grade-form";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

export default function EducationManagementPage() {
    const { toast } = useToast();
    const { familyMembers, familyId } = useAuth();
    const gradeFormRef = React.useRef<{ submit: () => void }>(null);


    const [tests, setTests] = React.useState<Test[]>([]);
    
    const [isGradeDialogOpen, setIsGradeDialogOpen] = React.useState(false);
    const [gradingTest, setGradingTest] = React.useState<Test | null>(null);
    
    const studentMembers = React.useMemo(() => 
        familyMembers.filter(m => m.role.includes('Çocuk')), 
    [familyMembers]);

    React.useEffect(() => {
        const unsubTests = onTestsUpdate(setTests);
        return () => unsubTests();
    }, []);
    
    const testsAwaitingGrading = React.useMemo(() => {
        return tests.filter(test => test.status === 'Değerlendirme Bekliyor');
    }, [tests]);

    const openGradeDialog = (test: Test) => {
        setGradingTest(test);
        setIsGradeDialogOpen(true);
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
            };

            await updateTest(gradingTest.id, updatedData);
            
            toast({ title: "✅ Test Değerlendirildi", description: `${gradingTest.title} için sonuçlar kaydedildi.` });
            setIsGradeDialogOpen(false);
            setGradingTest(null);
        } catch (error) {
            console.error("Error grading test:", error);
            toast({ title: "❌ Değerlendirme Hatası", description: "Sonuçlar kaydedilirken bir hata oluştu.", variant: 'destructive' });
        }
    };
    
    return (
        <>
            <PageHeader title="İçerik Yönetimi">
                <Link href="/education">
                    <Button className="bg-white/20 text-white hover:bg-white/30 border-none"><ArrowLeft className="mr-2 h-4 w-4" /> Eğitim Sayfası</Button>
                </Link>
                 <Link href="/education/management/assign">
                    <Button className="bg-white/20 text-white hover:bg-white/30 border-none"><PlusCircle className="mr-2 h-4 w-4" /> Yeni Ödev Ata</Button>
                </Link>
                 <Link href="/education/management/questions">
                    <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none">
                        <BookCopy className="mr-2 h-4 w-4" /> Soru Bankası
                    </Button>
                </Link>
            </PageHeader>
            
            {testsAwaitingGrading.length > 0 && (
                <Card className="mb-6 border-primary/50 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-primary">
                            <ClipboardList />
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
                                     <div className="flex items-center gap-1">
                                        <Button size="sm" onClick={() => openGradeDialog(test)}>
                                            Sonuç Gir
                                        </Button>
                                         <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4"/></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitleComponent>Ödevi sil?</AlertDialogTitleComponent>
                                                    <AlertDialogDescription>"{test.title}" ödevi kalıcı olarak silinecektir.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooterComponent><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteTest(test.id)}>Sil</AlertDialogAction></AlertDialogFooterComponent>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                     </div>
                                 </div>
                             )
                        })}
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {tests.filter(t => !t.isArchived).map(test => (
                    <TestManagementCard 
                        key={test.id} 
                        test={test}
                        familyMembers={familyMembers}
                        onGrade={openGradeDialog}
                        onArchive={handleArchiveTest}
                        onDelete={handleDeleteTest}
                    />
                ))}
            </div>
            
            <Dialog open={isGradeDialogOpen} onOpenChange={setIsGradeDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Testi Değerlendir: {gradingTest?.title}</DialogTitle>
                    </DialogHeader>
                    {gradingTest && (
                        <ManualGradeForm
                            ref={gradeFormRef}
                            test={gradingTest}
                            onSave={handleGradeSubmit}
                        />
                    )}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsGradeDialogOpen(false)}>İptal</Button>
                        <Button onClick={() => gradeFormRef.current?.submit()}>Değerlendirmeyi Tamamla</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
        </>
    );
}


function TestManagementCard({ test, familyMembers, onGrade, onArchive, onDelete }: {
    test: Test,
    familyMembers: any[],
    onGrade: (test: Test) => void,
    onArchive: (test: Test) => void,
    onDelete: (id: string) => void,
}) {
    const student = familyMembers.find(m => m.id === test.studentId);
    const isCompleted = test.status === 'Sonuçlandı';
    const scorePercentage = test.score || 0;

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{test.title}</CardTitle>
                    <Badge variant={isCompleted ? "default" : "outline"} className={cn(isCompleted && "bg-green-600")}>{test.status}</Badge>
                </div>
                <CardDescription>
                    {student?.name || 'Bilinmeyen'} - {test.subject}
                </CardDescription>
            </CardHeader>
            {isCompleted && (
                 <CardContent>
                    <div className="space-y-3">
                        <Progress value={scorePercentage} className="h-2" />
                        <div className="flex justify-between text-sm font-medium">
                            <span className="flex items-center gap-1.5 text-green-600"><CheckCircle className="h-4 w-4"/> Doğru: {test.correctAnswers}</span>
                            <span className="flex items-center gap-1.5 text-red-600"><X className="h-4 w-4"/> Yanlış: {test.incorrectAnswers}</span>
                            <span className="flex items-center gap-1.5 text-gray-500"><MinusCircle className="h-4 w-4"/> Boş: {test.emptyAnswers}</span>
                        </div>
                    </div>
                </CardContent>
            )}
            <CardFooter className="flex justify-end gap-2 bg-muted/50 p-3 mt-auto">
                <Link href={`/education/management/assign?edit=${test.id}`}>
                    <Button variant="ghost" size="sm"><Edit className="w-4 h-4 mr-2"/>Düzenle</Button>
                </Link>
                {isCompleted ? (
                    <Button variant="outline" size="sm" onClick={() => onGrade(test)}><Edit className="w-4 h-4 mr-2"/>Yeniden Değerlendir</Button>
                ) : null}
                
                {isCompleted && <Button variant="secondary" size="sm" onClick={() => onArchive(test)}><Archive className="w-4 h-4 mr-2"/>Arşivle</Button>}
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm"><Trash2 className="w-4 h-4 mr-2"/>Sil</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitleComponent>Ödevi Sil</AlertDialogTitleComponent><AlertDialogDescription>"{test.title}" ödevini kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooterComponent><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => onDelete(test.id)}>Evet, Sil</AlertDialogAction></AlertDialogFooterComponent>
                    </AlertDialogContent>
                </AlertDialog>
            </CardFooter>
        </Card>
    );
}