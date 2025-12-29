"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { onTestsUpdate, onTrackedBooksUpdate } from "@/lib/dataService";
import { useAuth } from "@/components/auth-provider";
import { Test, TrackedBook } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, CalendarClock, CheckCircle, X as XIcon, MinusCircle, LayoutGrid, BarChart3, TrendingDown, TrendingUp, List, ChevronRight, Filter, Book, Library, FileText, PenTool } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import { cn } from "@/lib/utils";
import { getCategoryName } from "@/app/education/page";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parse, compareDesc } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


// --- DESIGN SYSTEM: Glassmorphism ---
const glassColors = {
    HEADER_BG: "bg-slate-950/70 backdrop-blur-lg border-b border-white/5",
    CARD_BG: "bg-white/5 border border-white/10 shadow-lg backdrop-blur-md",
    ICON_BOX: "bg-gradient-to-br p-2.5 rounded-xl shadow-lg",
    BUTTON_GLASS: "bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow-sm",
    INPUT_BG: "bg-slate-900/50 border-white/10 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500/50",
    TABLE_HEADER: "bg-white/5 text-slate-400 text-xs uppercase tracking-wider font-medium",
    TABLE_ROW: "hover:bg-white/5 transition-colors border-b border-white/5 last:border-0",
};

type TestTypeFilter = 'all' | 'bank' | 'trackedBook' | 'exam' | 'json';
type ViewMode = 'grid' | 'list';

// Yardımcı: Test tipine göre ikon ve etiket döner
const getSourceTypeInfo = (type: string) => {
    switch (type) {
        case 'trackedBook': return { icon: Book, label: 'Kitap' };
        case 'bank': return { icon: Library, label: 'S. Bankası' };
        case 'exam': return { icon: PenTool, label: 'Deneme' };
        case 'json': return { icon: FileText, label: 'Yazılı' };
        default: return { icon:  LayoutGrid, label: 'Diğer' };
    }
}

