
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
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
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

    const handleAssignTest = async () => {
        if (selectedMistakeIds.length === 0) {
            toast({ title: 'Hata', description: 'Lütfen en az bir soru seçin.', variant: 'destructive' });
            return;
        }
        if (!targetStudentId) {
            toast({ title: 'Hata', description: 'Lütfen bir öğrenci seçin.', variant: 'destructive' });
            return;
        }
        
        const testData: Omit<Test, 'id' | 'familyId' | 'status' | 'isArchived'> = {
            title: "Yanlış Sorular Tekrar Testi",
            subject: "Yanlış Havuzu",
            studentId: targetStudentId,
            questionCount: selectedMistakeIds.length,
            assignedDate: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
            sourceType: 'mistake',
            mistakeIds: selectedMistakeIds,
            gradingType: 'manual-text',
        };
        
        try {
            await addTest(testData);
            toast({ title: 'Ödev Atandı!', description: 'Yanlış sorular tekrar testi olarak atandı.'});
            setSelectedMistakeIds([]);
            setTargetStudentId('');
        } catch (e) {
            toast({ title: 'Hata', description: 'Ödev atanırken bir sorun oluştu.', variant: 'destructive' });
        }
    };
    
    const testsWithMistakes = React.useMemo(() => {
        const groupedByTestId: { [key: string]: Mistake[] } = {};

        // Group all mistakes by their testId
        allMistakes.forEach(mistake => {
            const key = mistake.testId || 'unassigned';
            if (!groupedByTestId[key]) {
                groupedByTestId[key] = [];
            }
            groupedByTestId[key].push(mistake);
        });

        // Map grouped mistakes to test information
        const testEntries = Object.entries(groupedByTestId).map(([testId, mistakes]) => {
            let testInfo, student;
            if (testId !== 'unassigned') {
                 testInfo = allTests.find(t => t.id === testId);
                 student = familyMembers.find(m => m.id === testInfo?.studentId);
            }
            
            return {
                id: testId,
                title: testInfo?.title || (testId !== 'unassigned' ? `Test ID: ${testId.slice(0,5)}...` : 'Manuel Eklenen Sorular'),
                studentName: student?.name,
                assignedDate: testInfo?.assignedDate || new Date().toISOString(),
                mistakes,
            };
        });
        
        // Sort tests by date, keeping 'unassigned' at the bottom
        return testEntries.sort((a, b) => {
            if (a.id === 'unassigned') return 1;
            if (b.id === 'unassigned') return -1;
            try {
                // Attempt to parse dates in "dd MMMM yyyy" format first
                const dateAStr = a.assignedDate;
                const dateBStr = b.assignedDate;
                
                const dateA = dateAStr.includes(' ') ? parse(dateAStr, 'dd MMMM yyyy', new Date(), { locale: tr }) : parseISO(dateAStr);
                const dateB = dateBStr.includes(' ') ? parse(dateBStr, 'dd MMMM yyyy', new Date(), { locale: tr }) : parseISO(dateBStr);

                if (isNaN(dateA.getTime())) return 1;
                if (isNaN(dateB.getTime())) return -1;
                return compareDesc(dateA, dateB);
            } catch(e) {
                return 0; // Fallback if date parsing fails
            }
        });
        
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
                            <Button variant="outline">Yeni Yanlış Soru Ekle</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <NewMistakeForm onFormSubmit={() => setIsNewMistakeFormOpen(false)} />
                        </DialogContent>
                    </Dialog>
                    {selectedMistakeIds.length > 0 && (
                        <Card className="p-4 w-full sm:w-auto">
                            <Label htmlFor="student-select">Seçilen {selectedMistakeIds.length} soruyu ata:</Label>
                             <div className="flex gap-2 mt-2">
                                <Select onValueChange={setTargetStudentId} value={targetStudentId}>
                                    <SelectTrigger id="student-select">
                                        <SelectValue placeholder="Öğrenci Seç" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {studentMembers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Button onClick={handleAssignTest}><Send className="mr-2 h-4 w-4" /> Ata</Button>
                            </div>
                        </Card>
                    )}
                </div>
            </PageHeader>
            
            {testsWithMistakes.length > 0 ? (
                 <Accordion type="multiple" className="w-full space-y-4" defaultValue={testsWithMistakes.map(t => t.id)}>
                    {testsWithMistakes.map(test => {
                        return (
                            <AccordionItem key={test.id} value={test.id} className="border-b-0">
                                <Card>
                                    <AccordionTrigger className="p-4 hover:no-underline">
                                         <div className="flex items-center gap-3 w-full">
                                            <NotebookText className="w-8 h-8" />
                                            <div className="text-left flex-grow">
                                                <h3 className="text-lg font-semibold">{test.title}</h3>
                                                <p className="text-sm text-muted-foreground">
                                                   {test.mistakes.length} yanlış/boş soru
                                                </p>
                                            </div>
                                            {test.studentName && <Badge variant="outline">{test.studentName}</Badge>}
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-4 pt-0">
                                        <div className="space-y-3">
                                            {test.mistakes.map(mistake => (
                                                <div key={mistake.id} className="flex items-start gap-4 p-3 border rounded-lg">
                                                    <Checkbox
                                                        id={`mistake-${mistake.id}`}
                                                        checked={selectedMistakeIds.includes(mistake.id)}
                                                        onCheckedChange={(checked) => handleSelectionChange(mistake.id, !!checked)}
                                                        className="mt-1"
                                                    />
                                                    <div className="flex-grow">
                                                        <p className="font-semibold">{mistake.subject} - {mistake.topic}</p>
                                                        <p className="text-sm text-muted-foreground">Soru #{mistake.originalQuestionId}</p>
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
                                    </AccordionContent>
                                </Card>
                            </AccordionItem>
                        )
                    })}
                </Accordion>
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
