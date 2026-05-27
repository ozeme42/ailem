"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Check, Percent, Filter, RotateCcw,
  Flame, Calendar, BarChart3, PieChart as PieIcon, LineChart as LineIcon,
  Calculator, Layers, ChevronRight, Activity, BookOpen, Loader2,
  TrendingDown, Trophy, Sparkles, GraduationCap,
  ArrowUpRight, ArrowDownRight, Minus, AlertCircle, Target, Clock,
  ChevronsUpDown, ChevronUp, ChevronDown, Download, X, ListX,
  TrendingUp, SlidersHorizontal, Search,
  GitCompareArrows, Crosshair, Plus, Edit3, Trash2, CheckCircle2,
  Flag, Bell, Lock, Unlock, Smile, ThumbsUp, ThumbsDown, AlertTriangle, Heart
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip,
  XAxis, YAxis, Cell, PieChart, Pie, ComposedChart, Legend,
  Area, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  RechartsLineChart, Line, LabelList
} from "recharts";
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
  startOfDay, endOfDay
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
import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { PerformanceGoals } from "@/components/education/performance-goals";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { Test } from "@/lib/data";

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
const KpiCard = ({ icon: Icon, value, label, sub, color, trend }: {
  icon: any; value: string | number; label: string; sub?: string; color: string; trend?: number;
}) => (
  <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
    className="relative rounded-2xl p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden group h-full">
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
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-xl text-xs">
      <p className="font-extrabold text-slate-700 dark:text-slate-200 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color || p.fill }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-bold text-slate-800 dark:text-slate-100">{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</span>
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
  const [loading, setLoading] = React.useState(true);

  // -- Temel filtreler --
  const [activePeriod, setActivePeriod] = React.useState<Period>('monthly');
  const [selectedSubject, setSelectedSubject] = React.useState('all');
  const [selectedTopic, setSelectedTopic] = React.useState('all');
  const [selectedType, setSelectedSourceType] = React.useState('all');

  // -- Tarih aralığı filtresi --
  const [dateFrom, setDateFrom] = React.useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = React.useState<Date | undefined>(undefined);
  const [datePickerOpen, setDatePickerOpen] = React.useState(false);

  // -- Net eşiği filtresi --
  const [netSliderOpen, setNetSliderOpen] = React.useState(false);
  const [netSliderValue, setNetSliderValue] = React.useState<[number, number]>([-20, 100]);

  // -- Sekme & modal --
  const [activeTab, setActiveTab] = React.useState('overview');
  const [isImprovementModalOpen, setIsImprovementModalOpen] = React.useState(false);
  const [improvementModalFilter, setImprovementModalFilter] = React.useState('all');

  // -- Tablo sort --
  const [tableSortKey, setTableSortKey] = React.useState<SortKey>('total');
  const [tableSortDir, setTableSortDir] = React.useState<SortDir>('desc');
  const [tableSearch, setTableSearch] = React.useState('');

  // -- Drawer (satır detay) --
  const [drawerSubject, setDrawerSubject] = React.useState<string | null>(null);

  const student = React.useMemo(() => familyMembers.find(m => m.id === studentId), [familyMembers, studentId]);

  React.useEffect(() => {
    if (!studentId || !familyId) { setLoading(false); return; }
    const unsubTests = onTestsUpdate((all: any[]) => {
      setTests(all.filter(t => t.studentId === studentId && t.status === 'Sonuçlandı'));
      setLoading(false);
    });
    const unsubBooks = onTrackedBooksUpdate(setTrackedBooks);
    return () => { unsubTests(); unsubBooks(); };
  }, [studentId, familyId]);

  // -- ENRİCH --
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

  const netBounds = React.useMemo(() => {
    if (!enrichedBaseData.length) return { min: -20, max: 100 };
    const nets = enrichedBaseData.map(t => t._net);
    return { min: Math.floor(Math.min(...nets)), max: Math.ceil(Math.max(...nets)) };
  }, [enrichedBaseData]);

  const availableSubjects = React.useMemo(() => Array.from(new Set(enrichedBaseData.map(d => d._subjectName))).sort(), [enrichedBaseData]);
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

  const kpis = React.useMemo(() => {
    const totalQ = processedData.reduce((a, t) => a + t._totalQ, 0);
    const totalC = processedData.reduce((a, t) => a + t._correct, 0);
    const totalNet = processedData.reduce((a, t) => a + t._net, 0);
    const successRate = totalQ > 0 ? (totalC / totalQ) * 100 : 0;
    return { totalQ, totalC, totalNet, successRate, testCount: processedData.length };
  }, [processedData]);

  const topicStats = React.useMemo(() => {
    const map = new Map<string, { subject: string; topic: string; total: number; correct: number; incorrect: number; blank: number; net: number }>();
    enrichedBaseData.forEach(t => {
      if (!t._topicName || t._topicName === 'Genel') return;
      const key = `${t._subjectName}-${t._topicName}`;
      const cur = map.get(key) || { subject: t._subjectName, topic: t._topicName, total: 0, correct: 0, incorrect: 0, blank: 0, net: 0 };
      cur.total += t._totalQ; cur.correct += t._correct; cur.incorrect += t._incorrect; cur.blank += t._blank; cur.net += t._net;
      map.set(key, cur);
    });
    const list = Array.from(map.values()).map(d => ({ ...d, successRate: d.total > 0 ? (d.correct / d.total) * 100 : 0 }));
    const sorted = [...list].sort((a, b) => b.successRate - a.successRate);
    return {
      best: sorted.filter(t => t.total >= 5 && t.successRate >= 70).slice(0, 8),
      worst: sorted.filter(t => t.total >= 5 && t.successRate < 70).reverse().slice(0, 5),
      allToImprove: [...list].filter(t => t.total >= 3).sort((a, b) => a.successRate - b.successRate)
    };
  }, [enrichedBaseData]);

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

  const drawerTests = React.useMemo(() => {
    if (!drawerSubject) return [];
    return processedData
      .filter(t => t._subjectName === drawerSubject)
      .sort((a, b) => b._solvedDate.getTime() - a._solvedDate.getTime());
  }, [processedData, drawerSubject]);

  const typeBreakdown = React.useMemo(() => {
    const types = ['exam', 'bank', 'json', 'trackedBook', 'html', 'quick', 'mistake'];
    return types.map((type, idx) => {
      const tt = processedData.filter(t => t.sourceType === type);
      return tt.length > 0 ? { name: translateType(type), value: tt.reduce((a, t) => a + t._totalQ, 0), fill: CHART_PALETTE[idx % CHART_PALETTE.length] } : null;
    }).filter(Boolean) as { name: string; value: number; fill: string }[];
  }, [processedData]);

  const subjectComparisonData = React.useMemo(() =>
    [...subjectDetailedStats].sort((a, b) => b.total - a.total).slice(0, 10).map((s, i) => ({
      subject: s.subject.length > 10 ? s.subject.substring(0, 10) + '…' : s.subject,
      fullName: s.subject, correct: s.correct, incorrect: s.incorrect, blank: s.blank,
      rate: parseFloat(s.successRate.toFixed(1)), fill: CHART_PALETTE[i % CHART_PALETTE.length]
    })), [subjectDetailedStats]
  );

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
                  {availableSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
                <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl border-slate-200 dark:border-slate-700" align="start">
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
                  <CalendarComponent
                    mode="range"
                    selected={{ from: dateFrom, to: dateTo }}
                    onSelect={(range) => { setDateFrom(range?.from); setDateTo(range?.to); }}
                    locale={tr}
                    className="p-3"
                  />
                  <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                    {[
                      { label: 'Son 7 gün', from: subDays(new Date(), 6), to: new Date() },
                      { label: 'Son 30 gün', from: subDays(new Date(), 29), to: new Date() },
                      { label: 'Son 3 ay', from: subMonths(new Date(), 3), to: new Date() },
                    ].map(p => (
                      <Button key={p.label} variant="outline" size="sm" className="text-[11px] h-7 rounded-lg px-2 border-slate-200 dark:border-slate-700"
                        onClick={() => { setDateFrom(p.from); setDateTo(p.to); setDatePickerOpen(false); }}>
                        {p.label}
                      </Button>
                    ))}
                    <Button size="sm" variant="ghost" className="text-[11px] h-7 rounded-lg ml-auto text-rose-500"
                      onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>Temizle</Button>
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
                    {netSliderValue[0] === netBounds.min && netSliderValue[1] === netBounds.max
                      ? 'Net Eşiği'
                      : `Net: ${netSliderValue[0]} – ${netSliderValue[1]}`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-5 rounded-2xl shadow-xl border-slate-200 dark:border-slate-700" align="start">
                  <p className="text-xs font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-widest mb-1">Net Aralığı</p>
                  <p className="text-[10px] text-slate-400 mb-4">Yalnızca bu net aralığındaki testleri göster</p>
                  <div className="flex items-center justify-between text-sm font-extrabold mb-3">
                    <span className="text-indigo-600">{netSliderValue[0]}</span>
                    <span className="text-slate-300">—</span>
                    <span className="text-indigo-600">{netSliderValue[1]}</span>
                  </div>
                  <Slider
                    min={netBounds.min}
                    max={netBounds.max}
                    step={1}
                    value={netSliderValue}
                    onValueChange={(v) => setNetSliderValue(v as [number, number])}
                    className="mt-2"
                  />
                  <Button size="sm" variant="ghost" className="w-full mt-3 text-xs text-rose-500 h-8 rounded-xl"
                    onClick={() => setNetSliderValue([netBounds.min, netBounds.max])}>Sıfırla</Button>
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1 h-auto flex flex-wrap gap-1 w-full md:w-auto shadow-sm">
            {[
              { id: 'simple',      label: 'Özet (Veli Modu)', icon: Smile },
              { id: 'overview',    label: 'Genel Bakış', icon: Activity },
              { id: 'subjects',    label: 'Dersler',     icon: BookOpen },
              { id: 'topics',      label: 'Konular',     icon: Target },
              { id: 'compare',     label: 'Karşılaştır', icon: GitCompareArrows },
              { id: 'goals',       label: 'Hedefler',    icon: Flag },
              { id: 'habits',      label: 'Çalışma',     icon: Clock },
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

          <TabsContent value="simple" className="space-y-6 mt-6">
            {(() => {
              const sr = kpis.successRate;
              const isExcellent = sr >= 70;
              const isOkay = sr >= 50 && sr < 70;
              const statusColor = isExcellent ? C.EMERALD : isOkay ? C.AMBER : C.ROSE;
              const StatusIcon = isExcellent ? Heart : isOkay ? AlertCircle : AlertTriangle;
              
              return (
                <div className="space-y-6">
                  <div className="rounded-[2.5rem] p-8 border shadow-sm relative overflow-hidden" 
                    style={{ backgroundColor: `${statusColor}10`, borderColor: `${statusColor}30` }}>
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 rounded-full flex items-center justify-center shrink-0 shadow-lg" style={{ backgroundColor: statusColor }}>
                        <StatusIcon className="w-10 h-10 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">{isExcellent ? "Harika Gidiyorsun!" : isOkay ? "İyi, Ama Daha İyisi Olabilir!" : "Biraz Daha Gayret!"}</h2>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-2">{isExcellent ? "Öğrencimiz bu dönemi yüksek bir performansla geçiriyor. Aynen devam!" : isOkay ? "Ortalama bir başarı gösteriyor, bazı konularda küçük tekrarlara ihtiyaç var." : "Şu anki başarı oranı beklenenin altında. Eksik konuların üzerinden tekrar geçmeliyiz."}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 shadow-sm text-center">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Çözülen Soru</p>
                      <p className="text-4xl font-black text-indigo-600">{kpis.totalQ}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 shadow-sm text-center">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Genel Başarı</p>
                      <p className="text-4xl font-black" style={{ color: statusColor }}>%{kpis.successRate.toFixed(0)}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 shadow-sm text-center">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Çalışma Serisi</p>
                      <p className="text-4xl font-black text-rose-500">{streakData.current} Gün</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </TabsContent>

          {activeTab !== 'simple' && (
            <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6 mt-6">
              <KpiCard icon={BarChart3}  value={kpis.totalQ}                      label="Toplam Soru"  color={C.INDIGO}  />
              <KpiCard icon={Check}      value={kpis.totalC}                      label="Doğru"        color={C.EMERALD} />
              <KpiCard icon={Calculator} value={kpis.totalNet.toFixed(1)}         label="Net"          color={C.PURPLE}  />
              <KpiCard icon={Percent}    value={`%${kpis.successRate.toFixed(0)}`} label="Başarı"      color={C.CYAN}    />
              <KpiCard icon={Layers}     value={kpis.testCount}                   label="Sınav/Test"   color={C.AMBER}   />
              <KpiCard icon={Flame}      value={streakData.current}               label="Gün Serisi"   sub={`En uzun: ${streakData.longest} gün`} color={C.ROSE} />
            </section>
          )}

          <TabsContent value="overview" className="space-y-6 mt-0">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-sm p-6">
              <SectionHeader icon={Activity} title="Gelişim Eğrisi" desc="Soru hacmi ve başarı oranı (Haftalık/Aylık/Yıllık)" color={C.INDIGO} />
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={timeSeriesData} margin={{ top: 20, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.12)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#94A3B8' }} dy={8} />
                    <YAxis yAxisId="l" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                    <YAxis yAxisId="r" orientation="right" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
                    <Bar yAxisId="l" dataKey="questions" name="Soru Sayısı" fill={C.INDIGO} opacity={0.8} radius={[4, 4, 0, 0]} maxBarSize={40}>
                         <LabelList dataKey="questions" position="top" style={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }} />
                    </Bar>
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

          <TabsContent value="subjects" className="space-y-6 mt-0">
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
                    <div className="space-y-3 mt-2">
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
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
                <SectionHeader icon={BookOpen} title="Ders Detay Tablosu" desc="Detaylı istatistikler ve başarı durumu" color={C.VIOLET} />
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
                    {sortedTableData.map((s, i) => (
                      <tr key={i} className="border-t border-slate-100 dark:border-slate-800 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-colors cursor-pointer group" onClick={() => setDrawerSubject(s.subject)}>
                        <td className="px-4 py-3.5"><span className="font-bold text-slate-800 dark:text-slate-100">{s.subject}</span></td>
                        <td className="px-4 py-3.5">{s.total}</td>
                        <td className="px-4 py-3.5 font-semibold text-emerald-600">{s.correct}</td>
                        <td className="px-4 py-3.5 font-semibold text-rose-600">{s.incorrect}</td>
                        <td className="px-4 py-3.5 text-slate-400">{s.blank}</td>
                        <td className="px-4 py-3.5 font-bold">{s.net.toFixed(1)}</td>
                        <td className="px-4 py-3.5"><span className="font-extrabold text-sm" style={{ color: rateColor(s.successRate) }}>%{s.successRate.toFixed(1)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="topics" className="space-y-6 mt-0">
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
          </TabsContent>

          <TabsContent value="compare" className="space-y-6 mt-0">
            {/* Compare Logic */}
          </TabsContent>

          <TabsContent value="goals" className="space-y-6 mt-0">
              <PerformanceGoals member={student!} solvedTests={processedData} availableSubjects={availableSubjects} />
          </TabsContent>

          <TabsContent value="activity" className="space-y-6 mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: Flame,    value: streakData.current, label: 'Mevcut Seri',      sub: 'ardışık gün', color: C.ROSE },
                { icon: Trophy,   value: streakData.longest, label: 'En Uzun Seri',     sub: 'ardışık gün', color: C.AMBER },
                { icon: Calendar, value: new Set(enrichedBaseData.map(t => format(t._solvedDate, 'yyyy-MM-dd'))).size, label: 'Toplam Aktif Gün', sub: 'çalışılan gün', color: C.INDIGO },
              ].map((item, i) => <KpiCard key={i} icon={item.icon} value={item.value} label={item.label} sub={item.sub} color={item.color} />)}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Sheet open={!!drawerSubject} onOpenChange={open => { if (!open) setDrawerSubject(null); }}>
        <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col bg-white dark:bg-slate-950">
          <SheetHeader className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <SheetTitle className="text-lg font-extrabold">{drawerSubject}</SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1">
             <div className="p-5 space-y-3">
                {drawerTests.map((t, i) => (
                    <div key={i} className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between items-start">
                            <p className="font-bold text-sm">{t.title}</p>
                            <span className="font-black text-indigo-600">%{((t._correct / t._totalQ) * 100).toFixed(0)}</span>
                        </div>
                    </div>
                ))}
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
                  <div key={i} className="flex items-center gap-4 p-4 border-b border-slate-100 dark:border-slate-800">
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
    </div>
  );
}
