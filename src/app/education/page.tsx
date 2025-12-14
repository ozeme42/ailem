"use client";

import * as React from "react";
import Link from "next/link";
import { 
  PlusCircle, BookOpen, Clock, FileText, Target, Trash2, Edit, CheckSquare, Settings, 
  BarChart3, CheckCircle, XCircle, MinusCircle, Award, Home, Ruler, TestTube2, BookCopy, 
  Globe, MessageSquare, Gamepad2, ClipboardList, Send, ArrowRight, NotebookText, BookHeart, 
  Sparkles, ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, GraduationCap, Check, 
  Library, LayoutGrid, AlertCircle 
} from "lucide-react";
import Image from "next/image";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { QuestionBank, Test, PracticeExam, FamilyMember, StudyAssignment, StudyPlan, TrackedBook } from "@/lib/data";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ManualGradeForm, ManualGradeData } from "@/components/manual-grade-form";
import { onTestsUpdate, onQuestionBanksUpdate, onPracticeExamsUpdate, updateTest, addTest, deleteTask, onSubjectsUpdate, updateSubjects, checkAndAwardBadges, onStudyAssignmentsUpdate, onStudyPlansUpdate, updateStudyAssignment, onTrackedBooksUpdate, onBooksUpdate, onUserLibrariesUpdate, onGoalsUpdate, updateGoal, getGoal, addBook, onMemorizationItemsUpdate, onMemorizationProgressUpdate, onPrayerProgressUpdate, onVideosUpdate, onTransactionsUpdate, onAccountsUpdate, onReadingSessionsUpdate, addReadingSession, addBookToMemberLibrary } from "@/lib/dataService";
import { useAuth } from "@/components/auth-provider";
import { format, parseISO, parse, compareDesc, compareAsc, isToday, startOfWeek, addDays, endOfMonth, endOfDay, isWithinInterval, startOfMonth, addMonths, subMonths, isPast, differenceInDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidebarTrigger } from "@/components/ui/sidebar";


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

