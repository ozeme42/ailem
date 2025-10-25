
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, Image as ImageIcon, Trash2, Plus, Minus, X, KeyRound, MoreVertical, Edit, FileText, FilePlus, AlertTriangle } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewQuestionBankForm } from "@/components/new-question-bank-form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { z } from "zod";
import { Textarea } from "@/components/ui/textarea";

export function QuestionsClient() {
  const { user } = useAuth();
  const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkJsonOpen, setIsBulkJsonOpen] = useState(false);
  const [bulkJsonType, setBulkJsonType] = useState<'mcq' | 'open_ended'>('mcq');

  const [editingQuestion, setEditingQuestion] = useState<BankQuestion | null>(null);
  const [defaultQuestionType, setDefaultQuestionType] = useState<'mcq' | 'open_ended'>('mcq');

  const [allSubjects, setAllSubjects] = useState<string[]>([]);
  const [allTopics, setAllTopics] = useState<string[]>([]);

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

  const handleBulkImport = async (importedQuestions: any[]) => {
    toast({ title: "İçe Aktarma Başlatıldı", description: "Sorular ve görseller havuza aktarılıyor." });
    setIsBulkJsonOpen(false);

    try {
        await addBulkBankQuestions(importedQuestions);
        toast({ title: "✅ Toplu Ekleme Başarılı", description: `${importedQuestions.length} soru başarıyla bankaya eklendi.` });
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
              onBulkAdd={() => { setBulkJsonType('mcq'); setIsBulkJsonOpen(true); }}
              onEdit={(q) => handleOpenForm(q, 'mcq')} 
              onDelete={handleDeleteQuestion} 
              type="mcq"
            />
        </TabsContent>
        <TabsContent value="open_ended">
            <QuestionList 
              questions={openEndedQuestions} 
              onAdd={() => handleOpenForm(null, 'open_ended')} 
              onBulkAdd={() => { setBulkJsonType('open_ended'); setIsBulkJsonOpen(true); }}
              onEdit={(q) => handleOpenForm(q, 'open_ended')} 
              onDelete={handleDeleteQuestion} 
              type="open_ended"
            />
        </TabsContent>
      </Tabs>
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
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
      <BulkAddJsonDialog open={isBulkJsonOpen} onOpenChange={setIsBulkJsonOpen} onImport={handleBulkImport} type={bulkJsonType} />
    </div>
  );
}

interface QuestionListProps {
  questions: BankQuestion[];
  onAdd: () => void;
  onBulkAdd: () => void;
  onEdit: (q: BankQuestion) => void;
  onDelete: (id: string) => void;
  type: 'mcq' | 'open_ended';
}

function QuestionList({ questions, onAdd, onBulkAdd, onEdit, onDelete, type }: QuestionListProps) {
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
    
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
            <div>
                <CardTitle>Mevcut Sorular</CardTitle>
                <CardDescription>
                Bu kategorideki tüm soruları buradan görüntüleyebilirsiniz.
                </CardDescription>
            </div>
            <div className="flex gap-2 self-start sm:self-center">
                 <Button variant="secondary" onClick={onBulkAdd}><FilePlus className="mr-2 h-4 w-4" /> Toplu Ekle</Button>
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
                    ))}
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

// BULK ADD JSON DIALOG
const bulkAddMcqSchema = z.array(z.object({
  subject: z.string().min(1),
  topic: z.string().min(1),
  imageUrl: z.string().url(),
  options: z.record(z.string()),
  correctAnswer: z.string(),
  type: z.literal('mcq').optional().default('mcq'),
}));

const bulkAddOpenEndedSchema = z.array(z.object({
  subject: z.string().min(1),
  topic: z.string().min(1),
  imageUrl: z.string().url(),
  type: z.literal('open_ended').optional().default('open_ended'),
}));


function BulkAddJsonDialog({ open, onOpenChange, onImport, type }: { open: boolean, onOpenChange: (open: boolean) => void, onImport: (books: any[]) => void, type: 'mcq' | 'open_ended' }) {
    const [jsonInput, setJsonInput] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isImporting, setIsImporting] = useState(false);

    const validationSchema = type === 'mcq' ? bulkAddMcqSchema : bulkAddOpenEndedSchema;
    const exampleJson = type === 'mcq' ? `[
  {
    "subject": "Matematik",
    "topic": "Üslü Sayılar",
    "imageUrl": "https://ornek.com/soru1.png",
    "options": { "A": "2", "B": "4", "C": "8", "D": "16" },
    "correctAnswer": "C"
  }
]` : `[
  {
    "subject": "Tarih",
    "topic": "Osmanlı Yükselme Dönemi",
    "imageUrl": "https://ornek.com/soru2.png",
    "type": "open_ended"
  }
]`;


    const handleImportClick = () => {
        setError(null);
        if (!jsonInput.trim()) return setError("Lütfen geçerli bir JSON verisi girin.");

        try {
            const parsed = JSON.parse(jsonInput);
            const result = validationSchema.safeParse(parsed);
            if (!result.success) {
                 const formattedErrors = result.error.errors.map(err => `[${err.path.join('.')}] ${err.message}`).join('\n');
                 setError(`JSON verisi doğrulanamadı:\n${formattedErrors}`);
                 return;
            }
            setIsImporting(true);
            onImport(result.data).finally(() => setIsImporting(false));
            setJsonInput('');
        } catch (e) {
            setError("Geçersiz JSON formatı. Lütfen veriyi kontrol edin.");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Toplu Soru Ekle (JSON)</DialogTitle>
                    <DialogDescription>
                        {type === 'mcq' ? 'Çoktan seçmeli' : 'Açık uçlu'} soruları JSON formatında yapıştırın. Görseller URL olarak belirtilmelidir.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div>
                         <Label htmlFor="json-input" className="mb-2 block">JSON Verisi</Label>
                         <Textarea id="json-input" value={jsonInput} onChange={(e) => setJsonInput(e.target.value)} className="h-64 font-mono text-xs" disabled={isImporting} />
                         {error && <p className="text-sm font-medium text-destructive mt-2 whitespace-pre-wrap">{error}</p>}
                    </div>
                    <div>
                         <Label className="mb-2 block">Örnek Format</Label>
                         <Card className="bg-muted/50 p-4 h-64 overflow-auto">
                            <pre className="text-xs font-mono"><code>{exampleJson}</code></pre>
                         </Card>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isImporting}>İptal</Button>
                    <Button onClick={handleImportClick} disabled={isImporting}>
                        {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        İçeri Aktar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
