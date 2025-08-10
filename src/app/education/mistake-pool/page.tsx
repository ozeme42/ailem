
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
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EditMistakeForm } from "@/components/edit-mistake-form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { compareDesc, parse } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function MistakePoolDashboardPage() {
    const { user, familyMembers } = useAuth();
    const [allMistakes, setAllMistakes] = React.useState<Mistake[]>([]);
    const [allTests, setAllTests] = React.useState<Test[]>([]);
    const [selectedMistakeIds, setSelectedMistakeIds] = React.useState<string[]>([]);
    const [targetStudentId, setTargetStudentId] = React.useState<string>('');
    const [editingMistake, setEditingMistake] = React.useState<Mistake | null>(null);
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
    
    const { testsWithMistakes, totalMistakeCount } = React.useMemo(() => {
        const mistakeByTestId = new Map<string, Mistake[]>();
        allMistakes.forEach(mistake => {
            if (mistake.testId) {
                const mistakes = mistakeByTestId.get(mistake.testId) || [];
                mistakes.push(mistake);
                mistakeByTestId.set(mistake.testId, mistakes);
            }
        });
        
        const tests = allTests
            .filter(test => mistakeByTestId.has(test.id))
            .map(test => ({
                ...test,
                mistakes: mistakeByTestId.get(test.id) || []
            }))
             .sort((a, b) => {
                try {
                    const dateA = parse(a.assignedDate, 'dd MMMM yyyy', new Date(), { locale: tr });
                    const dateB = parse(b.assignedDate, 'dd MMMM yyyy', new Date(), { locale: tr });
                    return compareDesc(dateA, dateB);
                } catch(e) {
                    return 0;
                }
            });

        return {
            testsWithMistakes: tests,
            totalMistakeCount: allMistakes.length,
        }
    }, [allMistakes, allTests]);

    return (
        <div className="space-y-6">
            <PageHeader title="Yanlış Havuzu">
                 <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <p className="text-sm text-white/80 max-w-2xl">
                        Burada, değerlendirilmiş testlerdeki tüm yanlış ve boş sorular birikir.
                        İstediğiniz soruları seçip tekrar testi olarak atayabilirsiniz.
                    </p>
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
                 <Accordion type="multiple" className="w-full space-y-4">
                    {testsWithMistakes.map(test => {
                        const student = familyMembers.find(m => m.id === test.studentId);
                        return (
                            <AccordionItem key={test.id} value={test.id} className="border-b-0">
                                <Card>
                                    <AccordionTrigger className="p-4 hover:no-underline">
                                         <div className="flex items-center gap-3">
                                            <NotebookText className="w-8 h-8" />
                                            <div className="text-left">
                                                <h3 className="text-lg font-semibold">{test.title}</h3>
                                                <p className="text-sm text-muted-foreground">
                                                   {student?.name || 'Bilinmeyen Öğrenci'} - {test.mistakes.length} yanlış/boş soru
                                                </p>
                                            </div>
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
                                                        <p className="font-semibold">{mistake.topic} - Soru #{mistake.originalQuestionId}</p>
                                                        {mistake.imageUrl && (
                                                            <Image src={mistake.imageUrl} alt="Yanlış Soru" width={150} height={200} className="mt-2 rounded-md object-cover" data-ai-hint="question paper" />
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

