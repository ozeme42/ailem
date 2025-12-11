"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { z } from "zod";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, Image as ImageIcon, Trash2, Plus, Minus, X, KeyRound, MoreVertical, Edit, FileText, FilePlus, AlertTriangle, UploadCloud, Send, Calendar as CalendarIcon, FileQuestion, BookCopy, Settings, Search, CheckCircle2, ChevronRight, LayoutGrid, CheckSquare, Layers, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useDropzone } from 'react-dropzone';
import NextImage from 'next/image';
import { addBulkBankQuestions, onBankQuestionsUpdate, onSubjectsUpdate, onTopicsUpdate, updateSubjects, updateTopics, deleteBankQuestion, deleteBulkBankQuestions, addTest, onMistakesUpdate, deleteMistake, onTestsUpdate } from "@/lib/dataService";
import { BankQuestion, FamilyMember, Test, Mistake } from "@/lib/data";
import { Combobox } from "@/components/ui/combobox";
import { Loader2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewQuestionBankForm } from "@/components/new-question-bank-form";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form as RhfForm, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, addDays } from "date-fns";
import { tr } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";

// --- DESIGN SYSTEM: Glassmorphism ---
const glassColors = {
    HEADER_BG: "bg-slate-950/70 backdrop-blur-lg border-b border-white/5",
    CARD_BG: "bg-white/5 border border-white/10 shadow-lg backdrop-blur-md",
    ICON_BOX: "bg-gradient-to-br p-2.5 rounded-xl shadow-lg",
    BUTTON_GLASS: "bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow-sm",
    INPUT_BG: "bg-slate-900/50 border-white/10 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500/50",
    TAB_LIST: "bg-slate-900/50 border border-white/10 p-1",
    TAB_TRIGGER: "data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400 hover:text-slate-200",
};

