
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { z } from "zod";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Calendar } from "@/components/ui/calendar";


export function QuestionsClient() {
  const { user, familyMembers } = useAuth();
  const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
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
              onAssign={() => setIsAssignDialogOpen(true)}
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
              onAssign={() => setIsAssignDialogOpen(true)}
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
      <AssignTestDialog
          isOpen={isAssignDialogOpen}
          onOpenChange={setIsAssignDialogOpen}
          students={familyMembers.filter(m => m.role.includes("Çocuk"))}
          allBankQuestions={bankQuestions}
          selectedQuestionIds={selectedQuestions}
          onAssignComplete={() => setSelectedQuestions([])}
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
                <Form {...form}>
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
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function AssignTestDialog({
  isOpen,
  onOpenChange,
  students,
  allBankQuestions,
  selectedQuestionIds,
  onAssignComplete,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  students: FamilyMember[];
  allBankQuestions: BankQuestion[];
  selectedQuestionIds: string[];
  onAssignComplete: () => void;
}) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Simplified state management
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(),
    to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  const selectedQuestions = useMemo(() => 
    selectedQuestionIds.map(id => allBankQuestions.find(q => q.id === id)).filter((q): q is BankQuestion => !!q)
  , [selectedQuestionIds, allBankQuestions]);

  useEffect(() => {
    if (isOpen && selectedQuestions.length > 0) {
      const firstQuestion = selectedQuestions[0];
      setTitle(`${firstQuestion.topic} Tekrar Testi`);
      setSubject(firstQuestion.subject);
      setSelectedStudentIds([]);
      setDateRange({ from: new Date(), to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
    }
  }, [isOpen, selectedQuestions]);

  const handleStudentSelect = (studentId: string, checked: boolean) => {
    setSelectedStudentIds(prev => 
      checked ? [...prev, studentId] : prev.filter(id => id !== studentId)
    );
  };
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedStudentIds.length === 0 || !title || !subject) {
        toast({ title: "Eksik Bilgi", description: "Lütfen başlık, ders ve en az bir öğrenci seçin.", variant: "destructive"});
        return;
    }

    setIsSubmitting(true);
    
    for (const studentId of selectedStudentIds) {
        const testData: Omit<Test, 'id' | 'familyId' | 'status' | 'isArchived'> = {
            title: title,
            subject: subject,
            studentId,
            questionCount: selectedQuestions.length,
            assignedDate: format(dateRange.from, 'dd MMMM yyyy', { locale: tr }),
            dueDate: format(dateRange.to, 'dd MMMM yyyy', { locale: tr }),
            sourceType: 'bank',
        };
        try {
            await addTest(testData, selectedQuestions);
        } catch (error) {
            console.error(error);
            toast({ title: "Hata", description: `${title} testi ${students.find(s=>s.id === studentId)?.name} öğrencisine atanırken hata oluştu.`, variant: "destructive" });
        }
    }

    toast({
      title: "✅ Ödev Atandı",
      description: `${title} testi ${selectedStudentIds.length} öğrenciye başarıyla atandı.`,
    });
    
    setIsSubmitting(false);
    onOpenChange(false);
    onAssignComplete();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{selectedQuestionIds.length} Soruyu Ata</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
                <Label htmlFor="title">Test Başlığı</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="subject">Ders</Label>
                <Input id="subject" value={subject} readOnly disabled />
            </div>
             <div className="space-y-2">
                <Label>Öğrenci(ler)</Label>
                {students.map(s => (
                    <div key={s.id} className="flex items-center gap-2">
                        <Checkbox 
                            id={`student-${s.id}`} 
                            checked={selectedStudentIds.includes(s.id)} 
                            onCheckedChange={(checked) => handleStudentSelect(s.id, !!checked)} 
                        />
                        <Label htmlFor={`student-${s.id}`} className="font-normal">{s.name}</Label>
                    </div>
                ))}
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-2">
                    <Label>Başlangıç Tarihi</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !dateRange.from && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange.from ? format(dateRange.from, "PPP", { locale: tr }) : <span>Tarih seçin</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={dateRange.from} onSelect={(d) => setDateRange(prev => ({...prev, from: d || new Date()}))} initialFocus />
                        </PopoverContent>
                    </Popover>
                </div>
                 <div className="flex flex-col space-y-2">
                    <Label>Bitiş Tarihi</Label>
                     <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !dateRange.to && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange.to ? format(dateRange.to, "PPP", { locale: tr }) : <span>Tarih seçin</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={dateRange.to} onSelect={(d) => setDateRange(prev => ({...prev, to: d || new Date()}))} disabled={(date) => date < dateRange.from} initialFocus />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>İptal</Button>
              <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                  Ödevi Ata
              </Button>
            </DialogFooter>
          </form>
      </DialogContent>
    </Dialog>
  );
}

    