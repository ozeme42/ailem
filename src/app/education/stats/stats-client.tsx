
"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Check, Percent, Filter, RotateCcw,
  Flame, Calendar, BarChart3, PieChart as PieIcon, LineChart as LineIcon,
  Calculator, Layers, ChevronRight, Activity, BookOpen, Loader2,
  TrendingDown, Trophy, Sparkles, GraduationCap,
  ArrowUpRight, ArrowDownRight, Minus, AlertCircle, Target, Clock,
  ChevronsUpDown, ChevronUp, ChevronDown, X, ListX,
  TrendingUp, SlidersHorizontal, Search,
  GitCompareArrows, Plus, Edit3, Trash2, CheckCircle2,
  Flag, Smile, Heart, CalendarIcon, ListTodo,
  Gift, Network, History, LibraryBig
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip,
  XAxis, YAxis, Cell, PieChart, Pie, ComposedChart, Legend,
  Area, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Line, LabelList, ScatterChart, Scatter, ZAxis
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
  startOfYear, parse, addMonths, differenceInDays, isWithinInterval,
  startOfDay, endOfDay, getDay, startOfMonth
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PerformanceGoals } from "@/components/education/performance-goals";
import type { Test, PerformanceGoal, PerformanceGoalType, PerformanceGoalPeriod, Goal, GoalSection } from "@/lib/data";

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
const CHART_PALETTE = [C.INDIGO, C.EMERALD, C.AMBER, C.ROSE, C.CYAN, C.ORANGE, C.PURPLE];

type Period = 'weekly' | 'monthly' | 'yearly';
type SortKey = 'subject' | 'total' | 'correct' | 'incorrect' | 'blank' | 'net' | 'successRate';
type SortDir = 'asc' | 'desc';

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

// --- ALT BİLEŞENLER ---

