"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle, Edit, ListFilter, MinusCircle, Trash2, ClipboardList, BookCopy, Ruler, TestTube2, Globe, MessageSquare, Gamepad2, FileText, Calendar, Clock, ChevronRight, LayoutGrid, List, Filter, Book, Library, PenTool } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

import { Test, FamilyMember, TrackedBook } from "@/lib/data";
import { onTestsUpdate, deleteTest, onTrackedBooksUpdate } from "@/lib/dataService";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-provider";
import { getCategoryName } from "@/app/education/page";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format, isToday, isPast, differenceInDays, parse, compareDesc } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// --- DESIGN SYSTEM: Glassmorphism ---
const glassColors = {
    HEADER_BG: "bg-slate-950/70 backdrop-blur-lg border-b border-white/5",
    CARD_BG: "bg-white/5 border border-white/10 shadow-lg backdrop-blur-md",
    ICON_BOX: "bg-gradient-to-br p-2.5 rounded-xl shadow-lg",
    BUTTON_GLASS: "bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow-sm",
    TABLE_HEADER: "bg-white/5 text-slate-400 text-xs uppercase tracking-wider font-medium",
    TABLE_ROW: "hover:bg-white/5 transition-colors border-b border-white/5 last:border-0",
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

const categoryIconColors: { [key: string]: string } = {
    'Genel Deneme Sınavları': 'text-yellow-400 bg-yellow-400/10',
    'Matematik': 'text-red-400 bg-red-400/10',
    'Fen Bilimleri': 'text-orange-400 bg-orange-400/10',
    'Türkçe': 'text-amber-400 bg-amber-400/10',
    'Sosyal Bilgiler': 'text-cyan-400 bg-cyan-400/10',
    'İngilizce': 'text-blue-400 bg-blue-400/10',
    'Serbest Etkinlikler': 'text-purple-400 bg-purple-400/10',
    'Diğer': 'text-slate-400 bg-slate-400/10',
};

type TestTypeFilter = 'all' | 'bank' | 'trackedBook' | 'exam' | 'json';
type ViewMode = 'grid' | 'list';

export default function AllTestsPage() {
    const { toast } = useToast();
    const { familyMembers } = useAuth();
    
    const [tests, setTests] = React.useState<Test[]>([]);
    const [trackedBooks, setTrackedBooks] = React.useState<TrackedBook[]>([]); // Kitap isimlerini eşleştirmek için
    const [selectedStudents, setSelectedStudents] = React.useState<string[]>([]);
    
    // Yeni Filtre State'leri
    const [activeTestType, setActiveTestType] = React.useState<TestTypeFilter>('all');
    const [selectedSubCategory, setSelectedSubCategory] = React.useState<string>('all');
    const [viewMode, setViewMode] = React.useState<ViewMode>('list'); // Varsayılan liste

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

    // Tip değiştiğinde alt filtreyi sıfırla
    React.useEffect(() => {
        setSelectedSubCategory('all');
    }, [activeTestType]);
    
    // --- VERİ İŞLEME VE FİLTRELEME ---
    const { pendingTests, completedTests, allFilteredTests, sourceOptions } = React.useMemo(() => {
        
        // 1. Veriyi Zenginleştir (Kaynak ve Konu isimlerini bul)
        const enrichedTests = tests.map(test => {
            let sourceId = 'unknown';
            let sourceName = 'Bilinmeyen Kaynak';
            let topicName = "Genel";

            if (test.sourceType === 'trackedBook') {
                const book = trackedBooks.find(b => b.subjects.some(s => s.topics.some(t => t.id === test.topicId)));
                if (book) {
                    sourceId = book.id;
                    sourceName = book.title;
                }
            } else {
                sourceId = test.sourceId || test.title;
                sourceName = (test as any).sourceName || test.title; // Eğer sourceName yoksa title kullan
            }

            if (test.topicId) {
                const allTopics = trackedBooks.flatMap(b => b.subjects.flatMap(s => s.topics));
                const foundTopic = allTopics.find(t => t.id === test.topicId);
                if (foundTopic) topicName = foundTopic.name;
            }

            return { ...test, _sourceId: sourceId, _sourceName: sourceName, _topicName: topicName };
        });

        // 2. Filtreleme
        const filtered = enrichedTests.filter(t => {
            // Öğrenci Filtresi
            if (selectedStudents.length > 0 && !selectedStudents.includes(t.studentId)) return false;
            
            // Tip Filtresi
            if (activeTestType !== 'all' && t.sourceType !== activeTestType) return false;

            // Kaynak (SubCategory) Filtresi
            if (selectedSubCategory !== 'all' && t._sourceId !== selectedSubCategory) return false;

            return true;
        });

        // 3. Dropdown Seçeneklerini Oluştur
        const uniqueSources = Array.from(new Set(
            enrichedTests
                .filter(t => activeTestType === 'all' || t.sourceType === activeTestType) // Sadece aktif tipe uygun kaynakları göster
                .map(t => JSON.stringify({ id: t._sourceId, name: t._sourceName }))
        )).map(s => JSON.parse(s));

        // 4. Sıralama ve Gruplama
        const sorted = filtered.sort((a, b) => {
             const dateA = (a as any).updatedAt ? new Date((a as any).updatedAt) : parse(a.dueDate, 'dd MMMM yyyy', new Date(), { locale: tr });
             const dateB = (b as any).updatedAt ? new Date((b as any).updatedAt) : parse(b.dueDate, 'dd MMMM yyyy', new Date(), { locale: tr });
             return compareDesc(dateA, dateB);
        });

        const pending = sorted.filter(t => t.status === 'Atandı' || t.status === 'Değerlendirme Bekliyor');
        const completed = sorted.filter(t => t.status === 'Sonuçlandı');
        
        return {
            pendingTests: pending,
            completedTests: completed,
            allFilteredTests: sorted,
            sourceOptions: uniqueSources
        };
    }, [tests, selectedStudents, activeTestType, selectedSubCategory, trackedBooks]);


    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden flex flex-col">
            
            {/* FIXED BACKGROUND */}
            <div className="fixed inset-0 bg-slate-950 -z-50" />
            
            {/* AMBIENT BACKGROUND */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[20%] left-[-5%] w-[400px] h-[400px] bg-emerald-900/20 rounded-full blur-[120px]" />
            </div>

            {/* HEADER */}
            <div className={cn("sticky top-0 z-40 w-full transition-all duration-300", glassColors.HEADER_BG)}>
                <div className="max-w-5xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Button 
                            onClick={() => window.history.back()} 
                            variant="ghost" 
                            size="icon"
                            className="rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors -ml-2"
                        >
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                        <div className={cn("from-indigo-500 to-purple-600", glassColors.ICON_BOX)}>
                             <ClipboardList className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tight text-slate-100 leading-none">
                                Tüm Ödevler
                            </h1>
                            <p className="text-xs font-medium text-slate-400 mt-0.5">Ödev Takip ve Analiz</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* ÖĞRENCİ FİLTRESİ */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className={cn("rounded-xl h-9 text-xs font-semibold whitespace-nowrap border-white/10 bg-white/5 hover:bg-white/10 text-slate-300", selectedStudents.length > 0 && "bg-indigo-600 border-indigo-500 text-white")}>
                                    <ListFilter className="mr-1.5 h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Öğrenci</span> {selectedStudents.length > 0 && `(${selectedStudents.length})`}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-white/10 text-slate-100">
                                <DropdownMenuLabel>Öğrenci Seçin</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuCheckboxItem
                                    checked={selectedStudents.length === 0}
                                    onCheckedChange={() => setSelectedStudents([])}
                                    className="focus:bg-white/10 focus:text-white"
                                >
                                    Tümü
                                </DropdownMenuCheckboxItem>
                                {studentMembers.map(student => (
                                    <DropdownMenuCheckboxItem
                                        key={student.id}
                                        checked={selectedStudents.includes(student.id)}
                                        onCheckedChange={(checked) => {
                                            setSelectedStudents(prev => 
                                                checked 
                                                ? [...prev, student.id] 
                                                : prev.filter(id => id !== student.id)
                                            );
                                        }}
                                        className="focus:bg-white/10 focus:text-white"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{backgroundColor: student.color}}/>
                                            {student.name}
                                        </div>
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            <div className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-6 relative z-10 flex flex-col min-h-0">
                
                <Tabs defaultValue="all" className="w-full space-y-6">
                    {/* DURUM TABS (Tümü / Bekleyen / Biten) */}
                    <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 h-12 p-1 rounded-2xl bg-slate-900/50 border border-white/10 backdrop-blur-md">
                        <TabsTrigger value="all" className="rounded-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400 hover:text-slate-200 transition-all">Tümü ({allFilteredTests.length})</TabsTrigger>
                        <TabsTrigger value="pending" className="rounded-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400 hover:text-slate-200 transition-all">Bekleyen ({pendingTests.length})</TabsTrigger>
                        <TabsTrigger value="completed" className="rounded-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400 hover:text-slate-200 transition-all">Biten ({completedTests.length})</TabsTrigger>
                    </TabsList>
                    
                    {/* DETAYLI FİLTRELER VE GÖRÜNÜM MODU */}
                    <div className={cn("p-4 rounded-3xl mb-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center", glassColors.CARD_BG)}>
                        <div className="flex gap-2 items-center flex-wrap w-full sm:w-auto">
                            <Tabs value={activeTestType} onValueChange={(value) => setActiveTestType(value as TestTypeFilter)}>
                                <TabsList className="p-1 h-9 bg-white/5 border border-white/10 rounded-lg">
                                    <TabsTrigger value="all" className="text-xs h-7 px-3 rounded-md">Tümü</TabsTrigger>
                                    <TabsTrigger value="bank" className="text-xs h-7 px-3 rounded-md">S. Bankası</TabsTrigger>
                                    <TabsTrigger value="trackedBook" className="text-xs h-7 px-3 rounded-md">Kitap</TabsTrigger>
                                    <TabsTrigger value="exam" className="text-xs h-7 px-3 rounded-md">Deneme</TabsTrigger>
                                    <TabsTrigger value="json" className="text-xs h-7 px-3 rounded-md">Yazılı</TabsTrigger>
                                </TabsList>
                            </Tabs>
                            
                            {sourceOptions.length > 0 && (
                                <Select value={selectedSubCategory} onValueChange={setSelectedSubCategory}>
                                    <SelectTrigger className="w-full sm:w-[180px] h-9 rounded-lg bg-white/5 border-white/10 text-xs">
                                        <SelectValue placeholder="Kaynak Seçin" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/10 text-slate-100">
                                        <SelectItem value="all">Tüm Kaynaklar</SelectItem>
                                        {sourceOptions.map(source => (
                                            <SelectItem key={source.id} value={source.id}>{source.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        {/* GÖRÜNÜM MODU SWITCHER */}
                        <div className="flex bg-slate-900/50 p-1 rounded-lg border border-white/10 ml-auto sm:ml-0">
                            <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => setViewMode('grid')} 
                                className={cn("h-8 w-8 p-0 rounded-md transition-all", viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300')}
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </Button>
                            <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => setViewMode('list')} 
                                className={cn("h-8 w-8 p-0 rounded-md transition-all", viewMode === 'list' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300')}
                            >
                                <List className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    <TabsContent value="all" className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                        <TestsListOrGrid tests={allFilteredTests} viewMode={viewMode} familyMembers={familyMembers} onDelete={handleDeleteTest} />
                    </TabsContent>
                    
                    <TabsContent value="pending" className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                        <TestsListOrGrid tests={pendingTests} viewMode={viewMode} familyMembers={familyMembers} onDelete={handleDeleteTest} emptyMessage="Bekleyen ödev bulunamadı." />
                    </TabsContent>
                    
                    <TabsContent value="completed" className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                        <TestsListOrGrid tests={completedTests} viewMode={viewMode} familyMembers={familyMembers} onDelete={handleDeleteTest} emptyMessage="Tamamlanmış ödev bulunamadı." />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

// --- SUB COMPONENTS ---

function TestsListOrGrid({ tests, viewMode, familyMembers, onDelete, emptyMessage }: { tests: Test[], viewMode: ViewMode, familyMembers: FamilyMember[], onDelete: (id: string) => void, emptyMessage?: string }) {
    if (tests.length === 0) {
        return <EmptyState message={emptyMessage} />;
    }

    if (viewMode === 'grid') {
        return (
            <div className="space-y-4">
                {tests.map(test => {
                    const student = familyMembers.find(m => m.id === test.studentId);
                    return <TestCard key={test.id} test={test} student={student} onDelete={onDelete} />;
                })}
            </div>
        );
    }

    // LIST VIEW (TABLE)
    return (
        <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/5 backdrop-blur-md">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr>
                            <th className={cn("p-4 font-semibold pl-6", glassColors.TABLE_HEADER)}>Ödev / Kaynak</th>
                            <th className={cn("p-4 font-semibold text-center hidden sm:table-cell", glassColors.TABLE_HEADER)}>Öğrenci</th>
                            <th className={cn("p-4 font-semibold text-center hidden md:table-cell", glassColors.TABLE_HEADER)}>Tarih</th>
                            <th className={cn("p-4 font-semibold text-center hidden sm:table-cell", glassColors.TABLE_HEADER)}>Durum</th>
                            <th className={cn("p-4 font-semibold text-center", glassColors.TABLE_HEADER)}>Başarı</th>
                            <th className={cn("p-4 font-semibold text-right pr-6", glassColors.TABLE_HEADER)}>İşlem</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tests.map(test => {
                            const student = familyMembers.find(m => m.id === test.studentId);
                            const categoryName = getCategoryName(test);
                            const isCompleted = test.status === 'Sonuçlandı';
                            
                            // Tarih Formatı
                            const dateObj = (test as any).updatedAt ? new Date((test as any).updatedAt) : parse(test.dueDate, 'dd MMMM yyyy', new Date(), { locale: tr });
                            const dateStr = dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
                            
                            // Başarı Hesabı
                            const totalQ = (test.correctAnswers || 0) + (test.incorrectAnswers || 0) + (test.emptyAnswers || 0);
                            const successRate = totalQ > 0 ? ((test.correctAnswers || 0) / totalQ) * 100 : 0;

                            return (
                                <tr key={test.id} className={cn("group", glassColors.TABLE_ROW)}>
                                    <td className="p-4 pl-6">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-200 text-sm sm:text-base line-clamp-1">{test.title}</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline" className="bg-slate-900/50 border-slate-700 text-slate-500 text-[9px] h-4 px-1.5 uppercase font-bold tracking-wider">
                                                    {categoryName}
                                                </Badge>
                                                <span className="text-xs text-indigo-400 hidden sm:inline-block">{(test as any)._topicName}</span>
                                            </div>
                                            {/* Mobile only student name */}
                                            {student && <div className="sm:hidden text-xs text-slate-500 mt-1 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: student.color}}/> {student.name}</div>}
                                        </div>
                                    </td>
                                    <td className="p-4 text-center hidden sm:table-cell">
                                        {student && (
                                            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/5 text-xs font-medium text-slate-300">
                                                <div className="w-2 h-2 rounded-full" style={{backgroundColor: student.color}}/>
                                                {student.name}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 text-center text-sm text-slate-400 whitespace-nowrap hidden md:table-cell">
                                        {dateStr}
                                    </td>
                                    <td className="p-4 text-center hidden sm:table-cell">
                                        {isCompleted ? (
                                            <Badge variant="outline" className="text-emerald-400 bg-emerald-500/10 border-emerald-500/20">Tamamlandı</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-amber-400 bg-amber-500/10 border-amber-500/20">Bekliyor</Badge>
                                        )}
                                    </td>
                                    <td className="p-4 text-center">
                                        {isCompleted ? (
                                            <div className="flex flex-col items-center">
                                                <span className={cn("font-bold text-sm", successRate >= 70 ? "text-emerald-400" : successRate >= 50 ? "text-yellow-400" : "text-rose-400")}>
                                                    %{successRate.toFixed(0)}
                                                </span>
                                                <span className="text-[10px] text-slate-500">{test.correctAnswers}D - {test.incorrectAnswers}Y</span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-600">-</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right pr-6">
                                        <div className="flex items-center justify-end gap-2">
                                            {isCompleted ? (
                                                <Link href={`/education/${test.id}`}>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10"><ChevronRight className="w-5 h-5" /></Button>
                                                </Link>
                                            ) : (
                                                <Link href={`/education/${test.id}`}>
                                                    <Button size="sm" className="h-7 text-xs bg-indigo-600 hover:bg-indigo-500 text-white">Çöz</Button>
                                                </Link>
                                            )}
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 className="w-4 h-4" /></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="bg-slate-900 border-white/10 text-slate-100">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Ödevi Sil?</AlertDialogTitle>
                                                        <AlertDialogDescription className="text-slate-400">Bu işlem geri alınamaz.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-200">İptal</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => onDelete(test.id)} className="bg-rose-600 hover:bg-rose-700">Sil</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
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

function EmptyState({ message = "Bu filtreye uygun ödev bulunamadı." }: { message?: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10 m-auto max-w-lg w-full">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
                <ClipboardList className="h-8 w-8 text-slate-500" />
            </div>
            <div>
                <h3 className="text-lg font-bold text-slate-200">Kayıt Yok</h3>
                <p className="text-slate-400 mt-1 text-sm">{message}</p>
            </div>
        </div>
    );
}

function TestCard({ test, student, onDelete }: { test: Test, student?: FamilyMember, onDelete: (id: string) => void }) {
    const isCompleted = test.status === 'Sonuçlandı';
    const isPendingGrade = test.status === 'Değerlendirme Bekliyor';
    const categoryName = getCategoryName(test);
    const Icon = categoryIcons[categoryName] || FileText;
    const iconStyle = categoryIconColors[categoryName] || 'text-slate-400 bg-slate-400/10';

    const dueDate = parse(test.dueDate, 'dd MMMM yyyy', new Date(), { locale: tr });
    const now = new Date();
    const daysDiff = differenceInDays(dueDate, now);
    const isTestDue = isPast(dueDate) && !isToday(dueDate);

    // Score Calculation
    const totalQuestions = (test.correctAnswers || 0) + (test.incorrectAnswers || 0) + (test.emptyAnswers || 0);
    const successRate = totalQuestions > 0 ? ((test.correctAnswers || 0) / totalQuestions) * 100 : 0;

    return (
        <div className={cn(
            "group relative flex flex-col sm:flex-row gap-4 p-5 rounded-3xl transition-all border backdrop-blur-md",
            isCompleted ? "bg-emerald-900/10 border-emerald-500/20 hover:border-emerald-500/40" : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
        )}>
            {/* Status Indicator Bar */}
            <div className={cn(
                "absolute left-0 top-6 bottom-6 w-1 rounded-r-full transition-all",
                isCompleted ? "bg-emerald-500" : isTestDue ? "bg-rose-500" : "bg-indigo-500"
            )} />

            <div className="flex-grow min-w-0 pl-3">
                <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-slate-900/50 border-slate-700 text-slate-400 text-[10px] h-5 rounded-md px-2 font-medium tracking-wide uppercase">
                        {categoryName}
                    </Badge>
                    {(test as any)._topicName && <span className="text-xs text-indigo-400 font-medium">{(test as any)._topicName}</span>}
                    {student && (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 bg-white/5 px-2 py-0.5 rounded-md border border-white/5 ml-auto sm:ml-0">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: student.color }} />
                            {student.name}
                        </div>
                    )}
                </div>

                <div className="flex items-start gap-3">
                    <div className={cn("p-2.5 rounded-xl shrink-0 mt-0.5", iconStyle)}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className={cn("text-lg font-bold leading-tight mb-1 text-slate-100 group-hover:text-white transition-colors")}>
                            {test.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-medium">
                            <span className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-indigo-400" /> 
                                {test.dueDate}
                            </span>
                            {!isCompleted && (
                                <span className={cn(
                                    "flex items-center gap-1.5 px-2 py-0.5 rounded-md",
                                    isTestDue ? "text-rose-300 bg-rose-500/10" : "text-emerald-300 bg-emerald-500/10"
                                )}>
                                    <Clock className="w-3.5 h-3.5" />
                                    {isTestDue ? "Süresi Geçti" : `${daysDiff + 1} gün kaldı`}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Score Summary for Completed Tests */}
                {isCompleted && (
                    <div className="mt-4 flex items-center gap-4 bg-black/20 p-3 rounded-xl border border-white/5 w-fit">
                        <div className="text-center px-2 border-r border-white/10">
                            <span className="block text-xl font-black text-emerald-400">%{successRate.toFixed(0)}</span>
                            <span className="text-[10px] uppercase text-slate-500 font-bold">Başarı</span>
                        </div>
                        <div className="flex gap-3 text-xs font-medium">
                            <div className="text-emerald-400 flex flex-col items-center"><CheckCircle className="w-4 h-4 mb-0.5"/> <span>{test.correctAnswers} D</span></div>
                            <div className="text-rose-400 flex flex-col items-center"><XCircle className="w-4 h-4 mb-0.5"/> <span>{test.incorrectAnswers} Y</span></div>
                            <div className="text-slate-400 flex flex-col items-center"><MinusCircle className="w-4 h-4 mb-0.5"/> <span>{test.emptyAnswers} B</span></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex flex-row sm:flex-col items-center justify-end gap-2 shrink-0 border-t sm:border-t-0 sm:border-l border-white/5 pt-4 sm:pt-0 sm:pl-4 mt-2 sm:mt-0">
                 {isPendingGrade ? (
                    <Link href={`/education/${test.id}`} className="w-full sm:w-auto">
                        <Button variant="secondary" size="sm" className="w-full bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border-amber-500/30">Not Ver</Button>
                    </Link>
                ) : isCompleted ? (
                      <Link href={`/education/${test.id}`} className="w-full sm:w-auto">
                        <Button variant="secondary" size="sm" className="w-full bg-white/10 hover:bg-white/20 text-white border-white/10">Sonuç</Button>
                    </Link>
                ) : (
                    <Link href={`/education/${test.id}`} className="w-full sm:w-auto">
                         <Button size="sm" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20">
                            Çöz <ChevronRight className="w-3.5 h-3.5 ml-1"/>
                         </Button>
                    </Link>
                )}
                
                <div className="flex gap-1 w-full sm:w-auto justify-end">
                    <Link href={`/education/management/questions?edit=${test.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg">
                            <Edit className="w-4 h-4" />
                        </Button>
                    </Link>
                    
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                             <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-slate-900 border-white/10 text-slate-100">
                            <AlertDialogHeader>
                                <AlertDialogTitle>Ödevi Sil</AlertDialogTitle>
                                <AlertDialogDescription className="text-slate-400">"{test.title}" ödevini kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-200">İptal</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDelete(test.id)} className="bg-rose-600 hover:bg-rose-700 text-white">Evet, Sil</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
        </div>
    );
}