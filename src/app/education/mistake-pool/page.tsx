
"use client";

import * as React from "react";
import Image from 'next/image';
import { useAuth } from "@/components/auth-provider";
import { Mistake, Test } from "@/lib/data";
import { onMistakesUpdate, deleteMistake, updateMistake } from "@/lib/dataService";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2, BookCopy, Ruler, TestTube2, Globe, MessageSquare, Gamepad2, Send, Edit } from "lucide-react";
import { NewMistakeForm } from "@/components/new-mistake-form";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { NewTestForm } from "@/components/new-test-form";
import { onQuestionBanksUpdate, onPracticeExamsUpdate, onSubjectsUpdate, addTest } from "@/lib/dataService";
import { QuestionBank, PracticeExam, FamilyMember } from "@/lib/data";
import { cn } from "@/lib/utils";
import { EditMistakeForm } from "@/components/edit-mistake-form";

const categoryIcons: { [key: string]: React.ElementType } = {
    'Matematik': Ruler,
    'Fen Bilimleri': TestTube2,
    'Türkçe': BookCopy,
    'Sosyal Bilgiler': Globe,
    'İngilizce': MessageSquare,
    'Diğer': Gamepad2
};

export default function MistakePoolPage() {
    const { user, familyMembers } = useAuth();
    const [mistakes, setMistakes] = React.useState<Mistake[]>([]);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = React.useState(false);
    const [selectedMistakes, setSelectedMistakes] = React.useState<Mistake[]>([]);
    const [editingMistake, setEditingMistake] = React.useState<Mistake | null>(null);

    const { toast } = useToast();
    
    // Values needed for NewTestForm
    const [questionBanks, setQuestionBanks] = React.useState<QuestionBank[]>([]);
    const [practiceExams, setPracticeExams] = React.useState<PracticeExam[]>([]);
    const [availableSubjects, setAvailableSubjects] = React.useState<string[]>([]);
    
    const studentMembers = React.useMemo(() => 
        familyMembers.filter(m => m.role.includes('Çocuk')), 
    [familyMembers]);

    React.useEffect(() => {
        if (!user) return;
        const unsubscribeMistakes = onMistakesUpdate(setMistakes);
        const unsubscribeBanks = onQuestionBanksUpdate(setQuestionBanks);
        const unsubscribeExams = onPracticeExamsUpdate(setPracticeExams);
        const unsubscribeSubjects = onSubjectsUpdate(setAvailableSubjects);

        return () => {
          unsubscribeMistakes();
          unsubscribeBanks();
          unsubscribeExams();
          unsubscribeSubjects();
        };
    }, [user]);

    const groupedMistakes = React.useMemo(() => {
        const groups: { [subject: string]: { [topic: string]: Mistake[] } } = {};
        mistakes.forEach(mistake => {
            if (!groups[mistake.subject]) {
                groups[mistake.subject] = {};
            }
            if (!groups[mistake.subject][mistake.topic]) {
                groups[mistake.subject][mistake.topic] = [];
            }
            groups[mistake.subject][mistake.topic].push(mistake);
        });
        return groups;
    }, [mistakes]);
    
    const handleDeleteMistake = async (id: string) => {
        try {
            await deleteMistake(id);
            toast({ title: "Soru Silindi", description: "Soru yanlış havuzundan kaldırıldı.", variant: "destructive" });
        } catch (error) {
            toast({ title: "Hata", description: "Soru silinirken bir hata oluştu.", variant: "destructive" });
        }
    };

    const handleUpdateMistake = async (id: string, data: Partial<Omit<Mistake, 'id'>>) => {
        try {
            await updateMistake(id, data);
            toast({ title: "Soru Güncellendi", description: "Doğru cevap ve çözüm başarıyla kaydedildi." });
            setEditingMistake(null);
        } catch (error) {
            toast({ title: "Hata", description: "Soru güncellenirken bir hata oluştu.", variant: "destructive" });
        }
    };
    
    const handleToggleSelection = (mistake: Mistake) => {
        setSelectedMistakes(prev => {
            const isSelected = prev.some(m => m.id === mistake.id);
            return isSelected ? prev.filter(m => m.id !== mistake.id) : [...prev, mistake];
        });
    };
    
    const openAssignmentDialog = () => {
        if (selectedMistakes.length === 0) {
            toast({ title: "Hiç Soru Seçilmedi", description: "Lütfen ödev oluşturmak için en az bir soru seçin.", variant: "destructive" });
            return;
        }
        setIsAssignmentDialogOpen(true);
    };

     const handleAssignmentSubmit = async (testData: Omit<Test, 'id' | 'status' | 'familyId' | 'isArchived'>, id?: string) => {
        try {
            const finalTestData = {
                ...testData,
                status: 'Atandı' as const,
                isArchived: false,
                sourceType: 'mistake' as const,
                subject: 'Yanlış Havuzu',
                gradingType: 'manual-text' as const,
                mistakeIds: selectedMistakes.map(m => m.id),
                title: testData.title || `Yanlış Tekrar Testi - ${new Date().toLocaleDateString('tr-TR')}`
            };

            await addTest(finalTestData);
            toast({ title: "✅ Ödev Atandı", description: "Yanlış sorularından oluşan yeni ödev başarıyla öğrenciye atandı." });
            setIsAssignmentDialogOpen(false);
            setSelectedMistakes([]);
        } catch (error) {
             toast({ title: "❌ Kaydetme Hatası", description: "Ödev kaydedilirken bir hata oluştu.", variant: 'destructive'});
        }
    };
    
    const handleToggleAllForTopic = (topicMistakes: Mistake[]) => {
        const allSelected = topicMistakes.every(tm => selectedMistakes.some(sm => sm.id === tm.id));

        if (allSelected) {
            // If all are selected, unselect them all
            setSelectedMistakes(prev => prev.filter(sm => !topicMistakes.some(tm => tm.id === sm.id)));
        } else {
            // If some or none are selected, select all
            const newSelections = topicMistakes.filter(tm => !selectedMistakes.some(sm => sm.id === tm.id));
            setSelectedMistakes(prev => [...prev, ...newSelections]);
        }
    };


    return (
        <div className="space-y-6">
            <PageHeader title="Yanlış Havuzu">
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={openAssignmentDialog}
                        disabled={selectedMistakes.length === 0}
                        className="bg-white/20 text-white hover:bg-white/30 border-none"
                    >
                        <Send className="mr-2 h-4 w-4" />
                        Seçilenlerden Ödev Ata ({selectedMistakes.length})
                    </Button>
                    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-white/20 text-white hover:bg-white/30 border-none">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Yeni Soru Ekle
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Yeni Yanlış Soru Ekle</DialogTitle>
                                <DialogDescription>
                                    Fotoğrafını çekerek yanlış yapılan bir soruyu havuza ekleyin.
                                </DialogDescription>
                            </DialogHeader>
                            <NewMistakeForm onFormSubmit={() => setIsFormOpen(false)} />
                        </DialogContent>
                    </Dialog>
                </div>
            </PageHeader>
            
            {Object.keys(groupedMistakes).length > 0 ? (
                 <Accordion type="multiple" defaultValue={Object.keys(groupedMistakes)} className="w-full space-y-4">
                    {Object.entries(groupedMistakes).map(([subject, topics]) => {
                        const Icon = categoryIcons[subject] || BookCopy;
                        return (
                        <Card key={subject}>
                             <AccordionItem value={subject} className="border-b-0">
                                <AccordionTrigger className="p-4 hover:no-underline">
                                    <div className="flex items-center gap-3">
                                        <Icon className="w-8 h-8" />
                                        <div className="text-left">
                                            <h3 className="text-lg font-semibold">{subject}</h3>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-4 pt-0">
                                    <div className="space-y-3">
                                        {Object.entries(topics).map(([topic, topicMistakes]) => {
                                            const allTopicMistakesSelected = topicMistakes.every(tm => selectedMistakes.some(sm => sm.id === tm.id));
                                            return (
                                            <div key={topic}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Checkbox
                                                        id={`select-all-${topic}`}
                                                        checked={allTopicMistakesSelected}
                                                        onCheckedChange={() => handleToggleAllForTopic(topicMistakes)}
                                                    />
                                                    <label htmlFor={`select-all-${topic}`} className="font-semibold text-muted-foreground cursor-pointer">{topic}</label>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                    {topicMistakes.map(mistake => (
                                                        <Card key={mistake.id} className="relative group overflow-hidden">
                                                            <div className="absolute top-2 left-2 z-10">
                                                                <Checkbox 
                                                                    className="h-6 w-6 bg-white"
                                                                    checked={selectedMistakes.some(m => m.id === mistake.id)}
                                                                    onCheckedChange={() => handleToggleSelection(mistake)}
                                                                />
                                                            </div>
                                                            <Image src={mistake.imageUrl || "https://placehold.co/300x400.png"} alt="Yanlış Soru" width={300} height={400} className="object-cover w-full h-auto aspect-[3/4]" data-ai-hint="question paper"/>
                                                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                                                                <Button variant="secondary" size="icon" className="h-8 w-8" onClick={() => setEditingMistake(mistake)}>
                                                                    <Edit className="h-4 w-4"/>
                                                                </Button>
                                                                 <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                         <Button variant="destructive" size="icon" className="h-8 w-8">
                                                                            <Trash2 className="h-4 w-4"/>
                                                                        </Button>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                                                            <AlertDialogDescription>Bu soru kalıcı olarak silinecektir.</AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel>İptal</AlertDialogCancel>
                                                                            <AlertDialogAction onClick={() => handleDeleteMistake(mistake.id)}>Evet, Sil</AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            </div>
                                                        </Card>
                                                    ))}
                                                </div>
                                            </div>
                                        )})}
                                    </div>
                                </AccordionContent>
                             </AccordionItem>
                        </Card>
                        )
                    })}
                </Accordion>
            ) : (
                 <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                        Yanlış havuzunda henüz soru bulunmuyor.
                    </CardContent>
                </Card>
            )}
             <Dialog open={isAssignmentDialogOpen} onOpenChange={setIsAssignmentDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                    <DialogTitle>Yanlışlardan Ödev Ata</DialogTitle>
                    <DialogDescription>
                        Seçilen {selectedMistakes.length} sorudan yeni bir ödev oluşturun.
                    </DialogDescription>
                    </DialogHeader>
                    <NewTestForm
                        students={studentMembers}
                        questionBanks={questionBanks}
                        practiceExams={practiceExams}
                        onAssign={handleAssignmentSubmit}
                        availableSubjects={availableSubjects}
                        onSubjectCreated={() => {}} // This is a no-op here
                        mistakePoolSelection={selectedMistakes}
                    />
                </DialogContent>
            </Dialog>

            <Dialog open={!!editingMistake} onOpenChange={() => setEditingMistake(null)}>
                <DialogContent>
                     <DialogHeader>
                        <DialogTitle>Geri Bildirim Ekle</DialogTitle>
                        <DialogDescription>
                           Bu yanlış soru için doğru cevabı ve çözüm görselini ekleyin.
                        </DialogDescription>
                    </DialogHeader>
                    {editingMistake && (
                         <EditMistakeForm
                            mistake={editingMistake}
                            onSave={handleUpdateMistake}
                         />
                    )}
                </DialogContent>
            </Dialog>

        </div>
    );
}
