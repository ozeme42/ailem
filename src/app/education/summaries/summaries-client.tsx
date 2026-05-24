"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { 
    ArrowLeft, BookOpen, ScrollText, ChevronRight, 
    Search, Filter, BookText, Sparkles, X, Maximize2
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { onSummariesUpdate } from "@/lib/dataService";
import { Summary } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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

    return (
        <div className={cn("min-h-screen font-sans pb-20 flex flex-col", themeColors.PAGE_BG)}>
            
            {/* Header */}
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
                
                {/* Search & Subject Chips */}
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

                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                        {subjects.map(subject => (
                            <button
                                key={subject}
                                onClick={() => setSelectedSubject(subject)}
                                className={cn(
                                    "px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
                                    selectedSubject === subject 
                                        ? "bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-500/20" 
                                        : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-emerald-300"
                                )}
                            >
                                {subject}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Summaries Grid */}
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
                                <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                    {summary.title}
                                </h3>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">{summary.topic}</p>
                            </div>
                            
                            <div className="mt-4 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Sparkles className="w-3 h-3" /> Konu Özeti
                                </span>
                                <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/30 transition-colors">
                                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredSummaries.length === 0 && !loading && (
                        <div className="col-span-full py-24 text-center">
                            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                                <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-700" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Sonuç Bulunamadı</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Farklı bir konu veya başlık aramayı deneyin.</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Content Modal */}
            <Dialog open={!!viewingSummary} onOpenChange={(open) => !open && setViewingSummary(null)}>
                <DialogContent className="max-w-4xl h-[90vh] md:h-[85vh] flex flex-col p-0 overflow-hidden rounded-t-[2.5rem] md:rounded-[2.5rem] border-none shadow-2xl bg-white dark:bg-slate-950 mt-auto">
                    <DialogHeader className="p-6 pb-4 border-b bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl sticky top-0 z-10 shrink-0">
                        <div className="flex items-center gap-3 mb-2">
                             <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 border-none">{viewingSummary?.subject}</Badge>
                             <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{viewingSummary?.topic}</span>
                        </div>
                        <DialogTitle className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">{viewingSummary?.title}</DialogTitle>
                    </DialogHeader>
                    
                    <ScrollArea className="flex-1 bg-white dark:bg-slate-950 p-6 md:p-10">
                        <div 
                            className="prose prose-slate dark:prose-invert max-w-none 
                                prose-headings:font-black prose-headings:tracking-tight
                                prose-p:leading-relaxed prose-p:text-slate-700 dark:prose-p:text-slate-300
                                prose-strong:text-slate-900 dark:prose-strong:text-white
                                prose-img:rounded-3xl prose-img:shadow-xl" 
                            dangerouslySetInnerHTML={{ __html: viewingSummary?.content || "" }} 
                        />
                        <div className="h-20" /> {/* Bottom spacing */}
                    </ScrollArea>

                    <DialogFooter className="p-4 border-t bg-slate-50 dark:bg-slate-900/50 shrink-0">
                        <Button onClick={() => setViewingSummary(null)} className="w-full h-12 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold">Kapat</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
