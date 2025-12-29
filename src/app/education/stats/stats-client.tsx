"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Sigma, Check, X, Percent, ArrowUpDown, Search, Target, TrendingUp, AlertCircle, Award, ListFilter, Filter, LayoutGrid, BookOpen, RotateCcw } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell, LabelList, PieChart, Pie } from "recharts";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useAuth } from "@/components/auth-provider";
import { onTestsUpdate, onBankQuestionsUpdate, onPracticeExamsUpdate, onTrackedBooksUpdate } from "@/lib/dataService";
import { Test, BankQuestion, PracticeExam, Topic, TrackedBook } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getCategoryName } from "@/app/education/page";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// --- DESIGN SYSTEM: Glassmorphism Colors ---
const glassColors = {
    HEADER_BG: "bg-slate-950/70 backdrop-blur-lg border-b border-white/5",
    CARD_BG: "bg-white/5 border border-white/10 shadow-lg backdrop-blur-md",
    ICON_BOX: "bg-gradient-to-br p-2.5 rounded-xl shadow-lg",
    BUTTON_GLASS: "bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow-sm",
    INPUT_BG: "bg-slate-900/50 border-white/10 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500/50",
    TABLE_HEADER: "bg-white/5 text-slate-300",
    TABLE_ROW_HOVER: "hover:bg-white/5 transition-colors",
};

type TestTypeFilter = 'all' | 'bank' | 'trackedBook' | 'exam' | 'json';
type SortKey = keyof Test | null;

