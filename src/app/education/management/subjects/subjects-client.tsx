"use client";

import * as React from "react";
import Link from "next/link";
import { 
    ArrowLeft, BookOpen, Plus, Search, Trash2, Edit, X, 
    Check, Loader2, AlertCircle, ListTree, Target, Sparkles, HelpCircle,
    FolderOpen, ListPlus
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { 
    onSubjectsUpdate, onTopicsUpdate, updateSubjects, updateTopics, 
    onTestsUpdate, onBankQuestionsUpdate, onTrackedBooksUpdate 
} from "@/lib/dataService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { 
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, 
    AlertDialogTitle, AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion, AnimatePresence } from "framer-motion";

// --- DESIGN SYSTEM: Premium Dark Theme ---
const themeColors = {
    HEADER_BG: "bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/50 sticky top-0 z-40",
    CARD_BG: "bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-md transition-all duration-300",
    ICON_BOX: "bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20 text-white",
    INPUT_BG: "bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:border-indigo-500 transition-all",
    TABLE_ROW: "hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors border-b border-slate-100 dark:border-slate-800/50 last:border-0",
};

// --- UTILS ---
const getCategoryName = (test: any): string => {
    if (test.sourceType === 'exam') return 'Genel Deneme Sınavları';
    if (test.sourceType === 'mistake') return 'Yanlışlarım';
    return test.subject || 'Diğer';
};

const normalizeText = (text: string) => {
    if (!text) return "";
    return text.trim().replace(/\s+/g, ' ').split(' ').map(word => 
        word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1).toLocaleLowerCase('tr-TR')
    ).join(' ');
};

