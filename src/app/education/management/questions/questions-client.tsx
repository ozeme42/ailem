
"use client";

import * as React from "react";
import Image from "next/image";
import { PlusCircle, Trash2 } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { NewQuestionBankForm } from "@/components/new-question-bank-form";
import { BankQuestion, FamilyMember, Test } from "@/lib/data";
import { onBankQuestionsUpdate, onSubjectsUpdate, updateSubjects, onTopicsUpdate, updateTopics, deleteBankQuestion } from "@/lib/dataService";
import { useAuth } from "@/components/auth-provider";
import { Combobox } from "@/components/ui/combobox";
import { Badge } from "@/components/ui/badge";

export default function QuestionsClient() {
    const { toast } = useToast();
    const { familyMembers, familyId } = useAuth();
    
    const [bankQuestions, setBankQuestions] = React.useState<BankQuestion[]>([]);
    const [allSubjects, setAllSubjects] = React.useState<string[]>([]);
    const [allTopics, setAllTopics] = React.useState<string[]>([]);
    
    const [isFormOpen, setIsFormOpen] = React.useState(false);

    const [subjectFilter, setSubjectFilter] = React.useState<string>("");
    const [topicFilter, setTopicFilter] = React.useState<string>("");
    
    React.useEffect(() => {
        const unsubBankQuestions = onBankQuestionsUpdate(setBankQuestions);
        const unsubSubjects = onSubjectsUpdate(setAllSubjects);
        const unsubTopics = onTopicsUpdate(setAllTopics);
        
        return () => {
            unsubBankQuestions();
            unsubSubjects();
            unsubTopics();
        };
    }, []);
    
    const subjectOptions = React.useMemo(() => [{ label: "Tüm Dersler", value: "" }, ...allSubjects.map(s => ({ label: s, value: s }))], [allSubjects]);
    const topicOptions = React.useMemo(() => [{ label: "Tüm Konular", value: "" }, ...allTopics.map(t => ({ label: t, value: t }))], [allTopics]);

    const handleCreateSubject = async (subjectName: string) => {
        const newSubjects = [...new Set([...allSubjects, subjectName])];
        await updateSubjects(newSubjects);
        toast({ title: "Yeni Ders Oluşturuldu", description: `"${subjectName}" dersi listeye eklendi.` });
    };
    
    const handleCreateTopic = async (topicName: string) => {
        const newTopics = [...new Set([...allTopics, topicName])];
        await updateTopics(newTopics);
        toast({ title: "Yeni Konu Oluşturuldu", description: `"${topicName}" konusu listeye eklendi.` });
    };
    
    const handleDeleteQuestion = async (questionId: string) => {
        try {
            await deleteBankQuestion(questionId);
            toast({ title: "Soru Silindi", variant: "destructive" });
        } catch (e) {
            toast({ title: "Hata", description: "Soru silinirken bir hata oluştu.", variant: "destructive" });
        }
    };
    
    const filteredQuestions = React.useMemo(() => {
        return bankQuestions.filter(q => {
            const subjectMatch = !subjectFilter || q.subject === subjectFilter;
            const topicMatch = !topicFilter || q.topic === topicFilter;
            return subjectMatch && topicMatch;
        });
    }, [bankQuestions, subjectFilter, topicFilter]);

    return (
        <div className="mt-6">
             <div className="flex justify-between items-center mb-6">
                <div className="flex gap-4">
                     <Combobox
                        options={subjectOptions}
                        value={subjectFilter}
                        onChange={setSubjectFilter}
                        placeholder="Ders Filtrele..."
                        notfoundText="Ders bulunamadı."
                    />
                     <Combobox
                        options={topicOptions}
                        value={topicFilter}
                        onChange={setTopicFilter}
                        placeholder="Konu Filtrele..."
                        notfoundText="Konu bulunamadı."
                    />
                </div>
                 <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" /> Yeni Soru Ekle
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Soru Bankasına Yeni Soru Ekle</DialogTitle>
                            <DialogDescription>
                                Görsel ve doğru cevabıyla birlikte yeni bir soru oluşturun.
                            </DialogDescription>
                        </DialogHeader>
                        <NewQuestionBankForm
                            availableSubjects={allSubjects}
                            onSubjectCreated={handleCreateSubject}
                            availableTopics={allTopics}
                            onTopicCreated={handleCreateTopic}
                            onQuestionAdded={() => setIsFormOpen(false)}
                        />
                    </DialogContent>
                </Dialog>
            </div>
            
            {filteredQuestions.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredQuestions.map(q => (
                        <Card key={q.id} className="flex flex-col">
                            <CardHeader>
                               <Badge variant="secondary" className="w-fit">{q.subject}</Badge>
                               <CardDescription>{q.topic}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow flex items-center justify-center">
                                <Image src={q.imageUrl} alt={`Soru ${q.id}`} width={400} height={300} className="rounded-md object-contain" data-ai-hint="question paper" />
                            </CardContent>
                            <CardFooter className="flex justify-between items-center bg-muted/50 p-3">
                                <p>Doğru Cevap: <Badge>{q.correctAnswer}</Badge></p>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Soruyu Sil</AlertDialogTitle><AlertDialogDescription>Bu soruyu bankadan kalıcı olarak silmek istediğinizden emin misiniz?</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteQuestion(q.id)}>Evet, Sil</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16">
                    <p className="text-muted-foreground">Filtrelerinizle eşleşen soru bulunamadı.</p>
                </div>
            )}
        </div>
    );
}