export default function StatsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const studentId = searchParams.get('studentId');

  const { familyMembers } = useAuth();
  const [tests, setTests] = React.useState<Test[]>([]);
  const [bankQuestions, setBankQuestions] = React.useState<BankQuestion[]>([]);
  const [practiceExams, setPracticeExams] = React.useState<PracticeExam[]>([]);
  const [trackedBooks, setTrackedBooks] = React.useState<TrackedBook[]>([]);
  const [loading, setLoading] = React.useState(true);
  
  // Filtre State'leri
  const [activeTestType, setActiveTestType] = React.useState<TestTypeFilter>('all');
  const [selectedSubject, setSelectedSubject] = React.useState<string>('all');
  const [selectedSource, setSelectedSource] = React.useState<string>('all'); // Kitap/Deneme ID'si
  const [searchTerm, setSearchTerm] = React.useState('');
  
  // Sıralama State'i
  const [sortKey, setSortKey] = React.useState<SortKey>('assignedDate');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');

  const student = React.useMemo(() => familyMembers.find(m => m.id === studentId), [familyMembers, studentId]);

  React.useEffect(() => {
    if (!studentId) {
      setLoading(false);
      return;
    };
    
    const unsubTests = onTestsUpdate(allTests => {
      setTests(allTests.filter(t => t.studentId === studentId && t.status === 'Sonuçlandı'));
      setLoading(false);
    });
    const unsubBanks = onBankQuestionsUpdate(setBankQuestions);
    const unsubExams = onPracticeExamsUpdate(setPracticeExams);
    const unsubBooks = onTrackedBooksUpdate(setTrackedBooks);

    return () => {
      unsubTests();
      unsubBanks();
      unsubExams();
      unsubBooks();
    };
  }, [studentId]);

  // --- ANA MANTIK: FİLTRELEME & VERİ HAZIRLAMA ---
  const { filteredTests, chartData, topicStats, sourceOptions, subjectOptions, isTopicView } = React.useMemo(() => {
    
    // 1. Zenginleştirme (Topic & Source Names)
    const enrichedTests = tests.map(test => {
        let sourceId = 'unknown';
        let sourceName = 'Bilinmeyen Kaynak';
        let topicName = "Genel";
        let subjectName = getCategoryName(test);

        if (test.sourceType === 'trackedBook') {
            const book = trackedBooks.find(b => b.subjects.some(s => s.topics.some(t => t.id === test.topicId)));
            if (book) {
                sourceId = book.id;
                sourceName = book.title;
            }
        } else if (test.sourceType === 'exam') {
             const exam = practiceExams.find(e => e.id === test.sourceId);
             if (exam) {
                 sourceId = exam.id;
                 sourceName = exam.title;
             } else {
                 sourceId = test.sourceId || test.title;
                 sourceName = test.title;
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

        return { ...test, _sourceId: sourceId, _sourceName: sourceName, _topicName: topicName, _subjectName: subjectName };
    });

    // 2. Filtreleme (Tablo ve Grafikler için ortak veri)
    const filtered = enrichedTests.filter(test => {
        if (activeTestType !== 'all' && test.sourceType !== activeTestType) return false;
        if (selectedSubject !== 'all' && test._subjectName !== selectedSubject) return false;
        if (selectedSource !== 'all' && test._sourceId !== selectedSource) return false;
        if (searchTerm && !test.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });

    // 3. Dropdown Seçenekleri
    const uniqueSubjects = Array.from(new Set(enrichedTests.map(t => t._subjectName))).sort();
    const uniqueSources = Array.from(new Set(
        enrichedTests
            .filter(t => activeTestType === 'all' || t.sourceType === activeTestType)
            .map(t => JSON.stringify({ id: t._sourceId, name: t._sourceName }))
    )).map(s => JSON.parse(s));


    // 4. Grafik Verisi Hazırlama (Dinamik)
    const isTopicMode = selectedSubject !== 'all';
    
    const statsMap = new Map<string, { total: number, correct: number, name: string }>();

    filtered.forEach(t => {
        const key = isTopicMode ? (t._topicName || 'Genel') : t._subjectName;
        
        const current = statsMap.get(key) || { total: 0, correct: 0, name: key };
        current.total += t.questionCount || 0;
        current.correct += t.correctAnswers || 0;
        statsMap.set(key, current);
    });

    const chartData = Array.from(statsMap.values()).map(d => ({
        ...d,
        successRate: d.total > 0 ? (d.correct / d.total) * 100 : 0
    })).sort((a, b) => b.successRate - a.successRate);


    // 5. Konu İstatistikleri
    const topicMap = new Map<string, { total: number, correct: number, subject: string, name: string }>();
    filtered.forEach(t => {
        if (t.topicId) { 
             const key = t.topicId;
             const current = topicMap.get(key) || { total: 0, correct: 0, subject: t._subjectName, name: t._topicName };
             current.total += t.questionCount || 0;
             current.correct += t.correctAnswers || 0;
             topicMap.set(key, current);
        }
    });
    const topicStatsData = Array.from(topicMap.values()).map(d => ({
        ...d,
        successRate: d.total > 0 ? (d.correct / d.total) * 100 : 0
    })).sort((a,b) => b.successRate - a.successRate);


    return {
        filteredTests: filtered,
        chartData: chartData, 
        topicStats: topicStatsData, 
        sourceOptions: uniqueSources,
        subjectOptions: uniqueSubjects,
        isTopicView: isTopicMode
    };

  }, [tests, trackedBooks, practiceExams, activeTestType, selectedSubject, selectedSource, searchTerm]);


  const sortedTests = React.useMemo(() => {
    const sorted = [...filteredTests];
    if (sortKey) {
        sorted.sort((a, b) => {
            // @ts-ignore
            const valA = a[sortKey];
            // @ts-ignore
            const valB = b[sortKey];
            
            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }
    return sorted;
  }, [filteredTests, sortKey, sortDirection]);


  const handleSort = (key: SortKey) => {
      if (sortKey === key) {
          setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
      } else {
          setSortKey(key);
          setSortDirection('desc');
      }
  }

  // --- CHART CONFIG ---
  const barChartConfig = {
    successRate: { label: "Başarı %", color: "hsl(var(--primary))" },
  } satisfies ChartConfig;

  const pieChartData = [
      { name: "Doğru", value: filteredTests.reduce((acc, t) => acc + (t.correctAnswers || 0), 0), fill: "#22c55e" },
      { name: "Yanlış", value: filteredTests.reduce((acc, t) => acc + (t.incorrectAnswers || 0), 0), fill: "#ef4444" },
      { name: "Boş", value: filteredTests.reduce((acc, t) => acc + (t.emptyAnswers || 0), 0), fill: "#94a3b8" },
  ];

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-950"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div></div>;
  
  if (!student) return <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-slate-400"><p>Öğrenci bulunamadı.</p><Button variant="link" onClick={() => router.back()} className="text-indigo-400">Geri Dön</Button></div>;
  
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden flex flex-col">
        {/* BACKGROUND */}
        <div className="fixed inset-0 bg-slate-950 -z-50" />
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[20%] left-[-5%] w-[400px] h-[400px] bg-purple-900/20 rounded-full blur-[120px]" />
        </div>

        {/* HEADER */}
        <div className={cn("sticky top-0 z-40 w-full transition-all duration-300", glassColors.HEADER_BG)}>
            <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button onClick={() => router.back()} variant="ghost" size="icon" className="rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors -ml-2">
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div className={cn("from-indigo-500 to-purple-600", glassColors.ICON_BOX)}>
                         <Target className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-slate-100 leading-none">
                            {student.name}
                        </h1>
                        <p className="text-xs font-medium text-slate-400 mt-0.5">Başarı İstatistikleri</p>
                    </div>
                </div>
            </div>
        </div>
      
      <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 relative z-10 flex flex-col min-h-0 space-y-6">
        
        {/* --- FILTERS --- */}
        <div className={cn("p-4 rounded-3xl flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center", glassColors.CARD_BG)}>
             <div className="flex gap-2 items-center flex-wrap w-full lg:w-auto">
                <div className="flex items-center gap-2 text-slate-400 text-sm font-medium mr-2">
                    <Filter className="w-4 h-4" /> Filtreler:
                </div>
                <Tabs value={activeTestType} onValueChange={(v) => { setActiveTestType(v as TestTypeFilter); setSelectedSource('all'); }}>
                    <TabsList className="p-1 h-9 bg-white/5 border border-white/10 rounded-lg">
                        <TabsTrigger value="all" className="text-xs h-7 px-3 rounded-md">Tümü</TabsTrigger>
                        <TabsTrigger value="bank" className="text-xs h-7 px-3 rounded-md">S. Bankası</TabsTrigger>
                        <TabsTrigger value="trackedBook" className="text-xs h-7 px-3 rounded-md">Kitap</TabsTrigger>
                        <TabsTrigger value="exam" className="text-xs h-7 px-3 rounded-md">Deneme</TabsTrigger>
                        <TabsTrigger value="json" className="text-xs h-7 px-3 rounded-md">Yazılı</TabsTrigger>
                    </TabsList>
                </Tabs>

                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger className="w-[140px] h-9 rounded-lg bg-white/5 border-white/10 text-xs">
                        <SelectValue placeholder="Ders Seçin" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-slate-100">
                        <SelectItem value="all">Tüm Dersler</SelectItem>
                        {subjectOptions.map(sub => <SelectItem key={sub} value={sub}>{sub}</SelectItem>)}
                    </SelectContent>
                </Select>

                {sourceOptions.length > 0 && (
                    <Select value={selectedSource} onValueChange={setSelectedSource}>
                        <SelectTrigger className="w-[180px] h-9 rounded-lg bg-white/5 border-white/10 text-xs">
                            <SelectValue placeholder="Kaynak Seçin" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-slate-100">
                            <SelectItem value="all">Tüm Kaynaklar</SelectItem>
                            {sourceOptions.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                )}
             </div>

             <div className="relative w-full lg:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input 
                    placeholder="Test ara..."
                    className={cn("pl-10 h-9 text-sm rounded-lg", glassColors.INPUT_BG)}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        {/* --- KPI CARDS --- */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <Card className={cn("flex flex-col justify-center items-center text-center py-4", glassColors.CARD_BG)}>
                <div className="p-3 rounded-full bg-blue-500/20 mb-2"><Sigma className="h-6 w-6 text-blue-400" /></div>
                <div className="text-3xl font-black text-white">{filteredTests.reduce((acc, t) => acc + (t.questionCount || 0), 0)}</div>
                <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Toplam Soru</div>
            </Card>
            <Card className={cn("flex flex-col justify-center items-center text-center py-4", glassColors.CARD_BG)}>
                <div className="p-3 rounded-full bg-emerald-500/20 mb-2"><Check className="h-6 w-6 text-emerald-400" /></div>
                <div className="text-3xl font-black text-emerald-400">{filteredTests.reduce((acc, t) => acc + (t.correctAnswers || 0), 0)}</div>
                <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Doğru</div>
            </Card>
            <Card className={cn("flex flex-col justify-center items-center text-center py-4", glassColors.CARD_BG)}>
                <div className="p-3 rounded-full bg-rose-500/20 mb-2"><X className="h-6 w-6 text-rose-400" /></div>
                <div className="text-3xl font-black text-rose-400">{filteredTests.reduce((acc, t) => acc + (t.incorrectAnswers || 0), 0)}</div>
                <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Yanlış</div>
            </Card>
            <Card className={cn("flex flex-col justify-center items-center text-center py-4", glassColors.CARD_BG)}>
                <div className="p-3 rounded-full bg-indigo-500/20 mb-2"><Percent className="h-6 w-6 text-indigo-400" /></div>
                <div className="text-3xl font-black text-indigo-400">
                    {(() => {
                        const totalQ = filteredTests.reduce((acc, t) => acc + (t.questionCount || 0), 0);
                        const totalC = filteredTests.reduce((acc, t) => acc + (t.correctAnswers || 0), 0);
                        return totalQ > 0 ? `%${((totalC / totalQ) * 100).toFixed(0)}` : '%0';
                    })()}
                </div>
                <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Başarı</div>
            </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* PERFORMANCE CHART */}
            <Card className={cn("lg:col-span-2 flex flex-col", glassColors.CARD_BG)}>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-slate-100 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-indigo-400"/> 
                                {isTopicView ? "Konu Bazlı Başarı" : "Ders Bazlı Başarı"}
                            </CardTitle>
                            <CardDescription className="text-slate-400 mt-1">
                                {isTopicView ? `${selectedSubject} dersindeki konuların analizi.` : "Genel ders başarısı. Detaylar için sütunlara tıklayın."}
                            </CardDescription>
                        </div>
                        {isTopicView && (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setSelectedSubject('all')}
                                className="border-indigo-500/30 text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 h-8 text-xs"
                            >
                                <RotateCcw className="w-3.5 h-3.5 mr-1.5"/> Tüm Derslere Dön
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="flex-1 min-h-[300px]">
                    <ChartContainer config={barChartConfig} className="w-full h-[300px]">
                        <BarChart 
                          data={chartData} 
                          layout="vertical" 
                          margin={{ left: 0, right: 30, top: 10, bottom: 10 }}
                          onClick={(data) => {
                            if (!isTopicView && data && data.activePayload && data.activePayload[0]) {
                                const subjectName = data.activePayload[0].payload.name;
                                setSelectedSubject(subjectName); // Chart'a tıklayınca derse drill-down yap
                            }
                          }}
                        >
                            <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.1)" />
                            <YAxis 
                                dataKey="name" 
                                type="category" 
                                tickLine={false} 
                                axisLine={false} 
                                width={120} 
                                tick={{fill: '#94a3b8', fontSize: 11}} 
                            />
                            <XAxis type="number" hide domain={[0, 100]} />
                            <ChartTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} content={<ChartTooltipContent indicator="line" />} />
                            <Bar 
                                dataKey="successRate" 
                                name="Başarı %" 
                                radius={[0, 4, 4, 0]} 
                                barSize={32} 
                                className={cn("cursor-pointer transition-all hover:opacity-80")}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={`hsl(${220 + (index * 15)}, 70%, 60%)`} />
                                ))}
                                <LabelList dataKey="successRate" position="right" formatter={(val: number) => `${val.toFixed(0)}%`} className="fill-slate-300 text-xs font-bold" />
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>

            {/* QUESTION DISTRIBUTION CHART */}
            <Card className={cn("flex flex-col", glassColors.CARD_BG)}>
                <CardHeader>
                    <CardTitle className="text-slate-100 text-center">Soru Dağılımı</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center min-h-[300px]">
                    <div className="relative w-full h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieChartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} stroke="rgba(0,0,0,0)" />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                                    itemStyle={{ color: '#f8fafc' }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[60%] text-center pointer-events-none">
                            <span className="text-3xl font-black text-slate-100">{filteredTests.reduce((acc, t) => acc + (t.questionCount || 0), 0)}</span>
                            <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Toplam</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* TOPIC ANALYSIS (GÜÇLÜ/ZAYIF YÖNLER) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Card className={glassColors.CARD_BG}>
                <CardHeader className="pb-3">
                    <CardTitle className="text-slate-100 flex items-center gap-2 text-base"><Award className="w-5 h-5 text-yellow-400"/> En Güçlü Konular</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {topicStats.filter(t => t.successRate >= 80).slice(0, 5).map((topic, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                            <div>
                                <p className="font-semibold text-emerald-200 text-sm">{topic.name}</p>
                                <p className="text-xs text-emerald-400/70">{topic.subject}</p>
                            </div>
                            <Badge className="bg-emerald-500 text-white border-0">%{topic.successRate.toFixed(0)}</Badge>
                        </div>
                    ))}
                    {topicStats.filter(t => t.successRate >= 80).length === 0 && <p className="text-center text-slate-500 text-sm py-4">Henüz yeterli veri yok.</p>}
                </CardContent>
            </Card>

            <Card className={glassColors.CARD_BG}>
                <CardHeader className="pb-3">
                    <CardTitle className="text-slate-100 flex items-center gap-2 text-base"><AlertCircle className="w-5 h-5 text-rose-400"/> Geliştirilmesi Gerekenler</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {topicStats.filter(t => t.successRate < 70 && t.total > 0).sort((a,b) => a.successRate - b.successRate).slice(0, 5).map((topic, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                            <div>
                                <p className="font-semibold text-rose-200 text-sm">{topic.name}</p>
                                <p className="text-xs text-rose-400/70">{topic.subject}</p>
                            </div>
                            <Badge variant="destructive" className="bg-rose-500 text-white border-0">%{topic.successRate.toFixed(0)}</Badge>
                        </div>
                    ))}
                    {topicStats.filter(t => t.successRate < 70 && t.total > 0).length === 0 && <p className="text-center text-slate-500 text-sm py-4">Tebrikler! Zayıf konu bulunamadı.</p>}
                </CardContent>
            </Card>
        </div>
      
        {/* TESTS TABLE */}
        <Card className={glassColors.CARD_BG}>
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <CardTitle className="text-slate-100">Test Sonuçları</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
             <div className="overflow-x-auto">
                <Table>
                    <TableHeader className={glassColors.TABLE_HEADER}>
                        <TableRow className="border-white/5 hover:bg-transparent">
                            <TableHead className="text-slate-400"><Button variant="ghost" onClick={() => handleSort('title')} className="h-8 text-xs font-bold hover:text-white">TEST ADI <ArrowUpDown className="ml-1 h-3 w-3" /></Button></TableHead>
                            <TableHead className="text-center text-slate-400"><Button variant="ghost" onClick={() => handleSort('questionCount')} className="h-8 text-xs font-bold hover:text-white">TOPLAM <ArrowUpDown className="ml-1 h-3 w-3" /></Button></TableHead>
                            <TableHead className="text-center text-slate-400"><Button variant="ghost" onClick={() => handleSort('correctAnswers')} className="h-8 text-xs font-bold hover:text-white">DOĞRU <ArrowUpDown className="ml-1 h-3 w-3" /></Button></TableHead>
                            <TableHead className="text-center text-slate-400"><Button variant="ghost" onClick={() => handleSort('incorrectAnswers')} className="h-8 text-xs font-bold hover:text-white">YANLIŞ <ArrowUpDown className="ml-1 h-3 w-3" /></Button></TableHead>
                            <TableHead className="text-center text-slate-400"><Button variant="ghost" onClick={() => handleSort('emptyAnswers')} className="h-8 text-xs font-bold hover:text-white">BOŞ <ArrowUpDown className="ml-1 h-3 w-3" /></Button></TableHead>
                            <TableHead className="text-right text-slate-400 pr-6"><Button variant="ghost" onClick={() => handleSort('score')} className="h-8 text-xs font-bold hover:text-white">PUAN <ArrowUpDown className="ml-1 h-3 w-3" /></Button></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedTests.length > 0 ? sortedTests.map(test => (
                            <TableRow key={test.id} className={cn("border-white/5 cursor-pointer", glassColors.TABLE_ROW_HOVER)} onClick={() => router.push(`/education/${test.id}`)}>
                                <TableCell className="font-medium text-slate-200">
                                    {test.title}
                                    <div className="flex gap-2 text-[10px] text-slate-500 mt-0.5">
                                        <span className="bg-white/5 px-1.5 py-0.5 rounded">{test._subjectName}</span>
                                        {test._topicName && <span className="text-indigo-400">{test._topicName}</span>}
                                    </div>
                                </TableCell>
                                <TableCell className="text-center text-slate-200 font-bold">{test.questionCount}</TableCell>
                                <TableCell className="text-center text-emerald-400 font-bold">{test.correctAnswers}</TableCell>
                                <TableCell className="text-center text-rose-400 font-bold">{test.incorrectAnswers}</TableCell>
                                <TableCell className="text-center text-slate-400">{test.emptyAnswers}</TableCell>
                                <TableCell className="text-right pr-6">
                                    <Badge variant="outline" className={cn(
                                        "bg-white/5 border-white/10",
                                        (test.score || 0) >= 80 ? "text-emerald-400 border-emerald-500/30" : 
                                        (test.score || 0) >= 50 ? "text-yellow-400 border-yellow-500/30" : "text-rose-400 border-rose-500/30"
                                    )}>
                                        {test.score?.toFixed(0) || 0}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                    Kayıt bulunamadı.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}