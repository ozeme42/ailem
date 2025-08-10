
"use client";

import * as React from "react";
import Link from 'next/link';
import { useAuth } from "@/components/auth-provider";
import { Mistake, Test, FamilyMember } from "@/lib/data";
import { onMistakesUpdate, addTest } from "@/lib/dataService";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ArrowRight, BookCopy, Ruler, TestTube2, Globe, MessageSquare, Gamepad2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";


const categoryIcons: { [key: string]: React.ElementType } = {
    'Matematik': Ruler,
    'Fen Bilimleri': TestTube2,
    'Türkçe': BookCopy,
    'Sosyal Bilgiler': Globe,
    'İngilizce': MessageSquare,
    'Diğer': Gamepad2,
    'Genel Deneme Sınavları': Globe,
    'Yanlış Havuzu': Ruler,
};

export default function MistakePoolDashboardPage() {
    const { user, familyMembers } = useAuth();
    const [mistakes, setMistakes] = React.useState<Mistake[]>([]);
    const [selectedMistakeIds, setSelectedMistakeIds] = React.useState<string[]>([]);
    const [targetStudentId, setTargetStudentId] = React.useState<string>('');
    const { toast } = useToast();

    const studentMembers = React.useMemo(() => 
        familyMembers.filter(m => m.role.includes('Çocuk')), 
    [familyMembers]);

    React.useEffect(() => {
        if (!user) return;
        const unsubscribeMistakes = onMistakesUpdate(setMistakes);
        return () => unsubscribeMistakes();
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
    
    const mistakesBySubject = React.useMemo(() => {
        const grouped: { [key: string]: Mistake[] } = {};
        mistakes.forEach(mistake => {
            const subject = mistake.subject || 'Diğer';
            if (!grouped[subject]) {
                grouped[subject] = [];
            }
            grouped[subject].push(mistake);
        });
        return Object.entries(grouped);
    }, [mistakes]);

    return (
        <div className="space-y-6">
            <PageHeader title="Yanlış Havuzu">
                 <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <p className="text-sm text-white/80 max-w-2xl">
                        Burada öğrencilerin yanlış yaptığı veya boş bıraktığı tüm sorular birikir.
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
            
            {mistakesBySubject.length > 0 ? (
                 <div className="space-y-6">
                    {mistakesBySubject.map(([subject, subjectMistakes]) => {
                        const Icon = categoryIcons[subject] || BookCopy;
                        return (
                            <Card key={subject}>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Icon className="h-6 w-6"/> {subject}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {subjectMistakes.map(mistake => (
                                        <div key={mistake.id} className="flex items-start gap-4 p-3 border rounded-lg">
                                            <Checkbox
                                                id={`mistake-${mistake.id}`}
                                                checked={selectedMistakeIds.includes(mistake.id)}
                                                onCheckedChange={(checked) => handleSelectionChange(mistake.id, !!checked)}
                                                className="mt-1"
                                            />
                                            <label htmlFor={`mistake-${mistake.id}`} className="flex-grow">
                                                <p className="font-semibold">{mistake.topic}</p>
                                                <p className="text-sm text-muted-foreground">Soru #{mistake.originalQuestionId}</p>
                                            </label>
                                        </div>
                                    ))}
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
        </div>
    );
}
