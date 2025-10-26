

"use client";

import * as React from "react";
import Link from "next/link";
import { PlusCircle, Edit, Trash2, ArrowLeft, BookCopy, ClipboardList, Send, Archive, Settings, MoreVertical, BarChart3, CheckCircle, X, MinusCircle, BookHeart, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

import { Test, FamilyMember } from "@/lib/data";
import {
  onTestsUpdate,
  deleteTest,
  updateTest
} from "@/lib/dataService";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-provider";

import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

const categoryIcons: { [key: string]: React.ElementType } = {
    'Matematik': FileText,
    'Fen Bilimleri': FileText,
    'Türkçe': FileText,
    'Sosyal Bilgiler': FileText,
    'İngilizce': FileText,
    'Diğer': FileText,
    'Genel Deneme Sınavları': ClipboardList,
};

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
    
    const testsBySubject = React.useMemo(() => {
        const grouped: { [subject: string]: Test[] } = {};
        tests.filter(t => !t.isArchived).forEach(test => {
            const subject = test.subject || 'Diğer';
            if (!grouped[subject]) {
                grouped[subject] = [];
            }
            grouped[subject].push(test);
        });
        return grouped;
    }, [tests]);

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
                            <BookHeart className="mr-2 h-4 w-4" /> Konu Anlatım Planları
                        </Button>
                    </Link>
                    <Link href="/education/management/questions">
                        <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none">
                            <BookCopy className="mr-2 h-4 w-4" /> Soru Bankası
                        </Button>
                    </Link>
                </div>
            </PageHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {Object.entries(testsBySubject).map(([subject, subjectTests]) => {
                    const total = subjectTests.length;
                    const completed = subjectTests.filter(t => t.status === 'Sonuçlandı').length;
                    const pending = total - completed;
                    const Icon = categoryIcons[subject] || FileText;

                    return (
                        <Card key={subject} className="flex flex-col">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <Icon className="h-6 w-6 text-primary" />
                                    <CardTitle>{subject}</CardTitle>
                                </div>
                                <div className="flex justify-between text-sm text-muted-foreground pt-2">
                                    <span>Toplam: <Badge>{total}</Badge></span>
                                    <span>Bekleyen: <Badge variant="secondary">{pending}</Badge></span>
                                    <span>Çözülen: <Badge variant="outline">{completed}</Badge></span>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <Accordion type="single" collapsible className="w-full">
                                    <AccordionItem value="item-1">
                                        <AccordionTrigger>Tüm Testler ({total})</AccordionTrigger>
                                        <AccordionContent className="space-y-3 pt-2">
                                            {subjectTests.map(test => (
                                                 <TestManagementCard 
                                                    key={test.id} 
                                                    test={test}
                                                    familyMembers={familyMembers}
                                                    onArchive={handleArchiveTest}
                                                    onDelete={handleDeleteTest}
                                                />
                                            ))}
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </CardContent>
                        </Card>
                    )
                })}
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
        <Card className="flex flex-col text-sm">
            <CardHeader className="p-3">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-base">{test.title}</CardTitle>
                    <Badge variant={isCompleted ? "default" : "outline"} className={cn("text-xs", isCompleted && "bg-green-600", isPendingGrade && "bg-yellow-500 text-yellow-900")}>{test.status}</Badge>
                </div>
                <CardDescription className="text-xs">
                    {student?.name || 'Bilinmeyen'}
                </CardDescription>
            </CardHeader>
            {isCompleted && (
                 <CardContent className="p-3">
                    <div className="space-y-2">
                        <Progress value={scorePercentage} className="h-1.5" />
                        <div className="flex justify-between text-xs font-medium">
                            <span className="flex items-center gap-1 text-green-600"><CheckCircle className="h-3 w-3"/> D: {test.correctAnswers}</span>
                            <span className="flex items-center gap-1 text-red-600"><X className="h-3 w-3"/> Y: {test.incorrectAnswers}</span>
                            <span className="flex items-center gap-1 text-gray-500"><MinusCircle className="h-3 w-3"/> B: {test.emptyAnswers}</span>
                        </div>
                    </div>
                </CardContent>
            )}
            <CardFooter className="flex justify-end gap-1 bg-muted/30 p-2 mt-auto">
                 {isPendingGrade && (
                     <Link href={`/education/${test.id}`}>
                        <Button variant="secondary" size="sm" className="text-xs h-7">Not Ver</Button>
                     </Link>
                )}
                <Link href={`/education/management/assign?edit=${test.id}`}>
                    <Button variant="ghost" size="sm" className="text-xs h-7"><Edit className="w-3 h-3 mr-1"/>Düzenle</Button>
                </Link>
                {isCompleted && <Button variant="secondary" size="sm" className="text-xs h-7" onClick={() => onArchive(test)}><Archive className="w-3 h-3 mr-1"/>Arşivle</Button>}
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="text-xs h-7"><Trash2 className="w-3 h-3 mr-1"/>Sil</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Ödevi Sil</AlertDialogTitle><AlertDialogDescription>"{test.title}" ödevini kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => onDelete(test.id)}>Evet, Sil</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardFooter>
        </Card>
    );
}
