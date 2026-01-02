"use client";

import * as React from "react";
import Link from "next/link";
import { 
    PlusCircle, Clock, FileText, Settings, BarChart3, CheckCircle2, 
    XCircle, MinusCircle, Ruler, TestTube2, BookCopy, Globe, 
    MessageSquare, Gamepad2, ClipboardList, ArrowRight, BookHeart, 
    Calendar as CalendarIcon, ChevronLeft, ChevronRight, Layers, 
    CircleDashed, PieChart, GraduationCap, LayoutGrid, List, AlertCircle, 
    Timer, BookOpen, Plus, ChevronDown, Check, Library, Flame, Sparkles
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

const categoryThemes: { [key: string]: { color: string, bg: string, border: string, glow: string } } = {
    'Matematik': { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500', glow: 'shadow-red-500/20' },
    'Fen Bilimleri': { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500', glow: 'shadow-orange-500/20' },
    'Türkçe': { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500', glow: 'shadow-amber-500/20' },
    'Sosyal Bilgiler': { color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500', glow: 'shadow-cyan-500/20' },
    'İngilizce': { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500', glow: 'shadow-blue-500/20' },
    'Genel Deneme Sınavları': { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500', glow: 'shadow-purple-500/20' },
    'Diğer': { color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500', glow: 'shadow-slate-500/20' },
};

export const getCategoryName = (test: Test): string => {
    if (test.sourceType === 'exam') return 'Genel Deneme Sınavları';
    if (test.sourceType === 'mistake') return 'Yanlışlarım';
    return test.subject || 'Diğer';
};

const glassColors = {
    PAGE_BG: "bg-[#0B1120]",
    HEADER_BG: "bg-[#0B1120]/80 backdrop-blur-xl border-b border-white/5",
    CARD_BG: "bg-slate-900/50 border border-white/10",
    HIGHLIGHT_CARD_BG: "bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 shadow-lg",
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

  const assignments = React.useMemo(() => {
      if (!selectedStudent) return [];
      return studyAssignments.filter(s => s.studentId === selectedStudent.id);
  }, [selectedStudent, studyAssignments]);

  // --- KONU ADLARINI BULMAK İÇİN YARDIMCI MEMO ---
  const allTopics = React.useMemo(() => {
      return trackedBooks.flatMap(book => (book.subjects || []).flatMap(subject => subject.topics || []));
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

  const stats = React.useMemo(() => {
    const completedTests = tests.filter(t => t.status === 'Sonuçlandı');
    let totalQuestions = 0;
    let totalCorrect = 0;
    completedTests.forEach(test => {
        totalQuestions += (test.questionCount || 0);
        totalCorrect += (test.correctAnswers || 0);
    });
    const successRate = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

    return {
      testCount: tests.length,
      studyCount: assignments.length,
      pendingCount: tests.filter(t => t.status !== 'Sonuçlandı').length + assignments.filter(s => s.status !== 'completed').length,
      successRate: successRate,
    }
  }, [tests, assignments]);
  
  const handleCompleteStudy = async (id: string, currentStatus: string) => {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      await updateStudyAssignment(id, { status: newStatus as any });
      toast({ title: newStatus === 'completed' ? "Tamamlandı" : "Geri Alındı", description: "Çalışma durumu güncellendi." });
  };

  return (
    <div className={cn("min-h-screen text-slate-100 font-sans relative overflow-hidden flex flex-col", glassColors.PAGE_BG)}>
        
        {/* BACKGROUND */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-900/20 rounded-full blur-[130px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[130px]" />
        </div>

        {/* HEADER */}
        <div className={cn("sticky top-0 z-40 w-full", glassColors.HEADER_BG)}>
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl flex items-center justify-center bg-indigo-600 shadow-lg shadow-indigo-500/20">
                         <GraduationCap className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-lg tracking-tight hidden sm:inline-block text-white">Eğitim Paneli</span>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-900/50 p-1 rounded-full border border-white/10 backdrop-blur-md">
                        {studentMembers.map((student) => {
                            const isSelected = selectedStudent?.id === student.id;
                            return (
                                <button
                                    key={student.id}
                                    onClick={() => setSelectedStudent(student)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 flex items-center gap-2",
                                        isSelected 
                                            ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/25" 
                                            : "text-slate-400 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    <div className="w-2 h-2 rounded-full ring-2 ring-white/20" style={{backgroundColor: student.color}}/>
                                    {student.name}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>

        <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 space-y-8 relative z-10">
            
            {/* 1. HERO İSTATİSTİKLER */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                    <div className="p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between h-36 bg-gradient-to-br from-amber-500 to-orange-600 shadow-xl shadow-orange-900/20 border border-white/10 group transition-transform hover:scale-[1.02]">
                        <div className="absolute right-[-20px] top-[-20px] p-4 opacity-20"><CircleDashed className="w-32 h-32 text-white rotate-12" /></div>
                        
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="border-white/30 text-white bg-white/10 backdrop-blur-md px-3">Dikkat</Badge>
                            </div>
                            <div className="text-5xl font-black text-white tracking-tighter drop-shadow-sm">{stats.pendingCount}</div>
                            <div className="text-sm text-orange-50 font-bold mt-1 uppercase tracking-wide opacity-90">Bekleyen Ödev & Görev</div>
                        </div>
                    </div>
                </div>

                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                     <Link href="/education/all-tests" className="block group">
                        <div className={cn("p-6 rounded-3xl flex flex-col justify-between h-36", glassColors.CARD_BG)}>
                            <div className="flex justify-between items-start">
                                <div className="p-3 bg-slate-800 rounded-2xl text-slate-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors"><Layers className="w-6 h-6"/></div>
                            </div>
                            <div>
                                <div className="text-3xl font-bold text-white">{stats.testCount}</div>
                                <div className="text-xs text-slate-500 font-bold uppercase mt-1">Toplam Atanan</div>
                            </div>
                        </div>
                    </Link>

                    <Link href={`/education/stats?studentId=${selectedStudent?.id}`} className="block group">
                        <div className={cn("p-6 rounded-3xl flex flex-col justify-between h-36", glassColors.CARD_BG)}>
                            <div className="flex justify-between items-start">
                                <div className="p-3 bg-slate-800 rounded-2xl text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors"><PieChart className="w-6 h-6" /></div>
                            </div>
                            <div>
                                <div className="flex items-end gap-2">
                                    <span className="text-3xl font-bold text-white">%{stats.successRate.toFixed(0)}</span>
                                    <span className="text-xs text-emerald-400 font-bold mb-1.5">Başarı</span>
                                </div>
                                <Progress value={stats.successRate} className="h-1.5 bg-slate-800 mt-2" indicatorClassName="bg-emerald-500" />
                            </div>
                        </div>
                    </Link>
                </div>
            </div>

            {/* 2. GÖREVLER & DERSLER */}
            <div className="space-y-6">
                
                {/* --- ACİL GÖREVLER --- */}
                {groupedPendingTests.length > 0 && (
                    <div className="animate-in slide-in-from-bottom-5 duration-500">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-1.5 bg-rose-500/10 rounded-lg"><Flame className="w-5 h-5 text-rose-500" /></div>
                            <h3 className="text-lg font-bold text-white">Yapılacaklar Listesi</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {groupedPendingTests.map(([category, categoryTests]) => {
                                const theme = categoryThemes[category] || categoryThemes['Diğer'];
                                return categoryTests.map(test => {
                                    const dueDate = parse(test.dueDate, 'dd MMMM yyyy', new Date(), { locale: tr });
                                    const isOverdue = isPast(dueDate) && !isToday(dueDate);
                                    const isDueToday = isToday(dueDate);
                                    
                                    // KONU ADINI BULMA
                                    const topicName = allTopics.find(t => t.id === test.topicId)?.name;

                                    return (
                                        <Link key={test.id} href={`/education/${test.id}`} className="block group">
                                            <div className={cn(
                                                "relative overflow-hidden rounded-2xl border-l-4 p-5 transition-all shadow-lg hover:-translate-y-1",
                                                glassColors.HIGHLIGHT_CARD_BG,
                                                theme.border,
                                                isOverdue ? "border-rose-500/50 shadow-rose-900/20" : "hover:shadow-indigo-500/10"
                                            )}>
                                                <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-10 pointer-events-none -mr-10 -mt-10", theme.bg.replace('bg-', 'bg-'))} />

                                                <div className="flex justify-between items-start mb-3 relative z-10">
                                                    <Badge variant="outline" className={cn("bg-black/40 border-0 text-[10px] font-bold uppercase tracking-wider px-2 py-1", theme.color)}>
                                                        {category}
                                                    </Badge>
                                                    
                                                    {isOverdue ? (
                                                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs font-bold animate-pulse">
                                                            <AlertCircle className="w-3.5 h-3.5" /> Gecikti!
                                                        </div>
                                                    ) : isDueToday ? (
                                                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-200 text-xs font-bold">
                                                            <Timer className="w-3.5 h-3.5" /> Bugün Son
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs font-medium text-slate-400 bg-slate-800/50 px-2 py-1 rounded-md">
                                                            {differenceInDays(dueDate, new Date())} gün var
                                                        </div>
                                                    )}
                                                </div>

                                                {/* KONU ROZETİ (BURASI EKLENDİ) */}
                                                {topicName && (
                                                    <div className="mb-2">
                                                        <Badge variant="secondary" className="bg-white/5 text-slate-300 hover:bg-white/10 border-0 text-[10px] px-2 py-0.5 backdrop-blur-sm">
                                                            <BookOpen className="w-3 h-3 mr-1.5 opacity-70" />
                                                            {topicName}
                                                        </Badge>
                                                    </div>
                                                )}

                                                <h4 className="text-lg font-bold text-white mb-1 leading-tight group-hover:text-indigo-300 transition-colors">
                                                    {test.title}
                                                </h4>
                                                
                                                <div className="flex items-center gap-4 mt-4 text-xs font-medium text-slate-400">
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {test.durationMinutes ? `${test.durationMinutes} dk` : 'Süre Yok'}
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        {test.questionCount} Soru
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

                {/* --- KONU ANLATIMI (VARSAYILAN KAPALI) --- */}
                {assignmentsByBook.length > 0 && (
                    <div className="pt-4">
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="konu-anlatimi" className="border-none bg-slate-900/20 rounded-2xl overflow-hidden">
                                <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-pink-500/10 rounded-lg">
                                            <BookHeart className="w-5 h-5 text-pink-500" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white">Konu Anlatımı</h3>
                                    </div>
                                </AccordionTrigger>
                                
                                <AccordionContent className="px-5 pb-5 pt-2">
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-2">
                                        {assignmentsByBook.map((bookGroup, idx) => {
                                            const progress = (bookGroup.completed / bookGroup.total) * 100;
                                            const isAllCompleted = bookGroup.completed === bookGroup.total;

                                            return (
                                                <div key={idx} className="rounded-2xl border border-white/10 bg-slate-900/40 overflow-hidden">
                                                    <div className="p-5 flex items-start gap-4 border-b border-white/5 bg-white/[0.02]">
                                                        <div className="w-12 h-16 rounded-md bg-slate-800 shadow-lg shrink-0 flex items-center justify-center border border-white/5">
                                                            <BookOpen className="w-6 h-6 text-slate-500" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-start">
                                                                <h3 className="font-bold text-base text-slate-100 truncate pr-4">{bookGroup.title}</h3>
                                                                <Badge variant="secondary" className={cn("text-[10px]", isAllCompleted ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-400")}>
                                                                    {bookGroup.completed}/{bookGroup.total}
                                                                </Badge>
                                                            </div>
                                                            
                                                            <div className="mt-3 flex items-center gap-3">
                                                                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                                                                    <div 
                                                                        className={cn("h-full rounded-full transition-all duration-500", isAllCompleted ? "bg-emerald-500" : "bg-pink-500")} 
                                                                        style={{width: `${progress}%`}}
                                                                    />
                                                                </div>
                                                                <span className="text-xs font-bold text-slate-400">%{progress.toFixed(0)}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2 bg-black/20">
                                                        {bookGroup.assignments.map(assign => (
                                                            <div 
                                                                key={assign.id} 
                                                                className={cn(
                                                                    "flex items-center gap-3 p-3 rounded-lg transition-all mb-1 cursor-pointer group hover:bg-white/5",
                                                                    assign.status === 'completed' ? "opacity-50 grayscale-[0.5]" : "bg-slate-800/30"
                                                                )}
                                                                onClick={() => handleCompleteStudy(assign.id, assign.status)}
                                                            >
                                                                <div className={cn(
                                                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0",
                                                                    assign.status === 'completed' 
                                                                        ? "bg-emerald-500 border-emerald-500" 
                                                                        : "border-slate-600 group-hover:border-indigo-400"
                                                                )}>
                                                                    {assign.status === 'completed' && <Check className="w-3 h-3 text-white" />}
                                                                </div>
                                                                
                                                                <div className="flex-1 min-w-0">
                                                                    <p className={cn("text-sm font-medium truncate transition-colors", assign.status === 'completed' ? "text-slate-400 line-through" : "text-slate-200 group-hover:text-white")}>
                                                                        {assign.topic}
                                                                    </p>
                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                        <Badge variant="outline" className="text-[10px] h-4 px-1 border-white/10 text-slate-500">
                                                                            {assign.subject}
                                                                        </Badge>
                                                                        {assign.durationMinutes > 0 && (
                                                                            <span className="text-[10px] text-slate-600 flex items-center gap-1">
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