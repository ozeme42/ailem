
"use client";

import * as React from "react";
import Image from "next/image";
import { PlusCircle, Trash2, FilePlus, Edit, Loader2, ArrowLeft, Upload, Image as ImageIcon, Minus, Plus, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { BankQuestion, PracticeExam } from "@/lib/data";
import { onBankQuestionsUpdate, onSubjectsUpdate, updateSubjects, onTopicsUpdate, updateTopics, deleteBankQuestion, addPracticeExam, addBankQuestion, addBulkBankQuestions, updateBankQuestion } from "@/lib/dataService";
import { useAuth } from "@/components/auth-provider";
import { Combobox } from "@/components/ui/combobox";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { NewPracticeExamForm } from "@/components/new-practice-exam-form";
import { Input } from "@/components/ui/input";
import { migrateImage } from "@/ai/flows/migrate-image-flow";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NewQuestionBankForm } from "@/components/new-question-bank-form";
import { useDropzone } from 'react-dropzone';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import NextImage from 'next/image';

interface UploadedQuestion {
    id: string;
    file: File;
    preview: string;
    subject: string;
    topic: string;
    options: string[];
    correctAnswer: number;
    difficulty: string;
}

function AddQuestions({ onBack }: { onBack: () => void }) {
  const [subjects, setSubjects] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [uploadedQuestions, setUploadedQuestions] = React.useState<UploadedQuestion[]>([]);
  
  const [commonSubject, setCommonSubject] = React.useState("");
  const [commonTopic, setCommonTopic] = React.useState("");
  const { toast } = useToast();

  React.useEffect(() => {
    const unsub = onSubjectsUpdate(setSubjects);
    // Cleanup preview URLs on unmount
    return () => {
        unsub();
        uploadedQuestions.forEach(q => URL.revokeObjectURL(q.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (commonSubject) {
        setUploadedQuestions(prev => prev.map(q => ({ ...q, subject: commonSubject })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commonSubject]);

  React.useEffect(() => {
      if (commonTopic) {
          setUploadedQuestions(prev => prev.map(q => ({ ...q, topic: commonTopic })));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commonTopic]);

  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    const newQuestions = acceptedFiles.map(file => ({
      id: `${file.name}-${Date.now()}`,
      file,
      preview: URL.createObjectURL(file),
      subject: commonSubject,
      topic: commonTopic,
      options: ["", ""],
      correctAnswer: 0,
      difficulty: "Orta",
    }));
    setUploadedQuestions(prev => [...prev, ...newQuestions]);
  }, [commonSubject, commonTopic]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.png', '.jpg'] }
  });

  const updateQuestionField = (id: string, field: keyof UploadedQuestion, value: any) => {
    setUploadedQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
  };
  
  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    const question = uploadedQuestions.find(q => q.id === questionId);
    if (question) {
        const newOptions = [...question.options];
        newOptions[optionIndex] = value;
        updateQuestionField(questionId, 'options', newOptions);
    }
  };

  const addOption = (questionId: string) => {
    const question = uploadedQuestions.find(q => q.id === questionId);
    if (question && question.options.length < 5) {
        updateQuestionField(questionId, 'options', [...question.options, ""]);
    } else {
        toast({variant: "destructive", title: "En fazla 5 şık ekleyebilirsiniz."});
    }
  };

  const removeOption = (questionId: string, optionIndex: number) => {
      const question = uploadedQuestions.find(q => q.id === questionId);
      if (question && question.options.length > 2) {
          const newOptions = question.options.filter((_, i) => i !== optionIndex);
          const newCorrectAnswer = question.correctAnswer >= newOptions.length ? 0 : question.correctAnswer;
          updateQuestionField(questionId, 'options', newOptions);
          updateQuestionField(questionId, 'correctAnswer', newCorrectAnswer);
      } else {
          toast({variant: "destructive", title: "En az 2 şık olmalıdır."});
      }
  };

  const removeUploadedQuestion = (id: string) => {
    const question = uploadedQuestions.find(q => q.id === id);
    if (question) {
        URL.revokeObjectURL(question.preview);
        setUploadedQuestions(prev => prev.filter(q => q.id !== id));
    }
  };

  const handleAddQuestionsToBank = async () => {
    const invalidQuestion = uploadedQuestions.find(q => 
        !q.subject || !q.topic
    );

    if (invalidQuestion) {
        toast({variant: "destructive", title: "Lütfen tüm sorular için ders ve konu bilgilerini eksiksiz doldurun."});
        return;
    }

    setIsLoading(true);
    try {
        const questionsData = await Promise.all(uploadedQuestions.map(async (q) => {
             const imageDataUri = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(q.file);
            });
            return {
                imageDataUri,
                subject: q.subject,
                topic: q.topic,
                options: q.options.reduce((acc, opt, index) => ({...acc, [String.fromCharCode(65 + index)]: opt}), {}),
                correctAnswer: String.fromCharCode(65 + q.correctAnswer),
            };
        }));
        
        await addBulkBankQuestions(questionsData);
        
        toast({title: "Başarılı!", description: `${questionsData.length} soru başarıyla soru bankasına eklendi!`});
        setUploadedQuestions([]);
        onBack();

    } catch (error) {
        console.error("Error adding questions:", error);
        toast({variant: "destructive", title: "Sorular eklenirken bir hata oluştu."});
    } finally {
        setIsLoading(false);
    }
  };

  const subjectOptions = subjects.map(s => ({label: s.name, value: s.name}));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Soru Bankasına Ekle</h1>
          <p className="text-muted-foreground">Görsel yükleyerek veya manuel olarak yeni sorular ekleyin.</p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Görselden Toplu Soru Ekle</CardTitle>
          <CardDescription>Soruların görsellerini sürükleyip bırakın veya seçin. Ardından detayları doldurun.</CardDescription>
        </CardHeader>
        <CardContent>
            <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer
                ${isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Upload className="h-8 w-8" />
                    {isDragActive ?
                    <p>Dosyaları buraya bırakın...</p> :
                    <p>Soru görsellerini buraya sürükleyin veya dosyaları seçmek için tıklayın</p>
                    }
                </div>
            </div>

            {uploadedQuestions.length > 0 && (
                <div className="mt-6 space-y-4">
                    <h3 className="text-lg font-medium">Yüklenen Sorular ({uploadedQuestions.length})</h3>

                    <Card className="p-4 bg-muted/50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="space-y-2">
                                <Label>Tüm Sorular İçin Ortak Ders</Label>
                                <Combobox options={subjectOptions} value={commonSubject} onChange={setCommonSubject} placeholder="Tümüne ders ata"/>
                            </div>
                            <div className="space-y-2">
                                <Label>Tüm Sorular İçin Ortak Konu</Label>
                                <Input value={commonTopic} onChange={(e) => setCommonTopic(e.target.value)} placeholder="Tümüne konu ata" />
                            </div>
                        </div>
                    </Card>

                    {uploadedQuestions.map(q => (
                        <Card key={q.id} className="p-4 relative">
                            <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => removeUploadedQuestion(q.id)}>
                                <X className="h-4 w-4" />
                            </Button>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-1">
                                    <NextImage src={q.preview} alt={q.file.name} width={200} height={150} className="rounded-md object-contain border" />
                                </div>
                                <div className="md:col-span-2 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Ders</Label>
                                            <Combobox options={subjectOptions} value={q.subject} onChange={(val) => updateQuestionField(q.id, 'subject', val)} placeholder="Ders seç"/>
                                        </div>
                                         <div className="space-y-2">
                                            <Label>Konu</Label>
                                            <Input value={q.topic} onChange={(e) => updateQuestionField(q.id, 'topic', e.target.value)} placeholder="Konu adı" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Şıklar ve Doğru Cevap</Label>
                                        <div className="space-y-2">
                                            {q.options.map((opt, index) => (
                                                <div key={index} className="flex items-center gap-2">
                                                    <input type="radio" name={`correct-answer-${q.id}`} checked={q.correctAnswer === index} onChange={() => updateQuestionField(q.id, 'correctAnswer', index)} />
                                                    <span className="font-semibold text-sm">{String.fromCharCode(65 + index)}</span>
                                                    <Input value={opt} onChange={(e) => updateOption(q.id, index, e.target.value)} placeholder={`${String.fromCharCode(65 + index)} şıkkı`} />
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeOption(q.id, index)}><Minus className="h-4 w-4 text-red-500" /></Button>
                                                </div>
                                            ))}
                                        </div>
                                         <Button variant="outline" size="sm" onClick={() => addOption(q.id)}><Plus className="h-4 w-4 mr-2" />Şık Ekle</Button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </CardContent>
        {uploadedQuestions.length > 0 && (
             <CardHeader>
                <Button onClick={handleAddQuestionsToBank} className="w-full" disabled={isLoading}>
                    {isLoading ? `Sorular Ekleniyor...` : `${uploadedQuestions.length} Soruyu Bankaya Ekle`}
                </Button>
            </CardHeader>
        )}
      </Card>
    </div>
  );
}


export default function QuestionsClient() {
    const { toast } = useToast();
    const { user } = useAuth();
    
    const [bankQuestions, setBankQuestions] = React.useState<BankQuestion[]>([]);
    const [allSubjects, setAllSubjects] = React.useState<string[]>([]);
    const [allTopics, setAllTopics] = React.useState<string[]>([]);
    
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [isCreateExamOpen, setIsCreateExamOpen] = React.useState(false);

    const [editingQuestion, setEditingQuestion] = React.useState<BankQuestion | null>(null);

    const [subjectFilter, setSubjectFilter] = React.useState<string>("");
    const [topicFilter, setTopicFilter] = React.useState<string>("");
    const [selectedQuestions, setSelectedQuestions] = React.useState<string[]>([]);

    const [isBulkAddMode, setIsBulkAddMode] = React.useState(false);
    
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
    
    if (isBulkAddMode) {
        return <AddQuestions onBack={() => setIsBulkAddMode(false)} />;
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
                     <Button onClick={() => setIsBulkAddMode(true)}>
                        <FilePlus className="mr-2 h-4 w-4" /> Toplu Soru Ekle
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
                                            <AlertDialogHeader><AlertDialogTitleComponent>Soruyu Sil</AlertDialogTitleComponent><AlertDialogDescription>Bu soruyu bankadan kalıcı olarak silmek istediğinizden emin misiniz?</AlertDialogDescription></AlertDialogHeader>
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
        </div>
    );
}
