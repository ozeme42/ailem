"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
    ArrowLeft, ListTree, Search, Filter, ChevronRight, 
    ChevronLeft, Download, FileSpreadsheet, LayoutGrid, 
    GraduationCap, BookOpen, Clock, CheckCircle2, XCircle, 
    MinusCircle, Calculator, User, ArrowUpDown, X, RotateCcw,
    BarChart3
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { onTestsUpdate, onTrackedBooksUpdate, onPracticeExamsUpdate, updateTest } from "@/lib/dataService";
import { Test, TrackedBook, FamilyMember, PracticeExam } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCategoryName } from "@/app/education/page";
import { format, parseISO, parse } from "date-fns";
import { tr } from 'date-fns/locale';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// --- DESIGN SYSTEM ---
const themeColors = {
    HEADER_BG: "bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/50 sticky top-0 z-40",
    CARD_BG: "bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-md",
    ICON_BOX: "bg-gradient-to-br from-indigo-500 to-blue-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20 text-white",
    TABLE_HEADER: "bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-widest font-black h-12 whitespace-nowrap cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none",
    TABLE_ROW: "hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors border-b border-slate-100 dark:border-slate-800/50 last:border-0 cursor-pointer",
    FILTER_SELECT: "w-full sm:w-[160px] h-10 rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs",
};

const ITEMS_PER_PAGE = 25;

// Helper to translate source types
const translateType = (type: string) => {
    switch (type) {
        case 'json': return 'Yazılı Test';
        case 'exam': return 'Deneme Sınavı';
        case 'bank': return 'Soru Bankası';
        case 'quick': return 'Hızlı Test';
        case 'mistake': return 'Yanlış Havuzu';
        case 'trackedBook': return 'Kitap Takibi';
        case 'html': return 'HTML Test';
        default: return type;
    }
};

