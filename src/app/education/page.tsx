
"use client";

import * as React from "react";
import Link from "next/link";
import {
  Clock, CheckCircle2, ArrowRight, Calendar as CalendarIcon, 
  Layers, PieChart, GraduationCap, AlertCircle, Timer, 
  BookOpen, ChevronDown, ChevronRight, Check, Sparkles, TrendingUp, 
  TrendingDown, PlayCircle, CalendarClock, Target, BarChart,
  User, Settings, ScrollText, Ruler, TestTube2, BookCopy, Globe, MessageSquare, Gamepad2, FileText, ClipboardList, ListTree, LayoutGrid, CalendarDays
} from "lucide-react";

import { Test, StudyAssignment, StudyPlan, TrackedBook } from "@/lib/data";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { onTestsUpdate, onStudyAssignmentsUpdate, onStudyPlansUpdate, onTrackedBooksUpdate, updateStudyAssignment } from "@/lib/dataService";
import { useAuth } from "@/components/auth-provider";
import { parse, isPast, isToday, differenceInDays, startOfWeek, addDays, isSameDay, format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// ─── RENK SİSTEMİ (Daha Kurumsal ve Yumuşak Tonlar) ───────────────────────
const C = {
  BLUE:   '#3B82F6', // Tailwind Blue 500
  GREEN:  '#10B981', // Tailwind Emerald 500
  ORANGE: '#F59E0B', // Tailwind Amber 500
  RED:    '#EF4444', // Tailwind Red 500
  PURPLE: '#8B5CF6', // Tailwind Violet 500
  TEAL:   '#14B8A6', // Tailwind Teal 500
  INDIGO: '#6366F1', // Tailwind Indigo 500
  NAVY:   '#0F172A', // Slate 900 (Dark mode bg)
  CARD_DARK: '#1E293B', // Slate 800
};

const categoryThemes: Record<string, { bg: string, text: string, icon: any, border: string, accent: string }> = {
  'Matematik': { 
      bg: 'bg-blue-50/50 dark:bg-blue-950/20', 
      text: 'text-blue-700 dark:text-blue-400', 
      icon: Ruler, 
      border: 'border-blue-100 dark:border-blue-900/30',
      accent: 'bg-blue-500'
  },
  'Fen Bilimleri': { 
      bg: 'bg-teal-50/50 dark:bg-teal-950/20', 
      text: 'text-teal-700 dark:text-teal-400', 
      icon: TestTube2, 
      border: 'border-teal-100 dark:border-teal-900/30',
      accent: 'bg-teal-500'
  },
  'Türkçe': { 
      bg: 'bg-orange-50/50 dark:bg-orange-950/20', 
      text: 'text-orange-700 dark:text-orange-400', 
      icon: BookCopy, 
      border: 'border-orange-100 dark:border-orange-900/30',
      accent: 'bg-orange-500'
  },
  'Sosyal Bilgiler': { 
      bg: 'bg-purple-50/50 dark:bg-purple-950/20', 
      text: 'text-purple-700 dark:text-purple-400', 
      icon: Globe, 
      border: 'border-purple-100 dark:border-purple-900/30',
      accent: 'bg-purple-500'
  },
  'İngilizce': { 
      bg: 'bg-rose-50/50 dark:bg-rose-950/20', 
      text: 'text-rose-700 dark:text-rose-400', 
      icon: MessageSquare, 
      border: 'border-rose-100 dark:border-rose-900/30',
      accent: 'bg-rose-500'
  },
  'Genel Deneme Sınavları': { 
      bg: 'bg-indigo-50/50 dark:bg-indigo-950/20', 
      text: 'text-indigo-700 dark:text-indigo-400', 
      icon: ClipboardList, 
      border: 'border-indigo-100 dark:border-indigo-900/30',
      accent: 'bg-indigo-500'
  },
  'Serbest Etkinlikler': { 
      bg: 'bg-emerald-50/50 dark:bg-emerald-950/20', 
      text: 'text-emerald-700 dark:text-emerald-400', 
      icon: Gamepad2, 
      border: 'border-emerald-100 dark:border-emerald-900/30',
      accent: 'bg-emerald-500'
  },
  'Yanlışlarım': { 
      bg: 'bg-red-50/50 dark:bg-red-950/20', 
      text: 'text-red-700 dark:text-red-400', 
      icon: AlertCircle, 
      border: 'border-red-100 dark:border-red-900/30',
      accent: 'bg-red-500'
  },
  'Diğer': { 
      bg: 'bg-slate-50/50 dark:bg-slate-900/20', 
      text: 'text-slate-700 dark:text-slate-400', 
      icon: FileText, 
      border: 'border-slate-200 dark:border-slate-800',
      accent: 'bg-slate-500'
  },
};

export const getCategoryName = (test: Test): string => {
  if (test.sourceType === 'exam') return 'Genel Deneme Sınavları';
  if (test.sourceType === 'mistake') return 'Yanlışlarım';
  return test.subject || 'Diğer';
};

export default function EducationPage() {
  const { toast } = useToast();
  const { familyMembers } = useAuth();
  const [selectedStudent, setSelectedStudent] = React.useState<any>(null);

  const [allTests, setAllTests] = React.useState<Test[]>([]);
  const [studyAssignments, setStudyAssignments] = React.useState<StudyAssignment[]>([]);
  const [studyPlans, setStudyPlans] = React.useState<StudyPlan[]>([]);
  const [trackedBooks, setTrackedBooks] = React.useState<TrackedBook[]>([]);
  const [expandedBooks, setExpandedBooks] = React.useState<Set<string>>(new Set());
  const [todoViewMode, setTodoViewMode] = React.useState<'list' | 'week'>('list');

  const studentMembers = React.useMemo(() =>
    familyMembers.filter(m => m.role.includes('Çocuk')), [familyMembers]);

  React.useEffect(() => {
    if (studentMembers.length > 0 && !selectedStudent)
      setSelectedStudent(studentMembers[0]);
  }, [studentMembers, selectedStudent]);

  React.useEffect(() => {
    const u1 = onTestsUpdate(setAllTests, false, 'assignedDate', 'desc');
    const u2 = onStudyAssignmentsUpdate(setStudyAssignments);
    const u3 = onStudyPlansUpdate(setStudyPlans);
    const u4 = onTrackedBooksUpdate(setTrackedBooks);
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  const tests = React.useMemo(() =>
    !selectedStudent ? [] : allTests.filter(t => t.studentId === selectedStudent.id),
    [selectedStudent, allTests]);

  const assignments = React.useMemo(() =>
    !selectedStudent ? [] : studyAssignments.filter(s => s.studentId === selectedStudent.id),
    [selectedStudent, studyAssignments]);

  const assignmentsByBook = React.useMemo(() => {
    const grouped: Record<string, { title: string; assignments: StudyAssignment[]; total: number; completed: number }> = {};
    assignments.forEach(a => {
      const plan = studyPlans.find(p => p.id === a.studyPlanId);
      if (!plan) return;
      if (!grouped[plan.id]) grouped[plan.id] = { title: plan.title, assignments: [], total: 0, completed: 0 };
      grouped[plan.id].assignments.push(a);
      grouped[plan.id].total++;
      if (a.status === 'completed') grouped[plan.id].completed++;
    });
    return Object.entries(grouped)
      .map(([id, g]) => ({ id, ...g }))
      .filter(g => g.total > 0)
      .sort((a, b) => (b.total - b.completed) - (a.total - a.completed));
  }, [assignments, studyPlans]);

  const pendingTasks = React.useMemo(() => {
    const tTasks = tests
      .filter(t => t.status === 'Atandı')
      .map(t => {
        const dateObj = parse(t.dueDate, 'dd MMMM yyyy', new Date(), { locale: tr });
        return {
          id: t.id,
          type: 'test',
          title: t.title,
          subject: getCategoryName(t),
          dueDateStr: t.dueDate,
          dueDateObj: dateObj,
          questionCount: t.questionCount,
          durationMinutes: (t.questionCount || 0) * 2 || 30,
        };
      });

    const aTasks = assignments
      .filter(a => a.status === 'assigned')
      .map(a => {
        const dateObj = new Date(a.dueDate);
        const plan = studyPlans.find(p => p.id === a.studyPlanId);
        return {
          id: a.id,
          type: 'study',
          title: a.topic,
          subject: a.subject,
          dueDateStr: format(dateObj, 'dd MMMM yyyy', { locale: tr }),
          dueDateObj: dateObj,
          questionCount: null,
          planName: plan?.title || 'Bireysel Çalışma',
          planLink: plan?.link,
          durationMinutes: a.durationMinutes || 30,
        };
      });

    return [...tTasks, ...aTasks].sort((a, b) => a.dueDateObj.getTime() - b.dueDateObj.getTime());
  }, [tests, assignments, studyPlans]);

  const focusTask = React.useMemo(() => {
    const testsOnly = pendingTasks.filter(t => t.type === 'test');
    if (testsOnly.length === 0) return null;
    return testsOnly[0];
  }, [pendingTasks]);

  const stats = React.useMemo(() => {
    const completedTests = tests.filter(t => t.status === 'Sonuçlandı');
    const completedAssignments = assignments.filter(a => a.status === 'completed');
    const totalTasksCount = tests.length + assignments.length;
    const totalCompletedTasksCount = completedTests.length + completedAssignments.length;
    const completedRate = totalTasksCount > 0 ? (totalCompletedTasksCount / totalTasksCount) * 100 : 0;

    let totalQ = 0, totalC = 0;
    completedTests.forEach(t => { totalQ += t.questionCount || 0; totalC += t.correctAnswers || 0; });
    const successRate = totalQ > 0 ? (totalC / totalQ) * 100 : 0;
    const overdueCount = tests.filter(t => t.status === 'Atandı' && isPast(parse(t.dueDate, 'dd MMMM yyyy', new Date(), { locale: tr })) && !isToday(parse(t.dueDate, 'dd MMMM yyyy', new Date(), { locale: tr }))).length;

    return {
      testCount: tests.length,
      pendingCount: (tests.length - completedTests.length) + (assignments.length - completedAssignments.length),
      successRate,
      averageScore: totalQ > 0 ? (totalC / totalQ) * 5 : 0,
      overdueCount,
      completedAssignmentsRate: completedRate
    };
  }, [tests, assignments]);

  const handleCompleteStudy = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'assigned' : 'completed';
    await updateStudyAssignment(id, { status: newStatus as any, completedAt: newStatus === 'completed' ? new Date().toISOString() : null });
    toast({ title: currentStatus === 'completed' ? "Geri Alındı" : "Tamamlandı ✓" });
  };

  const toggleBook = (id: string) => {
    setExpandedBooks(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const MiniBarChart = ({ color }: { color: string }) => (
    <div className="flex items-end gap-1 h-8 mt-2 opacity-80">
      {[40, 70, 45, 90, 60, 85, 50].map((h, i) => (
        <div key={i} className="w-1.5 rounded-t-sm" style={{ height: `${h}%`, backgroundColor: color }} />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] font-sans pb-28 text-slate-800 dark:text-slate-200">
      <div className="h-[env(safe-area-inset-top,0px)]" />

      <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#0F172A]/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
        <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-blue-500/20">
              < GraduationCap className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-none">Eğitim Paneli</h1>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Platform Education LMS</p>
            </div>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            <div className="flex gap-3">
              {studentMembers.map(s => {
                const active = selectedStudent?.id === s.id;
                return (
                  <button key={s.id} onClick={() => setSelectedStudent(s)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2 rounded-xl transition-all border flex-shrink-0 text-left",
                      active 
                        ? "bg-white dark:bg-[#1E293B] border-blue-500 dark:border-blue-500 shadow-md ring-1 ring-blue-500" 
                        : "bg-transparent border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}>
                    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden border border-slate-300 dark:border-slate-600">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <div>
                      <p className={cn("text-sm font-bold leading-tight", active ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400")}>{s.name}</p>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Öğrenci</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 hidden md:block shrink-0 mx-1" />
            <Link href="/education/management" title="Yönetim Paneli" className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 border border-transparent dark:border-slate-700 transition-colors">
              <Settings className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="px-6 pt-8 space-y-8 max-w-6xl mx-auto">
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {selectedStudent && (
            <Link href={`/education/stats?studentId=${selectedStudent.id}`} className="group block col-span-1 active:scale-[0.98] transition-transform">
              <div className="rounded-2xl p-6 relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20 flex flex-col justify-between min-h-[160px] h-full">
                <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/20 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex items-start justify-between mb-2">
                  <p className="text-white/90 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" /> Başarı Oranı
                  </p>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider">
                    <TrendingUp className="w-3 h-3" /> %3 Artış
                  </div>
                </div>
                <div className="relative z-10 flex items-end justify-between mt-auto">
                  <div className="flex flex-col">
                    <div className="flex items-baseline text-white">
                      <span className="text-2xl font-medium mr-0.5 opacity-80">%</span>
                      <span className="text-5xl font-black tracking-tighter leading-none">{Math.floor(stats.successRate)}</span>
                      <span className="text-xl font-bold text-white/80">.{(stats.successRate % 1).toFixed(2).substring(2)}</span>
                    </div>
                    <p className="text-white/80 text-xs font-medium mt-1">Geçen haftaya göre</p>
                  </div>
                  <div className="relative w-12 h-12 shrink-0 drop-shadow-lg mb-1">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="12" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="white" strokeWidth="12"
                        strokeLinecap="round" strokeDasharray={251.2} strokeDashoffset={251.2 - (251.2 * stats.successRate) / 100}
                        className="transition-all duration-1000 ease-out" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          )}

          <div className="grid grid-cols-2 gap-3 col-span-1 lg:col-span-2">
            <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-3 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Ödev Tamamlama</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">%{stats.completedAssignmentsRate.toFixed(0)}</p>
              <MiniBarChart color={C.BLUE} />
            </div>
            <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-3 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Ortalama Puan</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.averageScore.toFixed(2)}<span className="text-sm font-medium text-slate-400">/5</span></p>
              <MiniBarChart color={C.TEAL} />
            </div>
            <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-3 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Toplam Görev</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.testCount}</p>
              <MiniBarChart color={C.PURPLE} />
            </div>
            <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-3 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-10"><AlertCircle className="w-10 h-10 text-red-500" /></div>
              <p className="text-[11px] font-bold text-slate-500 uppercase relative z-10">Geciken Görev</p>
              <p className="text-2xl font-black text-red-500 dark:text-red-400 mt-1 relative z-10">{stats.overdueCount}</p>
              <div className="w-full h-8 mt-2 opacity-50 relative z-10">
                 <svg viewBox="0 0 100 30" className="w-full h-full fill-none stroke-red-500 stroke-2" preserveAspectRatio="none">
                    <path d="M0,25 Q20,5 40,20 T80,10 T100,20" />
                 </svg>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 dark:bg-slate-800 rounded-2xl p-3 border border-slate-800 dark:border-slate-700 shadow-xl flex flex-col relative overflow-hidden">
            <div className="absolute -right-4 -top-3 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl" />
            <div className="flex items-center gap-2 mb-3 relative z-10">
              <Target className="w-3.5 h-3.5 text-blue-400" />
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Günün Odağı</h3>
            </div>
            {focusTask ? (
              <div className="flex-1 flex flex-col justify-between relative z-10">
                <div>
                  <p className="text-white font-black text-base leading-tight mb-2">{focusTask.title}</p>
                  <p className="text-slate-400 text-sm flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5"/> {focusTask.dueDateStr}</p>
                </div>
                <Link href={focusTask.type === 'test' ? `/education/${focusTask.id}` : (focusTask.planLink || `/education/study`)} target={focusTask.type === 'study' ? "_blank" : undefined}>
                  <button className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
                    <PlayCircle className="w-3.5 h-3.5" /> Başla
                  </button>
                </Link>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center relative z-10">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
                <p className="text-white font-bold">Harika!</p>
                <p className="text-slate-400 text-sm">Acil bekleyen görev yok.</p>
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link href="/education/summaries" className="group">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-3 md:p-6 rounded-3xl text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-between h-full">
                    <div className="flex items-center gap-3">
                        <div className="p-2 md:p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                            <ScrollText className="w-3.5 h-3.5 md:w-8 md:h-8" />
                        </div>
                        <div className="hidden sm:block">
                            <h3 className="text-lg font-black leading-none">Ders Özetleri</h3>
                            <p className="text-emerald-100 text-[10px] font-medium mt-1">Konu tekrarları</p>
                        </div>
                        <div className="sm:hidden">
                             <h3 className="text-sm font-black leading-tight">Özetler</h3>
                        </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-50 group-hover:translate-x-1 transition-transform" />
                </div>
            </Link>
            
            <Link href="/education/results" className="group">
                <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-3 md:p-6 rounded-3xl text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-between h-full">
                    <div className="flex items-center gap-3">
                        <div className="p-2 md:p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                            <ListTree className="w-3.5 h-3.5 md:w-8 md:h-8" />
                        </div>
                        <div className="hidden sm:block">
                            <h3 className="text-lg font-black leading-none">Sonuçlarım</h3>
                            <p className="text-indigo-100 text-[10px] font-medium mt-1">Tüm sınav raporları</p>
                        </div>
                        <div className="sm:hidden">
                             <h3 className="text-sm font-black leading-tight">Sonuçlar</h3>
                        </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-50 group-hover:translate-x-1 transition-transform" />
                </div>
            </Link>

            <Link href="/education/study" className="group">
                <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-3 md:p-6 rounded-3xl text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-between h-full">
                    <div className="flex items-center gap-3">
                        <div className="p-2 md:p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                            <BookOpen className="w-3.5 h-3.5 md:w-8 md:h-8" />
                        </div>
                        <div className="hidden sm:block">
                            <h3 className="text-lg font-black leading-none">Konu Çalışma</h3>
                            <p className="text-indigo-100 text-[10px] font-medium mt-1">Ders görevlerin</p>
                        </div>
                         <div className="sm:hidden">
                             <h3 className="text-sm font-black leading-tight">Çalışma</h3>
                        </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-50 group-hover:translate-x-1 transition-transform" />
                </div>
            </Link>

            <Link href="/education/mistakes" className="group">
                <div className="bg-gradient-to-br from-rose-500 to-pink-600 p-3 md:p-6 rounded-3xl text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-between h-full">
                    <div className="flex items-center gap-3">
                        <div className="p-2 md:p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                            <AlertCircle className="w-3.5 h-3.5 md:w-8 md:h-8" />
                        </div>
                        <div className="hidden sm:block">
                            <h3 className="text-lg font-black leading-none">Yanlışlarım</h3>
                            <p className="text-rose-100 text-[10px] font-medium mt-1">Hata havuzun</p>
                        </div>
                         <div className="sm:hidden">
                             <h3 className="text-sm font-black leading-tight">Hatalar</h3>
                        </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-50 group-hover:translate-x-1 transition-transform" />
                </div>
            </Link>
        </section>

        {pendingTasks.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5 px-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Layers className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Yapılacaklar</h2>
                <span className="hidden sm:inline-flex text-[10px] font-black px-3 py-1 ml-2 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 uppercase tracking-widest">
                  {pendingTasks.length} Görev
                </span>
              </div>
              
              <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center shadow-inner">
                <button 
                  onClick={() => setTodoViewMode('list')}
                  className={cn("px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5", todoViewMode === 'list' ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}
                >
                  <LayoutGrid className="w-3.5 h-3.5" /> Liste
                </button>
                <button 
                  onClick={() => setTodoViewMode('week')}
                  className={cn("px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5", todoViewMode === 'week' ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}
                >
                  <CalendarDays className="w-3.5 h-3.5" /> Hafta
                </button>
              </div>
            </div>

            
            {todoViewMode === 'week' ? (
              <div className="overflow-x-auto pb-4 hide-scrollbar snap-x snap-mandatory">
                <div className="flex gap-3 min-w-max">
                  {Array.from({length: 7}).map((_, i) => {
                    const currentDay = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), i);
                    const isDayToday = isToday(currentDay);
                    
                    const dayTasks = pendingTasks.filter(t => {
                      if (isDayToday) {
                        return isSameDay(t.dueDateObj, currentDay) || (isPast(t.dueDateObj) && !isToday(t.dueDateObj));
                      }
                      return isSameDay(t.dueDateObj, currentDay);
                    });

                    return (
                      <div key={i} className={cn("w-64 flex-shrink-0 snap-center rounded-3xl p-3 border bg-slate-50/50 dark:bg-slate-900/50", isDayToday ? "border-indigo-300 dark:border-indigo-700 bg-indigo-50/30 dark:bg-indigo-900/10 shadow-sm" : "border-slate-200 dark:border-slate-800")}>
                        <div className="flex items-center justify-between mb-3 px-1">
                          <div>
                            <p className={cn("text-sm font-black", isDayToday ? "text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-200")}>
                              {format(currentDay, 'EEEE', { locale: tr })}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                              {format(currentDay, 'd MMMM', { locale: tr })}
                            </p>
                          </div>
                          {isDayToday && <Badge className="bg-indigo-500 text-white border-none text-[9px] uppercase tracking-wider px-2 py-0.5">Bugün</Badge>}
                        </div>
                        
                        <div className="space-y-3">
                          {dayTasks.length > 0 ? dayTasks.map(task => {
                            const category = task.subject;
                            const theme = categoryThemes[category] || categoryThemes['Diğer'];
                            const Icon = theme.icon;
                            const tDate = task.dueDateObj;
                            const overdue = isPast(tDate) && !isToday(tDate);
                            const duration = task.durationMinutes;
                            return (
                              <Link href={task.type === 'test' ? `/education/${task.id}` : (task.planLink || `/education/study`)} target={task.type === 'study' ? "_blank" : undefined} key={task.id} className="block group">
                                <div className={cn("bg-white dark:bg-slate-950 rounded-2xl p-3 border transition-all shadow-sm hover:shadow-md", theme.border, isDayToday && overdue ? "border-rose-300 dark:border-rose-800 bg-rose-50/30 dark:bg-rose-950/20" : "")}>
                                  <div className="flex items-start justify-between mb-2 gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5 mb-1">
                                        <div className={cn("w-1.5 h-1.5 rounded-full", theme.accent)} />
                                        <span className={cn("text-[9px] font-black uppercase tracking-widest truncate", theme.text)}>{category}</span>
                                      </div>
                                      <h4 className="text-[11px] font-bold text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight">{task.title}</h4>
                                    </div>
                                    <div className={cn("w-6 h-6 rounded-xl flex items-center justify-center shrink-0 border bg-white dark:bg-slate-900", theme.border)}>
                                      <Icon className={cn("w-3.5 h-3.5", theme.text)} />
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <div className="flex gap-2">
                                      {task.questionCount !== null && <span className="text-[9px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{task.questionCount} Soru</span>}
                                      {task.type === 'study' && <span className="text-[9px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded truncate max-w-[120px]" title={task.planName}>{task.planName}</span>}
                                      <span className="text-[9px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{duration} dk</span>
                                    </div>
                                    {isDayToday && overdue && <span className="text-[9px] font-black text-rose-500 uppercase animate-pulse">Gecikti</span>}
                                  </div>
                                </div>
                              </Link>
                            )
                          }) : (
                            <div className="h-24 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400 gap-1 opacity-50">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span className="text-[10px] font-bold uppercase tracking-widest">Görev Yok</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              
              <div className="space-y-8">
                {pendingTasks.filter(t => t.type === 'test').length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-indigo-500" /> Sınavlar ve Testler
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {pendingTasks.filter(t => t.type === 'test').map(task => {

                const category = task.subject;
                const theme = categoryThemes[category] || categoryThemes['Diğer'];
                const Icon = theme.icon;
                const dueDate = task.dueDateObj;
                  const overdue = isPast(dueDate) && !isToday(dueDate);
                  const dueToday = isToday(dueDate);
                  const daysDiff = differenceInDays(dueDate, new Date());
                  const duration = task.durationMinutes;
                  return (
                    <div key={task.id} className={cn("relative overflow-hidden rounded-[2rem] p-3 border-2 transition-all duration-300 group flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-1", theme.border, theme.bg)}>
                      <div className={cn("absolute top-0 left-0 w-full h-1.5", theme.accent)} />
                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-3">
                           <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-2.5 h-2.5 rounded-full", theme.accent)} />
                                    <span className={cn("text-[10px] font-black uppercase tracking-widest", theme.text)}>{category}</span>
                                </div>
                                <h3 className={cn("text-base font-bold leading-tight line-clamp-2 pr-4 text-slate-800 dark:text-slate-100")}>{task.title}</h3>
                           </div>
                           <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border-2 bg-white dark:bg-slate-900", theme.border)}>
                               <Icon className={cn("w-3.5 h-3.5", theme.text)} />
                           </div>
                        </div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/60 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 text-slate-600 dark:text-slate-300">
                                <CalendarIcon className="w-3.5 h-3.5" />
                                <span className="text-[11px] font-bold">{task.dueDateStr}</span>
                            </div>
                            {overdue ? (
                                <Badge className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-black px-3 py-1.5 shadow-md shadow-rose-500/20 border-none animate-pulse">Gecikti!</Badge>
                            ) : dueToday ? (
                                <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-black px-3 py-1.5 shadow-md shadow-amber-500/20 border-none animate-pulse">Bugün Son</Badge>
                            ) : daysDiff <= 2 ? (
                                <Badge className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-black px-3 py-1.5 shadow-md shadow-orange-500/20 border-none">{daysDiff + 1} Gün Kaldı</Badge>
                            ) : (
                                <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black px-3 py-1.5 shadow-sm border-none">{daysDiff + 1} Gün Kaldı</Badge>
                            )}
                        </div>
                      </div>
                      <div className="space-y-4 relative z-10">
                        <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                          <div className="flex-1 text-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Soru</p>
                            <p className="text-sm font-black text-slate-700 dark:text-slate-200">{task.questionCount || '-'}</p>
                          </div>
                          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
                          <div className="flex-1 text-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Süre</p>
                            <p className="text-sm font-black text-slate-700 dark:text-slate-200">{duration} dk</p>
                          </div>
                        </div>
                        <Link href={task.type === 'test' ? `/education/${task.id}` : (task.planLink || `/education/study`)} target={task.type === 'study' ? "_blank" : undefined} className="block w-full">
                          <button className={cn("w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-widest text-center transition-all shadow-md active:scale-95", task.type === 'test' ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20" : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20")}>
                            {task.type === 'test' ? 'Ödevi Çöz' : 'Konuya Çalış'}
                          </button>
                        </Link>
                      </div>
                    </div>
                  );
              
                      })}
                    </div>
                  </div>
                )}
                
                {pendingTasks.filter(t => t.type === 'study').length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5 text-emerald-500" /> Konu Çalışmaları
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {pendingTasks.filter(t => t.type === 'study').map(task => {

                const category = task.subject;
                const theme = categoryThemes[category] || categoryThemes['Diğer'];
                const Icon = theme.icon;
                const dueDate = task.dueDateObj;
                  const overdue = isPast(dueDate) && !isToday(dueDate);
                  const dueToday = isToday(dueDate);
                  const daysDiff = differenceInDays(dueDate, new Date());
                  const duration = task.durationMinutes;
                  return (
                    <div key={task.id} className={cn("relative overflow-hidden rounded-[2rem] p-3 border-2 transition-all duration-300 group flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-1", theme.border, theme.bg)}>
                      <div className={cn("absolute top-0 left-0 w-full h-1.5", theme.accent)} />
                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-3">
                           <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-2.5 h-2.5 rounded-full", theme.accent)} />
                                    <span className={cn("text-[10px] font-black uppercase tracking-widest", theme.text)}>{category}</span>
                                </div>
                                <h3 className={cn("text-base font-bold leading-tight line-clamp-2 pr-4 text-slate-800 dark:text-slate-100")}>{task.title}</h3>
                           </div>
                           <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border-2 bg-white dark:bg-slate-900", theme.border)}>
                               <Icon className={cn("w-3.5 h-3.5", theme.text)} />
                           </div>
                        </div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/60 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 text-slate-600 dark:text-slate-300">
                                <CalendarIcon className="w-3.5 h-3.5" />
                                <span className="text-[11px] font-bold">{task.dueDateStr}</span>
                            </div>
                            {overdue ? (
                                <Badge className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-black px-3 py-1.5 shadow-md shadow-rose-500/20 border-none animate-pulse">Gecikti!</Badge>
                            ) : dueToday ? (
                                <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-black px-3 py-1.5 shadow-md shadow-amber-500/20 border-none animate-pulse">Bugün Son</Badge>
                            ) : daysDiff <= 2 ? (
                                <Badge className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-black px-3 py-1.5 shadow-md shadow-orange-500/20 border-none">{daysDiff + 1} Gün Kaldı</Badge>
                            ) : (
                                <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black px-3 py-1.5 shadow-sm border-none">{daysDiff + 1} Gün Kaldı</Badge>
                            )}
                        </div>
                      </div>
                      <div className="space-y-4 relative z-10">
                        <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                          <div className="flex-1 text-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Plan Adı</p>
                            <p className="text-sm font-black text-slate-700 dark:text-slate-200 truncate pr-2" title={task.planName}>{task.planName}</p>
                          </div>
                          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
                          <div className="flex-1 text-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Süre</p>
                            <p className="text-sm font-black text-slate-700 dark:text-slate-200">{duration} dk</p>
                          </div>
                        </div>
                        <Link href={task.type === 'test' ? `/education/${task.id}` : (task.planLink || `/education/study`)} target={task.type === 'study' ? "_blank" : undefined} className="block w-full">
                          <button className={cn("w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-widest text-center transition-all shadow-md active:scale-95", task.type === 'test' ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20" : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20")}>
                            {task.type === 'test' ? 'Ödevi Çöz' : 'Konuya Çalış'}
                          </button>
                        </Link>
                      </div>
                    </div>
                  );
              
                      })}
                    </div>
                  </div>
                )}
              </div>
            
            )}
          </section>
        )}

        {assignmentsByBook.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-5">
              <BookOpen className="w-3.5 h-3.5 text-slate-800 dark:text-slate-200" />
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Konu Çalışma Planı</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {assignmentsByBook.map((group, index) => {
                const pct = (group.completed / group.total) * 100;
                const done = group.completed === group.total;
                const open = expandedBooks.has(group.id);
                const pending = group.assignments.filter(a => a.status !== 'completed');
                const completed = group.assignments.filter(a => a.status === 'completed');
                const coverColors = ['from-blue-600 to-indigo-800', 'from-emerald-500 to-teal-700', 'from-amber-500 to-orange-700', 'from-rose-500 to-red-800'];
                const coverBg = coverColors[index % coverColors.length];
                return (
                  <div key={group.id} className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                    <button onClick={() => toggleBook(group.id)} className="p-3 flex items-start gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors relative">
                      {!done && (
                        <div className="absolute top-3 left-4 z-20">
                            <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)] animate-pulse border-2 border-white dark:border-[#1E293B]" />
                        </div>
                      )}
                      <div className={cn("w-16 h-24 rounded-r-md rounded-l-sm shadow-md shrink-0 bg-gradient-to-br relative border-l-4 border-black/20", coverBg)}>
                        <div className="absolute top-2 left-2 text-[8px] font-bold text-white/70 uppercase">DERS<br/>PLANI</div>
                        <div className="absolute bottom-2 left-2 right-2 h-1 bg-white/20 rounded" />
                      </div>
                      <div className="flex-1 min-w-0 py-1">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">{group.title}</h3>
                          <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform shrink-0", open && "rotate-180")} />
                        </div>
                        <div className="mt-4">
                          <div className="flex justify-between text-[11px] font-bold mb-1">
                            <span className={done ? "text-emerald-500" : "text-blue-500"}>%{pct.toFixed(0)}</span>
                            <span className="text-slate-400">{group.completed}/{group.total}</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div className={cn("h-full rounded-full transition-all duration-500", done ? "bg-emerald-500" : "bg-blue-500")} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    </button>
                    {open && (
                      <div className="bg-slate-50 dark:bg-[#0F172A]/50 border-t border-slate-200 dark:border-slate-800 p-2 space-y-4">
                        {pending.length > 0 && (
                          <div className="space-y-1">
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-1">Bekleyen Konular</p>
                             {pending.map((a) => (
                                <div key={a.id} onClick={() => handleCompleteStudy(a.id, a.status)}
                                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-white dark:hover:bg-[#1E293B] cursor-pointer transition-colors group border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                                    <div className={cn("w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border-2 mt-0.5 transition-colors border-slate-300 dark:border-slate-600 group-hover:border-blue-400")}>
                                      {a.status === 'completed' && <Check className="w-3.5 h-3.5 text-white" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{a.topic}</p>
                                      <div className="flex items-center gap-3 mt-1 opacity-70">
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">{a.subject}</span>
                                      </div>
                                    </div>
                                </div>
                             ))}
                          </div>
                        )}
                        {completed.length > 0 && (
                          <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="completed-list" className="border-none">
                              <AccordionTrigger className="flex items-center justify-between px-3 py-2 h-8 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:no-underline transition-all">
                                <div className="flex items-center gap-2">
                                   <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tamamlananlar ({completed.length})</span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="pt-2 pb-0">
                                <div className="space-y-1">
                                  {completed.map((a) => (
                                    <div key={a.id} onClick={() => handleCompleteStudy(a.id, a.status)}
                                        className="flex items-start gap-3 p-3 rounded-xl hover:bg-white dark:hover:bg-[#1E293B] cursor-pointer transition-colors group opacity-60 hover:opacity-100">
                                        <div className="w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border-2 mt-0.5 transition-colors bg-emerald-500 border-emerald-500">
                                          <Check className="w-3.5 h-3.5 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-slate-400 line-through">{a.topic}</p>
                                          <div className="flex items-center gap-3 mt-1 opacity-50">
                                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">{a.subject}</span>
                                          </div>
                                        </div>
                                    </div>
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {pendingTasks.length === 0 && assignmentsByBook.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-200 dark:border-slate-800 border-dashed">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Her şey yolunda!</h3>
            <p className="text-slate-500 max-w-sm">Tüm testler ve konu anlatımları tamamlandı. Öğrenci şu anda rotasında ilerliyor.</p>
          </div>
        )}
      </main>
    </div>
  );
}
