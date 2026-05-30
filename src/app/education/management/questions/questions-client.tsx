
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    ArrowLeft, Trash2, Plus, X, Edit, AlertTriangle, UploadCloud, Send, 
    Calendar as CalendarIcon, FileQuestion, BookCopy, Search, CheckCircle2, 
    Maximize2, Database, LayoutGrid, Folder, FolderOpen, ChevronRight, Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDropzone } from 'react-dropzone';
import NextImage from 'next/image';
import { addBulkBankQuestions, onBankQuestionsUpdate, onSubjectsUpdate, onTopicsUpdate, updateSubjects, updateTopics, deleteBankQuestion, deleteBulkBankQuestions, addTest, onMistakesUpdate, deleteMistake, onTestsUpdate, onTrackedBooksUpdate, onStudyPlansUpdate } from "@/lib/dataService";
import { BankQuestion, FamilyMember, Test, Mistake, TrackedBook, StudyPlan } from "@/lib/data";
import { Combobox } from "@/components/ui/combobox";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { motion, AnimatePresence } from "framer-motion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// --- DESIGN SYSTEM ---
const themeColors = {
    HEADER_BG: "bg-white/90 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-40 shadow-sm",
    CARD_BG: "bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 hover:-translate-y-0.5 transition-all duration-300",
    FOLDER_BG: "bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all duration-200 flex items-center p-5 rounded-3xl cursor-pointer group",
    LIST_ITEM: "bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors flex items-center p-3 gap-4 group cursor-pointer",
    ICON_BOX: "bg-indigo-50 text-indigo-600 p-2.5 rounded-xl shadow-inner border border-indigo-100",
    BUTTON_GLASS: "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm transition-all font-semibold",
    TAB_LIST: "bg-slate-100 border border-slate-200/60 p-1 rounded-xl w-full sm:w-auto flex",
    TAB_TRIGGER: "data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm data-[state=active]:font-bold text-slate-500 hover:text-slate-700 font-medium text-xs sm:text-sm transition-all flex-1",
};

