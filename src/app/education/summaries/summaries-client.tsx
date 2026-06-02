
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { 
    ArrowLeft, ScrollText, X, Maximize2, Minimize2, 
    BookOpen, Search, ArrowRight, Layers, FileText,
    Ruler, TestTube2, BookCopy, Globe, MessageSquare, Gamepad2, AlertCircle, PlayCircle
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { onSummariesUpdate } from "@/lib/dataService";
import { Summary } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// --- GÖZ ALICI ARKA PLAN ---
const MagnificentLightBackground = () => (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors">
        <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-emerald-100/50 dark:bg-emerald-900/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-100/50 dark:bg-indigo-900/20 rounded-full blur-[100px]" />
    </div>
);

const getCategoryTheme = (subject: string) => {
    const themes: Record<string, { bg: string, text: string, icon: any, border: string, accent: string, gradient: string }> = {
      'Matematik': { 
          bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-400', 
          icon: Ruler, border: 'border-blue-100 dark:border-blue-900/50', accent: 'bg-blue-500',
          gradient: 'from-blue-500 to-cyan-500'
      },
      'Fen Bilimleri': { 
          bg: 'bg-teal-50 dark:bg-teal-950/40', text: 'text-teal-700 dark:text-teal-400', 
          icon: TestTube2, border: 'border-teal-100 dark:border-teal-900/50', accent: 'bg-teal-500',
          gradient: 'from-teal-500 to-emerald-500'
      },
      'Türkçe': { 
          bg: 'bg-orange-50 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-400', 
          icon: BookCopy, border: 'border-orange-100 dark:border-orange-900/50', accent: 'bg-orange-500',
          gradient: 'from-orange-500 to-amber-500'
      },
      'Sosyal Bilgiler': { 
          bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-400', 
          icon: Globe, border: 'border-purple-100 dark:border-purple-900/50', accent: 'bg-purple-500',
          gradient: 'from-purple-500 to-indigo-500'
      },
      'İngilizce': { 
          bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-400', 
          icon: MessageSquare, border: 'border-rose-100 dark:border-rose-900/50', accent: 'bg-rose-500',
          gradient: 'from-rose-500 to-pink-500'
      },
      'Diğer': { 
          bg: 'bg-slate-50 dark:bg-slate-900/40', text: 'text-slate-700 dark:text-slate-400', 
          icon: FileText, border: 'border-slate-200 dark:border-slate-800', accent: 'bg-slate-500',
          gradient: 'from-slate-500 to-gray-500'
      },
    };
    return themes[subject] || themes['Diğer'];
};

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
        @media (prefers-color-scheme: dark) {
            body { color: #cbd5e1; }
            h1, h2, h3 { color: #f8fafc; }
        }
    </style>
</head>
<body class="dark:bg-slate-950">
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
        <div className="flex flex-col min-h-screen font-sans text-slate-900 dark:text-slate-100 relative selection:bg-indigo-100">
            <MagnificentLightBackground />

            {/* HEADER - Navbar */}
            <header className="bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60 sticky top-0 z-40 transition-colors">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" className="rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400" onClick={() => router.back()}>
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                        <div className="flex items-center gap-2">
                            <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-2 rounded-lg shadow-md shadow-indigo-500/20 text-white">
                                <ScrollText className="w-4 h-4" />
                            </div>
                            <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white leading-none hidden sm:block">Kütüphane</h1>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full relative z-10 pb-20">
                
                {/* HERO SECTION - E-Learning Style */}
                <div className="bg-slate-900 dark:bg-slate-950 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
                    <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-indigo-600/30 to-transparent blur-3xl pointer-events-none" />
                    
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-20 relative z-10">
                        <div className="max-w-2xl">
                            <Badge className="bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border-none mb-4 uppercase tracking-widest text-[10px] font-black px-3 py-1">
                                Eğitim Kaynakları
                            </Badge>
                            <h1 className="text-3xl md:text-5xl font-black text-white mb-4 leading-tight">
                                Ne öğrenmek <br className="hidden md:block"/>istiyorsun?
                            </h1>
                            <p className="text-slate-400 text-sm md:text-base font-medium mb-8 max-w-lg">
                                Ders özetleri, konu tekrarları ve hızlı okuma materyalleri ile bilginizi tazeleyin.
                            </p>
                            
                            {/* SEARCH BAR */}
                            <div className="relative max-w-xl">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <Input 
                                    placeholder="Konu, ders veya başlık ara..." 
                                    className="pl-12 h-14 bg-white border-none shadow-2xl rounded-2xl focus-visible:ring-4 focus-visible:ring-indigo-500/30 text-base text-slate-900 placeholder:text-slate-400"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                    <Button className="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                                        Ara
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                    
                    {/* CATEGORY PILLS */}
                    <div className="mb-8 flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                        {subjects.map(subject => {
                            const isActive = selectedSubject === subject;
                            return (
                                <button
                                    key={subject}
                                    onClick={() => setSelectedSubject(subject)}
                                    className={cn(
                                        "flex-shrink-0 px-5 py-2.5 rounded-full font-bold text-sm transition-all duration-300 focus-visible:outline-none",
                                        isActive 
                                            ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md transform scale-105" 
                                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-sm"
                                    )}
                                >
                                    {subject}
                                </button>
                            )
                        })}
                    </div>

                    {/* COURSE GRID */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
                        {filteredSummaries.map((summary) => {
                            const theme = getCategoryTheme(summary.subject);
                            const Icon = theme.icon;
                            
                            return (
                                <div
                                    key={summary.id} 
                                    onClick={() => setViewingSummary(summary)}
                                    className="group flex flex-col bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                                >
                                    {/* Card Header Illustration */}
                                    <div className={cn("h-32 w-full relative flex items-center justify-center overflow-hidden bg-gradient-to-br", theme.gradient)}>
                                        <div className="absolute inset-0 bg-black/10" />
                                        {/* Abstract Shapes */}
                                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/20 rounded-full blur-xl" />
                                        <div className="absolute -left-4 -bottom-4 w-20 h-20 bg-black/20 rounded-full blur-xl" />
                                        
                                        <Icon className="w-16 h-16 text-white/90 relative z-10 drop-shadow-md transition-transform duration-500 group-hover:scale-110" />
                                    </div>

                                    {/* Card Content */}
                                    <div className="p-5 flex flex-col flex-1">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Badge className={cn("px-2.5 py-1 rounded-lg border-none text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800", theme.text)}>
                                                {summary.subject}
                                            </Badge>
                                        </div>
                                        
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight mb-2 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                            {summary.title}
                                        </h3>
                                        
                                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 line-clamp-1 mb-4 flex-1">
                                            {summary.topic}
                                        </p>

                                        <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 dark:text-slate-500">
                                                <ScrollText className="w-4 h-4" /> Özet
                                            </div>
                                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-colors", theme.bg, theme.text)}>
                                                <PlayCircle className="w-5 h-5" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {filteredSummaries.length === 0 && !loading && (
                        <div className="py-20 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm text-center max-w-2xl mx-auto mt-10">
                            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-500" />
                            </div>
                            <h3 className="text-lg font-black text-slate-700 dark:text-slate-200 mb-2">Sonuç Bulunamadı</h3>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Bu kategori veya arama terimine ait içerik henüz eklenmemiş.</p>
                        </div>
                    )}
                </div>
            </main>

            {/* READING MODAL */}
            <Dialog open={!!viewingSummary} onOpenChange={(open) => !open && setViewingSummary(null)}>
                <DialogContent className={cn(
                    "flex flex-col p-0 overflow-hidden border-none shadow-2xl bg-white dark:bg-slate-950 transition-all duration-300",
                    isFullScreen 
                        ? "w-[100vw] max-w-[100vw] h-[100dvh] max-h-[100dvh] rounded-none m-0" 
                        : "w-full max-w-4xl h-[95dvh] md:h-[90dvh] rounded-t-[2rem] md:rounded-[2rem] mt-auto md:mt-0"
                )}>
                    {/* Modal Header */}
                    <div className="p-4 md:p-6 pb-4 border-b border-slate-100 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl z-10 shrink-0 flex flex-row items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                                 <Badge className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-none px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest">
                                    {viewingSummary?.subject}
                                 </Badge>
                                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{viewingSummary?.topic}</span>
                            </div>
                            <DialogTitle className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white truncate pr-2">
                                {viewingSummary?.title}
                            </DialogTitle>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <Button variant="ghost" size="icon" onClick={toggleFullScreen} className="h-10 w-10 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                                {isFullScreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setViewingSummary(null)} className="h-10 w-10 rounded-full text-slate-500 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                    
                    {/* Iframe */}
                    <div className="flex-1 min-h-0 bg-white dark:bg-slate-950 flex flex-col">
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
                    <DialogFooter className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
                        <Button onClick={() => setViewingSummary(null)} className="w-full h-14 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 text-lg transition-all active:scale-[0.98]">
                            Okumayı Bitir
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
