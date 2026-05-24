
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { 
    ArrowLeft, BookOpen, ScrollText, ChevronRight, 
    Search, Filter, BookText, Sparkles, X, Maximize2, Minimize2 
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { onSummariesUpdate } from "@/lib/dataService";
import { Summary } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// --- DESIGN SYSTEM ---
const themeColors = {
    PAGE_BG: "bg-slate-50 dark:bg-slate-950",
    HEADER_BG: "bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/50 sticky top-0 z-40",
    CARD_BG: "bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all rounded-3xl overflow-hidden",
    ICON_BOX: "bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 rounded-xl shadow-lg shadow-emerald-500/20 text-white",
    INPUT_BG: "bg-slate-100 dark:bg-slate-900 border-transparent focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-emerald-500/20 rounded-2xl h-12 transition-all",
};

export function SummariesViewerClient() {
    const router = useRouter();
    const { familyId } = useAuth();
    
    const [summaries, setSummaries] = React.useState<Summary[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [searchTerm, setSearchTerm] = React.useState("");
    const [selectedSubject, setSelectedSubject] = React.useState<string>("Tümü");
    const [viewingSummary, setViewingSummary] = React.useState<Summary | null>(null);
    const [isFullScreen, setIsFullScreen] = React.useState(false);

    React.useEffect(() => {
        if (!familyId) return;
        const unsub = onSummariesUpdate((all) => {
            setSummaries(all);
            setLoading(false);
        });
        return () => unsub();
    }, [familyId]);

    const subjects = React.useMemo(() => {
        const unique = new Set(summaries.map(s => s.subject));
        return ["Tümü", ...Array.from(unique).sort()];
    }, [summaries]);

    const filteredSummaries = React.useMemo(() => {
        return summaries.filter(s => {
            const matchesSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                s.topic.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesSubject = selectedSubject === "Tümü" || s.subject === selectedSubject;
            return matchesSearch && matchesSubject;
        });
    }, [summaries, searchTerm, selectedSubject]);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => {
                setIsFullScreen(true);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullScreen(false);
            }
        }
    };

    React.useEffect(() => {
        const handleFsChange = () => setIsFullScreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, []);

    return (
        <div className={cn("min-h-screen font-sans pb-20 flex flex-col", themeColors.PAGE_BG)}>
            <header className={themeColors.HEADER_BG}>
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400">
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                        <div className={themeColors.ICON_BOX}>
                            <ScrollText className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 leading-none">Ders Özetleri</h1>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-6 space-y-6">
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input 
                            placeholder="Konu veya başlık ara..." 
                            className={themeColors.INPUT_BG}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {subjects.map(subject => (
                            <button
                                key={subject}
                                onClick={() => setSelectedSubject(subject)}
                                className={cn(
                                    "px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
                                    selectedSubject === subject 
                                        ? "bg-emerald-600 text-white border-emerald-500 shadow-md" 
                                        : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                                )}
                            >
                                {subject}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                    {filteredSummaries.map((summary) => (
                        <div 
                            key={summary.id} 
                            onClick={() => setViewingSummary(summary)}
                            className={cn("group cursor-pointer p-5 flex flex-col justify-between min-h-[160px]", themeColors.CARD_BG)}
                        >
                            <div>
                                <div className="flex justify-between items-start mb-3">
                                    <Badge variant="secondary" className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                        {summary.subject}
                                    </Badge>
                                    <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-xl group-hover:scale-110 transition-transform">
                                        <BookText className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                    </div>
                                </div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight group-hover:text-emerald-600 transition-colors">
                                    {summary.title}
                                </h3>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">{summary.topic}</p>
                            </div>
                            <div className="mt-4 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Sparkles className="w-3 h-3" /> Konu Özeti
                                </span>
                                <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredSummaries.length === 0 && !loading && (
                        <div className="col-span-full py-24 text-center">
                            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6">
                                <BookOpen className="w-10 h-10 text-slate-300" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Sonuç Bulunamadı</h3>
                        </div>
                    )}
                </div>
            </main>

            <Dialog open={!!viewingSummary} onOpenChange={(open) => !open && setViewingSummary(null)}>
                <DialogContent className={cn(
                    "flex flex-col p-0 overflow-hidden border-none shadow-2xl bg-white dark:bg-slate-950 transition-all duration-300",
                    isFullScreen 
                        ? "fixed inset-0 w-screen h-screen max-w-none rounded-none z-[100]" 
                        : "max-w-4xl h-[95vh] md:h-[90vh] rounded-t-[2.5rem] md:rounded-[2.5rem] mt-auto md:mt-0"
                )}>
                    <div className="p-6 pb-4 border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl sticky top-0 z-10 shrink-0 flex flex-row items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                                 <Badge className="bg-emerald-600 text-white border-none px-2 py-0 h-5 text-[10px]">{viewingSummary?.subject}</Badge>
                                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{viewingSummary?.topic}</span>
                            </div>
                            <DialogTitle className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white truncate">
                                {viewingSummary?.title}
                            </DialogTitle>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <Button variant="ghost" size="icon" onClick={toggleFullScreen} className="h-10 w-10 rounded-full text-slate-500">
                                {isFullScreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setViewingSummary(null)} className="h-10 w-10 rounded-full text-slate-500">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                    
                    <ScrollArea className="flex-1 bg-white dark:bg-slate-950 p-6 md:p-12">
                        <div 
                            className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-black prose-p:leading-relaxed prose-img:rounded-3xl" 
                            dangerouslySetInnerHTML={{ __html: viewingSummary?.content || "" }} 
                        />
                        <div className="h-24" />
                    </ScrollArea>

                    <DialogFooter className="p-4 border-t bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                        <Button onClick={() => setViewingSummary(null)} className="w-full h-12 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold">
                            Okumayı Bitir ve Kapat
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
