"use client";

import * as React from "react";
import Link from "next/link";
import { 
  PlusCircle, Clock, FileText, Settings, BarChart3, CheckCircle2, 
  XCircle, MinusCircle, Ruler, TestTube2, BookCopy, Globe, 
  MessageSquare, Gamepad2, ClipboardList, ArrowRight, BookHeart, 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Layers, 
  CircleDashed, PieChart, GraduationCap, LayoutGrid, List, AlertCircle, 
  Timer, BookOpen, Plus, ChevronDown, Check, Library, Flame, Sparkles,
  TrendingUp, TrendingDown, Minus, PlayCircle, CalendarClock 
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Test, StudyAssignment, StudyPlan, TrackedBook } from "@/lib/data";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { onTestsUpdate, onStudyAssignmentsUpdate, onStudyPlansUpdate, onTrackedBooksUpdate, addStudyAssignment, updateStudyAssignment } from "@/lib/dataService";
import { useAuth } from "@/components/auth-provider";
import { format, parseISO, parse, compareDesc, compareAsc, isToday, startOfWeek, addDays, endOfDay, isWithinInterval, isPast, differenceInDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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

// --- YENİLENMİŞ CANLI RENK TEMALARI ---
// Artık tam arka plan gradientleri kullanıyoruz. Textler genelde beyaz olacak.
const categoryThemes: { [key: string]: { bgGradient: string, shadow: string, iconColor: string, badgeBg: string } } = {
    'Matematik': { 
        bgGradient: 'from-rose-500 to-pink-600', 
        shadow: 'shadow-rose-500/30',
        iconColor: 'text-rose-100',
        badgeBg: 'bg-rose-400/30'
    },
    'Fen Bilimleri': { 
        bgGradient: 'from-orange-500 to-amber-600',
        shadow: 'shadow-orange-500/30',
        iconColor: 'text-orange-100',
        badgeBg: 'bg-orange-400/30'
    },
    'Türkçe': { 
        bgGradient: 'from-amber-500 to-yellow-600',
        shadow: 'shadow-amber-500/30',
        iconColor: 'text-amber-100',
        badgeBg: 'bg-amber-400/30'
    },
    'Sosyal Bilgiler': { 
        bgGradient: 'from-cyan-500 to-blue-600',
        shadow: 'shadow-cyan-500/30',
        iconColor: 'text-cyan-100',
        badgeBg: 'bg-cyan-400/30'
    },
    'İngilizce': { 
        bgGradient: 'from-blue-500 to-indigo-600',
        shadow: 'shadow-blue-500/30',
        iconColor: 'text-blue-100',
        badgeBg: 'bg-blue-400/30'
    },
    'Genel Deneme Sınavları': { 
        bgGradient: 'from-purple-500 to-violet-600',
        shadow: 'shadow-purple-500/30',
        iconColor: 'text-purple-100',
        badgeBg: 'bg-purple-400/30'
    },
    'Diğer': { 
        bgGradient: 'from-slate-500 to-slate-600',
        shadow: 'shadow-slate-500/30',
        iconColor: 'text-slate-100',
        badgeBg: 'bg-slate-400/30'
    },
};

export const getCategoryName = (test: Test): string => {
    if (test.sourceType === 'exam') return 'Genel Deneme Sınavları';
    if (test.sourceType === 'mistake') return 'Yanlışlarım';
    return test.subject || 'Diğer';
};

const glassColors = {
    PAGE_BG: "bg-slate-50/50 dark:bg-[#0B1120]",
    HEADER_BG: "bg-white/70 dark:bg-[#0B1120]/70 backdrop-blur-md border-b border-slate-200/50 dark:border-white/5",
};

export default function EducationPage() {
  const { toast } = useToast();
  const { familyMembers } = useAuth();
  const [selectedStudent, setSelectedStudent] = React.useState<any>(null);
  
  const [allTests, setAllTests] = React.useState<Test[]>([]);
  const [studyAssignments, setStudyAssignments] = React.useState<StudyAssignment[]>([]);
  const [studyPlans, setStudyPlans] = React.useState<StudyPlan[]>([]);
  const [trackedBooks, setTrackedBooks] = React.useState<TrackedBook[]>([]);

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

  const assignments = React.useMemo(() => {
      if (!selectedStudent) return [];
      return studyAssignments.filter(s => s.studentId === selectedStudent.id);
  }, [selectedStudent, studyAssignments]);

  const allTopics = React.useMemo(() => {
      return trackedBooks.flatMap(book => (book.subjects || []).flatMap(subject => 
                (subject.topics || []).map(topic => ({...topic, subjectName: subject.name}))
            )
        ) || [];
  }, [trackedBooks]);

  const assignmentsByBook = React.useMemo(() => {
      const grouped: Record<string, { title: string, assignments: StudyAssignment[], total: number, completed: number }> = {};
      
      assignments.forEach(assign => {
          const plan = studyPlans.find(p => p.id === assign.studyPlanId);
          if (!plan) return; 

          const groupKey = plan.id;
          const groupTitle = plan.title;

          if (!grouped[groupKey]) {
              grouped[groupKey] = { title: groupTitle, assignments: [], total: 0, completed: 0 };
          }

          grouped[groupKey].assignments.push(assign);
          grouped[groupKey].total++;
          if (assign.status === 'completed') {
              grouped[groupKey].completed++;
          }
      });

      return Object.values(grouped).filter(g => g.total > 0).sort((a,b) => {
          return (b.total - b.completed) - (a.total - a.completed);
      });
  }, [assignments, studyPlans]);
  
  const groupedPendingTests = React.useMemo(() => {
      const groups: { [key: string]: Test[] } = {};
      tests.filter(t => t.status === 'Atandı').forEach(t => {
            const category = getCategoryName(t);
            if (!groups[category]) groups[category] = [];
            groups[category].push(t);
      });
      return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [tests]);

  // --- İSTATİSTİK VE TREND HESAPLAMA ---
  const stats = React.useMemo(() => {
    const completedTests = tests.filter(t => t.status === 'Sonuçlandı');
    const sortedCompleted = [...completedTests].sort((a, b) => 
        new Date(b.assignedDate || '').getTime() - new Date(a.assignedDate || '').getTime()
    );

    // 1. GÜNCEL ORTALAMA
    let totalQuestions = 0;
    let totalCorrect = 0;
    sortedCompleted.forEach(test => {
        totalQuestions += (test.questionCount || 0);
        totalCorrect += (test.correctAnswers || 0);
    });
    const currentSuccessRate = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

    // 2. ÖNCEKİ ORTALAMA (Trend Hesabı)
    let trendValue = 0;
    let hasTrend = false;

    if (sortedCompleted.length > 1) {
        const previousTests = sortedCompleted.slice(1);
        let prevQuestions = 0;
        let prevCorrect = 0;
        previousTests.forEach(test => {
            prevQuestions += (test.questionCount || 0);
            prevCorrect += (test.correctAnswers || 0);
        });
        const prevRate = prevQuestions > 0 ? (prevCorrect / prevQuestions) * 100 : 0;
        trendValue = currentSuccessRate - prevRate;
        hasTrend = true;
    }

    return {
      testCount: tests.length,
      studyCount: assignments.length,
      pendingCount: tests.filter(t => t.status !== 'Sonuçlandı').length + assignments.filter(s => s.status !== 'completed').length,
      successRate: currentSuccessRate,
      trend: trendValue,
      hasTrend: hasTrend
    }
  }, [tests, assignments]);
  
  const handleCompleteStudy = async (id: string, currentStatus: string) => {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      await updateStudyAssignment(id, { status: newStatus as any });
      toast({ title: newStatus === 'completed' ? "Tamamlandı" : "Geri Alındı", description: "Çalışma durumu güncellendi." });
  };

  return (
    <div className={cn("min-h-screen font-sans relative overflow-hidden flex flex-col transition-colors duration-300", glassColors.PAGE_BG, "text-slate-900 dark:text-slate-50")}>
        
        {/* BACKGROUND BLOBS - DAHA CANLI */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-500/20 dark:bg-indigo-600/10 rounded-full blur-[150px] mix-blend-multiply dark:mix-blend-normal" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-500/20 dark:bg-blue-600/10 rounded-full blur-[150px] mix-blend-multiply dark:mix-blend-normal" />
            <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] bg-pink-500/20 dark:bg-pink-600/10 rounded-full blur-[150px] mix-blend-multiply dark:mix-blend-normal" />
        </div>

        {/* HEADER */}
        <div className={cn("sticky top-0 z-40 w-full transition-colors duration-300", glassColors.HEADER_BG)}>
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl flex items-center justify-center bg-gradient-to-r from-indigo-600 to-blue-600 shadow-lg shadow-indigo-500/20">
                          <GraduationCap className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-slate-100">Eğitim Paneli</span>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-white/50 dark:bg-slate-800/50 p-1 rounded-full border border-slate-200/50 dark:border-slate-700 backdrop-blur-sm">
                        {studentMembers.map((student) => {
                            const isSelected = selectedStudent?.id === student.id;
                            return (
                                <button
                                    key={student.id}
                                    onClick={() => setSelectedStudent(student)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 flex items-center gap-2",
                                        isSelected 
                                            ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-white shadow-sm" 
                                            : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50"
                                    )}
                                >
                                    <div className="w-2 h-2 rounded-full ring-2 ring-slate-200 dark:ring-white/20" style={{backgroundColor: student.color}}/>
                                    {student.name}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>

        <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 space-y-8 relative z-10">
            
            {/* 1. HERO İSTATİSTİKLER - DAHA CANLI */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* KART 1: Bekleyen */}
                <div className="md:col-span-1">
                    <div className="p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between h-36 bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-orange-500/30 border border-white/10 group transition-transform hover:scale-[1.02]">
                        <div className="absolute right-[-20px] top-[-20px] p-4 opacity-20"><CircleDashed className="w-32 h-32 text-white rotate-12" /></div>
                        
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="border-white/30 text-white bg-white/20 backdrop-blur-md px-3">Dikkat</Badge>
                            </div>
                            <div className="text-5xl font-black text-white tracking-tighter drop-shadow-sm">{stats.pendingCount}</div>
                            <div className="text-sm text-orange-50 font-bold mt-1 uppercase tracking-wide opacity-90">Bekleyen Ödev & Görev</div>
                        </div>
                    </div>
                </div>

                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                    {/* KART 2: Toplam Atanan (RENKLENDİRİLDİ) */}
                      <Link href="/education/management" className="block group">
                        <div className={cn("p-6 rounded-3xl flex flex-col justify-between h-36 relative overflow-hidden", "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 border border-white/10", "hover:scale-[1.02] transition-all duration-300")}>
                            <div className="absolute right-[-20px] bottom-[-20px] p-4 opacity-20"><Layers className="w-32 h-32 text-white -rotate-12" /></div>
                            <div className="flex justify-between items-start relative z-10">
                                <div className="p-3 bg-white/20 rounded-2xl text-white backdrop-blur-md"><Layers className="w-6 h-6"/></div>
                            </div>
                            <div className="relative z-10">
                                <div className="text-3xl font-bold text-white">{stats.testCount}</div>
                                <div className="text-sm text-blue-50 font-bold uppercase mt-1 opacity-90">Toplam Atanan</div>
                            </div>
                        </div>
                    </Link>

                    {/* KART 3: BAŞARI (RENKLENDİRİLDİ) */}
                    <Link href={`/education/stats?studentId=${selectedStudent?.id}`} className="block group md:col-span-1">
                        <div className={cn("relative p-6 rounded-3xl h-36 flex items-center justify-between overflow-hidden", "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30 border border-white/10", "hover:scale-[1.02] transition-all duration-300")}>
                            
                            <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 blur-[50px] rounded-full pointer-events-none" />

                            <div className="flex flex-col justify-between h-full z-10 text-white">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-white/20 rounded-xl text-white backdrop-blur-md">
                                        <PieChart className="w-5 h-5" />
                                    </div>
                                    <span className="text-sm font-bold text-emerald-50 uppercase tracking-wide opacity-90">Başarı</span>
                                </div>

                                <div>
                                    {stats.hasTrend && (
                                        <div className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md mb-1 backdrop-blur-md",
                                            stats.trend > 0 ? "bg-white/20 text-white" : "bg-rose-500/30 text-white"
                                        )}>
                                            {stats.trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                            <span>%{Math.abs(stats.trend).toFixed(1)}</span>
                                        </div>
                                    )}
                                    <div className="text-3xl font-black text-white tracking-tight drop-shadow-sm">
                                        %{stats.successRate.toFixed(1)}
                                    </div>
                                </div>
                            </div>

                            <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle
                                        cx="48" cy="48" r="40"
                                        stroke="currentColor" strokeWidth="8" fill="transparent"
                                        className="text-white/20"
                                    />
                                    <circle
                                        cx="48" cy="48" r="40"
                                        stroke="currentColor" strokeWidth="8" fill="transparent"
                                        strokeDasharray={251.2}
                                        strokeDashoffset={251.2 - (251.2 * stats.successRate) / 100}
                                        strokeLinecap="round"
                                        className={cn("transition-all duration-1000 ease-out text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.5)]")}
                                    />
                                </svg>
                                
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className={cn("w-16 h-16 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-md text-white")}>
                                        {stats.successRate >= 90 ? <Sparkles className="w-6 h-6 animate-pulse" /> : <CheckCircle2 className="w-6 h-6" />}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>

            {/* 2. GÖREVLER & DERSLER */}
            <div className="space-y-6">
                
                {/* --- YENİLENMİŞ, ÇOK DAHA RENKLİ YAPILACAKLAR LİSTESİ --- */}
                {groupedPendingTests.length > 0 && (
                    <div className="animate-in slide-in-from-bottom-5 duration-500">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-1.5 bg-rose-100 dark:bg-rose-500/20 rounded-lg"><Flame className="w-5 h-5 text-rose-600 dark:text-rose-400" /></div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Yapılacaklar Listesi</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                            {groupedPendingTests.map(([category, categoryTests]) => {
                                const theme = categoryThemes[category] || categoryThemes['Diğer'];
                                return categoryTests.map(test => {
                                    const dueDate = parse(test.dueDate, 'dd MMMM yyyy', new Date(), { locale: tr });
                                    const isOverdue = isPast(dueDate) && !isToday(dueDate);
                                    const isDueToday = isToday(dueDate);
                                    
                                    const topicName = allTopics.find(t => t.id === test.topicId)?.name;

                                    return (
                                        <Link key={test.id} href={`/education/${test.id}`} className="block group relative">
                                            <div className={cn(
                                                "relative overflow-hidden rounded-[2rem] p-6 transition-all duration-300 h-full flex flex-col justify-between",
                                                "bg-gradient-to-br", theme.bgGradient, theme.shadow,
                                                "hover:shadow-xl hover:-translate-y-1 border border-white/10"
                                            )}>
                                                
                                                {/* Üst Kısım: Kategori ve Durum */}
                                                <div className="relative z-10 flex justify-between items-start mb-4">
                                                    <div className={cn("px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider border border-white/20 backdrop-blur-md text-white", theme.badgeBg)}>
                                                        {category}
                                                    </div>
                                                    
                                                    {isOverdue ? (
                                                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/90 text-rose-600 text-xs font-bold shadow-sm animate-pulse">
                                                            <AlertCircle className="w-3.5 h-3.5" /> Gecikti
                                                        </div>
                                                    ) : isDueToday ? (
                                                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/90 text-amber-600 text-xs font-bold shadow-sm">
                                                            <Timer className="w-3.5 h-3.5" /> Bugün
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/20 text-white text-[10px] font-bold backdrop-blur-md">
                                                            <CalendarClock className="w-3 h-3" />
                                                            {differenceInDays(dueDate, new Date())} gün kaldı
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Orta Kısım: Başlık ve Konu */}
                                                <div className="relative z-10 mb-6">
                                                     <h4 className="text-xl font-black text-white leading-tight mb-3 drop-shadow-sm">
                                                        {test.title}
                                                    </h4>
                                                    {topicName && (
                                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/20 border border-white/30 text-white text-xs font-semibold backdrop-blur-md">
                                                            <BookOpen className="w-3.5 h-3.5 opacity-80" />
                                                            <span className="truncate max-w-[200px]">{topicName}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {/* Alt Kısım: Metadata ve Action */}
                                                <div className="relative z-10 flex items-center justify-between pt-4 mt-auto border-t border-white/20">
                                                    <div className="flex items-center gap-3 text-xs font-bold text-white/80">
                                                        <div className="flex items-center gap-1.5 bg-black/10 px-2 py-1 rounded-md backdrop-blur-sm">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            {test.durationMinutes ? `${test.durationMinutes} dk` : '-'}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 bg-black/10 px-2 py-1 rounded-md backdrop-blur-sm">
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                            {test.questionCount} Soru
                                                        </div>
                                                    </div>

                                                    {/* Play Button Effect */}
                                                    <div className={cn("transform translate-x-2 group-hover:translate-x-0 transition-all duration-300 flex items-center gap-1 text-white font-bold bg-white/20 pl-3 pr-2 py-1.5 rounded-full backdrop-blur-md hover:bg-white hover:text-slate-900")}>
                                                        <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300">Başla</span>
                                                        <ArrowRight className="w-5 h-5" />
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })
                            })}
                        </div>
                    </div>
                )}

                {/* --- KONU ANLATIMI --- */}
                {assignmentsByBook.length > 0 && (
                    <div className="pt-4">
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="konu-anlatimi" className="border-none bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl overflow-hidden shadow-sm border border-slate-200/50 dark:border-slate-800/50">
                                <AccordionTrigger className="px-6 py-5 hover:no-underline hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-pink-100 dark:bg-pink-500/20 rounded-xl">
                                            <BookHeart className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-none">Konu Anlatımı</h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Kitap bazlı çalışma takibi</p>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                
                                <AccordionContent className="px-6 pb-6 pt-2">
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-2">
                                        {assignmentsByBook.map((bookGroup, idx) => {
                                            const progress = (bookGroup.completed / bookGroup.total) * 100;
                                            const isAllCompleted = bookGroup.completed === bookGroup.total;

                                            return (
                                                <div key={idx} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 overflow-hidden">
                                                    <div className="p-5 flex items-start gap-4 border-b border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/30">
                                                        <div className="w-12 h-16 rounded-md bg-slate-100 dark:bg-slate-800 shadow-sm shrink-0 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                                                            <BookOpen className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-start">
                                                                <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 truncate pr-4">{bookGroup.title}</h3>
                                                                <Badge variant="secondary" className={cn("text-[10px]", isAllCompleted ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600")}>
                                                                    {bookGroup.completed}/{bookGroup.total}
                                                                </Badge>
                                                            </div>
                                                            
                                                            <div className="mt-3 flex items-center gap-3">
                                                                <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                                    <div 
                                                                        className={cn("h-full rounded-full transition-all duration-500", isAllCompleted ? "bg-emerald-500" : "bg-pink-500")} 
                                                                        style={{width: `${progress}%`}}
                                                                    />
                                                                </div>
                                                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">%{progress.toFixed(0)}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2 bg-slate-50/30 dark:bg-slate-800/30">
                                                        {bookGroup.assignments.map(assign => (
                                                            <div 
                                                                key={assign.id} 
                                                                className={cn(
                                                                    "flex items-center gap-3 p-3 rounded-lg transition-all mb-1 cursor-pointer group hover:bg-white dark:hover:bg-slate-700/50 border border-transparent",
                                                                    assign.status === 'completed' ? "opacity-50 grayscale" : "bg-white/70 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50"
                                                                )}
                                                                onClick={() => handleCompleteStudy(assign.id, assign.status)}
                                                            >
                                                                <div className={cn(
                                                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0",
                                                                    assign.status === 'completed' 
                                                                        ? "bg-emerald-500 border-emerald-500" 
                                                                        : "border-slate-300 dark:border-slate-600 group-hover:border-indigo-400"
                                                                )}>
                                                                    {assign.status === 'completed' && <Check className="w-3 h-3 text-white" />}
                                                                </div>
                                                                
                                                                <div className="flex-1 min-w-0">
                                                                    <p className={cn("text-sm font-medium truncate transition-colors", assign.status === 'completed' ? "text-slate-400 dark:text-slate-500 line-through" : "text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white")}>
                                                                        {assign.topic}
                                                                    </p>
                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                        <Badge variant="outline" className="text-[10px] h-4 px-1 border-slate-200 dark:border-slate-700 text-slate-500">
                                                                            {assign.subject}
                                                                        </Badge>
                                                                        {assign.durationMinutes && assign.durationMinutes > 0 && (
                                                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                                                                <Clock className="w-2.5 h-2.5" /> {assign.durationMinutes}dk
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}