export default function CategoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  
  const categoryName = decodeURIComponent(params.categoryName as string);
  const studentId = searchParams.get('studentId');

  const { familyMembers } = useAuth();
  const [allTests, setAllTests] = React.useState<Test[]>([]);
  const [trackedBooks, setTrackedBooks] = React.useState<TrackedBook[]>([]);
  const [loading, setLoading] = React.useState(true);
  
  const [activeTestType, setActiveTestType] = React.useState<TestTypeFilter>('all');
  const [selectedSubCategory, setSelectedSubCategory] = React.useState<string>('all');
  const [viewMode, setViewMode] = React.useState<ViewMode>('list');
  const [selectedTopicId, setSelectedTopicId] = React.useState<string | null>(null);

  const student = React.useMemo(() => 
    studentId ? familyMembers.find(m => m.id === studentId) : null,
  [familyMembers, studentId]);

  React.useEffect(() => {
    const unsubscribeTests = onTestsUpdate((tests) => {
        setAllTests(tests);
        setLoading(false);
    }, false, 'assignedDate', 'desc');
    
    const unsubscribeTrackedBooks = onTrackedBooksUpdate(setTrackedBooks);
    
    return () => {
        unsubscribeTests();
        unsubscribeTrackedBooks();
    };
  }, []);

  // Tip değiştiğinde alt filtreleri sıfırla
  React.useEffect(() => {
      setSelectedSubCategory('all');
      setSelectedTopicId(null);
  }, [activeTestType]);

  // Alt kategori (Kaynak) değiştiğinde konu filtresini sıfırla
  React.useEffect(() => {
      setSelectedTopicId(null);
  }, [selectedSubCategory]);


  // --- VERİ İŞLEME VE ANALİZ ---
  const { pendingTests, completedTests, displayStats, sourceOptions, isSourceViewMode } = React.useMemo(() => {
    
    // 1. Temel Filtreleme (Kategori ve Öğrenci)
    const filteredByCategory = allTests.filter(test => getCategoryName(test) === categoryName);
    const filteredByStudent = studentId 
        ? filteredByCategory.filter(test => test.studentId === studentId)
        : filteredByCategory;

    const pending = filteredByStudent.filter(t => t.status === 'Atandı' || t.status === 'Değerlendirme Bekliyor');
    const completedRaw = filteredByStudent.filter(t => t.status === 'Sonuçlandı');

    // 2. KAYNAK BİLGİSİNİ TESTLERE EKLEME (Helper Logic)
    // Her testin bir "Kaynağı" (Kitap adı, Banka adı, Deneme adı) ve "Konusu" vardır.
    // Bunu standardize ediyoruz.
    const enrichedTests = completedRaw.map(test => {
        let sourceId = 'unknown';
        let sourceName = 'Bilinmeyen Kaynak';

        if (test.sourceType === 'trackedBook') {
            // Kitaplarda konu üzerinden kitabı buluyoruz
            const book = trackedBooks.find(b => b.subjects.some(s => s.topics.some(t => t.id === test.topicId)));
            if (book) {
                sourceId = book.id;
                sourceName = book.title;
            }
        } else {
            // Diğer tiplerde (Bank, Exam, Json) sourceId veya sourceName'i kullanıyoruz.
            // Eğer sourceName yoksa title'ı kullan (Denemeler için genelde title kullanılır)
            sourceId = test.sourceId || test.title; 
            sourceName = (test as any).sourceName || test.title; 
        }

        // Konu adını bul
        let topicName = "Genel";
        if (test.topicId) {
            const allTopics = trackedBooks.flatMap(b => b.subjects.flatMap(s => s.topics));
            const foundTopic = allTopics.find(t => t.id === test.topicId);
            if (foundTopic) topicName = foundTopic.name;
        }

        return { ...test, _sourceId: sourceId, _sourceName: sourceName, _topicName: topicName };
    });

    // 3. FİLTRE SEÇENEKLERİNİ OLUŞTURMA (Dropdown İçin)
    // Sadece mevcut sekmedeki testlerin kaynaklarını topla
    const uniqueSources = Array.from(new Set(
        enrichedTests
            .filter(t => activeTestType === 'all' || t.sourceType === activeTestType)
            .map(t => JSON.stringify({ id: t._sourceId, name: t._sourceName }))
    )).map(s => JSON.parse(s));


    // 4. TESTLERİ FİLTRELEME
    const filteredTests = enrichedTests.filter(test => {
        // Tip Filtresi
        if (activeTestType !== 'all' && test.sourceType !== activeTestType) return false;
        
        // Kaynak (SubCategory) Filtresi
        if (selectedSubCategory !== 'all' && test._sourceId !== selectedSubCategory) return false;

        return true;
    });


    // 5. İSTATİSTİK HESAPLAMA MODU
    // Eğer belirli bir kaynak seçilmediyse (selectedSubCategory === 'all') -> KAYNAKLARI Listele
    // Eğer bir kaynak seçildiyse -> KONULARI Listele
    const isSourceMode = selectedSubCategory === 'all';
    
    const statsMap: { [key: string]: { id: string, name: string, type: string, correct: number, incorrect: number, empty: number, total: number } } = {};

    filteredTests.forEach(test => {
        let groupKey: string;
        let groupName: string;
        let groupType = isSourceMode ? 'source' : 'topic'; // Kartın tipini belirle

        if (isSourceMode) {
            // Kaynak Modu: Gruplama ID'si Kaynak ID'si
            groupKey = test._sourceId;
            groupName = test._sourceName;
        } else {
            // Konu Modu: Gruplama ID'si Topic ID (yoksa 'unknown')
            groupKey = test.topicId || 'unknown';
            groupName = test._topicName;
        }

        if (!statsMap[groupKey]) {
            statsMap[groupKey] = { 
                id: groupKey,
                name: groupName,
                type: groupType,
                correct: 0, 
                incorrect: 0, 
                empty: 0, 
                total: 0 
            };
        }
        statsMap[groupKey].correct += (test.correctAnswers || 0);
        statsMap[groupKey].incorrect += (test.incorrectAnswers || 0);
        statsMap[groupKey].empty += (test.emptyAnswers || 0);
        statsMap[groupKey].total += (test.questionCount || 0);
    });

    const calculatedStats = Object.values(statsMap)
        .map(stat => ({
            ...stat,
            successRate: stat.total > 0 ? (stat.correct / stat.total) * 100 : 0
        }))
        .sort((a, b) => b.successRate - a.successRate);


    // 6. SON LİSTE FİLTRESİ (Konu Seçimi Varsa)
    // Aşağıdaki tablo/liste, yukarıdaki "Konu" kartına tıklanırsa daha da filtrelenir.
    const finalTestsList = filteredTests.filter(test => {
        if (!isSourceMode && selectedTopicId) {
            // Sadece konu modundaysak konu filtresini uygula
            return (test.topicId || 'unknown') === selectedTopicId;
        }
        return true;
    });

    // Sıralama
    const sortedFinalTests = finalTestsList.sort((a, b) => {
        const dateA = (a as any).updatedAt ? new Date((a as any).updatedAt) : parse(a.dueDate, 'dd MMMM yyyy', new Date(), { locale: tr });
        const dateB = (b as any).updatedAt ? new Date((b as any).updatedAt) : parse(b.dueDate, 'dd MMMM yyyy', new Date(), { locale: tr });
        return compareDesc(dateA, dateB);
    });

    return {
        pendingTests: pending,
        completedTests: sortedFinalTests,
        displayStats: calculatedStats,
        sourceOptions: uniqueSources,
        isSourceViewMode: isSourceMode
    };
  }, [allTests, categoryName, studentId, trackedBooks, activeTestType, selectedSubCategory, selectedTopicId]); // Dependencies


  const pageTitle = student ? `${student.name} - ${categoryName}` : `${categoryName} Testleri`;
  const getTopicName = (topicId?: string) => { // Table display helper
      if(!topicId) return undefined;
      const allTopics = trackedBooks.flatMap(book => (book.subjects || []).flatMap(subject => subject.topics || []));
      return allTopics.find(t => t.id === topicId)?.name;
  }


  if (loading) {
     return (
        <div className="flex h-screen items-center justify-center bg-slate-950">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
    );
  }

  if (studentId && !student) {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-slate-400">
             <p>Öğrenci bulunamadı.</p>
             <Button variant="link" onClick={() => router.back()}>Geri Dön</Button>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden flex flex-col">
        {/* FIXED BACKGROUND */}
        <div className="fixed inset-0 bg-slate-950 -z-50" />
        
        {/* AMBIENT BACKGROUND */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[20%] left-[-5%] w-[400px] h-[400px] bg-indigo-900/20 rounded-full blur-[120px]" />
        </div>

        {/* HEADER */}
        <div className={cn("sticky top-0 z-40 w-full transition-all duration-300", glassColors.HEADER_BG)}>
            <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button 
                        onClick={() => router.back()} 
                        variant="ghost" 
                        size="icon"
                        className="rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors -ml-2"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div className={cn("from-purple-500 to-indigo-600", glassColors.ICON_BOX)}>
                         <LayoutGrid className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-slate-100 leading-none truncate max-w-[200px] sm:max-w-md">
                            {pageTitle}
                        </h1>
                        <p className="text-xs font-medium text-slate-400 mt-0.5">Kategori Detayı</p>
                    </div>
                </div>
            </div>
        </div>
      
        <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 relative z-10 flex flex-col min-h-0">
             <Tabs defaultValue="pending" className="w-full space-y-6">
                <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 h-12 p-1 rounded-2xl bg-slate-900/50 border border-white/10 backdrop-blur-md">
                    <TabsTrigger value="pending" className="rounded-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400 hover:text-slate-200 transition-all">Bekleyenler ({pendingTests.length})</TabsTrigger>
                    <TabsTrigger value="completed" className="rounded-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400 hover:text-slate-200 transition-all">Bitenler ({completedTests.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="mt-0 animate-in fade-in zoom-in-95 duration-300">
                    {pendingTests.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {pendingTests.map((test) => {
                                const topicName = getTopicName(test.topicId);
                                return <SingleStudentTestCard key={test.id} test={test} topicName={topicName} />
                            })}
                        </div>
                    ) : (
                         <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10 m-auto max-w-lg w-full">
                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
                                <Clock className="h-8 w-8 text-slate-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-200">Bekleyen Yok</h3>
                                <p className="text-slate-400 mt-1 text-sm">Bu kategoride çözülecek test kalmadı.</p>
                            </div>
                        </div>
                    )}
                </TabsContent>
                
                <TabsContent value="completed" className="mt-0 animate-in fade-in zoom-in-95 duration-300 space-y-8">
                     
                     {/* ÜST İSTATİSTİK VE FİLTRE KARTI */}
                    <div className={cn("p-4 sm:p-6 rounded-3xl", glassColors.CARD_BG)}>
                        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-5">
                            <div className="flex flex-col gap-1">
                                <h3 className="text-xl font-bold text-slate-200 flex items-center gap-3">
                                    <BarChart3 className="w-6 h-6 text-indigo-400"/>
                                    {isSourceViewMode ? "Kaynak Başarısı" : "Konu Analizi"}
                                </h3>
                                
                                {/* Breadcrumb Navigasyonu */}
                                {!isSourceViewMode && (
                                    <div className="flex items-center gap-2 text-xs">
                                        <button 
                                            onClick={() => setSelectedSubCategory('all')} 
                                            className="text-slate-400 hover:text-white hover:underline flex items-center gap-1"
                                        >
                                            <ArrowLeft className="w-3 h-3"/> Tüm Kaynaklar
                                        </button>
                                        <span className="text-slate-600">/</span>
                                        <span className="text-indigo-400 font-medium">
                                            {sourceOptions.find(s => s.id === selectedSubCategory)?.name || "Seçili Kaynak"}
                                        </span>
                                        
                                        {selectedTopicId && (
                                           <>
                                             <span className="text-slate-600">/</span>
                                             <button onClick={() => setSelectedTopicId(null)} className="flex items-center gap-1 text-rose-400 hover:underline">
                                                 <XIcon className="w-3 h-3"/> Temizle
                                             </button>
                                           </>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 items-center flex-wrap">
                                <Tabs value={activeTestType} onValueChange={(value) => setActiveTestType(value as TestTypeFilter)} className="w-full sm:w-auto">
                                    <TabsList className="p-1 h-9 bg-white/5 border border-white/10 rounded-lg">
                                        <TabsTrigger value="all" className="text-xs h-7 px-3 rounded-md">Tümü</TabsTrigger>
                                        <TabsTrigger value="bank" className="text-xs h-7 px-3 rounded-md">S. Bankası</TabsTrigger>
                                        <TabsTrigger value="trackedBook" className="text-xs h-7 px-3 rounded-md">Kitap</TabsTrigger>
                                        <TabsTrigger value="exam" className="text-xs h-7 px-3 rounded-md">Deneme</TabsTrigger>
                                        <TabsTrigger value="json" className="text-xs h-7 px-3 rounded-md">Yazılı</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                                
                                {/* Dinamik Kaynak Seçici */}
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
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {displayStats.length > 0 ? displayStats.map(stat => {
                                const TrendIcon = stat.successRate >= 75 ? TrendingUp : TrendingDown;
                                const trendColor = stat.successRate >= 75 ? 'text-emerald-400' : 'text-rose-400';
                                
                                // Seçili durumu: Kaynak modunda seçim yok (drill-down var), Konu modunda toggle var.
                                const isSelected = !isSourceViewMode && selectedTopicId === stat.id;
                                const Icon = isSourceViewMode ? (activeTestType === 'all' ? LayoutGrid : getSourceTypeInfo(activeTestType).icon) : LayoutGrid;

                                return (
                                        <div 
                                            key={stat.id} 
                                            onClick={() => {
                                                if (isSourceViewMode) {
                                                    // Kaynak modundaysak -> İçine Gir (SubCategory'i set et)
                                                    setSelectedSubCategory(stat.id);
                                                } else {
                                                    // Konu modundaysak -> Filtrele (Topic'i set et)
                                                    setSelectedTopicId(prev => prev === stat.id ? null : stat.id);
                                                }
                                            }}
                                            className={cn(
                                                "p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group",
                                                isSelected 
                                                    ? "bg-indigo-600/20 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)]" 
                                                    : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                                            )}
                                        >
                                            {isSelected && <div className="absolute inset-0 bg-indigo-500/5 pointer-events-none" />}
                                            <div className="flex justify-between items-start mb-2 relative z-10">
                                                    <div className="flex items-center gap-2 pr-4">
                                                        {isSourceViewMode && <Icon className="w-4 h-4 text-indigo-400 shrink-0"/>}
                                                        <p className={cn("font-bold transition-colors line-clamp-1", isSelected ? "text-indigo-200" : "text-slate-100")}>{stat.name}</p>
                                                    </div>
                                                    <div className={cn("flex items-center text-sm font-bold gap-1", trendColor)}>
                                                    <TrendIcon className="w-4 h-4" />
                                                    %{stat.successRate.toFixed(0)}
                                                    </div>
                                            </div>
                                            <Progress 
                                                value={stat.successRate} 
                                                className={cn("h-2", isSelected ? "bg-slate-900/60" : "bg-slate-800")} 
                                                indicatorClassName={cn(stat.successRate >= 75 ? 'bg-emerald-500' : 'bg-rose-500')}
                                            />
                                            <div className="flex justify-end gap-3 text-xs font-medium mt-2 text-slate-400 relative z-10">
                                                    <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-500"/> {stat.correct}D</span>
                                                    <span className="flex items-center gap-1"><XIcon className="w-3 h-3 text-rose-500"/> {stat.incorrect}Y</span>
                                                    <span className="flex items-center gap-1"><MinusCircle className="w-3 h-3 text-slate-500"/> {stat.empty}B</span>
                                            </div>
                                            {/* Drill-down göstergesi (Sadece Kaynak modunda) */}
                                            {isSourceViewMode && (
                                                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ChevronRight className="w-5 h-5 text-slate-400" />
                                                </div>
                                            )}
                                        </div>
                                )
                            }) : (
                                <div className="md:col-span-2 text-center py-10 text-slate-500 text-sm">
                                    Bu filtreye uygun veri bulunamadı.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* LİSTE / GRID GÖRÜNÜMÜ ALANI */}
                    <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex flex-col">
                            <h3 className="text-xl font-bold text-slate-200">Tamamlanan Testler ({completedTests.length})</h3>
                            {/* Filtre Bilgisi Gösterimi */}
                            <div className="flex gap-2 text-[10px] text-indigo-400 mt-1">
                                {selectedSubCategory !== 'all' && (
                                    <span className="bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                                        Kaynak: {sourceOptions.find(s => s.id === selectedSubCategory)?.name}
                                    </span>
                                )}
                                {selectedTopicId && (
                                    <span className="bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                                        Konu: {displayStats.find(s => s.id === selectedTopicId)?.name}
                                    </span>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex bg-slate-900/50 p-1 rounded-lg border border-white/10">
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

                    {completedTests.length > 0 ? (
                        viewMode === 'grid' ? (
                            /* GRID VIEW */
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {completedTests.map((test) => {
                                    return <SingleStudentTestCard key={test.id} test={test} topicName={(test as any)._topicName} />
                                })}
                            </div>
                        ) : (
                            /* LIST VIEW (TABLE) */
                            <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/5 backdrop-blur-md">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr>
                                                <th className={cn("p-4 font-semibold", glassColors.TABLE_HEADER)}>Test Adı & Konu</th>
                                                <th className={cn("p-4 text-center font-semibold", glassColors.TABLE_HEADER)}>Tarih</th>
                                                <th className={cn("p-4 text-center font-semibold", glassColors.TABLE_HEADER)}>Soru</th>
                                                <th className={cn("p-4 text-center font-semibold text-emerald-500", glassColors.TABLE_HEADER)}>Doğru</th>
                                                <th className={cn("p-4 text-center font-semibold text-rose-500", glassColors.TABLE_HEADER)}>Yanlış</th>
                                                <th className={cn("p-4 text-center font-semibold text-slate-400", glassColors.TABLE_HEADER)}>Boş</th>
                                                <th className={cn("p-4 text-right font-semibold", glassColors.TABLE_HEADER)}>İşlem</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {completedTests.map((test) => {
                                                const dateStr = (test as any).updatedAt 
                                                    ? new Date((test as any).updatedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) 
                                                    : test.dueDate;

                                                return (
                                                    <tr key={test.id} className={cn("group cursor-pointer", glassColors.TABLE_ROW)} onClick={() => router.push(`/education/${test.id}`)}>
                                                        <td className="p-4">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-slate-200 group-hover:text-white transition-colors text-sm sm:text-base">{test.title}</span>
                                                                <div className="flex gap-2 items-center mt-0.5">
                                                                     {selectedSubCategory === 'all' && (
                                                                        <span className="text-[10px] text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 truncate max-w-[100px]">
                                                                            {(test as any)._sourceName}
                                                                        </span>
                                                                     )}
                                                                     <span className="text-xs text-slate-500">{(test as any)._topicName}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-center text-sm text-slate-400 whitespace-nowrap">
                                                            {dateStr}
                                                        </td>
                                                        <td className="p-4 text-center">
                                                                <Badge variant="secondary" className="bg-slate-800 text-slate-300 hover:bg-slate-700">{test.questionCount}</Badge>
                                                        </td>
                                                        <td className="p-4 text-center font-bold text-emerald-400 text-sm">
                                                            {test.correctAnswers || 0}
                                                        </td>
                                                        <td className="p-4 text-center font-bold text-rose-400 text-sm">
                                                            {test.incorrectAnswers || 0}
                                                        </td>
                                                        <td className="p-4 text-center font-bold text-slate-500 text-sm">
                                                            {test.emptyAnswers || 0}
                                                        </td>
                                                        <td className="p-4 text-right">
                                                                <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 inline-block transition-colors"/>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )
                    ) : (
                         <div className="flex flex-col items-center justify-center py-10 text-center space-y-4 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10 m-auto w-full">
                            <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center">
                                <Filter className="h-6 w-6 text-slate-500" />
                            </div>
                            <div>
                                <h3 className="text-md font-bold text-slate-200">Test Bulunamadı</h3>
                                <p className="text-slate-400 mt-1 text-xs">Seçilen filtrelere uygun tamamlanmış test yok.</p>
                            </div>
                        </div>
                    )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    </div>
  );
}


function SingleStudentTestCard({ test, topicName }: { test: Test, topicName?: string }) {
    let buttonText = 'Sınava Gir';
    let buttonClass = "bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-500/20";
    let buttonDisabled = false;
    let statusBadge: React.ReactNode = <Badge variant="outline" className="w-fit text-cyan-400 border-cyan-500/30 bg-cyan-500/10">Atandı</Badge>;
    let cardBorder = "border-white/5 hover:border-cyan-500/30";
    
    if (test.status === 'Sonuçlandı') {
        buttonText = 'Sonuçları Göster';
        buttonClass = "bg-pink-600 hover:bg-pink-500 text-white shadow-pink-500/20";
        statusBadge = <Badge variant="outline" className="w-fit text-emerald-400 border-emerald-500/30 bg-emerald-500/10">Çözüldü</Badge>;
        cardBorder = "border-white/5 hover:border-pink-500/30";
    } else if (test.status === 'Değerlendirme Bekliyor') {
        buttonText = 'Değerlendiriliyor...';
        buttonDisabled = true;
        buttonClass = "bg-yellow-600 hover:bg-yellow-500 text-white opacity-80 cursor-not-allowed";
        statusBadge = <Badge variant="outline" className="w-fit text-yellow-400 border-yellow-500/30 bg-yellow-500/10">Değerlendiriliyor</Badge>;
        cardBorder = "border-white/5 hover:border-yellow-500/30";
    }

    const isMistakeTest = test.sourceType === 'mistake';
    const duration = test.durationMinutes || test.questionCount * 1.5;
    const finalTitle = topicName ? `${topicName} - ${test.title}` : test.title;

    return (
        <Card key={test.id} className={cn("flex flex-col shadow-lg overflow-hidden transition-all bg-white/5 backdrop-blur-md group hover:-translate-y-1", cardBorder)}>
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-2 mb-2">
                    <CardTitle title={finalTitle} className="line-clamp-2 text-lg text-slate-200 group-hover:text-white transition-colors">{finalTitle}</CardTitle>
                    {statusBadge}
                </div>
                 <CardDescription className="text-slate-400 text-xs flex items-center gap-2">
                    <CalendarClock className="w-3.5 h-3.5" />
                    <span>{test.assignedDate} - {test.dueDate}</span>
                </CardDescription>
            </CardHeader>
            
            <CardContent className="flex-grow flex items-center justify-between py-2 border-y border-white/5 bg-black/10">
                <div className="text-center px-4 border-r border-white/5 w-1/2">
                    <p className="text-2xl font-black text-white">{test.questionCount}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">SORU</p>
                </div>
                {!isMistakeTest && (
                    <div className="text-center px-4 w-1/2">
                        <p className="text-2xl font-black text-white">{duration}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">DAKİKA</p>
                    </div>
                )}
            </CardContent>
            
            <CardFooter className="p-0 mt-auto">
            <Link href={`/education/${test.id}`} className="w-full">
                <Button 
                    size="lg" 
                    className={cn("w-full rounded-t-none h-12 text-sm font-bold shadow-lg transition-all", buttonClass)}
                    disabled={buttonDisabled}
                >
                {buttonText}
                </Button>
            </Link>
            </CardFooter>
        </Card>
    );
}