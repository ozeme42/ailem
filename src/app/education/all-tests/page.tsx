
"use client";

import * as React from "react";
import Link from "next/link";
import { 
    ArrowLeft, CheckCircle, XCircle, Edit, ListFilter, MinusCircle, 
    Trash2, ClipboardList, BookCopy, Ruler, TestTube2, Globe, 
    MessageSquare, Gamepad2, FileText, Calendar as CalendarLucide, Clock, ChevronRight, 
    LayoutGrid, List, Filter, BookOpen, PenTool, ArrowUpDown, 
    ChevronLeft, BarChart3, GraduationCap, Repeat, Send, User,
    MoreVertical, Loader2, CheckSquare, Calendar
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { 
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, 
    AlertDialogTitle, AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, 
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format, isToday, isPast, differenceInDays, parse, addDays, compareDesc } from 'date-fns';
import { tr } from 'date-fns/locale';

import { Test, FamilyMember, TrackedBook, QuickTestQuestion, BankQuestion } from "@/lib/data";
import { onTestsUpdate, deleteTest, onTrackedBooksUpdate, addTest, onSubjectsUpdate, onTopicsUpdate } from "@/lib/dataService";
import { useAuth } from "@/components/auth-provider";
import { getCategoryName } from "@/app/education/page";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { collection, getDocs, query, orderBy, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const themeColors = {
    HEADER_BG: "bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50 sticky top-0 z-40",
    CARD_BG: "bg-slate-900/40 border border-slate-800 shadow-xl backdrop-blur-md hover:bg-slate-900/60 hover:border-slate-700 transition-all duration-300",
    ICON_BOX: "bg-gradient-to-br from-indigo-500 to-violet-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20 text-white",
    BUTTON_GLASS: "bg-slate-800/50 hover:bg-slate-800 text-slate-200 border border-slate-700 shadow-sm transition-all",
    TABLE_HEADER: "bg-slate-900/80 text-slate-400 text-[11px] uppercase tracking-wider font-semibold cursor-pointer hover:text-slate-200 transition-colors select-none whitespace-nowrap",
    TABLE_ROW: "hover:bg-slate-800/30 transition-colors border-b border-slate-800/50 last:border-0",
    FILTER_SELECT: "w-full sm:w-[170px] h-9 rounded-lg bg-slate-900 border-slate-700 text-xs text-slate-300 focus:ring-indigo-500/50 focus:border-indigo-500/50"
};

const categoryIcons: { [key: string]: React.ElementType } = {
    'Genel Deneme Sınavları': ClipboardList,
    'Matematik': Ruler,
    'Fen Bilimleri': TestTube2,
    'Türkçe': BookCopy,
    'Sosyal Bilgiler': Globe,
    'İngilizce': MessageSquare,
    'Serbest Etkinlikler': Gamepad2,
    'Diğer': FileText,
};

const categoryThemeColors: { [key: string]: { text: string, bg: string, border: string } } = {
    'Genel Deneme Sınavları': { text: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20' },
    'Matematik': { text: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
    'Fen Bilimleri': { text: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
    'Türkçe': { text: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/20' },
    'Sosyal Bilgiler': { text: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20' },
    'İngilizce': { text: 'text-violet-400', bg: 'bg-violet-400/10', border: 'border-violet-400/20' },
    'Serbest Etkinlikler': { text: 'text-fuchsia-400', bg: 'bg-fuchsia-400/10', border: 'border-fuchsia-400/20' },
    'Diğer': { text: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/20' },
};

type TestTypeFilter = 'all' | 'bank' | 'trackedBook' | 'exam' | 'json';
type ViewMode = 'grid' | 'list';
type SortKey = 'title' | '_date' | 'status' | 'score' | 'studentId' | 'questionCount'; 
type PaginationState = { [key in 'all' | 'pending' | 'completed']: number };

const ITEMS_PER_PAGE = 12;

export default function AllTestsPage() {
    const { toast } = useToast();
    const { familyMembers } = useAuth();
    
    const [tests, setTests] = React.useState<Test[]>([]);
    const [trackedBooks, setTrackedBooks] = React.useState<TrackedBook[]>([]);
    const [selectedStudents, setSelectedStudents] = React.useState<string[]>([]);
    const [activeTab, setActiveTab] = React.useState<'all'|'pending'|'completed'>('all');
    const [activeTestType, setActiveTestType] = React.useState<TestTypeFilter>('all');
    const [selectedSubCategory, setSelectedSubCategory] = React.useState<string>('all');
    const [selectedSubject, setSelectedSubject] = React.useState<string>('all');
    const [selectedTopic, setSelectedTopic] = React.useState<string>('all');
    const [viewMode, setViewMode] = React.useState<ViewMode>('list');
    const [sortKey, setSortKey] = React.useState<SortKey>('_date');
    const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');
    const [pagination, setPagination] = React.useState<PaginationState>({ all: 1, pending: 1, completed: 1 });
    const [reassignTest, setReassignTest] = React.useState<Test | null>(null);

    const studentMembers = React.useMemo(() => 
        familyMembers.filter(m => m.role.includes('Çocuk')), 
    [familyMembers]);

    React.useEffect(() => {
        const unsubTests = onTestsUpdate(setTests, false, 'assignedDate', 'desc');
        const unsubBooks = onTrackedBooksUpdate(setTrackedBooks);
        return () => {
            unsubTests(); unsubBooks();
        };
    }, []);
    
    const handleDeleteTest = async (testId: string) => {
        try {
            await deleteTest(testId);
            toast({ title: "Ödev Silindi", variant: "destructive"});
        } catch (error) {
            toast({ title: "Hata", variant: "destructive"});
        }
    };

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDirection('desc');
        }
    };

    React.useEffect(() => { setSelectedSubCategory('all'); }, [activeTestType]);
    React.useEffect(() => { setSelectedTopic('all'); }, [selectedSubject]);
    
    const { pendingTests, completedTests, allFilteredTests, totalPages } = React.useMemo(() => {
        const enrichedTests = tests.map(test => {
            let sourceId = 'unknown', sourceName = 'Bilinmeyen Kaynak', topicName = null;
            let subjectName = getCategoryName(test);
            if (test.sourceType === 'trackedBook') {
                const book = trackedBooks.find(b => b.subjects.some(s => s.topics.some(t => t.id === test.topicId)));
                if (book) { sourceId = book.id; sourceName = book.title; }
            } else {
                sourceId = test.sourceId || test.title;
                sourceName = (test as any).sourceName || test.title;
            }
            if (test.topicId) {
                const foundTopic = trackedBooks.flatMap(b => b.subjects.flatMap(s => s.topics)).find(t => t.id === test.topicId);
                if (foundTopic) topicName = foundTopic.name;
            } else if ((test as any).topic) { topicName = (test as any).topic; }
            
            // Sıralama tarihi mantığı: Çözüldüyse çözüm tarihi, değilse son teslim tarihi
            let sortableDate = new Date();
            if (test.status === 'Sonuçlandı' && (test as any).updatedAt) {
                sortableDate = new Date((test as any).updatedAt);
            } else {
                try {
                    sortableDate = parse(test.dueDate, 'dd MMMM yyyy', new Date(), { locale: tr });
                } catch(e) {
                    sortableDate = new Date(test.dueDate);
                }
            }
            return { ...test, _sourceId: sourceId, _sourceName: sourceName, _topicName: topicName, _subjectName: subjectName, _date: sortableDate };
        });

        const filtered = enrichedTests.filter(t => {
            if (selectedStudents.length > 0 && !selectedStudents.includes(t.studentId)) return false;
            if (activeTestType !== 'all' && t.sourceType !== activeTestType) return false;
            if (selectedSubCategory !== 'all' && t._sourceId !== selectedSubCategory) return false;
            if (selectedSubject !== 'all' && t._subjectName !== selectedSubject) return false;
            if (selectedTopic !== 'all' && t._topicName !== selectedTopic) return false;
            return true;
        });

        const sorted = filtered.sort((a, b) => {
            let valA: any = a[sortKey as keyof typeof a];
            let valB: any = b[sortKey as keyof typeof b];
            if (sortKey === 'score') { valA = a.score || 0; valB = b.score || 0; }
            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        const pending = sorted.filter(t => t.status === 'Atandı' || t.status === 'Değerlendirme Bekliyor');
        const completed = sorted.filter(t => t.status === 'Sonuçlandı');
        
        return {
            pendingTests: pending,
            completedTests: completed,
            allFilteredTests: sorted,
            totalPages: {
                all: Math.ceil(sorted.length / ITEMS_PER_PAGE),
                pending: Math.ceil(pending.length / ITEMS_PER_PAGE),
                completed: Math.ceil(completed.length / ITEMS_PER_PAGE),
            }
        };
    }, [tests, selectedStudents, activeTestType, selectedSubCategory, selectedSubject, selectedTopic, trackedBooks, sortKey, sortDirection]);

    const handlePageChange = (direction: 'next' | 'prev') => {
        setPagination(prev => {
            const current = prev[activeTab], total = totalPages[activeTab];
            if (direction === 'next' && current < total) return { ...prev, [activeTab]: current + 1 };
            if (direction === 'prev' && current > 1) return { ...prev, [activeTab]: current - 1 };
            return prev;
        });
    };
    
    React.useEffect(() => { setPagination(prev => ({...prev, [activeTab]: 1})); }, [activeTab, selectedStudents, activeTestType, selectedSubCategory, selectedSubject, selectedTopic]);
    
    const paginatedAll = allFilteredTests.slice((pagination.all - 1) * ITEMS_PER_PAGE, pagination.all * ITEMS_PER_PAGE);
    const paginatedPending = pendingTests.slice((pagination.pending - 1) * ITEMS_PER_PAGE, pagination.pending * ITEMS_PER_PAGE);
    const paginatedCompleted = completedTests.slice((pagination.completed - 1) * ITEMS_PER_PAGE, pagination.completed * ITEMS_PER_PAGE);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative flex flex-col">
            <header className={themeColors.HEADER_BG}>
                <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <Button onClick={() => window.history.back()} variant="ghost" size="icon" className="rounded-full hover:bg-slate-800 text-slate-400 h-9 w-9">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div className={themeColors.ICON_BOX}><GraduationCap className="w-5 h-5" /></div>
                        <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-100 leading-none">Ödev Yönetimi</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className={cn("rounded-xl h-9 sm:h-10 px-3 border-slate-700 bg-slate-900 text-slate-300", selectedStudents.length > 0 && "bg-indigo-600/10 border-indigo-500/50 text-indigo-300")}>
                                    <ListFilter className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">Öğrenci</span> 
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-800 text-slate-100 rounded-xl">
                                <DropdownMenuLabel>Öğrenci Seçin</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-slate-800" />
                                {studentMembers.map(student => (
                                    <DropdownMenuCheckboxItem key={student.id} checked={selectedStudents.includes(student.id)} onCheckedChange={(checked) => setSelectedStudents(prev => checked ? [...prev, student.id] : prev.filter(id => id !== student.id))}>
                                        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: student.color}}/>{student.name}</div>
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-6 space-y-6">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full space-y-6">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-800/60 pb-4">
                            <TabsList className="h-10 p-1 rounded-xl bg-slate-950/50 border border-slate-800 w-full lg:w-auto grid grid-cols-3">
                                <TabsTrigger value="all" className="rounded-lg text-xs">Tümü</TabsTrigger>
                                <TabsTrigger value="pending" className="rounded-lg text-xs">Bekleyen</TabsTrigger>
                                <TabsTrigger value="completed" className="rounded-lg text-xs">Biten</TabsTrigger>
                            </TabsList>
                            <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                                <Tabs value={activeTestType} onValueChange={(v) => setActiveTestType(v as TestTypeFilter)}><TabsList className="h-9 p-1 bg-slate-950/50 border border-slate-800"><TabsTrigger value="all" className="text-[11px] h-7 px-2.5 rounded-md">Tümü</TabsTrigger><TabsTrigger value="bank" className="text-[11px] h-7 px-2.5 rounded-md">Soru</TabsTrigger><TabsTrigger value="trackedBook" className="text-[11px] h-7 px-2.5 rounded-md">Kitap</TabsTrigger><TabsTrigger value="exam" className="text-[11px] h-7 px-2.5 rounded-md">Deneme</TabsTrigger><TabsTrigger value="json" className="text-[11px] h-7 px-2.5 rounded-md">Yazılı</TabsTrigger></TabsList></Tabs>
                                <div className="flex bg-slate-950/50 p-1 rounded-lg border border-slate-800">
                                    <Button size="sm" variant="ghost" onClick={() => setViewMode('grid')} className={cn("h-7 w-8 p-0", viewMode === 'grid' ? 'bg-slate-700 text-white' : 'text-slate-500')}><LayoutGrid className="w-4 h-4" /></Button>
                                    <Button size="sm" variant="ghost" onClick={() => setViewMode('list')} className={cn("h-7 w-8 p-0", viewMode === 'list' ? 'bg-slate-700 text-white' : 'text-slate-500')}><List className="w-4 h-4" /></Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <TabsContent value="all" className="m-0"><TestsListOrGrid tests={paginatedAll} viewMode={viewMode} familyMembers={familyMembers} onDelete={handleDeleteTest} onReassign={setReassignTest} sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} /><PaginationControls currentPage={pagination.all} totalPages={totalPages.all} onPageChange={handlePageChange} /></TabsContent>
                    <TabsContent value="pending" className="m-0"><TestsListOrGrid tests={paginatedPending} viewMode={viewMode} familyMembers={familyMembers} onDelete={handleDeleteTest} onReassign={setReassignTest} sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} /><PaginationControls currentPage={pagination.pending} totalPages={totalPages.pending} onPageChange={handlePageChange} /></TabsContent>
                    <TabsContent value="completed" className="m-0"><TestsListOrGrid tests={paginatedCompleted} viewMode={viewMode} familyMembers={familyMembers} onDelete={handleDeleteTest} onReassign={setReassignTest} sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} /><PaginationControls currentPage={pagination.completed} totalPages={totalPages.completed} onPageChange={handlePageChange} /></TabsContent>
                </Tabs>
            </main>

            <ReassignTestDialog test={reassignTest} isOpen={!!reassignTest} onOpenChange={(open) => !open && setReassignTest(null)} familyMembers={familyMembers} />
        </div>
    );
}

function PaginationControls({ currentPage, totalPages, onPageChange }: { currentPage: number, totalPages: number, onPageChange: (direction: 'next' | 'prev') => void }) {
    if (totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-center gap-4 mt-8 pb-8">
            <Button variant="outline" size="sm" className={themeColors.BUTTON_GLASS} onClick={() => onPageChange('prev')} disabled={currentPage === 1}><ChevronLeft className="mr-1.5 h-4 w-4" /> Önceki</Button>
            <span className="font-semibold text-xs text-slate-300">Sayfa <span className="text-white">{currentPage}</span> / {totalPages}</span>
            <Button variant="outline" size="sm" className={themeColors.BUTTON_GLASS} onClick={() => onPageChange('next')} disabled={currentPage === totalPages}>Sonraki <ChevronRight className="ml-1.5 h-4 w-4" /></Button>
        </div>
    );
}

function TestsListOrGrid({ tests, viewMode, familyMembers, onDelete, onReassign, emptyMessage, sortKey, sortDirection, onSort }: any) {
    if (tests.length === 0) return <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800 text-slate-400">{emptyMessage || "Kayıt bulunamadı."}</div>;
    if (viewMode === 'grid') return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">{tests.map((t: any) => <TestCard key={t.id} test={t} student={familyMembers.find((m: any) => m.id === t.studentId)} onDelete={onDelete} onReassign={onReassign} />)}</div>;
    return (
        <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/40">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr>
                            <th onClick={() => onSort('title')} className={cn("p-4 pl-6 group", themeColors.TABLE_HEADER)}>ÖDEV & KONU</th>
                            <th onClick={() => onSort('studentId')} className={cn("p-4 text-center hidden sm:table-cell group", themeColors.TABLE_HEADER)}>ÖĞRENCİ</th>
                            <th onClick={() => onSort('_date')} className={cn("p-4 text-center hidden lg:table-cell group", themeColors.TABLE_HEADER)}>BİTİŞ / ÇÖZÜLME</th>
                            <th onClick={() => onSort('status')} className={cn("p-4 text-center hidden md:table-cell group", themeColors.TABLE_HEADER)}>DURUM</th>
                            <th onClick={() => onSort('score')} className={cn("p-4 text-center group", themeColors.TABLE_HEADER)}>BAŞARI</th>
                            <th className={cn("p-4 text-right pr-6", themeColors.TABLE_HEADER)}>İŞLEM</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tests.map((test: any) => {
                            const student = familyMembers.find((m: any) => m.id === test.studentId);
                            const categoryName = getCategoryName(test);
                            const isCompleted = test.status === 'Sonuçlandı';
                            const colors = categoryThemeColors[categoryName] || categoryThemeColors['Diğer'];
                            
                            // Tarih Bilgileri
                            const dueDateStr = test.dueDate;
                            const solvedDateStr = isCompleted && test.updatedAt ? format(new Date(test.updatedAt), 'dd.MM.yyyy HH:mm', { locale: tr }) : "-";

                            return (
                                <tr key={test.id} className={themeColors.TABLE_ROW}>
                                    <td className="p-4 pl-6"><span className="font-semibold text-slate-200 block truncate max-w-[200px]">{test.title}</span><Badge variant="outline" className={cn("text-[9px] h-4.5 px-1.5 uppercase font-bold", colors.text, colors.bg, colors.border)}>{categoryName}</Badge></td>
                                    <td className="p-4 text-center hidden sm:table-cell">{student && <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300"><div className="w-2 h-2 rounded-full" style={{backgroundColor: student.color}}/>{student.name}</div>}</td>
                                    <td className="p-4 text-center hidden lg:table-cell">
                                        <div className="flex flex-col items-center">
                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{isCompleted ? "Çözüldü" : "Bitiş"}</span>
                                            <span className="text-xs text-slate-200 font-semibold">{isCompleted ? solvedDateStr : dueDateStr}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center hidden md:table-cell">
                                        <Badge variant="outline" className={cn("text-[10px]", isCompleted ? "text-emerald-400" : test.status === 'Değerlendirme Bekliyor' ? "text-blue-400" : "text-amber-400")}>
                                            {test.status}
                                        </Badge>
                                    </td>
                                    <td className="p-4 text-center font-bold text-sm">{isCompleted ? `%${(test.score || 0).toFixed(0)}` : "--"}</td>
                                    <td className="p-4 text-right pr-6">
                                        <div className="flex items-center justify-end gap-1">
                                            {test.status === 'Değerlendirme Bekliyor' ? (
                                                <Link href={`/education/${test.id}?mode=evaluate`}>
                                                    <Button size="sm" className="h-8 px-3 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20">
                                                        <CheckSquare className="w-3.5 h-3.5 mr-1.5"/> Değerlendir
                                                    </Button>
                                                </Link>
                                            ) : (
                                                <Link href={`/education/${test.id}`}><Button size="sm" className="h-8 px-3 rounded-lg text-xs font-semibold bg-indigo-600 text-white">İncele</Button></Link>
                                            )}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-100 w-40"><DropdownMenuItem onClick={() => onReassign(test)}><Repeat className="mr-2 h-4 w-4" /> Tekrar Ata</DropdownMenuItem><AlertDialog><AlertDialogTrigger asChild><DropdownMenuItem onSelect={e => e.preventDefault()} className="text-rose-400"><Trash2 className="mr-2 h-4 w-4" /> Sil</DropdownMenuItem></AlertDialogTrigger><AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100"><AlertDialogHeader><AlertDialogTitle>Ödevi Sil</AlertDialogTitle><AlertDialogDescription>"{test.title}" kalıcı olarak silinecek.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="bg-white/5 border-white/10 text-slate-200">İptal</AlertDialogCancel><AlertDialogAction onClick={() => onDelete(test.id)} className="bg-rose-600 hover:bg-rose-700 border-none">Evet, Sil</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function TestCard({ test, student, onDelete, onReassign }: any) {
    const isCompleted = test.status === 'Sonuçlandı';
    const isPendingEvaluation = test.status === 'Değerlendirme Bekliyor';
    const categoryName = getCategoryName(test);
    const colors = categoryThemeColors[categoryName] || categoryThemeColors['Diğer'];
    const solvedDateStr = isCompleted && test.updatedAt ? format(new Date(test.updatedAt), 'dd.MM.yyyy HH:mm', { locale: tr }) : null;

    return (
        <Card className={themeColors.CARD_BG}>
            <CardHeader className="p-5 pb-4 border-b border-slate-800/50 bg-slate-900/30 flex flex-row justify-between items-start">
                <div className="flex flex-col gap-2">
                    <Badge variant="outline" className={cn("w-fit text-[10px] h-5 px-2 font-bold border", colors.text, colors.bg, colors.border)}>{categoryName}</Badge>
                    {student && <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300"><div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: student.color }} />{student.name}</div>}
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-100"><DropdownMenuItem onClick={() => onReassign(test)}><Repeat className="mr-2 h-4 w-4" /> Tekrar Ata</DropdownMenuItem><AlertDialog><AlertDialogTrigger asChild><DropdownMenuItem onSelect={e => e.preventDefault()} className="text-rose-400"><Trash2 className="mr-2 h-4 w-4" /> Sil</DropdownMenuItem></AlertDialogTrigger><AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100"><AlertDialogHeader> <AlertDialogTitle>Ödevi Sil</AlertDialogTitle><AlertDialogDescription>"{test.title}" ödevini kalıcı olarak silmek istediğinizden emin misiniz?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="bg-white/5 border-white/10 text-slate-200">İptal</AlertDialogCancel><AlertDialogAction onClick={() => onDelete(test.id)} className="bg-rose-600 hover:bg-rose-700 border-none">Evet, Sil</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></DropdownMenuContent>
                </DropdownMenu>
            </CardHeader>
            <CardContent className="p-5">
                <h3 className="text-base font-bold text-slate-100 line-clamp-2 mb-4">{test.title}</h3>
                <div className="flex flex-col gap-1 text-xs text-slate-400">
                    <div className="flex items-center gap-2"><Calendar className="w-4 h-4" />Bitiş: {test.dueDate}</div>
                    {isCompleted && solvedDateStr && <div className="flex items-center gap-2 text-emerald-400"><CheckCircle className="w-4 h-4" />Çözüldü: {solvedDateStr}</div>}
                </div>
                {isCompleted && <div className="mt-4 bg-slate-950/50 p-3 rounded-xl border border-slate-800 text-center"><span className="text-lg font-black text-emerald-400">%{test.score?.toFixed(0)} Başarı</span></div>}
                {isPendingEvaluation && <div className="mt-4 bg-blue-500/10 p-3 rounded-xl border border-blue-500/20 text-center"><span className="text-sm font-bold text-blue-400">Değerlendirme Bekliyor</span></div>}
            </CardContent>
            <CardFooter className="p-4 pt-0">
                {isPendingEvaluation ? (
                    <Link href={`/education/${test.id}?mode=evaluate`} className="w-full">
                        <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-10 rounded-xl shadow-lg shadow-blue-600/20">Değerlendir</Button>
                    </Link>
                ) : (
                    <Link href={`/education/${test.id}`} className="w-full">
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold h-10 rounded-xl">{isCompleted ? 'İncele' : 'Ödevi Çöz'}</Button>
                    </Link>
                )}
            </CardFooter>
        </Card>
    );
}

function ReassignTestDialog({ test, isOpen, onOpenChange, familyMembers }: { test: Test | null, isOpen: boolean, onOpenChange: (open: boolean) => void, familyMembers: FamilyMember[] }) {
    const { toast } = useToast();
    const students = React.useMemo(() => familyMembers.filter(m => m.role.includes('Çocuk')), [familyMembers]);
    const [selectedStudentId, setSelectedStudentId] = React.useState<string>("");
    const [dueDate, setDueDate] = React.useState<Date>(addDays(new Date(), 7));
    const [loading, setLoading] = React.useState(false);
    
    React.useEffect(() => { if (test) setSelectedStudentId(test.studentId); }, [test]);
    
    const handleReassignSubmit = async () => {
        if (!test || !selectedStudentId) return;
        setLoading(true);
        try {
            const newTestData: any = { 
                ...test, 
                studentId: selectedStudentId, 
                assignedDate: format(new Date(), 'dd MMMM yyyy', { locale: tr }), 
                dueDate: format(dueDate, 'dd MMMM yyyy', { locale: tr }), 
                status: 'Atandı', 
                isArchived: false,
                updatedAt: null // Yeni atamada çözüm tarihini sıfırla
            };
            delete newTestData.id;
            
            let questionsToCopy: any[] = [];
            
            if (test.sourceType === 'json' && test.jsonQuestions) {
                newTestData.jsonQuestions = [...test.jsonQuestions];
            } else {
                const questionsColRef = collection(db, 'tests', test.id, 'questions');
                const questionsSnap = await getDocs(query(questionsColRef, orderBy("questionNumber")));
                questionsToCopy = questionsSnap.docs.map(d => d.data());
            }
            
            await addTest(newTestData, questionsToCopy);
            toast({ title: "✅ Ödev Tekrar Atandı" });
            onOpenChange(false);
        } catch (e) { 
            console.error(e);
            toast({ title: "Hata", variant: "destructive" }); 
        } finally { 
            setLoading(false); 
        }
    };

    if (!test) return null;
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 rounded-2xl">
                <DialogHeader><DialogTitle className="flex items-center gap-2"><Repeat className="w-5 h-5 text-indigo-400" /> Ödevi Tekrar Ata</DialogTitle><DialogDescription className="text-slate-400">"{test.title}" ödevini yeni bir görev olarak tanımlayın.</DialogDescription></DialogHeader>
                <div className="space-y-6 py-4">
                    <div className="space-y-2"><Label className="text-xs font-bold text-slate-500 uppercase">Öğrenci</Label><Select value={selectedStudentId} onValueChange={setSelectedStudentId}><SelectTrigger className="bg-slate-950 border-slate-800 h-11"><SelectValue placeholder="Seçin" /></SelectTrigger><SelectContent className="bg-slate-900 border-slate-800 text-slate-100">{students.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label className="text-xs font-bold text-slate-500 uppercase">Bitiş Tarihi</Label><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start bg-slate-950 border-slate-800 h-11"><CalendarLucide className="mr-2 h-4 w-4" />{format(dueDate, "d MMMM yyyy", { locale: tr })}</Button></PopoverTrigger><PopoverContent className="w-auto p-0 bg-slate-900 border-slate-800" align="start"><CalendarPicker mode="single" selected={dueDate} onSelect={d => d && setDueDate(d)} initialFocus className="bg-slate-900 text-slate-100" /></PopoverContent></Popover></div>
                </div>
                <DialogFooter><Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400">İptal</Button><Button onClick={handleReassignSubmit} disabled={loading} className="bg-indigo-600 text-white font-bold h-11 rounded-xl px-8">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}Atamayı Tamamla</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
