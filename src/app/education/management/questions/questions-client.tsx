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
    Maximize2, RefreshCw, XCircle, Database
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

// --- DESIGN SYSTEM: Modern Premium LMS Light Theme ---
const themeColors = {
    HEADER_BG: "bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-40",
    CARD_BG: "bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all duration-300",
    ICON_BOX: "bg-gradient-to-br from-indigo-500 to-violet-600 p-2.5 rounded-xl shadow-md shadow-indigo-500/20 text-white",
    BUTTON_GLASS: "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm transition-all",
    INPUT_BG: "bg-white border-slate-300 text-slate-900 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm",
    TAB_LIST: "bg-slate-100/80 border border-slate-200 p-1 rounded-xl",
    TAB_TRIGGER: "data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm text-slate-500 hover:text-slate-700 font-semibold text-xs transition-all",
    FILTER_SELECT: "w-full sm:w-[170px] h-9 rounded-lg bg-white border-slate-300 text-xs text-slate-700 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
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
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterTopic, setFilterTopic] = useState("all");
  const [activeTab, setActiveTab] = useState("bank"); 
  const [activeSubTab, setActiveSubTab] = useState("mcq"); 

  const [editingQuestion, setEditingQuestion] = useState<BankQuestion | null>(null);
  const [defaultQuestionType, setDefaultQuestionType] = useState<'mcq' | 'open_ended'>('mcq');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [assignmentType, setAssignmentType] = useState<'bank' | 'mistake'>('bank');

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

  const filteredData = useMemo(() => {
      let data: any[] = activeTab === 'bank' ? bankQuestions : mistakes;
      
      data = data.filter(item => item.type === activeSubTab);

      if (searchQuery) {
          const lowerQuery = searchQuery.toLowerCase();
          data = data.filter(item => 
              (item.title && item.title.toLowerCase().includes(lowerQuery)) ||
              (item.subject && item.subject.toLowerCase().includes(lowerQuery)) ||
              (item.topic && item.topic.toLowerCase().includes(lowerQuery))
          );
      }

      if (filterSubject !== 'all') {
          data = data.filter(item => item.subject === filterSubject);
      }

      if (filterTopic !== 'all') {
          data = data.filter(item => item.topic === filterTopic);
      }

      return data;
  }, [bankQuestions, mistakes, activeTab, activeSubTab, searchQuery, filterSubject, filterTopic]);

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

  useEffect(() => {
      setFilterTopic('all');
  }, [filterSubject]);

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
          toast({ title: "Silindi", description: "Soru başarıyla silindi.", variant: "default"});
      } catch (error) {
          toast({ title: "Hata", description: "Silme işlemi başarısız.", variant: "destructive" });
      }
  }

  const handleDeleteSelected = async () => {
    try {
        if (activeTab === 'bank') {
            await deleteBulkBankQuestions(selectedIds);
        } else {
            for (const id of selectedIds) await deleteMistake(id);
        }
        toast({ title: `${selectedIds.length} kayıt silindi`, variant: "default"});
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

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="animate-spin h-10 w-10 text-indigo-600" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative overflow-hidden flex flex-col">
        {/* Açık Tema Arka Plan Efektleri */}
        <div className="fixed inset-0 bg-slate-50 -z-50" />
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-200/40 rounded-full blur-[120px]" />
            <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-violet-200/40 rounded-full blur-[120px]" />
        </div>

        {/* Header */}
        <header className={themeColors.HEADER_BG}>
            <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                    <Button onClick={() => router.back()} variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors -ml-2 h-9 w-9 sm:h-10 sm:w-10">
                        <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                    </Button>
                    <div className={themeColors.ICON_BOX}>
                        <Database className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="flex flex-col justify-center">
                        <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900 leading-none">Soru Bankası</h1>
                        <p className="text-[10px] sm:text-xs font-medium text-slate-500 mt-1">Soru havuzu ve içerik yönetimi</p>
                    </div>
                </div>
                {activeTab === 'bank' && (
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setBulkDialogType(activeSubTab as any); setIsBulkDialogOpen(true); }} className={cn("hidden sm:flex h-9", themeColors.BUTTON_GLASS)}>
                            <UploadCloud className="mr-2 h-4 w-4" /> Toplu Ekle
                        </Button>
                        <Button size="sm" onClick={() => handleOpenForm(null, activeSubTab as any)} className="bg-indigo-600 hover:bg-indigo-700 text-white border-0 h-9 px-4 shadow-md shadow-indigo-600/20 font-semibold">
                            <Plus className="mr-1.5 h-4 w-4" /> Yeni Soru
                        </Button>
                    </div>
                )}
            </div>
        </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 relative z-10 flex flex-col min-h-0">
          
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedIds([]); }} className="space-y-6 flex flex-col h-full">
            
            {/* Kontrol ve Filtre Paneli */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col gap-4">
                
                {/* Üst Satır: Sekmeler */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
                    <TabsList className={themeColors.TAB_LIST}>
                        <TabsTrigger value="bank" className={cn("rounded-lg", themeColors.TAB_TRIGGER)}>Soru Bankası</TabsTrigger>
                        <TabsTrigger value="mistakes" className={cn("rounded-lg", themeColors.TAB_TRIGGER)}>
                            Yanlış Havuzu <Badge variant="secondary" className="ml-1.5 bg-rose-100 text-rose-600 hover:bg-rose-200 border-rose-200 text-[9px] px-1">{mistakes.length}</Badge>
                        </TabsTrigger>
                    </TabsList>
                    
                    <Tabs value={activeSubTab} onValueChange={(v) => { setActiveSubTab(v); setSelectedIds([]); }} className="w-full md:w-auto">
                        <TabsList className="bg-slate-100/80 border border-slate-200 p-1 h-9 rounded-lg w-full md:w-auto grid grid-cols-2">
                            <TabsTrigger value="mcq" className="rounded-md text-[11px] font-semibold data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm text-slate-500">Çoktan Seçmeli</TabsTrigger>
                            <TabsTrigger value="open_ended" className="rounded-md text-[11px] font-semibold data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm text-slate-500">Açık Uçlu</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Alt Satır: Arama ve Filtreler */}
                <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                    <div className="relative w-full md:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                            placeholder="İçerik, ders veya konu ara..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 bg-white border-slate-300 text-sm text-slate-900 focus:border-indigo-500 focus:ring-indigo-500/20 rounded-lg shadow-sm"
                        />
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mr-1 hidden sm:flex">
                            <Filter className="w-3.5 h-3.5" /> Filtrele:
                        </div>

                        <Select value={filterSubject} onValueChange={setFilterSubject}>
                            <SelectTrigger className={themeColors.FILTER_SELECT}>
                                <div className="flex items-center truncate">
                                    <Layers className="w-3.5 h-3.5 text-slate-400 mr-2"/>
                                    <span>{filterSubject === 'all' ? 'Tüm Dersler' : filterSubject}</span>
                                </div>
                            </SelectTrigger>
                            <SelectContent className="bg-white border-slate-200 text-slate-800 shadow-lg">
                                <SelectItem value="all">Tüm Dersler</SelectItem>
                                {availableSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={filterTopic} onValueChange={setFilterTopic} disabled={availableTopics.length === 0}>
                            <SelectTrigger className={cn(themeColors.FILTER_SELECT, availableTopics.length === 0 && "opacity-50 cursor-not-allowed")}>
                                <div className="flex items-center truncate">
                                    <BookCopy className="w-3.5 h-3.5 text-slate-400 mr-2"/>
                                    <span>{filterTopic === 'all' ? 'Tüm Konular' : filterTopic}</span>
                                </div>
                            </SelectTrigger>
                            <SelectContent className="bg-white border-slate-200 text-slate-800 shadow-lg">
                                <SelectItem value="all">Tüm Konular</SelectItem>
                                {availableTopics.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        {(filterSubject !== 'all' || filterTopic !== 'all' || searchQuery) && (
                            <Button 
                                variant="ghost" size="sm" 
                                onClick={() => { setFilterSubject('all'); setFilterTopic('all'); setSearchQuery(''); }} 
                                className="h-9 px-3 text-rose-500 hover:text-rose-600 hover:bg-rose-50 text-xs rounded-lg ml-auto md:ml-0"
                            >
                                Temizle
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* İçerik Alanı (Grid) */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-24">
                {filteredData.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-in fade-in zoom-in-95 duration-300">
                        {filteredData.map((item) => {
                            const isSelected = selectedIds.includes(item.id);
                            return (
                                <div 
                                    key={item.id} 
                                    className={cn(
                                        "group relative flex flex-col rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden",
                                        isSelected ? "border-indigo-500 bg-indigo-50/50 shadow-md ring-1 ring-indigo-500/20" : themeColors.CARD_BG
                                    )}
                                    onClick={() => toggleSelection(item.id)}
                                >
                                    {/* Görsel ve Seçim Kutusu */}
                                    <div className="relative aspect-video w-full bg-slate-100 border-b border-slate-200 overflow-hidden flex items-center justify-center">
                                        <div className="absolute top-3 left-3 z-10">
                                            <Checkbox 
                                                checked={isSelected} 
                                                className={cn("border-slate-400 bg-white shadow-sm data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600", isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100 transition-opacity")} 
                                            />
                                        </div>

                                        {activeTab === 'bank' && (
                                            <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button 
                                                    variant="ghost" size="icon" 
                                                    className="h-8 w-8 bg-white/90 hover:bg-white text-slate-700 hover:text-indigo-600 rounded-lg shadow-sm border border-slate-200" 
                                                    onClick={(e) => { e.stopPropagation(); handleOpenForm(item, activeSubTab as any); }}
                                                >
                                                    <Edit className="h-4 w-4"/>
                                                </Button>
                                            </div>
                                        )}

                                        {item.imageUrl ? (
                                            <>
                                                <NextImage src={item.imageUrl} alt="Soru" fill className="object-contain p-2" />
                                                <div 
                                                    className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[1px]" 
                                                    onClick={(e) => { e.stopPropagation(); setImagePreview(item.imageUrl); }}
                                                >
                                                    <div className="bg-white p-2 rounded-full border border-slate-200 shadow-md text-slate-700">
                                                        <Maximize2 className="w-5 h-5" />
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                                                <FileQuestion className="w-8 h-8 opacity-60" />
                                                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Görsel Yok</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Detaylar */}
                                    <div className="p-4 flex flex-col flex-1 bg-white">
                                        <div className="flex gap-1.5 mb-2 flex-wrap">
                                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[9px] px-1.5 h-4.5 font-bold uppercase tracking-wider rounded-md">{item.subject}</Badge>
                                            <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[9px] px-1.5 h-4.5 font-medium rounded-md line-clamp-1">{item.topic}</Badge>
                                        </div>
                                        <p className="text-sm font-semibold text-slate-800 line-clamp-2 mt-1 leading-snug group-hover:text-indigo-700 transition-colors" title={item.title || item.originalFilename}>
                                            {item.title || item.originalFilename}
                                        </p>
                                        
                                        {activeTab === 'mistakes' && (
                                            <div className="mt-auto pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[10px] font-medium text-rose-500">
                                                <AlertTriangle className="w-3.5 h-3.5"/>
                                                {familyMembers.find(f => f.id === item.creatorId)?.name || 'Öğrenci'} Yanlışı
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-500 border border-dashed border-slate-300 rounded-3xl bg-slate-50/50 w-full max-w-2xl mx-auto mt-10">
                        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm border border-slate-200">
                            <Search className="w-8 h-8 text-slate-400"/>
                        </div>
                        <p className="text-lg font-bold text-slate-700">Kayıt Bulunamadı</p>
                        <p className="text-sm mt-1 max-w-sm text-center text-slate-500">Arama kriterlerinize uygun soru bulunmuyor.</p>
                        {(filterSubject !== 'all' || filterTopic !== 'all' || searchQuery) && (
                            <Button variant="link" onClick={() => { setSearchQuery(''); setFilterSubject('all'); setFilterTopic('all'); }} className="text-indigo-600 mt-2 font-semibold">
                                Filtreleri Temizle
                            </Button>
                        )}
                    </div>
                )}
            </div>
          </Tabs>
          
          {/* Toplu İşlem Çubuğu (Floating Action Bar) */}
          {selectedIds.length > 0 && (
             <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white border border-slate-200 text-slate-800 px-4 py-3 rounded-2xl shadow-2xl shadow-slate-200 flex items-center gap-4 animate-in slide-in-from-bottom-5 w-[90%] sm:w-auto max-w-md justify-between">
                 <div className="flex items-center gap-3 pl-2">
                     <div className="bg-indigo-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg min-w-[28px] text-center shadow-sm">{selectedIds.length}</div>
                     <span className="text-sm font-semibold text-slate-700 hidden sm:inline whitespace-nowrap">Soru Seçildi</span>
                 </div>
                 <div className="flex items-center gap-2 border-l border-slate-200 pl-3 ml-2">
                     <Button size="sm" onClick={() => toggleSelectAll()} variant="ghost" className="text-xs h-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-2 rounded-lg font-medium">Tümü</Button>
                     <Button size="sm" onClick={() => { setAssignmentType(activeTab === 'bank' ? 'bank' : 'mistake'); setIsAssignDialogOpen(true); }} className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white border-0 rounded-lg px-3 shadow-sm">
                         <Send className="w-3.5 h-3.5 mr-1.5"/> Ata
                     </Button>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive" className="h-8 w-8 p-0 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-100 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4"/>
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-white border-slate-200 text-slate-900 rounded-2xl shadow-xl">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-xl">Toplu Silme İşlemi</AlertDialogTitle>
                                <AlertDialogDescription className="text-slate-500">Seçili <strong className="text-slate-800">{selectedIds.length}</strong> kayıt kalıcı olarak silinecek. Emin misiniz?</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="mt-4">
                                <AlertDialogCancel className="bg-white border-slate-300 hover:bg-slate-50 text-slate-700">İptal</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteSelected} className="bg-rose-600 hover:bg-rose-700 text-white border-none shadow-sm">Evet, Sil</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                     </AlertDialog>
                     <Button size="icon" variant="ghost" onClick={() => setSelectedIds([])} className="h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-500 ml-1">
                         <X className="w-4 h-4"/>
                     </Button>
                 </div>
             </div>
          )}
          
          {/* Form & Dialogs */}
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent className="sm:max-w-xl bg-white border-slate-200 text-slate-900 rounded-2xl shadow-2xl p-0 overflow-hidden">
              <ScrollArea className="max-h-[85vh]">
                <div className="p-6">
                    <DialogHeader className="mb-6">
                        <DialogTitle className="text-xl font-bold">{editingQuestion ? 'Soruyu Düzenle' : 'Yeni Soru Ekle'}</DialogTitle>
                    </DialogHeader>
                    {/* NewQuestionBankForm içindeki bileşenlerin açık tema desteği varsayılarak */}
                    <NewQuestionBankForm
                        availableSubjects={allSubjects}
                        onSubjectCreated={handleCreateSubject}
                        availableTopics={allTopics}
                        onTopicCreated={handleCreateTopic}
                        onQuestionProcessed={() => setIsFormOpen(false)}
                        initialData={editingQuestion}
                        defaultType={defaultQuestionType}
                    />
                </div>
              </ScrollArea>
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

          {/* Görsel Önizleme (Lightbox) - Odak için koyu arka plan bırakıldı */}
          {imagePreview && (
              <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setImagePreview(null)}>
                  <div className="relative w-full max-w-5xl h-[85vh] bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xl flex items-center justify-center">
                      <NextImage src={imagePreview} alt="Preview" fill className="object-contain p-4" />
                      <button 
                          onClick={() => setImagePreview(null)} 
                          className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 p-2.5 rounded-full text-slate-700 border border-slate-300 transition-all shadow-md"
                      >
                          <X className="w-5 h-5"/>
                      </button>
                  </div>
              </div>
          )}
        </main>
    </div>
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
            <DialogContent className="sm:max-w-2xl bg-white border-slate-200 text-slate-900 rounded-2xl shadow-xl">
                <DialogHeader>
                    <DialogTitle className="text-xl text-slate-900">Toplu Soru Ekle <span className="text-sm font-normal text-slate-500 ml-2">({type === 'mcq' ? 'Çoktan Seçmeli' : 'Açık Uçlu'})</span></DialogTitle>
                </DialogHeader>
                <RhfForm {...form}>
                    <form onSubmit={form.handleSubmit(handleImportClick)} className="space-y-6 mt-2">
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <FormField control={form.control} name="subject" render={({field}) => (
                                <FormItem>
                                    <FormLabel className="text-slate-700 font-semibold">Ders</FormLabel>
                                    <Combobox options={existingSubjects.map(s=>({label:s,value:s}))} value={field.value} onChange={field.onChange} onCreate={onSubjectCreate} className={themeColors.INPUT_BG}/>
                                    <FormMessage/>
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="topic" render={({field}) => (
                                <FormItem>
                                    <FormLabel className="text-slate-700 font-semibold">Konu</FormLabel>
                                    <Combobox options={existingTopics.map(s=>({label:s,value:s}))} value={field.value} onChange={field.onChange} onCreate={onTopicCreate} className={themeColors.INPUT_BG}/>
                                    <FormMessage/>
                                </FormItem>
                            )}/>
                         </div>
                         
                         <div {...getRootProps()} className={cn(
                             "w-full aspect-video border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer bg-slate-50",
                             isDragActive ? "border-indigo-500 bg-indigo-50 text-indigo-600" : "border-slate-300 text-slate-500 hover:border-indigo-400 hover:bg-slate-100"
                         )}>
                              <input {...getInputProps()} />
                              <div className="p-4 bg-white rounded-full mb-3 shadow-sm border border-slate-100">
                                  <UploadCloud className="h-8 w-8 text-slate-400"/>
                              </div>
                              <p className="text-sm font-medium text-slate-700">Soru görsellerini buraya sürükleyin</p>
                              <p className="text-xs text-slate-500 mt-1">veya seçmek için tıklayın (.jpg, .png)</p>
                         </div>

                         {form.watch('images')?.length > 0 && (
                             <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700">
                                 <CheckCircle2 className="w-5 h-5"/>
                                 <span className="text-sm font-semibold">{form.watch('images').length} resim yüklendi.</span>
                             </div>
                         )}

                        <DialogFooter className="border-t border-slate-100 pt-4 mt-2">
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-600 hover:text-slate-900 hover:bg-slate-100">İptal</Button>
                            <Button type="submit" disabled={isImporting || form.watch('images')?.length === 0} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 shadow-sm">
                                {isImporting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Yükleniyor...</> : 'İçe Aktar'}
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
    
    const questionsForTest = selectedItems.map((item:any) => ({
        questionId: item.id,
        imageUrl: item.imageUrl!,
        type: item.type,
        correctAnswer: item.correctAnswer 
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
        toast({ title: "✅ Başarılı", description: "Ödev başarıyla atandı.", variant: "default" });
        onAssignmentComplete();
        onOpenChange(false);
    } catch (e) { 
        toast({ title: "Hata", description: "Ödev atanırken bir sorun oluştu.", variant: "destructive" }); 
    } finally { 
        setLoading(false); 
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white border-slate-200 text-slate-900 rounded-2xl shadow-xl">
        <DialogHeader>
            <DialogTitle className="text-xl">Ödev Ata <Badge className="ml-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-indigo-200">{selectedIds.length} Soru</Badge></DialogTitle>
        </DialogHeader>
        <RhfForm {...form}>
            <form onSubmit={form.handleSubmit(handleAssignmentSubmit)} className="space-y-5 mt-2">
                <FormField control={form.control} name="title" render={({field}) => (
                    <FormItem>
                        <FormLabel className="text-slate-700 font-semibold">Ödev Başlığı</FormLabel>
                        <Input {...field} placeholder="Örn: 1. Ünite Tekrarı" className={themeColors.INPUT_BG}/>
                    </FormItem>
                )}/>
                
                <FormField control={form.control} name="studentIds" render={() => (
                    <FormItem>
                        <FormLabel className="text-slate-700 font-semibold">Öğrenciler</FormLabel>
                        <div className="space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
                            {students.map((s:any) => (
                                <FormField key={s.id} control={form.control} name="studentIds" render={({ field }) => (
                                    <FormItem className="flex items-center space-x-3 space-y-0 hover:bg-white p-2 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-200 hover:shadow-sm">
                                        <FormControl>
                                            <Checkbox 
                                                checked={field.value?.includes(s.id)} 
                                                onCheckedChange={(c) => c ? field.onChange([...(field.value||[]), s.id]) : field.onChange(field.value?.filter((v)=>v!==s.id))} 
                                                className="border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                            />
                                        </FormControl>
                                        <FormLabel className="font-medium cursor-pointer w-full text-slate-800 flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{backgroundColor: s.color || '#6366f1'}}/>
                                            {s.name}
                                        </FormLabel>
                                    </FormItem>
                                )}/>
                            ))}
                        </div>
                    </FormItem>
                )}/>

                 <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="dateRange" render={({field}) => (
                        <FormItem>
                            <FormLabel className="text-slate-700 font-semibold">Tarih Aralığı</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("w-full justify-start text-left bg-white border-slate-300 hover:bg-slate-50 hover:text-slate-900 shadow-sm font-medium")}>
                                        <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
                                        {format(field.value.from, "d MMM", {locale:tr})} - {format(field.value.to, "d MMM", {locale:tr})}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="bg-white border-slate-200 shadow-xl w-auto p-0 rounded-xl" align="start">
                                    <Calendar 
                                        mode="range" 
                                        selected={field.value} 
                                        onSelect={(val) => { if(val?.from && val?.to) field.onChange(val); }} 
                                        className="bg-white text-slate-900 p-3"
                                    />
                                </PopoverContent>
                            </Popover>
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="durationMinutes" render={({field}) => (
                        <FormItem>
                            <FormLabel className="text-slate-700 font-semibold">Süre (Dk)</FormLabel>
                            <Input type="number" placeholder="Süresiz" {...field} className={themeColors.INPUT_BG}/>
                        </FormItem>
                    )}/>
                 </div>
                 
                <DialogFooter className="pt-4 border-t border-slate-100 mt-2">
                    <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-600 hover:text-slate-900 hover:bg-slate-100">İptal</Button>
                    <Button type="submit" disabled={loading || form.watch('studentIds').length === 0} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 shadow-sm">
                        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Atanıyor</> : 'Ödevi Ata'}
                    </Button>
                </DialogFooter>
            </form>
        </RhfForm>
      </DialogContent>
    </Dialog>
  );
}