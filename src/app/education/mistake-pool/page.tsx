
"use client";

import * as React from "react";
import Link from 'next/link';
import { useAuth } from "@/components/auth-provider";
import { Mistake, Test, FamilyMember } from "@/lib/data";
import { onMistakesUpdate, onTestsUpdate, addTest, updateMistake } from "@/lib/dataService";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ArrowRight, BookCopy, Ruler, TestTube2, Globe, MessageSquare, Gamepad2, Send, Edit, NotebookText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { EditMistakeForm } from "@/components/edit-mistake-form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { compareDesc, parse, format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { NewMistakeForm } from "@/components/new-mistake-form";
import { Badge } from "@/components/ui/badge";

export default function MistakePoolDashboardPage() {
    const { user, familyMembers } = useAuth();
    const [allMistakes, setAllMistakes] = React.useState<Mistake[]>([]);
    const [allTests, setAllTests] = React.useState<Test[]>([]);
    const [selectedMistakeIds, setSelectedMistakeIds] = React.useState<string[]>([]);
    const [targetStudentId, setTargetStudentId] = React.useState<string>('');
    const [editingMistake, setEditingMistake] = React.useState<Mistake | null>(null);
    const [isNewMistakeFormOpen, setIsNewMistakeFormOpen] = React.useState(false);
    const { toast } = useToast();

    const studentMembers = React.useMemo(() => 
        familyMembers.filter(m => m.role.includes('Çocuk')), 
    [familyMembers]);

    React.useEffect(() => {
        if (!user) return;
        const unsubscribeMistakes = onMistakesUpdate(setAllMistakes);
        const unsubscribeTests = onTestsUpdate(setAllTests);
        return () => {
            unsubscribeMistakes();
            unsubscribeTests();
        };
    }, [user]);

    const handleSelectionChange = (mistakeId: string, isSelected: boolean) => {
        setSelectedMistakeIds(prev => 
            isSelected ? [...prev, mistakeId] : prev.filter(id => id !== mistakeId)
        );
    };

    const handleAssignTest = async (mistakesToAssign: Mistake[], studentId: string) => {
        if (mistakesToAssign.length === 0) {
            toast({ title: 'Hata', description: 'Lütfen en az bir soru seçin.', variant: 'destructive' });
            return;
        }
        if (!studentId) {
            toast({ title: 'Hata', description: 'Lütfen bir öğrenci seçin.', variant: 'destructive' });
            return;
        }

        const firstMistake = mistakesToAssign[0];
        const originalTest = allTests.find(t => t.id === firstMistake.testId);
        
        const testTitle = originalTest ? `${originalTest.title} Tekrar Testi` : "Yanlış Sorular Tekrar Testi";
        
        const testData: Omit<Test, 'id' | 'familyId'> = {
            title: testTitle,
            subject: "Yanlış Havuzu",
            studentId: studentId,
            questionCount: mistakesToAssign.length,
            assignedDate: format(new Date(), 'dd MMMM yyyy', { locale: tr }),
            dueDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'dd MMMM yyyy', { locale: tr }),
            sourceType: 'mistake',
            mistakeIds: mistakesToAssign.map(m => m.id),
            gradingType: 'manual-text',
            status: 'Atandı',
            isArchived: false
        };
        
        try {
            await addTest(testData);
            toast({ title: 'Ödev Atandı!', description: 'Yanlış sorular tekrar testi olarak atandı.'});
            setSelectedMistakeIds([]);
        } catch (e) {
            toast({ title: 'Hata', description: 'Ödev atanırken bir sorun oluştu.', variant: 'destructive' });
        }
    };
    
   const groupedMistakes = React.useMemo(() => {
    const grouped: { [key: string]: { type: 'test' | 'manual'; title: string; studentName?: string; studentId: string; mistakes: Mistake[] } } = {};
    const unassignedMistakes = allMistakes.filter(m => m.status === 'active');

    unassignedMistakes.forEach(mistake => {
        let key: string;
        let groupTitle: string;
        let type: 'test' | 'manual';
        let studentName: string | undefined;
        let studentId = '';

        if (mistake.testId) {
            const testInfo = allTests.find(t => t.id === mistake.testId);
            if (!testInfo) return; // Skip if original test not found
            
            key = `test-${mistake.testId}`;
            groupTitle = testInfo.title;
            const student = familyMembers.find(m => m.id === testInfo.studentId);
            studentName = student?.name;
            studentId = student?.id || '';
            type = 'test';
        } else {
            key = `manual-${mistake.subject || 'Diğer'}-${mistake.creatorId}`;
            groupTitle = `Manuel Eklenenler: ${mistake.subject || 'Diğer'}`;
            const student = familyMembers.find(m => m.id === mistake.creatorId);
            studentName = student?.name;
            studentId = student?.id || '';
            type = 'manual';
        }

        if (!studentId) return;

        if (!grouped[key]) {
            grouped[key] = { type, title: groupTitle, studentName, studentId, mistakes: [] };
        }
        grouped[key].mistakes.push(mistake);
    });
    
    return Object.values(grouped).sort((a,b) => a.title.localeCompare(b.title));
}, [allMistakes, allTests, familyMembers]);
    
    return (
        <div className="space-y-6">
            <PageHeader title="Yanlış Havuzu">
                 <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <p className="text-sm text-white/80 max-w-2xl">
                        Burada, değerlendirilmiş testlerdeki tüm yanlış ve boş sorular birikir.
                        İstediğiniz soruları seçip tekrar testi olarak atayabilir veya yeni yanlış sorusu ekleyebilirsiniz.
                    </p>
                    <Dialog open={isNewMistakeFormOpen} onOpenChange={setIsNewMistakeFormOpen}>
                        <DialogTrigger asChild>
                             <Button className="bg-white/20 text-white hover:bg-white/30 border-none">Yeni Yanlış Soru Ekle</Button>
                        </DialogTrigger>
                        <DialogContent>
                             <DialogHeader>
                                <DialogTitle>Yeni Yanlış Soru Ekle</DialogTitle>
                                <DialogDescription>Kamerayla fotoğrafını çekerek veya dosya yükleyerek yanlış soruları havuza ekleyin.</DialogDescription>
                            </DialogHeader>
                            <NewMistakeForm onFormSubmit={() => setIsNewMistakeFormOpen(false)} />
                        </DialogContent>
                    </Dialog>
                </div>
            </PageHeader>
            
            {groupedMistakes.length > 0 ? (
                 <div className="space-y-4">
                    {groupedMistakes.map(group => {
                        return (
                             <Card key={group.title + group.studentId}>
                                <CardHeader>
                                     <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle>{group.title}</CardTitle>
                                            <CardDescription>
                                                {group.studentName} öğrencisine ait {group.mistakes.length} yanlış/boş soru
                                            </CardDescription>
                                        </div>
                                        <Button onClick={() => handleAssignTest(group.mistakes, group.studentId)}>
                                            <Send className="mr-2 h-4 w-4"/> Tümünü Tekrar Ata
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {group.mistakes.map(mistake => (
                                            <div key={mistake.id} className="flex items-start gap-4 p-3 border rounded-lg">
                                                <div className="flex-grow">
                                                    <p className="font-semibold">{mistake.subject} - {mistake.topic}</p>
                                                    {mistake.originalQuestionId && (
                                                       <p className="text-sm text-muted-foreground">Soru #{mistake.originalQuestionId}</p>
                                                    )}
                                                    {mistake.imageUrl && (
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <Image src={mistake.imageUrl} alt="Yanlış Soru" width={150} height={200} className="mt-2 rounded-md object-cover cursor-pointer" data-ai-hint="question paper" />
                                                            </DialogTrigger>
                                                            <DialogContent className="max-w-4xl">
                                                                 <Image src={mistake.imageUrl} alt="Yanlış Soru" width={800} height={1000} className="w-full h-auto" data-ai-hint="question paper" />
                                                            </DialogContent>
                                                        </Dialog>
                                                    )}
                                                </div>
                                                <Button variant="outline" size="sm" onClick={() => setEditingMistake(mistake)}>
                                                    <Edit className="mr-2 h-4 w-4"/>
                                                    Geri Bildirim
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            ) : (
                 <Card>
                    <CardContent className="p-8 text-center text-muted-foreground flex items-center justify-center gap-4">
                        <AlertCircle className="h-8 w-8 text-primary"/>
                        <div>
                            <p className="font-semibold">Yanlış havuzu boş.</p>
                            <p className="text-sm">Bir test değerlendirildiğinde yanlış veya boş sorular buraya eklenecektir.</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Dialog open={!!editingMistake} onOpenChange={(open) => !open && setEditingMistake(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Geri Bildirim Ekle</DialogTitle>
                        <DialogDescription>
                            Bu soru için doğru cevabı ve çözüm görselini ekleyin.
                        </DialogDescription>
                    </DialogHeader>
                    {editingMistake && (
                        <EditMistakeForm 
                            mistake={editingMistake}
                            onFormSubmit={() => setEditingMistake(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
