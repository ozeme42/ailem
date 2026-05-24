
"use client";

import * as React from "react";
import Link from "next/link";
import { 
    ArrowLeft, Plus, Search, Trash2, Edit, X, 
    ScrollText, Eye, Loader2, ChevronRight, ChevronLeft, Check, 
    BookOpen, Layers, Type, Code, Save, BookCopy, PlusCircle
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { 
    onSummariesUpdate, addSummary, updateSummary, deleteSummary,
    onSubjectsUpdate, onTopicsUpdate, updateSubjects, updateTopics
} from "@/lib/dataService";
import { Summary } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { 
    Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle 
} from "@/components/ui/card";
import { 
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, 
    AlertDialogTitle, AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";

// --- DESIGN SYSTEM ---
const themeColors = {
    HEADER_BG: "bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/50 sticky top-0 z-40",
    CARD_BG: "bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-md transition-all duration-300",
    ICON_BOX: "bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 rounded-xl shadow-lg shadow-emerald-500/20 text-white",
    INPUT_BG: "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:border-indigo-500 transition-all",
    WIZARD_STEP_ACTIVE: "bg-indigo-600 text-white shadow-lg",
    WIZARD_STEP_INACTIVE: "bg-slate-100 dark:bg-slate-800 text-slate-400",
    SELECTION_CARD: "relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all cursor-pointer text-center gap-2 h-24",
    CARD_ACTIVE: "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 shadow-md",
    CARD_INACTIVE: "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-indigo-800",
    ADD_CARD: "border-dashed border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all"
};

type WizardStep = 'subject' | 'topic' | 'content';

export function SummariesManagementClient() {
    const { familyId } = useAuth();
    const { toast } = useToast();
    
    const [summaries, setSummaries] = React.useState<Summary[]>([]);
    const [allSubjects, setAllSubjects] = React.useState<string[]>([]);
    const [allTopics, setAllTopics] = React.useState<string[]>([]);
    
    const [loading, setLoading] = React.useState(true);
    const [searchTerm, setSearchTerm] = React.useState("");
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingSummary, setEditingSummary] = React.useState<Summary | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);

    // Wizard states
    const [currentStep, setCurrentStep] = React.useState<WizardStep>('subject');
    const [formTitle, setFormTitle] = React.useState("");
    const [formSubject, setFormSubject] = React.useState("");
    const [formTopic, setFormTopic] = React.useState("");
    const [formContent, setFormContent] = React.useState("");

    // Inline add states
    const [isAddingNewSubject, setIsAddingNewSubject] = React.useState(false);
    const [isAddingNewTopic, setIsAddingNewTopic] = React.useState(false);
    const [newItemName, setNewItemName] = React.useState("");

    React.useEffect(() => {
        if (!familyId) return;
        const unsubS = onSummariesUpdate(setSummaries);
        const unsubSub = onSubjectsUpdate(setAllSubjects);
        const unsubTop = onTopicsUpdate(setAllTopics);
        setLoading(false);
        return () => { unsubS(); unsubSub(); unsubTop(); };
    }, [familyId]);

    const handleOpenForm = (summary: Summary | null) => {
        setIsAddingNewSubject(false);
        setIsAddingNewTopic(false);
        setNewItemName("");
        
        if (summary) {
            setEditingSummary(summary);
            setFormTitle(summary.title);
            setFormSubject(summary.subject);
            setFormTopic(summary.topic);
            setFormContent(summary.content);
            setCurrentStep('content');
        } else {
            setEditingSummary(null);
            setFormTitle("");
            setFormSubject("");
            setFormTopic("");
            setFormContent("");
            setCurrentStep('subject');
        }
        setIsFormOpen(true);
    };

    const handleQuickAdd = async (type: 'subject' | 'topic') => {
        if (!newItemName.trim()) return;
        const name = newItemName.trim();
        
        if (type === 'subject') {
            if (!allSubjects.includes(name)) {
                await updateSubjects([...allSubjects, name]);
                toast({ title: "Der Eklendi" });
            }
            setFormSubject(name);
            setIsAddingNewSubject(false);
        } else {
            if (!allTopics.includes(name)) {
                await updateTopics([...allTopics, name]);
                toast({ title: "Konu Eklendi" });
            }
            setFormTopic(name);
            setIsAddingNewTopic(false);
        }
        setNewItemName("");
    };

    const handleNextStep = () => {
        if (currentStep === 'subject') {
            if (!formSubject) {
                toast({ title: "Ders Seçin", description: "Lütfen bir ders belirleyin.", variant: "destructive" });
                return;
            }
            setCurrentStep('topic');
        } else if (currentStep === 'topic') {
            if (!formTopic) {
                toast({ title: "Konu Seçin", description: "Lütfen bir konu belirleyin.", variant: "destructive" });
                return;
            }
            setCurrentStep('content');
        }
    };

    const handlePrevStep = () => {
        if (currentStep === 'topic') setCurrentStep('subject');
        else if (currentStep === 'content') setCurrentStep('topic');
    };

    const handleSave = async () => {
        if (!formTitle.trim() || !formContent.trim()) {
            toast({ title: "Eksik Bilgi", description: "Başlık ve içeriği doldurun.", variant: "destructive" });
            return;
        }

        const summaryData = {
            title: formTitle,
            subject: formSubject,
            topic: formTopic || "Genel",
            content: formContent,
        };

        try {
            if (editingSummary) {
                await updateSummary(editingSummary.id, summaryData);
                toast({ title: "Özet Güncellendi ✨" });
            } else {
                await addSummary(summaryData);
                toast({ title: "Yeni Özet Eklendi ✅" });
            }
            setIsFormOpen(false);
        } catch (e) {
            toast({ title: "Hata", variant: "destructive" });
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteSummary(id);
            toast({ title: "Özet Silindi 🗑️" });
        } catch (e) {
            toast({ title: "Hata", variant: "destructive" });
        }
    };

    const filteredSummaries = summaries.filter(s => 
        s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.topic.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stepInfo = {
        subject: { title: "Ders Seçimi", desc: "Hangi ders için özet ekliyorsunuz?", icon: BookOpen },
        topic: { title: "Konu Seçimi", desc: "Özetin konusu nedir?", icon: Layers },
        content: { title: "İçerik Detayları", desc: "Başlık ve notlarınızı girin.", icon: ScrollText }
    };

    const currentStepIndex = ['subject', 'topic', 'content'].indexOf(currentStep);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans flex flex-col">
            <header className={themeColors.HEADER_BG}>
                <div className="max-w-5xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/education/management">
                            <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400">
                                <ArrowLeft className="h-6 w-6" />
                            </Button>
                        </Link>
                        <div className={themeColors.ICON_BOX}>
                            <ScrollText className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 leading-none">Özet Yönetimi</h1>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Konu özetlerini yönetin</p>
                        </div>
                    </div>
                    <Button onClick={() => handleOpenForm(null)} className="rounded-xl h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-500/20">
                        <Plus className="mr-2 h-5 w-5" /> Yeni Özet
                    </Button>
                </div>
            </header>

            <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-6 space-y-6">
                <div className={cn("rounded-3xl p-4 md:p-6", themeColors.CARD_BG)}>
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Özetlerde ara..." 
                            className={cn("pl-10 h-11 rounded-xl", themeColors.INPUT_BG)}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSummaries.map((summary) => (
                        <Card key={summary.id} className={cn("flex flex-col h-full", themeColors.CARD_BG)}>
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start mb-2">
                                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200">
                                        {summary.subject}
                                    </Badge>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleOpenForm(summary)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-rose-500">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="dark:bg-slate-900 dark:border-slate-800">
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Özeti Sil?</AlertDialogTitle>
                                                    <AlertDialogDescription>"{summary.title}" özeti kalıcı olarak silinecektir.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel className="dark:bg-slate-800 dark:text-white">Vazgeç</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(summary.id)} className="bg-rose-600 text-white">Sil</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                                <CardTitle className="text-lg font-bold leading-tight">{summary.title}</CardTitle>
                                <CardDescription className="text-xs">{summary.topic}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <div className="text-sm text-slate-500 line-clamp-3 overflow-hidden">
                                    {summary.content.replace(/<[^>]*>?/gm, '').substring(0, 150)}...
                                </div>
                            </CardContent>
                            <CardFooter className="pt-0">
                                <Button variant="secondary" className="w-full rounded-xl h-10 font-bold" onClick={() => { setFormContent(summary.content); setEditingSummary(summary); setIsPreviewOpen(true); }}>
                                    <Eye className="w-4 h-4 mr-2" /> İçeriği Gör
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </main>

            {/* ADIM ADIM ÖZET SİHİRBAZI */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="max-w-2xl h-[90vh] md:h-[80vh] flex flex-col p-0 overflow-hidden rounded-3xl dark:bg-slate-950 dark:border-slate-800 bg-white">
                    <DialogHeader className="p-6 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                        <div className="flex items-center justify-between mb-4">
                            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                                {React.createElement(stepInfo[currentStep].icon, { className: "w-6 h-6 text-indigo-500" })}
                                {editingSummary ? "Özeti Düzenle" : "Yeni Özet Sihirbazı"}
                            </DialogTitle>
                            <div className="flex items-center gap-2">
                                {[0, 1, 2].map((i) => (
                                    <div 
                                        key={i} 
                                        className={cn(
                                            "h-1.5 rounded-full transition-all duration-300", 
                                            i === currentStepIndex ? "w-8 bg-indigo-600" : "w-4 bg-slate-200 dark:bg-slate-800"
                                        )} 
                                    />
                                ))}
                            </div>
                        </div>
                        <DialogDescription className="text-sm font-medium">{stepInfo[currentStep].desc}</DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden relative">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.02 }}
                                transition={{ duration: 0.2 }}
                                className="h-full flex flex-col"
                            >
                                <ScrollArea className="flex-1">
                                    <div className="p-6">
                                        {currentStep === 'subject' && (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                {allSubjects.map((s) => {
                                                    const isActive = formSubject === s;
                                                    return (
                                                        <div 
                                                            key={s} 
                                                            onClick={() => setFormSubject(s)}
                                                            className={cn(
                                                                themeColors.SELECTION_CARD,
                                                                isActive ? themeColors.CARD_ACTIVE : themeColors.CARD_INACTIVE
                                                            )}
                                                        >
                                                            {isActive && <div className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full p-0.5"><Check className="w-3 h-3" /></div>}
                                                            <BookOpen className={cn("w-5 h-5", isActive ? "text-indigo-600" : "text-slate-400")} />
                                                            <span className="text-xs font-bold truncate w-full px-1">{s}</span>
                                                        </div>
                                                    );
                                                })}
                                                
                                                {isAddingNewSubject ? (
                                                    <div className={cn(themeColors.SELECTION_CARD, "border-indigo-300 bg-indigo-50/20")}>
                                                        <Input 
                                                            autoFocus
                                                            placeholder="Ders adı..." 
                                                            className="h-8 text-[11px] font-bold text-center bg-white" 
                                                            value={newItemName}
                                                            onChange={(e) => setNewItemName(e.target.value)}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd('subject')}
                                                        />
                                                        <div className="flex gap-1 w-full">
                                                            <Button size="sm" className="h-6 flex-1 text-[10px] bg-indigo-600" onClick={() => handleQuickAdd('subject')}>Ekle</Button>
                                                            <Button size="sm" variant="ghost" className="h-6 flex-1 text-[10px]" onClick={() => {setIsAddingNewSubject(false); setNewItemName("");}}>İptal</Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div 
                                                        onClick={() => setIsAddingNewSubject(true)}
                                                        className={cn(themeColors.SELECTION_CARD, themeColors.ADD_CARD)}
                                                    >
                                                        <PlusCircle className="w-5 h-5 text-slate-400" />
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Yeni Ders</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {currentStep === 'topic' && (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                {allTopics.map((t) => {
                                                    const isActive = formTopic === t;
                                                    return (
                                                        <div 
                                                            key={t} 
                                                            onClick={() => setFormTopic(t)}
                                                            className={cn(
                                                                themeColors.SELECTION_CARD,
                                                                isActive ? themeColors.CARD_ACTIVE : themeColors.CARD_INACTIVE
                                                            )}
                                                        >
                                                            {isActive && <div className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full p-0.5"><Check className="w-3 h-3" /></div>}
                                                            <Layers className={cn("w-5 h-5", isActive ? "text-indigo-600" : "text-slate-400")} />
                                                            <span className="text-xs font-bold truncate w-full px-1">{t}</span>
                                                        </div>
                                                    );
                                                })}

                                                {isAddingNewTopic ? (
                                                    <div className={cn(themeColors.SELECTION_CARD, "border-indigo-300 bg-indigo-50/20")}>
                                                        <Input 
                                                            autoFocus
                                                            placeholder="Konu adı..." 
                                                            className="h-8 text-[11px] font-bold text-center bg-white" 
                                                            value={newItemName}
                                                            onChange={(e) => setNewItemName(e.target.value)}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd('topic')}
                                                        />
                                                        <div className="flex gap-1 w-full">
                                                            <Button size="sm" className="h-6 flex-1 text-[10px] bg-indigo-600" onClick={() => handleQuickAdd('topic')}>Ekle</Button>
                                                            <Button size="sm" variant="ghost" className="h-6 flex-1 text-[10px]" onClick={() => {setIsAddingNewTopic(false); setNewItemName("");}}>İptal</Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div 
                                                        onClick={() => setIsAddingNewTopic(true)}
                                                        className={cn(themeColors.SELECTION_CARD, themeColors.ADD_CARD)}
                                                    >
                                                        <PlusCircle className="w-5 h-5 text-slate-400" />
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Yeni Konu</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {currentStep === 'content' && (
                                            <div className="space-y-6">
                                                <div className="flex gap-2">
                                                     <Badge className="bg-indigo-600/10 text-indigo-600 border-indigo-200">Ders: {formSubject}</Badge>
                                                     <Badge className="bg-emerald-600/10 text-emerald-600 border-emerald-200">Konu: {formTopic}</Badge>
                                                </div>
                                                
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Özet Başlığı</label>
                                                    <Input 
                                                        value={formTitle} 
                                                        onChange={e => setFormTitle(e.target.value)} 
                                                        placeholder="Örn: 1. Dereceden Denklemler Özet" 
                                                        className={cn("h-12 rounded-xl text-base font-bold", themeColors.INPUT_BG)} 
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center px-1">
                                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">İçerik (HTML)</label>
                                                        <Button variant="ghost" size="sm" className="h-7 text-[10px] text-indigo-600 font-bold" onClick={() => setIsPreviewOpen(true)}><Eye className="w-3 h-3 mr-1"/> Önizleme</Button>
                                                    </div>
                                                    <Textarea 
                                                        value={formContent} 
                                                        onChange={e => setFormContent(e.target.value)} 
                                                        placeholder="Ders notlarını buraya yapıştırın veya yazın..." 
                                                        className={cn("min-h-[250px] font-mono text-xs rounded-2xl p-4 leading-relaxed", themeColors.INPUT_BG)} 
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <DialogFooter className="p-6 border-t dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex-row gap-3">
                        {currentStepIndex > 0 ? (
                            <Button variant="ghost" onClick={handlePrevStep} className="flex-1 h-12 rounded-2xl font-bold">
                                <ChevronLeft className="w-4 h-4 mr-1" /> Geri
                            </Button>
                        ) : (
                            <Button variant="ghost" onClick={() => setIsFormOpen(false)} className="flex-1 h-12 rounded-2xl font-bold">
                                İptal
                            </Button>
                        )}
                        
                        {currentStep === 'content' ? (
                            <Button onClick={handleSave} className="flex-[2] h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-500/20 text-white">
                                <Save className="w-4 h-4 mr-2" /> {editingSummary ? "Güncelle" : "Özeti Tamamla"}
                            </Button>
                        ) : (
                            <Button onClick={handleNextStep} disabled={(currentStep === 'subject' && !formSubject) || (currentStep === 'topic' && !formTopic)} className="flex-[2] h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-500/20 text-white">
                                Devam Et <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Önizleme Dialog */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden rounded-3xl dark:bg-slate-900 dark:border-slate-800">
                    <DialogHeader className="p-6 border-b dark:border-slate-800 flex flex-row items-center justify-between">
                        <DialogTitle>İçerik Önizleme</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="flex-1 bg-white p-8">
                        <div className="prose max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: formContent }} />
                    </ScrollArea>
                    <DialogFooter className="p-4 border-t dark:border-slate-800">
                        <Button onClick={() => setIsPreviewOpen(false)} className="bg-slate-900 text-white dark:bg-slate-800 rounded-xl px-8 h-10 font-bold">Kapat</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
