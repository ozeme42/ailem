"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
    ArrowLeft, ListTree, Search, Filter, ChevronRight,
    ChevronLeft, FileSpreadsheet, LayoutGrid,
    GraduationCap, BookOpen, Clock, CheckCircle2, XCircle,
    MinusCircle, Calculator, User, ArrowUpDown, X, RotateCcw,
    BarChart3, ChevronUp, ChevronDown, SlidersHorizontal
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
import { format, parse } from "date-fns";
import { tr } from 'date-fns/locale';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ITEMS_PER_PAGE = 30;

const translateType = (type: string) => {
    switch (type) {
        case 'json': return 'Yazılı';
        case 'exam': return 'Deneme';
        case 'bank': return 'Soru Bankası';
        case 'quick': return 'Hızlı';
        case 'mistake': return 'Yanlış Havuzu';
        case 'trackedBook': return 'Kitap';
        case 'html': return 'HTML';
        case 'pdf': return 'PDF';
        case 'offline': return 'Fiziksel';
        default: return type;
    }
};

const typeColor = (type: string) => {
    switch (type) {
        case 'exam': return 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800';
        case 'bank': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800';
        case 'quick': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800';
        case 'mistake': return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800';
        case 'trackedBook': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
        default: return 'bg-slate-100 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    }
};

const SortIcon = ({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) => (
    <span className={cn("ml-1 inline-flex flex-col", active ? "text-indigo-500" : "text-slate-300 dark:text-slate-600")}>
        <ChevronUp className={cn("w-2.5 h-2.5 -mb-0.5", active && dir === 'asc' ? "text-indigo-500" : "")} />
        <ChevronDown className={cn("w-2.5 h-2.5", active && dir === 'desc' ? "text-indigo-500" : "")} />
    </span>
);

// ── Active Filter Chip ──────────────────────────────────────────────
const FilterChip = ({ label, value, onRemove }: { label: string; value: string; onRemove: () => void }) => (
    <span className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
        <span className="text-indigo-400 dark:text-indigo-500 font-normal">{label}:</span>
        {value}
        <button
            onClick={onRemove}
            className="ml-0.5 w-4 h-4 rounded-full flex items-center justify-center hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
        >
            <X className="w-2.5 h-2.5" />
        </button>
    </span>
);

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

    // ── Filter state ────────────────────────────────────────────────
    const [searchTerm, setSearchTerm] = React.useState("");
    const [filterSubject, setFilterSubject] = React.useState("all");
    const [filterTopic, setFilterTopic] = React.useState("all");
    const [filterType, setFilterType] = React.useState("all");
    const [filterSubType, setFilterSubType] = React.useState("all");
    const [filterReviewStatus, setFilterReviewStatus] = React.useState("all");
    const [filterPanelOpen, setFilterPanelOpen] = React.useState(false);

    const [currentPage, setCurrentPage] = React.useState(1);
    const [sortConfig, setSortConfig] = React.useState<{
        key: keyof Test | '_date' | '_net' | '_successRate' | '_subjectName' | '_topicName' | 'title';
        direction: 'asc' | 'desc';
    }>({ key: '_date', direction: 'desc' });

    const searchRef = React.useRef<HTMLInputElement>(null);

    // ── Keyboard shortcut: Cmd/Ctrl+K focuses search ────────────────
    React.useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                searchRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

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

    const enrichedData = React.useMemo(() => {
        const allTopics = trackedBooks.flatMap(b => (b.subjects || []).flatMap(s => (s.topics || []).map(t => ({ ...t, subjectName: s.name }))));

        return tests.map(test => {
            const subjectName = getCategoryName(test);
            let topicName = "Genel";
            if (test.topicId) {
                topicName = allTopics.find(t => t.id === test.topicId)?.name || "Genel";
            } else if ((test as any).topic) {
                topicName = (test as any).topic;
            }

            let subTypeName = "Genel";
            if (test.sourceType === 'trackedBook' || test.sourceType === 'bank') {
                subTypeName = test.title.split(' - ')[0] || "Genel";
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

            let sortableDate = 0;
            let dateDisplay = "—";

            if (test.updatedAt) {
                const updatedTime = new Date(test.updatedAt).getTime();
                if (!isNaN(updatedTime)) {
                    sortableDate = updatedTime;
                    dateDisplay = format(new Date(test.updatedAt), 'dd.MM.yy HH:mm', { locale: tr });
                }
            } else if (test.assignedDate) {
                const time = new Date(test.assignedDate).getTime();
                if (!isNaN(time)) {
                    sortableDate = time;
                    dateDisplay = format(new Date(test.assignedDate), 'dd.MM.yy', { locale: tr });
                } else {
                    try {
                        const parsed = parse(test.assignedDate, 'dd MMMM yyyy', new Date(), { locale: tr });
                        if (!isNaN(parsed.getTime())) sortableDate = parsed.getTime();
                        dateDisplay = test.assignedDate;
                    } catch { dateDisplay = test.assignedDate; }
                }
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
    }, [tests, trackedBooks, practiceExams]);

    const { subjectOptions, topicOptions, typeOptions, subTypeOptions, stats } = React.useMemo(() => {
        const subjects = Array.from(new Set(enrichedData.map(d => d._subjectName))).sort();
        const filteredForTopics = filterSubject === 'all' ? enrichedData : enrichedData.filter(d => d._subjectName === filterSubject);
        const topics = Array.from(new Set(filteredForTopics.map(d => d._topicName))).sort();
        const types = Array.from(new Set(enrichedData.map(d => d.sourceType))).sort();
        const filteredForSubTypes = filterType === 'all' ? enrichedData : enrichedData.filter(d => d.sourceType === filterType);
        const subTypes = Array.from(new Set(filteredForSubTypes.map(d => d._subTypeName))).filter(s => s !== 'Genel').sort();

        const stats = {
            total: enrichedData.length,
            reviewed: enrichedData.filter(d => d.mistakesReviewed).length,
            unreviewed: enrichedData.filter(d => !d.mistakesReviewed).length,
            subjects: Object.fromEntries(subjects.map(s => [s, enrichedData.filter(d => d._subjectName === s).length])),
            topics: Object.fromEntries(topics.map(t => [t, filteredForTopics.filter(d => d._topicName === t).length])),
            types: Object.fromEntries(types.map(t => [t, enrichedData.filter(d => d.sourceType === t).length])),
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

    React.useEffect(() => { setFilterTopic("all"); }, [filterSubject]);
    React.useEffect(() => { setFilterSubType("all"); }, [filterType]);

    const filteredAndSortedData = React.useMemo(() => {
        let data = enrichedData.filter(item => {
            const q = searchTerm.toLowerCase();
            const matchesSearch = !q || item.title.toLowerCase().includes(q) || item._subjectName.toLowerCase().includes(q) || item._topicName.toLowerCase().includes(q);
            const matchesSubject = filterSubject === 'all' || item._subjectName === filterSubject;
            const matchesTopic = filterTopic === 'all' || item._topicName === filterTopic;
            const matchesType = filterType === 'all' || item.sourceType === filterType;
            const matchesSubType = filterSubType === 'all' || item._subTypeName === filterSubType;
            const matchesReview = filterReviewStatus === 'all' ? true : filterReviewStatus === 'reviewed' ? item.mistakesReviewed : !item.mistakesReviewed;
            return matchesSearch && matchesSubject && matchesTopic && matchesType && matchesSubType && matchesReview;
        });

        data.sort((a: any, b: any) => {
            const valA = a[sortConfig.key], valB = b[sortConfig.key];
            if (valA === valB) return 0;
            if (valA == null) return 1;
            if (valB == null) return -1;
            return sortConfig.direction === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
        });

        return data;
    }, [enrichedData, searchTerm, sortConfig, filterSubject, filterTopic, filterType, filterSubType, filterReviewStatus]);

    const paginatedData = React.useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredAndSortedData.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredAndSortedData, currentPage]);

    const totalPages = Math.ceil(filteredAndSortedData.length / ITEMS_PER_PAGE);

    const handleToggleReview = async (id: string, currentStatus?: boolean) => {
        try { await updateTest(id, { mistakesReviewed: !currentStatus }); }
        catch (error) { console.error(error); }
    };

    const handleSort = (key: any) => {
        setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc' }));
        setCurrentPage(1);
    };

    const handleDownloadCSV = () => {
        const headers = ["Ders", "Konu", "Tür", "Sınav Adı", "Tarih", "D", "Y", "B", "Net", "Başarı"];
        const rows = filteredAndSortedData.map(d => [
            `"${d._subjectName}"`, `"${d._topicName}"`, `"${d._translatedType}"`,
            `"${d.title.replace(/"/g, '""')}"`, `"${d._dateStr}"`,
            d.correctAnswers || 0, d.incorrectAnswers || 0, d.emptyAnswers || 0,
            d._net.toFixed(2), `"%${d._successRate.toFixed(1)}"`
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `sonuclar-${selectedStudent?.name || 'ogrenci'}.csv`; a.click();
    };

    const clearFilters = () => {
        setSearchTerm(""); setFilterSubject("all"); setFilterTopic("all");
        setFilterType("all"); setFilterSubType("all"); setFilterReviewStatus("all");
        setSortConfig({ key: '_date', direction: 'desc' });
        setCurrentPage(1);
    };

    const hasActiveFilters = filterSubject !== 'all' || filterTopic !== 'all' || filterType !== 'all' || filterSubType !== 'all' || filterReviewStatus !== 'all' || !!searchTerm;

    // Count how many dropdown filters are active (excluding search)
    const activeFilterCount = [filterSubject, filterTopic, filterType, filterSubType, filterReviewStatus].filter(f => f !== 'all').length;

    const TH = ({ label, sortKey, center }: { label: string; sortKey?: string; center?: boolean }) => (
        <TableHead
            onClick={sortKey ? () => handleSort(sortKey) : undefined}
            className={cn(
                "h-9 text-[10px] uppercase tracking-widest font-black text-slate-400 dark:text-slate-500 whitespace-nowrap select-none bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800",
                sortKey && "cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors",
                center ? "text-center" : ""
            )}
        >
            <div className={cn("flex items-center gap-0.5 px-3", center && "justify-center")}>
                {label}
                {sortKey && <SortIcon active={sortConfig.key === sortKey} dir={sortConfig.direction} />}
            </div>
        </TableHead>
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">

            {/* ── HEADER ── */}
            <header className="bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/60 sticky top-0 z-40">
                <div className="max-w-screen-2xl mx-auto px-4 md:px-6 h-14 flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>

                    <div className="flex items-center gap-2.5 mr-auto">
                        <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-1.5 rounded-lg shadow-md shadow-indigo-500/20 shrink-0">
                            <ListTree className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h1 className="text-sm font-black tracking-tight text-slate-900 dark:text-slate-100 leading-none">Sınav Raporları</h1>
                            <p className="text-[10px] text-slate-400 mt-0.5 leading-none">
                                {loading ? "Yükleniyor..." : `${filteredAndSortedData.length} / ${stats.total} sonuç`}
                            </p>
                        </div>
                    </div>

                    {/* Student switcher */}
                    <div className="hidden sm:flex items-center gap-1.5">
                        {familyMembers.filter(m => m.role.includes('Çocuk')).map(member => (
                            <button
                                key={member.id}
                                onClick={() => { setSelectedStudent(member); setCurrentPage(1); }}
                                className={cn(
                                    "px-3 py-1 rounded-md text-xs font-bold transition-all border",
                                    selectedStudent?.id === member.id
                                        ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                                        : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:border-indigo-300"
                                )}
                            >
                                {member.name}
                            </button>
                        ))}
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="sm:hidden h-8 w-8 rounded-lg"><User className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white dark:bg-slate-900">
                            {familyMembers.filter(m => m.role.includes('Çocuk')).map(member => (
                                <DropdownMenuItem key={member.id} onClick={() => setSelectedStudent(member)}>{member.name}</DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {selectedStudent && (
                        <Link href={`/education/stats?studentId=${selectedStudent.id}`}>
                            <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs font-bold border-indigo-200 text-indigo-600 bg-indigo-50/50 hover:bg-indigo-600 hover:text-white transition-all shrink-0">
                                <BarChart3 className="mr-1.5 h-3.5 w-3.5" /> Grafik
                            </Button>
                        </Link>
                    )}

                    <Button size="sm" variant="outline" onClick={handleDownloadCSV} className="h-8 rounded-lg text-xs font-bold border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-600 hover:text-white transition-all shrink-0">
                        <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" /> CSV
                    </Button>
                </div>
            </header>

            {/* ── SEARCH + FILTER BAR ── */}
            <div className="bg-white dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/60 sticky top-14 z-30">
                <div className="max-w-screen-2xl mx-auto px-4 md:px-6 py-2.5">

                    {/* Top row: search + filter toggle + clear */}
                    <div className="flex items-center gap-2">
                        {/* Search with keyboard hint */}
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                            <input
                                ref={searchRef}
                                type="text"
                                placeholder="Sınav, ders veya konu ara..."
                                value={searchTerm}
                                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                className="pl-8 pr-20 h-9 w-full rounded-lg text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                            />
                            {searchTerm ? (
                                <button
                                    onClick={() => { setSearchTerm(""); setCurrentPage(1); }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            ) : (
                                <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 pointer-events-none">
                                    ⌘K
                                </kbd>
                            )}
                        </div>

                        {/* Filter toggle button */}
                        <button
                            onClick={() => setFilterPanelOpen(p => !p)}
                            className={cn(
                                "h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all",
                                filterPanelOpen || activeFilterCount > 0
                                    ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                                    : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-indigo-300 hover:text-indigo-600"
                            )}
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            <span>Filtrele</span>
                            {activeFilterCount > 0 && (
                                <span className="ml-0.5 w-4 h-4 rounded-full bg-white/25 text-white text-[10px] font-black flex items-center justify-center">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>

                        {/* Clear all — only visible when filters are active */}
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="h-9 px-3 rounded-lg text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-rose-200 dark:border-rose-900 flex items-center gap-1.5 transition-colors"
                            >
                                <RotateCcw className="w-3 h-3" />
                                <span className="hidden sm:inline">Sıfırla</span>
                            </button>
                        )}
                    </div>

                    {/* Expandable filter panel */}
                    {filterPanelOpen && (
                        <div className="mt-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-wrap gap-2">
                            {/* Ders */}
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] uppercase tracking-widest font-black text-slate-400">Ders</span>
                                <Select value={filterSubject} onValueChange={v => { setFilterSubject(v); setCurrentPage(1); }}>
                                    <SelectTrigger className="h-8 w-[160px] rounded-lg text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-medium">
                                        <SelectValue placeholder="Tüm Dersler" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-slate-900 rounded-xl text-xs">
                                        <SelectItem value="all" className="font-bold text-xs">Tüm Dersler ({stats.total})</SelectItem>
                                        {subjectOptions.map(s => (
                                            <SelectItem key={s} value={s} className="text-xs">{s} ({stats.subjects[s]})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Konu */}
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] uppercase tracking-widest font-black text-slate-400">Konu</span>
                                <Select value={filterTopic} onValueChange={v => { setFilterTopic(v); setCurrentPage(1); }}>
                                    <SelectTrigger className="h-8 w-[160px] rounded-lg text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-medium">
                                        <SelectValue placeholder="Tüm Konular" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-slate-900 rounded-xl text-xs">
                                        <SelectItem value="all" className="font-bold text-xs">Tüm Konular</SelectItem>
                                        {topicOptions.map(t => (
                                            <SelectItem key={t} value={t} className="text-xs">{t} ({stats.topics[t]})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Tür */}
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] uppercase tracking-widest font-black text-slate-400">Tür</span>
                                <Select value={filterType} onValueChange={v => { setFilterType(v); setCurrentPage(1); }}>
                                    <SelectTrigger className="h-8 w-[140px] rounded-lg text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-medium">
                                        <SelectValue placeholder="Tüm Türler" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-slate-900 rounded-xl text-xs">
                                        <SelectItem value="all" className="font-bold text-xs">Tüm Türler ({stats.total})</SelectItem>
                                        {typeOptions.map(t => (
                                            <SelectItem key={t.value} value={t.value} className="text-xs">{t.label} ({stats.types[t.value]})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Alt Kategori */}
                            {subTypeOptions.length > 0 && (
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] uppercase tracking-widest font-black text-slate-400">Alt Kategori</span>
                                    <Select value={filterSubType} onValueChange={v => { setFilterSubType(v); setCurrentPage(1); }}>
                                        <SelectTrigger className="h-8 w-[150px] rounded-lg text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-medium">
                                            <SelectValue placeholder="Tümü" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white dark:bg-slate-900 rounded-xl text-xs">
                                            <SelectItem value="all" className="font-bold text-xs">Tümü</SelectItem>
                                            {subTypeOptions.map(t => (
                                                <SelectItem key={t} value={t} className="text-xs">{t} ({stats.subTypes[t]})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* İnceleme Durumu */}
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] uppercase tracking-widest font-black text-slate-400">İnceleme</span>
                                <Select value={filterReviewStatus} onValueChange={v => { setFilterReviewStatus(v); setCurrentPage(1); }}>
                                    <SelectTrigger className="h-8 w-[150px] rounded-lg text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-medium">
                                        <SelectValue placeholder="Tümü" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-slate-900 rounded-xl text-xs">
                                        <SelectItem value="all" className="font-bold text-xs">Tümü ({stats.total})</SelectItem>
                                        <SelectItem value="reviewed" className="text-xs">✓ İncelendi ({stats.reviewed})</SelectItem>
                                        <SelectItem value="unreviewed" className="text-xs">— İncelenmedi ({stats.unreviewed})</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {/* Active filter chips (always visible when filters are on, panel closed or open) */}
                    {activeFilterCount > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {filterSubject !== 'all' && (
                                <FilterChip label="Ders" value={filterSubject} onRemove={() => { setFilterSubject('all'); setCurrentPage(1); }} />
                            )}
                            {filterTopic !== 'all' && (
                                <FilterChip label="Konu" value={filterTopic} onRemove={() => { setFilterTopic('all'); setCurrentPage(1); }} />
                            )}
                            {filterType !== 'all' && (
                                <FilterChip label="Tür" value={translateType(filterType)} onRemove={() => { setFilterType('all'); setCurrentPage(1); }} />
                            )}
                            {filterSubType !== 'all' && (
                                <FilterChip label="Alt" value={filterSubType} onRemove={() => { setFilterSubType('all'); setCurrentPage(1); }} />
                            )}
                            {filterReviewStatus !== 'all' && (
                                <FilterChip
                                    label="İnceleme"
                                    value={filterReviewStatus === 'reviewed' ? 'İncelendi' : 'İncelenmedi'}
                                    onRemove={() => { setFilterReviewStatus('all'); setCurrentPage(1); }}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── TABLE ── */}
            <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 md:px-6 py-4">
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-0">
                                    <TH label="Ders" sortKey="_subjectName" />
                                    <TH label="Konu" sortKey="_topicName" />
                                    <TH label="Tür" />
                                    <TH label="Sınav Adı" sortKey="title" />
                                    <TH label="Alt Kategori" />
                                    <TH label="Tarih" sortKey="_date" />
                                    <TH label="D" center />
                                    <TH label="Y" center />
                                    <TH label="B" center />
                                    <TH label="Net" sortKey="_net" center />
                                    <TH label="Başarı" sortKey="_successRate" center />
                                    <TH label="İnceleme" center />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedData.map((test, idx) => (
                                    <TableRow
                                        key={test.id}
                                        onClick={() => router.push(`/education/${test.id}`)}
                                        className={cn(
                                            "h-11 cursor-pointer border-b border-slate-50 dark:border-slate-800/50 last:border-0 transition-colors group",
                                            idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/50 dark:bg-slate-900/40",
                                            "hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30"
                                        )}
                                    >
                                        <TableCell className="px-3 py-2 font-bold text-xs text-slate-800 dark:text-slate-200 whitespace-nowrap">{test._subjectName}</TableCell>
                                        <TableCell className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 max-w-[120px] truncate">{test._topicName}</TableCell>
                                        <TableCell className="px-3 py-2">
                                            <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border", typeColor(test.sourceType))}>
                                                {test._translatedType}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-3 py-2 font-semibold text-xs text-indigo-700 dark:text-indigo-400 group-hover:text-indigo-600 max-w-[220px] truncate transition-colors">{test.title}</TableCell>
                                        <TableCell className="px-3 py-2 text-xs text-slate-400 truncate max-w-[120px]">
                                            {test._subTypeName !== 'Genel' ? test._subTypeName : <span className="text-slate-300 dark:text-slate-700">—</span>}
                                        </TableCell>
                                        <TableCell className="px-3 py-2 text-[11px] text-slate-400 font-mono whitespace-nowrap">{test._dateStr}</TableCell>

                                        <TableCell className="px-3 py-2 text-center text-xs font-black text-emerald-600 dark:text-emerald-500">
                                            {test.status === 'Sonuçlandı' ? test.correctAnswers ?? 0 : <span className="text-slate-300 dark:text-slate-600">—</span>}
                                        </TableCell>
                                        <TableCell className="px-3 py-2 text-center text-xs font-black text-rose-500 dark:text-rose-400">
                                            {test.status === 'Sonuçlandı' ? test.incorrectAnswers ?? 0 : <span className="text-slate-300 dark:text-slate-600">—</span>}
                                        </TableCell>
                                        <TableCell className="px-3 py-2 text-center text-xs font-black text-slate-400">
                                            {test.status === 'Sonuçlandı' ? test.emptyAnswers ?? 0 : <span className="text-slate-300 dark:text-slate-600">—</span>}
                                        </TableCell>

                                        <TableCell className="px-3 py-2 text-center">
                                            {test.status === 'Sonuçlandı' ? (
                                                <span className="inline-block bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-md text-indigo-700 dark:text-indigo-300 font-black text-xs border border-indigo-100 dark:border-indigo-900">
                                                    {test._net.toFixed(2)}
                                                </span>
                                            ) : (
                                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900 animate-pulse">Bekliyor</span>
                                            )}
                                        </TableCell>

                                        <TableCell className="px-3 py-2 text-center">
                                            {test.status === 'Sonuçlandı' ? (
                                                <span className={cn(
                                                    "inline-block px-2 py-0.5 rounded-md font-black text-xs border",
                                                    test._successRate >= 75
                                                        ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900"
                                                        : test._successRate >= 50
                                                        ? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900"
                                                        : "bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900"
                                                )}>
                                                    %{test._successRate.toFixed(1)}
                                                </span>
                                            ) : <span className="text-slate-300 dark:text-slate-700 text-xs">—</span>}
                                        </TableCell>

                                        <TableCell className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                                            {test.status === 'Sonuçlandı' && (
                                                <button
                                                    onClick={() => handleToggleReview(test.id, test.mistakesReviewed)}
                                                    className={cn(
                                                        "h-6 px-2.5 rounded text-[10px] font-bold uppercase tracking-wide transition-all border",
                                                        test.mistakesReviewed
                                                            ? "border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-500 bg-emerald-50 dark:bg-emerald-950 hover:bg-emerald-100"
                                                            : "bg-indigo-600 hover:bg-indigo-500 text-white border-transparent shadow-sm shadow-indigo-500/20"
                                                    )}
                                                >
                                                    {test.mistakesReviewed ? "✓ İncelendi" : "Kontrol Et"}
                                                </button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {filteredAndSortedData.length === 0 && !loading && (
                            <div className="py-16 flex flex-col items-center gap-3 text-center">
                                <Calculator className="h-10 w-10 text-slate-200 dark:text-slate-700" />
                                <p className="text-sm font-semibold text-slate-400">Kriterlere uygun sonuç bulunamadı.</p>
                                {hasActiveFilters && (
                                    <button onClick={clearFilters} className="text-xs text-indigo-500 hover:underline font-bold">Filtreleri sıfırla</button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── PAGINATION ── */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                            <span className="text-xs text-slate-400 font-medium">
                                {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedData.length)} / {filteredAndSortedData.length}
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="h-7 w-7 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                {Array.from({ length: Math.min(totalPages, 9) }, (_, i) => {
                                    let page: number;
                                    if (totalPages <= 9) {
                                        page = i + 1;
                                    } else if (currentPage <= 5) {
                                        page = i < 7 ? i + 1 : i === 7 ? -1 : totalPages;
                                    } else if (currentPage >= totalPages - 4) {
                                        page = i === 0 ? 1 : i === 1 ? -1 : totalPages - (8 - i);
                                    } else {
                                        const mid = [1, -1, currentPage - 1, currentPage, currentPage + 1, -2, totalPages];
                                        page = mid[i] ?? -3;
                                    }

                                    if (page < 0) return (
                                        <span key={i} className="h-7 w-7 flex items-center justify-center text-xs text-slate-400 select-none">…</span>
                                    );
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => setCurrentPage(page)}
                                            className={cn(
                                                "h-7 w-7 rounded-md text-xs font-bold transition-all",
                                                currentPage === page
                                                    ? "bg-indigo-600 text-white shadow-sm"
                                                    : "text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
                                            )}
                                        >
                                            {page}
                                        </button>
                                    );
                                })}
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="h-7 w-7 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}