export function QuestionsClient() {
  const { familyMembers } = useAuth();
  const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [trackedBooks, setTrackedBooks] = useState<TrackedBook[]>([]);
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals & Forms
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkDialogType, setBulkDialogType] = useState<'mcq' | 'open_ended'>('mcq');
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Filters & Tabs
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterTopic, setFilterTopic] = useState("all");
  const [activeTab, setActiveTab] = useState("bank"); 
  const [activeSubTab, setActiveSubTab] = useState("mcq"); 

  // VIEW MODE & FOLDERS
  const [viewLayout, setViewLayout] = useState<'grid' | 'folder'>('folder');
  const [currentFolder, setCurrentFolder] = useState<{subject: string | null, topic: string | null}>({subject: null, topic: null});

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
    const unsubQuestions = onBankQuestionsUpdate((questions) => { setBankQuestions(questions); setIsLoading(false); });
    const unsubSubjects = onSubjectsUpdate(setAllSubjects);
    const unsubTopics = onTopicsUpdate(setAllTopics);
    const unsubMistakes = onMistakesUpdate(setMistakes);
    const unsubBooks = onTrackedBooksUpdate(setTrackedBooks);
    const unsubPlans = onStudyPlansUpdate(setStudyPlans);
    return () => { unsubQuestions(); unsubSubjects(); unsubTopics(); unsubMistakes(); unsubBooks(); unsubPlans(); };
  }, []);

  // Grid Görünümü için Düz Filtrelenmiş Veri
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
      if (filterSubject !== 'all') data = data.filter(item => item.subject === filterSubject);
      if (filterTopic !== 'all') data = data.filter(item => item.topic === filterTopic);
      return data;
  }, [bankQuestions, mistakes, activeTab, activeSubTab, searchQuery, filterSubject, filterTopic]);

  // Klasör Görünümü İçin Hiyerarşik Veri Yapısı
  const folderStats = useMemo(() => {
      const source = activeTab === 'bank' ? bankQuestions : mistakes;
      const baseFiltered = source.filter(i => 
          i.type === activeSubTab && 
          (!searchQuery || (i.title?.toLowerCase().includes(searchQuery.toLowerCase()) || i.subject?.toLowerCase().includes(searchQuery.toLowerCase()) || i.topic?.toLowerCase().includes(searchQuery.toLowerCase())))
      );

      const subjects: Record<string, { count: number, topics: Record<string, any[]> }> = {};

      baseFiltered.forEach(item => {
          if (!subjects[item.subject]) subjects[item.subject] = { count: 0, topics: {} };
          subjects[item.subject].count += 1;
          
          if (!subjects[item.subject].topics[item.topic]) subjects[item.subject].topics[item.topic] = [];
          subjects[item.subject].topics[item.topic].push(item);
      });

      return subjects;
  }, [bankQuestions, mistakes, activeTab, activeSubTab, searchQuery]);

  const handleCreateSubject = async (name: string) => { await updateSubjects([...new Set([...allSubjects, name])]); toast({title: "Oluşturuldu"}); };
  const handleCreateTopic = async (name: string) => { await updateTopics([...new Set([...allTopics, name])]); toast({title: "Oluşturuldu"}); };

  const handleOpenForm = (question: BankQuestion | null, type: 'mcq' | 'open_ended') => {
    setEditingQuestion(question);
    setDefaultQuestionType(type);
    setIsFormOpen(true);
  }

  const handleDeleteSelected = async () => {
    try {
        if (activeTab === 'bank') await deleteBulkBankQuestions(selectedIds);
        else for (const id of selectedIds) await deleteMistake(id);
        toast({ title: `${selectedIds.length} kayıt silindi` });
        setSelectedIds([]);
    } catch(error) { toast({ title: "Hata", variant: "destructive" }); }
  }

  const handleBulkImport = async (questions: any[], type: 'mcq' | 'open_ended') => {
    toast({ title: "İçe Aktarılıyor..." });
    setIsBulkDialogOpen(false);
    try {
        await addBulkBankQuestions(questions.map((q, i) => ({ ...q, title: q.originalFilename || `${q.topic} - Soru ${i + 1}`, type })));
        toast({ title: "Başarılı" });
    } catch (e) { toast({ title: "Hata", variant: 'destructive' }); }
  };

  const toggleSelection = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-50/50"><Loader2 className="animate-spin h-12 w-12 text-indigo-600" /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans relative flex flex-col">

        {/* Header */}
        <header className={themeColors.HEADER_BG}>
            <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button onClick={() => router.back()} variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 text-slate-500 h-10 w-10">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className={themeColors.ICON_BOX}><Database className="w-6 h-6" /></div>
                    <div className="flex flex-col justify-center">
                        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">İçerik Havuzu</h1>
                        <p className="text-xs font-medium text-slate-500">Soru bankası ve klasör yönetimi</p>
                    </div>
                </div>
                {activeTab === 'bank' && (
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => { setBulkDialogType(activeSubTab as any); setIsBulkDialogOpen(true); }} className={cn("hidden sm:flex h-11 rounded-xl px-5", themeColors.BUTTON_GLASS)}>
                            <UploadCloud className="mr-2 h-4 w-4 text-indigo-600" /> Toplu Ekle
                        </Button>
                        <Button onClick={() => handleOpenForm(null, activeSubTab as any)} className="bg-indigo-600 hover:bg-indigo-700 text-white h-11 px-5 rounded-xl shadow-md font-bold">
                            <Plus className="mr-1.5 h-4 w-4" /> Yeni Soru
                        </Button>
                    </div>
                )}
            </div>
        </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 relative z-10 flex flex-col">
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setCurrentFolder({subject: null, topic: null}); }} className="space-y-6 flex flex-col flex-1">
            
            {/* Kontrol Paneli */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm flex flex-col gap-5">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <TabsList className={themeColors.TAB_LIST}>
                        <TabsTrigger value="bank" className={cn("rounded-lg px-6 h-10", themeColors.TAB_TRIGGER)}>Soru Bankası</TabsTrigger>
                        <TabsTrigger value="mistakes" className={cn("rounded-lg px-6 h-10", themeColors.TAB_TRIGGER)}>
                            Yanlış Havuzu <Badge className="ml-2 bg-rose-100 text-rose-700 border-none px-1.5">{mistakes.length}</Badge>
                        </TabsTrigger>
                    </TabsList>
                    
                    <Tabs value={activeSubTab} onValueChange={(v) => { setActiveSubTab(v); setCurrentFolder({subject: null, topic: null}); }} className="w-full lg:w-auto">
                        <TabsList className="bg-slate-100 border border-slate-200/60 p-1 rounded-xl h-12 w-full lg:w-auto flex">
                            <TabsTrigger value="mcq" className="rounded-lg px-4 font-semibold text-xs data-[state=active]:bg-white data-[state=active]:text-indigo-700 flex-1">Çoktan Seçmeli</TabsTrigger>
                            <TabsTrigger value="open_ended" className="rounded-lg px-4 font-semibold text-xs data-[state=active]:bg-white data-[state=active]:text-indigo-700 flex-1">Açık Uçlu</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                <div className="h-px bg-slate-100 w-full" />

                {/* Alt Kısım: Arama, Görünüm Tipi ve (Grid ise) Filtreler */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
                        <div className="bg-slate-100 p-1 rounded-xl flex border border-slate-200 shrink-0">
                            <Button 
                                variant="ghost" size="sm" 
                                onClick={() => { setViewLayout('folder'); setCurrentFolder({subject: null, topic: null}); }} 
                                className={cn("h-8 rounded-lg px-3 transition-all", viewLayout === 'folder' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800")}
                            >
                                <Folder className="w-4 h-4 mr-1.5" /> Klasörler
                            </Button>
                            <Button 
                                variant="ghost" size="sm" 
                                onClick={() => setViewLayout('grid')} 
                                className={cn("h-8 rounded-lg px-3 transition-all", viewLayout === 'grid' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800")}
                            >
                                <LayoutGrid className="w-4 h-4 mr-1.5" /> Kartlar
                            </Button>
                        </div>
                        
                        <div className="relative w-full sm:w-72 shrink-0">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input placeholder="Soru veya klasör ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-10 rounded-xl bg-slate-50 border-slate-200 text-sm focus:bg-white" />
                        </div>
                    </div>
                </div>
            </div>

            {/* İÇERİK ALANI */}
            <div className="flex-1 pb-24">
                
                {/* 1. KART (GRID) GÖRÜNÜMÜ */}
                {viewLayout === 'grid' && (
                    filteredData.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in">
                            {filteredData.map((item) => (
                                <QuestionCard key={item.id} item={item} isSelected={selectedIds.includes(item.id)} onToggle={() => toggleSelection(item.id)} onPreview={() => setImagePreview(item.imageUrl!)} onEdit={() => handleOpenForm(item, activeSubTab as any)} showEdit={activeTab === 'bank'} familyMembers={familyMembers} isMistake={activeTab === 'mistakes'} />
                            ))}
                        </div>
                    ) : <EmptyState onClear={() => {setSearchQuery(''); setFilterSubject('all'); setFilterTopic('all');}} hasFilters={!!searchQuery} />
                )}

                {/* 2. KLASÖR (FOLDER) GÖRÜNÜMÜ */}
                {viewLayout === 'folder' && (
                    <div className="space-y-4 animate-in fade-in">
                        
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-500 mb-6 bg-slate-100/50 w-fit px-4 py-2 rounded-2xl flex-wrap">
                            <span className="cursor-pointer hover:text-indigo-600 transition-colors flex items-center" onClick={() => setCurrentFolder({subject: null, topic: null})}>
                                <Folder className="w-4 h-4 mr-2" /> Havuz
                            </span>
                            {currentFolder.subject && (
                                <>
                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                    <span className={cn("cursor-pointer hover:text-indigo-600 transition-colors", !currentFolder.topic && "text-slate-900")} onClick={() => setCurrentFolder({...currentFolder, topic: null})}>
                                        {currentFolder.subject}
                                    </span>
                                </>
                            )}
                            {currentFolder.topic && (
                                <>
                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                    <span className="text-slate-900 truncate max-w-[200px]" title={currentFolder.topic}>{currentFolder.topic}</span>
                                </>
                            )}
                        </div>

                        {!currentFolder.subject && (
                            Object.keys(folderStats).length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {Object.entries(folderStats).map(([subject, data]) => (
                                        <div key={subject} onClick={() => setCurrentFolder({subject, topic: null})} className={themeColors.FOLDER_BG}>
                                            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mr-4 group-hover:bg-indigo-600 transition-colors shrink-0">
                                                <Folder className="w-7 h-7 text-indigo-500 group-hover:text-white transition-colors" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <h3 className="font-bold text-slate-800 text-lg truncate" title={subject}>{subject}</h3>
                                                <p className="text-xs text-slate-500 font-medium">{data.count} Soru • {Object.keys(data.topics).length} Konu</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : <EmptyState onClear={() => setSearchQuery('')} hasFilters={!!searchQuery} />
                        )}

                        {currentFolder.subject && !currentFolder.topic && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {Object.entries(folderStats[currentFolder.subject]?.topics || {}).map(([topic, items]) => (
                                    <div key={topic} onClick={() => setCurrentFolder({...currentFolder, topic})} className={themeColors.FOLDER_BG}>
                                        <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center mr-4 group-hover:bg-violet-600 transition-colors shrink-0">
                                            <FolderOpen className="w-7 h-7 text-violet-500 group-hover:text-white transition-colors" />
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <h3 className="font-bold text-slate-800 truncate" title={topic}>{topic}</h3>
                                            <p className="text-xs text-slate-500 font-medium">{items.length} Soru İçeriyor</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {currentFolder.subject && currentFolder.topic && (
                            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                                <div className="divide-y divide-slate-100">
                                    {folderStats[currentFolder.subject].topics[currentFolder.topic].map(item => (
                                        <div key={item.id} className={themeColors.LIST_ITEM} onClick={() => toggleSelection(item.id)}>
                                            <Checkbox checked={selectedIds.includes(item.id)} className="ml-1 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600" />
                                            <div className="w-16 h-16 sm:w-12 sm:h-12 bg-slate-100 rounded-xl sm:rounded-lg overflow-hidden relative shrink-0 border border-slate-200" onClick={(e) => { e.stopPropagation(); setImagePreview(item.imageUrl!); }}>
                                                {item.imageUrl ? <NextImage src={item.imageUrl} alt="Soru" fill className="object-cover" /> : <FileQuestion className="w-full h-full p-3 text-slate-300" />}
                                            </div>
                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                <p className="font-bold text-sm text-slate-800 line-clamp-2 sm:truncate">{item.title || item.originalFilename || 'İsimsiz Soru'}</p>
                                            </div>
                                            <div className="w-auto sm:w-24 flex justify-end sm:justify-center shrink-0">
                                                {activeTab === 'bank' && (
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50" onClick={(e) => { e.stopPropagation(); handleOpenForm(item, activeSubTab as any); }}>
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
          </Tabs>

          <BulkAddImagesDialog 
            open={isBulkDialogOpen} 
            onOpenChange={setIsBulkDialogOpen} 
            onImport={handleBulkImport} 
            existingSubjects={allSubjects} 
            existingTopics={allTopics}
            trackedBooks={trackedBooks}
            studyPlans={studyPlans}
            bankQuestions={[...bankQuestions, ...mistakes]}
            onSubjectCreate={handleCreateSubject} 
            onTopicCreate={handleCreateTopic} 
            type={bulkDialogType} 
          />
          <AssignTestDialog isOpen={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen} allQuestions={bankQuestions} allMistakes={mistakes} selectedIds={selectedIds} type={assignmentType} onAssignmentComplete={() => setSelectedIds([])} />

          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent className="sm:max-w-xl bg-white rounded-3xl p-0 overflow-hidden"><ScrollArea className="max-h-[85vh]"><div className="p-8">
                <DialogHeader className="mb-6"><DialogTitle className="text-2xl font-black">{editingQuestion ? 'Soruyu Düzenle' : 'Yeni Soru Ekle'}</DialogTitle></DialogHeader>
                <NewQuestionBankForm availableSubjects={allSubjects} onSubjectCreated={handleCreateSubject} availableTopics={allTopics} onTopicCreated={handleCreateTopic} onQuestionProcessed={() => setIsFormOpen(false)} initialData={editingQuestion} defaultType={defaultQuestionType} />
            </div></ScrollArea></DialogContent>
          </Dialog>

          {imagePreview && (
              <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setImagePreview(null)}>
                  <div className="relative w-full max-w-6xl h-[85vh] bg-transparent flex items-center justify-center">
                      <NextImage src={imagePreview} alt="Preview" fill className="object-contain" />
                      <button onClick={() => setImagePreview(null)} className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 p-3 rounded-2xl text-white backdrop-blur"><X className="w-6 h-6"/></button>
                  </div>
              </div>
          )}
        </main>

        <AnimatePresence>
            {selectedIds.length > 0 && (
                <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-lg">
                    <div className="bg-slate-900 text-white rounded-3xl p-4 shadow-2xl flex items-center justify-between border border-white/10 backdrop-blur-xl">
                        <div className="flex items-center gap-4 pl-2">
                             <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center font-black">{selectedIds.length}</div>
                             <span className="font-bold text-sm">Soru Seçildi</span>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => setSelectedIds([])} className="rounded-xl text-slate-400 hover:text-white hover:bg-white/10 h-11">Vazgeç</Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-50 font-bold h-11 px-6">İşlem Yap <ChevronRight className="ml-2 h-4 w-4"/></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 bg-slate-900 border-white/10 text-slate-100 rounded-xl p-1 mb-2">
                                    <DropdownMenuItem onClick={() => { setAssignmentType(activeTab as any); setIsAssignDialogOpen(true); }} className="cursor-pointer py-3 rounded-lg"><Send className="mr-2 h-4 w-4 text-emerald-400"/> Ödev Ata</DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-white/5" />
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-rose-400 cursor-pointer py-3 rounded-lg focus:text-rose-400 focus:bg-rose-50/10"><Trash2 className="mr-2 h-4 w-4"/> Hepsini Sil</DropdownMenuItem>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="bg-slate-900 border-white/10 text-slate-100 rounded-3xl">
                                            <AlertDialogHeader><AlertDialogTitle>Seçilenleri Sil?</AlertDialogTitle><AlertDialogDescription>"{selectedIds.length}" adet kayıt kalıcı olarak silinecektir.</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter><AlertDialogCancel className="bg-white/5 border-white/10 text-white">İptal</AlertDialogCancel><AlertDialogAction onClick={handleDeleteSelected} className="bg-rose-600 hover:bg-rose-700">Hepsini Sil</AlertDialogAction></AlertDialogFooter>
                                        </AlertDialog>
                                    </AlertDialog>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
}

function BulkAddImagesDialog({ 
    open, onOpenChange, onImport, existingSubjects, existingTopics, trackedBooks, studyPlans, bankQuestions, onSubjectCreate, onTopicCreate, type
}: { 
    open: boolean, onOpenChange: (open: boolean) => void, onImport: (questions: Partial<BankQuestion>[], type: 'mcq' | 'open_ended') => void,
    existingSubjects: string[], existingTopics: string[], trackedBooks: TrackedBook[], studyPlans: StudyPlan[], bankQuestions: any[], onSubjectCreate: (name: string) => void, onTopicCreate: (name: string) => void, type: 'mcq' | 'open_ended';
}) {
    const [isImporting, setIsImporting] = useState(false);
    const form = useForm<z.infer<typeof bulkAddSchema>>({ resolver: zodResolver(bulkAddSchema), defaultValues: { subject: '', topic: '', images: [] } });
    
    const selectedSubject = form.watch('subject');

    const filteredTopicsOptions = useMemo(() => {
        if (!selectedSubject) return [];
        const topicsSet = new Set<string>();
        
        // 1. Kitaplardaki bu derse ait konuları bul
        trackedBooks.forEach(book => (book.subjects || []).forEach(s => { 
            if (s.name === selectedSubject) (s.topics || []).forEach(t => topicsSet.add(t.name)); 
        }));

        // 2. Planlardaki bu derse ait konuları bul
        studyPlans.forEach(plan => (plan.subjects || []).forEach(s => { 
            if (s.name === selectedSubject) (s.topics || []).forEach(t => topicsSet.add(t.name)); 
        }));

        // 3. Daha önce bu dersle kaydedilmiş soruların konularını bul
        bankQuestions.forEach(q => {
            if (q.subject === selectedSubject && q.topic) topicsSet.add(q.topic);
        });

        return Array.from(topicsSet).sort().map(t => ({ label: t, value: t }));
    }, [selectedSubject, trackedBooks, studyPlans, bankQuestions]);

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
        onImport(questionsToImport, type);
        setIsImporting(false);
        form.reset();
    };
    
    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) form.reset(); onOpenChange(o); }}>
            <DialogContent className="sm:max-w-2xl bg-white border-slate-200 text-slate-900 rounded-3xl shadow-2xl p-6 md:p-8">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black flex items-center gap-3">
                        Toplu İçe Aktar
                        <Badge className="bg-indigo-100 text-indigo-700 font-bold border-none">{type === 'mcq' ? 'Çoktan Seçmeli' : 'Açık Uçlu'}</Badge>
                    </DialogTitle>
                </DialogHeader>
                <RhfForm {...form}>
                    <form onSubmit={form.handleSubmit(handleImportClick)} className="space-y-6">
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <FormField control={form.control} name="subject" render={({field}) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Ders</FormLabel>
                                    <Combobox 
                                        options={existingSubjects.map(s=>({label:s,value:s}))} 
                                        value={field.value} 
                                        onChange={(v) => { field.onChange(v); form.setValue('topic', ''); }} 
                                        onCreate={onSubjectCreate} 
                                        className="bg-slate-50 border-slate-200 h-11 rounded-xl"
                                    />
                                    <FormMessage/>
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="topic" render={({field}) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Konu</FormLabel>
                                    <Combobox 
                                        options={filteredTopicsOptions} 
                                        value={field.value} 
                                        onChange={field.onChange} 
                                        onCreate={onTopicCreate} 
                                        placeholder={selectedSubject ? "Konu seçin..." : "Önce ders seçin..."}
                                        className="bg-slate-50 border-slate-200 h-11 rounded-xl"
                                    />
                                    <FormMessage/>
                                </FormItem>
                            )}/>
                         </div>
                         
                         <div {...getRootProps()} className={cn(
                             "w-full aspect-[21/9] border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all cursor-pointer",
                             isDragActive ? "border-indigo-500 bg-indigo-50/50 text-indigo-600 scale-[1.02]" : "border-slate-300 text-slate-500 hover:border-indigo-400 hover:bg-slate-50"
                         )}>
                              <input {...getInputProps()} />
                              <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100">
                                  <UploadCloud className="h-6 w-6 text-indigo-500"/>
                              </div>
                              <p className="font-bold text-slate-700">Görselleri sürükleyip bırakın</p>
                              <p className="text-sm text-slate-500 mt-1">veya cihazdan seçin</p>
                         </div>

                        <DialogFooter className="pt-6 mt-4">
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="h-12 rounded-xl text-slate-600 hover:bg-slate-100 font-bold px-6">İptal</Button>
                            <Button type="submit" disabled={isImporting || form.watch('images')?.length === 0} className="h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 shadow-lg w-full sm:w-auto">
                                {isImporting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Görselleri Aktar'}
                            </Button>
                        </DialogFooter>
                    </form>
                </RhfForm>
            </DialogContent>
        </Dialog>
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

function QuestionCard({ item, isSelected, onToggle, onPreview, onEdit, showEdit, familyMembers, isMistake }: any) {
    return (
        <div className={cn("group relative flex flex-col rounded-3xl overflow-hidden cursor-pointer", isSelected ? "border-2 border-indigo-500 bg-indigo-50/20 shadow-lg" : themeColors.CARD_BG)} onClick={onToggle}>
            <div className="relative aspect-[4/3] w-full bg-slate-50 border-b border-slate-100 flex items-center justify-center overflow-hidden">
                <div className="absolute top-3 left-3 z-20">
                    <div className={cn("p-0.5 rounded-lg backdrop-blur-md transition-all", isSelected ? "bg-white border-transparent" : "bg-white/60 border-slate-200 opacity-0 group-hover:opacity-100")}>
                        <Checkbox checked={isSelected} className="w-5 h-5 rounded data-[state=checked]:bg-indigo-600" />
                    </div>
                </div>
                {showEdit && (
                    <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-all">
                        <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/90 shadow-sm rounded-lg" onClick={(e) => { e.stopPropagation(); onEdit(); }}><Edit className="h-4 w-4"/></Button>
                    </div>
                )}
                {item.imageUrl ? (
                    <>
                        <NextImage src={item.imageUrl} alt="Soru" fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-transparent hover:bg-slate-900/20 flex items-center justify-center transition-all" onClick={(e) => { e.stopPropagation(); onPreview(); }}>
                            <div className="bg-white/90 p-3 rounded-2xl shadow-lg opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all"><Maximize2 className="w-5 h-5" /></div>
                        </div>
                    </>
                ) : <FileQuestion className="w-12 h-12 text-slate-300" />}
            </div>
            <div className="p-5 flex flex-col flex-1 bg-white">
                <div className="flex gap-2 mb-3 flex-wrap">
                    <Badge className="bg-indigo-50 text-indigo-700 font-bold text-[10px] rounded-md">{item.subject}</Badge>
                    <Badge variant="outline" className="text-slate-500 text-[10px] rounded-md">{item.topic}</Badge>
                </div>
                <p className="text-sm font-bold text-slate-800 line-clamp-2 leading-relaxed">{item.title || item.originalFilename}</p>
                {isMistake && (
                    <div className="mt-auto pt-4 border-t border-slate-50 flex items-center gap-2 text-xs font-semibold text-rose-600">
                        <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center"><AlertTriangle className="w-3.5 h-3.5"/></div>
                        <span>{familyMembers.find((f:any) => f.id === item.creatorId)?.name} Yanlışı</span>
                    </div>
                )}
            </div>
        </div>
    )
}

function EmptyState({ onClear, hasFilters }: { onClear: () => void, hasFilters: boolean }) {
    return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500 border-2 border-dashed border-slate-200 rounded-3xl bg-white w-full max-w-3xl mx-auto mt-8">
            <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center mb-5"><Search className="w-10 h-10 text-slate-300"/></div>
            <h3 className="text-xl font-black text-slate-800">Kayıt Bulunamadı</h3>
            <p className="text-sm mt-2 max-w-md text-center">Filtrelerinize uygun içerik yok.</p>
            {hasFilters && <Button onClick={onClear} className="mt-6 bg-slate-900 text-white rounded-xl h-11 px-6">Filtreleri Temizle</Button>}
        </div>
    )
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
      <DialogContent className="sm:max-w-md bg-white border-slate-200 text-slate-900 rounded-3xl shadow-2xl p-6 md:p-8">
        <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
                Ödev Oluştur
                <Badge className="bg-emerald-100 text-emerald-700 font-bold border-none">{selectedIds.length} Soru</Badge>
            </DialogTitle>
        </DialogHeader>
        <RhfForm {...form}>
            <form onSubmit={form.handleSubmit(handleAssignmentSubmit)} className="space-y-6">
                
                <FormField control={form.control} name="title" render={({field}) => (
                    <FormItem>
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Test Başlığı</FormLabel>
                        <Input {...field} placeholder="Hafta Sonu Ödevi" className="h-12 bg-slate-50 border-slate-200 focus:bg-white rounded-xl text-sm font-medium"/>
                    </FormItem>
                )}/>
                
                <FormField control={form.control} name="studentIds" render={() => (
                    <FormItem>
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Öğrenciler</FormLabel>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {students.map((s:any) => (
                                <FormField key={s.id} control={form.control} name="studentIds" render={({ field }) => {
                                    const isSelected = field.value?.includes(s.id);
                                    return (
                                        <FormItem className={cn(
                                            "flex items-center space-x-3 space-y-0 p-3 rounded-xl transition-all cursor-pointer border",
                                            isSelected ? "bg-indigo-50/50 border-indigo-200 shadow-sm" : "bg-slate-50 border-slate-200 hover:border-indigo-300"
                                        )}>
                                            <FormControl>
                                                <Checkbox 
                                                    checked={isSelected} 
                                                    onCheckedChange={(c) => c ? field.onChange([...(field.value||[]), s.id]) : field.onChange(field.value?.filter((v)=>v!==s.id))} 
                                                    className="border-slate-300 w-5 h-5 rounded data-[state=checked]:bg-indigo-600"
                                                />
                                            </FormControl>
                                            <FormLabel className="font-bold cursor-pointer w-full text-slate-700 flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{backgroundColor: s.color || '#6366f1'}}/>
                                                {s.name}
                                            </FormLabel>
                                        </FormItem>
                                    )
                                }}/>
                            ))}
                        </div>
                    </FormItem>
                )}/>

                 <div className="grid grid-cols-2 gap-5">
                    <FormField control={form.control} name="dateRange" render={({field}) => (
                        <FormItem>
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Tarih</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("w-full h-12 justify-start text-left bg-slate-50 border-slate-200 hover:bg-white shadow-sm font-bold text-slate-700 rounded-xl px-3")}>
                                        <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                                        <span className="truncate">{field.value.to ? format(field.value.to, "d MMM", {locale:tr}) : "Seçin"}</span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="bg-white border-slate-200 shadow-2xl w-auto p-0 rounded-2xl" align="start">
                                    <Calendar 
                                        mode="range" 
                                        selected={field.value} 
                                        onSelect={(val) => { if(val?.from && val?.to) field.onChange(val); }} 
                                        className="bg-white text-slate-900 p-4"
                                    />
                                </PopoverContent>
                            </Popover>
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="durationMinutes" render={({field}) => (
                        <FormItem>
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Süre (Dk)</FormLabel>
                            <Input type="number" placeholder="Süresiz" {...field} className="h-12 bg-slate-50 border-slate-200 focus:bg-white rounded-xl text-sm font-bold text-slate-700"/>
                        </FormItem>
                    )}/>
                 </div>
                 
                <DialogFooter className="pt-6 mt-4">
                    <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="h-12 rounded-xl text-slate-600 hover:bg-slate-100 font-bold px-6">İptal</Button>
                    <Button type="submit" disabled={loading || form.watch('studentIds').length === 0} className="h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 shadow-lg w-full sm:w-auto">
                        {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Ödevi Ata'}
                    </Button>
                </DialogFooter>
            </form>
        </RhfForm>
      </DialogContent>
    </Dialog>
  );
}
