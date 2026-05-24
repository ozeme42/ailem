"use client";

import * as React from "react";
import Link from "next/link";
import { 
    ArrowLeft, BookOpen, Plus, Search, Trash2, Edit, Save, X, 
    Layers, BookCopy, ChevronRight, GraduationCap, Check, HelpCircle,
    Loader2
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { onSubjectsUpdate, onTopicsUpdate, updateSubjects, updateTopics } from "@/lib/dataService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { 
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, 
    AlertDialogTitle, AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

// --- DESIGN SYSTEM: Premium Dark Theme ---
const themeColors = {
    HEADER_BG: "bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/50 sticky top-0 z-40",
    CARD_BG: "bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-md transition-all duration-300",
    ICON_BOX: "bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20 text-white",
    INPUT_BG: "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:border-indigo-500 transition-all",
    TABLE_ROW: "hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors border-b border-slate-100 dark:border-slate-800/50 last:border-0",
};

export function SubjectsClient() {
    const { familyId } = useAuth();
    const { toast } = useToast();
    
    const [allSubjects, setAllSubjects] = React.useState<string[]>([]);
    const [allTopics, setAllTopics] = React.useState<string[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [searchTerm, setSearchTerm] = React.useState("");
    const [activeTab, setActiveTab] = React.useState<"subjects" | "topics">("subjects");

    const [editingItem, setEditingItem] = React.useState<{ original: string, current: string } | null>(null);
    const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
    const [newItemName, setNewItemName] = React.useState("");

    React.useEffect(() => {
        if (!familyId) return;
        const unsubS = onSubjectsUpdate(setAllSubjects);
        const unsubT = onTopicsUpdate((topics) => {
            setAllTopics(topics);
            setLoading(false);
        });
        return () => { unsubS(); unsubT(); };
    }, [familyId]);

    const filteredItems = React.useMemo(() => {
        const source = activeTab === "subjects" ? allSubjects : allTopics;
        return source
            .filter(item => item.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => a.localeCompare(b, 'tr'));
    }, [allSubjects, allTopics, activeTab, searchTerm]);

    const handleSaveNew = async () => {
        if (!newItemName.trim()) return;
        const name = newItemName.trim();
        try {
            if (activeTab === "subjects") {
                if (allSubjects.includes(name)) throw new Error("Bu ders zaten mevcut.");
                await updateSubjects([...allSubjects, name]);
                toast({ title: "Ders Eklendi ✅" });
            } else {
                if (allTopics.includes(name)) throw new Error("Bu konu zaten mevcut.");
                await updateTopics([...allTopics, name]);
                toast({ title: "Konu Eklendi ✅" });
            }
            setIsAddDialogOpen(false);
            setNewItemName("");
        } catch (e: any) {
            toast({ title: "Hata", description: e.message, variant: "destructive" });
        }
    };

    const handleUpdateItem = async () => {
        if (!editingItem || !editingItem.current.trim()) return;
        const { original, current } = editingItem;
        if (original === current) { setEditingItem(null); return; }

        try {
            if (activeTab === "subjects") {
                const newList = allSubjects.map(s => s === original ? current : s);
                await updateSubjects(newList);
                toast({ title: "Ders Güncellendi ✨" });
            } else {
                const newList = allTopics.map(t => t === original ? current : t);
                await updateTopics(newList);
                toast({ title: "Konu Güncellendi ✨" });
            }
            setEditingItem(null);
        } catch (e) {
            toast({ title: "Hata", variant: "destructive" });
        }
    };

    const handleDeleteItem = async (name: string) => {
        try {
            if (activeTab === "subjects") {
                const newList = allSubjects.filter(s => s !== name);
                await updateSubjects(newList);
                toast({ title: "Ders Silindi 🗑️" });
            } else {
                const newList = allTopics.filter(t => t !== name);
                await updateTopics(newList);
                toast({ title: "Konu Silindi 🗑️" });
            }
        } catch (e) {
            toast({ title: "Hata", variant: "destructive" });
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans flex flex-col">
            {/* Header */}
            <header className={themeColors.HEADER_BG}>
                <div className="max-w-5xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/education/management">
                            <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400">
                                <ArrowLeft className="h-6 w-6" />
                            </Button>
                        </Link>
                        <div className={themeColors.ICON_BOX}>
                            <BookOpen className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 leading-none">Müfredat Yönetimi</h1>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Ders ve konu tanımlarını düzenle</p>
                        </div>
                    </div>
                    <Button onClick={() => setIsAddDialogOpen(true)} className="rounded-xl h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-500/20">
                        <Plus className="mr-2 h-5 w-5" /> <span className="hidden sm:inline">{activeTab === "subjects" ? "Ders" : "Konu"} Ekle</span>
                    </Button>
                </div>
            </header>

            <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-6 space-y-6">
                
                {/* İstatistik ve Arama Kartı */}
                <div className={cn("rounded-3xl p-4 md:p-6", themeColors.CARD_BG)}>
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full md:w-auto">
                            <TabsList className="bg-slate-100 dark:bg-slate-950/50 p-1 h-11 rounded-xl w-full grid grid-cols-2">
                                <TabsTrigger value="subjects" className="rounded-lg text-sm font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-indigo-600">
                                    Dersler ({allSubjects.length})
                                </TabsTrigger>
                                <TabsTrigger value="topics" className="rounded-lg text-sm font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-indigo-600">
                                    Konular ({allTopics.length})
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <div className="relative w-full md:max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input 
                                placeholder={`${activeTab === "subjects" ? "Ders" : "Konu"} ara...`} 
                                className={cn("pl-10 h-11 rounded-xl", themeColors.INPUT_BG)}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Liste Alanı */}
                <div className={cn("rounded-3xl overflow-hidden", themeColors.CARD_BG)}>
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-3">
                            <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                            <p className="text-sm font-medium text-slate-500">Yükleniyor...</p>
                        </div>
                    ) : filteredItems.length > 0 ? (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {filteredItems.map((item, index) => (
                                <div key={item} className={cn("flex items-center justify-between p-4 px-6 group", themeColors.TABLE_ROW)}>
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                                            {index + 1}
                                        </div>
                                        {editingItem?.original === item ? (
                                            <Input 
                                                autoFocus
                                                value={editingItem.current}
                                                onChange={(e) => setEditingItem({ ...editingItem, current: e.target.value })}
                                                onKeyDown={(e) => e.key === 'Enter' && handleUpdateItem()}
                                                className="h-10 max-w-sm bg-white dark:bg-slate-900 border-indigo-500 ring-2 ring-indigo-500/10"
                                            />
                                        ) : (
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800 dark:text-slate-100">{item}</span>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{activeTab === "subjects" ? "Ders" : "Eğitim Konusu"}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1">
                                        {editingItem?.original === item ? (
                                            <>
                                                <Button size="icon" variant="ghost" className="h-9 w-9 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10" onClick={handleUpdateItem}>
                                                    <Check className="h-5 w-5" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-9 w-9 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setEditingItem(null)}>
                                                    <X className="h-5 w-5" />
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <Button size="icon" variant="ghost" className="h-9 w-9 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setEditingItem({ original: item, current: item })}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button size="icon" variant="ghost" className="h-9 w-9 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-3xl">
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Kaydı Sil</AlertDialogTitle>
                                                            <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
                                                                "{item}" kaydını listeden silmek istediğinizden emin misiniz? Bu işlem mevcut verileri silmez ancak seçim listelerinden kaldırır.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel className="bg-slate-100 dark:bg-slate-800 border-none rounded-xl">İptal</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteItem(item)} className="bg-rose-600 hover:bg-rose-700 text-white border-none rounded-xl">Evet, Sil</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-24 flex flex-col items-center justify-center text-center px-6">
                            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                                <Layers className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Sonuç Bulunamadı</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xs leading-relaxed">
                                Aradığınız kriterlere uygun bir {activeTab === "subjects" ? "ders" : "konu"} mevcut değil.
                            </p>
                            <Button variant="link" className="text-indigo-600 mt-4 font-bold" onClick={() => setIsAddDialogOpen(true)}>
                                İlk Kaydı Ekle
                            </Button>
                        </div>
                    )}
                </div>
            </main>

            {/* Yeni Ekle Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-3xl sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Yeni {activeTab === "subjects" ? "Ders" : "Konu"} Ekle</DialogTitle>
                    </DialogHeader>
                    <div className="py-6 space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Başlık</label>
                            <Input 
                                autoFocus
                                placeholder={activeTab === "subjects" ? "Örn: Matematik" : "Örn: Üslü Sayılar"}
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveNew()}
                                className={cn("h-12 rounded-xl text-lg", themeColors.INPUT_BG)}
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)} className="rounded-xl">Vazgeç</Button>
                        <Button onClick={handleSaveNew} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 px-8">Kaydet</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}