const VisualGoalCard = ({ 
  title, current, target, unit = "Soru", icon: Icon, color = "#6366F1", deadline 
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
        "relative rounded-[2rem] p-6 border shadow-sm overflow-hidden group transition-all hover:shadow-md flex flex-col justify-between",
        isCompleted ? "bg-emerald-50/30 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
      )}
    >
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 opacity-10 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: color }} />

      <div className="flex items-center gap-6 z-10 relative">
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
                {unit === '%' || unit === 'Net' ? current.toFixed(1) : Math.round(current)}
            </span>
            <span className="text-sm font-bold text-slate-400 mb-0.5">/ {target} {unit}</span>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] font-bold">
            {isCompleted ? (
              <span className="text-emerald-500 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-md">Hedef Tamamlandı! 🎉</span>
            ) : (
              <span className="text-slate-400">
                Kalan: <span className="text-slate-700 dark:text-slate-300">
                    {unit === '%' || unit === 'Net' ? Math.max(0, (target - current)).toFixed(1) : Math.max(0, Math.round(target - current))} {unit}
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

const KpiCard = ({ icon: Icon, value, label, sub, color, trend }: {
  icon: any; value: string | number; label: string; sub?: string; color: string; trend?: number;
}) => (
  <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
    className="relative rounded-2xl p-5 bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-sm overflow-hidden group h-full">
    <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
      style={{ background: `radial-gradient(160px at 10% 20%, ${color}18, transparent)` }} />
    <div className="flex items-start justify-between mb-4">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      {trend !== undefined && (
        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5",
          trend > 0 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
          : trend < 0 ? "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400"
          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400")}>
          {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : trend < 0 ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          {Math.abs(trend)}%
        </span>
      )}
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
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-xl text-xs z-50 relative">
      <p className="font-extrabold text-slate-700 dark:text-slate-200 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color || p.fill }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-bold text-slate-800 dark:text-slate-100">
            {typeof p.value === 'number' && !Number.isInteger(p.value) ? p.value.toFixed(1) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const SortTh = ({ col, label, sortKey, sortDir, onSort }: {
  col: SortKey; label: string; sortKey: SortKey; sortDir: SortDir; onSort: (c: SortKey) => void;
}) => {
  const active = sortKey === col;
  return (
    <th
      className="px-4 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-left cursor-pointer select-none hover:text-slate-600 dark:hover:text-slate-200 transition-colors whitespace-nowrap"
      onClick={() => onSort(col)}
    >
      <span className="flex items-center gap-1">
        {label}
        {active
          ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-indigo-500" /> : <ChevronDown className="w-3 h-3 text-indigo-500" />)
          : <ChevronsUpDown className="w-3 h-3 opacity-30" />}
      </span>
    </th>
  );
};

function FilterBadge({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
      {label}
      <button onClick={onRemove} className="hover:text-rose-500 transition-colors"><X className="w-3 h-3" /></button>
    </span>
  );
}

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
  const [datePickerOpen, setDatePickerOpen] = React.useState(false);
  const [netSliderOpen, setNetSliderOpen] = React.useState(false);
  const [netSliderValue, setNetSliderValue] = React.useState<[number, number]>([-20, 100]);

  // -- UI States --
  const [activeTab, setActiveTab] = React.useState('overview');
  const [isImprovementModalOpen, setIsImprovementModalOpen] = React.useState(false);
  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = React.useState(false);
  const [tableSortKey, setTableSortKey] = React.useState<SortKey>('total');
  const [tableSortDir, setTableSortDir] = React.useState<SortDir>('desc');
  const [tableSearch, setTableSearch] = React.useState('');
  const [drawerSubject, setDrawerSubject] = React.useState<string | null>(null);

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

      let resourceName = "Diğer";
      if (test.sourceType === 'trackedBook' || test.sourceType === 'bank') {
        resourceName = test.title ? test.title.split(' ')[0] : 'Soru Bankası';
      } else if (test.sourceType === 'exam') {
        resourceName = "Genel Deneme";
      }

      return { ...test, _subjectName: subjectName, _topicName: topicName, _solvedDate: solvedDate, _correct: correct, _incorrect: incorrect, _blank: blank, _totalQ: totalQ, _net: net, _resourceName: resourceName };
    });
  }, [tests, trackedBooks]);

  const netBounds = React.useMemo(() => {
    if (!enrichedBaseData.length) return { min: -20, max: 100 };
    const nets = enrichedBaseData.map(t => t._net);
    return { min: Math.floor(Math.min(...nets)), max: Math.ceil(Math.max(...nets)) };
  }, [enrichedBaseData]);

  const availableSubjectsList = React.useMemo(() => Array.from(new Set(enrichedBaseData.map(d => d._subjectName))).sort(), [enrichedBaseData]);
  const availableTopics = React.useMemo(() => {
    const d = selectedSubject !== 'all' ? enrichedBaseData.filter(d => d._subjectName === selectedSubject) : enrichedBaseData;
    return Array.from(new Set(d.map(d => d._topicName))).filter(t => t && t !== 'Genel').sort();
  }, [enrichedBaseData, selectedSubject]);

  const activeFilterCount = [
    selectedSubject !== 'all',
    selectedTopic !== 'all',
    selectedType !== 'all',
    dateFrom !== undefined || dateTo !== undefined,
    netSliderValue[0] !== netBounds.min || netSliderValue[1] !== netBounds.max,
  ].filter(Boolean).length;

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
            // "all" (Tümü) seçeneği müfredat yapısındaki bütün dersleri kapsamalı
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
        label: goalForm.label || `${goalForm.period === 'weekly' ? 'Haftalık' : goalForm.period === 'monthly' ? 'Aylık' : 'Günlük'} Hedef`,
        period: goalForm.period,
        startDate: new Date().toISOString(),
    });
    setIsAddGoalModalOpen(false);
    setGoalForm({ type: 'questions', subject: 'all', target: '', label: '', period: 'weekly' });
  };

  // -- CHART DATA: OVERVIEW --
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

  const subjectComparisonData = React.useMemo(() => {
    if (!subjectDetailedStats || subjectDetailedStats.length === 0) return [];
    return [...subjectDetailedStats]
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map((s, i) => ({
        subject: s.subject.length > 10 ? s.subject.substring(0, 10) + '…' : s.subject,
        fullName: s.subject,
        correct: s.correct,
        incorrect: s.incorrect,
        blank: s.blank,
        rate: parseFloat(s.successRate.toFixed(1)),
        fill: CHART_PALETTE[i % CHART_PALETTE.length]
      }));
  }, [subjectDetailedStats]);

  const sortedTableData = React.useMemo(() => {
    let rows = [...subjectDetailedStats];
    if (tableSearch.trim()) rows = rows.filter(r => r.subject.toLowerCase().includes(tableSearch.toLowerCase()));
    rows.sort((a, b) => {
      const av = a[tableSortKey as keyof typeof a] as number | string;
      const bv = b[tableSortKey as keyof typeof b] as number | string;
      if (typeof av === 'string' && typeof bv === 'string') return tableSortDir === 'asc' ? av.localeCompare(bv, 'tr') : bv.localeCompare(av, 'tr');
      return tableSortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return rows;
  }, [subjectDetailedStats, tableSortKey, tableSortDir, tableSearch]);

  const handleTableSort = (col: SortKey) => {
    if (tableSortKey === col) setTableSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setTableSortKey(col); setTableSortDir('desc'); }
  };

  const typeBreakdown = React.useMemo(() => {
    const types = ['exam', 'bank', 'json', 'trackedBook', 'html', 'quick', 'mistake'];
    return types.map((type, idx) => {
      const tt = processedData.filter(t => t.sourceType === type);
      return tt.length > 0 ? { name: translateType(type), value: tt.reduce((a, t) => a + t._totalQ, 0), fill: CHART_PALETTE[idx % CHART_PALETTE.length] } : null;
    }).filter(Boolean) as { name: string; value: number; fill: string }[];
  }, [processedData]);

  // -- CHART DATA: TOPICS & SKILL TREE --
  const topicStats = React.useMemo(() => {
    const map = new Map<string, { subject: string; topic: string; total: number; correct: number; incorrect: number; blank: number; net: number; lastPracticed: Date }>();
    enrichedBaseData.forEach(t => {
      if (!t._topicName || t._topicName === 'Genel') return;
      const key = `${t._subjectName}-${t._topicName}`;
      const cur = map.get(key) || { subject: t._subjectName, topic: t._topicName, total: 0, correct: 0, incorrect: 0, blank: 0, net: 0, lastPracticed: new Date(0) };
      
      cur.total += t._totalQ; cur.correct += t._correct; cur.incorrect += t._incorrect; cur.blank += t._blank; cur.net += t._net;
      if (t._solvedDate > cur.lastPracticed) cur.lastPracticed = t._solvedDate;
      
      map.set(key, cur);
    });
    
    const list = Array.from(map.values()).map(d => ({ ...d, successRate: d.total > 0 ? (d.correct / d.total) * 100 : 0 }));
    const sorted = [...list].sort((a, b) => b.successRate - a.successRate);
    
    const today = new Date();
    const rustingTopics = list.filter(t => {
        const daysSince = differenceInDays(today, t.lastPracticed);
        return t.total >= 10 && t.successRate >= 60 && daysSince > 14; 
    }).sort((a, b) => differenceInDays(today, b.lastPracticed) - differenceInDays(today, a.lastPracticed));

    return {
      all: list,
      best: sorted.filter(t => t.total >= 5 && t.successRate >= 70).slice(0, 8),
      worst: sorted.filter(t => t.total >= 5 && t.successRate < 70).reverse().slice(0, 5),
      allToImprove: [...list].filter(t => t.total >= 3).sort((a, b) => a.successRate - b.successRate),
      rusting: rustingTopics
    };
  }, [enrichedBaseData]);

  const skillTreeData = React.useMemo(() => {
      return availableSubjectsList.map(subj => {
          const topics = topicStats.all.filter(t => t.subject === subj);
          return { subject: subj, topics: topics };
      }).filter(s => s.topics.length > 0);
  }, [availableSubjectsList, topicStats.all]);

  // -- CHART DATA: COMPARE & RESOURCE ROI --
  const compareSourceData = React.useMemo(() => {
    if (!processedData || processedData.length === 0) return [];
    const map = new Map<string, { type: string; total: number; correct: number; incorrect: number; blank: number }>();
    
    processedData.forEach(t => {
      const type = t.sourceType ? translateType(t.sourceType) : 'Diğer';
      const cur = map.get(type) || { type, total: 0, correct: 0, incorrect: 0, blank: 0 };
      cur.total += (t._totalQ || 0); cur.correct += (t._correct || 0); cur.incorrect += (t._incorrect || 0); cur.blank += (t._blank || 0);
      map.set(type, cur);
    });

    return Array.from(map.values())
      .map(d => ({ ...d, successRate: d.total > 0 ? (d.correct / d.total) * 100 : 0 }))
      .sort((a, b) => b.total - a.total); 
  }, [processedData]);

  const resourceROIData = React.useMemo(() => {
    const map = new Map<string, { name: string; total: number; correct: number }>();
    processedData.forEach(t => {
        if (!t._resourceName || t._resourceName === 'Diğer') return;
        const cur = map.get(t._resourceName) || { name: t._resourceName, total: 0, correct: 0 };
        cur.total += t._totalQ;
        cur.correct += t._correct;
        map.set(t._resourceName, cur);
    });

    return Array.from(map.values()).map(d => ({
        name: d.name,
        totalQ: d.total,
        successRate: d.total > 0 ? Number(((d.correct / d.total) * 100).toFixed(1)) : 0
    })).filter(d => d.totalQ > 20); 
  }, [processedData]);

  const monthlyCompareData = React.useMemo(() => {
    if (!processedData || processedData.length === 0) return [];
    const map = new Map<string, { month: string; monthRaw: Date; total: number; correct: number; incorrect: number; blank: number }>();
    
    processedData.forEach(t => {
      if (t._solvedDate && !isNaN(t._solvedDate.getTime())) {
        const key = format(t._solvedDate, 'yyyy-MM');
        const monthStr = format(t._solvedDate, 'MMM yyyy', { locale: tr });
        const cur = map.get(key) || { month: monthStr, monthRaw: t._solvedDate, total: 0, correct: 0, incorrect: 0, blank: 0 };
        cur.total += (t._totalQ || 0); cur.correct += (t._correct || 0); cur.incorrect += (t._incorrect || 0); cur.blank += (t._blank || 0);
        map.set(key, cur);
      }
    });
    
    return Array.from(map.values())
      .sort((a, b) => a.monthRaw.getTime() - b.monthRaw.getTime()) 
      .map(d => ({ ...d, successRate: d.total > 0 ? Number(((d.correct / d.total) * 100).toFixed(1)) : 0 }));
  }, [processedData]);

  // -- CHART DATA: HABITS & HEATMAP --
  const habitsData = React.useMemo(() => {
    if (!processedData || processedData.length === 0) return { chartData: [], rawCounts: [] };
    const daysStr = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const shortDaysStr = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    const counts = new Array(7).fill(0).map((_, i) => ({ dayIndex: i, day: shortDaysStr[i], fullDay: daysStr[i], count: 0, questions: 0 }));
    
    processedData.forEach(t => {
      if (t._solvedDate && !isNaN(t._solvedDate.getTime())) {
        const d = getDay(t._solvedDate);
        if (d >= 0 && d <= 6) { counts[d].count += 1; counts[d].questions += (t._totalQ || 0); }
      }
    });
    
    const sortedForChart = [...counts.slice(1), counts[0]]; 
    return { chartData: sortedForChart, rawCounts: counts };
  }, [processedData]);

  const habitsSummary = React.useMemo(() => {
    if (!habitsData.rawCounts || habitsData.rawCounts.length === 0) {
      return { bestWorkingDay: null, worstWorkingDay: null, activeDaysCount: 0, dailyAverage: 0 };
    }
    const raw = habitsData.rawCounts;
    const sortedByQs = [...raw].sort((a, b) => b.questions - a.questions);
    const bestWorkingDay = sortedByQs[0]?.questions > 0 ? sortedByQs[0] : null;
    const worstWorkingDay = sortedByQs.filter(d => d.questions > 0).reverse()[0] || null;
    const activeDaysCount = raw.filter(d => d.questions > 0).length;
    
    const uniqueDatesSet = new Set(processedData.filter(t => t._solvedDate && !isNaN(t._solvedDate.getTime())).map(t => format(t._solvedDate, 'yyyy-MM-dd')));
    const totalActiveDays = uniqueDatesSet.size || 1;
    const totalQuestions = processedData.reduce((acc, t) => acc + (t._totalQ || 0), 0);
    const dailyAverage = Math.round(totalQuestions / totalActiveDays);

    return { bestWorkingDay, worstWorkingDay, activeDaysCount, dailyAverage: isNaN(dailyAverage) ? 0 : dailyAverage };
  }, [habitsData, processedData]);

  const activityHeatmap = React.useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = subDays(today, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayData = processedData.filter(t => format(t._solvedDate, 'yyyy-MM-dd') === dateStr);
      const qCount = dayData.reduce((acc, t) => acc + (t._totalQ || 0), 0);
      days.push({ date: d, dateStr, count: qCount });
    }
    return days;
  }, [processedData]);

  const drawerTests = React.useMemo(() => {
    if (!drawerSubject) return [];
    return processedData.filter(t => t._subjectName === drawerSubject).sort((a, b) => b._solvedDate.getTime() - a._solvedDate.getTime());
  }, [processedData, drawerSubject]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-600/30">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Analiz yükleniyor…</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F8FC] dark:bg-slate-950 font-sans pb-24 text-slate-900 dark:text-slate-100">
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-[72px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-full w-9 h-9" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5" />
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
        
        {/* FILTER SECTION */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" /> Filtreler
              </div>
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center">{activeFilterCount}</span>
              )}
            </div>

            <div className="flex flex-wrap gap-2 flex-1">
              <Select value={selectedSubject} onValueChange={v => { setSelectedSubject(v); setSelectedTopic('all'); }}>
                <SelectTrigger className="w-40 h-9 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="Ders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Dersler</SelectItem>
                  {availableSubjectsList.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={selectedTopic} onValueChange={setSelectedTopic} disabled={availableTopics.length === 0}>
                <SelectTrigger className="w-40 h-9 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="Konu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Konular</SelectItem>
                  {availableTopics.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={selectedType} onValueChange={setSelectedSourceType}>
                <SelectTrigger className="w-40 h-9 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="Tür" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Türler</SelectItem>
                  <SelectItem value="exam">Deneme Sınavı</SelectItem>
                  <SelectItem value="bank">Soru Bankası</SelectItem>
                  <SelectItem value="json">Yazılı Test</SelectItem>
                  <SelectItem value="trackedBook">Kitap Takibi</SelectItem>
                  <SelectItem value="mistake">Yanlış Havuzu</SelectItem>
                </SelectContent>
              </Select>

              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn(
                    "h-9 rounded-xl text-xs border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-medium gap-1.5",
                    (dateFrom || dateTo) && "border-indigo-400 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                  )}>
                    <Calendar className="w-3.5 h-3.5" />
                    {dateFrom && dateTo
                      ? `${format(dateFrom, 'dd MMM', { locale: tr })} – ${format(dateTo, 'dd MMM', { locale: tr })}`
                      : dateFrom ? `${format(dateFrom, 'dd MMM', { locale: tr })} –`
                      : dateTo ? `– ${format(dateTo, 'dd MMM', { locale: tr })}`
                      : 'Tarih Aralığı'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl border-slate-200 dark:border-slate-800" align="start">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-widest mb-3">Tarih Aralığı Seç</p>
                    <div className="flex gap-2 items-center text-xs">
                      <span className="text-slate-400 w-10 shrink-0">Başlangıç</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200 min-w-[80px]">{dateFrom ? format(dateFrom, 'dd MMM yyyy', { locale: tr }) : '—'}</span>
                    </div>
                    <div className="flex gap-2 items-center text-xs mt-1">
                      <span className="text-slate-400 w-10 shrink-0">Bitiş</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200 min-w-[80px]">{dateTo ? format(dateTo, 'dd MMM yyyy', { locale: tr }) : '—'}</span>
                    </div>
                  </div>
                  <CalendarComponent mode="range" selected={{ from: dateFrom, to: dateTo }} onSelect={(range) => { setDateFrom(range?.from); setDateTo(range?.to); }} locale={tr} className="p-3" />
                  <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                    {[
                      { label: 'Son 7 gün', from: subDays(new Date(), 6), to: new Date() },
                      { label: 'Son 30 gün', from: subDays(new Date(), 29), to: new Date() },
                      { label: 'Son 3 ay', from: subMonths(new Date(), 3), to: new Date() },
                    ].map(p => (
                      <Button key={p.label} variant="outline" size="sm" className="text-[11px] h-7 rounded-lg px-2 border-slate-200 dark:border-slate-700" onClick={() => { setDateFrom(p.from); setDateTo(p.to); setDatePickerOpen(false); }}>
                        {p.label}
                      </Button>
                    ))}
                    <Button size="sm" variant="ghost" className="text-[11px] h-7 rounded-lg ml-auto text-rose-500" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>Temizle</Button>
                  </div>
                </PopoverContent>
              </Popover>

              <Popover open={netSliderOpen} onOpenChange={setNetSliderOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn(
                    "h-9 rounded-xl text-xs border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-medium gap-1.5",
                    (netSliderValue[0] !== netBounds.min || netSliderValue[1] !== netBounds.max) && "border-indigo-400 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                  )}>
                    <Calculator className="w-3.5 h-3.5" />
                    {netSliderValue[0] === netBounds.min && netSliderValue[1] === netBounds.max ? 'Net Eşiği' : `Net: ${netSliderValue[0]} – ${netSliderValue[1]}`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-5 rounded-2xl shadow-xl border-slate-200 dark:border-slate-800" align="start">
                  <p className="text-xs font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-widest mb-1">Net Aralığı</p>
                  <p className="text-[10px] text-slate-400 mb-4">Yalnızca bu net aralığındaki testleri göster</p>
                  <div className="flex items-center justify-between text-sm font-extrabold mb-3">
                    <span className="text-indigo-600">{netSliderValue[0]}</span><span className="text-slate-300">—</span><span className="text-indigo-600">{netSliderValue[1]}</span>
                  </div>
                  <Slider min={netBounds.min} max={netBounds.max} step={1} value={netSliderValue} onValueChange={(v) => setNetSliderValue(v as [number, number])} className="mt-2" />
                  <Button size="sm" variant="ghost" className="w-full mt-3 text-xs text-rose-500 h-8 rounded-xl" onClick={() => setNetSliderValue([netBounds.min, netBounds.max])}>Sıfırla</Button>
                </PopoverContent>
              </Popover>

              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" className="h-9 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl font-bold text-xs"
                  onClick={() => { setSelectedSubject('all'); setSelectedTopic('all'); setSelectedSourceType('all'); setDateFrom(undefined); setDateTo(undefined); setNetSliderValue([netBounds.min, netBounds.max]); }}>
                  <RotateCcw className="w-3 h-3 mr-1" /> Tümünü Sıfırla
                </Button>
              )}
            </div>
          </div>

          {activeFilterCount > 0 && (
            <div className="px-4 pb-3 flex flex-wrap gap-2">
              {selectedSubject !== 'all' && <FilterBadge label={`Ders: ${selectedSubject}`} onRemove={() => { setSelectedSubject('all'); setSelectedTopic('all'); }} />}
              {selectedTopic !== 'all' && <FilterBadge label={`Konu: ${selectedTopic}`} onRemove={() => setSelectedTopic('all')} />}
              {selectedType !== 'all' && <FilterBadge label={`Tür: ${translateType(selectedType)}`} onRemove={() => setSelectedSourceType('all')} />}
              {(dateFrom || dateTo) && <FilterBadge label={`${dateFrom ? format(dateFrom, 'dd MMM', { locale: tr }) : '…'} – ${dateTo ? format(dateTo, 'dd MMM', { locale: tr }) : '…'}`} onRemove={() => { setDateFrom(undefined); setDateTo(undefined); }} />}
              {(netSliderValue[0] !== netBounds.min || netSliderValue[1] !== netBounds.max) && <FilterBadge label={`Net: ${netSliderValue[0]}–${netSliderValue[1]}`} onRemove={() => setNetSliderValue([netBounds.min, netBounds.max])} />}
            </div>
          )}
        </section>

        {/* TABS MENU */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1 h-auto flex flex-wrap gap-1 w-full md:w-auto shadow-sm">
            {[
              { id: 'overview',    label: 'Genel Bakış', icon: Activity },
              { id: 'skill-tree',  label: 'Yetenek Ağacı',icon: Network },
              { id: 'subjects',    label: 'Dersler',     icon: BookOpen },
              { id: 'topics',      label: 'Konular',     icon: Target },
              { id: 'compare',     label: 'Karşılaştır', icon: GitCompareArrows },
              { id: 'habits',      label: 'Çalışma',     icon: Clock },
              { id: 'goals',       label: 'Hedefler',    icon: Flag },
              { id: 'activity',    label: 'Aktivite',    icon: Flame },
            ].map(tab => (
              <TabsTrigger key={tab.id} value={tab.id} className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all',
                'data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-indigo-500/30',
                'data-[state=inactive]:text-slate-500 data-[state=inactive]:hover:text-slate-700 dark:data-[state=inactive]:hover:text-slate-300'
              )}>
                <tab.icon className="w-3.5 h-3.5" /> {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* 1. OVERVIEW (GENEL BAKIŞ) */}
              <TabsContent value="overview" className="space-y-6 mt-6">
                <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  <KpiCard icon={BarChart3}  value={kpis.totalQ}                      label="Toplam Soru"  color={C.INDIGO}  />
                  <KpiCard icon={Check}      value={kpis.totalC}                      label="Doğru"        color={C.EMERALD} />
                  <KpiCard icon={Calculator} value={kpis.totalNet.toFixed(1)}         label="Net"          color={C.PURPLE}  />
                  <KpiCard icon={Percent}    value={`%${kpis.successRate.toFixed(0)}`} label="Başarı"      color={C.CYAN}    />
                  <KpiCard icon={Layers}     value={kpis.testCount}                   label="Sınav/Test"   color={C.AMBER}   />
                  <KpiCard icon={Flame}      value={streakData.current}               label="Gün Serisi"   sub={`En uzun: ${streakData.longest} gün`} color={C.ROSE} />
                </section>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-sm p-6">
                  <SectionHeader icon={Activity} title="Gelişim Eğrisi" desc="Soru hacmi ve başarı oranı trendi" color={C.INDIGO} />
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={timeSeriesData} margin={{ top: 20, right: 10, left: -15, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorQ" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={C.INDIGO} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={C.INDIGO} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.12)" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#94A3B8' }} dy={8} />
                        <YAxis yAxisId="l" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                        <YAxis yAxisId="r" orientation="right" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
                        
                        <Area yAxisId="l" type="monotone" dataKey="questions" name="Soru Sayısı" fill="url(#colorQ)" stroke={C.INDIGO} strokeWidth={2} />
                        <Bar yAxisId="l" dataKey="questions" name="Soru Çubuğu" fill={C.INDIGO} opacity={0.6} radius={[4, 4, 0, 0]} maxBarSize={40} />
                        <Line yAxisId="r" type="monotone" dataKey="rate" name="Başarı (%)" stroke={C.EMERALD} strokeWidth={3} dot={{ r: 4, fill: C.EMERALD, stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-sm p-6">
                    <SectionHeader icon={BarChart3} title="Soru Profili" desc="Ders bazında D/Y/B dağılımı" color={C.ORANGE} />
                    <div className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={subjectComparisonData.slice(0, 7)} margin={{ top: 10, right: 0, left: -15, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.12)" />
                          <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94A3B8' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
                          <Bar dataKey="correct" name="Doğru" stackId="a" fill={C.EMERALD} radius={[0, 0, 4, 4]} maxBarSize={36} />
                          <Bar dataKey="incorrect" name="Yanlış" stackId="a" fill={C.ROSE} maxBarSize={36} />
                          <Bar dataKey="blank" name="Boş" stackId="a" fill="#CBD5E1" radius={[4, 4, 0, 0]} maxBarSize={36} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-sm p-6">
                    <SectionHeader icon={PieIcon} title="Kaynak Dağılımı" desc="Test türlerine göre soru dağılımı" color={C.CYAN} />
                    <div className="h-[260px] flex items-center gap-4">
                      <div className="flex-1 h-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={typeBreakdown} cx="50%" cy="50%" innerRadius="52%" outerRadius="75%" paddingAngle={3} dataKey="value">
                              {typeBreakdown.map((e, i) => <Cell key={i} fill={e.fill} />)}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* 2. YETENEK AĞACI (SKILL TREE) */}
              <TabsContent value="skill-tree" className="space-y-6 mt-6">
                <div className="bg-indigo-600 rounded-[2rem] p-8 text-white shadow-lg shadow-indigo-600/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                  <div className="relative z-10 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
                        <Network className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black mb-1">Yetenek Ağacı</h2>
                        <p className="text-indigo-100 text-sm font-medium">Konu kilitlerini aç, ustalığını ilerlet! Renkler konu hakimiyetini gösterir.</p>
                    </div>
                  </div>
                  <div className="relative z-10 flex items-center gap-6 mt-6 text-sm font-bold bg-black/20 p-3 rounded-2xl w-max backdrop-blur-md">
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-300" /> Başlanmadı</div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500" /> Öğreniliyor (%0-69)</div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /> Usta (%70+)</div>
                  </div>
                </div>

                <div className="space-y-6">
                    {skillTreeData.map((subj, i) => (
                        <div key={i} className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200/70 dark:border-slate-800 p-6">
                            <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-indigo-500" /> {subj.subject}
                            </h3>
                            <div className="flex overflow-x-auto pb-4 pt-14 px-2 snap-x hide-scrollbar">
                                <div className="flex items-center gap-4 relative">
                                    <div className="absolute top-1/2 left-4 right-4 h-1 bg-slate-100 dark:bg-slate-800 -translate-y-1/2 z-0" />
                                    
                                    {subj.topics.map((t, j) => {
                                        const isMaster = t.successRate >= 70;
                                        const isLearning = t.successRate > 0 && t.successRate < 70;
                                        
                                        let nodeColor = "bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500";
                                        if (isMaster) nodeColor = "bg-emerald-50 border-emerald-500 text-emerald-600 dark:bg-emerald-950/50";
                                        else if (isLearning) nodeColor = "bg-amber-50 border-amber-500 text-amber-600 dark:bg-amber-950/50";

                                        return (
                                            <div key={j} className="relative z-10 snap-start group flex flex-col items-center min-w-[140px]">
                                                <div className={cn(
                                                    "w-12 h-12 rounded-2xl border-4 flex items-center justify-center font-black text-sm transition-all duration-300 shadow-sm",
                                                    nodeColor,
                                                    "group-hover:scale-110 group-hover:shadow-md cursor-help"
                                                )}>
                                                    {isMaster ? <CheckCircle2 className="w-6 h-6" /> : isLearning ? <Activity className="w-5 h-5" /> : "-"}
                                                </div>
                                                <p className="mt-3 text-xs font-bold text-center text-slate-700 dark:text-slate-300 line-clamp-2 max-w-[120px]">
                                                    {t.topic}
                                                </p>
                                                <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] font-bold py-1.5 px-3 rounded-xl whitespace-nowrap pointer-events-none z-[60] shadow-xl">
                                                    Başarı: %{t.successRate.toFixed(0)} <br/> ({t.total} Soru)
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
              </TabsContent>

              {/* 3. SUBJECTS (DERSLER) */}
              <TabsContent value="subjects" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-sm p-6">
                        <SectionHeader icon={Target} title="Ders Yatkınlığı" desc="Radar – Başarı dengesi" color={C.INDIGO} />
                        <div className="h-[280px]">
                            {subjectDetailedStats.length > 2 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={subjectDetailedStats}>
                                    <PolarGrid stroke="rgba(148,163,184,0.2)" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 600 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: '#94A3B8' }} />
                                    <Radar name="Başarı %" dataKey="successRate" stroke={C.INDIGO} fill={C.INDIGO} fillOpacity={0.3} strokeWidth={2} />
                                    <Tooltip content={<CustomTooltip />} />
                                </RadarChart>
                            </ResponsiveContainer>
                            ) : <div className="h-full flex items-center justify-center text-sm text-slate-400">En az 3 ders gerekli.</div>}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-sm p-6">
                        <SectionHeader icon={TrendingUp} title="Ders Başarı Oranları" desc="Yatay bar karşılaştırması" color={C.EMERALD} />
                        <div className="space-y-4 mt-2">
                            {[...subjectDetailedStats].sort((a, b) => b.total - a.total).map((s, i) => (
                            <div key={i} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-slate-700 dark:text-slate-200 truncate max-w-[160px]">{s.subject}</span>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-slate-400 text-[10px]">{s.total} soru</span>
                                        <span className="font-extrabold text-sm" style={{ color: rateColor(s.successRate) }}>%{s.successRate.toFixed(0)}</span>
                                    </div>
                                </div>
                                <Progress value={s.successRate} className="h-2" indicatorClassName={cn(s.successRate >= 70 ? "bg-emerald-500" : s.successRate >= 40 ? "bg-amber-500" : "bg-rose-500")} />
                            </div>
                            ))}
                        </div>
                    </div>
                </div>
                
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <SectionHeader icon={BookOpen} title="Ders Detay Tablosu" desc="Tüm derslerin ayrıntılı sonuçları" color={C.VIOLET} />
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input 
                        placeholder="Ders Ara..." 
                        className="pl-9 h-9 w-64 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700" 
                        value={tableSearch} 
                        onChange={(e) => setTableSearch(e.target.value)} 
                      />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50">
                          <SortTh col="subject"     label="Ders"    sortKey={tableSortKey} sortDir={tableSortDir} onSort={handleTableSort} />
                          <SortTh col="total"       label="Toplam"  sortKey={tableSortKey} sortDir={tableSortDir} onSort={handleTableSort} />
                          <SortTh col="correct"     label="Doğru"   sortKey={tableSortKey} sortDir={tableSortDir} onSort={handleTableSort} />
                          <SortTh col="incorrect"   label="Yanlış"  sortKey={tableSortKey} sortDir={tableSortDir} onSort={handleTableSort} />
                          <SortTh col="blank"       label="Boş"     sortKey={tableSortKey} sortDir={tableSortDir} onSort={handleTableSort} />
                          <SortTh col="net"         label="Net"     sortKey={tableSortKey} sortDir={tableSortDir} onSort={handleTableSort} />
                          <SortTh col="successRate" label="Başarı"  sortKey={tableSortKey} sortDir={tableSortDir} onSort={handleTableSort} />
                        </tr>
                      </thead>
                      <tbody>
                        {sortedTableData.length > 0 ? sortedTableData.map((s, i) => (
                          <tr key={i} className="border-t border-slate-100 dark:border-slate-800 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-colors cursor-pointer group" onClick={() => setDrawerSubject(s.subject)}>
                            <td className="px-4 py-3.5 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: rateColor(s.successRate) }} />
                                <span className="font-bold text-slate-800 dark:text-slate-100">{s.subject}</span>
                            </td>
                            <td className="px-4 py-3.5">{s.total}</td>
                            <td className="px-4 py-3.5 font-semibold text-emerald-600">{s.correct}</td>
                            <td className="px-4 py-3.5 font-semibold text-rose-600">{s.incorrect}</td>
                            <td className="px-4 py-3.5 text-slate-400">{s.blank}</td>
                            <td className="px-4 py-3.5 font-bold">{s.net.toFixed(1)}</td>
                            <td className="px-4 py-3.5">
                                <span className="font-extrabold text-sm flex items-center gap-1" style={{ color: rateColor(s.successRate) }}>
                                    %{s.successRate.toFixed(1)}
                                    {s.successRate >= 70 && <Sparkles className="w-3 h-3 text-emerald-500" />}
                                </span>
                            </td>
                          </tr>
                        )) : (
                          <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Sonuç bulunamadı.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>

              {/* 4. TOPICS (KONULAR) */}
              <TabsContent value="topics" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="rounded-[2.5rem] border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                      <CardHeader className="bg-rose-50/50 dark:bg-rose-950/20 border-b border-rose-100 dark:border-rose-900/30 flex flex-row items-center justify-between pb-4">
                          <div>
                            <CardTitle className="text-lg font-black text-rose-700 dark:text-rose-400 flex items-center gap-2">
                                <ListX className="w-5 h-5" /> Geliştirilmesi Gerekenler
                            </CardTitle>
                            <CardDescription>Başarı oranı %70'in altında olan kritik konular.</CardDescription>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => setIsImprovementModalOpen(true)} className="text-[11px] font-bold text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/30 h-8 rounded-xl gap-1">
                            Tümü <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                      </CardHeader>
                      <CardContent className="p-4 pt-6">
                            <Accordion type="single" collapsible className="space-y-3">
                              {topicStats.worst.length > 0 ? topicStats.worst.map((t, i) => (
                                  <AccordionItem key={i} value={`worst-${i}`} className="border-none">
                                      <AccordionTrigger className="p-0 hover:no-underline group">
                                          <div className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 group-hover:bg-rose-50/50 transition-all border border-transparent group-hover:border-rose-200">
                                              <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-600 font-black text-xs shrink-0">
                                                  <AlertCircle className="w-4 h-4" />
                                              </div>
                                              <div className="flex-1 min-w-0 text-left">
                                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t.subject}</p>
                                                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{t.topic}</p>
                                              </div>
                                              <div className="text-right">
                                                  <p className="text-sm font-black text-rose-500">%{t.successRate.toFixed(0)}</p>
                                                  <Progress value={t.successRate} className="w-16 h-1 bg-rose-100 mt-1" indicatorClassName="bg-rose-500" />
                                              </div>
                                          </div>
                                      </AccordionTrigger>
                                      <AccordionContent className="pt-3 px-4 pb-1">
                                            <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-inner">
                                              <div><p className="text-[10px] text-slate-400 font-bold uppercase">Doğru</p><p className="text-sm font-black text-emerald-500">{t.correct}</p></div>
                                              <div><p className="text-[10px] text-slate-400 font-bold uppercase">Yanlış</p><p className="text-sm font-black text-rose-500">{t.incorrect}</p></div>
                                              <div><p className="text-[10px] text-slate-400 font-bold uppercase">Boş</p><p className="text-sm font-black text-slate-500">{t.blank}</p></div>
                                            </div>
                                      </AccordionContent>
                                  </AccordionItem>
                              )) : <div className="py-10 text-center text-slate-400 text-sm italic">Kritik konu bulunamadı. Harika gidiyorsun!</div>}
                            </Accordion>
                      </CardContent>
                  </Card>

                  <Card className="rounded-[2.5rem] border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                      <CardHeader className="bg-emerald-50/50 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-900/30">
                          <CardTitle className="text-lg font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                              <Trophy className="w-5 h-5" /> Güçlü Konular
                          </CardTitle>
                          <CardDescription>Başarı oranı %70 ve üzeri olan konular.</CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-6">
                            <div className="grid gap-3">
                              {topicStats.best.length > 0 ? topicStats.best.slice(0, 8).map((t, i) => (
                                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-transparent hover:border-emerald-200 transition-all group">
                                      <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 font-black text-xs shrink-0">
                                          <CheckCircle2 className="w-4 h-4" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t.subject}</p>
                                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{t.topic}</p>
                                      </div>
                                      <div className="text-right">
                                          <p className="text-sm font-black text-emerald-500">%{t.successRate.toFixed(0)}</p>
                                          <p className="text-[9px] text-slate-400 font-bold uppercase">{t.total} Soru</p>
                                      </div>
                                  </div>
                              )) : <div className="py-10 text-center text-slate-400 text-sm italic">Henüz güçlü bir konu verisi oluşmadı.</div>}
                            </div>
                      </CardContent>
                  </Card>
                </div>

                {topicStats.rusting.length > 0 && (
                    <Card className="rounded-[2.5rem] border-amber-200 dark:border-amber-800 shadow-xl overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 mt-6">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-xl font-black text-amber-700 dark:text-amber-500 flex items-center gap-3">
                                <History className="w-6 h-6" /> Paslanan Konular (Akıllı Tekrar)
                            </CardTitle>
                            <CardDescription className="text-amber-800/70 dark:text-amber-400/70 font-medium">
                                Bu konularda aslında iyiydin ancak <b>14 günden uzun süredir</b> hiç soru çözmedin. Unutmamak için hızlı bir tekrar testi çözmelisin!
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {topicStats.rusting.map((t, i) => (
                                    <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-amber-100 dark:border-amber-800/50 shadow-sm flex flex-col justify-between">
                                        <div>
                                            <p className="text-[10px] font-extrabold text-amber-500 uppercase tracking-widest mb-1">{t.subject}</p>
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-2">{t.topic}</p>
                                        </div>
                                        <div className="mt-4 flex items-end justify-between">
                                            <div>
                                                <p className="text-xs text-slate-400 font-medium">Eski Başarın</p>
                                                <p className="text-lg font-black text-emerald-500">%{t.successRate.toFixed(0)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-slate-400 font-medium">Son Çözüm</p>
                                                <p className="text-sm font-bold text-rose-500">{differenceInDays(new Date(), t.lastPracticed)} Gün Önce</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
              </TabsContent>

              {/* 5. COMPARE (KARŞILAŞTIRMA) */}
              <TabsContent value="compare" className="space-y-6 mt-6">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-sm p-6">
                    <SectionHeader icon={LibraryBig} title="Kaynak & Yayınevi Verimlilik Analizi" desc="Hangi kitapta/kaynakta daha başarılısın?" color={C.EMERALD} />
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
                        <div className="lg:col-span-2 h-[350px] bg-slate-50/50 dark:bg-slate-800/20 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                            {resourceROIData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: -20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                                        <XAxis type="number" dataKey="successRate" name="Başarı" unit="%" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 'bold' }} />
                                        <YAxis type="number" dataKey="totalQ" name="Çözülen Soru" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                                        <ZAxis type="number" dataKey="totalQ" range={[100, 1000]} name="Soru Hacmi" />
                                        
                                        <Tooltip cursor={{ strokeDasharray: '3 3' }} 
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl shadow-xl">
                                                            <p className="font-extrabold text-sm mb-1">{data.name}</p>
                                                            <p className="text-xs text-slate-500">Çözülen: <span className="font-bold text-indigo-600">{data.totalQ} Soru</span></p>
                                                            <p className="text-xs text-slate-500">Başarı: <span className="font-bold text-emerald-600">%{data.successRate}</span></p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        
                                        <Scatter data={resourceROIData} fill={C.INDIGO} opacity={0.7}>
                                            {resourceROIData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.successRate >= 70 ? C.EMERALD : entry.successRate >= 50 ? C.AMBER : C.ROSE} />
                                            ))}
                                            <LabelList dataKey="name" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#64748b' }} />
                                        </Scatter>
                                    </ScatterChart>
                                </ResponsiveContainer>
                            ) : <div className="h-full flex items-center justify-center text-sm text-slate-400">Analiz için testlerde kaynak/kitap bilgisi gereklidir.</div>}
                        </div>

                        {resourceROIData.length > 0 && (
                            <div className="flex flex-col gap-3 h-[350px] overflow-y-auto pr-2 hide-scrollbar">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 sticky top-0 bg-white dark:bg-slate-900 py-1">Kaynak Sıralaması</h4>
                                {[...resourceROIData].sort((a,b) => b.successRate - a.successRate).map((r, i) => (
                                    <div key={i} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between group hover:border-indigo-200 transition-colors">
                                        <div>
                                            <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{r.name}</p>
                                            <p className="text-xs text-slate-500">{r.totalQ} Soru Çözüldü</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-black text-lg" style={{ color: rateColor(r.successRate) }}>%{r.successRate}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-sm p-6">
                    <SectionHeader icon={GitCompareArrows} title="Test Türlerine Göre Başarı" desc="Hangi kaynak türünden daha çok verim alıyorsun?" color={C.PURPLE} />
                    <div className="h-[320px] mt-4">
                      {compareSourceData && compareSourceData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={compareSourceData} margin={{ top: 20, right: 30, left: -20, bottom: 0 }} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(148,163,184,0.12)" />
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="type" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94A3B8' }} width={100} />
                            <Tooltip cursor={{ fill: 'transparent' }} content={<CustomTooltip />} />
                            <Legend verticalAlign="top" iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingBottom: 16 }} />
                            <Bar dataKey="correct" name="Doğru" stackId="a" fill={C.EMERALD} radius={[0, 0, 0, 0]} maxBarSize={30} />
                            <Bar dataKey="incorrect" name="Yanlış" stackId="a" fill={C.ROSE} radius={[0, 0, 0, 0]} maxBarSize={30} />
                            <Bar dataKey="blank" name="Boş" stackId="a" fill={C.SLATE} radius={[0, 4, 4, 0]} maxBarSize={30}>
                              <LabelList 
                                dataKey="successRate" 
                                position="right" 
                                formatter={(val: number) => val ? `%${Number(val).toFixed(0)}` : '%0'} 
                                style={{ fill: C.INDIGO, fontSize: 10, fontWeight: 'bold' }} 
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : <div className="h-full flex items-center justify-center text-sm text-slate-400">Karşılaştırma için yeterli veri yok.</div>}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-sm p-6 lg:col-span-2">
                    <div className="flex items-center justify-between mb-2">
                      <SectionHeader icon={CalendarIcon} title="Aylık Performans Karşılaştırması" desc="Ay bazında Doğru/Yanlış ve Başarı Oranı değişimi" color={C.ORANGE} />
                      <div className="hidden sm:block text-[10px] text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                        Üstteki Tarih Filtresi ile aralığı değiştirebilirsiniz
                      </div>
                    </div>
                    <div className="h-[350px] mt-2">
                      {monthlyCompareData && monthlyCompareData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={monthlyCompareData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.12)" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#94A3B8' }} dy={8} />
                            <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                            <Tooltip cursor={{ fill: 'rgba(148,163,184,0.05)' }} content={<CustomTooltip />} />
                            <Legend verticalAlign="top" iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingBottom: 16 }} />
                            
                            <Bar yAxisId="left" dataKey="correct" name="Doğru Sayısı" fill={C.EMERALD} radius={[4, 4, 0, 0]} maxBarSize={45} />
                            <Bar yAxisId="left" dataKey="incorrect" name="Yanlış Sayısı" fill={C.ROSE} radius={[4, 4, 0, 0]} maxBarSize={45} />
                            
                            <Line yAxisId="right" type="monotone" dataKey="successRate" name="Başarı Oranı (%)" stroke={C.INDIGO} strokeWidth={3} dot={{ r: 5, fill: C.INDIGO, stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 7 }} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      ) : <div className="h-full flex items-center justify-center text-sm text-slate-400">Karşılaştırma için en az bir aylık veriniz olması gerekir.</div>}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* 6. HABITS (ÇALIŞMA ALIŞKANLIKLARI) */}
              <TabsContent value="habits" className="space-y-6 mt-6">
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-sm p-6">
                    <SectionHeader icon={Calendar} title="Günlere Göre Soru Çözüm Dağılımı" desc="Haftanın hangi günleri daha yoğun çalışıyorsun?" color={C.ORANGE} />
                    <div className="h-[280px] mt-4">
                      {habitsData.chartData && habitsData.chartData.some((d: any) => d.questions > 0) ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={habitsData.chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.12)" />
                            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#94A3B8' }} dy={8} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                            <Tooltip cursor={{ fill: 'rgba(148,163,184,0.05)' }} content={<CustomTooltip />} />
                            <Bar dataKey="questions" name="Çözülen Soru" fill={C.AMBER} radius={[6, 6, 0, 0]} maxBarSize={50}>
                               <LabelList dataKey="questions" position="top" style={{ fill: '#94A3B8', fontSize: 11, fontWeight: 700 }} />
                            </Bar>
                            <Line type="monotone" dataKey="questions" name="Trend" stroke={C.ORANGE} strokeWidth={2} dot={false} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      ) : <div className="h-full flex items-center justify-center text-sm text-slate-400">Çalışma verisi bulunamadı.</div>}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-sm p-6">
                     <SectionHeader icon={Activity} title="Alışkanlık Radarı" desc="Çalışma dağılımı dengesi" color={C.INDIGO} />
                     <div className="h-[280px] mt-4">
                       {habitsData.chartData && habitsData.chartData.some((d: any) => d.questions > 0) ? (
                          <ResponsiveContainer width="100%" height="100%">
                              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={habitsData.chartData}>
                                  <PolarGrid stroke="rgba(148,163,184,0.2)" />
                                  <PolarAngleAxis dataKey="day" tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 600 }} />
                                  <Radar name="Soru" dataKey="questions" stroke={C.AMBER} fill={C.AMBER} fillOpacity={0.4} strokeWidth={2} />
                                  <Tooltip content={<CustomTooltip />} />
                              </RadarChart>
                          </ResponsiveContainer>
                       ) : <div className="h-full flex items-center justify-center text-sm text-slate-400">Veri yok.</div>}
                     </div>
                  </div>

                  <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="rounded-[2rem] border-none shadow-md overflow-hidden bg-gradient-to-br from-orange-500 to-amber-600">
                      <CardContent className="p-8 flex items-center justify-between text-white relative">
                        <div className="absolute right-0 p-4 opacity-20 transform translate-x-4">
                          <Clock className="w-32 h-32" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-xs font-bold uppercase tracking-widest text-orange-100 mb-2">En Yoğun Günün</p>
                            <p className="text-4xl font-black mb-1">{habitsSummary.bestWorkingDay?.fullDay || '-'}</p>
                            <p className="text-sm font-medium text-orange-100">
                              {habitsSummary.bestWorkingDay ? `Toplam ${habitsSummary.bestWorkingDay.questions} soru çözüldü` : 'Henüz veri yok'}
                            </p>
                        </div>
                        <div className="relative z-10 w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/30 shadow-inner">
                            <Trophy className="w-8 h-8 text-white drop-shadow-md" />
                        </div>
                      </CardContent>
                    </Card>

                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200/70 dark:border-slate-800 shadow-sm p-6 flex flex-col justify-center">
                      <SectionHeader icon={ListTodo} title="Alışkanlık Özeti" color={C.ROSE} />
                      <ul className="space-y-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                        <li className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                          <span className="flex items-center gap-2"><Calculator className="w-4 h-4 text-slate-400"/> Günlük Ortalama:</span>
                          <span className="font-bold text-slate-900 dark:text-white text-base">{habitsSummary.dailyAverage} Soru</span>
                        </li>
                        <li className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                          <span className="flex items-center gap-2"><Activity className="w-4 h-4 text-slate-400"/> Aktif Çalışılan Günler:</span>
                          <span className="font-bold text-emerald-600 text-base">{habitsSummary.activeDaysCount} / 7 Gün</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                 </div>
              </TabsContent>

              {/* 7. GOALS (HEDEFLER) - YENİ TASARIM */}
              <TabsContent value="goals" className="space-y-6 mt-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-indigo-600 rounded-[2rem] p-8 text-white shadow-lg shadow-indigo-600/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                  <div className="relative z-10">
                    <h2 className="text-2xl font-black mb-1">Hedeflerine Odaklan! 🚀</h2>
                    <p className="text-indigo-100 text-sm font-medium">Bu hafta belirlediğin hedeflerin durumunu buradan takip edebilirsin. Küçük adımlar büyük başarılar getirir.</p>
                  </div>
                  <Button onClick={() => setIsAddGoalModalOpen(true)} className="relative z-10 bg-white text-indigo-600 hover:bg-slate-50 rounded-xl font-bold border-0 shadow-sm">
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
                        <Flag className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                        <p className="font-bold text-slate-500 dark:text-slate-400">Henüz aktif bir performans hedefi belirlenmemiş.</p>
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

              {/* 8. ACTIVITY (AKTİVİTE) */}
              <TabsContent value="activity" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { icon: Flame,    value: streakData.current, label: 'Mevcut Seri',      color: C.ROSE },
                    { icon: Trophy,   value: streakData.longest, label: 'En Uzun Seri',     color: C.AMBER },
                    { icon: Calendar, value: new Set(enrichedBaseData.map(t => format(t._solvedDate, 'yyyy-MM-dd'))).size, label: 'Toplam Aktif Gün', color: C.INDIGO },
                  ].map((item, i) => <KpiCard key={i} icon={item.icon} value={item.value} label={item.label} color={item.color} />)}
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200/70 dark:border-slate-800 shadow-sm p-8 mt-6">
                    <SectionHeader icon={Activity} title="Son 30 Gün Aktivite Isı Haritası" desc="Her kutucuk bir günü temsil eder. Renk koyulaştıkça o gün çözülen soru sayısı artar." color={C.EMERALD} />
                    <div className="flex flex-wrap gap-3 mt-6 max-w-4xl">
                        {activityHeatmap.map((day, i) => {
                            let bgClass = "bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"; 
                            if (day.count > 0 && day.count <= 20) bgClass = "bg-emerald-200 border-emerald-300 dark:bg-emerald-900/60 dark:border-emerald-800";
                            else if (day.count > 20 && day.count <= 50) bgClass = "bg-emerald-300 border-emerald-400 dark:bg-emerald-700/80 dark:border-emerald-600";
                            else if (day.count > 50 && day.count <= 100) bgClass = "bg-emerald-400 border-emerald-500 dark:bg-emerald-600 dark:border-emerald-500";
                            else if (day.count > 100) bgClass = "bg-emerald-500 border-emerald-600 dark:bg-emerald-500 dark:border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]";

                            return (
                                <div 
                                    key={i} 
                                    title={`${format(day.date, 'dd MMM yyyy', {locale: tr})}: ${day.count} Soru`}
                                    className={cn("w-7 h-7 rounded-[8px] border transition-all hover:scale-125 cursor-pointer relative group", bgClass)}
                                >
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] font-bold py-1 px-2 rounded-lg whitespace-nowrap pointer-events-none z-50">
                                        {format(day.date, 'dd MMM', {locale: tr})} <br/> {day.count} Soru
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
              </TabsContent>
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </main>

      {/* DRAWERS & MODALS */}
      <Sheet open={!!drawerSubject} onOpenChange={open => { if (!open) setDrawerSubject(null); }}>
        <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
          <SheetHeader className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <SheetTitle className="text-lg font-extrabold">{drawerSubject}</SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1">
             <div className="p-5 space-y-3">
                {drawerTests.length > 0 ? drawerTests.map((t, i) => (
                    <div key={i} className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-indigo-200 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                            <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{t.title}</p>
                            <span className="font-black" style={{ color: rateColor(t._totalQ > 0 ? (t._correct / t._totalQ) * 100 : 0) }}>
                                %{t._totalQ > 0 ? ((t._correct / t._totalQ) * 100).toFixed(0) : 0}
                            </span>
                        </div>
                        <div className="flex gap-4 text-xs font-medium">
                            <span className="text-emerald-600">{t._correct} Doğru</span>
                            <span className="text-rose-600">{t._incorrect} Yanlış</span>
                            <span className="text-slate-400">{t._blank} Boş</span>
                            <span className="text-slate-400 ml-auto">{format(t._solvedDate, 'dd MMM yyyy', {locale: tr})}</span>
                        </div>
                    </div>
                )) : <p className="text-sm text-slate-500 text-center py-10">Test bulunamadı.</p>}
             </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <Dialog open={isImprovementModalOpen} onOpenChange={setIsImprovementModalOpen}>
        <DialogContent className="max-w-2xl h-[88vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-2xl">
          <DialogHeader className="p-6 border-b border-slate-100 dark:border-slate-900 bg-slate-50 dark:bg-slate-900 flex flex-col gap-4 space-y-0">
            <DialogTitle>Tüm Konu Analizi</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 p-5">
              {topicStats.allToImprove.map((t, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-400">{i+1}</div>
                      <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-indigo-500 uppercase">{t.subject}</p>
                          <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{t.topic}</p>
                      </div>
                      <div className="text-right shrink-0">
                          <p className={cn("font-black text-lg", t.successRate >= 70 ? "text-emerald-500" : "text-rose-500")}>%{t.successRate.toFixed(0)}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{t.total} Soru</p>
                      </div>
                  </div>
              ))}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddGoalModalOpen} onOpenChange={setIsAddGoalModalOpen}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Yeni Hedef Belirle</DialogTitle>
                <DialogDescription>Gelişim hedeflerinizi belirleyin.</DialogDescription>
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
                                    goalForm.type === t.id ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700" : "border-slate-100 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
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
                                <SelectItem value="all">Tümü (Genel)</SelectItem>
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
                    />
                </div>

                <div className="space-y-2">
                    <Label>Etiket (Opsiyonel)</Label>
                    <Input 
                        placeholder="Örn: Hafta Sonu Matematik Hedefi" 
                        className="h-12 rounded-xl"
                        value={goalForm.label}
                        onChange={(e) => setGoalForm({ ...goalForm, label: e.target.value })}
                    />
                </div>
            </div>

            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsAddGoalModalOpen(false)}>İptal</Button>
                <Button onClick={handleSaveGoal} disabled={!goalForm.target} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 px-8 font-bold shadow-md shadow-indigo-600/20">
                    Kaydet ve Başlat
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
