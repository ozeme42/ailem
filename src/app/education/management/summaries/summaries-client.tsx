"use client";

import * as React from "react";
import Link from "next/link";
import { 
    ArrowLeft, Plus, Search, Trash2, Edit, Save, X, 
    ScrollText, BookOpen, ChevronRight, FileText, LayoutGrid,
    Loader2, AlertCircle, Eye
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { 
    onSummariesUpdate, addSummary, updateSummary, deleteSummary,
    onSubjectsUpdate, onTopicsUpdate
} from "@/lib/dataService";
import { Summary } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { 
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, 
    AlertDialogTitle, AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Combobox } from "@/components/ui/combobox";

// --- DESIGN SYSTEM ---
const themeColors = {
    HEADER_BG: "bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/50 sticky top-0 z-40",
    CARD_BG: "bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-md transition-all duration-300",
    ICON_BOX: "bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 rounded-xl shadow-lg shadow-emerald-500/20 text-white",
    INPUT_BG: "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:border-indigo-500 transition-all",
    TABLE_ROW: "hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors border-b border-slate-100 dark:border-slate-800/50 last:border-0",
};

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

    // Form states
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
        } else {
            setEditingSummary(null);
            setFormTitle("");
            setFormSubject("");
            setFormTopic("");
            setFormContent("");
        }
        setIsFormOpen(true);
    };

    const handleSave = async () => {
        if (!formTitle.trim() || !formSubject.trim() || !formContent.trim()) {
            toast({ title: "Eksik Bilgi", description: "Lütfen başlık, ders ve içerik alanlarını doldurun.", variant: "destructive" });
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
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Özeti Sil?</AlertDialogTitle>
                                                    <AlertDialogDescription>"{summary.title}" özeti kalıcı olarak silinecektir.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Vazgeç</AlertDialogCancel>
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
                                <div className="text-sm text-slate-500 line-clamp-3 overflow-hidden" dangerouslySetInnerHTML={{ __html: summary.content.replace(/<[^>]*>?/gm, '') }} />
                            </CardContent>
                            <CardFooter className="pt-0">
                                <Button variant="secondary" className="w-full rounded-xl" onClick={() => { setEditingSummary(summary); setFormContent(summary.content); setIsPreviewOpen(true); }}>
                                    <Eye className="w-4 h-4 mr-2" /> İçeriği Gör
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}

                    {filteredSummaries.length === 0 && !loading && (
                        <div className="col-span-full py-20 text-center">
                            <ScrollText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500 font-medium">Henüz özet bulunamadı.</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Form Dialog */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0 overflow-hidden rounded-3xl">
                    <DialogHeader className="p-6 border-b">
                        <DialogTitle>{editingSummary ? "Özeti Düzenle" : "Yeni Özet Ekle"}</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="flex-1 p-6">
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-slate-500">Başlık</label>
                                    <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Örn: Newton Yasaları" className={themeColors.INPUT_BG} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-slate-500">Ders</label>
                                    <Combobox 
                                        options={allSubjects.map(s => ({label:s, value:s}))} 
                                        value={formSubject} 
                                        onChange={setFormSubject} 
                                        placeholder="Ders seç..." 
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500">Konu</label>
                                <Combobox 
                                    options={allTopics.map(t => ({label:t, value:t}))} 
                                    value={formTopic} 
                                    onChange={setFormTopic} 
                                    placeholder="Konu seç..." 
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold uppercase text-slate-500">HTML İçerik</label>
                                    <Button variant="link" size="sm" onClick={() => setIsPreviewOpen(true)}>Önizleme</Button>
                                </div>
                                <Textarea 
                                    value={formContent} 
                                    onChange={e => setFormContent(e.target.value)} 
                                    placeholder="HTML kodlarını buraya yapıştırın..." 
                                    className={cn("min-h-[300px] font-mono text-xs", themeColors.INPUT_BG)} 
                                />
                            </div>
                        </div>
                    </ScrollArea>
                    <DialogFooter className="p-6 border-t gap-2">
                        <Button variant="ghost" onClick={() => setIsFormOpen(false)}>Vazgeç</Button>
                        <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">Kaydet</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Preview Dialog */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden rounded-3xl">
                    <DialogHeader className="p-6 border-b flex flex-row items-center justify-between">
                        <DialogTitle>İçerik Önizleme</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="flex-1 bg-white p-8">
                        <div className="prose max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: formContent }} />
                    </ScrollArea>
                    <DialogFooter className="p-4 border-t">
                        <Button onClick={() => setIsPreviewOpen(false)}>Kapat</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
