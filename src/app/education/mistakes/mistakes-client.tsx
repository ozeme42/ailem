"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
    ArrowLeft, AlertCircle, ChevronRight, BookOpen, 
    Layers, Search, Filter, HelpCircle, GraduationCap,
    Library, FileText, CheckCircle2, XCircle, BarChart3,
    ChevronDown, BookCopy, ListTree, TrendingUp, TrendingDown, MinusCircle,
    Eye, ExternalLink, LayoutGrid, ClipboardList, ListX, Loader2, Sparkles, Code,
    ArrowUpDown, Download, RotateCcw, X, Table as TableIcon, FileSpreadsheet,
    ChevronUp, Check, Calculator
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { onTestsUpdate, onTrackedBooksUpdate } from "@/lib/dataService";
import { Test, TrackedBook, FamilyMember, EvaluationStatus } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCategoryName } from "@/app/education/page";
import { format, parseISO, parse } from "date-fns";
import { tr } from 'date-fns/locale';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";

// --- DESIGN SYSTEM ---
const themeColors = {
    HEADER_BG: "bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/50 sticky top-0 z-40",
    CARD_BG: "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300",
    TABLE_HEADER: "bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-widest font-black h-12 whitespace-nowrap cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none",
    TABLE_ROW: "hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors border-b border-slate-100 dark:border-slate-800/50 last:border-0",
    TAB_LIST: "bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-1 rounded-xl",
};

const typeIcons: Record<string, any> = {
    json: FileText,
    exam: ClipboardList,
    bank: Library,
    quick: Sparkles,
    html: Code,
    trackedBook: BookOpen,
    mistake: AlertCircle
};

function translateType(type: string) {
    const map: Record<string, string> = {
        json: 'Yazılı Test', exam: 'Deneme Sınavı', bank: 'Soru Bankası',
        quick: 'Hızlı Test', mistake: 'Yanlış Havuzu', trackedBook: 'Kitap Takibi',
        html: 'HTML Test'
    };
    return map[type] || type;
}

type MistakeDetail = {
    id: string;
    questionNumber: string;
    studentAnswer: string | null;
    correctAnswer: string | null;
    testTitle: string;
    testId: string;
    date: string;
    dateRaw: Date;
    subject: string;
    topic: string;
    sourceType: string;
    isEmpty: boolean;
};

