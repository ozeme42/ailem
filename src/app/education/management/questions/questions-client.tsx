
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, Image as ImageIcon, Trash2, Plus, Minus, X, KeyRound, MoreVertical, Edit, FileText, FilePlus, AlertTriangle, UploadCloud, Send } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useDropzone } from 'react-dropzone';
import NextImage from 'next/image';
import { addBulkBankQuestions, onBankQuestionsUpdate, onSubjectsUpdate, onTopicsUpdate, updateSubjects, updateTopics, deleteBankQuestion, deleteBulkBankQuestions, addTest } from "@/lib/dataService";
import { BankQuestion, FamilyMember, Test } from "@/lib/data";
import { Combobox } from "@/components/ui/combobox";
import { Loader2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewQuestionBankForm } from "@/components/new-question-bank-form";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";


export function QuestionsClient() {
  const { user, familyMembers } = useAuth();
  const router = useRouter();
  const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkDialogType, setBulkDialogType] = useState<'mcq' | 'open_ended'>('mcq');


  const [editingQuestion, setEditingQuestion] = useState<BankQuestion | null>(null);
  const [defaultQuestionType, setDefaultQuestionType] = useState<'mcq' | 'open_ended'>('mcq');

  const [allSubjects, setAllSubjects] = useState<string[]>([]);
  const [allTopics, setAllTopics] = useState<string[]>([]);

  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);

  const { toast } = useToast();

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

  const handleOpenForm = (question: BankQuestion | null, type: 'mcq' | 'open_ended') => {
    setEditingQuestion(question);
    setDefaultQuestionType(type);
    setIsFormOpen(true);
  }

  const handleDeleteQuestion = async (id: string) => {
    try {
        await deleteBankQuestion(id);
        toast({ title: "Soru Silindi", variant: "destructive"});
    } catch(error) {
        toast({ title: "Hata", description: "Soru silinirken bir hata oluştu.", variant: "destructive" });
    }
  }

  const handleDeleteSelected = async () => {
    try {
        await deleteBulkBankQuestions(selectedQuestions);
        toast({ title: `${selectedQuestions.length} Soru Silindi`, variant: "destructive"});
        setSelectedQuestions([]);
    } catch(error) {
        toast({ title: "Hata", description: "Sorular silinirken bir hata oluştu.", variant: "destructive" });
    }
  }

  const handleBulkImport = async (questions: any[], type: 'mcq' | 'open_ended') => {
    toast({ title: "İçe Aktarma Başlatıldı", description: "Sorular havuza aktarılıyor." });
    setIsBulkDialogOpen(false);

    try {
        const questionsToImport = questions.map((q, index) => ({
            ...q,
            title: q.originalFilename || `${q.topic} - Soru ${index + 1}`,
            originalFilename: q.originalFilename,
            type: type
        }))
        await addBulkBankQuestions(questionsToImport);
        toast({ title: "✅ Toplu Ekleme Başarılı", description: `${questions.length} soru başarıyla bankaya eklendi.` });
    } catch (e) {
      toast({ title: "❌ Toplu Ekleme Hatası", description: "Toplu ekleme sırasında bir hata oluştu.", variant: 'destructive' });
    }
  };

  const handleAssignSelected = () => {
      if (selectedQuestions.length === 0) return;
      // This is just a placeholder implementation.
      // We are now navigating to a new page.
      // The actual assignment logic is in `assign-client.tsx`.
      // For now, we'll just log it.
      console.log("Navigating to assignment page with questions:", selectedQuestions);
      router.push(`/education/management/assign?questions=${selectedQuestions.join(',')}`);

  }

  const mcqQuestions = useMemo(() => bankQuestions.filter(q => q.type !== 'open_ended'), [bankQuestions]);
  const openEndedQuestions = useMemo(() => bankQuestions.filter(q => q.type === 'open_ended'), [bankQuestions]);

  if (isLoading) {
    return <p>Yükleniyor...</p>;
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="mcq">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="mcq">Çoktan Seçmeli Sorular ({mcqQuestions.length})</TabsTrigger>
            <TabsTrigger value="open_ended">Açık Uçlu Sorular ({openEndedQuestions.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="mcq">
            <QuestionList 
              questions={mcqQuestions} 
              onAdd={() => handleOpenForm(null, 'mcq')}
              onBulkAdd={() => { setBulkDialogType('mcq'); setIsBulkDialogOpen(true); }}
              onEdit={(q) => handleOpenForm(q, 'mcq')} 
              onDelete={handleDeleteQuestion} 
              onDeleteSelected={handleDeleteSelected}
              selectedQuestions={selectedQuestions}
              setSelectedQuestions={setSelectedQuestions}
              type="mcq"
              onAssign={handleAssignSelected}
            />
        </TabsContent>
        <TabsContent value="open_ended">
            <QuestionList 
              questions={openEndedQuestions} 
              onAdd={() => handleOpenForm(null, 'open_ended')} 
              onBulkAdd={() => { setBulkDialogType('open_ended'); setIsBulkDialogOpen(true); }}
              onEdit={(q) => handleOpenForm(q, 'open_ended')} 
              onDelete={handleDeleteQuestion}
              onDeleteSelected={handleDeleteSelected}
              selectedQuestions={selectedQuestions}
              setSelectedQuestions={setSelectedQuestions}
              type="open_ended"
              onAssign={handleAssignSelected}
            />
        </TabsContent>
      </Tabs>
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <NewQuestionBankForm
            availableSubjects={allSubjects}
            onSubjectCreated={handleCreateSubject}
            availableTopics={allTopics}
            onTopicCreated={handleCreateTopic}
            onQuestionProcessed={() => setIsFormOpen(false)}
            initialData={editingQuestion}
            defaultType={defaultQuestionType}
          />
        </DialogContent>
      </Dialog>
      <BulkAddImagesDialog 
        open={isBulkDialogOpen} 
        onOpenChange={setIsBulkDialogOpen} 
        onImport={handleBulkImport}
        existingSubjects={allSubjects}
        existingTopics={allTopics}
        onSubjectCreate={handleCreateSubject}
        onTopicCreate={handleCreateTopic}
        type={bulkDialogType}
      />
    </div>
  );
}

interface QuestionListProps {
  questions: BankQuestion[];
  onAdd: () => void;
  onBulkAdd: () => void;
  onEdit: (q: BankQuestion) => void;
  onDelete: (id: string) => void;
  onDeleteSelected: () => void;
  selectedQuestions: string[];
  setSelectedQuestions: React.Dispatch<React.SetStateAction<string[]>>;
  type: 'mcq' | 'open_ended';
  onAssign: () => void;
}

function QuestionList({ questions, onAdd, onBulkAdd, onEdit, onDelete, onDeleteSelected, selectedQuestions, setSelectedQuestions, type, onAssign }: QuestionListProps) {
    const groupedQuestions = useMemo(() => {
        const grouped: Record<string, Record<string, BankQuestion[]>> = {};
        questions.forEach(q => {
            if (!grouped[q.subject]) {
                grouped[q.subject] = {};
            }
            if (!grouped[q.subject][q.topic]) {
                grouped[q.subject][q.topic] = [];
            }
            grouped[q.subject][q.topic].push(q);
        });
        return grouped;
    }, [questions]);
    
    const handleToggleTopicSelection = (topicQuestions: BankQuestion[]) => {
        const topicQuestionIds = topicQuestions.map(q => q.id);
        const areAllSelected = topicQuestionIds.every(id => selectedQuestions.includes(id));

        if (areAllSelected) {
            setSelectedQuestions(prev => prev.filter(id => !topicQuestionIds.includes(id)));
        } else {
            setSelectedQuestions(prev => [...new Set([...prev, ...topicQuestionIds])]);
        }
    };
    
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
            <div>
                <CardTitle>Mevcut Sorular ({questions.length})</CardTitle>
                <CardDescription>
                Bu kategorideki tüm soruları buradan görüntüleyebilirsiniz.
                </CardDescription>
            </div>
            <div className="flex gap-2 self-start sm:self-center flex-wrap">
                 {selectedQuestions.length > 0 && (
                     <>
                        <Button variant="secondary" onClick={onAssign}><Send className="mr-2 h-4 w-4"/> {selectedQuestions.length} Soruyu Ata</Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" /> Sil</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Emin misiniz?</AlertDialogTitle><AlertDialogDescription>{selectedQuestions.length} soruyu kalıcı olarak silmek üzeresiniz. Bu işlem geri alınamaz.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={onDeleteSelected}>Evet, Sil</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </>
                 )}
                 <Button variant="outline" onClick={onBulkAdd}><FilePlus className="mr-2 h-4 w-4" /> Toplu Ekle</Button>
                 <Button onClick={onAdd}><Plus className="mr-2 h-4 w-4" /> Yeni Soru Ekle</Button>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        {Object.keys(groupedQuestions).length > 0 ? (
          <Accordion type="multiple" className="w-full">
            {Object.entries(groupedQuestions).map(([subject, topics]) => (
              <AccordionItem value={subject} key={subject}>
                <AccordionTrigger className="text-lg font-medium">{subject}</AccordionTrigger>
                <AccordionContent className="pl-4">
                  <Accordion type="multiple" className="w-full">
                    {Object.entries(topics).map(([topic, topicQuestions]) => {
                        const allTopicQuestionsSelected = topicQuestions.every(q => selectedQuestions.includes(q.id));
                        const someTopicQuestionsSelected = topicQuestions.some(q => selectedQuestions.includes(q.id));

                        return (
                          <AccordionItem value={topic} key={topic}>
                            <div className="flex items-center">
                                <Checkbox
                                    checked={allTopicQuestionsSelected ? true : (someTopicQuestionsSelected ? "indeterminate" : false)}
                                    onCheckedChange={() => handleToggleTopicSelection(topicQuestions)}
                                    className="mr-2"
                                />
                                <AccordionTrigger className="flex-1">{topic} ({topicQuestions.length})</AccordionTrigger>
                            </div>
                            <AccordionContent className="pl-4">
                              <div className="space-y-3">
                                {topicQuestions.map((q) => (
                                  <div key={q.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <Checkbox
                                        checked={selectedQuestions.includes(q.id)}
                                        onCheckedChange={(checked) => {
                                            setSelectedQuestions(prev => checked ? [...prev, q.id] : prev.filter(id => id !== q.id))
                                        }}
                                      />
                                      <div className="relative shrink-0">
                                          <NextImage src={q.imageUrl} alt={q.topic} width={80} height={60} className="rounded-sm border object-contain aspect-video" data-ai-hint="question paper" />
                                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-1 rounded-b-sm">
                                             <p className="text-white text-[10px] font-semibold truncate" title={q.originalFilename || q.title}>{q.originalFilename || q.title}</p>
                                          </div>
                                      </div>
                                      <div className="flex-grow min-w-0">
                                          <p className="font-semibold truncate text-sm">{q.topic}</p>
                                          <p className="text-xs text-muted-foreground truncate">{q.subject}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {q.type !== 'open_ended' && <Badge variant="outline">Doğru: {q.correctAnswer}</Badge>}
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(q)}><Edit className="h-4 w-4"/></Button>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button variant="ghost" size="icon" className="text-destructive/70 hover:text-destructive h-7 w-7"><Trash2 className="h-4 w-4"/></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader><AlertDialogTitle>Soruyu Sil</AlertDialogTitle><AlertDialogDescription>Bu soruyu bankadan kalıcı olarak silmek istediğinizden emin misiniz?</AlertDialogDescription></AlertDialogHeader>
                                          <AlertDialogFooter><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => onDelete(q.id)}>Evet, Sil</AlertDialogAction></AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        )
                    })}
                  </Accordion>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <p className="text-center py-10 text-muted-foreground">Bu kategoride henüz soru eklenmemiş.</p>
        )}
      </CardContent>
    </Card>
  );
}

const bulkAddSchema = z.object({
  subject: z.string().min(1, "Ders seçimi zorunludur."),
  topic: z.string().min(1, "Konu seçimi zorunludur."),
  images: z.array(z.object({
      dataUri: z.string(),
      filename: z.string(),
  })).min(1, "En az bir resim yüklemelisiniz."),
});

function BulkAddImagesDialog({ 
    open, 
    onOpenChange, 
    onImport,
    existingSubjects,
    existingTopics,
    onSubjectCreate,
    onTopicCreate,
    type
}: { 
    open: boolean, 
    onOpenChange: (open: boolean) => void, 
    onImport: (questions: Partial<BankQuestion>[], type: 'mcq' | 'open_ended') => void,
    existingSubjects: string[],
    existingTopics: string[],
    onSubjectCreate: (name: string) => void,
    onTopicCreate: (name: string) => void,
    type: 'mcq' | 'open_ended';
}) {
    const [isImporting, setIsImporting] = useState(false);
    
    const form = useForm<z.infer<typeof bulkAddSchema>>({
        resolver: zodResolver(bulkAddSchema),
        defaultValues: { subject: '', topic: '', images: [] },
    });
    
    const onDrop = useCallback((acceptedFiles: File[]) => {
        const currentImages = form.getValues('images') || [];
        const filePromises = acceptedFiles.map(file => 
            new Promise<{dataUri: string, filename: string}>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve({
                    dataUri: reader.result as string,
                    filename: file.name
                });
                reader.readAsDataURL(file);
            })
        );
        Promise.all(filePromises).then(newImages => {
            form.setValue('images', [...currentImages, ...newImages], { shouldValidate: true });
        });
    }, [form]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif'] }
    });
    
    const handleRemoveImage = (index: number) => {
        const currentImages = form.getValues('images') || [];
        form.setValue('images', currentImages.filter((_, i) => i !== index));
    };

    const handleImportClick = (values: z.infer<typeof bulkAddSchema>) => {
        setIsImporting(true);
        const questionsToImport = values.images.map((image, index) => ({
            originalFilename: image.filename,
            subject: values.subject,
            topic: values.topic,
            imageUrl: image.dataUri, // This is a data URI, will be uploaded by the handler
        }));

        onImport(questionsToImport, type).finally(() => {
            setIsImporting(false);
            form.reset();
        });
    };
    
    const subjectOptions = existingSubjects.map(s => ({label: s, value: s}));
    const topicOptions = existingTopics.map(s => ({label: s, value: s}));

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) form.reset(); onOpenChange(o); }}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Toplu Soru Ekle</DialogTitle>
                    <DialogDescription>
                       Birden çok soru görseli seçin. Tüm sorular seçili ders ve konuya eklenecektir.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(handleImportClick)} className="space-y-4">
                        <ScrollArea className="h-[60vh] pr-4">
                          <div className="space-y-4 mt-4">
                               <div 
                                  {...getRootProps()} 
                                  className={`w-full aspect-video border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:border-primary cursor-pointer ${isDragActive ? 'border-primary bg-primary/10' : ''}`}
                               >
                                  <input {...getInputProps()} />
                                  <UploadCloud className="h-10 w-10"/>
                                  <p className="mt-2 text-sm">Resimleri sürükle bırak veya tıkla</p>
                               </div>
                               
                               <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                                  {(form.watch('images') || []).map((image, index) => (
                                      <div key={index} className="relative group">
                                          <NextImage src={image.dataUri} alt={`Önizleme ${index}`} width={100} height={100} className="w-full h-auto object-cover rounded-md border"/>
                                          <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleRemoveImage(index)}>
                                             <X className="h-4 w-4"/>
                                          </Button>
                                      </div>
                                  ))}
                               </div>
                               
                               <FormField control={form.control} name="subject" render={({field}) => (
                                 <FormItem><FormLabel>Ders</FormLabel><Combobox options={subjectOptions} value={field.value} onChange={field.onChange} onCreate={onSubjectCreate} placeholder="Ders seç veya oluştur..." notfoundText="Ders bulunamadı." createText="Yeni ders oluştur:"/><FormMessage/></FormItem>
                               )}/>
                               <FormField control={form.control} name="topic" render={({field}) => (
                                 <FormItem><FormLabel>Konu</FormLabel><Combobox options={topicOptions} value={field.value} onChange={field.onChange} onCreate={onTopicCreate} placeholder="Konu seç veya oluştur..." notfoundText="Konu bulunamadı." createText="Yeni konu oluştur:"/><FormMessage/></FormItem>
                               )}/>
                          </div>
                        </ScrollArea>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isImporting}>İptal</Button>
                            <Button type="submit" disabled={isImporting || (form.watch('images') || []).length === 0}>
                                {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {form.getValues('images')?.length || 0} Soruyu İçe Aktar
                            </Button>
                        </DialogFooter>
                    </form>
            </DialogContent>
        </Dialog>
    );
}
