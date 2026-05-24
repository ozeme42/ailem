"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { 
    ArrowLeft, ScrollText, X, Maximize2, Minimize2, 
    BookOpen, Search, ArrowRight, Layers, FileText
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { onSummariesUpdate } from "@/lib/dataService";
import { Summary } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// --- GÖZ ALICI ARKA PLAN (Referans Koddan Alındı) ---
const MagnificentLightBackground = () => (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-slate-50">
        <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-emerald-50/60 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-50/60 rounded-full blur-[100px]" />
    </div>
);

// --- RENK TEMALARI (Sırayla değişen şık liste öğeleri için) ---
const getListItemTheme = (index: number) => {
    const themes = [
        { 
            border: 'border-2 border-emerald-100', text: 'text-emerald-800', 
            hoverBg: 'hover:bg-emerald-50', hoverBorder: 'hover:border-emerald-300', 
            iconHoverAccent: 'group-hover/card:bg-emerald-500 group-hover/card:border-emerald-500',
            badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-700'
        },
        { 
            border: 'border-2 border-indigo-100', text: 'text-indigo-800', 
            hoverBg: 'hover:bg-indigo-50', hoverBorder: 'hover:border-indigo-300', 
            iconHoverAccent: 'group-hover/card:bg-indigo-500 group-hover/card:border-indigo-500',
            badgeBg: 'bg-indigo-100', badgeText: 'text-indigo-700'
        },
        { 
            border: 'border-2 border-amber-100', text: 'text-amber-800', 
            hoverBg: 'hover:bg-amber-50', hoverBorder: 'hover:border-amber-300', 
            iconHoverAccent: 'group-hover/card:bg-amber-500 group-hover/card:border-amber-500',
            badgeBg: 'bg-amber-100', badgeText: 'text-amber-700'
        },
        { 
            border: 'border-2 border-violet-100', text: 'text-violet-800', 
            hoverBg: 'hover:bg-violet-50', hoverBorder: 'hover:border-violet-300', 
            iconHoverAccent: 'group-hover/card:bg-violet-500 group-hover/card:border-violet-500',
            badgeBg: 'bg-violet-100', badgeText: 'text-violet-700'
        },
        { 
            border: 'border-2 border-cyan-100', text: 'text-cyan-800', 
            hoverBg: 'hover:bg-cyan-50', hoverBorder: 'hover:border-cyan-300', 
            iconHoverAccent: 'group-hover/card:bg-cyan-500 group-hover/card:border-cyan-500',
            badgeBg: 'bg-cyan-100', badgeText: 'text-cyan-700'
        },
    ];
    return themes[index % themes.length];
};

