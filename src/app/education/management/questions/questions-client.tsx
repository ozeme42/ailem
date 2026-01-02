"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    ArrowLeft, Upload, Image as ImageIcon, Trash2, Plus, Minus, X, KeyRound, 
    MoreVertical, Edit, FileText, FilePlus, AlertTriangle, UploadCloud, Send, 
    Calendar as CalendarIcon, FileQuestion, BookCopy, Settings, Search, 
    CheckCircle2, ChevronRight, LayoutGrid, CheckSquare, Layers, Filter, 
    Maximize2, RefreshCw, XCircle
} from "lucide-react";
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
    FILTER_Select: "w-full sm:w-[180px] h-10 rounded-xl bg-white/5 border-white/10 text-sm text-slate-200 focus:ring-indigo-500/50"
};

export function QuestionsClient() {
  const { user, familyMembers } = useAuth();
  const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // --- UI STATES ---
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkDialogType, setBulkDialogType] = useState<'mcq' | 'open_ended'>('mcq');
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // --- FILTER STATES ---
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterTopic, setFilterTopic] = useState("all");
  const [activeTab, setActiveTab] = useState("bank"); // 'bank' | 'mistakes'
  const [activeSubTab, setActiveSubTab] = useState("mcq"); // 'mcq' | 'open_ended'

  // --- SELECTION & EDITING ---
  const [editingQuestion, setEditingQuestion] = useState<BankQuestion | null>(null);
  const [defaultQuestionType, setDefaultQuestionType] = useState<'mcq' | 'open_ended'>('mcq');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [assignmentType, setAssignmentType] = useState<'bank' | 'mistake'>('bank');

  // --- DATA ---
  const [allSubjects, setAllSubjects] = useState<string[]>([]);
  const [allTopics, setAllTopics] = useState<string[]>([]);

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

  // Filter Logic
  const filteredData = useMemo(() => {
      let data: any[] = activeTab === 'bank' ? bankQuestions : mistakes;
      
      // Filter by Type (MCQ / Open Ended)
      data = data.filter(item => item.type === activeSubTab);

      // Filter by Search
      if (searchQuery) {
          const lowerQuery = searchQuery.toLowerCase();
          data = data.filter(item => 
              (item.title && item.title.toLowerCase().includes(lowerQuery)) ||
              (item.subject && item.subject.toLowerCase().includes(lowerQuery)) ||
              (item.topic && item.topic.toLowerCase().includes(lowerQuery))
          );
      }

      // Filter by Subject
      if (filterSubject !== 'all') {
          data = data.filter(item => item.subject === filterSubject);
      }

      // Filter by Topic
      if (filterTopic !== 'all') {
          data = data.filter(item => item.topic === filterTopic);
      }

      return data;
  }, [bankQuestions, mistakes, activeTab, activeSubTab, searchQuery, filterSubject, filterTopic]);

  // Derived Options for Dropdowns
  const availableSubjects = useMemo(() => {
      const source = activeTab === 'bank' ? bankQuestions : mistakes;
      return Array.from(new Set(source.map(i => i.subject))).sort();
  }, [activeTab, bankQuestions, mistakes]);

  const availableTopics = useMemo(() => {
      const source = activeTab === 'bank' ? bankQuestions : mistakes;
      let filtered = source;
      if (filterSubject !== 'all') {
          filtered = source.filter(i => i.subject === filterSubject);
      }
      return Array.from(new Set(filtered.map(i => i.topic))).sort();
  }, [activeTab, bankQuestions, mistakes, filterSubject]);

  // Reset Topic when Subject changes
  useEffect(() => {
      setFilterTopic('all');
  }, [filterSubject]);

  // Actions
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

  const handleDelete = async (id: string) => {
      try {
          if (activeTab === 'bank') {
              await deleteBankQuestion(id);
          } else {
              await deleteMistake(id);
          }
          toast({ title: "Silindi", variant: "destructive"});
      } catch (error) {
          toast({ title: "Hata", variant: "destructive" });
      }
  }

  const handleDeleteSelected = async () => {
    try {
        if (activeTab === 'bank') {
            await deleteBulkBankQuestions(selectedIds);
        } else {
            for (const id of selectedIds) await deleteMistake(id);
        }
        toast({ title: `${selectedIds.length} kayıt silindi`, variant: "destructive"});
        setSelectedIds([]);
    } catch(error) {
        toast({ title: "Hata", description: "Silme işlemi sırasında hata oluştu.", variant: "destructive" });
    }
  }

  const handleBulkImport = async (questions: any[], type: 'mcq' | 'open_ended') => {
    toast({ title: "İçe Aktarma Başlatıldı", description: "Sorular havuza aktarılıyor..." });
    setIsBulkDialogOpen(false);

    try {
        const questionsToImport = questions.map((q, index) => ({
            ...q,
            title: q.originalFilename || `${q.topic} - Soru ${index + 1}`,
            type: type
        }))
        await addBulkBankQuestions(questionsToImport);
        toast({ title: "✅ Başarılı", description: `${questions.length} soru eklendi.` });
    } catch (e) {
        toast({ title: "❌ Hata", description: "Toplu ekleme başarısız.", variant: 'destructive' });
    }
  };

  const toggleSelection = (id: string) => {
      setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
      if (selectedIds.length === filteredData.length) {
          setSelectedIds([]);
      } else {
          setSelectedIds(filteredData.map(i => i.id));
      }
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-950"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden flex flex-col">
        {/* BG & Header (Same as previous) */}
        <div className="fixed inset-0 bg-slate-950 -z-50" />
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[20%] left-[-5%] w-[400px] h-[400px] bg-emerald-900/20 rounded-full blur-[120px]" />
        </div>

        <div className={cn("sticky top-0 z-40 w-full transition-all duration-300", glassColors.HEADER_BG)}>
            <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button onClick={() => router.back()} variant="ghost" size="icon" className="rounded-full hover:bg-white/10 text-slate-300 hover:text-white -ml-2"><ArrowLeft className="h-6 w-6" /></Button>
                    <div className={cn("from-indigo-500 to-cyan-500", glassColors.ICON_BOX)}><BookCopy className="w-6 h-6 text-white" /></div>
                    <div><h1 className="text-xl font-black tracking-tight text-slate-100 leading-none">Soru Bankası</h1><p className="text-xs font-medium text-slate-400 mt-0.5">İçerik Yönetimi</p></div>
                </div>
                {activeTab === 'bank' && (
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => { setBulkDialogType(activeSubTab as any); setIsBulkDialogOpen(true); }} className={glassColors.BUTTON_GLASS}><UploadCloud className="mr-2 h-4 w-4" /> Toplu</Button>
                        <Button onClick={() => handleOpenForm(null, activeSubTab as any)} className="bg-emerald-600 hover:bg-emerald-500 text-white border-0"><Plus className="mr-2 h-4 w-4" /> Yeni</Button>
                    </div>
                )}
            </div>
        </div>

      <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 relative z-10 flex flex-col min-h-0">
          
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedIds([]); }} className="space-y-6 flex flex-col h-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <TabsList className={cn("grid w-full md:w-auto grid-cols-2 h-12 rounded-2xl", glassColors.TAB_LIST)}>
                    <TabsTrigger value="bank" className={cn("rounded-xl transition-all", glassColors.TAB_TRIGGER)}>Soru Bankası</TabsTrigger>
                    <TabsTrigger value="mistakes" className={cn("rounded-xl transition-all", glassColors.TAB_TRIGGER)}>Yanlış Havuzu ({mistakes.length})</TabsTrigger>
                </TabsList>
                
                <Tabs value={activeSubTab} onValueChange={(v) => { setActiveSubTab(v); setSelectedIds([]); }} className="w-full md:w-auto">
                    <TabsList className="bg-white/5 border border-white/10 p-1 h-10 rounded-lg w-full md:w-auto grid grid-cols-2">
                         <TabsTrigger value="mcq" className="rounded-md text-xs">Çoktan Seçmeli</TabsTrigger>
                         <TabsTrigger value="open_ended" className="rounded-md text-xs">Açık Uçlu</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* --- FILTER BAR --- */}
            <div className={cn("p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between", glassColors.CARD_BG)}>
                <div className="relative w-full md:w-1/3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                        placeholder="Soru ara..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-slate-900/50 border-white/10 text-slate-200 focus:border-indigo-500 rounded-xl"
                    />
                </div>
                
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                    <Select value={filterSubject} onValueChange={setFilterSubject}>
                        <SelectTrigger className={glassColors.FILTER_Select}><div className="flex items-center gap-2"><Filter className="w-3 h-3 text-slate-400"/><span className="truncate">{filterSubject === 'all' ? 'Tüm Dersler' : filterSubject}</span></div></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-slate-100"><SelectItem value="all">Tüm Dersler</SelectItem>{availableSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={filterTopic} onValueChange={setFilterTopic}>
                        <SelectTrigger className={glassColors.FILTER_Select}><div className="flex items-center gap-2"><Layers className="w-3 h-3 text-slate-400"/><span className="truncate">{filterTopic === 'all' ? 'Tüm Konular' : filterTopic}</span></div></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-slate-100"><SelectItem value="all">Tüm Konular</SelectItem>{availableTopics.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                    {(filterSubject !== 'all' || filterTopic !== 'all' || searchQuery) && (
                        <Button variant="ghost" size="icon" onClick={() => { setFilterSubject('all'); setFilterTopic('all'); setSearchQuery(''); }} className="text-slate-400 hover:text-white"><XCircle className="w-5 h-5" /></Button>
                    )}
                </div>
            </div>

            {/* --- CONTENT AREA --- */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-24">
                {filteredData.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in zoom-in-95 duration-300">
                        {filteredData.map((item) => {
                            const isSelected = selectedIds.includes(item.id);
                            return (
                                <div 
                                    key={item.id} 
                                    className={cn(
                                        "group relative flex flex-col rounded-2xl border bg-white/5 p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl",
                                        isSelected ? "border-indigo-500 bg-indigo-500/10" : "border-white/5 hover:border-white/20"
                                    )}
                                    onClick={() => toggleSelection(item.id)}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <Checkbox checked={isSelected} className="border-white/30 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500" />
                                        <div className="flex gap-1">
                                            {activeTab === 'bank' && <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-white" onClick={(e) => { e.stopPropagation(); handleOpenForm(item, activeSubTab as any); }}><Edit className="h-3 w-3"/></Button>}
                                        </div>
                                    </div>
                                    
                                    <div className="relative aspect-video w-full mb-3 bg-black/40 rounded-xl overflow-hidden border border-white/5 group-hover:border-white/20">
                                        {item.imageUrl ? (
                                            <>
                                                <NextImage src={item.imageUrl} alt="Soru" fill className="object-contain" />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity" onClick={(e) => { e.stopPropagation(); setImagePreview(item.imageUrl); }}>
                                                    <Maximize2 className="text-white w-6 h-6 drop-shadow-md cursor-pointer" />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-slate-600"><FileQuestion className="w-8 h-8" /></div>
                                        )}
                                    </div>
                                    
                                    <div className="mt-auto">
                                        <div className="flex gap-2 mb-2 flex-wrap">
                                            <Badge variant="secondary" className="bg-white/10 text-slate-300 hover:bg-white/20 text-[10px] h-5">{item.subject}</Badge>
                                            <Badge variant="outline" className="border-white/10 text-slate-400 text-[10px] h-5">{item.topic}</Badge>
                                        </div>
                                        <p className="text-sm font-medium text-slate-200 truncate" title={item.title || item.originalFilename}>{item.title || item.originalFilename}</p>
                                        {activeTab === 'mistakes' && (
                                            <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-1.5 text-[10px] text-rose-400">
                                                <AlertTriangle className="w-3 h-3"/>
                                                {familyMembers.find(f => f.id === item.creatorId)?.name || 'Öğrenci'} Yanlışı
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-500 border border-dashed border-white/10 rounded-3xl bg-white/5">
                        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4"><Search className="w-8 h-8 text-slate-600"/></div>
                        <p className="text-lg font-medium text-slate-300">Kayıt Bulunamadı</p>
                        <p className="text-sm">Arama kriterlerinize uygun soru yok.</p>
                        <Button variant="link" onClick={() => { setSearchQuery(''); setFilterSubject('all'); setFilterTopic('all'); }} className="text-indigo-400 mt-2">Filtreleri Temizle</Button>
                    </div>
                )}
            </div>

          </Tabs>
          
          {/* --- FLOATING ACTION BAR --- */}
          {selectedIds.length > 0 && (
             <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-white/10 text-white px-4 py-3 rounded-full shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5 w-[90%] max-w-md justify-between backdrop-blur-xl">
                 <div className="flex items-center gap-3">
                     <div className="bg-indigo-600 text-xs font-bold px-2 py-1 rounded-md min-w-[24px] text-center">{selectedIds.length}</div>
                     <span className="text-sm font-medium text-slate-300 hidden sm:inline">Seçildi</span>
                 </div>
                 <div className="flex items-center gap-2">
                     <Button size="sm" onClick={() => toggleSelectAll()} variant="ghost" className="text-xs h-8 text-slate-400 hover:text-white">Tümü</Button>
                     <div className="h-4 w-px bg-white/10 mx-1"></div>
                     <Button size="sm" onClick={() => { setAssignmentType(activeTab === 'bank' ? 'bank' : 'mistake'); setIsAssignDialogOpen(true); }} className="h-8 bg-indigo-600 hover:bg-indigo-500 text-white border-0"><Send className="w-3 h-3 mr-1.5"/> Ata</Button>
                     <AlertDialog>
                        <AlertDialogTrigger asChild><Button size="sm" variant="destructive" className="h-8 bg-rose-600 hover:bg-rose-700 border-0"><Trash2 className="w-3 h-3"/></Button></AlertDialogTrigger>
                        <AlertDialogContent className="bg-slate-900 border-white/10 text-slate-100">
                            <AlertDialogHeader><AlertDialogTitle>Siliniyor</AlertDialogTitle><AlertDialogDescription className="text-slate-400">{selectedIds.length} kayıt silinecek. Emin misiniz?</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-200">İptal</AlertDialogCancel><AlertDialogAction onClick={handleDeleteSelected} className="bg-rose-600 hover:bg-rose-700">Evet, Sil</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                     </AlertDialog>
                     <Button size="icon" variant="ghost" onClick={() => setSelectedIds([])} className="h-8 w-8 rounded-full hover:bg-white/10"><X className="w-4 h-4"/></Button>
                 </div>
             </div>
          )}
          
          {/* --- DIALOGS --- */}
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
            selectedIds={selectedIds}
            type={assignmentType}
            onAssignmentComplete={() => setSelectedIds([])}
          />

          {/* Image Lightbox */}
          {imagePreview && (
              <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setImagePreview(null)}>
                  <div className="relative w-full max-w-4xl h-[80vh]">
                      <NextImage src={imagePreview} alt="Preview" fill className="object-contain" />
                      <button onClick={() => setImagePreview(null)} className="absolute top-4 right-4 bg-black/50 p-2 rounded-full text-white hover:bg-white/20"><X className="w-6 h-6"/></button>
                  </div>
              </div>
          )}
        </div>
    </div>
  );
}

// ... (Sub-components: BulkAddImagesDialog, AssignTestDialog same as before, ensuring imports match)

const bulkAddSchema = z.object({
  subject: z.string().min(1, "Ders seçimi zorunludur."),
  topic: z.string().min(1, "Konu seçimi zorunludur."),
  images: z.array(z.object({
      dataUri: z.string(),
      filename: z.string(),
  })).min(1, "En az bir resim yüklemelisiniz."),
});

function BulkAddImagesDialog({ 
    open, onOpenChange, onImport, existingSubjects, existingTopics, onSubjectCreate, onTopicCreate, type
}: { 
    open: boolean, onOpenChange: (open: boolean) => void, onImport: (questions: Partial<BankQuestion>[], type: 'mcq' | 'open_ended') => void,
    existingSubjects: string[], existingTopics: string[], onSubjectCreate: (name: string) => void, onTopicCreate: (name: string) => void, type: 'mcq' | 'open_ended';
}) {
    const [isImporting, setIsImporting] = useState(false);
    const form = useForm<z.infer<typeof bulkAddSchema>>({ resolver: zodResolver(bulkAddSchema), defaultValues: { subject: '', topic: '', images: [] } });
    
    const onDrop = useCallback((acceptedFiles: File[]) => {
        const currentImages = form.getValues('images') || [];
        const filePromises = acceptedFiles.map(file => new Promise<{dataUri: string, filename: string}>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve({ dataUri: reader.result as string, filename: file.name });
                reader.readAsDataURL(file);
            })
        );
        Promise.all(filePromises).then(newImages => { form.setValue('images', [...currentImages, ...newImages], { shouldValidate: true }); });
    }, [form]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif'] } });
    
    const handleImportClick = (values: z.infer<typeof bulkAddSchema>) => {
        setIsImporting(true);
        const questionsToImport = values.images.map((image) => ({ originalFilename: image.filename, subject: values.subject, topic: values.topic, imageUrl: image.dataUri }));
        onImport(questionsToImport, type).finally(() => { setIsImporting(false); form.reset(); });
    };
    
    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) form.reset(); onOpenChange(o); }}>
            <DialogContent className="sm:max-w-2xl bg-slate-900 border-white/10 text-slate-100 rounded-2xl">
                <DialogHeader><DialogTitle>Toplu Soru Ekle ({type === 'mcq' ? 'Çoktan Seçmeli' : 'Açık Uçlu'})</DialogTitle></DialogHeader>
                <RhfForm {...form}>
                    <form onSubmit={form.handleSubmit(handleImportClick)} className="space-y-4">
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField control={form.control} name="subject" render={({field}) => (
                                <FormItem><FormLabel className="text-slate-300">Ders</FormLabel><Combobox options={existingSubjects.map(s=>({label:s,value:s}))} value={field.value} onChange={field.onChange} onCreate={onSubjectCreate} className={glassColors.INPUT_BG}/><FormMessage/></FormItem>
                            )}/>
                            <FormField control={form.control} name="topic" render={({field}) => (
                                <FormItem><FormLabel className="text-slate-300">Konu</FormLabel><Combobox options={existingTopics.map(s=>({label:s,value:s}))} value={field.value} onChange={field.onChange} onCreate={onTopicCreate} className={glassColors.INPUT_BG}/><FormMessage/></FormItem>
                            )}/>
                         </div>
                         <div {...getRootProps()} className={`w-full aspect-video border-2 border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-indigo-500 hover:bg-indigo-500/5 transition-all cursor-pointer ${isDragActive ? 'border-indigo-500 bg-indigo-500/10' : 'bg-black/20'}`}>
                              <input {...getInputProps()} />
                              <UploadCloud className="h-10 w-10 mb-2 opacity-50"/>
                              <p className="text-sm">Resimleri sürükleyin veya tıklayın</p>
                         </div>
                         {form.watch('images')?.length > 0 && <p className="text-xs text-emerald-400 font-bold">{form.watch('images').length} resim seçildi.</p>}
                        <DialogFooter><Button type="submit" disabled={isImporting} className="bg-indigo-600 hover:bg-indigo-500 text-white">{isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Yükle</Button></DialogFooter>
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
  dateRange: z.object({ from: z.date(), to: z.date() }),
});