export function SubjectsClient() {
    const { familyId } = useAuth();
    const { toast } = useToast();
    
    // Master Lists
    const [allSubjects, setAllSubjects] = React.useState<string[]>([]);
    const [allTopics, setAllTopics] = React.useState<string[]>([]);
    
    // Data lists for Sync & Hierarchy
    const [tests, setTests] = React.useState<any[]>([]);
    const [bankQuestions, setBankQuestions] = React.useState<any[]>([]);
    const [trackedBooks, setTrackedBooks] = React.useState<any[]>([]);
    
    // Local Session Links (Seçilen derse anında eklenmiş göstermek için)
    const [localLinks, setLocalLinks] = React.useState<{subject: string, topic: string}[]>([]);
    
    const [loading, setLoading] = React.useState(true);
    const [searchTerm, setSearchTerm] = React.useState("");

    // Ortak Edit ve Ekleme State'leri
    const [editingItem, setEditingItem] = React.useState<{ type: 'subject' | 'topic', original: string, current: string } | null>(null);
    const [addModal, setAddModal] = React.useState<{ isOpen: boolean, type: 'subject' | 'topic' | 'bulk-topic' }>({ isOpen: false, type: 'subject' });
    const [newItemName, setNewItemName] = React.useState("");
    const [selectedSubject, setSelectedSubject] = React.useState<string>("");

    // Load Data
    React.useEffect(() => {
        if (!familyId) return;
        const unsubS = onSubjectsUpdate(setAllSubjects);
        const unsubT = onTopicsUpdate(setAllTopics);
        const unsubTests = onTestsUpdate(setTests);
        const unsubBank = onBankQuestionsUpdate(setBankQuestions);
        const unsubBooks = onTrackedBooksUpdate((books) => {
            setTrackedBooks(books);
            setLoading(false);
        });
        
        return () => { unsubS(); unsubT(); unsubTests(); unsubBank(); unsubBooks(); };
    }, [familyId]);

    // HİYERARŞİ HARİTASI
    const hierarchyMap = React.useMemo(() => {
        const map = new Map<string, Set<string>>();
        allSubjects.forEach(s => map.set(s, new Set()));

        tests.forEach(t => {
            const subj = getCategoryName(t);
            const topic = t.topicId || t.topic || t._topicName;
            if (subj && topic && topic !== 'Genel' && subj !== 'Diğer') {
                if (!map.has(subj)) map.set(subj, new Set());
                map.get(subj)!.add(topic);
            }
        });

        bankQuestions.forEach(q => {
            if (q.subject && q.topic && q.topic !== 'Genel') {
                if (!map.has(q.subject)) map.set(q.subject, new Set());
                map.get(q.subject)!.add(q.topic);
            }
        });

        trackedBooks.forEach(b => {
            (b.subjects || []).forEach((s: any) => {
                if (!map.has(s.name)) map.set(s.name, new Set());
                (s.topics || []).forEach((t: any) => map.get(s.name)!.add(t.name));
            });
        });

        // Ekranda hemen eşleşmiş göstermek için session bazlı yerel linkleri ekle
        localLinks.forEach(link => {
            if (!map.has(link.subject)) map.set(link.subject, new Set());
            map.get(link.subject)!.add(link.topic);
        });

        return map;
    }, [allSubjects, tests, bankQuestions, trackedBooks, localLinks]);

    // AUTO-SYNC LOGIC
    React.useEffect(() => {
        if (loading || allSubjects.length === 0) return;

        const syncCurriculum = async () => {
            const usedSubjects = new Set<string>();
            const usedTopics = new Set<string>();

            tests.forEach(t => { usedSubjects.add(getCategoryName(t)); if (t._topicName && t._topicName !== 'Genel') usedTopics.add(t._topicName); });
            bankQuestions.forEach(q => { usedSubjects.add(q.subject); usedTopics.add(q.topic); });
            trackedBooks.forEach(b => {
                (b.subjects || []).forEach((s: any) => {
                    usedSubjects.add(s.name);
                    (s.topics || []).forEach((t: any) => usedTopics.add(t.name));
                });
            });

            const currentSubjLower = allSubjects.map(s => s.toLocaleLowerCase('tr-TR'));
            const missingSubjects = Array.from(usedSubjects)
                .filter(s => s && s !== 'Diğer' && s !== 'Yanlışlarım' && s !== 'Genel Deneme Sınavları')
                .map(normalizeText)
                .filter(s => !currentSubjLower.includes(s.toLocaleLowerCase('tr-TR')));

            const currentTopLower = allTopics.map(t => t.toLocaleLowerCase('tr-TR'));
            const missingTopics = Array.from(usedTopics)
                .filter(t => t && t !== 'Genel')
                .map(normalizeText)
                .filter(t => !currentTopLower.includes(t.toLocaleLowerCase('tr-TR')));

            if (missingSubjects.length > 0) {
                await updateSubjects([...new Set([...allSubjects, ...missingSubjects])]);
                toast({ title: "Müfredat Güncellendi", description: `${missingSubjects.length} yeni ders algılandı ve eklendi.` });
            }

            if (missingTopics.length > 0) {
                await updateTopics([...new Set([...allTopics, ...missingTopics])]);
                toast({ title: "Müfredat Güncellendi", description: `${missingTopics.length} yeni konu algılandı ve eklendi.` });
            }
        };

        syncCurriculum();
    }, [tests, bankQuestions, trackedBooks, loading, allSubjects, allTopics, toast]);

    const filteredGroupedTopics = React.useMemo(() => {
        const result: { subject: string, topics: string[], isOrphan?: boolean }[] = [];
        const usedTopicsGlobal = new Set<string>();

        allSubjects.sort((a,b) => a.localeCompare(b, 'tr')).forEach(subj => {
            let topicsForSubj = Array.from(hierarchyMap.get(subj) || new Set<string>())
                .filter(t => allTopics.includes(t))
                .sort((a, b) => a.localeCompare(b, 'tr'));

            topicsForSubj.forEach(t => usedTopicsGlobal.add(t));

            const matchSubj = subj.toLowerCase().includes(searchTerm.toLowerCase());
            if (!matchSubj && searchTerm) {
                topicsForSubj = topicsForSubj.filter(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
            }

            if (matchSubj || topicsForSubj.length > 0) {
                result.push({ subject: subj, topics: topicsForSubj });
            }
        });

        let orphanTopics = allTopics
            .filter(t => !usedTopicsGlobal.has(t))
            .sort((a, b) => a.localeCompare(b, 'tr'));

        if (searchTerm) {
            orphanTopics = orphanTopics.filter(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        if (orphanTopics.length > 0 || "kategorisiz serbest konular".includes(searchTerm.toLowerCase())) {
            result.push({ subject: "Kategorisiz / Serbest Konular", topics: orphanTopics, isOrphan: true });
        }

        return result;
    }, [allSubjects, allTopics, hierarchyMap, searchTerm]);

    // --- CRUD İŞLEMLERİ ---
    const handleSaveNew = async () => {
        if (!newItemName.trim()) return;
        
        try {
            if (addModal.type === "bulk-topic") {
                const rawTopics = newItemName.split(/[\n,]+/).map(t => t.trim()).filter(Boolean);
                const normalizedTopics = rawTopics.map(normalizeText);
                
                const newTopicsToAdd = normalizedTopics.filter(
                    nt => !allTopics.some(t => t.toLocaleLowerCase('tr-TR') === nt.toLocaleLowerCase('tr-TR'))
                );
                
                const uniqueNewTopics = [...new Set(newTopicsToAdd)];
                
                if (uniqueNewTopics.length === 0) {
                    throw new Error("Girdiğiniz konular zaten mevcut veya geçersiz.");
                }
                
                await updateTopics([...allTopics, ...uniqueNewTopics]);
                
                // Seçili ders varsa anında o derse bağla
                if (selectedSubject) {
                    const newLinks = uniqueNewTopics.map(t => ({ subject: selectedSubject, topic: t }));
                    setLocalLinks(prev => [...prev, ...newLinks]);
                    // Not: Veritabanı yapınız salt "Dinamik Eşleşme" üzerine kurulu olduğundan
                    // kalıcı eşleştirme istiyorsanız buraya özel bir backend update fonksiyonu ekleyebilirsiniz.
                }

                toast({ title: "Konular Eklendi ✅", description: `${uniqueNewTopics.length} adet yeni konu eklendi.` });
            } 
            else if (addModal.type === "subject") {
                const normalizedName = normalizeText(newItemName);
                if (allSubjects.some(s => s.toLocaleLowerCase('tr-TR') === normalizedName.toLocaleLowerCase('tr-TR'))) {
                    throw new Error("Bu ders zaten mevcut.");
                }
                await updateSubjects([...allSubjects, normalizedName]);
                toast({ title: "Ders Eklendi ✅", description: `'${normalizedName}' başarıyla kaydedildi.` });
            } 
            else {
                const normalizedName = normalizeText(newItemName);
                if (allTopics.some(t => t.toLocaleLowerCase('tr-TR') === normalizedName.toLocaleLowerCase('tr-TR'))) {
                    throw new Error("Bu konu zaten mevcut.");
                }
                await updateTopics([...allTopics, normalizedName]);

                // Seçili ders varsa anında o derse bağla
                if (selectedSubject) {
                    setLocalLinks(prev => [...prev, { subject: selectedSubject, topic: normalizedName }]);
                }

                toast({ title: "Konu Eklendi ✅", description: `'${normalizedName}' eklendi.` });
            }

            setAddModal({ ...addModal, isOpen: false });
            setNewItemName("");
            setSelectedSubject(""); // Reset
        } catch (e: any) {
            toast({ title: "Hata", description: e.message, variant: "destructive" });
        }
    };

    const handleUpdateItem = async () => {
        if (!editingItem || !editingItem.current.trim()) return;
        const normalizedCurrent = normalizeText(editingItem.current);
        const { original, type } = editingItem;
        
        if (original.toLocaleLowerCase('tr-TR') === normalizedCurrent.toLocaleLowerCase('tr-TR') && original === normalizedCurrent) { 
            setEditingItem(null); 
            return; 
        }

        try {
            if (type === "subject") {
                if (allSubjects.some(s => s !== original && s.toLocaleLowerCase('tr-TR') === normalizedCurrent.toLocaleLowerCase('tr-TR'))) {
                    throw new Error("Bu isimde bir ders zaten var.");
                }
                const newList = allSubjects.map(s => s === original ? normalizedCurrent : s);
                await updateSubjects(newList);
                
                // LocalLink'leri de güncelle
                setLocalLinks(prev => prev.map(l => l.subject === original ? { ...l, subject: normalizedCurrent } : l));
                
                toast({ title: "Ders Güncellendi ✨" });
            } else {
                if (allTopics.some(t => t !== original && t.toLocaleLowerCase('tr-TR') === normalizedCurrent.toLocaleLowerCase('tr-TR'))) {
                    throw new Error("Bu isimde bir konu zaten var.");
                }
                const newList = allTopics.map(t => t === original ? normalizedCurrent : t);
                await updateTopics(newList);
                
                // LocalLink'leri de güncelle
                setLocalLinks(prev => prev.map(l => l.topic === original ? { ...l, topic: normalizedCurrent } : l));
                
                toast({ title: "Konu Güncellendi ✨" });
            }
            setEditingItem(null);
        } catch (e: any) {
            toast({ title: "Düzenleme Hatası", description: e.message, variant: "destructive" });
        }
    };

    const handleDeleteItem = async (name: string, type: 'subject' | 'topic') => {
        try {
            if (type === 'subject') {
                const newList = allSubjects.filter(s => s !== name);
                await updateSubjects(newList);
                setLocalLinks(prev => prev.filter(l => l.subject !== name));
                toast({ title: "Ders Silindi 🗑️" });
            } else {
                const newList = allTopics.filter(t => t !== name);
                await updateTopics(newList);
                setLocalLinks(prev => prev.filter(l => l.topic !== name));
                toast({ title: "Konu Silindi 🗑️" });
            }
        } catch (e) {
            toast({ title: "Hata", variant: "destructive" });
        }
    };

    // Modal açıcı yardımcı fonksiyon
    const openModal = (type: 'subject' | 'topic' | 'bulk-topic', prefillSubject: string = "") => {
        setAddModal({ isOpen: true, type });
        setNewItemName("");
        setSelectedSubject(prefillSubject);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans flex flex-col pb-24">
            {/* --- HEADER --- */}
            <header className={themeColors.HEADER_BG}>
                <div className="max-w-6xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/education/management">
                            <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400">
                                <ArrowLeft className="h-6 w-6" />
                            </Button>
                        </Link>
                        <div className={themeColors.ICON_BOX}>
                            <ListTree className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 leading-none">Müfredat Yönetimi</h1>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Ders ve Konu Hiyerarşisi</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={() => openModal('bulk-topic')} variant="outline" className="hidden md:flex rounded-xl h-11 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-950">
                            <ListPlus className="mr-2 h-4 w-4" /> Toplu Konu
                        </Button>
                        <Button onClick={() => openModal('topic')} variant="outline" className="hidden sm:flex rounded-xl h-11 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-950">
                            <Plus className="mr-2 h-4 w-4" /> Yeni Konu
                        </Button>
                        <Button onClick={() => openModal('subject')} className="rounded-xl h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-500/20">
                            <Plus className="mr-2 h-5 w-5" /> Yeni Ders
                        </Button>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-6 space-y-6">
                
                {/* Arama Alanı */}
                <div className={cn("rounded-3xl p-4 md:p-6 flex items-center justify-between gap-4", themeColors.CARD_BG)}>
                    <div className="flex items-center gap-3">
                        <FolderOpen className="w-6 h-6 text-slate-400" />
                        <div>
                            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">Kayıtlı İçerikler</h2>
                            <p className="text-xs text-slate-500 font-medium">{allSubjects.length} Ders, {allTopics.length} Konu</p>
                        </div>
                    </div>

                    <div className="relative w-full md:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Ders veya konu ara..." 
                            className={cn("pl-10 h-11 rounded-xl", themeColors.INPUT_BG)}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* --- KARTLAR (DERSLER VE İÇİNDEKİ KONULAR) --- */}
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-20 flex flex-col items-center justify-center gap-3">
                            <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                            <p className="text-sm font-medium text-slate-500">Müfredat Ağacı Oluşturuluyor...</p>
                        </motion.div>
                    ) : filteredGroupedTopics.length > 0 ? (
                        <motion.div key="grid" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {filteredGroupedTopics.map(group => (
                                <div key={group.subject} className={cn("rounded-3xl border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden h-fit", themeColors.CARD_BG)}>
                                    
                                    {/* Kart Başlığı (Ders) */}
                                    <div className="p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 group/subject transition-colors">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", group.isOrphan ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" : "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400")}>
                                                {group.isOrphan ? <HelpCircle className="w-5 h-5"/> : <BookOpen className="w-5 h-5" />}
                                            </div>
                                            
                                            {editingItem?.type === 'subject' && editingItem.original === group.subject && !group.isOrphan ? (
                                                <Input 
                                                    autoFocus
                                                    value={editingItem.current}
                                                    onChange={(e) => setEditingItem({ ...editingItem, current: e.target.value })}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateItem()}
                                                    className="h-10 w-full bg-white dark:bg-slate-950 font-bold ring-2 ring-indigo-500 border-none"
                                                />
                                            ) : (
                                                <div className="min-w-0">
                                                    <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-100 truncate">{group.subject}</h3>
                                                    <p className="text-xs text-slate-500 font-medium mt-0.5">{group.topics.length} Kayıtlı Konu</p>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Ders Aksiyonları */}
                                        {!group.isOrphan && (
                                            <div className="flex items-center gap-1 ml-3">
                                                {editingItem?.type === 'subject' && editingItem.original === group.subject ? (
                                                    <>
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-500 hover:bg-emerald-50" onClick={handleUpdateItem}><Check className="h-4 w-4" /></Button>
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:bg-slate-100" onClick={() => setEditingItem(null)}><X className="h-4 w-4" /></Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 opacity-0 group-hover/subject:opacity-100 transition-opacity" onClick={() => setEditingItem({ type: 'subject', original: group.subject, current: group.subject })}>
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover/subject:opacity-100 transition-opacity">
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent className="rounded-3xl">
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Dersi Sil</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        "{group.subject}" dersini silmek istediğinizden emin misiniz? Altındaki konular "Kategorisiz" alanına taşınır.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel className="rounded-xl">İptal</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleDeleteItem(group.subject, 'subject')} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl">Evet, Sil</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* İçerik (Konular Akordeonu) */}
                                    <Accordion type="single" collapsible className="w-full">
                                        <AccordionItem value="topics" className="border-none">
                                            <AccordionTrigger className="px-5 py-3 hover:no-underline hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                                Konuları Göster ({group.topics.length})
                                            </AccordionTrigger>
                                            <AccordionContent className="px-5 pb-5">
                                                <div className="space-y-2 pt-2">
                                                    {group.topics.length > 0 ? group.topics.map(topic => (
                                                        <div key={topic} className="group/topic flex items-center justify-between p-2.5 px-4 rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900/50 hover:border-indigo-200 dark:hover:border-indigo-800/50 transition-colors">
                                                            
                                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                <Target className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                                                                {editingItem?.type === 'topic' && editingItem.original === topic ? (
                                                                    <Input 
                                                                        autoFocus
                                                                        value={editingItem.current}
                                                                        onChange={(e) => setEditingItem({ ...editingItem, current: e.target.value })}
                                                                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateItem()}
                                                                        className="h-8 max-w-[200px] text-xs font-bold bg-white dark:bg-slate-950 ring-2 ring-indigo-500 border-none"
                                                                    />
                                                                ) : (
                                                                    <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm truncate">{topic}</span>
                                                                )}
                                                            </div>

                                                            <div className="flex items-center gap-1 shrink-0 ml-2">
                                                                {editingItem?.type === 'topic' && editingItem.original === topic ? (
                                                                    <>
                                                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-500 hover:bg-emerald-50" onClick={handleUpdateItem}><Check className="h-3.5 w-3.5" /></Button>
                                                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:bg-slate-100" onClick={() => setEditingItem(null)}><X className="h-3.5 w-3.5" /></Button>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 opacity-0 group-hover/topic:opacity-100 transition-opacity" onClick={() => setEditingItem({ type: 'topic', original: topic, current: topic })}>
                                                                            <Edit className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                        <AlertDialog>
                                                                            <AlertDialogTrigger asChild>
                                                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-800 opacity-0 group-hover/topic:opacity-100 transition-opacity">
                                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                                </Button>
                                                                            </AlertDialogTrigger>
                                                                            <AlertDialogContent className="rounded-3xl">
                                                                                <AlertDialogHeader>
                                                                                    <AlertDialogTitle>Konuyu Sil</AlertDialogTitle>
                                                                                    <AlertDialogDescription>
                                                                                        "{topic}" konusunu silmek istediğinizden emin misiniz? (Mevcut test sonuçları etkilenmez).
                                                                                    </AlertDialogDescription>
                                                                                </AlertDialogHeader>
                                                                                <AlertDialogFooter>
                                                                                    <AlertDialogCancel className="rounded-xl">İptal</AlertDialogCancel>
                                                                                    <AlertDialogAction onClick={() => handleDeleteItem(topic, 'topic')} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl">Evet, Sil</AlertDialogAction>
                                                                                </AlertDialogFooter>
                                                                            </AlertDialogContent>
                                                                        </AlertDialog>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )) : (
                                                        <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                                                            Henüz konu atanmamış.
                                                        </p>
                                                    )}

                                                    {/* Doğrudan Bu Derse Konu Ekleme Butonu */}
                                                    <Button variant="ghost" onClick={() => openModal('topic', group.isOrphan ? "" : group.subject)} className="w-full mt-2 h-9 border border-dashed border-slate-200 dark:border-slate-800 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all rounded-xl text-xs font-bold">
                                                        <Plus className="w-3.5 h-3.5 mr-1" /> Bu Havuza Konu Ekle
                                                    </Button>
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </div>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={cn("py-24 flex flex-col items-center justify-center text-center px-6 rounded-[2rem]", themeColors.CARD_BG)}>
                            <ListTree className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Sonuç Bulunamadı</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm">Arama kriterinize uyan bir ders veya konu yok.</p>
                            <Button variant="link" className="text-indigo-600 mt-2 font-bold" onClick={() => openModal('subject')}>Yeni Ders Ekle</Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Yeni Ekle Modalı */}
            <Dialog open={addModal.isOpen} onOpenChange={(open) => setAddModal({ ...addModal, isOpen: open })}>
                <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-3xl sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            {addModal.type === "subject" ? <BookOpen className="w-5 h-5 text-indigo-500"/> : 
                             addModal.type === "bulk-topic" ? <ListPlus className="w-5 h-5 text-indigo-500"/> : 
                             <Target className="w-5 h-5 text-indigo-500"/>}
                            {addModal.type === "subject" ? "Yeni Ders Ekle" : 
                             addModal.type === "bulk-topic" ? "Toplu Konu Ekle" : "Yeni Konu Ekle"}
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="py-4 space-y-5">
                        {/* Type Switcher (Hızlı Geçiş) */}
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                            <button 
                                onClick={() => openModal('subject')}
                                className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all", addModal.type === 'subject' ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                            >
                                Ders Ekle
                            </button>
                            <button 
                                onClick={() => openModal('topic')}
                                className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all", addModal.type === 'topic' ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                            >
                                Konu Ekle
                            </button>
                            <button 
                                onClick={() => openModal('bulk-topic')}
                                className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all", addModal.type === 'bulk-topic' ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                            >
                                Toplu Konu
                            </button>
                        </div>

                        {/* Ders Seçimi (Sadece Konu Eklerken Çıkar) */}
                        {(addModal.type === "topic" || addModal.type === "bulk-topic") && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">İlişkilendirilecek Ders</label>
                                <select 
                                    value={selectedSubject}
                                    onChange={(e) => setSelectedSubject(e.target.value)}
                                    className={cn("w-full h-12 px-4 rounded-xl text-sm font-semibold outline-none cursor-pointer appearance-none", themeColors.INPUT_BG)}
                                    style={{ 
                                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, 
                                        backgroundRepeat: 'no-repeat', 
                                        backgroundPosition: 'right 1rem center', 
                                        backgroundSize: '1em' 
                                    }}
                                >
                                    <option value="">-- Kategorisiz Bırak (Daha Sonra Eşleşir) --</option>
                                    {allSubjects.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">
                                {addModal.type === "subject" ? "Ders Adı" : 
                                 addModal.type === "bulk-topic" ? "Konu Listesi (Virgül veya Alt Alta)" : "Konu Adı"}
                            </label>
                            
                            {addModal.type === "bulk-topic" ? (
                                <textarea
                                    autoFocus
                                    placeholder={`Örnek giriş:\nÜslü Sayılar\nKöklü Sayılar\nÇarpanlara Ayırma\nveya: Konu 1, Konu 2, Konu 3`}
                                    value={newItemName}
                                    onChange={(e) => setNewItemName(e.target.value)}
                                    className={cn("w-full min-h-[120px] p-4 rounded-xl text-sm font-medium resize-y outline-none", themeColors.INPUT_BG)}
                                />
                            ) : (
                                <Input 
                                    autoFocus
                                    placeholder={addModal.type === "subject" ? "Örn: Matematik" : "Örn: Üslü Sayılar"}
                                    value={newItemName}
                                    onChange={(e) => setNewItemName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveNew()}
                                    className={cn("h-12 rounded-xl text-lg font-semibold", themeColors.INPUT_BG)}
                                />
                            )}
                        </div>
                    </div>
                    
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setAddModal({ ...addModal, isOpen: false })} className="rounded-xl">Vazgeç</Button>
                        <Button onClick={handleSaveNew} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 px-8">Kaydet</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}