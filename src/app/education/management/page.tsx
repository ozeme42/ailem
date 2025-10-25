

"use client";

import * as React from "react";
import Link from "next/link";
import { PlusCircle, Edit, Trash2, ArrowLeft, BookCopy, ClipboardList, Send, Archive, Settings, MoreVertical, BarChart3, CheckCircle, X, MinusCircle, BookHeart } from "lucide-react";
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
    
    const [tests, setTests] = React.useState<Test[]>([]);
    
    const studentMembers = React.useMemo(() => 
        familyMembers.filter(m => m.role.includes('Çocuk')), 
    [familyMembers]);

    React.useEffect(() => {
        const unsubTests = onTestsUpdate(setTests);
        return () => unsubTests();
    }, []);
    
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
    
    return (
        <>
            <PageHeader title="İçerik Yönetimi">
                <div className="flex flex-wrap gap-2">
                    <Link href="/education">
                        <Button className="bg-white/20 text-white hover:bg-white/30 border-none"><ArrowLeft className="mr-2 h-4 w-4" /> Eğitim Sayfası</Button>
                    </Link>
                    <Link href="/education/management/assign">
                        <Button className="bg-white/20 text-white hover:bg-white/30 border-none"><PlusCircle className="mr-2 h-4 w-4" /> Yeni Ödev Ata</Button>
                    </Link>
                    <Link href="/education/management/study-plans">
                        <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none">
                            <BookHeart className="mr-2 h-4 w-4" /> Konu Anlatımı Planları
                        </Button>
                    </Link>
                    <Link href="/education/management/questions">
                        <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none">
                            <BookCopy className="mr-2 h-4 w-4" /> Soru Bankası
                        </Button>
                    </Link>
                </div>
            </PageHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {tests.filter(t => !t.isArchived).map(test => (
                    <TestManagementCard 
                        key={test.id} 
                        test={test}
                        familyMembers={familyMembers}
                        onArchive={handleArchiveTest}
                        onDelete={handleDeleteTest}
                    />
                ))}
            </div>
        </>
    );
}


function TestManagementCard({ test, familyMembers, onArchive, onDelete }: {
    test: Test,
    familyMembers: any[],
    onArchive: (test: Test) => void,
    onDelete: (id: string) => void,
}) {
    const student = familyMembers.find(m => m.id === test.studentId);
    const { toast } = useToast();
    const isCompleted = test.status === 'Sonuçlandı';
    const isPendingGrade = test.status === 'Değerlendirme Bekliyor';
    const scorePercentage = test.score || 0;

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{test.title}</CardTitle>
                    <Badge variant={isCompleted ? "default" : "outline"} className={cn(isCompleted && "bg-green-600", isPendingGrade && "bg-yellow-500 text-yellow-900")}>{test.status}</Badge>
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
                 {isPendingGrade && (
                     <Link href={`/education/${test.id}`}>
                        <Button variant="secondary" size="sm">Not Ver</Button>
                     </Link>
                )}
                <Link href={`/education/management/assign?edit=${test.id}`}>
                    <Button variant="ghost" size="sm"><Edit className="w-4 h-4 mr-2"/>Düzenle</Button>
                </Link>
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