function AssignTestDialog({ isOpen, onOpenChange, allQuestions, allMistakes, selectedIds, type, onAssignmentComplete }: any) {
  const { toast } = useToast();
  const { familyMembers } = useAuth();
  const [loading, setLoading] = useState(false);
  const students = useMemo(() => familyMembers.filter((m:any) => m.role.includes('Çocuk')), [familyMembers]);
  const form = useForm<z.infer<typeof assignFormSchema>>({ resolver: zodResolver(assignFormSchema), defaultValues: { title: "", studentIds: [], dateRange: { from: new Date(), to: addDays(new Date(), 7) } } });

  const handleAssignmentSubmit = async (values: z.infer<typeof assignFormSchema>) => {
    setLoading(true);
    const source = type === 'bank' ? allQuestions : allMistakes;
    const selectedItems = source.filter((q:any) => selectedIds.includes(q.id));
    
    // Basit map işlemi
    const questionsForTest = selectedItems.map((item:any) => ({
        questionId: item.id,
        imageUrl: item.imageUrl!,
        type: item.type,
        correctAnswer: item.correctAnswer // open_ended için undefined olabilir
    }));
    
    const isTestOpenEnded = questionsForTest.some((q:any) => q.type === 'open_ended');
    const answerKey: any = {};
    if (!isTestOpenEnded) {
        questionsForTest.forEach((q:any, index:number) => { if (q.correctAnswer) answerKey[(index + 1).toString()] = q.correctAnswer; });
    }

    try {
        for (const studentId of values.studentIds) {
            const testData = {
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
            await addTest(testData as any, questionsForTest);
        }
        toast({ title: "✅ Başarılı", description: "Ödev atandı." });
        onAssignmentComplete();
        onOpenChange(false);
    } catch (e) { toast({ title: "Hata", variant: "destructive" }); } finally { setLoading(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-white/10 text-slate-100 rounded-2xl">
        <DialogHeader><DialogTitle>Ödev Ata ({selectedIds.length} Soru)</DialogTitle></DialogHeader>
        <RhfForm {...form}>
            <form onSubmit={form.handleSubmit(handleAssignmentSubmit)} className="space-y-4">
                <FormField control={form.control} name="title" render={({field}) => (<FormItem><FormLabel>Başlık</FormLabel><Input {...field} className={glassColors.INPUT_BG}/></FormItem>)}/>
                <FormField control={form.control} name="studentIds" render={() => (
                    <FormItem><FormLabel>Öğrenciler</FormLabel>
                    <div className="space-y-2 p-3 bg-black/20 rounded-xl border border-white/5">{students.map((s:any) => (
                        <FormField key={s.id} control={form.control} name="studentIds" render={({ field }) => (
                            <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><Checkbox checked={field.value?.includes(s.id)} onCheckedChange={(c) => c ? field.onChange([...(field.value||[]), s.id]) : field.onChange(field.value?.filter((v)=>v!==s.id))} className="border-white/30 data-[state=checked]:bg-indigo-500"/></FormControl><FormLabel className="font-normal cursor-pointer w-full">{s.name}</FormLabel></FormItem>
                        )}/>
                    ))}</div></FormItem>
                )}/>
                 <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="dateRange" render={({field}) => (<FormItem><FormLabel>Tarih</FormLabel><Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left border-white/10 hover:bg-white/5 hover:text-white")}>{format(field.value.from, "d MMM", {locale:tr})}</Button></PopoverTrigger><PopoverContent className="bg-slate-900 border-white/10"><Calendar mode="range" selected={field.value} onSelect={field.onChange} className="bg-slate-900 text-slate-100"/></PopoverContent></Popover></FormItem>)}/>
                    <FormField control={form.control} name="durationMinutes" render={({field}) => (<FormItem><FormLabel>Süre (dk)</FormLabel><Input type="number" {...field} className={glassColors.INPUT_BG}/></FormItem>)}/>
                 </div>
                <DialogFooter><Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-500 text-white">Ata</Button></DialogFooter>
            </form>
        </RhfForm>
      </DialogContent>
    </Dialog>
  );
}