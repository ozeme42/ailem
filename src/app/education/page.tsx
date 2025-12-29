"use client";

import * as React from "react";
import Link from "next/link";
import { 
    PlusCircle, Clock, FileText, Settings, BarChart3, CheckCircle2, 
    XCircle, MinusCircle, Ruler, TestTube2, BookCopy, Globe, 
    MessageSquare, Gamepad2, ClipboardList, ArrowRight, BookHeart, 
    Calendar as CalendarIcon, ChevronLeft, ChevronRight, Layers, 
    CircleDashed, PieChart, GraduationCap, LayoutGrid, List, AlertCircle, Timer, BookOpen
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Test, StudyAssignment, StudyPlan, TrackedBook } from "@/lib/data";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { onTestsUpdate, onStudyAssignmentsUpdate, onStudyPlansUpdate, onTrackedBooksUpdate } from "@/lib/dataService";
import { useAuth } from "@/components/auth-provider";
import { format, parseISO, parse, compareDesc, compareAsc, isToday, startOfWeek, addDays, endOfDay, isWithinInterval, isPast, differenceInDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// --- KATEGORİ AYARLARI ---
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

const categoryThemes: { [key: string]: { color: string, bg: string } } = {
    'Matematik': { color: 'text-red-400', bg: 'bg-red-500/10' },
    'Fen Bilimleri': { color: 'text-orange-400', bg: 'bg-orange-500/10' },
    'Türkçe': { color: 'text-amber-400', bg: 'bg-amber-500/10' },
    'Sosyal Bilgiler': { color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    'İngilizce': { color: 'text-blue-400', bg: 'bg-blue-500/10' },
    'Genel Deneme Sınavları': { color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    'Diğer': { color: 'text-slate-400', bg: 'bg-slate-500/10' },
};

export const getCategoryName = (test: Test): string => {
    if (test.sourceType === 'exam') return 'Genel Deneme Sınavları';
    if (test.sourceType === 'mistake') return 'Yanlışlarım';
    return test.subject || 'Diğer';
};

// --- MODERN TASARIM DEĞİŞKENLERİ ---
const glassColors = {
    PAGE_BG: "bg-slate-900", 
    HEADER_BG: "bg-slate-900/80 backdrop-blur-xl border-b border-white/5",
    CARD_BG: "bg-white/[0.04] border border-white/[0.08] shadow-sm hover:bg-white/[0.06] transition-all duration-300",
};

export default function EducationPage() {
  const { toast } = useToast();
  const { familyMembers } = useAuth();
  const [selectedStudent, setSelectedStudent] = React.useState<any>(null);
  
  const [allTests, setAllTests] = React.useState<Test[]>([]);
  const [studyAssignments, setStudyAssignments] = React.useState<StudyAssignment[]>([]);
  const [studyPlans, setStudyPlans] = React.useState<StudyPlan[]>([]);
  const [trackedBooks, setTrackedBooks] = React.useState<TrackedBook[]>([]);

  const [viewMode, setViewMode] = React.useState<'cards' | 'weekly' | 'list'>('cards');
  const [currentDate, setCurrentDate] = React.useState(new Date());

  const studentMembers = React.useMemo(() => 
    familyMembers.filter(m => m.role.includes('Çocuk')), 
  [familyMembers]);

  React.useEffect(() => {
    if (studentMembers.length > 0 && !selectedStudent) {
      setSelectedStudent(studentMembers[0]);
    }
  }, [studentMembers, selectedStudent]);

  React.useEffect(() => {
    const unsubTests = onTestsUpdate(setAllTests, false, 'assignedDate', 'desc');
    const unsubStudyAssignments = onStudyAssignmentsUpdate(setStudyAssignments);
    const unsubStudyPlans = onStudyPlansUpdate(setStudyPlans);
    const unsubTrackedBooks = onTrackedBooksUpdate(setTrackedBooks);

    return () => {
      unsubTests();
      unsubStudyAssignments();
      unsubStudyPlans();
      unsubTrackedBooks();
    }
  }, []);
  
  const tests = React.useMemo(() => {
    if (!selectedStudent) return [];
    return allTests.filter(t => t.studentId === selectedStudent.id);
  }, [selectedStudent, allTests]);
  
  // --- BEKLEYEN ÖDEVLERİ GRUPLAMA (Kategoriye Göre) ---
  const groupedPendingAssignments = React.useMemo(() => {
      const groups: { [key: string]: Test[] } = {};
      
      // 1. Gruplama
      tests
        .filter(t => t.status === 'Atandı')
        .forEach(t => {
            const category = getCategoryName(t);
            if (!groups[category]) groups[category] = [];
            groups[category].push(t);
        });

      // 2. Her grup içinde tarihe göre sıralama (En yakın tarih en üstte)
      Object.keys(groups).forEach(key => {
          groups[key].sort((a, b) => {
            const dateA = parse(a.dueDate, 'dd MMMM yyyy', new Date(), { locale: tr });
            const dateB = parse(b.dueDate, 'dd MMMM yyyy', new Date(), { locale: tr });
            return dateA.getTime() - dateB.getTime();
          });
      });

      // 3. Grupları öncelik sırasına göre dizme
      const categoryOrder = ['Matematik', 'Türkçe', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İngilizce', 'Genel Deneme Sınavları', 'Diğer'];
      
      return Object.entries(groups).sort(([a], [b]) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
      });
  }, [tests]);

  // --- İSTATİSTİKLER ---
  const stats = React.useMemo(() => {
    const completedTests = tests.filter(t => t.status === 'Sonuçlandı');
    const totalCount = tests.length;
    const completedCount = completedTests.length;
    const pendingCount = totalCount - completedCount;

    let totalQuestions = 0;
    let totalCorrect = 0;
    completedTests.forEach(test => {
        totalQuestions += (test.questionCount || 0);
        totalCorrect += (test.correctAnswers || 0);
    });
    const successRate = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

    return {
      testCount: totalCount,
      completedCount,
      pendingCount,
      successRate: successRate,
    }
  }, [tests]);
  
  const testsByCategory = React.useMemo(() => {
    const categories: { [key: string]: { total: number, completed: number, correct: number, incorrectAnswers: number, questionCount: number } } = {};

    tests.forEach(test => {
        const categoryName = getCategoryName(test);
        if (!categories[categoryName]) {
            categories[categoryName] = { total: 0, completed: 0, correct: 0, incorrectAnswers: 0, questionCount: 0 };
        }
        categories[categoryName].total++;
        
        if (test.status === 'Sonuçlandı') {
            categories[categoryName].completed++;
            categories[categoryName].correct += (test.correctAnswers || 0);
            categories[categoryName].incorrectAnswers += (test.incorrectAnswers || 0);
            categories[categoryName].questionCount += (test.questionCount || 0);
        }
    });

    const categoryOrder = ['Matematik', 'Türkçe', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İngilizce', 'Genel Deneme Sınavları', 'Diğer'];
    
    return Object.entries(categories).sort(([a], [b]) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
    });

  }, [tests]);
  
    const allAssignments = React.useMemo(() => {
        const testAssignments = tests.map(t => ({
            id: t.id,
            title: t.title,
            type: 'test' as const,
            Icon: GraduationCap,
            startDate: parse(t.assignedDate, 'dd MMMM yyyy', new Date(), {locale: tr}),
            endDate: parse(t.dueDate, 'dd MMMM yyyy', new Date(), {locale: tr}),
            isCompleted: t.status !== 'Atandı' && t.status !== 'Değerlendirme Bekliyor',
        }));
        const studentStudyAssignments = studyAssignments.filter(sa => sa.studentId === selectedStudent?.id);
        const studyAssignmentsData = studentStudyAssignments.map(s => ({
            id: s.id,
            title: s.topic,
            type: 'study' as const,
            Icon: BookHeart,
            startDate: parseISO(s.startDate),
            endDate: parseISO(s.dueDate),
            isCompleted: s.status === 'completed',
        }));
        return [...testAssignments, ...studyAssignmentsData].sort((a,b) => compareAsc(a.startDate, b.startDate));
    }, [tests, studyAssignments, selectedStudent]);
    
    const renderCalendarView = () => {
        if (viewMode === 'weekly') {
             const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
             const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
             
             return (
                <div className={cn("border rounded-3xl overflow-hidden grid grid-cols-1 md:grid-cols-7", glassColors.CARD_BG)}>
                    <div className="hidden md:grid md:grid-cols-7 col-span-full border-b border-white/5 bg-white/5">
                         {weekDays.map(day => (
                            <div key={day.toISOString()} className={cn("p-3 text-center border-r border-white/5 last:border-r-0", isToday(day) ? "bg-indigo-500/10 text-indigo-200" : "text-slate-400")}>
                                <p className="font-bold text-sm capitalize">{format(day, 'EEE', {locale: tr})}</p>
                                <p className={cn("text-xs mt-1 font-bold", isToday(day) ? "text-indigo-400" : "text-slate-500")}>{format(day, 'd MMM', {locale: tr})}</p>
                            </div>
                        ))}
                    </div>
                     <div className="hidden md:grid md:grid-cols-7 col-span-full min-h-[300px]">
                         {weekDays.map(day => (
                           <div key={day.toISOString()} className={cn("p-2 border-r border-white/5 last:border-r-0 flex flex-col gap-2 relative", isToday(day) && "bg-white/[0.02]")}>
                               {allAssignments.filter(a => isWithinInterval(day, { start: a.startDate, end: endOfDay(a.endDate) })).map(a => (
                                    <div key={a.id} className={cn("p-2 rounded-lg text-xs border backdrop-blur-sm transition-all hover:scale-105 cursor-default group", a.type === 'test' ? 'bg-red-500/10 text-red-200 border-red-500/20' : 'bg-blue-500/10 text-blue-200 border-blue-500/20')}>
                                           <div className="flex items-center gap-1.5 mb-1">
                                                <a.Icon className="h-3 w-3 shrink-0 opacity-70"/>
                                                <span className="font-bold opacity-70 text-[10px] uppercase">{a.type === 'test' ? 'Test' : 'Ders'}</span>
                                           </div>
                                           <p className="font-medium truncate leading-tight">{a.title}</p>
                                    </div>
                               ))}
                           </div>
                        ))}
                     </div>
                 </div>
             )
        }
        return null;
    }

  return (
    <div className={cn("min-h-screen text-slate-100 font-sans relative overflow-hidden flex flex-col", glassColors.PAGE_BG)}>
        
        {/* BACKGROUND ACCENTS */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[130px]" />
            <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[130px]" />
        </div>

        {/* HEADER */}
        <div className={cn("sticky top-0 z-40 w-full", glassColors.HEADER_BG)}>
            <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-500/20">
                         <GraduationCap className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-lg tracking-tight hidden sm:inline-block">Eğitim Paneli</span>
                </div>

                <div className="flex items-center gap-3">
                    {/* ÖĞRENCİ SEÇİMİ */}
                    <div className="flex bg-white/5 p-1 rounded-full border border-white/10">
                        {studentMembers.map((student) => {
                            const isSelected = selectedStudent?.id === student.id;
                            return (
                                <button
                                    key={student.id}
                                    onClick={() => setSelectedStudent(student)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 flex items-center gap-2",
                                        isSelected 
                                            ? "bg-indigo-600 text-white shadow-md" 
                                            : "text-slate-400 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    <div className="w-2 h-2 rounded-full" style={{backgroundColor: student.color}}/>
                                    {student.name}
                                </button>
                            );
                        })}
                    </div>

                    <Link href="/education/management" className="hidden md:block">
                        <Button variant="ghost" size="icon" className="rounded-full text-slate-400 hover:text-white hover:bg-white/10">
                            <Settings className="h-5 w-5" />
                        </Button>
                    </Link>
                </div>
            </div>
        </div>

        <div className="flex-1 max-w-6xl mx-auto w-full p-4 space-y-8 relative z-10">
            
            {/* 1. HERO STATS (ÖZET KARTLAR) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* TOPLAM KARTI (Tıklanabilir) */}
                <Link href="/education/all-tests" className="block group">
                    <div className={cn("p-5 rounded-3xl relative overflow-hidden group flex flex-col justify-between h-32 transition-all hover:bg-white/[0.07]", glassColors.CARD_BG)}>
                        <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Layers className="w-24 h-24" /></div>
                        <div className="flex justify-between items-start">
                            <div className="p-2.5 bg-indigo-500/20 rounded-xl text-indigo-300"><Layers className="w-6 h-6"/></div>
                            <Badge variant="outline" className="border-indigo-500/30 text-indigo-300 bg-indigo-500/10">Toplam</Badge>
                        </div>
                        <div>
                            <div className="text-3xl font-black text-white tracking-tighter">{stats.testCount}</div>
                            <div className="text-xs text-slate-400 font-medium mt-1">Atanan Tüm Ödevler</div>
                        </div>
                    </div>
                </Link>

                {/* BAŞARI KARTI (Tıklanabilir) */}
                <Link href={`/education/stats?studentId=${selectedStudent?.id}`} className="block group">
                    <div className={cn("p-5 rounded-3xl relative overflow-hidden group flex flex-col justify-between h-32 transition-all hover:bg-emerald-500/5 hover:border-emerald-500/20", glassColors.CARD_BG)}>
                        <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><PieChart className="w-24 h-24 text-emerald-400" /></div>
                        <div className="flex justify-between items-start">
                            <div className="p-2.5 bg-emerald-500/20 rounded-xl text-emerald-300"><CheckCircle2 className="w-6 h-6"/></div>
                            <Badge variant="outline" className="border-emerald-500/30 text-emerald-300 bg-emerald-500/10">Başarı</Badge>
                        </div>
                        <div>
                            <div className="text-3xl font-black text-white tracking-tighter flex items-end gap-2">
                                %{stats.successRate.toFixed(0)}
                                <span className="text-sm text-slate-400 font-medium mb-1.5 group-hover:text-emerald-300/70 transition-colors">Ortalama</span>
                            </div>
                            <Progress value={stats.successRate} className="h-1.5 bg-slate-800 mt-2" indicatorClassName="bg-emerald-500" />
                        </div>
                    </div>
                </Link>

                {/* BEKLEYEN KARTI (Tıklanabilir) */}
                <Link href="/education/all-tests" className="block group">
                    <div className={cn("p-5 rounded-3xl relative overflow-hidden flex flex-col justify-between h-32 transition-all hover:border-amber-500/30 hover:bg-amber-500/5", glassColors.CARD_BG)}>
                        <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><CircleDashed className="w-24 h-24 text-amber-400" /></div>
                        <div className="flex justify-between items-start">
                            <div className="p-2.5 bg-amber-500/20 rounded-xl text-amber-300"><CircleDashed className="w-6 h-6"/></div>
                            <div className="flex items-center gap-1 text-xs font-bold text-amber-300 group-hover:translate-x-1 transition-transform">
                                Listeyi Gör <ArrowRight className="w-3 h-3"/>
                            </div>
                        </div>
                        <div>
                            <div className="text-3xl font-black text-white tracking-tighter">{stats.pendingCount}</div>
                            <div className="text-xs text-slate-400 font-medium mt-1 group-hover:text-amber-200/70 transition-colors">Bekleyen Ödevler</div>
                        </div>
                    </div>
                </Link>
            </div>

            {/* 2. ANA İÇERİK (Tabs) */}
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-full space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-200">Genel Bakış</h2>
                    <TabsList className="bg-white/5 border border-white/5 p-1 h-10 rounded-full">
                        <TabsTrigger value="cards" className="rounded-full px-4 text-xs h-8 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Dersler</TabsTrigger>
                        <TabsTrigger value="weekly" className="rounded-full px-4 text-xs h-8 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Takvim</TabsTrigger>
                    </TabsList>
                </div>

                {viewMode === 'cards' && (
                    <div className="animate-in fade-in zoom-in-95 duration-500 space-y-8">
                        
                        {/* --- YENİ: BEKLEYEN ÖDEVLER (GRUPLANMIŞ) --- */}
                        {groupedPendingAssignments.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-1 flex items-center gap-2">
                                    <Clock className="w-4 h-4"/> Sıradaki Görevler
                                </h3>
                                
                                <div className="space-y-6">
                                    {groupedPendingAssignments.map(([category, categoryTests]) => {
                                        const Icon = categoryIcons[category] || FileText;
                                        const theme = categoryThemes[category] || categoryThemes['Diğer'];

                                        return (
                                            <div key={category} className="space-y-3">
                                                {/* Kategori Başlığı */}
                                                <div className="flex items-center gap-2 px-1">
                                                    <div className={cn("p-1.5 rounded-lg", theme.bg, theme.color)}>
                                                        <Icon className="w-4 h-4" />
                                                    </div>
                                                    <h4 className={cn("text-sm font-bold", theme.color.split(' ')[0])}>{category}</h4>
                                                    <div className="h-px flex-1 bg-white/5 ml-2" />
                                                </div>

                                                {/* Test Kartları Grid */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {categoryTests.map(test => {
                                                        const dueDate = parse(test.dueDate, 'dd MMMM yyyy', new Date(), { locale: tr });
                                                        const now = new Date();
                                                        const daysDiff = differenceInDays(dueDate, now);
                                                        const isOverdue = isPast(dueDate) && !isToday(dueDate);
                                                        const isDueToday = isToday(dueDate);

                                                        // --- KONU ADINI BULMA ---
                                                        const allTopics = trackedBooks.flatMap(book => 
                                                            (book.subjects || []).flatMap(subject => subject.topics || [])
                                                        );
                                                        const topicName = allTopics.find(t => t.id === test.topicId)?.name;

                                                        return (
                                                            <Link key={test.id} href={`/education/${test.id}`} className="block group">
                                                                <div className={cn(
                                                                    "flex items-center gap-4 p-4 rounded-2xl border transition-all bg-white/[0.03] hover:bg-white/[0.06] hover:-translate-y-0.5",
                                                                    isOverdue ? "border-rose-500/20 hover:border-rose-500/40" : "border-white/5 hover:border-white/10"
                                                                )}>
                                                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/5", theme.bg, theme.color)}>
                                                                        <Icon className="w-5 h-5" />
                                                                    </div>
                                                                    
                                                                    <div className="flex-1 min-w-0">
                                                                        <h4 className="font-bold text-sm text-slate-200 truncate group-hover:text-white transition-colors">
                                                                            {test.title}
                                                                        </h4>
                                                                        
                                                                        {/* --- YENİ EKLENEN KONU GÖSTERİMİ --- */}
                                                                        {topicName && (
                                                                            <div className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 w-fit">
                                                                                <BookOpen className="w-3 h-3 mr-1.5 opacity-70"/>
                                                                                {topicName}
                                                                            </div>
                                                                        )}

                                                                        <div className="flex items-center gap-2 mt-2">
                                                                            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">{category}</span>
                                                                            <div className="h-1 w-1 rounded-full bg-slate-700"/>
                                                                            
                                                                            {isOverdue ? (
                                                                                <div className="flex items-center gap-1 text-[10px] font-bold text-rose-400">
                                                                                    <AlertCircle className="w-3 h-3"/>
                                                                                    {Math.abs(daysDiff)} gün gecikti
                                                                                </div>
                                                                            ) : isDueToday ? (
                                                                                <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400">
                                                                                    <Timer className="w-3 h-3"/>
                                                                                    Bugün son
                                                                                </div>
                                                                            ) : (
                                                                                <div className="text-[10px] font-medium text-emerald-400">
                                                                                    {daysDiff} gün kaldı
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div className="p-2 rounded-full bg-white/5 text-slate-500 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                                        <ArrowRight className="w-4 h-4"/>
                                                                    </div>
                                                                </div>
                                                            </Link>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* --- DERS KARTLARI (KOMPAKT) --- */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">Dersler ve İlerleme</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {testsByCategory.map(([category, data]) => {
                                    const Icon = categoryIcons[category] || FileText;
                                    const theme = categoryThemes[category] || categoryThemes['Diğer'];
                                    const pending = data.total - data.completed;
                                    const successRate = data.questionCount > 0 ? (data.correct / data.questionCount) * 100 : 0;

                                    return (
                                        <Link key={category} href={`/education/category/${encodeURIComponent(category)}?studentId=${selectedStudent?.id}`} className="block group">
                                            <div className={cn("p-4 rounded-2xl flex items-center gap-4 transition-all h-full bg-white/[0.03] border border-white/5 hover:bg-white/[0.07] hover:border-white/10 group-hover:-translate-y-1")}>
                                                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 border border-white/5", theme.bg, theme.color)}>
                                                    <Icon className="w-6 h-6" />
                                                </div>
                                                
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-center mb-1.5">
                                                        <h3 className="font-bold text-sm text-slate-200 truncate">{category}</h3>
                                                        {pending > 0 && <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold border border-white/5">{pending}</span>}
                                                    </div>
                                                    
                                                    <div className="space-y-1">
                                                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                                            <div 
                                                                className={cn("h-full rounded-full opacity-80", theme.bg.replace('/10','').replace('bg-', 'bg-'))} 
                                                                style={{ width: `${successRate}%`, backgroundColor: 'currentColor' }} 
                                                            />
                                                        </div>
                                                        <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                                                            <span>%{successRate.toFixed(0)} Başarı</span>
                                                            <span>{data.completed}/{data.total}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {viewMode === 'weekly' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {renderCalendarView()}
                    </div>
                )}
            </Tabs>
        </div>
    </div>
  );
}