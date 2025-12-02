

"use client";

import * as React from "react";
import Link from "next/link";
import { PlusCircle, Edit, Trash2, ArrowLeft, BookCopy, ClipboardList, Send, Archive, Settings, MoreVertical, BarChart3, CheckCircle, X, MinusCircle, BookHeart, FileText, BookMarked, Check, Percent, ThumbsDown, ThumbsUp, Library } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

import { Test, FamilyMember } from "@/lib/data";
import {
  onTestsUpdate,
  deleteTest,
  updateTest
} from "@/lib/dataService";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-provider";
import { getCategoryName } from "@/app/education/page";

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

const cardColors = [
    'from-blue-500 to-indigo-600',
    'from-green-500 to-teal-600',
    'from-pink-500 to-purple-600',
    'from-orange-400 to-rose-400',
    'from-yellow-400 to-amber-500',
    'from-lime-500 to-green-600',
];

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
    
    const testsBySubject = React.useMemo(() => {
        const grouped: { [subject: string]: Test[] } = {};
        // Only include tests that have been assigned to a student
        tests.filter(test => test.studentId).forEach(test => {
            const subject = getCategoryName(test);
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
                    <Link href="/education/management/questions">
                        <Button className="bg-white/20 text-white hover:bg-white/30 border-none"><PlusCircle className="mr-2 h-4 w-4" /> Yeni Ödev Ata</Button>
                    </Link>
                    <Link href="/education/management/practice-exams">
                        <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none">
                            <ClipboardList className="mr-2 h-4 w-4" /> Deneme Sınavları
                        </Button>
                    </Link>
                    <Link href="/education/management/study-plans">
                        <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none">
                            <BookHeart className="mr-2 h-4 w-4" /> Konu Anlatım Planları
                        </Button>
                    </Link>
                     <Link href="/education/books">
                        <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none">
                            <BookMarked className="mr-2 h-4 w-4" /> Kitap Takibi
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
                <Link href="/education/all-tests" className="block h-full group">
                    <Card className="flex flex-col h-full hover:shadow-lg transition-shadow border-0 bg-gradient-to-br from-slate-500 to-slate-700 text-white group-hover:-translate-y-1">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <Library className="h-6 w-6 text-white" />
                                <CardTitle>Tüm Ödevler</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-4">
                             <p className="text-sm text-white/80">Tüm öğrencilere atanmış bütün ödevleri tek bir yerden görüntüleyin ve yönetin.</p>
                        </CardContent>
                    </Card>
                </Link>
                {Object.entries(testsBySubject).map(([subject, subjectTests], index) => {
                    const total = subjectTests.length;
                    const completedTests = subjectTests.filter(t => t.status === 'Sonuçlandı');
                    const completed = completedTests.length;
                    const pending = total - completed;
                    const Icon = categoryIcons[subject] || FileText;
                    
                    const totalCorrect = completedTests.reduce((sum, test) => sum + (test.correctAnswers || 0), 0);
                    const totalIncorrect = completedTests.reduce((sum, test) => sum + (test.incorrectAnswers || 0), 0);
                    const totalEmpty = completedTests.reduce((sum, test) => sum + (test.emptyAnswers || 0), 0);
                    const totalQuestions = totalCorrect + totalIncorrect + totalEmpty;
                    const successRate = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

                    return (
                        <Card key={subject} className={cn("flex flex-col hover:shadow-lg transition-shadow border-0 bg-gradient-to-br text-white", cardColors[index % cardColors.length])}>
                           <CardHeader>
                                <div className="flex items-center gap-3">
                                    <Icon className="h-6 w-6 text-white" />
                                    <CardTitle>{subject}</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-4">
                                <div className="flex justify-between text-sm text-white/80">
                                    <span>Toplam: <Badge variant="secondary" className="bg-white/20 text-white border-none">{total}</Badge></span>
                                    <span>Bekleyen: <Badge variant="secondary" className="bg-white/20 text-white border-none">{pending}</Badge></span>
                                    <span>Çözülen: <Badge variant="secondary" className="bg-white/20 text-white border-none">{completed}</Badge></span>
                                </div>
                                {completed > 0 && (
                                    <div className="space-y-3 text-sm text-white/80 pt-4 border-t border-white/20">
                                        <h4 className="font-semibold text-white">Çözüm İstatistikleri</h4>
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div className="p-2 rounded bg-white/10"><p className="flex items-center justify-center gap-1 text-green-300"><CheckCircle className="h-3 w-3"/>Doğru</p><p className="font-bold text-white text-base">{totalCorrect}</p></div>
                                            <div className="p-2 rounded bg-white/10"><p className="flex items-center justify-center gap-1 text-red-300"><X className="h-3 w-3"/>Yanlış</p><p className="font-bold text-white text-base">{totalIncorrect}</p></div>
                                            <div className="p-2 rounded bg-white/10"><p className="flex items-center justify-center gap-1"><MinusCircle className="h-3 w-3"/>Boş</p><p className="font-bold text-white text-base">{totalEmpty}</p></div>
                                        </div>
                                         <div>
                                            <div className="flex justify-between text-xs text-white/80 mb-1">
                                                <span>Başarı Oranı</span>
                                                <span>{successRate.toFixed(1)}%</span>
                                            </div>
                                            <Progress value={successRate} className="h-1.5 bg-white/20" indicatorClassName="bg-white" />
                                        </div>
                                    </div>
                                )}
                           </CardContent>
                           <CardFooter>
                                <Link href={`/education/category/${encodeURIComponent(subject)}`} className="w-full">
                                    <Button variant="secondary" className="w-full bg-white/20 hover:bg-white/30 text-white">Detayları Gör</Button>
                                </Link>
                           </CardFooter>
                        </Card>
                    )
                })}
            </div>
        </>
    );
}