// --- IFRAME HTML GENERATOR ---
const getIframeDocument = (htmlContent: string) => `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: ui-sans-serif, system-ui, sans-serif; padding: 1.5rem; color: #334155; }
        h1, h2, h3 { color: #0f172a; font-weight: 800; margin-top: 1.5em; margin-bottom: 0.5em; }
        p { line-height: 1.75; margin-bottom: 1.25em; }
        img { border-radius: 1rem; max-width: 100%; height: auto; }
        .tab-content { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    </style>
    <script>
        function showTab(tabId, buttonElement) {
            var target = document.getElementById(tabId);
            if (!target) return;
            var container = target.closest('.tab-container');
            if (!container) return;
            var contents = container.querySelectorAll('.tab-content');
            for (var i = 0; i < contents.length; i++) contents[i].style.display = 'none';
            target.style.display = 'block';
            var buttons = container.querySelectorAll('.tab-button');
            for (var i = 0; i < buttons.length; i++) {
                buttons[i].classList.remove('active', 'bg-indigo-600', 'text-white');
                buttons[i].classList.add('bg-slate-100', 'text-slate-600');
            }
            if (buttonElement) {
                buttonElement.classList.add('active', 'bg-indigo-600', 'text-white');
                buttonElement.classList.remove('bg-slate-100', 'text-slate-600');
            }
        }
    </script>
</head>
<body>
    ${htmlContent}
</body>
</html>
`;

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

    const toggleFullScreen = () => setIsFullScreen(!isFullScreen);

    React.useEffect(() => {
        if (!viewingSummary) setIsFullScreen(false);
    }, [viewingSummary]);

    return (
        <div className="flex flex-col min-h-screen font-sans text-slate-900 relative selection:bg-indigo-100">
            <MagnificentLightBackground />

            {/* HEADER */}
            <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-40">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" className="rounded-2xl hover:bg-slate-100 text-slate-500" onClick={() => router.back()}>
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                        <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20 text-white">
                            <ScrollText className="w-5 h-5" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">Ders Özetleri</h1>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-8 space-y-6 relative z-10 pb-20">
                
                {/* ARAMA VE FİLTRELEME (Referans tasarıma uygun) */}
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input 
                            placeholder="Konu veya başlık ara..." 
                            className="pl-11 h-12 bg-white border-slate-200 shadow-sm rounded-2xl focus:ring-2 focus:ring-indigo-500/20 transition-all text-base"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2 p-1.5 relative border-2 border-indigo-500/20 shadow-sm shadow-indigo-100/50 bg-white/80 backdrop-blur-md rounded-2xl">
                        <div className="flex flex-col items-center justify-center pl-2 pr-3 border-r border-indigo-100">
                            <Layers className="w-4 h-4 text-indigo-500" />
                            <span className="text-[9px] font-bold text-indigo-600 uppercase mt-0.5">Ders</span>
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1 py-1">
                            {subjects.map(subject => {
                                const isActive = selectedSubject === subject;
                                return (
                                    <button
                                        key={subject}
                                        onClick={() => setSelectedSubject(subject)}
                                        className={cn(
                                            "flex-shrink-0 px-4 py-2 rounded-xl font-bold text-xs transition-colors focus-visible:outline-none",
                                            isActive 
                                                ? "bg-indigo-600 text-white shadow-md border-2 border-indigo-600" 
                                                : "bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 border-2 border-transparent"
                                        )}
                                    >
                                        {subject}
                                    </button>
                                )
                            })}
                        </div>
                        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none rounded-r-2xl" />
                    </div>
                </div>

                {/* YENİ LİSTE TASARIMI (Birebir Referans Koddaki Gibi) */}
                <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-slate-200 shadow-sm p-4 sm:p-6">
                    <div className="flex flex-col gap-3">
                        {filteredSummaries.map((summary, index) => {
                            const theme = getListItemTheme(index);
                            return (
                                <div
                                    key={summary.id} 
                                    onClick={() => setViewingSummary(summary)}
                                    className={cn(
                                        "group/card flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-white transition-all duration-300 shadow-sm cursor-pointer",
                                        theme.border, theme.hoverBg, theme.hoverBorder,
                                        "hover:shadow-md hover:-translate-y-0.5"
                                    )}
                                >
                                    <div className="flex-1 pr-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge className={cn("px-2 py-0.5 rounded-lg border-none text-[9px] font-black uppercase tracking-widest", theme.badgeBg, theme.badgeText)}>
                                                {summary.subject}
                                            </Badge>
                                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest truncate">
                                                {summary.topic}
                                            </span>
                                        </div>
                                        <h4 className={cn("text-[15px] sm:text-[16px] font-bold leading-tight transition-colors", theme.text)}>
                                            {summary.title}
                                        </h4>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <div className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            <FileText className="w-3 h-3" /> Okumak İçin Tıkla
                                        </div>
                                        <div className={cn(
                                            "flex-shrink-0 p-2 rounded-xl bg-white border border-slate-200 text-slate-400 transition-colors duration-300 group-hover/card:text-white group-hover/card:shadow-sm",
                                            theme.iconHoverAccent
                                        )}>
                                            <ArrowRight className="h-4 w-4" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {filteredSummaries.length === 0 && !loading && (
                            <div className="py-12 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 text-center">
                                <div className="w-16 h-16 bg-white border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                                    <BookOpen className="w-8 h-8 text-slate-300" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-500">Bu kategoriye henüz içerik eklenmemiş.</h3>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* MODAL (IFRAME) GÖRÜNÜMÜ */}
            <Dialog open={!!viewingSummary} onOpenChange={(open) => !open && setViewingSummary(null)}>
                <DialogContent className={cn(
                    "flex flex-col p-0 overflow-hidden border-none shadow-2xl bg-white transition-all duration-300",
                    isFullScreen 
                        ? "w-[100vw] max-w-[100vw] h-[100dvh] max-h-[100dvh] rounded-none m-0" 
                        : "w-full max-w-4xl h-[95dvh] md:h-[90dvh] rounded-t-[2rem] md:rounded-[2rem] mt-auto md:mt-0"
                )}>
                    {/* Modal Header */}
                    <div className="p-4 md:p-6 pb-4 border-b bg-white/90 backdrop-blur-xl z-10 shrink-0 flex flex-row items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                                 <Badge className="bg-indigo-100 text-indigo-700 border-none px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest">
                                    {viewingSummary?.subject}
                                 </Badge>
                                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{viewingSummary?.topic}</span>
                            </div>
                            <DialogTitle className="text-xl md:text-2xl font-black tracking-tight text-slate-900 truncate pr-2">
                                {viewingSummary?.title}
                            </DialogTitle>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <Button variant="ghost" size="icon" onClick={toggleFullScreen} className="h-10 w-10 rounded-2xl text-slate-500 hover:bg-slate-100">
                                {isFullScreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setViewingSummary(null)} className="h-10 w-10 rounded-2xl text-slate-500 hover:bg-slate-100">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                    
                    {/* İZOLE HTML ALANI (IFRAME) */}
                    <div className="flex-1 min-h-0 bg-white flex flex-col">
                        {viewingSummary && (
                            <iframe 
                                srcDoc={getIframeDocument(viewingSummary.content)}
                                className="w-full h-full border-none flex-1"
                                title={viewingSummary.title}
                                sandbox="allow-scripts allow-same-origin"
                            />
                        )}
                    </div>

                    {/* Modal Footer */}
                    <DialogFooter className="p-4 border-t bg-slate-50 shrink-0">
                        <Button onClick={() => setViewingSummary(null)} className="w-full h-12 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-md transition-colors">
                            Okumayı Bitir ve Kapat
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}