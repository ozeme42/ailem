"use client";

import * as React from "react";
import Link from "next/link";
import { 
    ArrowLeft, CheckCircle, XCircle, Edit, ListFilter, MinusCircle, 
    Trash2, ClipboardList, BookCopy, Ruler, TestTube2, Globe, 
    MessageSquare, Gamepad2, FileText, Calendar, Clock, ChevronRight, 
    LayoutGrid, List, Filter, BookOpen, PenTool, ArrowUpDown, 
    ChevronLeft, BarChart3, GraduationCap, Repeat, Send, Calendar as CalendarIcon, User
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
import { format, isToday, isPast, differenceInDays, parse, addDays } from 'date-fns';
import { tr } from 'date-fns/locale';

import { Test, FamilyMember, TrackedBook } from "@/lib/data";
import { onTestsUpdate, deleteTest, onTrackedBooksUpdate, addTest } from "@/lib/dataService";
import { useAuth } from "@/components/auth-provider";
import { getCategoryName } from "@/app/education/page";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";

// --- DESIGN SYSTEM: Modern Premium LMS Dark Theme ---
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

const categoryColors: { [key: string]: { text: string, bg: string, border: string } } = {
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
    
    // Filtreler
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
            unsubTests();
            unsubBooks();
        };
    }, []);
    
    const handleDeleteTest = async (testId: string) => {
        try {
            await deleteTest(testId);
            toast({ title: "Ödev Silindi", variant: "destructive"});
        } catch (error) {
            toast({ title: "Hata", description: "Ödev silinirken bir hata oluştu.", variant: "destructive"});
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

    React.useEffect(() => {
        setSelectedSubCategory('all');
    }, [activeTestType]);

    React.useEffect(() => {
        setSelectedTopic('all');
    }, [selectedSubject]);
    
    // Veri İşleme
    const { 
        pendingTests, completedTests, allFilteredTests, 
        sourceOptions, subjectOptions, topicOptions, totalPages
    } = React.useMemo(() => {
        
        const enrichedTests = tests.map(test => {
            let sourceId = 'unknown';
            let sourceName = 'Bilinmeyen Kaynak';
            let topicName = null;
            let subjectName = getCategoryName(test);

            if (test.sourceType === 'trackedBook') {
                const book = trackedBooks.find(b => b.subjects.some(s => s.topics.some(t => t.id === test.topicId)));
                if (book) {
                    sourceId = book.id;
                    sourceName = book.title;
                }
            } else {
                sourceId = test.sourceId || test.title;
                sourceName = (test as any).sourceName || test.title;
            }

            if (test.topicId) {
                const allTopics = trackedBooks.flatMap(b => b.subjects.flatMap(s => s.topics));
                const foundTopic = allTopics.find(t => t.id === test.topicId);
                if (foundTopic) topicName = foundTopic.name;
            }

            let sortableDate = new Date();
            if (test.status === 'Sonuçlandı' && (test as any).updatedAt) {
                sortableDate = new Date((test as any).updatedAt);
            } else {
                sortableDate = parse(test.dueDate, 'dd MMMM yyyy', new Date(), { locale: tr });
            }

            return { 
                ...test, 
                _sourceId: sourceId, 
                _sourceName: sourceName, 
                _topicName: topicName,
                _subjectName: subjectName,
                _date: sortableDate
            };
        });

        const filtered = enrichedTests.filter(t => {
            if (selectedStudents.length > 0 && !selectedStudents.includes(t.studentId)) return false;
            if (activeTestType !== 'all' && t.sourceType !== activeTestType) return false;
            if (selectedSubCategory !== 'all' && t._sourceId !== selectedSubCategory) return false;
            if (selectedSubject !== 'all' && t._subjectName !== selectedSubject) return false;
            if (selectedTopic !== 'all' && t._topicName !== selectedTopic) return false;
            return true;
        });

        const uniqueSources = Array.from(new Set(
            enrichedTests
                .filter(t => activeTestType === 'all' || t.sourceType === activeTestType)
                .map(t => JSON.stringify({ id: t._sourceId, name: t._sourceName }))
        )).map(s => JSON.parse(s));

        const uniqueSubjects = Array.from(new Set(enrichedTests.map(t => t._subjectName))).sort();

        const uniqueTopics = Array.from(new Set(
            enrichedTests
                .filter(t => selectedSubject === 'all' || t._subjectName === selectedSubject)
                .map(t => t._topicName)
                .filter(Boolean)
        )).sort();

        const sorted = filtered.sort((a, b) => {
            let valA: any = a[sortKey as keyof typeof a];
            let valB: any = b[sortKey as keyof typeof b];

            if (sortKey === 'score') {
                valA = a.score || 0;
                valB = b.score || 0;
            }

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
            sourceOptions: uniqueSources,
            subjectOptions: uniqueSubjects,
            topicOptions: uniqueTopics,
            totalPages: {
                all: Math.ceil(sorted.length / ITEMS_PER_PAGE),
                pending: Math.ceil(pending.length / ITEMS_PER_PAGE),
                completed: Math.ceil(completed.length / ITEMS_PER_PAGE),
            }
        };
    }, [tests, selectedStudents, activeTestType, selectedSubCategory, selectedSubject, selectedTopic, trackedBooks, sortKey, sortDirection]);

    const handlePageChange = (direction: 'next' | 'prev') => {
        setPagination(prev => {
            const current = prev[activeTab];
            const total = totalPages[activeTab];
            if (direction === 'next' && current < total) {
                return { ...prev, [activeTab]: current + 1 };
            }
            if (direction === 'prev' && current > 1) {
                return { ...prev, [activeTab]: current - 1 };
            }
            return prev;
        });
    };
    
    React.useEffect(() => {
        setPagination(prev => ({...prev, [activeTab]: 1}));
    }, [activeTab, selectedStudents, activeTestType, selectedSubCategory, selectedSubject, selectedTopic]);
    
    const paginatedAll = allFilteredTests.slice((pagination.all - 1) * ITEMS_PER_PAGE, pagination.all * ITEMS_PER_PAGE);
    const paginatedPending = pendingTests.slice((pagination.pending - 1) * ITEMS_PER_PAGE, pagination.pending * ITEMS_PER_PAGE);
    const paginatedCompleted = completedTests.slice((pagination.completed - 1) * ITEMS_PER_PAGE, pagination.completed * ITEMS_PER_PAGE);

    const handleReassign = (test: Test) => {
        setReassignTest(test);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative flex flex-col">
            
            {/* Arka Plan Efektleri */}
            <div className="fixed inset-0 bg-slate-950 -z-50" />
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[120px]" />
            </div>

            {/* Header */}
            <header className={themeColors.HEADER_BG}>
                <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <Button 
                            onClick={() => window.history.back()} 
                            variant="ghost" 
                            size="icon"
                            className="rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors -ml-2 h-9 w-9 sm:h-10 sm:w-10"
                        >
                            <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                        </Button>
                        <div className={themeColors.ICON_BOX}>
                             <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="flex flex-col justify-center">
                            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-100 leading-none">
                                Ödev Yönetimi
                            </h1>
                            <p className="text-[10px] sm:text-xs font-medium text-slate-400 mt-1">Öğrenci ödev takibi ve sonuç analizi</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className={cn(
                                    "rounded-xl h-9 sm:h-10 px-3 sm:px-4 text-xs font-semibold whitespace-nowrap border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors", 
                                    selectedStudents.length > 0 && "bg-indigo-600/10 border-indigo-500/50 text-indigo-300 hover:bg-indigo-600/20"
                                )}>
                                    <ListFilter className="mr-2 h-4 w-4" />
                                    <span className="hidden sm:inline">Öğrenci Filtresi</span> 
                                    {selectedStudents.length > 0 && <Badge className="ml-2 bg-indigo-500 text-white px-1.5 py-0.5 h-5 rounded-md text-[10px]">{selectedStudents.length}</Badge>}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-800 text-slate-100 rounded-xl shadow-2xl">
                                <DropdownMenuLabel className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Öğrenci Seçin</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-slate-800" />
                                <DropdownMenuCheckboxItem
                                    checked={selectedStudents.length === 0}
                                    onCheckedChange={() => setSelectedStudents([])}
                                    className="focus:bg-slate-800 focus:text-white cursor-pointer"
                                >
                                    Tümü
                                </DropdownMenuCheckboxItem>
                                {studentMembers.map(student => (
                                    <DropdownMenuCheckboxItem
                                        key={student.id}
                                        checked={selectedStudents.includes(student.id)}
                                        onCheckedChange={(checked) => {
                                            setSelectedStudents(prev => 
                                                checked ? [...prev, student.id] : prev.filter(id => id !== student.id)
                                            );
                                        }}
                                        className="focus:bg-slate-800 focus:text-white cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{backgroundColor: student.color}}/>
                                            {student.name}
                                        </div>
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-6 relative z-10 flex flex-col min-h-0">
                
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full space-y-6">
                    
                    {/* Filtre ve Kontrol Paneli */}
                    <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 shadow-sm backdrop-blur-sm flex flex-col gap-4">
                        
                        {/* Üst Satır: Durum Sekmeleri ve Görünüm */}
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-800/60 pb-4">
                            <TabsList className="h-10 p-1 rounded-xl bg-slate-950/50 border border-slate-800 w-full lg:w-auto grid grid-cols-3">
                                <TabsTrigger value="all" className="rounded-lg text-xs font-semibold data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400 transition-all">
                                    Tümü <Badge variant="secondary" className="ml-1.5 bg-slate-700/50 text-slate-300 hover:bg-slate-700/50 text-[9px] px-1">{allFilteredTests.length}</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="pending" className="rounded-lg text-xs font-semibold data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-400 text-slate-400 transition-all">
                                    Bekleyen <Badge variant="secondary" className="ml-1.5 bg-amber-500/20 text-amber-300 hover:bg-amber-500/20 text-[9px] px-1">{pendingTests.length}</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="completed" className="rounded-lg text-xs font-semibold data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400 text-slate-400 transition-all">
                                    Biten <Badge variant="secondary" className="ml-1.5 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20 text-[9px] px-1">{completedTests.length}</Badge>
                                </TabsTrigger>
                            </TabsList>

                            <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
                                {/* Tip Seçimi */}
                                <Tabs value={activeTestType} onValueChange={(value) => setActiveTestType(value as TestTypeFilter)}>
                                    <TabsList className="h-9 p-1 bg-slate-950/50 border border-slate-800 rounded-lg">
                                        {['all', 'bank', 'trackedBook', 'exam', 'json'].map((type) => (
                                            <TabsTrigger key={type} value={type} className="text-[11px] h-7 px-2.5 rounded-md data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400 capitalize">
                                                {type === 'all' ? 'Tümü' : type === 'bank' ? 'Soru' : type === 'trackedBook' ? 'Kitap' : type === 'exam' ? 'Deneme' : 'Yazılı'}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                </Tabs>

                                {/* Görünüm Değiştirici */}
                                <div className="flex bg-slate-950/50 p-1 rounded-lg border border-slate-800">
                                    <Button size="sm" variant="ghost" onClick={() => setViewMode('grid')} className={cn("h-7 w-8 p-0 rounded-md transition-all", viewMode === 'grid' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300')}>
                                        <LayoutGrid className="w-4 h-4" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setViewMode('list')} className={cn("h-7 w-8 p-0 rounded-md transition-all", viewMode === 'list' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300')}>
                                        <List className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Alt Satır: Detaylı Filtreler */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mr-1">
                                <Filter className="w-3.5 h-3.5" /> Daralt:
                            </div>

                            {sourceOptions.length > 0 && (
                                <Select value={selectedSubCategory} onValueChange={setSelectedSubCategory}>
                                    <SelectTrigger className={themeColors.FILTER_SELECT}>
                                        <div className="flex items-center truncate">
                                            <span className="text-slate-500 mr-2">Kaynak:</span>
                                            <SelectValue placeholder="Tümü" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                                        <SelectItem value="all">Tüm Kaynaklar</SelectItem>
                                        {sourceOptions.map(source => (
                                            <SelectItem key={source.id} value={source.id}>{source.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                <SelectTrigger className={themeColors.FILTER_SELECT}>
                                    <div className="flex items-center truncate">
                                        <span className="text-slate-500 mr-2">Ders:</span>
                                        <SelectValue placeholder="Tümü" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                                    <SelectItem value="all">Tüm Dersler</SelectItem>
                                    {subjectOptions.map(subject => (
                                        <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={selectedTopic} onValueChange={setSelectedTopic} disabled={topicOptions.length === 0}>
                                <SelectTrigger className={cn(themeColors.FILTER_SELECT, topicOptions.length === 0 && "opacity-50 cursor-not-allowed")}>
                                    <div className="flex items-center truncate">
                                        <span className="text-slate-500 mr-2">Konu:</span>
                                        <SelectValue placeholder="Tümü" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                                    <SelectItem value="all">Tüm Konular</SelectItem>
                                    {topicOptions.map(topic => (
                                        <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            
                            {(selectedSubCategory !== 'all' || selectedSubject !== 'all' || selectedTopic !== 'all') && (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => {
                                        setSelectedSubCategory('all');
                                        setSelectedSubject('all');
                                        setSelectedTopic('all');
                                    }}
                                    className="h-9 px-3 text-rose-400 hover:text-rose-300 hover:bg-rose-50/10 text-xs ml-auto sm:ml-0 rounded-lg"
                                >
                                    Filtreyi Temizle
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Veri Gösterim Alanı */}
                    <div className="min-h-[400px]">
                        <TabsContent value="all" className="m-0 animate-in fade-in duration-300">
                            <TestsListOrGrid 
                                tests={paginatedAll} viewMode={viewMode} familyMembers={familyMembers} 
                                onDelete={handleDeleteTest} onReassign={handleReassign} sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort}
                            />
                             <PaginationControls currentPage={pagination.all} totalPages={totalPages.all} onPageChange={handlePageChange} />
                        </TabsContent>
                        
                        <TabsContent value="pending" className="m-0 animate-in fade-in duration-300">
                            <TestsListOrGrid 
                                tests={paginatedPending} viewMode={viewMode} familyMembers={familyMembers} 
                                onDelete={handleDeleteTest} onReassign={handleReassign} sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} emptyMessage="Bekleyen ödev bulunamadı. Harika!" 
                            />
                             <PaginationControls currentPage={pagination.pending} totalPages={totalPages.pending} onPageChange={handlePageChange} />
                        </TabsContent>
                        
                        <TabsContent value="completed" className="m-0 animate-in fade-in duration-300">
                            <TestsListOrGrid 
                                tests={paginatedCompleted} viewMode={viewMode} familyMembers={familyMembers} 
                                onDelete={handleDeleteTest} onReassign={handleReassign} sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} emptyMessage="Tamamlanmış ödev bulunamadı." 
                            />
                            <PaginationControls currentPage={pagination.completed} totalPages={totalPages.completed} onPageChange={handlePageChange} />
                        </TabsContent>
                    </div>
                </Tabs>
            </main>

            <ReassignTestDialog 
                test={reassignTest} 
                isOpen={!!reassignTest} 
                onOpenChange={(open) => !open && setReassignTest(null)}
                familyMembers={familyMembers}
            />
        </div>
    );
}

// --- SUB COMPONENTS ---

function PaginationControls({ currentPage, totalPages, onPageChange }: { currentPage: number, totalPages: number, onPageChange: (direction: 'next' | 'prev') => void }) {
    if (totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-center gap-4 mt-8 pb-8">
            <Button variant="outline" size="sm" className={themeColors.BUTTON_GLASS} onClick={() => onPageChange('prev')} disabled={currentPage === 1}>
                <ChevronLeft className="mr-1.5 h-4 w-4" /> Önceki
            </Button>
            <div className="flex items-center justify-center bg-slate-900 border border-slate-800 rounded-lg px-4 h-9 shadow-sm">
                <span className="font-semibold text-xs text-slate-300">Sayfa <span className="text-white">{currentPage}</span> / {totalPages}</span>
            </div>
            <Button variant="outline" size="sm" className={themeColors.BUTTON_GLASS} onClick={() => onPageChange('next')} disabled={currentPage === totalPages}>
                Sonraki <ChevronRight className="ml-1.5 h-4 w-4" />
            </Button>
        </div>
    );
}

function TestsListOrGrid({ 
    tests, viewMode, familyMembers, onDelete, onReassign, emptyMessage, sortKey, sortDirection, onSort 
}: { 
    tests: Test[], viewMode: ViewMode, familyMembers: FamilyMember[], onDelete: (id: string) => void, onReassign: (test: Test) => void, emptyMessage?: string, sortKey?: SortKey, sortDirection?: 'asc' | 'desc', onSort?: (key: SortKey) => void
}) {
    if (tests.length === 0) {
        return <EmptyState message={emptyMessage} />;
    }

    if (viewMode === 'grid') {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {tests.map(test => {
                    const student = familyMembers.find(m => m.id === test.studentId);
                    return <TestCard key={test.id} test={test} student={student} onDelete={onDelete} onReassign={onReassign} />;
                })}
            </div>
        );
    }

    // LIST VIEW (TABLE)
    return (
        <div className="rounded-2xl border border-slate-800/80 overflow-hidden bg-slate-900/40 backdrop-blur-md shadow-xl">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr>
                            <th onClick={() => onSort && onSort('title')} className={cn("p-4 pl-6 group w-[40%]", themeColors.TABLE_HEADER)}>
                                <div className="flex items-center gap-1.5">ÖDEV & KONU {sortKey === 'title' && <ArrowUpDown className="w-3 h-3 text-indigo-400" />}</div>
                            </th>
                            <th onClick={() => onSort && onSort('studentId')} className={cn("p-4 text-center hidden sm:table-cell group", themeColors.TABLE_HEADER)}>
                                <div className="flex items-center justify-center gap-1.5">ÖĞRENCİ {sortKey === 'studentId' && <ArrowUpDown className="w-3 h-3 text-indigo-400" />}</div>
                            </th>
                            <th onClick={() => onSort && onSort('_date')} className={cn("p-4 text-center hidden lg:table-cell group", themeColors.TABLE_HEADER)}>
                                <div className="flex items-center justify-center gap-1.5">TARİH {sortKey === '_date' && <ArrowUpDown className="w-3 h-3 text-indigo-400" />}</div>
                            </th>
                            <th onClick={() => onSort && onSort('status')} className={cn("p-4 text-center hidden md:table-cell group", themeColors.TABLE_HEADER)}>
                                <div className="flex items-center justify-center gap-1.5">DURUM {sortKey === 'status' && <ArrowUpDown className="w-3 h-3 text-indigo-400" />}</div>
                            </th>
                            <th onClick={() => onSort && onSort('score')} className={cn("p-4 text-center group", themeColors.TABLE_HEADER)}>
                                <div className="flex items-center justify-center gap-1.5">BAŞARI {sortKey === 'score' && <ArrowUpDown className="w-3 h-3 text-indigo-400" />}</div>
                            </th>
                            <th className={cn("p-4 text-right pr-6 cursor-default", themeColors.TABLE_HEADER)}>İŞLEM</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tests.map(test => {
                            const student = familyMembers.find(m => m.id === test.studentId);
                            const categoryName = getCategoryName(test);
                            const isCompleted = test.status === 'Sonuçlandı';
                            const isPendingGrade = test.status === 'Değerlendirme Bekliyor';
                            
                            const dateObj = (test as any)._date ? new Date((test as any)._date) : new Date();
                            const dateStr = dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
                            
                            const totalQ = (test.correctAnswers || 0) + (test.incorrectAnswers || 0) + (test.emptyAnswers || 0);
                            const successRate = totalQ > 0 ? ((test.correctAnswers || 0) / totalQ) * 100 : 0;
                            const colors = categoryColors[categoryName] || categoryColors['Diğer'];

                            return (
                                <tr key={test.id} className={cn("group", themeColors.TABLE_ROW)}>
                                    <td className="p-4 pl-6">
                                        <div className="flex flex-col gap-1.5">
                                            <span className="font-semibold text-slate-200 text-sm md:text-base line-clamp-1 group-hover:text-white transition-colors">{test.title}</span>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge variant="outline" className={cn("text-[9px] h-4.5 px-1.5 uppercase font-bold tracking-wider border", colors.text, colors.bg, colors.border)}>
                                                    {categoryName}
                                                </Badge>
                                                {(test as any)._topicName && (
                                                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                                        <BookOpen className="w-3 h-3"/> {(test as any)._topicName}
                                                    </span>
                                                )}
                                            </div>
                                            {student && <div className="sm:hidden mt-1 text-xs text-slate-400 flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{backgroundColor: student.color}}/> {student.name}</div>}
                                        </div>
                                    </td>
                                    <td className="p-4 text-center hidden sm:table-cell">
                                        {student && (
                                            <div className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs font-medium text-slate-300">
                                                <div className="w-2 h-2 rounded-full shadow-sm" style={{backgroundColor: student.color}}/>
                                                {student.name}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 text-center hidden lg:table-cell">
                                        <div className="flex flex-col items-center gap-0.5">
                                            <span className="text-sm text-slate-300 font-medium">{dateStr}</span>
                                            <span className="text-[10px] text-slate-500 font-medium">{isCompleted ? "Tamamlanma" : "Son Tarih"}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center hidden md:table-cell">
                                        {isCompleted ? (
                                            <Badge variant="outline" className="text-emerald-400 bg-emerald-400/10 border-emerald-400/20 font-medium">Tamamlandı</Badge>
                                        ) : isPendingGrade ? (
                                            <Badge variant="outline" className="text-amber-400 bg-amber-400/10 border-amber-400/20 font-medium">Not Bekliyor</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-indigo-400 bg-indigo-400/10 border-indigo-400/20 font-medium">Atandı</Badge>
                                        )}
                                    </td>
                                    <td className="p-4 text-center">
                                        {isCompleted ? (
                                            <div className="flex flex-col items-center gap-1">
                                                <span className={cn("font-bold text-sm", successRate >= 70 ? "text-emerald-400" : successRate >= 50 ? "text-amber-400" : "text-rose-400")}>
                                                    %{successRate.toFixed(0)}
                                                </span>
                                                <div className="flex gap-1.5 text-[10px] font-medium">
                                                    <span className="text-emerald-500/80">{test.correctAnswers}D</span>
                                                    <span className="text-rose-500/80">{test.incorrectAnswers}Y</span>
                                                    <span className="text-slate-500">{test.emptyAnswers}B</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-slate-600 font-medium text-sm">--</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right pr-6">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <Link href={`/education/${test.id}`}>
                                                <Button size="sm" className={cn("h-8 px-3 rounded-lg text-xs font-semibold shadow-sm transition-all", isCompleted ? "bg-slate-800 hover:bg-slate-700 text-slate-200" : "bg-indigo-600 hover:bg-indigo-500 text-white")}>
                                                    {isCompleted ? 'İncele' : 'Çöz'}
                                                </Button>
                                            </Link>
                                            
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">
                                                        <span className="sr-only">Menü</span>
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-40 bg-slate-900 border-slate-800 rounded-xl p-1">
                                                    <DropdownMenuItem onClick={() => onReassign(test)} className="text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer flex items-center">
                                                        <Repeat className="w-4 h-4 mr-2" /> Tekrar Ata
                                                    </DropdownMenuItem>
                                                    <Link href={`/education/management/questions?edit=${test.id}`}>
                                                        <DropdownMenuItem className="text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer flex items-center">
                                                            <Edit className="w-4 h-4 mr-2" /> Düzenle
                                                        </DropdownMenuItem>
                                                    </Link>
                                                    <DropdownMenuSeparator className="bg-slate-800" />
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg cursor-pointer flex items-center">
                                                                <Trash2 className="w-4 h-4 mr-2" /> Sil
                                                            </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100 rounded-2xl">
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Ödevi Sil</AlertDialogTitle>
                                                                <AlertDialogDescription className="text-slate-400">"{test.title}" ödevini kalıcı olarak silmek istediğinizden emin misiniz?</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200">İptal</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => onDelete(test.id)} className="bg-rose-600 hover:bg-rose-700 text-white border-none">Evet, Sil</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </DropdownMenuContent>
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

function EmptyState({ message = "Bu kriterlere uygun ödev bulunamadı." }: { message?: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-5 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800 m-auto max-w-2xl w-full">
            <div className="w-20 h-20 bg-slate-800/80 rounded-full flex items-center justify-center shadow-inner">
                <BarChart3 className="h-10 w-10 text-slate-600" />
            </div>
            <div>
                <h3 className="text-xl font-bold text-slate-200">Kayıt Bulunamadı</h3>
                <p className="text-slate-400 mt-2 text-sm max-w-sm mx-auto leading-relaxed">{message}</p>
            </div>
        </div>
    );
}

function TestCard({ test, student, onDelete, onReassign }: { test: Test, student?: FamilyMember, onDelete: (id: string) => void, onReassign: (test: Test) => void }) {
    const isCompleted = test.status === 'Sonuçlandı';
    const isPendingGrade = test.status === 'Değerlendirme Bekliyor';
    const categoryName = getCategoryName(test);
    const Icon = categoryIcons[categoryName] || FileText;
    const colors = categoryColors[categoryName] || categoryColors['Diğer'];

    const dateObj = (test as any)._date ? new Date((test as any)._date) : new Date();
    const dateStr = dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });

    const dueDate = parse(test.dueDate, 'dd MMMM yyyy', new Date(), { locale: tr });
    const now = new Date();
    const daysDiff = differenceInDays(dueDate, now);
    const isTestDue = isPast(dueDate) && !isToday(dueDate);

    const totalQuestions = (test.correctAnswers || 0) + (test.incorrectAnswers || 0) + (test.emptyAnswers || 0);
    const successRate = totalQuestions > 0 ? ((test.correctAnswers || 0) / totalQuestions) * 100 : 0;

    return (
        <div className={cn(
            "group flex flex-col h-full rounded-2xl overflow-hidden",
            themeColors.CARD_BG
        )}>
            {/* Üst Kısım: Rozetler ve Öğrenci */}
            <div className="p-5 pb-4 flex justify-between items-start gap-2 border-b border-slate-800/50 bg-slate-900/30">
                <div className="flex flex-col gap-2">
                    <Badge variant="outline" className={cn("w-fit text-[10px] h-5 px-2 font-bold tracking-wide uppercase border", colors.text, colors.bg, colors.border)}>
                        {categoryName}
                    </Badge>
                    {student && (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
                            <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: student.color }} />
                            {student.name}
                        </div>
                    )}
                </div>
                <div className={cn("p-2 rounded-xl shrink-0 shadow-inner", colors.bg, colors.text)}>
                    <Icon className="w-5 h-5 opacity-90" />
                </div>
            </div>

            {/* Orta Kısım: Başlık ve Detaylar */}
            <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-base sm:text-lg font-bold leading-snug mb-2 text-slate-100 group-hover:text-white transition-colors line-clamp-2">
                    {test.title}
                </h3>
                
                {(test as any)._topicName && (
                    <p className="text-xs text-slate-400 mb-4 flex items-center gap-1.5 line-clamp-1">
                        <BookOpen className="w-3.5 h-3.5" /> {(test as any)._topicName}
                    </p>
                )}

                <div className="mt-auto space-y-3">
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        {isCompleted ? `Çözüldü: ${dateStr}` : `Son Teslim: ${dateStr}`}
                    </div>

                    {!isCompleted && !isPendingGrade && (
                        <div className={cn(
                            "flex items-center gap-2 text-xs font-semibold px-2.5 py-1.5 rounded-lg w-fit",
                            isTestDue ? "text-rose-400 bg-rose-400/10 border border-rose-400/20" : "text-emerald-400 bg-emerald-400/10 border border-emerald-400/20"
                        )}>
                            <Clock className="w-3.5 h-3.5" />
                            {isTestDue ? "Süresi Geçti" : `${daysDiff + 1} gün kaldı`}
                        </div>
                    )}
                </div>

                {isCompleted && (
                    <div className="mt-5 grid grid-cols-4 gap-2 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                        <div className="col-span-1 border-r border-slate-800 flex flex-col items-center justify-center">
                            <span className={cn("text-lg font-black", successRate >= 70 ? "text-emerald-400" : successRate >= 50 ? "text-amber-400" : "text-rose-400")}>
                                %{successRate.toFixed(0)}
                            </span>
                        </div>
                        <div className="col-span-3 flex justify-around items-center text-xs font-semibold">
                            <div className="flex flex-col items-center gap-1 text-emerald-400"><CheckCircle className="w-4 h-4 opacity-70"/><span>{test.correctAnswers}</span></div>
                            <div className="flex flex-col items-center gap-1 text-rose-400"><XCircle className="w-4 h-4 opacity-70"/><span>{test.incorrectAnswers}</span></div>
                            <div className="flex flex-col items-center gap-1 text-slate-400"><MinusCircle className="w-4 h-4 opacity-70"/><span>{test.emptyAnswers}</span></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Alt Kısım: Aksiyonlar */}
            <div className="p-4 pt-0 mt-auto flex items-center justify-between gap-3">
                <div className="flex-1">
                    {isPendingGrade ? (
                        <Link href={`/education/${test.id}`} className="block w-full">
                            <Button variant="secondary" className="w-full bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 font-semibold shadow-sm">
                                Not Ver
                            </Button>
                        </Link>
                    ) : isCompleted ? (
                        <Link href={`/education/${test.id}`} className="block w-full">
                            <Button variant="secondary" className="w-full bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 shadow-sm font-semibold">
                                Sonucu İncele
                            </Button>
                        </Link>
                    ) : (
                        <Link href={`/education/${test.id}`} className="block w-full">
                            <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/20 font-semibold">
                                Eğitime Başla <ChevronRight className="w-4 h-4 ml-1.5"/>
                            </Button>
                        </Link>
                    )}
                </div>

                <div className="flex gap-1 shrink-0">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">
                                <MoreVertical className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-100 rounded-xl p-1">
                            <DropdownMenuItem onClick={() => onReassign(test)} className="text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer flex items-center">
                                <Repeat className="w-4 h-4 mr-2" /> Tekrar Ata
                            </DropdownMenuItem>
                            <Link href={`/education/management/questions?edit=${test.id}`}>
                                <DropdownMenuItem className="text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer flex items-center">
                                    <Edit className="w-4 h-4 mr-2" /> Düzenle
                                </DropdownMenuItem>
                            </Link>
                            <DropdownMenuSeparator className="bg-slate-800" />
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg cursor-pointer flex items-center">
                                        <Trash2 className="w-4 h-4 mr-2" /> Sil
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100 rounded-2xl">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Ödevi Sil</AlertDialogTitle>
                                        <AlertDialogDescription className="text-slate-400">"{test.title}" ödevini kalıcı olarak silmek istediğinizden emin misiniz?</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200">İptal</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => onDelete(test.id)} className="bg-rose-600 hover:bg-rose-700 text-white border-none">Evet, Sil</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    );
}

function ReassignTestDialog({ test, isOpen, onOpenChange, familyMembers }: { test: Test | null, isOpen: boolean, onOpenChange: (open: boolean) => void, familyMembers: FamilyMember[] }) {
    const { toast } = useToast();
    const students = React.useMemo(() => familyMembers.filter(m => m.role.includes('Çocuk')), [familyMembers]);
    
    const [selectedStudentId, setSelectedStudentId] = React.useState<string>("");
    const [dueDate, setDueDate] = React.useState<Date>(addDays(new Date(), 7));
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        if (test) {
            setSelectedStudentId(test.studentId);
        }
    }, [test]);

    const handleReassignSubmit = async () => {
        if (!test || !selectedStudentId) return;
        setLoading(true);
        try {
            const newTestData: any = {
                title: test.title,
                subject: test.subject,
                studentId: selectedStudentId,
                questionCount: test.questionCount,
                assignedDate: format(new Date(), 'dd MMMM yyyy', { locale: tr }),
                dueDate: format(dueDate, 'dd MMMM yyyy', { locale: tr }),
                sourceType: test.sourceType,
                sourceId: test.sourceId,
                status: 'Atandı',
                isArchived: false,
                gradingType: test.gradingType,
                answerKey: test.answerKey,
                openEnded: test.openEnded,
                jsonQuestions: test.jsonQuestions,
                topicId: test.topicId,
            };

            // If it's a bank/mistake/quick test with a questions subcollection, we need those questions
            // For now, let's assume we copy the question references if they exist on the test object
            // (Note: addTest implementation handles subcollection if questionsForSubcollection is passed)
            
            // Fetch questions from the source test if they are not in the object
            let questionsToCopy: QuickTestQuestion[] = test.questions || [];
            if ((test.sourceType === 'bank' || test.sourceType === 'mistake' || test.sourceType === 'quick') && questionsToCopy.length === 0) {
                const questionsColRef = collection(db, 'tests', test.id, 'questions');
                const questionsSnap = await getDocs(query(questionsColRef, orderBy("questionNumber")));
                questionsToCopy = questionsSnap.docs.map(d => d.data() as QuickTestQuestion);
            }

            await addTest(newTestData, questionsToCopy);
            toast({ title: "✅ Ödev Tekrar Atandı", description: `${test.title} başarıyla yeni görev olarak eklendi.` });
            onOpenChange(false);
        } catch (e) {
            toast({ title: "Hata", description: "Atama sırasında bir hata oluştu.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    if (!test) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Repeat className="w-5 h-5 text-indigo-400" /> Ödevi Tekrar Ata
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        "{test.title}" ödevini yeni bir görev olarak tanımlayın.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Öğrenci</Label>
                        <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                            <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-100 h-11 rounded-xl">
                                <SelectValue placeholder="Öğrenci seçin" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                {students.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Bitiş Tarihi</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left bg-slate-950 border-slate-800 text-slate-100 h-11 rounded-xl">
                                    <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                                    {format(dueDate, "d MMMM yyyy", { locale: tr })}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-800" align="start">
                                <CalendarPicker 
                                    mode="single" 
                                    selected={dueDate} 
                                    onSelect={(d) => d && setDueDate(d)} 
                                    initialFocus 
                                    className="bg-slate-900 text-slate-100"
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white">İptal</Button>
                    <Button onClick={handleReassignSubmit} disabled={loading} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-11 rounded-xl px-8">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                        Atamayı Tamamla
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}