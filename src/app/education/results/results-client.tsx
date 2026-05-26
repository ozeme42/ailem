
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
    ArrowLeft, ListTree, Search, Filter, ChevronRight, 
    ChevronLeft, Download, FileSpreadsheet, LayoutGrid, 
    GraduationCap, BookOpen, Clock, CheckCircle2, XCircle, 
    MinusCircle, Calculator, User, ArrowUpDown
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { onTestsUpdate, onTrackedBooksUpdate } from "@/lib/dataService";
import { Test, TrackedBook, FamilyMember } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCategoryName } from "@/app/education/page";
import { format, parseISO } from "date-fns";
import { tr } from 'date-fns/locale';

// --- DESIGN SYSTEM ---
const themeColors = {
    HEADER_BG: "bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/50 sticky top-0 z-40",
    CARD_BG: "bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-md",
    ICON_BOX: "bg-gradient-to-br from-indigo-500 to-blue-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20 text-white",
    TABLE_HEADER: "bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-widest font-black h-12 whitespace-nowrap",
    TABLE_ROW: "hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors border-b border-slate-100 dark:border-slate-800/50 last:border-0 cursor-pointer",
};

const ITEMS_PER_PAGE = 25;

export function ResultsClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const studentIdParam = searchParams.get('studentId');
    const { familyId, familyMembers } = useAuth();
    
    const [tests, setTests] = React.useState<Test[]>([]);
    const [trackedBooks, setTrackedBooks] = React.useState<TrackedBook[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [selectedStudent, setSelectedStudent] = React.useState<FamilyMember | null>(null);
    
    const [searchTerm, setSearchTerm] = React.useState("");
    const [currentPage, setCurrentPage] = React.useState(1);
    const [sortConfig, setSortKey] = React.useState<{ key: keyof Test | '_date' | '_net', direction: 'asc' | 'desc' }>({ key: '_date', direction: 'desc' });

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
        return () => { unsubTests(); unsubBooks(); };
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

            const isCompleted = test.status === 'Sonuçlandı';
            const correct = test.correctAnswers || 0;
            const incorrect = test.incorrectAnswers || 0;
            const empty = test.emptyAnswers || 0;
            
            // 3 Yanlış 1 Doğruyu Götürür (LGS/YKS Standard)
            const net = isCompleted ? (correct - (incorrect / 3)) : 0;
            const sortableDate = test.updatedAt ? new Date(test.updatedAt).getTime() : new Date(test.assignedDate).getTime();

            return {
                ...test,
                _subjectName: subjectName,
                _topicName: topicName,
                _net: net,
                _date: sortableDate,
                _dateStr: test.updatedAt ? format(parseISO(test.updatedAt), 'dd.MM.yyyy HH:mm', { locale: tr }) : "Puanlanmadı"
            };
        });
    }, [tests, trackedBooks]);

    const filteredAndSortedData = React.useMemo(() => {
        let data = enrichedData.filter(item => 
            item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item._subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item._topicName.toLowerCase().includes(searchTerm.toLowerCase())
        );

        data.sort((a: any, b: any) => {
            const valA = a[sortConfig.key];
            const valB = b[sortConfig.key];
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return data;
    }, [enrichedData, searchTerm, sortConfig]);

    const paginatedData = React.useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredAndSortedData.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredAndSortedData, currentPage]);

    const totalPages = Math.ceil(filteredAndSortedData.length / ITEMS_PER_PAGE);

    const handleSort = (key: any) => {
        setSortKey(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const handleDownloadCSV = () => {
        const headers = ["Ders", "Konu", "Tür", "Sınav Adı", "Tarih", "Doğru", "Yanlış", "Boş", "Net"];
        const rows = filteredAndSortedData.map(d => [
            d._subjectName,
            d._topicName,
            d.sourceType,
            d.title,
            d._dateStr,
            d.correctAnswers || 0,
            d.incorrectAnswers || 0,
            d.emptyAnswers || 0,
            d._net.toFixed(2)
        ]);
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `sonuclar-${selectedStudent?.name || 'ogrenci'}.csv`;
        link.click();
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
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Excel tablosu görünümü</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {familyMembers.filter(m => m.role.includes('Çocuk')).map(member => (
                            <button key={member.id} onClick={() => { setSelectedStudent(member); setCurrentPage(1); }} className={cn("hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border shrink-0", selectedStudent?.id === member.id ? "bg-indigo-600 text-white border-indigo-500 shadow-md" : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800")}>
                                {member.name}
                            </button>
                        ))}
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
                
                {/* Filters & Actions */}
                <div className={cn("rounded-3xl p-4 md:p-5 flex flex-col md:flex-row items-center justify-between gap-4", themeColors.CARD_BG)}>
                    <div className="relative w-full md:max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input placeholder="Ders, konu veya sınav adı ile ara..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="pl-10 h-11 rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:bg-white transition-all" />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <Button variant="outline" className="flex-1 md:flex-none rounded-xl h-11 font-bold border-slate-200 dark:border-slate-800" onClick={handleDownloadCSV}>
                            <Download className="mr-2 h-4 w-4" /> CSV İndir
                        </Button>
                    </div>
                </div>

                {/* Table View */}
                <div className={cn("rounded-[2rem] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900")}>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-b border-slate-200 dark:border-slate-800">
                                    <TableHead onClick={() => handleSort('_subjectName')} className={themeColors.TABLE_HEADER}><div className="flex items-center px-4">Ders <ArrowUpDown className="ml-1 w-3 h-3 opacity-30"/></div></TableHead>
                                    <TableHead onClick={() => handleSort('_topicName')} className={themeColors.TABLE_HEADER}><div className="flex items-center px-4">Konu <ArrowUpDown className="ml-1 w-3 h-3 opacity-30"/></div></TableHead>
                                    <TableHead className={themeColors.TABLE_HEADER}><div className="px-4">Tür</div></TableHead>
                                    <TableHead onClick={() => handleSort('title')} className={cn(themeColors.TABLE_HEADER, "min-w-[200px]")}><div className="flex items-center px-4">Sınav Adı <ArrowUpDown className="ml-1 w-3 h-3 opacity-30"/></div></TableHead>
                                    <TableHead onClick={() => handleSort('_date')} className={themeColors.TABLE_HEADER}><div className="flex items-center px-4">Tarih <ArrowUpDown className="ml-1 w-3 h-3 opacity-30"/></div></TableHead>
                                    <TableHead className={cn(themeColors.TABLE_HEADER, "text-center")}>D</TableHead>
                                    <TableHead className={cn(themeColors.TABLE_HEADER, "text-center")}>Y</TableHead>
                                    <TableHead className={cn(themeColors.TABLE_HEADER, "text-center")}>B</TableHead>
                                    <TableHead onClick={() => handleSort('_net')} className={cn(themeColors.TABLE_HEADER, "text-center text-indigo-600 dark:text-indigo-400")}><div className="flex items-center justify-center">Net <ArrowUpDown className="ml-1 w-3 h-3 opacity-30"/></div></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedData.map((test) => (
                                    <TableRow key={test.id} className={themeColors.TABLE_ROW} onClick={() => router.push(`/education/${test.id}`)}>
                                        <TableCell className="px-4 py-4 font-bold text-slate-800 dark:text-slate-200">{test._subjectName}</TableCell>
                                        <TableCell className="px-4 py-4 text-xs font-semibold text-slate-500">{test._topicName}</TableCell>
                                        <TableCell className="px-4 py-4">
                                            <Badge variant="outline" className="text-[9px] uppercase font-black px-1.5 py-0 border-slate-200 dark:border-slate-800">{test.sourceType}</Badge>
                                        </TableCell>
                                        <TableCell className="px-4 py-4 font-black text-sm text-indigo-700 dark:text-indigo-300 truncate max-w-[250px]">{test.title}</TableCell>
                                        <TableCell className="px-4 py-4 text-xs text-slate-400 font-mono whitespace-nowrap">{test._dateStr}</TableCell>
                                        
                                        <TableCell className="px-4 py-4 text-center font-black text-emerald-600">{test.status === 'Sonuçlandı' ? test.correctAnswers : '-'}</TableCell>
                                        <TableCell className="px-4 py-4 text-center font-black text-rose-600">{test.status === 'Sonuçlandı' ? test.incorrectAnswers : '-'}</TableCell>
                                        <TableCell className="px-4 py-4 text-center font-black text-slate-400">{test.status === 'Sonuçlandı' ? test.emptyAnswers : '-'}</TableCell>
                                        
                                        <TableCell className="px-4 py-4 text-center">
                                            {test.status === 'Sonuçlandı' ? (
                                                <div className="bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-lg text-indigo-700 dark:text-indigo-300 font-black text-sm border border-indigo-100 dark:border-indigo-800">
                                                    {test._net.toFixed(2)}
                                                </div>
                                            ) : (
                                                <Badge variant="outline" className="animate-pulse bg-amber-50 text-amber-600 border-amber-200 text-[10px]">Bekleniyor</Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        {filteredAndSortedData.length === 0 && (
                            <div className="py-20 flex flex-col items-center justify-center text-center">
                                <Calculator className="h-12 w-12 text-slate-200 mb-4" />
                                <h3 className="font-bold text-slate-400">Sonuç bulunamadı.</h3>
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
                        <div className="flex items-center gap-2">
                            {Array.from({ length: totalPages }).map((_, i) => (
                                <button key={i} onClick={() => setCurrentPage(i + 1)} className={cn("w-10 h-10 rounded-xl font-bold transition-all", currentPage === i + 1 ? "bg-indigo-600 text-white shadow-lg" : "hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500")}>
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
