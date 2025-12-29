
"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { onTestsUpdate, deleteTest, onTrackedBooksUpdate } from "@/lib/dataService";
import { useAuth } from "@/components/auth-provider";
import { Test, TrackedBook } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, CalendarClock, Hourglass, CheckCircle, X as XIcon, MinusCircle, BookOpen, GraduationCap, LayoutGrid, BarChart3, TrendingDown, TrendingUp, Filter } from "lucide-react";
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
};

type TestTypeFilter = 'all' | 'bank' | 'trackedBook' | 'exam' | 'json';


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

  const student = React.useMemo(() => 
    studentId ? familyMembers.find(m => m.id === studentId) : null,
  [familyMembers, studentId]);

  React.useEffect(() => {
    const unsubscribeTests = onTestsUpdate((tests) => {
        setAllTests(tests);
        setLoading(false);
    }, false, 'assignedDate', 'desc');
    
    // Only fetch trackedBooks if we might need them for filtering
    const unsubscribeTrackedBooks = onTrackedBooksUpdate(setTrackedBooks);
    
    return () => {
        unsubscribeTests();
        unsubscribeTrackedBooks();
    };
  }, []);

  const { pendingTests, completedTests, topicStats } = React.useMemo(() => {
    const filteredByCategory = allTests.filter(test => {
        const testCategory = getCategoryName(test);
        return testCategory === categoryName;
    });

    const filteredByStudent = studentId 
        ? filteredByCategory.filter(test => test.studentId === studentId)
        : filteredByCategory;

    const pending = filteredByStudent.filter(t => t.status === 'Atandı' || t.status === 'Değerlendirme Bekliyor');
    
    const completedRaw = filteredByStudent
      .filter(t => t.status === 'Sonuçlandı');

    // Sub-filtering for topic analysis
    const analysisTests = completedRaw.filter(test => {
        if (activeTestType === 'all') return true;
        if (activeTestType === 'trackedBook' && selectedSubCategory !== 'all') {
            return test.sourceType === 'trackedBook' && test.sourceId === selectedSubCategory;
        }
        return test.sourceType === activeTestType;
    });
      
    const completed = completedRaw.sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt) : parse(a.dueDate, 'dd MMMM yyyy', new Date(), { locale: tr });
        const dateB = b.updatedAt ? new Date(b.updatedAt) : parse(b.dueDate, 'dd MMMM yyyy', new Date(), { locale: tr });
        return compareDesc(dateA, dateB);
      });
      
    // Konu Analizi
    const statsByTopic: { [topicId: string]: { name: string, correct: number, incorrect: number, empty: number, total: number } } = {};
    const allTopicsFromBooks = trackedBooks.flatMap(book => book.subjects.flatMap(s => s.topics.map(t => ({...t, subjectName: s.name}))));

    analysisTests.forEach(test => {
        if (test.topicId) {
            if (!statsByTopic[test.topicId]) {
                const topicInfo = allTopicsFromBooks.find(t => t.id === test.topicId);
                statsByTopic[test.topicId] = { 
                    name: topicInfo?.name || "Bilinmeyen Konu", 
                    correct: 0, 
                    incorrect: 0, 
                    empty: 0, 
                    total: 0 
                };
            }
            statsByTopic[test.topicId].correct += (test.correctAnswers || 0);
            statsByTopic[test.topicId].incorrect += (test.incorrectAnswers || 0);
            statsByTopic[test.topicId].empty += (test.emptyAnswers || 0);
            statsByTopic[test.topicId].total += (test.questionCount || 0);
        }
    });

    const calculatedTopicStats = Object.values(statsByTopic)
        .map(stat => ({
            ...stat,
            successRate: stat.total > 0 ? (stat.correct / stat.total) * 100 : 0
        }))
        .sort((a, b) => b.successRate - a.successRate);

    return {
        pendingTests: pending,
        completedTests: completed,
        topicStats: calculatedTopicStats
    };
  }, [allTests, categoryName, studentId, trackedBooks, activeTestType, selectedSubCategory]);

  const subCategoryOptions = React.useMemo(() => {
    if (activeTestType === 'trackedBook') {
        const bookIdsInTests = new Set(allTests.filter(t => t.sourceType === 'trackedBook').map(t => t.sourceId));
        return trackedBooks.filter(book => bookIdsInTests.has(book.id));
    }
    // Add other types like 'exam' here if needed
    return [];
  }, [activeTestType, allTests, trackedBooks]);


  const pageTitle = student ? `${student.name} - ${categoryName}` : `${categoryName} Testleri`;


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
                         <LayoutGrid className="w-6 w-6 text-white" />
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
                                const allTopics = trackedBooks.flatMap(book => (book.subjects || []).flatMap(subject => subject.topics || []));
                                const topicName = allTopics.find(t => t.id === test.topicId)?.name;
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
                     {completedTests.length > 0 ? (
                        <>
                            <div className={cn("p-4 sm:p-6 rounded-3xl", glassColors.CARD_BG)}>
                                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-5">
                                    <h3 className="text-xl font-bold text-slate-200 flex items-center gap-3">
                                        <BarChart3 className="w-6 h-6 text-indigo-400"/>
                                        Konu Analizi
                                    </h3>
                                    <div className="flex gap-2 items-center flex-wrap">
                                        <Tabs value={activeTestType} onValueChange={(value) => { setActiveTestType(value as TestTypeFilter); setSelectedSubCategory('all'); }} className="w-full sm:w-auto">
                                            <TabsList className="p-1 h-9 bg-white/5 border border-white/10 rounded-lg">
                                                <TabsTrigger value="all" className="text-xs h-7 px-3 rounded-md">Tümü</TabsTrigger>
                                                <TabsTrigger value="bank" className="text-xs h-7 px-3 rounded-md">S. Bankası</TabsTrigger>
                                                <TabsTrigger value="trackedBook" className="text-xs h-7 px-3 rounded-md">Kitap</TabsTrigger>
                                                <TabsTrigger value="exam" className="text-xs h-7 px-3 rounded-md">Deneme</TabsTrigger>
                                                <TabsTrigger value="json" className="text-xs h-7 px-3 rounded-md">Yazılı</TabsTrigger>
                                            </TabsList>
                                        </Tabs>
                                        {activeTestType === 'trackedBook' && subCategoryOptions.length > 0 && (
                                            <Select value={selectedSubCategory} onValueChange={setSelectedSubCategory}>
                                                <SelectTrigger className="w-full sm:w-[180px] h-9 rounded-lg bg-white/5 border-white/10 text-xs">
                                                    <SelectValue placeholder="Kitap Seçin" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-slate-900 border-white/10 text-slate-100">
                                                    <SelectItem value="all">Tüm Kitaplar</SelectItem>
                                                    {subCategoryOptions.map(book => (
                                                        <SelectItem key={book.id} value={book.id}>{book.title}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {topicStats.length > 0 ? topicStats.map(stat => {
                                        const TrendIcon = stat.successRate >= 75 ? TrendingUp : TrendingDown;
                                        const trendColor = stat.successRate >= 75 ? 'text-emerald-400' : 'text-rose-400';
                                        return (
                                                <div key={stat.name} className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                                                <div className="flex justify-between items-start mb-2">
                                                        <p className="font-bold text-slate-100 pr-4">{stat.name}</p>
                                                        <div className={cn("flex items-center text-sm font-bold gap-1", trendColor)}>
                                                        <TrendIcon className="w-4 h-4" />
                                                        %{stat.successRate.toFixed(0)}
                                                        </div>
                                                </div>
                                                <Progress value={stat.successRate} className="h-2 bg-slate-800" indicatorClassName={cn(stat.successRate >= 75 ? 'bg-emerald-500' : 'bg-rose-500')}/>
                                                <div className="flex justify-end gap-3 text-xs font-medium mt-2 text-slate-400">
                                                        <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-500"/> {stat.correct}D</span>
                                                        <span className="flex items-center gap-1"><XIcon className="w-3 h-3 text-rose-500"/> {stat.incorrect}Y</span>
                                                        <span className="flex items-center gap-1"><MinusCircle className="w-3 h-3 text-slate-500"/> {stat.empty}B</span>
                                                </div>
                                                </div>
                                        )
                                    }) : (
                                        <div className="md:col-span-2 text-center py-10 text-slate-500 text-sm">
                                            Bu filtre için analiz edilecek konu verisi bulunamadı.
                                        </div>
                                    )}
                                </div>
                            </div>

                             <div className="space-y-4">
                                <h3 className="text-xl font-bold text-slate-200 px-2">Tamamlanan Testler</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {completedTests.map((test) => {
                                        const allTopics = trackedBooks.flatMap(book => (book.subjects || []).flatMap(subject => subject.topics || []));
                                        const topicName = allTopics.find(t => t.id === test.topicId)?.name;
                                        return <SingleStudentTestCard key={test.id} test={test} topicName={topicName} />
                                    })}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10 m-auto max-w-lg w-full">
                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
                                <CheckCircle className="h-8 w-8 text-slate-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-200">Tamamlanan Yok</h3>
                                <p className="text-slate-400 mt-1 text-sm">Henüz tamamlanmış bir sınav bulunmuyor.</p>
                            </div>
                        </div>
                    )}
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

