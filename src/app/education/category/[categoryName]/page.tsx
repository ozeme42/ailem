
"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { onTestsUpdate, deleteTest, onTrackedBooksUpdate } from "@/lib/dataService";
import { useAuth } from "@/components/auth-provider";
import { Test, TrackedBook } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, CalendarClock, Hourglass, CheckCircle, X as XIcon, MinusCircle, BookOpen, GraduationCap, LayoutGrid } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import { cn } from "@/lib/utils";
import { getCategoryName } from "@/app/education/page";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// --- DESIGN SYSTEM: Glassmorphism ---
const glassColors = {
    HEADER_BG: "bg-slate-950/70 backdrop-blur-lg border-b border-white/5",
    CARD_BG: "bg-white/5 border border-white/10 shadow-lg backdrop-blur-md",
    ICON_BOX: "bg-gradient-to-br p-2.5 rounded-xl shadow-lg",
    BUTTON_GLASS: "bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow-sm",
    INPUT_BG: "bg-slate-900/50 border-white/10 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500/50",
};

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
  
  const student = React.useMemo(() => 
    studentId ? familyMembers.find(m => m.id === studentId) : null,
  [familyMembers, studentId]);

  React.useEffect(() => {
    const unsubscribeTests = onTestsUpdate((tests) => {
        setAllTests(tests);
        setLoading(false);
    }, false, 'assignedDate', 'desc');
    const unsubTrackedBooks = onTrackedBooksUpdate(setTrackedBooks);
    
    return () => {
        unsubscribeTests();
        unsubTrackedBooks();
    };
  }, []);

  const filteredTests = React.useMemo(() => {
    return allTests.filter(test => {
        const testCategory = getCategoryName(test);
        const categoryMatch = testCategory === categoryName;
        const studentMatch = !studentId || test.studentId === studentId;
        return categoryMatch && studentMatch;
    });
  }, [allTests, categoryName, studentId]);


  const pageTitle = student ? `${student.name} - ${categoryName}` : `${categoryName} Testleri`;

  const pendingTests = filteredTests.filter(t => t.status === 'Atandı' || t.status === 'Değerlendirme Bekliyor');
  const completedTests = filteredTests.filter(t => t.status === 'Sonuçlandı');


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
                
                <TabsContent value="completed" className="mt-0 animate-in fade-in zoom-in-95 duration-300">
                     {completedTests.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {completedTests.map((test) => {
                                const allTopics = trackedBooks.flatMap(book => (book.subjects || []).flatMap(subject => subject.topics || []));
                                const topicName = allTopics.find(t => t.id === test.topicId)?.name;
                                return <SingleStudentTestCard key={test.id} test={test} topicName={topicName} />
                            })}
                        </div>
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


    

    