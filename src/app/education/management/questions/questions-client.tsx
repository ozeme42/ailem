
"use client";

import * as React from "react";
import Image from "next/image";
import { PlusCircle, Trash2, CheckboxIcon, FilePlus, Edit } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { NewQuestionBankForm } from "@/components/new-question-bank-form";
import { BankQuestion, PracticeExam } from "@/lib/data";
import { onBankQuestionsUpdate, onSubjectsUpdate, updateSubjects, onTopicsUpdate, updateTopics, deleteBankQuestion, addPracticeExam, addBankQuestion } from "@/lib/dataService";
import { useAuth } from "@/components/auth-provider";
import { Combobox } from "@/components/ui/combobox";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { NewPracticeExamForm } from "@/components/new-practice-exam-form";
import { Input } from "@/components/ui/input";
import { migrateImage } from "@/ai/flows/migrate-image-flow";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";


const bulkFormSchema = z.object({
  subject: z.string().min(1, "Ders seçimi zorunludur."),
  topic: z.string().min(1, "Konu seçimi zorunludur."),
});

type BulkFormSchema = z.infer<typeof bulkFormSchema>;

interface BulkUploadFile {
  file: File;
  preview: string;
  correctAnswer: string;
}

function BulkAddQuestionsDialog({ open, onOpenChange, availableSubjects, availableTopics, onSubjectCreated, onTopicCreated }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    availableSubjects: string[];
    availableTopics: string[];
    onSubjectCreated: (subject: string) => void;
    onTopicCreated: (topic: string) => void;
}) {
    const { toast } = useToast();
    const { user } = useAuth();
    const [files, setFiles] = React.useState<BulkUploadFile[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const form = useForm<BulkFormSchema>({
        resolver: zodResolver(bulkFormSchema),
        defaultValues: { subject: "", topic: "" },
    });

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = event.target.files;
        if (!selectedFiles) return;

        const newFiles = Array.from(selectedFiles).map(file => ({
            file,
            preview: URL.createObjectURL(file),
            correctAnswer: ''
        }));
        setFiles(prev => [...prev, ...newFiles]);
    };

    const handleAnswerChange = (index: number, answer: string) => {
        setFiles(prev => {
            const newFiles = [...prev];
            newFiles[index].correctAnswer = answer;
            return newFiles;
        });
    };

    const handleRemoveFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const onSubmit = async (data: BulkFormSchema) => {
        if (files.length === 0) {
            toast({ title: "Hata", description: "Lütfen en az bir soru görseli yükleyin.", variant: "destructive" });
            return;
        }
        if (!user) return;
        setIsLoading(true);

        try {
            for (const fileData of files) {
                const reader = new FileReader();
                const imageDataUri = await new Promise<string>((resolve, reject) => {
                    reader.onload = e => resolve(e.target?.result as string);
                    reader.onerror = e => reject(e);
                    reader.readAsDataURL(fileData.file);
                });

                const destinationPath = `bank-questions/${user.uid}-${Date.now()}-${fileData.file.name}`;
                const migrationResult = await migrateImage({ imageDataUri, destinationPath });

                if (!migrationResult.success || !migrationResult.newUrl) {
                    throw new Error(`Dosya yüklenemedi: ${fileData.file.name}`);
                }

                const questionData: Omit<BankQuestion, 'id' | 'familyId' | 'createdAt'> = {
                    subject: data.subject,
                    topic: data.topic,
                    imageUrl: migrationResult.newUrl,
                    correctAnswer: fileData.correctAnswer,
                };
                await addBankQuestion(questionData);
            }
            toast({ title: "Başarılı!", description: `${files.length} soru başarıyla bankaya eklendi.` });
            onOpenChange(false);
            setFiles([]);
            form.reset();
        } catch (error: any) {
            toast({ title: "Hata", description: error.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl h-full max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Toplu Soru Ekle</DialogTitle>
                    <DialogDescription>Aynı ders ve konuya ait birden fazla soruyu tek seferde yükleyin.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0 gap-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <FormField control={form.control} name="subject" render={({ field }) => (
                                <FormItem><FormLabel>Ders</FormLabel><Combobox options={availableSubjects.map(s => ({label: s, value: s}))} value={field.value} onChange={field.onChange} onCreate={onSubjectCreated} placeholder="Ders seç..." notfoundText="Ders bulunamadı." createText="Yeni ders oluştur:" /><FormMessage /></FormItem>
                            )}/>
                             <FormField control={form.control} name="topic" render={({ field }) => (
                                <FormItem><FormLabel>Konu</FormLabel><Combobox options={availableTopics.map(t => ({label: t, value: t}))} value={field.value} onChange={field.onChange} onCreate={onTopicCreated} placeholder="Konu seç..." notfoundText="Konu bulunamadı." createText="Yeni konu oluştur:" /><FormMessage /></FormItem>
                            )}/>
                        </div>
                        
                        <div className="flex-1 flex flex-col min-h-0">
                          <Label>Sorular</Label>
                           <ScrollArea className="flex-grow h-0 mt-2">
                                <div className="space-y-4 pr-4">
                                     {files.map((fileData, index) => (
                                        <div key={index} className="flex items-start gap-4 p-2 border rounded-lg">
                                            <Image src={fileData.preview} alt={`Preview ${index}`} width={100} height={100} className="w-24 h-24 object-contain rounded-md border" />
                                            <div className="flex-grow space-y-2">
                                                 <Input
                                                    placeholder="Doğru cevap..."
                                                    value={fileData.correctAnswer}
                                                    onChange={(e) => handleAnswerChange(index, e.target.value)}
                                                    required
                                                />
                                                <Button type="button" variant="destructive" size="sm" onClick={() => handleRemoveFile(index)}>Kaldır</Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <Button type="button" variant="outline" className="w-full mt-4" onClick={() => fileInputRef.current?.click()}>Yeni Görsel(ler) Ekle</Button>
                                <Input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} multiple />
                           </ScrollArea>
                        </div>
                       
                        <DialogFooter className="flex-shrink-0 pt-4 border-t">
                            <Button variant="ghost" onClick={() => onOpenChange(false)}>İptal</Button>
                            <Button type="submit" disabled={isLoading || files.length === 0}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {files.length} Soruyu Kaydet
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export default function QuestionsClient() {
    const { toast } = useToast();
    const { user } = useAuth();
    
    const [bankQuestions, setBankQuestions] = React.useState<BankQuestion[]>([]);
    const [allSubjects, setAllSubjects] = React.useState<string[]>([]);
    const [allTopics, setAllTopics] = React.useState<string[]>([]);
    
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [isBulkFormOpen, setIsBulkFormOpen] = React.useState(false);
    const [isCreateExamOpen, setIsCreateExamOpen] = React.useState(false);

    const [editingQuestion, setEditingQuestion] = React.useState<BankQuestion | null>(null);

    const [subjectFilter, setSubjectFilter] = React.useState<string>("");
    const [topicFilter, setTopicFilter] = React.useState<string>("");
    const [selectedQuestions, setSelectedQuestions] = React.useState<string[]>([]);
    
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

    const handleToggleQuestionSelection = (questionId: string) => {
        setSelectedQuestions(prev => 
            prev.includes(questionId) 
                ? prev.filter(id => id !== questionId) 
                : [...prev, questionId]
        );
    };
    
    const handleCreateExam = async (examData: Pick<PracticeExam, 'name'>) => {
        const questionsForExam = bankQuestions.filter(q => selectedQuestions.includes(q.id))
            .map((q, index) => ({
                questionNumber: index + 1,
                questionId: q.id,
                imageUrl: q.imageUrl,
            }));

        const answerKey = questionsForExam.reduce((acc, q, index) => {
            const originalQuestion = bankQuestions.find(bq => bq.id === q.questionId);
            if (originalQuestion) {
                acc[(index + 1).toString()] = originalQuestion.correctAnswer;
            }
            return acc;
        }, {} as { [key: string]: string });
        
        const subjectCounts = questionsForExam.reduce((acc, q) => {
            const originalQuestion = bankQuestions.find(bq => bq.id === q.questionId);
            if (originalQuestion) {
                acc[originalQuestion.subject] = (acc[originalQuestion.subject] || 0) + 1;
            }
            return acc;
        }, {} as { [key: string]: number });
        
        const subjects = Object.entries(subjectCounts).map(([name, questionCount], index) => ({
            id: index + 1,
            name,
            questionCount
        }));

        const newExam: Omit<PracticeExam, 'id' | 'familyId'> = {
            name: examData.name,
            source: 'bank',
            gradingType: 'auto',
            subjects: subjects,
            questions: questionsForExam,
            answerKey: answerKey,
        };

        try {
            await addPracticeExam(newExam);
            toast({
                title: "Deneme Sınavı Oluşturuldu!",
                description: `"${examData.name}" sınavı, ${selectedQuestions.length} soru ile oluşturuldu.`
            });
            setSelectedQuestions([]);
            setIsCreateExamOpen(false);
        } catch (error) {
            toast({ title: "Hata", description: "Sınav oluşturulurken bir hata oluştu.", variant: "destructive" });
        }
    };
    
    const openEditDialog = (question: BankQuestion) => {
        setEditingQuestion(question);
        setIsFormOpen(true);
    };
    
    const openNewDialog = () => {
        setEditingQuestion(null);
        setIsFormOpen(true);
    }

    return (
        <div className="mt-6">
             <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
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
                 <div className="flex items-center gap-2 self-end sm:self-center">
                     <Dialog open={isCreateExamOpen} onOpenChange={setIsCreateExamOpen}>
                        <DialogTrigger asChild>
                             <Button onClick={() => setIsCreateExamOpen(true)} disabled={selectedQuestions.length === 0}>
                                Deneme Oluştur ({selectedQuestions.length})
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                             <DialogHeader>
                                <DialogTitle>Yeni Deneme Sınavı Oluştur</DialogTitle>
                                <DialogDescription>
                                    Seçtiğiniz {selectedQuestions.length} soru ile yeni bir deneme sınavı oluşturun.
                                </DialogDescription>
                            </DialogHeader>
                            <NewPracticeExamForm onSubmit={handleCreateExam} />
                        </DialogContent>
                     </Dialog>
                     <Button onClick={() => setIsBulkFormOpen(true)}>
                        <FilePlus className="mr-2 h-4 w-4" /> Toplu Ekle
                    </Button>
                    <Button onClick={openNewDialog}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Yeni Soru
                    </Button>
                 </div>
            </div>
            
            {filteredQuestions.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredQuestions.map(q => (
                        <Card key={q.id} className="flex flex-col relative group">
                             <div className="absolute top-2 left-2 z-10">
                                <Checkbox 
                                    className="bg-background border-2 w-6 h-6"
                                    checked={selectedQuestions.includes(q.id)}
                                    onCheckedChange={() => handleToggleQuestionSelection(q.id)}
                                />
                             </div>
                            <CardHeader>
                               <Badge variant="secondary" className="w-fit">{q.subject}</Badge>
                               <CardDescription>{q.topic}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow flex items-center justify-center">
                                <Image src={q.imageUrl} alt={`Soru ${q.id}`} width={400} height={300} className="rounded-md object-contain" data-ai-hint="question paper" />
                            </CardContent>
                            <CardFooter className="flex justify-between items-center bg-muted/50 p-3">
                                <span>Doğru Cevap: <Badge>{q.correctAnswer}</Badge></span>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(q)}><Edit className="h-4 w-4"/></Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-destructive/70 hover:text-destructive h-7 w-7"><Trash2 className="h-4 w-4"/></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>Soruyu Sil</AlertDialogTitle><AlertDialogDescription>Bu soruyu bankadan kalıcı olarak silmek istediğinizden emin misiniz?</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteQuestion(q.id)}>Evet, Sil</AlertDialogAction></AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16">
                    <p className="text-muted-foreground">Filtrelerinizle eşleşen soru bulunamadı.</p>
                </div>
            )}

            <Dialog open={isFormOpen} onOpenChange={(open) => {if (!open) setEditingQuestion(null); setIsFormOpen(open);}}>
                <DialogContent className="sm:max-w-lg flex flex-col h-full max-h-[90vh]">
                    <NewQuestionBankForm
                        availableSubjects={allSubjects}
                        onSubjectCreated={handleCreateSubject}
                        availableTopics={allTopics}
                        onTopicCreated={handleCreateTopic}
                        onQuestionProcessed={() => {
                            setIsFormOpen(false);
                            setEditingQuestion(null);
                        }}
                        initialData={editingQuestion}
                    />
                </DialogContent>
            </Dialog>

            <BulkAddQuestionsDialog 
                open={isBulkFormOpen}
                onOpenChange={setIsBulkFormOpen}
                availableSubjects={allSubjects}
                availableTopics={allTopics}
                onSubjectCreated={handleCreateSubject}
                onTopicCreated={handleCreateTopic}
            />

        </div>
    );
}