export function QuestionsClient() {
  const { user, familyMembers } = useAuth();
  const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkDialogType, setBulkDialogType] = useState<'mcq' | 'open_ended'>('mcq');

  const [editingQuestion, setEditingQuestion] = useState<BankQuestion | null>(null);
  const [defaultQuestionType, setDefaultQuestionType] = useState<'mcq' | 'open_ended'>('mcq');

  const [allSubjects, setAllSubjects] = useState<string[]>([]);
  const [allTopics, setAllTopics] = useState<string[]>([]);

  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [selectedMistakeIds, setSelectedMistakeIds] = useState<string[]>([]);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [assignmentType, setAssignmentType] = useState<'bank' | 'mistake'>('bank');


  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setIsLoading(true);
    const unsubQuestions = onBankQuestionsUpdate((questions) => {
        setBankQuestions(questions);
        setIsLoading(false);
    });
    const unsubSubjects = onSubjectsUpdate(setAllSubjects);
    const unsubTopics = onTopicsUpdate(setAllTopics);
    const unsubMistakes = onMistakesUpdate(setMistakes);
    const unsubTests = onTestsUpdate(setTests);
    
    return () => {
        unsubQuestions();
        unsubSubjects();
        unsubTopics();
        unsubMistakes();
        unsubTests();
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

  const handleDeleteMistake = async (id: string) => {
    try {
        await deleteMistake(id);
        toast({ title: "Yanlış Soru Silindi", variant: "destructive"});
    } catch(error) {
        toast({ title: "Hata", description: "Yanlış soru silinirken bir hata oluştu.", variant: "destructive" });
    }
  }


  const handleDeleteSelectedBankQuestions = async () => {
    try {
        await deleteBulkBankQuestions(selectedQuestionIds);
        toast({ title: `${selectedQuestionIds.length} Soru Silindi`, variant: "destructive"});
        setSelectedQuestionIds([]);
    } catch(error) {
        toast({ title: "Hata", description: "Sorular silinirken bir hata oluştu.", variant: "destructive" });
    }
  }
  
  const handleDeleteSelectedMistakes = async () => {
      try {
        for (const mistakeId of selectedMistakeIds) {
            await deleteMistake(mistakeId);
        }
        toast({ title: `${selectedMistakeIds.length} Yanlış Soru Silindi`, variant: "destructive"});
        setSelectedMistakeIds([]);
      } catch (error) {
        toast({ title: "Hata", description: "Yanlış sorular silinirken bir hata oluştu.", variant: "destructive" });
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

  const mcqMistakes = useMemo(() => mistakes.filter(m => m.type !== 'open_ended'), [mistakes]);
  const openEndedMistakes = useMemo(() => mistakes.filter(m => m.type === 'open_ended'), [mistakes]);


  if (isLoading) {
    return (
        <div className="flex h-screen items-center justify-center bg-slate-950">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden flex flex-col">
        {/* FIXED BACKGROUND */}
        <div className="fixed inset-0 bg-slate-950 -z-50" />
        
        {/* AMBIENT BACKGROUND */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[20%] left-[-5%] w-[400px] h-[400px] bg-emerald-900/20 rounded-full blur-[120px]" />
        </div>

        {/* HEADER */}
        <div className={cn("sticky top-0 z-40 w-full transition-all duration-300", glassColors.HEADER_BG)}>
            <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button 
                        onClick={() => router.back()} 
                        variant="ghost" 
                        size="icon"
                        className="rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors -ml-2"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div className={cn("from-indigo-500 to-cyan-500", glassColors.ICON_BOX)}>
                         <BookCopy className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-slate-100 leading-none">
                            Soru Bankası
                        </h1>
                        <p className="text-xs font-medium text-slate-400 mt-0.5">İçerik Yönetimi</p>
                    </div>
                </div>
            </div>
        </div>

      <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 relative z-10 flex flex-col min-h-0">
          
          <Tabs defaultValue="bank" className="space-y-6 flex flex-col h-full">
            <TabsList className={cn("grid w-full max-w-md mx-auto grid-cols-2 h-12 rounded-2xl", glassColors.TAB_LIST)}>
                <TabsTrigger value="bank" className={cn("rounded-xl transition-all", glassColors.TAB_TRIGGER)}>Soru Bankası</TabsTrigger>
                <TabsTrigger value="mistakes" className={cn("rounded-xl transition-all", glassColors.TAB_TRIGGER)}>Yanlış Havuzu ({mistakes.length})</TabsTrigger>
            </TabsList>

            <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-20">
                <TabsContent value="bank" className="space-y-6 mt-0 animate-in fade-in zoom-in-95 duration-300">
                    <Tabs defaultValue="mcq" className="space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <TabsList className="bg-transparent p-0 gap-6 h-auto">
                                <TabsTrigger value="mcq" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent data-[state=active]:text-indigo-400 text-slate-400 pb-2 px-1 hover:text-slate-200">Çoktan Seçmeli ({mcqQuestions.length})</TabsTrigger>
                                <TabsTrigger value="open_ended" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent data-[state=active]:text-indigo-400 text-slate-400 pb-2 px-1 hover:text-slate-200">Açık Uçlu ({openEndedQuestions.length})</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="mcq" className="mt-0">
                            <QuestionList 
                            questions={mcqQuestions} 
                            onAdd={() => handleOpenForm(null, 'mcq')}
                            onBulkAdd={() => { setBulkDialogType('mcq'); setIsBulkDialogOpen(true); }}
                            onEdit={(q) => handleOpenForm(q, 'mcq')} 
                            onDelete={handleDeleteQuestion}
                            onDeleteSelected={handleDeleteSelectedBankQuestions}
                            selectedQuestions={selectedQuestionIds}
                            setSelectedQuestions={setSelectedQuestionIds}
                            onAssign={() => { setAssignmentType('bank'); setIsAssignDialogOpen(true); }}
                            />
                        </TabsContent>
                        <TabsContent value="open_ended" className="mt-0">
                            <QuestionList 
                            questions={openEndedQuestions} 
                            onAdd={() => handleOpenForm(null, 'open_ended')} 
                            onBulkAdd={() => { setBulkDialogType('open_ended'); setIsBulkDialogOpen(true); }}
                            onEdit={(q) => handleOpenForm(q, 'open_ended')} 
                            onDelete={handleDeleteQuestion}
                            onDeleteSelected={handleDeleteSelectedBankQuestions}
                            selectedQuestions={selectedQuestionIds}
                            setSelectedQuestions={setSelectedQuestionIds}
                            onAssign={() => { setAssignmentType('bank'); setIsAssignDialogOpen(true); }}
                            />
                        </TabsContent>
                    </Tabs>
                </TabsContent>
                
                <TabsContent value="mistakes" className="space-y-6 mt-0 animate-in fade-in zoom-in-95 duration-300">
                    <Tabs defaultValue="mcq" className="space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                             <TabsList className="bg-transparent p-0 gap-6 h-auto">
                                <TabsTrigger value="mcq" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent data-[state=active]:text-indigo-400 text-slate-400 pb-2 px-1 hover:text-slate-200">Çoktan Seçmeli ({mcqMistakes.length})</TabsTrigger>
                                <TabsTrigger value="open_ended" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent data-[state=active]:text-indigo-400 text-slate-400 pb-2 px-1 hover:text-slate-200">Açık Uçlu ({openEndedMistakes.length})</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="mcq" className="mt-0">
                            <MistakePoolList 
                                mistakes={mcqMistakes}
                                tests={tests}
                                onDelete={handleDeleteMistake}
                                onDeleteSelected={handleDeleteSelectedMistakes}
                                selectedMistakes={selectedMistakeIds}
                                setSelectedMistakes={setSelectedMistakeIds}
                                onAssign={() => { setAssignmentType('mistake'); setIsAssignDialogOpen(true); }}
                            />
                        </TabsContent>
                        <TabsContent value="open_ended" className="mt-0">
                            <MistakePoolList 
                                mistakes={openEndedMistakes}
                                tests={tests}
                                onDelete={handleDeleteMistake}
                                onDeleteSelected={handleDeleteSelectedMistakes}
                                selectedMistakes={selectedMistakeIds}
                                setSelectedMistakes={setSelectedMistakeIds}
                                onAssign={() => { setAssignmentType('mistake'); setIsAssignDialogOpen(true); }}
                            />
                        </TabsContent>
                    </Tabs>
                </TabsContent>
            </div>
          </Tabs>
          
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent className="sm:max-w-lg bg-slate-900 border-white/10 text-slate-100 rounded-2xl">
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
            allQuestions={bankQuestions}
            allMistakes={mistakes}
            selectedIds={assignmentType === 'bank' ? selectedQuestionIds : selectedMistakeIds}
            type={assignmentType}
            onAssignmentComplete={() => {
                setSelectedQuestionIds([]);
                setSelectedMistakeIds([]);
            }}
          />
        </div>
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
  onAssign: () => void;
}

function QuestionList({ questions, onAdd, onBulkAdd, onEdit, onDelete, onDeleteSelected, selectedQuestions, setSelectedQuestions, onAssign }: QuestionListProps) {
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
    <Card className={cn("border-0 shadow-none bg-transparent")}>
      <CardHeader className="px-0 pt-0 pb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
                <CardTitle className="text-xl text-slate-200">Mevcut Sorular</CardTitle>
                <CardDescription className="text-slate-400">
                Bu kategorideki tüm soruları buradan yönetebilirsiniz.
                </CardDescription>
            </div>
            <div className="flex gap-2 self-start sm:self-center flex-wrap">
                 {selectedQuestions.length > 0 && (
                     <>
                        <Button variant="secondary" onClick={onAssign} className="bg-indigo-600 hover:bg-indigo-500 text-white border-0"><Send className="mr-2 h-4 w-4"/> {selectedQuestions.length} Ata</Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" className="bg-rose-600 hover:bg-rose-700 border-0"><Trash2 className="mr-2 h-4 w-4" /> Sil</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-slate-900 border-white/10 text-slate-100">
                                <AlertDialogHeader><AlertDialogTitle>Emin misiniz?</AlertDialogTitle><AlertDialogDescription className="text-slate-400">{selectedQuestions.length} soruyu kalıcı olarak silmek üzeresiniz. Bu işlem geri alınamaz.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-200">İptal</AlertDialogCancel><AlertDialogAction onClick={onDeleteSelected} className="bg-rose-600 hover:bg-rose-700">Evet, Sil</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </>
                 )}
                 <Button variant="outline" onClick={onBulkAdd} className={glassColors.BUTTON_GLASS}><FilePlus className="mr-2 h-4 w-4" /> Toplu</Button>
                 <Button onClick={onAdd} className="bg-emerald-600 hover:bg-emerald-500 text-white border-0"><Plus className="mr-2 h-4 w-4" /> Yeni</Button>
            </div>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {Object.keys(groupedQuestions).length > 0 ? (
          <Accordion type="multiple" className="w-full space-y-4">
            {Object.entries(groupedQuestions).map(([subject, topics]) => (
              <AccordionItem value={subject} key={subject} className="border-none rounded-2xl bg-white/5 overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-white/5 text-slate-200 font-semibold text-lg">{subject}</AccordionTrigger>
                <AccordionContent className="p-0">
                    <div className="p-2 space-y-2">
                      <Accordion type="multiple" className="w-full space-y-2">
                        {Object.entries(topics).map(([topic, topicQuestions]) => {
                            const allTopicQuestionsSelected = topicQuestions.every(q => selectedQuestions.includes(q.id));
                            const someTopicQuestionsSelected = topicQuestions.some(q => selectedQuestions.includes(q.id));

                            return (
                              <AccordionItem value={topic} key={topic} className="border border-white/5 rounded-xl bg-slate-900/30">
                                <div className="flex items-center px-3 py-2">
                                    <Checkbox
                                        checked={allTopicQuestionsSelected ? true : (someTopicQuestionsSelected ? "indeterminate" : false)}
                                        onCheckedChange={() => handleToggleTopicSelection(topicQuestions)}
                                        className="mr-3 border-white/30 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                                    />
                                    <AccordionTrigger className="flex-1 hover:no-underline py-0 text-slate-300 font-medium text-base">{topic} <span className="ml-2 text-xs text-slate-500 font-normal">({topicQuestions.length})</span></AccordionTrigger>
                                </div>
                                <AccordionContent className="px-3 pb-3 pt-1">
                                  <div className="space-y-2 mt-2">
                                    {topicQuestions.map((q) => (
                                      <div key={q.id} className="flex items-center justify-between p-3 bg-slate-950/50 rounded-lg border border-white/5 group hover:border-white/10 transition-colors">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                          <Checkbox
                                            checked={selectedQuestions.includes(q.id)}
                                            onCheckedChange={(checked) => {
                                                setSelectedQuestions(prev => checked ? [...prev, q.id] : prev.filter(id => id !== q.id))
                                            }}
                                            className="border-white/30 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                                          />
                                          <div className="relative shrink-0 w-20 h-14 bg-black/20 rounded-md overflow-hidden border border-white/5">
                                              {q.imageUrl ? (
                                                  <NextImage src={q.imageUrl} alt={q.topic} fill className="object-contain" />
                                              ) : (
                                                  <div className="flex items-center justify-center h-full text-slate-600"><FileQuestion className="w-6 h-6"/></div>
                                              )}
                                          </div>
                                          <div className="flex-grow min-w-0">
                                              <p className="font-medium truncate text-sm text-slate-200" title={q.originalFilename || q.title}>{q.originalFilename || q.title}</p>
                                              <div className="flex items-center gap-2 mt-1">
                                                {q.type !== 'open_ended' && <Badge variant="outline" className="text-[10px] h-5 border-emerald-500/30 text-emerald-400 bg-emerald-500/10">Cevap: {q.correctAnswer}</Badge>}
                                                <Badge variant="outline" className="text-[10px] h-5 border-white/10 text-slate-500">{q.subject}</Badge>
                                              </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10" onClick={() => onEdit(q)}><Edit className="h-4 w-4"/></Button>
                                          <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 h-8 w-8"><Trash2 className="h-4 w-4"/></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="bg-slate-900 border-white/10 text-slate-100">
                                              <AlertDialogHeader><AlertDialogTitle>Soruyu Sil</AlertDialogTitle><AlertDialogDescription className="text-slate-400">Bu soruyu bankadan kalıcı olarak silmek istediğinizden emin misiniz?</AlertDialogDescription></AlertDialogHeader>
                                              <AlertDialogFooter><AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-200">İptal</AlertDialogCancel><AlertDialogAction onClick={() => onDelete(q.id)} className="bg-rose-600 hover:bg-rose-700">Evet, Sil</AlertDialogAction></AlertDialogFooter>
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
                    </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="text-center py-16 text-slate-500 border border-dashed border-white/10 rounded-3xl bg-white/5 flex flex-col items-center">
             <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-3">
                <FileQuestion className="w-8 h-8 text-slate-600" />
             </div>
             <p className="text-lg font-medium text-slate-300">Soru Yok</p>
             <p className="text-sm mt-1">Bu kategoride henüz soru eklenmemiş.</p>
             <Button variant="link" className="text-indigo-400 mt-2" onClick={onAdd}>İlk soruyu ekle</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface MistakeListProps {
  mistakes: Mistake[];
  tests: Test[];
  onDelete: (id: string) => void;
  onDeleteSelected: () => void;
  selectedMistakes: string[];
  setSelectedMistakes: React.Dispatch<React.SetStateAction<string[]>>;
  onAssign: () => void;
}

function MistakePoolList({ mistakes, tests, onDelete, onDeleteSelected, selectedMistakes, setSelectedMistakes, onAssign }: MistakeListProps) {
    const { familyMembers } = useAuth();

    const groupedMistakes = useMemo(() => {
        const groupedByStudent: Record<string, Mistake[]> = {};
        mistakes.forEach(m => {
            if (!groupedByStudent[m.creatorId]) {
                groupedByStudent[m.creatorId] = [];
            }
            groupedByStudent[m.creatorId].push(m);
        });

        const finalGrouped: Record<string, Record<string, Record<string, Record<string, Mistake[]>>>> = {};

        Object.entries(groupedByStudent).forEach(([studentId, studentMistakes]) => {
            const studentName = familyMembers.find(fm => fm.id === studentId)?.name || 'Bilinmeyen Öğrenci';
            if (!finalGrouped[studentName]) finalGrouped[studentName] = {};

            studentMistakes.forEach(mistake => {
                const subject = mistake.subject;
                if (!finalGrouped[studentName][subject]) finalGrouped[studentName][subject] = {};
                
                const topic = mistake.topic;
                if (!finalGrouped[studentName][subject][topic]) finalGrouped[studentName][subject][topic] = {};

                const testName = tests.find(t => t.id === mistake.testId)?.title || 'Bilinmeyen Test';
                 if (!finalGrouped[studentName][subject][topic][testName]) finalGrouped[studentName][subject][topic][testName] = [];
                
                finalGrouped[studentName][subject][topic][testName].push(mistake);
            });
        });

        return finalGrouped;
    }, [mistakes, familyMembers, tests]);

    const handleToggleSelection = (mistakeIds: string[], select: boolean) => {
        if (select) {
            setSelectedMistakes(prev => [...new Set([...prev, ...mistakeIds])]);
        } else {
            setSelectedMistakes(prev => prev.filter(id => !mistakeIds.includes(id)));
        }
    };
    
    return (
        <Card className="border-0 shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0 pb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                        <CardTitle className="text-xl text-slate-200">Yanlış Havuzu ({mistakes.length})</CardTitle>
                        <CardDescription className="text-slate-400">Öğrencilerin yanlış yaptığı sorular.</CardDescription>
                    </div>
                    {selectedMistakes.length > 0 && (
                        <div className="flex gap-2 self-start sm:self-center">
                            <Button variant="secondary" onClick={onAssign} className="bg-indigo-600 hover:bg-indigo-500 text-white border-0"><Send className="mr-2 h-4 w-4"/> {selectedMistakes.length} Ata</Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild><Button variant="destructive" className="bg-rose-600 hover:bg-rose-700 border-0"><Trash2 className="mr-2 h-4 w-4"/> Sil</Button></AlertDialogTrigger>
                                <AlertDialogContent className="bg-slate-900 border-white/10 text-slate-100">
                                    <AlertDialogHeader><AlertDialogTitle>Emin misiniz?</AlertDialogTitle><AlertDialogDescription className="text-slate-400">{selectedMistakes.length} yanlış soruyu havuzdan kalıcı olarak silmek üzeresiniz.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-200">İptal</AlertDialogCancel><AlertDialogAction onClick={onDeleteSelected} className="bg-rose-600 hover:bg-rose-700">Evet, Sil</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="px-0">
                {mistakes.length > 0 ? (
                    <Accordion type="multiple" className="w-full space-y-4" defaultValue={Object.keys(groupedMistakes)}>
                        {Object.entries(groupedMistakes).map(([studentName, subjects]) => {
                            const allStudentMistakeIds = Object.values(subjects).flatMap(topics => Object.values(topics).flatMap(tests => Object.values(tests).flat().map(m => m.id)));
                            const allSelected = allStudentMistakeIds.every(id => selectedMistakes.includes(id));
                            const someSelected = allStudentMistakeIds.some(id => selectedMistakes.includes(id));

                            return (
                                <AccordionItem value={studentName} key={studentName} className="border-none rounded-2xl bg-white/5 overflow-hidden">
                                <div className="flex items-center px-4 py-3 bg-indigo-500/10">
                                    <Checkbox checked={allSelected ? true : someSelected ? "indeterminate" : false} onCheckedChange={(checked) => handleToggleSelection(allStudentMistakeIds, !!checked)} onClick={(e) => e.stopPropagation()} className="mr-3 border-white/30 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"/>
                                    <AccordionTrigger className="flex-1 hover:no-underline py-0 text-indigo-200 font-bold text-lg">{studentName} <span className="ml-2 text-xs font-normal text-indigo-400/80">({allStudentMistakeIds.length})</span></AccordionTrigger>
                                </div>
                                <AccordionContent className="p-2">
                                    <Accordion type="multiple" className="w-full space-y-2">
                                        {Object.entries(subjects).map(([subjectName, topics]) => {
                                             const allSubjectMistakeIds = Object.values(topics).flatMap(tests => Object.values(tests).flat().map(m => m.id));
                                             const allSubSelected = allSubjectMistakeIds.every(id => selectedMistakes.includes(id));
                                             const someSubSelected = allSubjectMistakeIds.some(id => selectedMistakes.includes(id));

                                            return(
                                            <AccordionItem value={subjectName} key={subjectName} className="border border-white/5 rounded-xl bg-slate-900/30">
                                                <div className="flex items-center px-3 py-2">
                                                    <Checkbox checked={allSubSelected ? true : someSubSelected ? "indeterminate" : false} onCheckedChange={(checked) => handleToggleSelection(allSubjectMistakeIds, !!checked)} onClick={(e) => e.stopPropagation()} className="mr-3 border-white/30 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"/>
                                                    <AccordionTrigger className="flex-1 hover:no-underline py-0 text-slate-300 font-medium">{subjectName}</AccordionTrigger>
                                                </div>
                                                <AccordionContent className="px-2 pb-2">
                                                     {Object.entries(topics).map(([topicName, tests]) => {
                                                         const allTopicMistakeIds = Object.values(tests).flat().map(m => m.id);
                                                         const allTopicSelected = allTopicMistakeIds.every(id => selectedMistakes.includes(id));
                                                         const someTopicSelected = allTopicMistakeIds.some(id => selectedMistakes.includes(id));
                                                        return(
                                                          <AccordionItem value={topicName} key={topicName} className="border-t border-white/5 mt-2 pt-2">
                                                              <div className="flex items-center px-2 py-1">
                                                                    <Checkbox checked={allTopicSelected ? true : someTopicSelected ? "indeterminate" : false} onCheckedChange={(checked) => handleToggleSelection(allTopicMistakeIds, !!checked)} onClick={(e) => e.stopPropagation()} className="mr-3 scale-90 border-white/30 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"/>
                                                                    <AccordionTrigger className="flex-1 hover:no-underline py-0 text-slate-400 text-sm">{topicName}</AccordionTrigger>
                                                              </div>
                                                              <AccordionContent className="pl-6 pt-2 space-y-2">
                                                                  {Object.entries(tests).map(([testName, testMistakes]) => {
                                                                      const allTestMistakeIds = testMistakes.map(m => m.id);
                                                                      const allTestSelected = allTestMistakeIds.every(id => selectedMistakes.includes(id));
                                                                      const someTestSelected = allTestMistakeIds.some(id => selectedMistakes.includes(id));

                                                                      return(
                                                                          <div key={testName} className="space-y-2">
                                                                              <div className="flex items-center gap-2 pl-2">
                                                                                  <Checkbox checked={allTestSelected ? true : someTestSelected ? "indeterminate" : false} onCheckedChange={(checked) => handleToggleSelection(allTestMistakeIds, !!checked)} className="scale-75 border-white/30 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"/>
                                                                                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{testName}</p>
                                                                              </div>
                                                                              
                                                                              {testMistakes.map(m => (
                                                                                  <div key={m.id} className="flex items-center justify-between p-2 bg-slate-950/50 rounded-lg border border-white/5 hover:border-white/10 group">
                                                                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                                            <Checkbox checked={selectedMistakes.includes(m.id)} onCheckedChange={(checked) => handleToggleSelection([m.id], !!checked)} className="border-white/30 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"/>
                                                                                            <div className="relative shrink-0 w-16 h-12 bg-black/20 rounded overflow-hidden">
                                                                                                {m.imageUrl && <NextImage src={m.imageUrl} alt={m.topic} fill className="object-contain" />}
                                                                                            </div>
                                                                                        </div>
                                                                                        <AlertDialog>
                                                                                            <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-slate-500 hover:text-rose-400 h-6 w-6"><Trash2 className="h-3.5 w-3.5"/></Button></AlertDialogTrigger>
                                                                                            <AlertDialogContent className="bg-slate-900 border-white/10 text-slate-100">
                                                                                                <AlertDialogHeader><AlertDialogTitle>Yanlışı Sil</AlertDialogTitle><AlertDialogDescription className="text-slate-400">Bu soruyu kalıcı olarak silmek istediğinizden emin misiniz?</AlertDialogDescription></AlertDialogHeader>
                                                                                                <AlertDialogFooter><AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-200">İptal</AlertDialogCancel><AlertDialogAction onClick={() => onDelete(m.id)} className="bg-rose-600 hover:bg-rose-700">Evet, Sil</AlertDialogAction></AlertDialogFooter>
                                                                                            </AlertDialogContent>
                                                                                        </AlertDialog>
                                                                                  </div>
                                                                              ))}
                                                                          </div>
                                                                      )
                                                                  })}
                                                              </AccordionContent>
                                                          </AccordionItem>
                                                        )
                                                     })}
                                                </AccordionContent>
                                            </AccordionItem> 
                                            )
                                        })}
                                    </Accordion>
                                </AccordionContent>
                                </AccordionItem>
                            )
                        })}
                    </Accordion>
                ) : (
                    <div className="text-center py-16 text-slate-500 border border-dashed border-white/10 rounded-3xl bg-white/5 flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-3">
                            <AlertTriangle className="h-8 w-8 text-slate-600"/>
                        </div>
                        <p className="text-lg font-medium text-slate-300">Havuz Boş</p>
                        <p className="text-sm mt-1">Yanlış havuzunda soru bulunmuyor.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
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
            <DialogContent className="sm:max-w-2xl bg-slate-900 border-white/10 text-slate-100 rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Toplu Soru Ekle</DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Birden çok soru görseli seçin. Tüm sorular seçili ders ve konuya eklenecektir.
                    </DialogDescription>
                </DialogHeader>
                <RhfForm {...form}>
                    <form onSubmit={form.handleSubmit(handleImportClick)} className="space-y-4">
                        <ScrollArea className="h-[60vh] pr-4">
                          <div className="space-y-6 mt-2">
                               <div 
                                  {...getRootProps()} 
                                  className={`w-full aspect-video border-2 border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-indigo-500 hover:bg-indigo-500/5 transition-all cursor-pointer ${isDragActive ? 'border-indigo-500 bg-indigo-500/10' : 'bg-black/20'}`}
                               >
                                  <input {...getInputProps()} />
                                  <UploadCloud className="h-12 w-12 mb-2 opacity-50"/>
                                  <p className="text-sm font-medium">Resimleri buraya sürükleyin veya tıklayın</p>
                                  <p className="text-xs text-slate-500 mt-1">JPG, PNG, GIF</p>
                               </div>
                               
                               {form.watch('images')?.length > 0 && (
                                   <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                      {form.watch('images').map((image, index) => (
                                          <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-white/10">
                                              <NextImage src={image.dataUri} alt={`Önizleme ${index}`} fill className="object-cover"/>
                                              <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleRemoveImage(index)}>
                                                 <X className="h-3 w-3"/>
                                              </Button>
                                          </div>
                                      ))}
                                   </div>
                               )}
                               
                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                   <FormField control={form.control} name="subject" render={({field}) => (
                                     <FormItem>
                                         <FormLabel className="text-slate-300">Ders</FormLabel>
                                         <Combobox options={subjectOptions} value={field.value} onChange={field.onChange} onCreate={onSubjectCreate} placeholder="Ders seç..." notfoundText="Bulunamadı." createText="Oluştur:" className={glassColors.INPUT_BG}/>
                                         <FormMessage/>
                                     </FormItem>
                                   )}/>
                                   <FormField control={form.control} name="topic" render={({field}) => (
                                     <FormItem>
                                         <FormLabel className="text-slate-300">Konu</FormLabel>
                                         <Combobox options={topicOptions} value={field.value} onChange={field.onChange} onCreate={onTopicCreate} placeholder="Konu seç..." notfoundText="Bulunamadı." createText="Oluştur:" className={glassColors.INPUT_BG}/>
                                         <FormMessage/>
                                     </FormItem>
                                   )}/>
                               </div>
                          </div>
                        </ScrollArea>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isImporting} className="text-slate-400 hover:text-white hover:bg-white/10">İptal</Button>
                            <Button type="submit" disabled={isImporting || (form.watch('images') || []).length === 0} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                                {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {form.getValues('images')?.length || 0} Soruyu Ekle
                            </Button>
                        </DialogFooter>
                    </form>
                </RhfForm>
            </DialogContent>
        </Dialog>
    );
}

const assignFormSchema = z.object({
  title: z.string().min(3, "Başlık en az 3 karakter olmalıdır."),
  durationMinutes: z.coerce.number().min(1, "Süre en az 1 dakika olmalıdır.").optional(),
  studentIds: z.array(z.string()).min(1, "En az bir öğrenci seçmelisiniz."),
  dateRange: z.object({
      from: z.date(),
      to: z.date(),
  }),
});

function AssignTestDialog({ isOpen, onOpenChange, allQuestions, allMistakes, selectedIds, type, onAssignmentComplete }: {
  isOpen: boolean,
  onOpenChange: (open: boolean) => void,
  allQuestions: BankQuestion[],
  allMistakes: Mistake[],
  selectedIds: string[],
  type: 'bank' | 'mistake',
  onAssignmentComplete: () => void,
}) {
  const { toast } = useToast();
  const { familyMembers } = useAuth();
  const [loading, setLoading] = useState(false);

  const students = useMemo(() => familyMembers.filter(m => m.role.includes('Çocuk')), [familyMembers]);

  const form = useForm<z.infer<typeof assignFormSchema>>({
    resolver: zodResolver(assignFormSchema),
    defaultValues: {
      title: "",
      studentIds: [],
      dateRange: {
        from: new Date(),
        to: addDays(new Date(), 7),
      },
    },
  });

  const selectedItems = useMemo(() => {
    if (type === 'bank') {
        return allQuestions.filter(q => selectedIds.includes(q.id));
    }
    return allMistakes.filter(m => selectedIds.includes(m.id));
  }, [allQuestions, allMistakes, selectedIds, type]);

  useEffect(() => {
    if (isOpen && selectedItems.length > 0) {
        const firstItem = selectedItems[0];
        const subject = firstItem.subject;
        const topic = firstItem.topic;
        const areAllSameSubject = selectedItems.every(q => q.subject === subject);
        const areAllSameTopic = selectedItems.every(q => q.topic === topic);

        let defaultTitle = "Karma Tekrar Testi";
        if (areAllSameSubject && areAllSameTopic) {
            defaultTitle = `${subject} - ${topic} Tekrar Testi`;
        } else if (areAllSameSubject) {
            defaultTitle = `${subject} Karma Tekrar Testi`;
        }
        
        if (type === 'mistake') {
            defaultTitle = "Yanlış Sorular Tekrar Testi";
        }
        
        const defaultDuration = Math.round(selectedItems.length * 1.5);

        form.reset({
            ...form.getValues(),
            title: defaultTitle,
            durationMinutes: defaultDuration,
        });
    }
  }, [isOpen, selectedItems, form, type]);

  const handleAssignmentSubmit = async (values: z.infer<typeof assignFormSchema>) => {
    setLoading(true);

    const questionsForTest = selectedItems.map(item => ({
        questionId: item.id,
        imageUrl: item.imageUrl!,
        // BankQuestion has more fields, but for test creation, this is enough
        ...(item.type === 'mcq' && {
            type: 'mcq',
            correctAnswer: (item as BankQuestion).correctAnswer,
        }),
         ...(item.type === 'open_ended' && {
            type: 'open_ended'
        })
    }));

    const isTestOpenEnded = questionsForTest.some(q => q.type === 'open_ended');

    const answerKey: { [key: string]: string } = {};
    if (!isTestOpenEnded) {
        questionsForTest.forEach((q, index) => {
            if (q.correctAnswer) {
                answerKey[(index + 1).toString()] = q.correctAnswer;
            }
        });
    }

    try {
        for (const studentId of values.studentIds) {
            const testData: Omit<Test, 'id' | 'familyId'> = {
                title: values.title,
                subject: selectedItems[0]?.subject || 'Karma',
                studentId: studentId,
                questionCount: selectedItems.length,
                durationMinutes: values.durationMinutes,
                assignedDate: format(values.dateRange.from, 'dd MMMM yyyy', { locale: tr }),
                dueDate: format(values.dateRange.to, 'dd MMMM yyyy', { locale: tr }),
                sourceType: type,
                status: 'Atandı',
                isArchived: false,
                answerKey: isTestOpenEnded ? undefined : answerKey,
                openEnded: isTestOpenEnded,
            };
            await addTest(testData, questionsForTest);
        }
        toast({
            title: "✅ Ödevler Atandı",
            description: `${values.title} testi ${values.studentIds.length} öğrenciye başarıyla atandı.`,
        });
        onAssignmentComplete();
        onOpenChange(false);
    } catch (error) {
        console.error(error);
        toast({ title: "❌ Kaydetme Hatası", description: "Ödev atanırken bir sorun oluştu.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-white/10 text-slate-100 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Ödev Ata ({selectedIds.length} Soru)</DialogTitle>
          <DialogDescription className="text-slate-400">Seçilen sorularla yeni bir test oluşturun ve öğrencilere atayın.</DialogDescription>
        </DialogHeader>
        <RhfForm {...form}>
          <form onSubmit={form.handleSubmit(handleAssignmentSubmit)} className="space-y-4 pt-2">
             <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Test Başlığı</FormLabel>
                    <FormControl><Input {...field} className={glassColors.INPUT_BG}/></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="durationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Süre (dakika)</FormLabel>
                    <FormControl><Input type="number" {...field} className={glassColors.INPUT_BG}/></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <FormField
              control={form.control}
              name="studentIds"
              render={() => (
                <FormItem>
                    <FormLabel className="text-slate-300">Öğrenciler</FormLabel>
                    <div className="space-y-2 p-3 bg-black/20 rounded-xl border border-white/5">
                        {students.map((student) => (
                            <FormField
                                key={student.id}
                                control={form.control}
                                name="studentIds"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value?.includes(student.id)}
                                                onCheckedChange={(checked) => {
                                                    return checked
                                                    ? field.onChange([...(field.value || []), student.id])
                                                    : field.onChange(field.value?.filter((value) => value !== student.id));
                                                }}
                                                className="border-white/30 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                                            />
                                        </FormControl>
                                        <FormLabel className="font-medium text-slate-200 cursor-pointer w-full">{student.name}</FormLabel>
                                    </FormItem>
                                )}
                            />
                        ))}
                    </div>
                    <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="dateRange"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel className="text-slate-300">Ödev Tarihleri</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn("w-full justify-start text-left font-normal border-white/10 hover:bg-white/5 hover:text-white", !field.value.from && "text-muted-foreground")}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value?.from ? (
                                field.value.to ? (
                                    <>
                                    {format(field.value.from, "LLL dd, y", { locale: tr })} -{" "}
                                    {format(field.value.to, "LLL dd, y", { locale: tr })}
                                    </>
                                ) : (
                                    format(field.value.from, "LLL dd, y", { locale: tr })
                                )
                                ) : (
                                <span>Tarih aralığı seçin</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-slate-900 border-white/10" align="start">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={field.value?.from}
                                selected={field.value}
                                onSelect={field.onChange}
                                numberOfMonths={1}
                                className="bg-slate-900 text-slate-100"
                            />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
                )}
                />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white hover:bg-white/10">İptal</Button>
              <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Ödevi Ata
              </Button>
            </DialogFooter>
          </form>
        </RhfForm>
      </DialogContent>
    </Dialog>
  );
}