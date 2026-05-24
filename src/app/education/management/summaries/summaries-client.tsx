
"use client";

import * as React from "react";
import Link from "next/link";
import { 
    ArrowLeft, Plus, Search, Trash2, Edit, X, 
    ScrollText, Eye, Loader2, ChevronRight, ChevronLeft, Check, 
    BookOpen, Layers, Type, Code, Save
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
import { Combobox } from "@/components/ui/combobox";
import { motion, AnimatePresence } from "framer-motion";

// --- DESIGN SYSTEM ---
const themeColors = {
    HEADER_BG: "bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/50 sticky top-0 z-40",
    CARD_BG: "bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-md transition-all duration-300",
    ICON_BOX: "bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 rounded-xl shadow-lg shadow-emerald-500/20 text-white",
    INPUT_BG: "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:border-indigo-500 transition-all",
    WIZARD_STEP_ACTIVE: "bg-indigo-600 text-white shadow-lg",
    WIZARD_STEP_INACTIVE: "bg-slate-100 dark:bg-slate-800 text-slate-400",
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

    React.useEffect(() => {
        if (!familyId) return;
        const unsubS = onSummariesUpdate(setSummaries);
        const unsubSub = onSubjectsUpdate(setAllSubjects);
        const unsubTop = onTopicsUpdate(setAllTopics);
        setLoading(false);
        return () => { unsubS(); unsubSub(); unsubTop(); };
    }, [familyId]);

    const handleOpenForm = (summary: Summary | null) => {
        if (summary) {
            setEditingSummary(summary);
            setFormTitle(summary.title);
            setFormSubject(summary.subject);
            setFormTopic(summary.topic);
            setFormContent(summary.content);
            setCurrentStep('content'); // Edit modunda doğrudan içeriğe gitsin
        } else {
            setEditingSummary(null);
            setFormTitle("");
            setFormSubject("");
            setFormTopic("");
            setFormContent("");
            setCurrentStep('subject'); // Yeni eklemede ilk adımdan başlasın
        }
        setIsFormOpen(true);
    };

    const handleSubjectCreate = async (name: string) => {
        if (!allSubjects.includes(name)) {
            const newList = [...allSubjects, name];
            await updateSubjects(newList);
            toast({ title: "Yeni Ders Eklendi", description: name });
        }
        setFormSubject(name);
    };

    const handleTopicCreate = async (name: string) => {
        if (!allTopics.includes(name)) {
            const newList = [...allTopics, name];
            await updateTopics(newList);
            toast({ title: "Yeni Konu Eklendi", description: name });
        }
        setFormTopic(name);
    };

    const handleNextStep = () => {
        if (currentStep === 'subject') {
            if (!formSubject) {
                toast({ title: "Ders Seçin", description: "Lütfen devam etmek için bir ders seçin.", variant: "destructive" });
                return;
            }
            setCurrentStep('topic');
        } else if (currentStep === 'topic') {
            if (!formTopic) {
                toast({ title: "Konu Seçin", description: "Lütfen devam etmek için bir konu seçin.", variant: "destructive" });
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
            toast({ title: "Eksik Bilgi", description: "Lütfen başlık ve içeriği doldurun.", variant: "destructive" });
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
            toast({ title: "Hata", description: "Kaydedilirken bir sorun oluştu.", variant: "destructive" });
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
        subject: { title: "Ders Seçimi", desc: "Bu özet hangi derse ait?", icon: BookOpen },
        topic: { title: "Konu Seçimi", desc: "Özetin konusunu belirleyin.", icon: Layers },
        content: { title: "İçerik ve Detaylar", desc: "Özet başlığını ve HTML içeriğini girin.", icon: ScrollText }
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
                                                    <AlertDialogAction onClick={() => handleDelete(summary.id)} className="bg-rose-600">Sil</AlertDialogAction>
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
                                <Button variant="secondary" className="w-full rounded-xl" onClick={() => { setEditingSummary(summary); setFormContent(summary.content); setIsPreviewOpen(true); }}>
                                    <Eye className="w-4 h-4 mr-2" /> İçeriği Gör
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </main>

            {/* ADIM ADIM FORM DIALOG */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="max-w-3xl h-[90vh] md:h-[80vh] flex flex-col p-0 overflow-hidden rounded-3xl dark:bg-slate-950 dark:border-slate-800 bg-white">
                    <DialogHeader className="p-6 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                        <div className="flex items-center justify-between mb-4">
                            <DialogTitle className="flex items-center gap-2">
                                {React.createElement(stepInfo[currentStep].icon, { className: "w-5 h-5 text-indigo-500" })}
                                {editingSummary ? "Özeti Düzenle" : "Yeni Özet Sihirbazı"}
                            </DialogTitle>
                            <div className="flex items-center gap-2">
                                {[0, 1, 2].map((i) => (
                                    <div 
                                        key={i} 
                                        className={cn(
                                            "w-2 h-2 rounded-full transition-all duration-300", 
                                            i === currentStepIndex ? "w-6 bg-indigo-600" : "bg-slate-200 dark:bg-slate-800"
                                        )} 
                                    />
                                ))}
                            </div>
                        </div>
                        <DialogDescription className="text-sm">{stepInfo[currentStep].desc}</DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden relative">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="h-full flex flex-col p-6 space-y-6"
                            >
                                {currentStep === 'subject' && (
                                    <div className="space-y-4 max-w-md mx-auto w-full pt-10">
                                        <label className="text-xs font-bold uppercase text-slate-500 tracking-widest pl-1">1. Adım: Ders Belirleyin</label>
                                        <Combobox 
                                            options={allSubjects.map(s => ({label:s, value:s}))} 
                                            value={formSubject} 
                                            onChange={setFormSubject} 
                                            onCreate={handleSubjectCreate}
                                            placeholder="Ders seçin veya yeni yazın..." 
                                            createText="Ders olarak ekle:"
                                        />
                                        <p className="text-[11px] text-slate-400 italic">Örn: Matematik, Fen Bilimleri...</p>
                                    </div>
                                )}

                                {currentStep === 'topic' && (
                                    <div className="space-y-4 max-w-md mx-auto w-full pt-10">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Badge variant="secondary" className="bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border-none">{formSubject}</Badge>
                                            <span className="text-slate-300">/</span>
                                        </div>
                                        <label className="text-xs font-bold uppercase text-slate-500 tracking-widest pl-1">2. Adım: Konu Belirleyin</label>
                                        <Combobox 
                                            options={allTopics.map(t => ({label:t, value:t}))} 
                                            value={formTopic} 
                                            onChange={setFormTopic} 
                                            onCreate={handleTopicCreate}
                                            placeholder="Konu seçin veya yeni yazın..." 
                                            createText="Konu olarak ekle:"
                                        />
                                        <p className="text-[11px] text-slate-400 italic">Örn: Üslü Sayılar, Fotosentez...</p>
                                    </div>
                                )}

                                {currentStep === 'content' && (
                                    <ScrollArea className="flex-1 -mx-2 px-2">
                                        <div className="space-y-6 pb-10">
                                            <div className="grid grid-cols-2 gap-3 mb-2">
                                                 <Badge variant="outline" className="w-fit justify-start bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border-emerald-200">Ders: {formSubject}</Badge>
                                                 <Badge variant="outline" className="w-fit justify-start bg-blue-50 dark:bg-blue-950/20 text-blue-600 border-blue-200">Konu: {formTopic}</Badge>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2"><Type className="w-3 h-3"/> Özet Başlığı</label>
                                                <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Örn: Newton Yasaları Detaylı Anlatım" className={cn("h-12 rounded-xl text-lg font-bold", themeColors.INPUT_BG)} />
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2"><Code className="w-3 h-3"/> HTML İçerik</label>
                                                    <Button variant="ghost" size="sm" className="h-7 text-[11px] text-indigo-600" onClick={() => setIsPreviewOpen(true)}><Eye className="w-3 h-3 mr-1"/> Önizleme</Button>
                                                </div>
                                                <Textarea 
                                                    value={formContent} 
                                                    onChange={e => setFormContent(e.target.value)} 
                                                    placeholder="HTML kodlarını buraya yapıştırın..." 
                                                    className={cn("min-h-[300px] font-mono text-xs rounded-2xl p-4 leading-relaxed", themeColors.INPUT_BG)} 
                                                />
                                            </div>
                                        </div>
                                    </ScrollArea>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <DialogFooter className="p-6 border-t dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex-row gap-3">
                        {currentStepIndex > 0 && (
                            <Button variant="ghost" onClick={handlePrevStep} className="flex-1 h-12 rounded-xl font-bold">
                                <ChevronLeft className="w-4 h-4 mr-1" /> Geri
                            </Button>
                        )}
                        
                        {currentStep === 'content' ? (
                            <Button onClick={handleSave} className="flex-[2] h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-500/20">
                                <Save className="w-4 h-4 mr-2" /> {editingSummary ? "Güncelle" : "Özeti Kaydet"}
                            </Button>
                        ) : (
                            <Button onClick={handleNextStep} className="flex-[2] h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-500/20">
                                İleri <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Preview Dialog (Ayrı Modal) */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden rounded-3xl dark:bg-slate-900 dark:border-slate-800">
                    <DialogHeader className="p-6 border-b dark:border-slate-800 flex flex-row items-center justify-between">
                        <DialogTitle>İçerik Önizleme</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="flex-1 bg-white p-8">
                        <div className="prose max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: formContent }} />
                    </ScrollArea>
                    <DialogFooter className="p-4 border-t dark:border-slate-800">
                        <Button onClick={() => setIsPreviewOpen(false)} className="dark:bg-slate-800 dark:text-white rounded-xl px-8">Kapat</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