export function MistakesClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const studentIdParam = searchParams.get('studentId');

    const { familyId, familyMembers } = useAuth();
    
    const [tests, setTests] = React.useState<Test[]>([]);
    const [trackedBooks, setTrackedBooks] = React.useState<TrackedBook[]>([]);
    const [loading, setLoading] = React.useState(true);
    
    const [searchTerm, setSearchTerm] = React.useState("");
    const [selectedStudent, setSelectedStudent] = React.useState<FamilyMember | null>(null);
    const [groupingMode, setGroupingMode] = React.useState<'subject' | 'type'>('subject');
    const [selectedGroup, setSelectedGroup] = React.useState<string | null>(null);
    const [selectedSubGroup, setSelectedSubGroup] = React.useState<string | null>(null);
    
    const [sortConfig, setSortConfig] = React.useState<{ key: keyof MistakeDetail | 'dateRaw', direction: 'asc' | 'desc' }>({ key: 'dateRaw', direction: 'desc' });

    React.useEffect(() => {
        if (familyMembers.length > 0 && !selectedStudent) {
            const initial = studentIdParam 
                ? familyMembers.find(m => m.id === studentIdParam) 
                : familyMembers.find(m => m.role.includes('Çocuk')) || familyMembers[0];
            setSelectedStudent(initial || familyMembers[0]);
        }
    }, [familyMembers, selectedStudent, studentIdParam]);

    React.useEffect(() => {
        if (!familyId || !selectedStudent) return;
        const unsubTests = onTestsUpdate((all) => {
            setTests(all.filter(t => t.studentId === selectedStudent.id && t.status === 'Sonuçlandı'));
            setLoading(false);
        });
        const unsubBooks = onTrackedBooksUpdate(setTrackedBooks);
        return () => { unsubTests(); unsubBooks(); };
    }, [familyId, selectedStudent]);

    const allMistakesFlat = React.useMemo(() => {
        const list: MistakeDetail[] = [];
        const allTopics = trackedBooks.flatMap(b => (b.subjects || []).flatMap(s => (s.topics || []).map(t => ({...t, subjectName: s.name}))));

        tests.forEach(test => {
            const subjectName = getCategoryName(test);
            let topicName = "Genel";
            if (test.topicId) {
                topicName = allTopics.find(t => t.id === test.topicId)?.name || "Genel";
            } else if ((test as any).topic) {
                topicName = (test as any).topic;
            }

            let dateRaw = new Date();
            try { dateRaw = test.updatedAt ? parseISO(test.updatedAt) : parse(test.assignedDate, 'dd MMMM yyyy', new Date(), { locale: tr }); } catch(e) {}

            if (!test.openEnded) {
                const studentAnswers = test.studentAnswers || {};
                let effectiveAnswerKey = test.answerKey || {};
                if (test.sourceType === 'json' && Object.keys(effectiveAnswerKey).length === 0 && test.jsonQuestions) {
                    test.jsonQuestions.forEach((q, idx) => { effectiveAnswerKey[(idx + 1).toString()] = q.answer; });
                }
                Object.entries(effectiveAnswerKey).forEach(([qNum, cAns]) => {
                    const sAns = studentAnswers[qNum];
                    if (!sAns || sAns !== cAns) {
                        list.push({ 
                            id: `${test.id}_${qNum}`, 
                            questionNumber: qNum, 
                            studentAnswer: sAns || null, 
                            correctAnswer: cAns, 
                            testTitle: test.title, 
                            testId: test.id, 
                            date: test.assignedDate, 
                            dateRaw,
                            subject: subjectName, 
                            topic: topicName, 
                            sourceType: test.sourceType, 
                            isEmpty: !sAns 
                        });
                    }
                });
            } else if (test.studentTextAnswersEvaluation) {
                Object.entries(test.studentTextAnswersEvaluation).forEach(([qNum, status]) => {
                    if (status === 'incorrect' || status === 'empty') {
                        list.push({ 
                            id: `${test.id}_${qNum}`, 
                            questionNumber: qNum, 
                            studentAnswer: test.studentTextAnswers?.[qNum] || null, 
                            correctAnswer: test.answerKey?.[qNum] || "Bilinmiyor", 
                            testTitle: test.title, 
                            testId: test.id, 
                            date: test.assignedDate, 
                            dateRaw,
                            subject: subjectName, 
                            topic: topicName, 
                            sourceType: test.sourceType, 
                            isEmpty: status === 'empty' 
                        });
                    }
                });
            }
        });
        return list;
    }, [tests, trackedBooks]);

    const groups = React.useMemo(() => {
        const map: Record<string, MistakeDetail[]> = {};
        allMistakesFlat.forEach(m => {
            const key = groupingMode === 'subject' ? m.subject : translateType(m.sourceType);
            if (!map[key]) map[key] = [];
            map[key].push(m);
        });
        return map;
    }, [allMistakesFlat, groupingMode]);

    const subGroups = React.useMemo(() => {
        if (!selectedGroup) return [];
        const itemsInGroup = groups[selectedGroup] || [];
        const map: Record<string, MistakeDetail[]> = {};
        
        itemsInGroup.forEach(item => {
            const key = groupingMode === 'subject' ? item.topic : item.testTitle;
            if (!map[key]) map[key] = [];
            map[key].push(item);
        });

        return Object.entries(map)
            .map(([name, items]) => ({ name, items, count: items.length }))
            .sort((a, b) => b.count - a.count);
    }, [groups, selectedGroup, groupingMode]);

    const tableData = React.useMemo(() => {
        if (!selectedGroup) return [];
        let data = groups[selectedGroup] || [];

        if (selectedSubGroup) {
            data = data.filter(d => (groupingMode === 'subject' ? d.topic : d.testTitle) === selectedSubGroup);
        }

        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            data = data.filter(d => 
                d.testTitle.toLowerCase().includes(q) || 
                d.topic.toLowerCase().includes(q) ||
                d.subject.toLowerCase().includes(q)
            );
        }

        data.sort((a: any, b: any) => {
            const valA = a[sortConfig.key];
            const valB = b[sortConfig.key];
            if (valA === valB) return 0;
            if (sortConfig.direction === 'asc') return valA > valB ? 1 : -1;
            return valA < valB ? 1 : -1;
        });

        return data;
    }, [groups, selectedGroup, selectedSubGroup, searchTerm, sortConfig, groupingMode]);

    const handleSort = (key: any) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const handleDownloadCSV = () => {
        const headers = ["Ders", "Konu", "Sınav", "Soru No", "Senin Cevabın", "Doğru Cevap", "Tarih"];
        const rows = tableData.map(d => [
            `"${d.subject}"`, `"${d.topic}"`, `"${d.testTitle.replace(/"/g, '""')}"`, d.questionNumber, `"${d.studentAnswer || 'BOŞ'}"`, `"${d.correctAnswer}"`, `"${d.date}"`
        ]);
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `yanlislar-${selectedGroup || 'tümü'}-${selectedStudent?.name}.csv`;
        link.click();
    };

    if (loading) return <div className="flex h-screen items-center justify-center dark:bg-slate-950"><Loader2 className="animate-spin h-10 w-10 text-rose-500" /></div>;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans flex flex-col selection:bg-rose-100">
            <header className={themeColors.HEADER_BG}>
                <div className="max-w-6xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between gap-4 w-full">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" onClick={() => selectedGroup ? setSelectedGroup(null) : router.back()}>
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                        <div className={themeColors.ICON_BOX}><ListX className="w-6 h-6 text-white" /></div>
                        <div className="hidden sm:block">
                            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100 leading-none">Yanlışlarım</h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Eksik ve Hata Havuzu</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
                        {familyMembers.filter(m => m.role.includes('Çocuk')).map(member => (
                            <button 
                                key={member.id} 
                                onClick={() => { setSelectedStudent(member); setSelectedGroup(null); setSelectedSubGroup(null); }} 
                                className={cn(
                                    "px-4 py-1.5 rounded-full text-[11px] font-black transition-all border shrink-0 uppercase tracking-wider", 
                                    selectedStudent?.id === member.id ? "bg-rose-600 text-white border-rose-500 shadow-md" : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:border-rose-300"
                                )}
                            >
                                {member.name}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-6 space-y-8 pb-20">
                {!selectedGroup ? (
                    <div className="space-y-6">
                        <div className={cn("rounded-3xl p-5", themeColors.CARD_BG)}>
                            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                                <Tabs value={groupingMode} onValueChange={(v) => setGroupingMode(v as any)} className="w-full sm:w-auto">
                                    <TabsList className={themeColors.TAB_LIST}>
                                        <TabsTrigger value="subject" className="rounded-lg text-xs font-bold px-5 h-9">Ders Kartları</TabsTrigger>
                                        <TabsTrigger value="type" className="rounded-lg text-xs font-bold px-5 h-9">Sınav Türleri</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-5 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-inner">
                                    Toplam {allMistakesFlat.length} Hata Tespit Edildi
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-500">
                            {Object.entries(groups).map(([name, items]) => {
                                const Icon = groupingMode === 'type' ? (typeIcons[items[0].sourceType] || Library) : BookCopy;
                                return (
                                    <div 
                                        key={name} 
                                        onClick={() => { setSelectedGroup(name); setSelectedSubGroup(null); }}
                                        className={cn("group rounded-[2rem] p-6 cursor-pointer flex flex-col gap-6 relative overflow-hidden transition-all", themeColors.CARD_BG, "hover:border-rose-500/50 hover:shadow-2xl hover:-translate-y-1.5 active:scale-[0.98]")}
                                    >
                                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Icon className="w-24 h-24" /></div>
                                        <div className="flex items-center gap-4 relative z-10">
                                            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shrink-0", groupingMode === 'subject' ? "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400" : "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400")}>
                                                <Icon className="w-7 h-7" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 truncate pr-4">{name}</h3>
                                                <Badge className="bg-rose-500 text-white font-black px-3 py-1 rounded-xl shadow-lg shadow-rose-500/20 mt-2">{items.length} Hata</Badge>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between mt-auto relative z-10 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Analiz Et</span>
                                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-rose-500 transition-colors" />
                                        </div>
                                    </div>
                                );
                            })}
                            {allMistakesFlat.length === 0 && (
                                <div className="col-span-full py-24 text-center rounded-[3rem] border-4 border-dashed border-slate-200 dark:border-slate-800 bg-white/30 dark:bg-white/5">
                                    <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl"><CheckCircle2 className="w-10 h-10 text-emerald-500" /></div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">Mükemmel Skor!</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">Henüz hiç yanlışın yok. Sınavları çözmeye devam et!</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8 animate-in slide-in-from-right-10 duration-500">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-3">
                                    <Layers className="w-5 h-5 text-indigo-500" />
                                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">{selectedGroup} Konu Dağılımı</h3>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedSubGroup(null)} className={cn("text-[10px] font-black uppercase tracking-widest rounded-xl h-8", !selectedSubGroup ? "text-slate-300 opacity-50" : "text-rose-500 hover:bg-rose-50")}>
                                    Filtreyi Kaldır
                                </Button>
                            </div>
                            
                            <div className="flex overflow-x-auto gap-4 pb-4 px-1 scrollbar-hide -mx-2 px-2 snap-x">
                                <div 
                                    onClick={() => setSelectedSubGroup(null)}
                                    className={cn(
                                        "snap-start shrink-0 min-w-[120px] p-4 rounded-[1.5rem] border-2 transition-all cursor-pointer flex flex-col items-center justify-center text-center",
                                        !selectedSubGroup ? "bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-500/20" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 hover:border-indigo-300"
                                    )}
                                >
                                    <Sparkles className={cn("w-5 h-5 mb-2", !selectedSubGroup ? "text-indigo-200" : "text-indigo-400")} />
                                    <p className="text-xs font-black uppercase">Tümü</p>
                                    <p className="text-[10px] mt-1 font-bold opacity-70">{groups[selectedGroup].length} Hata</p>
                                </div>

                                {subGroups.map((sub, i) => {
                                    const isActive = selectedSubGroup === sub.name;
                                    return (
                                        <div 
                                            key={i}
                                            onClick={() => setSelectedSubGroup(sub.name)}
                                            className={cn(
                                                "snap-start shrink-0 min-w-[140px] max-w-[200px] p-4 rounded-[1.5rem] border-2 transition-all cursor-pointer flex flex-col justify-between",
                                                isActive ? "bg-rose-600 border-rose-600 text-white shadow-xl shadow-rose-500/20" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:border-rose-400"
                                            )}
                                        >
                                            <p className="text-xs font-black uppercase truncate mb-3" title={sub.name}>{sub.name}</p>
                                            <div className="flex items-center justify-between">
                                                <Badge className={cn("text-[9px] font-black h-5 px-1.5", isActive ? "bg-white/20 text-white" : "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400")}>{sub.count} Hata</Badge>
                                                {isActive && <Check className="w-4 h-4 text-white" />}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        <div className={cn("rounded-3xl p-4 md:p-6 space-y-4", themeColors.CARD_BG)}>
                            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                                <div className="relative w-full lg:max-w-md">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input placeholder="Tabloda ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-11 rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:bg-white transition-all shadow-inner" />
                                </div>
                                <div className="flex gap-2 w-full lg:w-auto">
                                    <Button variant="outline" className="rounded-xl h-11 font-bold flex-1 sm:flex-none border-slate-200 dark:border-slate-800 shadow-sm" onClick={handleDownloadCSV}>
                                        <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-500" /> Excel (CSV) İndir
                                    </Button>
                                    <Button variant="ghost" className="rounded-xl h-11 font-bold text-slate-500 hover:bg-slate-100" onClick={() => { setSelectedGroup(null); setSelectedSubGroup(null); }}>
                                        <X className="mr-2 h-4 w-4" /> Kapat
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className={cn("rounded-[2rem] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900")}>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent border-b border-slate-200 dark:border-slate-800 h-14">
                                            <TableHead onClick={() => handleSort('subject')} className={themeColors.TABLE_HEADER}><div className="flex items-center px-4">Ders {sortConfig.key === 'subject' && <ArrowUpDown className="ml-1 w-3 h-3 text-rose-500"/>}</div></TableHead>
                                            <TableHead onClick={() => handleSort('topic')} className={themeColors.TABLE_HEADER}><div className="flex items-center px-4">Konu {sortConfig.key === 'topic' && <ArrowUpDown className="ml-1 w-3 h-3 text-rose-500"/>}</div></TableHead>
                                            <TableHead onClick={() => handleSort('testTitle')} className={themeColors.TABLE_HEADER}><div className="flex items-center px-4">Sınav / Test {sortConfig.key === 'testTitle' && <ArrowUpDown className="ml-1 w-3 h-3 text-rose-500"/>}</div></TableHead>
                                            <TableHead onClick={() => handleSort('questionNumber')} className={cn(themeColors.TABLE_HEADER, "text-center")}><div className="flex items-center justify-center">Soru No {sortConfig.key === 'questionNumber' && <ArrowUpDown className="ml-1 w-3 h-3 text-rose-500"/>}</div></TableHead>
                                            <TableHead className={cn(themeColors.TABLE_HEADER, "text-center")}>Senin Cevabın</TableHead>
                                            <TableHead className={cn(themeColors.TABLE_HEADER, "text-center")}>Doğru Cevap</TableHead>
                                            <TableHead onClick={() => handleSort('dateRaw')} className={themeColors.TABLE_HEADER}><div className="flex items-center px-4">Tarih {sortConfig.key === 'dateRaw' && <ArrowUpDown className="ml-1 w-3 h-3 text-rose-500"/>}</div></TableHead>
                                            <TableHead className={cn(themeColors.TABLE_HEADER, "text-right pr-6")}>İşlem</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {tableData.map((m) => (
                                            <TableRow key={m.id} className={themeColors.TABLE_ROW}>
                                                <TableCell className="px-4 py-4 font-black text-[11px] text-slate-800 dark:text-slate-200 uppercase tracking-wider">{m.subject}</TableCell>
                                                <TableCell className="px-4 py-4 text-xs font-bold text-indigo-600 dark:text-indigo-400">{m.topic}</TableCell>
                                                <TableCell className="px-4 py-4 font-bold text-xs text-slate-500 dark:text-slate-400 truncate max-w-[180px]">{m.testTitle}</TableCell>
                                                <TableCell className="px-4 py-4 text-center font-black text-slate-400">{m.questionNumber}</TableCell>
                                                <TableCell className="px-4 py-4 text-center">
                                                    <div className={cn("inline-flex items-center justify-center w-8 h-8 rounded-lg font-black text-sm", m.isEmpty ? "bg-slate-100 text-slate-400" : "bg-rose-50 text-rose-600 border border-rose-100")}>
                                                        {m.studentAnswer || "B"}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-4 py-4 text-center">
                                                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 font-black text-sm shadow-sm">
                                                        {m.correctAnswer}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-4 py-4 text-[10px] text-slate-400 font-mono whitespace-nowrap">{m._dateStr || m.date}</TableCell>
                                                <TableCell className="px-4 py-4 text-right pr-6">
                                                    <Link href={`/education/${m.testId}`}>
                                                        <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all">
                                                            <ChevronRight className="w-5 h-5"/>
                                                        </Button>
                                                    </Link>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {tableData.length === 0 && (
                                    <div className="py-20 flex flex-col items-center justify-center text-center">
                                        <Calculator className="h-12 w-12 text-slate-200 mb-4" />
                                        <h3 className="font-bold text-slate-400">Bu filtreye uygun kayıt bulunamadı.</h3>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
