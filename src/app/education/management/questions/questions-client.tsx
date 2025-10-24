
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, Image as ImageIcon, Trash2, Plus, Minus, X, KeyRound, MoreVertical, Edit, FileText } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useDropzone } from 'react-dropzone';
import NextImage from 'next/image';
import { addBulkBankQuestions, onBankQuestionsUpdate, onSubjectsUpdate, onTopicsUpdate, updateSubjects, updateTopics, deleteBankQuestion } from "@/lib/dataService";
import { BankQuestion } from "@/lib/data";
import { Combobox } from "@/components/ui/combobox";
import { Loader2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { useAuth } from "@/components/auth-provider";

interface BulkAddQuestionsFlowProps {
  onBack: () => void;
  subjects: string[];
  topics: string[];
  onSubjectCreated: (name: string) => void;
  onTopicCreated: (name: string) => void;
  onQuestionsAdded: () => void;
}

interface UploadedQuestion {
    id: string;
    file: File;
    preview: string;
    subject: string;
    topic: string;
    options: string[];
    correctAnswer: number;
}

function BulkAddQuestionsFlow({ onBack, subjects, topics, onSubjectCreated, onTopicCreated, onQuestionsAdded }: BulkAddQuestionsFlowProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedQuestions, setUploadedQuestions] = useState<UploadedQuestion[]>([]);
  
  const [commonSubject, setCommonSubject] = useState("");
  const [commonTopic, setCommonTopic] = useState("");

  const subjectOptions = subjects.map(s => ({ label: s, value: s }));
  const topicOptions = topics.map(t => ({ label: t, value: t }));

  useEffect(() => {
    // Cleanup preview URLs on unmount
    return () => {
        uploadedQuestions.forEach(q => URL.revokeObjectURL(q.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (commonSubject) {
        setUploadedQuestions(prev => prev.map(q => ({ ...q, subject: commonSubject })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commonSubject]);

  useEffect(() => {
      if (commonTopic) {
          setUploadedQuestions(prev => prev.map(q => ({ ...q, topic: commonTopic })));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commonTopic]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newQuestions = acceptedFiles.map(file => ({
      id: `${file.name}-${Date.now()}`,
      file,
      preview: URL.createObjectURL(file),
      subject: commonSubject,
      topic: commonTopic,
      options: ["", ""],
      correctAnswer: 0,
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
    }
  };

  const removeOption = (questionId: string, optionIndex: number) => {
      const question = uploadedQuestions.find(q => q.id === questionId);
      if (question && question.options.length > 2) {
          const newOptions = question.options.filter((_, i) => i !== optionIndex);
          const newCorrectAnswer = question.correctAnswer >= newOptions.length ? 0 : question.correctAnswer;
          updateQuestionField(questionId, 'options', newOptions);
          updateQuestionField(questionId, 'correctAnswer', newCorrectAnswer);
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
        !q.subject || !q.topic || q.options.some(opt => opt.trim() === '')
    );

    if (invalidQuestion) {
        toast({ title: "Eksik Bilgi", description: "Lütfen tüm sorular için ders, konu ve şık bilgilerini eksiksiz doldurun.", variant: "destructive" });
        return;
    }

    setIsLoading(true);
    try {
        const questionsData = uploadedQuestions.map(q => {
            return {
                imageDataUri: q.preview,
                subject: q.subject,
                topic: q.topic,
                options: q.options.reduce((acc, opt, index) => {
                    acc[String.fromCharCode(65 + index)] = opt;
                    return acc;
                }, {} as {[key: string]: string}),
                correctAnswer: String.fromCharCode(65 + q.correctAnswer),
            };
        });
        
        await addBulkBankQuestions(questionsData);
        
        toast({ title: "Başarılı!", description: `${questionsData.length} soru başarıyla soru bankasına eklendi!` });
        setUploadedQuestions([]);
        onQuestionsAdded();
        onBack();

    } catch (error) {
        console.error("Error adding questions:", error);
        toast({ title: "Hata", description: "Sorular eklenirken bir hata oluştu.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-5 w-5 mr-2" /> Geri</Button>
      
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
                             <Combobox options={subjectOptions} value={commonSubject} onChange={setCommonSubject} onCreate={onSubjectCreated} placeholder="Tümüne ders ata..." notfoundText="Ders bulunamadı." createText="Yeni ders oluştur:" />
                             <Combobox options={topicOptions} value={commonTopic} onChange={setCommonTopic} onCreate={onTopicCreated} placeholder="Tümüne konu ata..." notfoundText="Konu bulunamadı." createText="Yeni konu oluştur:" />
                        </div>
                    </Card>

                    {uploadedQuestions.map(q => (
                        <Card key={q.id} className="p-4 relative">
                            <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => removeUploadedQuestion(q.id)}>
                                <X className="h-4 w-4" />
                            </Button>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-1">
                                    <NextImage src={q.preview} alt={q.file.name} width={200} height={150} className="rounded-md object-contain border w-full" data-ai-hint="question paper" />
                                </div>
                                <div className="md:col-span-2 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <Combobox options={subjectOptions} value={q.subject} onChange={(val) => updateQuestionField(q.id, 'subject', val)} onCreate={onSubjectCreated} placeholder="Ders seç..." notfoundText="Ders bulunamadı." createText="Yeni ders oluştur:" />
                                        <Combobox options={topicOptions} value={q.topic} onChange={(val) => updateQuestionField(q.id, 'topic', val)} onCreate={onTopicCreated} placeholder="Konu seç..." notfoundText="Konu bulunamadı." createText="Yeni konu oluştur:" />
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
                                         <Button type="button" variant="outline" size="sm" onClick={() => addOption(q.id)}><Plus className="h-4 w-4 mr-2" />Şık Ekle</Button>
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
                    {isLoading ? <Loader2 className="animate-spin mr-2"/> : null}
                    {isLoading ? `Sorular Ekleniyor...` : `${uploadedQuestions.length} Soruyu Bankaya Ekle`}
                </Button>
            </CardHeader>
        )}
      </Card>
    </div>
  );
}


export function QuestionsClient() {
  const { user } = useAuth();
  const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<'list' | 'bulk_add'>('list');

  const [allSubjects, setAllSubjects] = useState<string[]>([]);
  const [allTopics, setAllTopics] = useState<string[]>([]);

  useEffect(() => {
    setIsLoading(true);
    const unsubQuestions = onBankQuestionsUpdate((questions) => {
        setBankQuestions(questions);
        setIsLoading(false);
    });
    const unsubSubjects = onSubjectsUpdate(setAllSubjects);
    const unsubTopics = onTopicsUpdate(setAllTopics);
    return () => {
        unsubQuestions();
        unsubSubjects();
        unsubTopics();
    };
  }, []);

  const handleCreateSubject = async (subjectName: string) => {
    const newSubjects = [...new Set([...allSubjects, subjectName])];
    await updateSubjects(newSubjects);
    toast({title: "Ders Oluşturuldu", description: `${subjectName} dersi eklendi.`});
  };
  
  const handleCreateTopic = async (topicName: string) => {
    const newTopics = [...new Set([...allTopics, topicName])];
    await updateTopics(newTopics);
    toast({title: "Konu Oluşturuldu", description: `${topicName} konusu eklendi.`});
  };

  const openEditDialog = (question: BankQuestion) => {
    // This needs a new single-question edit form.
    // For now, we'll just log it.
    console.log("Editing question:", question);
     toast({ title: "Düzenleme Henüz Aktif Değil", description: "Bu özellik yakında eklenecektir." });
  }

  const handleDeleteQuestion = async (id: string) => {
    try {
        await deleteBankQuestion(id);
        toast({ title: "Soru Silindi", variant: "destructive"});
    } catch(error) {
        toast({ title: "Hata", description: "Soru silinirken bir hata oluştu.", variant: "destructive" });
    }
  }

  const groupedQuestions = useMemo(() => {
    const grouped: Record<string, Record<string, BankQuestion[]>> = {};
    bankQuestions.forEach(q => {
        if (!grouped[q.subject]) {
            grouped[q.subject] = {};
        }
        if (!grouped[q.subject][q.topic]) {
            grouped[q.subject][q.topic] = [];
        }
        grouped[q.subject][q.topic].push(q);
    });
    return grouped;
  }, [bankQuestions]);

  if (isLoading) {
    return <p>Yükleniyor...</p>;
  }
  
  if (mode === 'bulk_add') {
    return <BulkAddQuestionsFlow 
                onBack={() => setMode('list')} 
                subjects={allSubjects} 
                topics={allTopics} 
                onSubjectCreated={handleCreateSubject}
                onTopicCreated={handleCreateTopic}
                onQuestionsAdded={() => { /* maybe refetch? onSnapshot handles it */ }}
            />
  }

  return (
    <div className="space-y-4">
        <Button onClick={() => setMode('bulk_add')}>
            <Plus className="mr-2 h-4 w-4" /> Toplu Soru Ekle
        </Button>
      <Card>
        <CardHeader>
          <CardTitle>Mevcut Sorular</CardTitle>
          <CardDescription>
            Soru bankasındaki tüm soruları buradan görüntüleyebilirsiniz.
          </CardDescription>
        </CardHeader>
        <CardContent>
            {Object.keys(groupedQuestions).length > 0 ? (
                 <Accordion type="multiple" className="w-full">
                    {Object.entries(groupedQuestions).map(([subject, topics]) => (
                        <AccordionItem value={subject} key={subject}>
                            <AccordionTrigger className="text-lg font-medium">{subject}</AccordionTrigger>
                            <AccordionContent className="pl-4">
                                <Accordion type="multiple" className="w-full">
                                {Object.entries(topics).map(([topic, questions]) => (
                                    <AccordionItem value={topic} key={topic}>
                                        <AccordionTrigger>{topic}</AccordionTrigger>
                                        <AccordionContent className="pl-4">
                                            <div className="space-y-3">
                                                {questions.map((q) => (
                                                    <div key={q.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
                                                        <div className="flex items-center gap-3 flex-1">
                                                            <FileText className="h-4 w-4 text-muted-foreground" />
                                                             <NextImage src={q.imageUrl} alt={q.topic} width={80} height={60} className="rounded-sm border object-contain aspect-video" data-ai-hint="question paper" />
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline">Doğru: {q.correctAnswer}</Badge>
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
                                                    </div>
                                                ))}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                                </Accordion>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            ) : (
                <p className="text-center py-10 text-muted-foreground">Henüz soru eklenmemiş.</p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