export function ResultsClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const studentIdParam = searchParams.get('studentId');
    const { familyId, familyMembers } = useAuth();
    
    const [tests, setTests] = React.useState<Test[]>([]);
    const [practiceExams, setPracticeExams] = React.useState<PracticeExam[]>([]);
    const [trackedBooks, setTrackedBooks] = React.useState<TrackedBook[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [selectedStudent, setSelectedStudent] = React.useState<FamilyMember | null>(null);
    
    const [searchTerm, setSearchTerm] = React.useState("");
    const [filterSubject, setFilterSubject] = React.useState("all");
    const [filterTopic, setFilterTopic] = React.useState("all");
    const [filterType, setFilterType] = React.useState("all");
    const [filterSubType, setFilterSubType] = React.useState("all");
    const [filterReviewStatus, setFilterReviewStatus] = React.useState("all");
    
    const [currentPage, setCurrentPage] = React.useState(1);
    const [sortConfig, setSortConfig] = React.useState<{ key: keyof Test | '_date' | '_net' | '_successRate' | '_subjectName' | '_topicName' | 'title', direction: 'asc' | 'desc' }>({ key: '_date', direction: 'desc' });

    // Initial student selection
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
            setTests(all.filter(t => t.studentId === selectedStudent.id && (t.status === 'Sonuçlandı' || t.status === 'Değerlendirme Bekliyor')));
            setLoading(false);
        });
        const unsubBooks = onTrackedBooksUpdate(setTrackedBooks);
        const unsubExams = onPracticeExamsUpdate(setPracticeExams);
        return () => { unsubTests(); unsubBooks(); unsubExams(); };
    }, [familyId, selectedStudent]);

    // Data Processing
    const enrichedData = React.useMemo(() => {
        const allTopics = trackedBooks.flatMap(b => (b.subjects || []).flatMap(s => (s.topics || []).map(t => ({...t, subjectName: s.name}))));

        return tests.map(test => {
            const subjectName = getCategoryName(test);
            let topicName = "Genel";
            if (test.topicId) {
                topicName = allTopics.find(t => t.id === test.topicId)?.name || "Genel";
            } else if ((test as any).topic) {
                topicName = (test as any).topic;
            }

            let subTypeName = "Genel";
            if (test.sourceType === 'trackedBook' && test.sourceId) {
                const book = trackedBooks.find(b => b.id === test.sourceId);
                if (book) subTypeName = book.title;
            } else if (test.sourceType === 'exam' && test.sourceId) {
                const exam = practiceExams.find(e => e.id === test.sourceId);
                if (exam) subTypeName = exam.name;
            }

            const isCompleted = test.status === 'Sonuçlandı';
            const correct = test.correctAnswers || 0;
            const incorrect = test.incorrectAnswers || 0;
            const empty = test.emptyAnswers || 0;
            const totalQuestions = correct + incorrect + empty;
            
            const net = isCompleted ? (correct - (incorrect / 3)) : 0;
            const successRate = isCompleted && totalQuestions > 0 ? Math.max(0, (net / totalQuestions) * 100) : 0;
            
            // --- GÜÇLÜ TARİH PARSING ---
            let sortableDate = 0;
            if (test.updatedAt) {
                sortableDate = new Date(test.updatedAt).getTime();
            } else {
                try {
                    const parsed = parse(test.assignedDate, 'dd MMMM yyyy', new Date(), { locale: tr });
                    sortableDate = parsed.getTime();
                } catch (e) {
                    sortableDate = new Date(test.assignedDate).getTime() || 0;
                }
            }
            
            let dateDisplay = "Değerlendirilmedi";
            if (test.updatedAt) {
                dateDisplay = format(parseISO(test.updatedAt), 'dd.MM.yyyy HH:mm', { locale: tr });
            } else if (test.assignedDate) {
                dateDisplay = test.assignedDate;
            }

            return {
                ...test,
                _subjectName: subjectName,
                _topicName: topicName,
                _subTypeName: subTypeName,
                _net: net,
                _successRate: successRate,
                _date: sortableDate,
                _dateStr: dateDisplay,
                _translatedType: translateType(test.sourceType)
            };
        });
    }, [tests, trackedBooks]);

    // Filter Options
    const { subjectOptions, topicOptions, typeOptions, subTypeOptions, stats } = React.useMemo(() => {
        const subjects = Array.from(new Set(enrichedData.map(d => d._subjectName))).sort();
        
        const filteredForTopics = filterSubject === 'all' 
            ? enrichedData 
            : enrichedData.filter(d => d._subjectName === filterSubject);
            
        const topics = Array.from(new Set(filteredForTopics.map(d => d._topicName))).sort();
        
        const types = Array.from(new Set(enrichedData.map(d => d.sourceType))).sort();
        
        const filteredForSubTypes = filterType === 'all'
            ? enrichedData
            : enrichedData.filter(d => d.sourceType === filterType);
        const subTypes = Array.from(new Set(filteredForSubTypes.map(d => d._subTypeName))).filter(s => s !== 'Genel').sort();
        
        const getCount = (key: string, val: any) => enrichedData.filter(d => (d as any)[key] === val).length;
        
        const stats = {
            total: enrichedData.length,
            reviewed: enrichedData.filter(d => d.mistakesReviewed).length,
            unreviewed: enrichedData.filter(d => !d.mistakesReviewed).length,
            subjects: Object.fromEntries(subjects.map(s => [s, getCount('_subjectName', s)])),
            topics: Object.fromEntries(topics.map(t => [t, filteredForTopics.filter(d => d._topicName === t).length])),
            types: Object.fromEntries(types.map(t => [t, getCount('sourceType', t)])),
            subTypes: Object.fromEntries(subTypes.map(s => [s, filteredForSubTypes.filter(d => d._subTypeName === s).length]))
        };

        return {
            subjectOptions: subjects,
            topicOptions: topics,
            typeOptions: types.map(t => ({ value: t, label: translateType(t) })),
            subTypeOptions: subTypes,
            stats
        };
    }, [enrichedData, filterSubject, filterType]);

    React.useEffect(() => {
        setFilterTopic("all");
    }, [filterSubject]);

    React.useEffect(() => {
        setFilterSubType("all");
    }, [filterType]);

    const filteredAndSortedData = React.useMemo(() => {
        let data = enrichedData.filter(item => {
            const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                item._subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                item._topicName.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesSubject = filterSubject === 'all' || item._subjectName === filterSubject;
            const matchesTopic = filterTopic === 'all' || item._topicName === filterTopic;
            const matchesType = filterType === 'all' || item.sourceType === filterType;
            const matchesSubType = filterSubType === 'all' || item._subTypeName === filterSubType;
            const matchesReview = filterReviewStatus === 'all' 
                ? true 
                : filterReviewStatus === 'reviewed' 
                    ? item.mistakesReviewed 
                    : !item.mistakesReviewed;

            return matchesSearch && matchesSubject && matchesTopic && matchesType && matchesSubType && matchesReview;
        });

        data.sort((a: any, b: any) => {
            const valA = a[sortConfig.key];
            const valB = b[sortConfig.key];

            if (valA === valB) return 0;
            if (valA === null || valA === undefined) return 1;
            if (valB === null || valB === undefined) return -1;

            if (sortConfig.direction === 'asc') {
                return valA > valB ? 1 : -1;
            } else {
                return valA < valB ? 1 : -1;
            }
        });

        return data;
    }, [enrichedData, searchTerm, sortConfig, filterSubject, filterTopic, filterType, filterSubType, filterReviewStatus]);

    const paginatedData = React.useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredAndSortedData.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredAndSortedData, currentPage]);

    const totalPages = Math.ceil(filteredAndSortedData.length / ITEMS_PER_PAGE);

    const handleToggleReview = async (id: string, currentStatus?: boolean) => {
        try {
            await updateTest(id, { mistakesReviewed: !currentStatus });
        } catch (error) {
            console.error("Error updating review status:", error);
        }
    };

    const handleSort = (key: any) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const handleDownloadCSV = () => {
        const headers = ["Ders", "Konu", "Tür", "Sınav Adı", "Tarih", "Doğru", "Yanlış", "Boş", "Net", "Başarı (%)"];
        const rows = filteredAndSortedData.map(d => [
            `"${d._subjectName}"`,
            `"${d._topicName}"`,
            `"${d._translatedType}"`,
            `"${d.title.replace(/"/g, '""')}"`,
            `"${d._dateStr}"`,
            d.correctAnswers || 0,
            d.incorrectAnswers || 0,
            d.emptyAnswers || 0,
            d._net.toFixed(2),
            `"%${d._successRate.toFixed(1)}"`
        ]);
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `sonuclar-${selectedStudent?.name || 'ogrenci'}.csv`;
        link.click();
    };

    const clearFilters = () => {
        setSearchTerm("");
        setFilterSubject("all");
        setFilterTopic("all");
        setFilterType("all");
        setFilterSubType("all");
        setFilterReviewStatus("all");
        setSortConfig({ key: '_date', direction: 'desc' });
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans flex flex-col">
            <header className={themeColors.HEADER_BG}>
                <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" onClick={() => router.back()}>
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                        <div className={themeColors.ICON_BOX}>
                            <ListTree className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 leading-none">Sınav Raporlarım</h1>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Detaylı başarı analizi ve geçmiş</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                         {selectedStudent && (
                            <Link href={`/education/stats?studentId=${selectedStudent.id}`}>
                                <Button variant="outline" className="rounded-xl h-10 font-bold border-indigo-200 text-indigo-600 bg-indigo-50/50 hover:bg-indigo-600 hover:text-white transition-all">
                                    <BarChart3 className="mr-2 h-4 w-4" /> Grafiksel Analiz
                                </Button>
                            </Link>
                        )}
                        <div className="hidden sm:flex items-center gap-2 ml-4">
                            {familyMembers.filter(m => m.role.includes('Çocuk')).map(member => (
                                <button key={member.id} onClick={() => { setSelectedStudent(member); setCurrentPage(1); }} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border shrink-0", selectedStudent?.id === member.id ? "bg-indigo-600 text-white border-indigo-500 shadow-md" : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800")}>
                                    {member.name}
                                </button>
                            ))}
                        </div>
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="sm:hidden rounded-full"><User className="w-5 h-5"/></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white dark:bg-slate-900">
                                {familyMembers.filter(m => m.role.includes('Çocuk')).map(member => (
                                    <DropdownMenuItem key={member.id} onClick={() => setSelectedStudent(member)}>{member.name}</DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 space-y-6">
                
                {/* Filters & Actions Panel */}
                <div className={cn("rounded-[2rem] p-5 md:p-8 flex flex-col gap-6", themeColors.CARD_BG)}>
                    <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full lg:max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <Input placeholder="Sınav adı ara..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="pl-12 h-14 rounded-2xl bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 transition-all text-sm font-medium" />
                        </div>
                        <div className="flex flex-wrap gap-3 w-full lg:w-auto justify-end">
                            <Button variant="outline" className="rounded-2xl h-14 px-6 font-bold border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={handleDownloadCSV}>
                                <FileSpreadsheet className="mr-2 h-5 w-5 text-emerald-500" /> CSV Olarak İndir
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                        <div className="flex items-center gap-2 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mr-4">
                            <Filter className="w-4 h-4" /> Filtreler
                        </div>

                        <Select value={filterSubject} onValueChange={setFilterSubject}>
                            <SelectTrigger className={cn(themeColors.FILTER_SELECT, "h-12 rounded-xl")}>
                                <SelectValue placeholder="Ders Seçin" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-900 rounded-xl">
                                <SelectItem value="all" className="font-bold">Tüm Dersler ({stats.total})</SelectItem>
                                {subjectOptions.map(s => <SelectItem key={s} value={s}>{s} ({stats.subjects[s]})</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={filterTopic} onValueChange={setFilterTopic}>
                            <SelectTrigger className={cn(themeColors.FILTER_SELECT, "h-12 rounded-xl")}>
                                <SelectValue placeholder="Konu Seçin" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-900 rounded-xl">
                                <SelectItem value="all" className="font-bold">Tüm Konular ({filterSubject === 'all' ? stats.total : stats.subjects[filterSubject]})</SelectItem>
                                {topicOptions.map(t => <SelectItem key={t} value={t}>{t} ({stats.topics[t]})</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={filterType} onValueChange={setFilterType}>
                            <SelectTrigger className={cn(themeColors.FILTER_SELECT, "h-12 rounded-xl")}>
                                <SelectValue placeholder="Sınav Türü" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-900 rounded-xl">
                                <SelectItem value="all" className="font-bold">Tüm Türler ({stats.total})</SelectItem>
                                {typeOptions.map(t => <SelectItem key={t.value} value={t.value}>{t.label} ({stats.types[t.value]})</SelectItem>)}
                            </SelectContent>
                        </Select>

                        {subTypeOptions.length > 0 && (
                            <Select value={filterSubType} onValueChange={setFilterSubType}>
                                <SelectTrigger className={cn(themeColors.FILTER_SELECT, "h-12 rounded-xl")}>
                                    <SelectValue placeholder="Alt Kategori" />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-slate-900 rounded-xl">
                                    <SelectItem value="all" className="font-bold">Tüm Alt Kategoriler ({filterType === 'all' ? stats.total : stats.types[filterType]})</SelectItem>
                                    {subTypeOptions.map(t => <SelectItem key={t} value={t}>{t} ({stats.subTypes[t]})</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}

                        <Select value={filterReviewStatus} onValueChange={setFilterReviewStatus}>
                            <SelectTrigger className={cn(themeColors.FILTER_SELECT, "h-12 rounded-xl")}>
                                <SelectValue placeholder="İnceleme Durumu" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-900 rounded-xl">
                                <SelectItem value="all" className="font-bold">Tümü ({stats.total})</SelectItem>
                                <SelectItem value="reviewed" className="font-bold">İncelendi ({stats.reviewed})</SelectItem>
                                <SelectItem value="unreviewed" className="font-bold">İncelenmedi ({stats.unreviewed})</SelectItem>
                            </SelectContent>
                        </Select>

                        {(filterSubject !== 'all' || filterTopic !== 'all' || filterType !== 'all' || filterSubType !== 'all' || filterReviewStatus !== 'all' || searchTerm) && (
                            <Button variant="ghost" onClick={clearFilters} className="h-12 px-5 ml-auto text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl font-bold transition-colors">
                                <RotateCcw className="mr-2 w-4 h-4" /> Temizle
                            </Button>
                        )}
                    </div>
                </div>

                {/* Table View */}
                <div className={cn("rounded-[2rem] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900")}>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-b border-slate-200 dark:border-slate-800">
                                    <TableHead onClick={() => handleSort('_subjectName')} className={themeColors.TABLE_HEADER}><div className="flex items-center px-6">Ders {sortConfig.key === '_subjectName' && <ArrowUpDown className="ml-1 w-3 h-3 text-indigo-500"/>}</div></TableHead>
                                    <TableHead onClick={() => handleSort('_topicName')} className={themeColors.TABLE_HEADER}><div className="flex items-center px-6">Konu {sortConfig.key === '_topicName' && <ArrowUpDown className="ml-1 w-3 h-3 text-indigo-500"/>}</div></TableHead>
                                    <TableHead className={themeColors.TABLE_HEADER}><div className="px-6">Tür</div></TableHead>
                                    <TableHead className={themeColors.TABLE_HEADER}><div className="px-6">Alt Kategori</div></TableHead>
                                    <TableHead onClick={() => handleSort('title')} className={cn(themeColors.TABLE_HEADER, "min-w-[200px]")}><div className="flex items-center px-6">Sınav Adı {sortConfig.key === 'title' && <ArrowUpDown className="ml-1 w-3 h-3 text-indigo-500"/>}</div></TableHead>
                                    <TableHead onClick={() => handleSort('_date')} className={themeColors.TABLE_HEADER}><div className="flex items-center px-6">Tarih {sortConfig.key === '_date' && <ArrowUpDown className="ml-1 w-3 h-3 text-indigo-500"/>}</div></TableHead>
                                    <TableHead className={cn(themeColors.TABLE_HEADER, "text-center")}>D</TableHead>
                                    <TableHead className={cn(themeColors.TABLE_HEADER, "text-center")}>Y</TableHead>
                                    <TableHead className={cn(themeColors.TABLE_HEADER, "text-center")}>B</TableHead>
                                    <TableHead onClick={() => handleSort('_net')} className={cn(themeColors.TABLE_HEADER, "text-center text-indigo-600 dark:text-indigo-400")}><div className="flex items-center justify-center">Net {sortConfig.key === '_net' && <ArrowUpDown className="ml-1 w-3 h-3 text-indigo-500"/>}</div></TableHead>
                                    <TableHead onClick={() => handleSort('_successRate')} className={cn(themeColors.TABLE_HEADER, "text-center text-emerald-600 dark:text-emerald-500")}><div className="flex items-center justify-center">Başarı {sortConfig.key === '_successRate' && <ArrowUpDown className="ml-1 w-3 h-3 text-emerald-500"/>}</div></TableHead>
                                    <TableHead className={cn(themeColors.TABLE_HEADER, "text-center")}><div className="px-6">İnceleme</div></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedData.map((test) => (
                                    <TableRow key={test.id} className={cn(themeColors.TABLE_ROW, "group h-20")} onClick={() => router.push(`/education/${test.id}`)}>
                                        <TableCell className="px-6 py-4 font-black text-slate-800 dark:text-slate-200">{test._subjectName}</TableCell>
                                        <TableCell className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400">{test._topicName}</TableCell>
                                        <TableCell className="px-6 py-4">
                                            <Badge variant="outline" className="text-[10px] uppercase font-black px-2 py-1 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                                                {test._translatedType}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                                            {test._subTypeName !== 'Genel' ? test._subTypeName : '-'}
                                        </TableCell>
                                        <TableCell className="px-6 py-4 font-black text-sm text-indigo-700 dark:text-indigo-400 truncate max-w-[250px] group-hover:text-indigo-600 transition-colors">{test.title}</TableCell>
                                        <TableCell className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap font-medium">{test._dateStr}</TableCell>
                                        
                                        <TableCell className="px-6 py-4 text-center font-black text-emerald-600 dark:text-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/10">{test.status === 'Sonuçlandı' ? test.correctAnswers : '-'}</TableCell>
                                        <TableCell className="px-6 py-4 text-center font-black text-rose-600 dark:text-rose-500 bg-rose-50/30 dark:bg-rose-900/10">{test.status === 'Sonuçlandı' ? test.incorrectAnswers : '-'}</TableCell>
                                        <TableCell className="px-6 py-4 text-center font-black text-slate-400 bg-slate-50/30 dark:bg-slate-900/10">{test.status === 'Sonuçlandı' ? test.emptyAnswers : '-'}</TableCell>
                                        
                                        <TableCell className="px-6 py-4 text-center">
                                            {test.status === 'Sonuçlandı' ? (
                                                <div className="mx-auto w-fit bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-xl text-indigo-700 dark:text-indigo-300 font-black text-sm border border-indigo-100 dark:border-indigo-800 shadow-sm">
                                                    {test._net.toFixed(2)}
                                                </div>
                                            ) : (
                                                <Badge variant="outline" className="animate-pulse bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 text-[10px] font-bold px-2 py-1">Değerlendirme</Badge>
                                            )}
                                        </TableCell>

                                        <TableCell className="px-6 py-4 text-center">
                                            {test.status === 'Sonuçlandı' ? (
                                                <div className={cn(
                                                    "mx-auto w-fit px-3 py-1.5 rounded-xl font-black text-sm border shadow-sm",
                                                    test._successRate >= 75 ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" :
                                                    test._successRate >= 50 ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800" :
                                                    "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800"
                                                )}>
                                                    %{test._successRate.toFixed(1)}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 font-bold">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="px-6 py-4 text-center">
                                            {test.status === 'Sonuçlandı' && (
                                                <Button 
                                                    variant={test.mistakesReviewed ? "outline" : "default"} 
                                                    size="sm" 
                                                    onClick={(e) => { e.stopPropagation(); handleToggleReview(test.id, test.mistakesReviewed); }}
                                                    className={cn("h-8 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all", test.mistakesReviewed ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700" : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/20")}
                                                >
                                                    {test.mistakesReviewed ? "İncelendi ✓" : "Kontrol Et"}
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        {filteredAndSortedData.length === 0 && (
                            <div className="py-20 flex flex-col items-center justify-center text-center">
                                <Calculator className="h-12 w-12 text-slate-200 mb-4" />
                                <h3 className="font-bold text-slate-400">Aradığınız kriterlere uygun sonuç bulunamadı.</h3>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 py-8">
                        <Button variant="ghost" className="rounded-xl h-11" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                            <ChevronLeft className="mr-2 h-5 w-5" /> Önceki
                        </Button>
                        <div className="flex items-center gap-2 overflow-x-auto max-w-[200px] sm:max-w-none scrollbar-hide">
                            {Array.from({ length: totalPages }).map((_, i) => (
                                <button key={i} onClick={() => setCurrentPage(i + 1)} className={cn("w-10 h-10 shrink-0 rounded-xl font-bold transition-all", currentPage === i + 1 ? "bg-indigo-600 text-white shadow-lg" : "hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500")}>
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                        <Button variant="ghost" className="rounded-xl h-11" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
                            Sonraki <ChevronRight className="ml-2 h-5 w-5" />
                        </Button>
                    </div>
                )}
            </main>
        </div>
    );
}