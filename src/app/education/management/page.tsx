

"use client";

import * as React from "react";
import Link from "next/link";
import { PlusCircle, Edit, Trash2, ArrowLeft, BookCopy, ClipboardList, Send, Archive, Settings, MoreVertical, BarChart3, CheckCircle, X, MinusCircle, BookHeart, FileText } from "lucide-react";
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

const getCategoryName = (test: Test): string => {
    if (test.sourceType === 'exam') return 'Genel Deneme Sınavları';
    return test.subject || 'Diğer';
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
    
    const testsBySubject = React.useMemo(() => {
        const grouped: { [subject: string]: Test[] } = {};
        tests.filter(t => !t.isArchived).forEach(test => {
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
                        <Card key={subject} className="flex flex-col hover:shadow-lg transition-shadow">
                           <CardHeader>
                                <div className="flex items-center gap-3">
                                    <Icon className="h-6 w-6 text-primary" />
                                    <CardTitle>{subject}</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>Toplam: <Badge variant="outline">{total}</Badge></span>
                                    <span>Bekleyen: <Badge variant="secondary">{pending}</Badge></span>
                                    <span>Çözülen: <Badge variant="default" className="bg-green-600 hover:bg-green-700">{completed}</Badge></span>
                                </div>
                           </CardContent>
                           <CardFooter>
                                <Link href={`/education/category/${encodeURIComponent(subject)}`} className="w-full">
                                    <Button variant="outline" className="w-full">Detayları Gör</Button>
                                </Link>
                           </CardFooter>
                        </Card>
                    )
                })}
            </div>
        </>
    );
}
