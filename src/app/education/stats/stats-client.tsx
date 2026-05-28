
"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Check, Percent, Filter, RotateCcw,
  Flame, Calendar, BarChart3, PieChart as PieIcon, LineChart as LineIcon,
  Calculator, Layers, ChevronRight, Activity, BookOpen, Loader2,
  TrendingDown, Trophy, Sparkles, GraduationCap,
  ArrowUpRight, ArrowDownRight, Minus, AlertCircle, Target, Clock,
  ChevronsUpDown, ChevronUp, ChevronDown, X,
  TrendingUp, SlidersHorizontal, Search,
  GitCompareArrows, Plus, Edit3, Trash2, CheckCircle2,
  Flag, Smile, Heart, CalendarIcon, ListX, ListTodo
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip,
  XAxis, YAxis, Cell, PieChart, Pie, ComposedChart, Legend,
  Line, LabelList
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/auth-provider";
import { 
  onTestsUpdate, onTrackedBooksUpdate, 
  onPerformanceGoalsUpdate, updatePerformanceGoal, 
  addPerformanceGoal, deletePerformanceGoal 
} from "@/lib/dataService";
import { cn } from "@/lib/utils";
import {
  format, startOfWeek, eachDayOfInterval,
  subDays, parseISO, eachMonthOfInterval, subMonths,
  startOfYear, parse, addMonths, differenceInDays,
  startOfDay, endOfDay, getDay, startOfMonth
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import type { Test, PerformanceGoal, PerformanceGoalType, PerformanceGoalPeriod } from "@/lib/data";
import { PerformanceGoals } from "@/components/education/performance-goals";

// --- RENK SİSTEMİ ---
const C = {
  BLUE:    '#3B82F6',
  INDIGO:  '#6366F1',
  PURPLE:  '#8B5CF6',
  EMERALD: '#10B981',
  AMBER:   '#F59E0B',
  ROSE:    '#F43F5E',
  CYAN:    '#06B6D4',
  ORANGE:  '#F97316',
  SLATE:   '#94A3B8',
  VIOLET:  '#7C3AED',
};

// 1. Dairesel Hedef Kartı Bileşeni
const VisualGoalCard = ({ 
  title, 
  current, 
  target, 
  unit = "Soru", 
  icon: Icon, 
  color = "#6366F1",
  deadline 
}: { 
  title: string; current: number; target: number; unit?: string; icon: any; color?: string; deadline?: string 
}) => {
  const rawProgress = target > 0 ? (current / target) * 100 : 0;
  const progress = Math.min(rawProgress, 100);
  const isCompleted = progress >= 100;

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }} 
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "relative rounded-[2rem] p-6 border shadow-sm overflow-hidden group transition-all hover:shadow-md",
        isCompleted ? "bg-emerald-50/30 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
      )}
    >
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 opacity-10 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: color }} />

      <div className="flex items-center gap-6">
        <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90 drop-shadow-sm" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100 dark:text-slate-800" />
            <circle 
              cx="50" cy="50" r={radius} 
              stroke={isCompleted ? '#10B981' : color} 
              strokeWidth="8" 
              fill="transparent" 
              strokeDasharray={circumference} 
              strokeDashoffset={strokeDashoffset} 
              strokeLinecap="round"
              className="transition-all duration-1500 ease-out" 
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {isCompleted ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            ) : (
              <span className="text-lg font-black text-slate-700 dark:text-slate-200">
                %{Math.floor(progress)}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${color}15`, color: color }}>
              <Icon className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-slate-800 dark:text-slate-100 truncate text-base">{title}</h3>
          </div>
          
          <div className="mt-3 flex items-end gap-1.5">
            <span className="text-3xl font-black leading-none text-slate-900 dark:text-white">
                {unit === '%' ? current.toFixed(1) : Math.round(current)}
            </span>
            <span className="text-sm font-bold text-slate-400 mb-0.5">/ {target} {unit}</span>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] font-bold">
            {isCompleted ? (
              <span className="text-emerald-500 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-md">Hedef Tamamlandı! 🎉</span>
            ) : (
              <span className="text-slate-400">
                Kalan: <span className="text-slate-700 dark:text-slate-300">
                    {unit === '%' ? Math.max(0, (target - current)).toFixed(1) : Math.max(0, Math.round(target - current))} {unit}
                </span>
              </span>
            )}
            {deadline && (
              <span className="text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {deadline}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// --- UTILS ---
const getCategoryName = (test: Test): string => {
  if (test.sourceType === 'exam') return 'Genel Deneme Sınavları';
  if (test.sourceType === 'mistake') return 'Yanlışlarım';
  return test.subject || 'Diğer';
};

function translateType(type: string) {
  const map: Record<string, string> = {
    exam: 'Deneme', bank: 'Soru Bankası', json: 'Yazılı',
    trackedBook: 'Kitap', html: 'HTML', quick: 'Hızlı', mistake: 'Yanlış Havuzu'
  };
  return map[type] || type;
}

function rateColor(r: number) {
  if (r >= 75) return C.EMERALD;
  if (r >= 50) return C.AMBER;
  return C.ROSE;
}

// --- MAIN COMPONENT ---
export function StatsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const studentId = searchParams.get('studentId');
  const { familyMembers, familyId } = useAuth();

  const [tests, setTests] = React.useState<any[]>([]);
  const [trackedBooks, setTrackedBooks] = React.useState<any[]>([]);
  const [performanceGoals, setPerformanceGoals] = React.useState<PerformanceGoal[]>([]);
  const [loading, setLoading] = React.useState(true);

  // -- Filters --
  const [activePeriod, setActivePeriod] = React.useState<Period>('monthly');
  const [selectedSubject, setSelectedSubject] = React.useState('all');
  const [selectedTopic, setSelectedTopic] = React.useState('all');
  const [selectedType, setSelectedSourceType] = React.useState('all');
  const [dateFrom, setDateFrom] = React.useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = React.useState<Date | undefined>(undefined);
  const [netSliderValue, setNetSliderValue] = React.useState<[number, number]>([-20, 100]);

  // -- UI States --
  const [activeTab, setActiveTab] = React.useState('overview');
  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = React.useState(false);
  const [tableSortKey, setTableSortKey] = React.useState<SortKey>('total');
  const [tableSortDir, setTableSortDir] = React.useState<SortDir>('desc');
  const [tableSearch, setTableSearch] = React.useState('');

  // -- Form States --
  const [goalForm, setGoalForm] = React.useState<{
    type: PerformanceGoalType;
    subject: string;
    target: string;
    label: string;
    period: PerformanceGoalPeriod;
  }>({
    type: 'questions',
    subject: 'all',
    target: '',
    label: '',
    period: 'weekly',
  });

  const student = React.useMemo(() => familyMembers.find(m => m.id === studentId), [familyMembers, studentId]);

  React.useEffect(() => {
    if (!studentId || !familyId) { setLoading(false); return; }
    const unsubTests = onTestsUpdate((all: any[]) => {
      setTests(all.filter(t => t.studentId === studentId && t.status === 'Sonuçlandı'));
      setLoading(false);
    });
    const unsubBooks = onTrackedBooksUpdate(setTrackedBooks);
    const unsubGoals = onPerformanceGoalsUpdate(studentId, setPerformanceGoals);
    return () => { unsubTests(); unsubBooks(); unsubGoals(); };
  }, [studentId, familyId]);

  // -- DATA ENRICHMENT --
  const enrichedBaseData = React.useMemo(() => {
    const allTopics = trackedBooks.flatMap(b =>
      (b.subjects || []).flatMap((s: any) =>
        (s.topics || []).map((t: any) => ({ ...t, subjectName: s.name }))
      )
    );
    return tests.map(test => {
      const subjectName = getCategoryName(test);
      let topicName = 'Genel';
      if (test.topicId) topicName = allTopics.find((t: any) => t.id === test.topicId)?.name || 'Genel';
      else if (test.topic) topicName = test.topic;

      let solvedDate: Date;
      if (test.updatedAt) solvedDate = parseISO(test.updatedAt);
      else {
        try { solvedDate = parse(test.assignedDate, 'dd MMMM yyyy', new Date(), { locale: tr }); }
        catch { solvedDate = new Date(test.assignedDate); }
      }
      if (isNaN(solvedDate.getTime())) solvedDate = new Date();

      const correct = test.correctAnswers || 0;
      const incorrect = test.incorrectAnswers || 0;
      const totalQ = test.questionCount || 0;
      const blank = Math.max(0, totalQ - correct - incorrect);
      const net = correct - incorrect / 3;

      return { ...test, _subjectName: subjectName, _topicName: topicName, _solvedDate: solvedDate, _correct: correct, _incorrect: incorrect, _blank: blank, _totalQ: totalQ, _net: net };
    });
  }, [tests, trackedBooks]);

  const processedData = React.useMemo(() => enrichedBaseData.filter(t => {
    if (selectedSubject !== 'all' && t._subjectName !== selectedSubject) return false;
    if (selectedTopic !== 'all' && t._topicName !== selectedTopic) return false;
    if (selectedType !== 'all' && t.sourceType !== selectedType) return false;
    if (dateFrom && t._solvedDate < startOfDay(dateFrom)) return false;
    if (dateTo && t._solvedDate > endOfDay(dateTo)) return false;
    if (t._net < netSliderValue[0] || t._net > netSliderValue[1]) return false;
    return true;
  }), [enrichedBaseData, selectedSubject, selectedTopic, selectedType, dateFrom, dateTo, netSliderValue]);

  // -- KPI CALCULATIONS --
  const kpis = React.useMemo(() => {
    const totalQ = processedData.reduce((a, t) => a + t._totalQ, 0);
    const totalC = processedData.reduce((a, t) => a + t._correct, 0);
    const totalNet = processedData.reduce((a, t) => a + t._net, 0);
    const successRate = totalQ > 0 ? (totalC / totalQ) * 100 : 0;
    return { totalQ, totalC, totalNet, successRate, testCount: processedData.length };
  }, [processedData]);

  const streakData = React.useMemo(() => {
    const uniqueDays = Array.from(new Set(enrichedBaseData.map(t => format(t._solvedDate, 'yyyy-MM-dd')))).sort((a, b) => b.localeCompare(a));
    if (!uniqueDays.length) return { current: 0, longest: 0 };
    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    let currentStreak = 0;
    if (uniqueDays[0] === today || uniqueDays[0] === yesterday) {
      currentStreak = 1;
      for (let i = 0; i < uniqueDays.length - 1; i++) {
        if (differenceInDays(parseISO(uniqueDays[i]), parseISO(uniqueDays[i + 1])) === 1) currentStreak++;
        else break;
      }
    }
    let tempStreak = 1, longestStreak = 1;
    for (let i = 0; i < uniqueDays.length - 1; i++) {
      if (differenceInDays(parseISO(uniqueDays[i]), parseISO(uniqueDays[i + 1])) === 1) { tempStreak++; if (tempStreak > longestStreak) longestStreak = tempStreak; }
      else tempStreak = 1;
    }
    return { current: currentStreak, longest: longestStreak };
  }, [enrichedBaseData]);

  // -- GOAL PROGRESS CALCULATION --
  const goalProgressData = React.useMemo(() => {
    return performanceGoals.map(goal => {
        const now = new Date();
        let startDate: Date;
        switch(goal.period) {
            case 'daily': startDate = startOfDay(now); break;
            case 'weekly': startDate = startOfWeek(now, { weekStartsOn: 1 }); break;
            case 'monthly': startDate = startOfMonth(now); break;
            case 'yearly': startDate = startOfYear(now); break;
            default: startDate = goal.startDate ? parseISO(goal.startDate) : now;
        }

        const filtered = enrichedBaseData.filter(t => {
            const inPeriod = t._solvedDate >= startDate && t._solvedDate <= now;
            const subjectMatch = goal.subject === 'all' || t._subjectName === goal.subject;
            return inPeriod && subjectMatch;
        });

        let currentValue = 0;
        if (goal.type === 'questions') {
            currentValue = filtered.reduce((acc, t) => acc + t._totalQ, 0);
        } else if (goal.type === 'net') {
            currentValue = filtered.reduce((acc, t) => acc + t._net, 0);
        } else if (goal.type === 'successRate') {
            const q = filtered.reduce((acc, t) => acc + t._totalQ, 0);
            const c = filtered.reduce((acc, t) => acc + t._correct, 0);
            currentValue = q > 0 ? (c / q) * 100 : 0;
        }

        return {
            ...goal,
            current: currentValue,
            isCompleted: currentValue >= goal.target
        };
    });
  }, [performanceGoals, enrichedBaseData]);

  const handleSaveGoal = async () => {
    if (!studentId) return;
    const targetVal = parseFloat(goalForm.target);
    if (isNaN(targetVal) || targetVal <= 0) return;

    await addPerformanceGoal({
        memberId: studentId,
        type: goalForm.type,
        subject: goalForm.subject,
        target: targetVal,
        label: goalForm.label || `${goalForm.period} Hedef`,
        period: goalForm.period,
        startDate: new Date().toISOString(),
    });
    setIsAddGoalModalOpen(false);
    setGoalForm({ type: 'questions', subject: 'all', target: '', label: '', period: 'weekly' });
    toast({ title: "Hedef Belirlendi! 🎯" });
  };

  const timeSeriesData = React.useMemo(() => {
    const today = new Date();
    const dataMap = new Map<string, { name: string; questions: number; net: number; tests: number; correct: number; incorrect: number }>();
    if (activePeriod === 'weekly') {
      const start = startOfWeek(today, { weekStartsOn: 1 });
      eachDayOfInterval({ start, end: today }).forEach(day => {
        dataMap.set(format(day, 'yyyy-MM-dd'), { name: format(day, 'EEE', { locale: tr }), questions: 0, net: 0, tests: 0, correct: 0, incorrect: 0 });
      });
      processedData.forEach(t => {
        const key = format(t._solvedDate, 'yyyy-MM-dd');
        if (dataMap.has(key)) { const c = dataMap.get(key)!; c.questions += t._totalQ; c.net += t._net; c.tests++; c.correct += t._correct; c.incorrect += t._incorrect; }
      });
    } else if (activePeriod === 'monthly') {
      eachMonthOfInterval({ start: subMonths(today, 11), end: today }).forEach(m => {
        dataMap.set(format(m, 'yyyy-MM'), { name: format(m, 'MMM yy', { locale: tr }), questions: 0, net: 0, tests: 0, correct: 0, incorrect: 0 });
      });
      processedData.forEach(t => {
        const key = format(t._solvedDate, 'yyyy-MM');
        if (dataMap.has(key)) { const c = dataMap.get(key)!; c.questions += t._totalQ; c.net += t._net; c.tests++; c.correct += t._correct; c.incorrect += t._incorrect; }
      });
    } else {
      const start = startOfYear(subDays(today, 365 * 2));
      for (let i = 0; i < 3; i++) { const d = addMonths(start, i * 12); dataMap.set(format(d, 'yyyy'), { name: format(d, 'yyyy'), questions: 0, net: 0, tests: 0, correct: 0, incorrect: 0 }); }
      processedData.forEach(t => {
        const key = format(t._solvedDate, 'yyyy');
        if (dataMap.has(key)) { const c = dataMap.get(key)!; c.questions += t._totalQ; c.net += t._net; c.tests++; c.correct += t._correct; c.incorrect += t._incorrect; }
      });
    }
    return Array.from(dataMap.values()).map(d => ({ ...d, rate: d.questions > 0 ? parseFloat(((d.correct / d.questions) * 100).toFixed(1)) : 0 }));
  }, [processedData, activePeriod]);

  const subjectDetailedStats = React.useMemo(() => {
    const map = new Map<string, { subject: string; total: number; correct: number; incorrect: number; blank: number; net: number }>();
    processedData.forEach(t => {
      const cur = map.get(t._subjectName) || { subject: t._subjectName, total: 0, correct: 0, incorrect: 0, blank: 0, net: 0 };
      cur.total += t._totalQ; cur.correct += t._correct; cur.incorrect += t._incorrect; cur.blank += t._blank; cur.net += t._net;
      map.set(t._subjectName, cur);
    });
    return Array.from(map.values()).map(d => ({ ...d, successRate: d.total > 0 ? (d.correct / d.total) * 100 : 0 }));
  }, [processedData]);

  const availableSubjectsList = Array.from(new Set(enrichedBaseData.map(d => d._subjectName))).sort();

  return (
    <div className="min-h-screen bg-[#F7F8FC] dark:bg-slate-950 font-sans pb-24 text-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-[72px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-full w-9 h-9" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold leading-tight text-slate-900 dark:text-white">{student?.name || 'Öğrenci'}</h1>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Performans Analizi</p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            {(['weekly', 'monthly', 'yearly'] as Period[]).map(p => (
              <button key={p} onClick={() => setActivePeriod(p)} className={cn('px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all', activePeriod === p ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300')}>
                {p === 'weekly' ? 'Hafta' : p === 'monthly' ? 'Ay' : 'Yıl'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 pt-8 space-y-8">
        {/* KPI KARTLARI */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard icon={BarChart3}  value={kpis.totalQ}                      label="Toplam Soru"  color={C.INDIGO}  />
          <KpiCard icon={Check}      value={kpis.totalC}                      label="Doğru"        color={C.EMERALD} />
          <KpiCard icon={Calculator} value={kpis.totalNet.toFixed(1)}         label="Net"          color={C.PURPLE}  />
          <KpiCard icon={Percent}    value={`%${kpis.successRate.toFixed(0)}`} label="Başarı"      color={C.CYAN}    />
          <KpiCard icon={Layers}     value={kpis.testCount}                   label="Sınav/Test"   color={C.AMBER}   />
          <KpiCard icon={Flame}      value={streakData.current}               label="Gün Serisi"   sub={`En uzun: ${streakData.longest} gün`} color={C.ROSE} />
        </section>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1 h-auto flex flex-wrap gap-1 w-full md:w-auto shadow-sm">
            {[
              { id: 'simple',      label: 'Özet', icon: Smile },
              { id: 'overview',    label: 'Genel Bakış', icon: Activity },
              { id: 'subjects',    label: 'Dersler',     icon: BookOpen },
              { id: 'goals',       label: 'Hedefler',    icon: Flag },
            ].map(tab => (
              <TabsTrigger key={tab.id} value={tab.id} className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all',
                'data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md',
                'data-[state=inactive]:text-slate-500 hover:text-slate-700'
              )}>
                <tab.icon className="w-3.5 h-3.5" /> {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="simple" className="space-y-6 mt-6">
            <div className="rounded-[2.5rem] p-8 border shadow-sm relative overflow-hidden bg-emerald-50/10 border-emerald-500/30">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center shrink-0 bg-emerald-500 shadow-lg">
                    <Heart className="w-10 h-10 text-white fill-current" />
                    </div>
                    <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">Harika Gidiyorsun!</h2>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-2">Öğrencimiz bu dönemi yüksek bir performansla geçiriyor. Aynen devam!</p>
                    </div>
                </div>
            </div>
          </TabsContent>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <Card className="rounded-[2rem] border-slate-200 dark:border-slate-800 shadow-sm p-6">
              <SectionHeader icon={Activity} title="Gelişim Eğrisi" desc="Soru hacmi ve başarı oranı" />
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={timeSeriesData} margin={{ top: 20, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.12)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#94A3B8' }} dy={8} />
                    <YAxis yAxisId="l" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                    <YAxis yAxisId="r" orientation="right" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar yAxisId="l" dataKey="questions" name="Soru" fill={C.INDIGO} radius={[4, 4, 0, 0]} maxBarSize={40}>
                         <LabelList dataKey="questions" position="top" style={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }} />
                    </Bar>
                    <Line yAxisId="r" type="monotone" dataKey="rate" name="Başarı (%)" stroke={C.EMERALD} strokeWidth={3} dot={{ r: 4, fill: C.EMERALD, stroke: '#fff', strokeWidth: 2 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </TabsContent>

          {/* HEDEFLER SEKMESİ */}
          <TabsContent value="goals" className="space-y-6 mt-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-indigo-600 rounded-[2rem] p-8 text-white shadow-lg shadow-indigo-600/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
              <div className="relative z-10">
                <h2 className="text-2xl font-black mb-1">Hedeflerine Odaklan! 🚀</h2>
                <p className="text-indigo-100 text-sm font-medium">Bu hafta belirlediğin hedeflerin durumunu buradan takip edebilirsin. Küçük adımlar büyük başarılar getirir.</p>
              </div>
              <Button onClick={() => setIsAddGoalModalOpen(true)} className="relative z-10 bg-white text-indigo-600 hover:bg-slate-50 rounded-xl font-bold border-0 shadow-sm px-6 h-11">
                <Plus className="w-4 h-4 mr-2" /> Yeni Hedef Ekle
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {goalProgressData.length > 0 ? goalProgressData.map((goal) => {
                  const typeIcon = goal.type === 'questions' ? BarChart3 : goal.type === 'successRate' ? Percent : Calculator;
                  const unit = goal.type === 'questions' ? 'Soru' : goal.type === 'successRate' ? '%' : 'Net';
                  const themeColor = goal.isCompleted ? C.EMERALD : (goal.type === 'questions' ? C.INDIGO : goal.type === 'successRate' ? C.PURPLE : C.ORANGE);
                  
                  return (
                    <VisualGoalCard 
                        key={goal.id}
                        title={goal.label} 
                        current={goal.current} 
                        target={goal.target} 
                        unit={unit}
                        icon={typeIcon} 
                        color={themeColor}
                        deadline={goal.period === 'weekly' ? 'Haftalık' : goal.period === 'monthly' ? 'Aylık' : 'Günlük'}
                    />
                  );
              }) : (
                <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800">
                    <Target className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                    <p className="font-bold text-slate-500">Henüz bir performans hedefi belirlenmemiş.</p>
                </div>
              )}
            </div>

            <div className="mt-8">
              <SectionHeader icon={Layers} title="Tüm Hedefler ve Detaylar" desc="Geçmiş ve mevcut tüm hedeflerin listesi" color={C.SLATE} />
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-sm p-2">
                <PerformanceGoals member={student!} solvedTests={processedData} availableSubjects={availableSubjectsList} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="subjects" className="mt-6 space-y-6">
             <Card className="rounded-[2rem] overflow-hidden border-slate-200 dark:border-slate-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50">
                      <th className="px-4 py-3 text-left font-bold text-slate-500">Ders</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-500">Soru</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-500 text-emerald-600">D</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-500 text-rose-600">Y</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-500">Başarı</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectDetailedStats.map((s, i) => (
                      <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-4 py-3 font-bold">{s.subject}</td>
                        <td className="px-4 py-3">{s.total}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-600">{s.correct}</td>
                        <td className="px-4 py-3 font-semibold text-rose-600">{s.incorrect}</td>
                        <td className="px-4 py-3 font-black" style={{ color: rateColor(s.successRate) }}>%{s.successRate.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* ADD GOAL DIALOG */}
      <Dialog open={isAddGoalModalOpen} onOpenChange={setIsAddGoalModalOpen}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Yeni Hedef Belirle</DialogTitle>
                <DialogDescription>Kişisel gelişim hedeflerinizi tanımlayın.</DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
                <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Hedef Türü</Label>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { id: 'questions', label: 'Soru', icon: BarChart3 },
                            { id: 'successRate', label: 'Başarı %', icon: Percent },
                            { id: 'net', label: 'Net', icon: Calculator },
                        ].map(t => (
                            <button 
                                key={t.id} 
                                onClick={() => setGoalForm({ ...goalForm, type: t.id as any })}
                                className={cn(
                                    "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all gap-1.5",
                                    goalForm.type === t.id ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700" : "border-slate-100 dark:border-slate-800 text-slate-500"
                                )}
                            >
                                <t.icon className="w-5 h-5" />
                                <span className="text-[10px] font-bold uppercase">{t.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Ders</Label>
                        <Select value={goalForm.subject} onValueChange={(v) => setGoalForm({ ...goalForm, subject: v })}>
                            <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tümü</SelectItem>
                                {availableSubjectsList.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Periyot</Label>
                        <Select value={goalForm.period} onValueChange={(v) => setGoalForm({ ...goalForm, period: v as any })}>
                            <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="daily">Günlük</SelectItem>
                                <SelectItem value="weekly">Haftalık</SelectItem>
                                <SelectItem value="monthly">Aylık</SelectItem>
                                <SelectItem value="yearly">Yıllık</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Hedef Değeri</Label>
                    <Input 
                        type="number" 
                        className="h-12 rounded-xl text-lg font-bold"
                        value={goalForm.target}
                        onChange={(e) => setGoalForm({ ...goalForm, target: e.target.value })}
                        placeholder="Örn: 500"
                    />
                </div>

                <div className="space-y-2">
                    <Label>Etiket (Opsiyonel)</Label>
                    <Input 
                        placeholder="Örn: Haftalık Soru Hedefi" 
                        className="h-12 rounded-xl"
                        value={goalForm.label}
                        onChange={(e) => setGoalForm({ ...goalForm, label: e.target.value })}
                    />
                </div>
            </div>

            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsAddGoalModalOpen(false)}>İptal</Button>
                <Button onClick={handleSaveGoal} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 px-8 font-bold">
                    Kaydet
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- HELPER COMPONENTS ---
const KpiCard = ({ icon: Icon, value, label, sub, color }: any) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
    className="relative rounded-2xl p-5 bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-sm overflow-hidden group h-full">
    <div className="flex items-start justify-between mb-4">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
    </div>
    <p className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">{value}</p>
    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-2 uppercase tracking-wider">{label}</p>
    {sub && <p className="text-[10px] text-slate-400 mt-1">{sub}</p>}
  </motion.div>
);

const SectionHeader = ({ icon: Icon, title, desc, color = C.INDIGO }: any) => (
  <div className="flex items-center gap-3 mb-5">
    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
      <Icon className="w-[18px] h-[18px]" style={{ color }} />
    </div>
    <div>
      <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 leading-tight">{title}</h3>
      {desc && <p className="text-[11px] text-slate-400 leading-tight mt-0.5">{desc}</p>}
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-xl text-xs">
      <p className="font-extrabold text-slate-700 dark:text-slate-200 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color || p.fill }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-bold text-slate-800 dark:text-slate-100">{p.value}</span>
        </div>
      ))}
    </div>
  );
};
type Period = 'weekly' | 'monthly' | 'yearly';
type SortKey = 'subject' | 'total' | 'correct' | 'incorrect' | 'blank' | 'net' | 'successRate';
type SortDir = 'asc' | 'desc';