// Renkleri Glassmorphism temasına uyarladık
const categoryCardColors: { [key: string]: string } = {
    'Genel Deneme Sınavları': 'hover:shadow-yellow-500/20 hover:border-yellow-500/50',
    'Matematik': 'hover:shadow-red-500/20 hover:border-red-500/50',
    'Fen Bilimleri': 'hover:shadow-orange-500/20 hover:border-orange-500/50',
    'Türkçe': 'hover:shadow-amber-500/20 hover:border-amber-500/50',
    'Sosyal Bilgiler': 'hover:shadow-cyan-500/20 hover:border-cyan-500/50',
    'İngilizce': 'hover:shadow-blue-500/20 hover:border-blue-500/50',
    'Serbest Etkinlikler': 'hover:shadow-purple-500/20 hover:border-purple-500/50',
    'Diğer': 'hover:shadow-slate-500/20 hover:border-slate-500/50',
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


export const getCategoryName = (test: Test): string => {
    if (test.sourceType === 'exam') return 'Genel Deneme Sınavları';
    if (test.sourceType === 'mistake') return 'Yanlışlarım';
    return test.subject || 'Diğer';
};

// --- DESIGN SYSTEM: Glassmorphism ---
const glassColors = {
    HEADER_BG: "bg-slate-950/70 backdrop-blur-lg border-b border-white/5",
    CARD_BG: "bg-white/5 border border-white/10 shadow-lg backdrop-blur-md",
    CARD_HOVER: "hover:bg-white/10 hover:border-white/20 hover:shadow-xl hover:-translate-y-1 transition-all duration-300",
    INPUT_BG: "bg-slate-950/50 border-white/10 text-slate-100",
    BUTTON_GLASS: "bg-white/10 hover:bg-white/20 text-white border border-white/10",
    ACTIVE_MEMBER: "bg-indigo-600 border-indigo-500/50 text-white shadow-lg shadow-indigo-500/20",
    INACTIVE_MEMBER: "bg-white/5 border-transparent text-slate-400 hover:text-white hover:bg-white/10",
};

export default function EducationPage() {
  const { toast } = useToast();
  const { familyMembers, familyId } = useAuth();
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
  
  const overallStats = React.useMemo(() => {
    const evaluatedTests = tests.filter(t => t.status === 'Sonuçlandı');
    const totalQuestions = evaluatedTests.reduce((sum, test) => sum + (test.questionCount || 0), 0);
    const totalCorrect = evaluatedTests.reduce((sum, test) => sum + (test.correctAnswers || 0), 0);
    const successRate = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

    return {
      testCount: evaluatedTests.length,
      successRate: successRate,
    }
  }, [tests]);
  
  const testsByCategory = React.useMemo(() => {
    const categories: { [key: string]: { total: number, completed: number } } = {};

    tests.forEach(test => {
        const categoryName = getCategoryName(test);
        if (!categories[categoryName]) {
            categories[categoryName] = { total: 0, completed: 0 };
        }
        categories[categoryName].total++;
        if (test.status === 'Sonuçlandı') {
            categories[categoryName].completed++;
        }
    });

    const categoryOrder = ['Genel Deneme Sınavları', 'Matematik', 'Türkçe', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İngilizce', 'Yanlışlarım', 'Diğer'];
    
    return Object.entries(categories).sort(([a], [b]) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
    });

  }, [tests]);
  
    const studyPlanStats = React.useMemo(() => {
        if (!selectedStudent) return [];

        const studentAssignments = studyAssignments.filter(sa => sa.studentId === selectedStudent.id);
        const assignmentsByPlan = new Map<string, { completed: number, total: number }>();
        
        studentAssignments.forEach(sa => {
            const current = assignmentsByPlan.get(sa.studyPlanId) || { completed: 0, total: 0 };
            current.total++;
            if (sa.status === 'completed') {
                current.completed++;
            }
            assignmentsByPlan.set(sa.studyPlanId, current);
        });

        return studyPlans
            .filter(plan => assignmentsByPlan.has(plan.id))
            .map(plan => ({
                plan,
                progress: assignmentsByPlan.get(plan.id)!,
            }));
    }, [selectedStudent, studyPlans, studyAssignments]);


  const handleStudyAssignmentStatusChange = async (assignment: StudyAssignment) => {
    const newStatus = assignment.status === 'completed' ? 'assigned' : 'completed';
    const updateData: Partial<StudyAssignment> = {
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
    };
    try {
      await updateStudyAssignment(assignment.id, updateData);
      if (newStatus === 'completed') {
        toast({
          title: '✅ Harika İş!',
          description: `"${assignment.topic}" konusunu tamamladın.`,
        });
      }
    } catch (error) {
      toast({
        title: 'Hata',
        description: 'Görev durumu güncellenirken bir hata oluştu.',
        variant: 'destructive',
      });
    }
  };

    const allAssignments = React.useMemo(() => {
        const testAssignments = tests.map(t => ({
            id: t.id,
            title: t.title,
            type: 'test' as const,
            Icon: GraduationCap,
            startDate: parse(t.assignedDate, 'dd MMMM yyyy', new Date(), {locale: tr}),
            endDate: parse(t.dueDate, 'dd MMMM yyyy', new Date(), {locale: tr}),
            isCompleted: t.status !== 'Atandı',
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
                            <div key={day.toISOString()} className="p-3 text-center border-r border-white/5 last:border-r-0">
                                <p className="font-bold text-sm capitalize text-slate-300">{format(day, 'EEE', {locale: tr})}</p>
                            </div>
                        ))}
                    </div>
                     <div className="md:hidden col-span-full divide-y divide-white/5">
                        {weekDays.map(day => (
                           <div key={day.toISOString()} className="p-4 flex flex-row md:flex-col gap-4">
                               <div className="w-20 text-center md:text-left md:w-auto shrink-0 flex flex-col items-center justify-center bg-white/5 rounded-2xl p-2">
                                    <p className="font-bold text-lg capitalize text-white">{format(day, 'd')}</p>
                                    <p className="text-xs capitalize text-slate-400">{format(day, 'MMM', {locale: tr})}</p>
                               </div>
                               <div className="space-y-2 overflow-y-auto flex-grow">
                                   {allAssignments.filter(a => isWithinInterval(day, { start: a.startDate, end: endOfDay(a.endDate) })).map(a => (
                                       <div key={a.id} className={cn("p-3 rounded-xl text-sm border", a.type === 'test' ? 'bg-red-500/10 text-red-200 border-red-500/20' : 'bg-blue-500/10 text-blue-200 border-blue-500/20')}>
                                           <p className="font-semibold truncate flex items-center gap-2"><a.Icon className="h-4 w-4 shrink-0"/>{a.title}</p>
                                       </div>
                                   ))}
                                   {allAssignments.filter(a => isWithinInterval(day, { start: a.startDate, end: endOfDay(a.endDate) })).length === 0 && (
                                       <p className="text-sm text-slate-500 italic">Plan yok.</p>
                                   )}
                               </div>
                           </div>
                        ))}
                     </div>
                     <div className="hidden md:grid md:grid-cols-7 col-span-full">
                         {weekDays.map(day => (
                           <div key={day.toISOString()} className="p-3 border-r border-white/5 last:border-r-0 min-h-[12rem] flex flex-col gap-2 relative">
                               {isToday(day) && <div className="absolute inset-0 bg-indigo-500/5 -z-10" />}
                               <div className="w-full text-center mb-2">
                                    <span className={cn("text-sm font-semibold px-2 py-1 rounded-md", isToday(day) ? "bg-indigo-500 text-white" : "text-slate-400")}>
                                        {format(day, 'd MMM', { locale: tr })}
                                    </span>
                               </div>
                               <div className="space-y-2 overflow-y-auto flex-grow custom-scrollbar">
                                   {allAssignments.filter(a => isWithinInterval(day, { start: a.startDate, end: endOfDay(a.endDate) })).map(a => (
                                       <div key={a.id} className={cn("p-2 rounded-lg text-xs border backdrop-blur-sm transition-all hover:scale-105 cursor-default", a.type === 'test' ? 'bg-red-500/10 text-red-200 border-red-500/20' : 'bg-blue-500/10 text-blue-200 border-blue-500/20')}>
                                           <p className="font-semibold truncate flex items-center gap-1.5"><a.Icon className="h-3 w-3 shrink-0"/>{a.title}</p>
                                       </div>
                                   ))}
                               </div>
                           </div>
                        ))}
                    </div>
                 </div>
             )
        }
        
        if (viewMode === 'list') {
            const now = new Date();
            const pendingAssignments = allAssignments.filter(a => !a.isCompleted);
            const completedAssignments = allAssignments.filter(a => a.isCompleted).sort((a,b) => compareDesc(a.endDate, b.endDate));

            const pendingTestAssignments = pendingAssignments.filter(a => a.type === 'test');
            const pendingStudyAssignments = pendingAssignments.filter(a => a.type === 'study');
            
            return (
                 <div className="space-y-8">
                    {pendingAssignments.length > 0 ? (
                        <div>
                             <h3 className="text-xl font-bold mb-4 text-slate-100 flex items-center gap-2"><Clock className="w-5 h-5 text-indigo-400"/> Devam Edenler ({pendingAssignments.length})</h3>
                             <div className="grid md:grid-cols-2 gap-6">
                                {pendingTestAssignments.length > 0 && (
                                    <div className={cn("rounded-3xl p-5 space-y-4", glassColors.CARD_BG)}>
                                            <h4 className="text-lg font-semibold text-slate-300 border-b border-white/5 pb-2">Testler ({pendingTestAssignments.length})</h4>
                                            <div className="space-y-3">
                                                {pendingTestAssignments.map(a => {
                                                    const daysDiff = differenceInDays(a.endDate, now);
                                                    const isDue = isPast(a.endDate) && !isToday(a.endDate);
                                                    return (
                                                        <div key={a.id} className="flex items-center p-3 gap-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                                            <div className="p-2 bg-red-500/20 rounded-lg text-red-400"><a.Icon className="h-4 w-4 shrink-0" /></div>
                                                            <div className="flex-grow min-w-0">
                                                                <p className="font-semibold text-slate-200 truncate">{a.title}</p>
                                                                 <p className="text-xs text-slate-400">{format(a.endDate, 'dd MMMM yyyy', {locale: tr})}</p>
                                                            </div>
                                                            <div className="shrink-0">
                                                                {isDue
                                                                    ? <Badge variant="destructive" className="bg-red-500/20 text-red-300 border-red-500/50">Gecikti</Badge>
                                                                    : isToday(a.endDate)
                                                                    ? <Badge variant="outline" className="text-amber-400 border-amber-400 bg-amber-400/10">Bugün</Badge>
                                                                    : <Badge variant="secondary" className="bg-slate-700 text-slate-300">{daysDiff + 1} gün</Badge>
                                                                }
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                    </div>
                                )}
                                {pendingStudyAssignments.length > 0 && (
                                     <div className={cn("rounded-3xl p-5 space-y-4", glassColors.CARD_BG)}>
                                            <h4 className="text-lg font-semibold text-slate-300 border-b border-white/5 pb-2">Konu Anlatımları ({pendingStudyAssignments.length})</h4>
                                            <div className="space-y-3">
                                            {pendingStudyAssignments.map(a => {
                                                const daysDiff = differenceInDays(a.endDate, now);
                                                const isDue = isPast(a.endDate) && !isToday(a.endDate);
                                                return (
                                                    <div key={a.id} className="flex items-center p-3 gap-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                                        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><a.Icon className="h-4 w-4 shrink-0" /></div>
                                                        <div className="flex-grow min-w-0">
                                                            <p className="font-semibold text-slate-200 truncate">{a.title}</p>
                                                            <p className="text-xs text-slate-400">{format(a.endDate, 'dd MMMM yyyy', { locale: tr })}</p>
                                                        </div>
                                                        <div className="shrink-0">
                                                            {isDue
                                                                ? <Badge variant="destructive" className="bg-red-500/20 text-red-300 border-red-500/50">Gecikti</Badge>
                                                                : isToday(a.endDate)
                                                                ? <Badge variant="outline" className="text-amber-400 border-amber-400 bg-amber-400/10">Bugün</Badge>
                                                                : <Badge variant="secondary" className="bg-slate-700 text-slate-300">{daysDiff + 1} gün</Badge>
                                                            }
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                            </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className={cn("p-10 text-center rounded-3xl border border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center", glassColors.TEXT_MUTED)}>
                            <CheckCircle className="w-12 h-12 mb-3 text-slate-600" />
                            <p>Bekleyen görev yok. Harika!</p>
                        </div>
                    )}

                     <div>
                        <h3 className="text-xl font-bold mb-4 text-slate-100 flex items-center gap-2"><CheckSquare className="w-5 h-5 text-emerald-400"/> Tamamlananlar ({completedAssignments.length})</h3>
                         <div className="space-y-2">
                             {completedAssignments.length > 0 ? completedAssignments.map(a => (
                                <div key={a.id} className="flex items-center p-3 gap-3 rounded-xl bg-slate-900/30 border border-white/5 opacity-60 hover:opacity-100 transition-opacity">
                                    <div className="p-2 bg-white/5 rounded-lg text-slate-400"><a.Icon className="h-4 w-4 shrink-0" /></div>
                                    <div className="flex-grow">
                                        <p className="font-semibold text-slate-400 line-through decoration-slate-600">{a.title}</p>
                                        <p className="text-xs text-slate-600">{format(a.endDate, 'dd MMMM yyyy', { locale: tr })}</p>
                                    </div>
                                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Tamamlandı</Badge>
                                </div>
                            )) : <div className={cn("p-6 text-center rounded-xl border border-dashed border-white/10 text-sm", glassColors.TEXT_MUTED)}>Henüz tamamlanan görev yok.</div>}
                        </div>
                    </div>
                </div>
            )
        }
        
        return null;
    }


  const pendingTests = tests.filter(test => test.status === 'Atandı');

  // Group Pending Tests by Category
  const groupedPendingTests = React.useMemo(() => {
    const groups: { [key: string]: Test[] } = {};
    pendingTests.forEach(test => {
        const category = getCategoryName(test);
        if (!groups[category]) groups[category] = [];
        groups[category].push(test);
    });
    return groups;
  }, [pendingTests]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden flex flex-col">
        
        {/* FIXED BACKGROUND */}
        <div className="fixed inset-0 bg-slate-950 -z-50" />
        
        {/* AMBIENT BACKGROUND */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[20%] left-[-5%] w-[400px] h-[400px] bg-blue-900/20 rounded-full blur-[120px]" />
        </div>

        {/* HEADER */}
        <div className={cn("sticky top-0 z-40 w-full transition-all duration-300", glassColors.HEADER_BG)}>
            <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <SidebarTrigger className={cn("p-2 rounded-xl", "bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20", "text-white")}>
                         <GraduationCap className="w-6 h-6" />
                    </SidebarTrigger>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-slate-100 leading-none">
                            Eğitim & Sınav
                        </h1>
                        <p className="text-xs font-medium text-slate-400 mt-0.5">Akademik Takip</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Link href="/education/management" className="hidden sm:block">
                        <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/10 rounded-xl">
                            <Settings className="mr-2 h-4 w-4" />
                            Yönetim
                        </Button>
                    </Link>
                    <Link href="/education/management/questions">
                        <Button className="rounded-xl px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-500/20 border border-indigo-400/20 h-10">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            <span className="hidden sm:inline">Ödev Ata</span>
                        </Button>
                    </Link>
                </div>
            </div>
        </div>

        <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 relative z-10 flex flex-col min-h-0">
            
            {/* Student Selector */}
            <div className="flex items-center gap-3 overflow-x-auto pb-6 scrollbar-hide mb-2">
                {studentMembers.map((student) => {
                    const isSelected = selectedStudent?.id === student.id;
                    return (
                        <button
                            key={student.id}
                            onClick={() => setSelectedStudent(student)}
                            className={cn(
                                "relative flex items-center gap-2 px-1 pr-4 py-1 rounded-full transition-all duration-300 border select-none shrink-0",
                                isSelected 
                                    ? glassColors.ACTIVE_MEMBER
                                    : glassColors.INACTIVE_MEMBER
                            )}
                        >
                            <div 
                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md ring-2 ring-white/10" 
                                style={{ backgroundColor: student.color }}
                            >
                                {student.name.charAt(0).toUpperCase()}
                            </div>
                            <span className={cn("text-sm font-bold", isSelected ? "text-white" : "text-slate-400")}>
                                {student.name}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* View Tabs */}
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-full space-y-6">
                <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 h-12 p-1 rounded-2xl bg-slate-900/50 border border-white/10 backdrop-blur-md">
                    <TabsTrigger value="cards" className="rounded-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400 hover:text-slate-200 transition-all">Genel Bakış</TabsTrigger>
                    <TabsTrigger value="weekly" className="rounded-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400 hover:text-slate-200 transition-all">Takvim</TabsTrigger>
                    <TabsTrigger value="list" className="rounded-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400 hover:text-slate-200 transition-all">Liste</TabsTrigger>
                </TabsList>
                
                {(viewMode === 'weekly') && (
                    <div className="flex items-center justify-center gap-4 mb-4 bg-white/5 w-fit mx-auto px-4 py-2 rounded-full border border-white/5 backdrop-blur-sm">
                        <Button variant="ghost" size="icon" onClick={() => setCurrentDate(d => addDays(d, -7))} className="text-slate-400 hover:text-white rounded-full hover:bg-white/10 h-8 w-8"><ChevronLeft className="h-4 w-4"/></Button>
                        <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())} className="text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10">Bugün</Button>
                        <p className="font-bold text-center text-sm min-w-[140px] text-slate-200">
                            {format(currentDate, 'dd MMMM yyyy', { locale: tr })}
                        </p>
                        <Button variant="ghost" size="icon" onClick={() => setCurrentDate(d => addDays(d, 7))} className="text-slate-400 hover:text-white rounded-full hover:bg-white/10 h-8 w-8"><ChevronRight className="h-4 w-4"/></Button>
                    </div>
                )}

                {viewMode === 'cards' ? (
                    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                        
                        {/* Overall Stats Card */}
                        {selectedStudent && (
                            <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl group">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-700 opacity-90 transition-opacity group-hover:opacity-100" />
                                <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all" />
                                
                                <div className="relative p-6 md:p-8 text-white">
                                    <div className="flex flex-col md:flex-row justify-between gap-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                                    <BarChart3 className="w-6 h-6" />
                                                </div>
                                                <h2 className="text-2xl font-black tracking-tight">{selectedStudent.name}</h2>
                                            </div>
                                            <p className="text-indigo-100 max-w-md text-sm leading-relaxed opacity-90">
                                                Genel başarı durumu ve tamamlanan testlerin özeti. İstatistiklerin detaylarına göz atın.
                                            </p>
                                            
                                            <Link href={`/education/stats?studentId=${selectedStudent.id}`} className="inline-block mt-2">
                                                <Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0 rounded-xl h-10 mt-2">
                                                    Detaylı Analiz <ArrowRight className="h-4 w-4 ml-2"/>
                                                </Button>
                                            </Link>
                                        </div>

                                        <div className="flex gap-6 items-center bg-black/20 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
                                            <div className="text-center px-4 border-r border-white/10">
                                                <div className="text-4xl font-black">{overallStats.testCount}</div>
                                                <div className="text-xs uppercase tracking-wider font-bold text-indigo-200 mt-1">Test</div>
                                            </div>
                                            <div className="text-center px-2">
                                                <div className="flex items-baseline gap-1 justify-center">
                                                    <span className="text-4xl font-black">%{overallStats.successRate.toFixed(0)}</span>
                                                </div>
                                                <div className="text-xs uppercase tracking-wider font-bold text-indigo-200 mt-1">Başarı</div>
                                                <Progress value={overallStats.successRate} className="mt-2 h-1.5 w-24 bg-black/30" indicatorClassName="bg-emerald-400" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Categories Grid */}
                        <div>
                            <h2 className="text-xl font-bold mb-5 flex items-center gap-2 text-slate-200">
                                <LayoutGrid className="w-5 h-5 text-indigo-400" />
                                Test Kategorileri
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                <Link href="/education/all-tests" className="block group h-full">
                                    <div className={cn("relative flex flex-col items-center justify-center h-full p-6 rounded-3xl transition-all border border-dashed border-slate-700 hover:border-slate-500 bg-slate-900/50 hover:bg-slate-800/50 group-hover:-translate-y-1")}>
                                        <Library className="w-10 h-10 mb-3 text-slate-500 group-hover:text-slate-300 transition-colors" />
                                        <span className="font-bold text-slate-400 group-hover:text-slate-200">Tümünü Gör</span>
                                    </div>
                                </Link>
                                {testsByCategory.map(([category, data]) => {
                                    const Icon = categoryIcons[category] || FileText;
                                    // Custom colors for specific cards
                                    const hoverColor = categoryCardColors[category] || 'hover:shadow-slate-500/20 hover:border-slate-500/50';
                                    const iconStyle = categoryIconColors[category] || 'text-slate-400 bg-slate-400/10';
                                    const pending = data.total - data.completed;
                        
                                    return (
                                        <Link key={category} href={`/education/category/${encodeURIComponent(category)}?studentId=${selectedStudent?.id}`} className="block group h-full">
                                            <div className={cn(
                                                "relative flex flex-col h-full p-5 rounded-3xl transition-all border border-white/5 bg-white/5 backdrop-blur-md group-hover:-translate-y-1",
                                                hoverColor
                                            )}>
                                                {pending > 0 && (
                                                    <Badge className="absolute top-3 right-3 bg-rose-500 text-white border-0 h-5 px-1.5 text-[10px] font-bold shadow-lg shadow-rose-500/40 animate-pulse">
                                                        {pending} YENİ
                                                    </Badge>
                                                )}
                                                
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className={cn("p-3 rounded-2xl", iconStyle)}>
                                                        <Icon className="w-6 h-6" />
                                                    </div>
                                                </div>
                                                
                                                <div className="mt-auto">
                                                    <h3 className="text-lg font-bold text-slate-200 mb-1 leading-tight group-hover:text-white transition-colors">{category}</h3>
                                                    <div className="flex items-center justify-between text-xs font-medium text-slate-500 mt-3 pt-3 border-t border-white/5">
                                                        <span>Toplam: {data.total}</span>
                                                        <span className="text-emerald-400">{data.completed} Tamamlandı</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Study Plans */}
                        {studyPlanStats.length > 0 && (
                            <div>
                                <h2 className="text-xl font-bold mb-5 flex items-center gap-2 text-slate-200">
                                    <BookHeart className="w-5 h-5 text-pink-400" />
                                    Konu Anlatım Planları
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {studyPlanStats.map(({ plan, progress }) => (
                                        <Link key={plan.id} href={`/education/study`} className="block group">
                                            <div className={cn("rounded-3xl p-6 transition-all border border-pink-500/20 bg-pink-500/5 hover:bg-pink-500/10 hover:border-pink-500/40 hover:-translate-y-1 group relative overflow-hidden")}>
                                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-pink-500/10 rounded-full blur-2xl group-hover:bg-pink-500/20 transition-all" />
                                                
                                                <div className="flex items-center gap-4 mb-4">
                                                    <div className="p-3 bg-pink-500/20 rounded-2xl text-pink-400">
                                                        <BookOpen className="w-6 h-6" />
                                                    </div>
                                                    <h3 className="text-lg font-bold text-pink-100">{plan.title}</h3>
                                                </div>
                                                
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-xs font-bold text-pink-300 uppercase tracking-wider">
                                                        <span>İlerleme</span>
                                                        <span>{Math.round((progress.completed / progress.total) * 100)}%</span>
                                                    </div>
                                                    <Progress value={(progress.completed / progress.total) * 100} className="h-2 bg-pink-900/20" indicatorClassName="bg-pink-500" />
                                                    <p className="text-xs text-pink-400/60 text-right pt-1">{progress.completed} / {progress.total} Konu</p>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Pending Tests - GROUPED BY CATEGORY */}
                        {pendingTests.length > 0 && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-200">Bekleyen Ödevler</h2>
                                        <p className="text-xs text-slate-400">Derslere göre gruplandırılmış çözülecek testler.</p>
                                    </div>
                                </div>

                                <div className="grid gap-4">
                                    {Object.entries(groupedPendingTests).sort().map(([category, categoryTests]) => {
                                        const Icon = categoryIcons[category] || FileText;
                                        const iconStyle = categoryIconColors[category] || 'text-slate-400 bg-slate-400/10';

                                        return (
                                            <div key={category} className={cn("rounded-3xl p-5 border border-white/5", glassColors.CARD_BG)}>
                                                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/5">
                                                     <div className={cn("p-2 rounded-lg", iconStyle)}>
                                                        <Icon className="w-5 h-5" />
                                                    </div>
                                                    <h3 className="font-bold text-slate-200 text-lg">{category}</h3>
                                                    <Badge variant="secondary" className="ml-auto bg-white/10 text-white/80">{categoryTests.length}</Badge>
                                                </div>

                                                <div className="grid gap-3">
                                                    {categoryTests.map(test => {
                                                        const dueDate = parse(test.dueDate, 'dd MMMM yyyy', new Date(), { locale: tr });
                                                        const now = new Date();
                                                        const daysDiff = differenceInDays(dueDate, now);
                                                        const isTestDue = isPast(dueDate) && !isToday(dueDate);
                                                        
                                                        // Ensure topic name is found if exists
                                                        const allTopics = trackedBooks.flatMap(book => 
                                                            (book.subjects || []).flatMap(subject => 
                                                                (subject.topics || []).map(topic => ({...topic, subjectName: subject.name}))
                                                            )
                                                        ) || [];
                                                        const topicName = allTopics.find(t => t.id === test.topicId)?.name;
                                                        
                                                        // Don't repeat category name in title if it's redundant
                                                        const displayName = topicName ? `${topicName} - ${test.title}` : test.title;

                                                        return (
                                                            <div key={test.id} className="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
                                                                <div className="flex-grow min-w-0">
                                                                    <div className="flex items-start justify-between md:block">
                                                                        <h3 className="font-semibold text-slate-200 text-sm md:text-base break-words min-w-0 pr-2">
                                                                            {displayName}
                                                                        </h3>
                                                                        {isTestDue && <Badge variant="destructive" className="md:hidden h-5 text-[10px] shrink-0">Gecikti</Badge>}
                                                                    </div>
                                                                    
                                                                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
                                                                        <span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3"/> {test.dueDate}</span>
                                                                        {!isTestDue && <span className="text-emerald-500 font-medium hidden md:inline-block">{daysDiff + 1} gün kaldı</span>}
                                                                         {isTestDue && <Badge variant="destructive" className="hidden md:inline-flex h-5 text-[10px]">Gecikti</Badge>}
                                                                    </div>
                                                                </div>
                                                                
                                                                <Link href={`/education/${test.id}`} className="w-full md:w-auto shrink-0 mt-1 md:mt-0">
                                                                    <Button size="sm" className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 text-xs md:text-sm h-9">
                                                                        Teste Git <ArrowRight className="h-3.5 w-3.5 ml-2"/>
                                                                    </Button>
                                                                </Link>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                         )}

                    </div>
                ) : renderCalendarView() }

            </Tabs>
        </div>
    </div>
  );
}
