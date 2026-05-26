"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Check, X, Percent, Search,
  Target, TrendingUp, AlertCircle, Award, Filter, RotateCcw,
  Flame, Calendar, BarChart3, PieChart as PieIcon, LineChart as LineIcon,
  Calculator, Zap, Layers, ChevronRight, Activity, BookOpen, Loader2,
  TrendingDown, Star, CheckCircle2, MinusCircle, ListX, Clock
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip,
  XAxis, YAxis, Cell, PieChart, Pie, ComposedChart, Legend, 
  Area, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter, ZAxis, LineChart, Line
} from "recharts";
import { useAuth } from "@/components/auth-provider";
import { onTestsUpdate, onTrackedBooksUpdate } from "@/lib/dataService";
import { cn } from "@/lib/utils";
import { getCategoryName } from "@/app/education/page";
import { 
  format, startOfWeek, eachDayOfInterval, 
  subDays, isToday, parseISO, startOfMonth, endOfMonth, 
  eachMonthOfInterval, isWithinInterval, subMonths, 
  startOfYear, parse, addMonths, differenceInDays
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";

// --- iOS / MODERN PREMIUM RENK PALETİ ---
const COLORS = {
  BLUE:   '#007AFF',
  GREEN:  '#34C759',
  ORANGE: '#FF9500',
  RED:    '#FF3B30',
  PURPLE: '#AF52DE',
  TEAL:   '#5AC8FA',
  INDIGO: '#5856D6',
  PINK:   '#FF2D55',
  GRAY:   '#8E8E93',
  SLATE:  '#64748B'
};

const CHART_COLORS = [COLORS.BLUE, COLORS.PURPLE, COLORS.TEAL, COLORS.ORANGE, COLORS.PINK, COLORS.GREEN, COLORS.INDIGO];

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

// --- HELPER COMPONENTS ---
const StatBox = ({ icon: Icon, value, label, subValue, color, trend }: any) => (
  <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm flex flex-col justify-between h-full relative overflow-hidden group hover:border-indigo-500/30 transition-all">
    <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-5 blur-2xl transition-all group-hover:scale-150" style={{ backgroundColor: color }} />
    <div className="flex items-center justify-between mb-4 relative z-10">
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      {trend !== undefined && (
        <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1", trend > 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
          {trend > 0 ? <TrendingUp className="w-3 h-3"/> : <TrendingDown className="w-3 h-3"/>}
          {trend}%
        </span>
      )}
    </div>
    <div className="relative z-10">
        <p className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-none">{value}</p>
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mt-2">{label}</p>
        {subValue && <p className="text-[10px] font-medium text-slate-400 mt-1">{subValue}</p>}
    </div>
  </div>
);

function translateType(type: string) {
    const types: any = {
        'exam': 'Deneme Sınavı',
        'bank': 'Soru Bankası',
        'json': 'Yazılı Test',
        'trackedBook': 'Kitap Takibi',
        'html': 'HTML Test',
        'quick': 'Hızlı Test',
        'mistake': 'Yanlış Havuzu'
    };
    return types[type] || type;
}

export default function StatsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const studentId = searchParams.get('studentId');
  const { familyMembers, familyId } = useAuth();

  const [tests, setTests] = React.useState<any[]>([]);
  const [trackedBooks, setTrackedBooks] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  
  // States
  const [activePeriod, setActivePeriod] = React.useState<Period>('monthly');
  const [selectedSubject, setSelectedSubject] = React.useState('all');
  const [selectedTopic, setSelectedTopic] = React.useState('all');
  const [selectedType, setSelectedSourceType] = React.useState('all');

  // Modal States
  const [isImprovementModalOpen, setIsImprovementModalOpen] = React.useState(false);
  const [improvementModalFilter, setImprovementModalFilter] = React.useState("all");

  const student = React.useMemo(() => familyMembers.find(m => m.id === studentId), [familyMembers, studentId]);

  React.useEffect(() => {
    if (!studentId || !familyId) { setLoading(false); return; }
    const unsubTests = onTestsUpdate(all => {
      setTests(all.filter(t => t.studentId === studentId && t.status === 'Sonuçlandı'));
      setLoading(false);
    });
    const unsubBooks = onTrackedBooksUpdate(setTrackedBooks);
    return () => { unsubTests(); unsubBooks(); };
  }, [studentId, familyId]);

  // --- DATA ENRICHMENT ---
  const enrichedBaseData = React.useMemo(() => {
    const allTopics = trackedBooks.flatMap(b => (b.subjects || []).flatMap((s:any) => (s.topics || []).map((t:any) => ({...t, subjectName: s.name}))));

    return tests.map(test => {
      const subjectName = getCategoryName(test);
      let topicName = "Genel";
      if (test.topicId) {
        topicName = allTopics.find(t => t.id === test.topicId)?.name || "Genel";
      } else if ((test as any).topic) {
        topicName = (test as any).topic;
      }
      
      let solvedDate: Date;
      if (test.updatedAt) {
          solvedDate = parseISO(test.updatedAt);
      } else {
          try { solvedDate = parse(test.assignedDate, 'dd MMMM yyyy', new Date(), { locale: tr }); } 
          catch (e) { solvedDate = new Date(test.assignedDate); }
      }
      if (isNaN(solvedDate.getTime())) solvedDate = new Date();

      const correct = test.correctAnswers || 0;
      const incorrect = test.incorrectAnswers || 0;
      const totalQ = test.questionCount || 0;
      let blank = totalQ - (correct + incorrect);
      if (blank < 0) blank = 0; 
      const net = correct - (incorrect / 3);
      
      return {
        ...test,
        _subjectName: subjectName,
        _topicName: topicName,
        _solvedDate: solvedDate,
        _correct: correct,
        _incorrect: incorrect,
        _blank: blank,
        _totalQ: totalQ,
        _net: net
      };
    });
  }, [tests, trackedBooks]);

  const availableSubjects = React.useMemo(() => Array.from(new Set(enrichedBaseData.map(d => d._subjectName))).sort(), [enrichedBaseData]);
  const availableTopics = React.useMemo(() => {
    let data = enrichedBaseData;
    if (selectedSubject !== 'all') data = data.filter(d => d._subjectName === selectedSubject);
    return Array.from(new Set(data.map(d => d._topicName))).filter(t => t && t !== "Genel").sort();
  }, [enrichedBaseData, selectedSubject]);

  const processedData = React.useMemo(() => {
    return enrichedBaseData.filter(t => {
      if (selectedSubject !== 'all' && t._subjectName !== selectedSubject) return false;
      if (selectedTopic !== 'all' && t._topicName !== selectedTopic) return false;
      if (selectedType !== 'all' && t.sourceType !== selectedType) return false;
      return true;
    });
  }, [enrichedBaseData, selectedSubject, selectedTopic, selectedType]);

  // --- STREAK CALCULATION (İSTİKRAR) ---
  const streakData = React.useMemo(() => {
      const uniqueDays = Array.from(new Set(enrichedBaseData.map(t => format(t._solvedDate, 'yyyy-MM-dd')))).sort((a,b) => b.localeCompare(a));
      if (uniqueDays.length === 0) return { current: 0, longest: 0 };

      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      
      const today = format(new Date(), 'yyyy-MM-dd');
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

      // Calculate current streak
      if (uniqueDays[0] === today || uniqueDays[0] === yesterday) {
          currentStreak = 1;
          for (let i = 0; i < uniqueDays.length - 1; i++) {
              const d1 = parseISO(uniqueDays[i]);
              const d2 = parseISO(uniqueDays[i+1]);
              if (differenceInDays(d1, d2) === 1) {
                  currentStreak++;
              } else break;
          }
      }

      // Calculate longest streak
      if (uniqueDays.length > 0) tempStreak = 1;
      longestStreak = tempStreak;
      for (let i = 0; i < uniqueDays.length - 1; i++) {
          const d1 = parseISO(uniqueDays[i]);
          const d2 = parseISO(uniqueDays[i+1]);
          if (differenceInDays(d1, d2) === 1) {
              tempStreak++;
              if (tempStreak > longestStreak) longestStreak = tempStreak;
          } else {
              tempStreak = 1;
          }
      }

      return { current: currentStreak, longest: longestStreak };
  }, [enrichedBaseData]);

  // --- KPIS ---
  const kpis = React.useMemo(() => {
    const totalQ = processedData.reduce((acc, t) => acc + t._totalQ, 0);
    const totalC = processedData.reduce((acc, t) => acc + t._correct, 0);
    const totalNet = processedData.reduce((acc, t) => acc + t._net, 0);
    const successRate = totalQ > 0 ? (totalC / totalQ) * 100 : 0;
    return { totalQ, totalC, totalNet, successRate, testCount: processedData.length };
  }, [processedData]);

  // --- TOP/WORST TOPICS ---
  const topicStats = React.useMemo(() => {
    const map = new Map<string, { subject: string, topic: string, total: number, correct: number, net: number }>();
    enrichedBaseData.forEach(t => {
        if (!t._topicName || t._topicName === "Genel") return;
        const key = `${t._subjectName}-${t._topicName}`;
        const cur = map.get(key) || { subject: t._subjectName, topic: t._topicName, total: 0, correct: 0, net: 0 };
        cur.total += t._totalQ;
        cur.correct += t._correct;
        cur.net += t._net;
        map.set(key, cur);
    });
    const list = Array.from(map.values()).map(d => ({ ...d, rate: d.total > 0 ? (d.correct / d.total) * 100 : 0 })).sort((a, b) => b.rate - a.rate);
    return {
        best: list.filter(t => t.total >= 5).slice(0, 5),
        worst: [...list].filter(t => t.total >= 5).reverse().slice(0, 5),
        allToImprove: [...list].filter(t => t.total >= 3).sort((a, b) => a.rate - b.rate)
    };
  }, [enrichedBaseData]);

  const filteredWorstList = React.useMemo(() => {
      if (improvementModalFilter === 'all') return topicStats.allToImprove;
      return topicStats.allToImprove.filter(t => t.subject === improvementModalFilter);
  }, [topicStats.allToImprove, improvementModalFilter]);

  // --- TIME SERIES (BAR + AREA) ---
  const timeSeriesData = React.useMemo(() => {
    const today = new Date();
    const dataMap = new Map<string, { name: string, questions: number, net: number, tests: number }>();

    if (activePeriod === 'weekly') {
      const start = startOfWeek(today, { weekStartsOn: 1 });
      const days = eachDayOfInterval({ start, end: today });
      days.forEach(day => { dataMap.set(format(day, 'yyyy-MM-dd'), { name: format(day, 'EEE', { locale: tr }), questions: 0, net: 0, tests: 0 }); });
      processedData.forEach(t => {
        const key = format(t._solvedDate, 'yyyy-MM-dd');
        if (dataMap.has(key)) {
          const cur = dataMap.get(key)!;
          cur.questions += t._totalQ; cur.net += t._net; cur.tests += 1;
        }
      });
    } else if (activePeriod === 'monthly') {
      const months = eachMonthOfInterval({ start: subMonths(today, 11), end: today });
      months.forEach(m => { dataMap.set(format(m, 'yyyy-MM'), { name: format(m, 'MMM', { locale: tr }), questions: 0, net: 0, tests: 0 }); });
      processedData.forEach(t => {
        const key = format(t._solvedDate, 'yyyy-MM');
        if (dataMap.has(key)) {
          const cur = dataMap.get(key)!;
          cur.questions += t._totalQ; cur.net += t._net; cur.tests += 1;
        }
      });
    } else {
       const start = startOfYear(subDays(today, 365 * 2));
       for(let i=0; i<3; i++) {
           const d = addMonths(start, i * 12);
           dataMap.set(format(d, 'yyyy'), { name: format(d, 'yyyy'), questions: 0, net: 0, tests: 0 });
       }
       processedData.forEach(t => {
         const key = format(t._solvedDate, 'yyyy');
         if (dataMap.has(key)) {
           const cur = dataMap.get(key)!;
           cur.questions += t._totalQ; cur.net += t._net; cur.tests += 1;
         }
       });
    }
    return Array.from(dataMap.values());
  }, [processedData, activePeriod]);

  // --- DAY OF WEEK ANALYSIS ---
  const dayOfWeekData = React.useMemo(() => {
    const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    const map = Array(7).fill(0).map((_, i) => ({ name: days[i], total: 0, correct: 0 }));
    
    processedData.forEach(t => {
        const d = t._solvedDate.getDay();
        map[d].total += t._totalQ;
        map[d].correct += t._correct;
    });
    
    // Pazartesiden başlatmak için diziyi kaydırıyoruz
    const sortedMap = [map[1], map[2], map[3], map[4], map[5], map[6], map[0]];
    
    return sortedMap.map(d => ({
        ...d,
        rate: d.total > 0 ? (d.correct / d.total) * 100 : 0
    }));
  }, [processedData]);

  // --- DETAILED SUBJECT STATS ---
  const subjectDetailedStats = React.useMemo(() => {
    const map = new Map<string, { subject: string, total: number, correct: number, incorrect: number, blank: number, net: number }>();
    processedData.forEach(t => {
      const cur = map.get(t._subjectName) || { subject: t._subjectName, total: 0, correct: 0, incorrect: 0, blank: 0, net: 0 };
      cur.total += t._totalQ;
      cur.correct += t._correct;
      cur.incorrect += t._incorrect;
      cur.blank += t._blank;
      cur.net += t._net;
      map.set(t._subjectName, cur);
    });
    return Array.from(map.values()).map(d => ({
      ...d,
      successRate: d.total > 0 ? (d.correct / d.total) * 100 : 0
    })).sort((a,b) => b.total - a.total);
  }, [processedData]);

  // --- SUBJECT TREND OVER TIME (Line Chart) ---
  const subjectTrendData = React.useMemo(() => {
      // En çok soru çözülen ilk 3 dersi bul
      const top3Subjects = subjectDetailedStats.slice(0, 3).map(s => s.subject);
      
      const today = new Date();
      const dataMap = new Map<string, any>();
      
      // Sadece aylık periyotta anlamlı trend çıkarıyoruz
      const months = eachMonthOfInterval({ start: subMonths(today, 5), end: today }); // Son 6 ay
      months.forEach(m => {
          const key = format(m, 'MMM', { locale: tr });
          const entry: any = { name: key };
          top3Subjects.forEach(s => entry[s] = { total: 0, correct: 0 });
          dataMap.set(format(m, 'yyyy-MM'), entry);
      });

      processedData.forEach(t => {
          if (!top3Subjects.includes(t._subjectName)) return;
          const key = format(t._solvedDate, 'yyyy-MM');
          if (dataMap.has(key)) {
              const cur = dataMap.get(key);
              cur[t._subjectName].total += t._totalQ;
              cur[t._subjectName].correct += t._correct;
          }
      });

      return Array.from(dataMap.values()).map(entry => {
          const finalEntry: any = { name: entry.name };
          top3Subjects.forEach(s => {
              if (entry[s].total > 0) {
                  finalEntry[s] = parseFloat(((entry[s].correct / entry[s].total) * 100).toFixed(1));
              } else {
                  finalEntry[s] = null; // Veri yoksa çizgi kopsun
              }
          });
          return finalEntry;
      });
  }, [processedData, subjectDetailedStats]);

  const top3SubjectNames = React.useMemo(() => subjectDetailedStats.slice(0, 3).map(s => s.subject), [subjectDetailedStats]);

  // --- TYPE BREAKDOWN ---
  const typeBreakdown = React.useMemo(() => {
    const map = new Map<string, { name: string, value: number, fill: string, net: number }>();
    const types = ['exam', 'bank', 'json', 'trackedBook', 'html', 'quick', 'mistake'];
    types.forEach((type, idx) => {
      const typeTests = processedData.filter(t => t.sourceType === type);
      if (typeTests.length > 0) {
        map.set(type, {
          name: translateType(type),
          value: typeTests.reduce((acc, t) => acc + t._totalQ, 0),
          net: typeTests.reduce((acc, t) => acc + t._net, 0) / typeTests.length,
          fill: CHART_COLORS[idx % CHART_COLORS.length]
        });
      }
    });
    return Array.from(map.values());
  }, [processedData]);

  const chartConfig = { questions: { label: "Soru Sayısı", color: COLORS.BLUE }, net: { label: "Net Başarısı", color: COLORS.PURPLE } } satisfies ChartConfig;

  if (loading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Veriler Analiz Ediliyor...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans pb-28 text-slate-900 dark:text-slate-100">
      
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => router.back()}>
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-500/20 text-white">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight leading-none">{student?.name || "Öğrenci Analizi"}</h1>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest">Performans ve Gelişim Paneli</p>
            </div>
          </div>
          <div className="hidden md:flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            {(['weekly', 'monthly', 'yearly'] as Period[]).map(p => (
                <button key={p} onClick={() => setActivePeriod(p)} className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", activePeriod === p ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                    {p === 'weekly' ? 'HAFTA' : p === 'monthly' ? 'AY' : 'YIL'}
                </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-8 space-y-8">

        {/* Global Filter Bar */}
        <section className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-sm animate-in fade-in duration-500">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mr-2">
                <Filter className="w-4 h-4 text-indigo-500" /> Filtreler:
            </div>
            <Select value={selectedSubject} onValueChange={(val) => { setSelectedSubject(val); setSelectedTopic('all'); }}>
                <SelectTrigger className="w-full sm:w-44 h-10 rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs">
                    <SelectValue placeholder="Ders Seçin" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Tüm Dersler</SelectItem>
                    {availableSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
            </Select>

            <Select value={selectedTopic} onValueChange={setSelectedTopic} disabled={selectedSubject === 'all' && availableTopics.length === 0}>
                <SelectTrigger className="w-full sm:w-44 h-10 rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs">
                    <SelectValue placeholder="Konu Seçin" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Tüm Konular</SelectItem>
                    {availableTopics.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
            </Select>

            <Select value={selectedType} onValueChange={setSelectedSourceType}>
                <SelectTrigger className="w-full sm:w-44 h-10 rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs">
                    <SelectValue placeholder="Sınav Türü" />
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

            {(selectedSubject !== 'all' || selectedTopic !== 'all' || selectedType !== 'all') && (
                <Button variant="ghost" size="sm" onClick={() => {setSelectedSubject('all'); setSelectedTopic('all'); setSelectedSourceType('all');}} className="h-10 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl font-bold">
                    <RotateCcw className="w-3.5 h-3.5 mr-1" /> Sıfırla
                </Button>
            )}
        </section>

        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatBox icon={BarChart3} value={kpis.totalQ} label="Toplam Soru" color={COLORS.BLUE} />
          <StatBox icon={Calculator} value={kpis.totalNet.toFixed(1)} label="Toplam Net" color={COLORS.PURPLE} />
          <StatBox icon={Percent} value={`%${kpis.successRate.toFixed(0)}`} label="Genel Başarı" color={COLORS.GREEN} />
          <StatBox icon={Layers} value={kpis.testCount} label="Sınav / Test" color={COLORS.ORANGE} />
          <div className="col-span-2 lg:col-span-1">
             <StatBox icon={Flame} value={streakData.current} label="Günlük Seri" subValue={`En İyi: ${streakData.longest} Gün`} color={COLORS.RED} />
          </div>
        </section>

        {/* TIME SERIES */}
        <section>
            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden">
                <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-xl font-black flex items-center gap-3">
                            <Activity className="w-6 h-6 text-indigo-500" />
                            Gelişim ve Soru Hacmi (Zaman Serisi)
                        </CardTitle>
                        <CardDescription>Zaman içindeki soru çözme hacmi ve net başarısı korelasyonu</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-6 md:p-8">
                    <div className="h-[350px] w-full">
                        <ChartContainer config={chartConfig} className="h-full w-full">
                            <ComposedChart data={timeSeriesData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.PURPLE} stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor={COLORS.PURPLE} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(142,142,147,0.15)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: COLORS.GRAY }} dy={10} />
                                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: COLORS.GRAY }} />
                                <Tooltip cursor={{fill: 'rgba(142,142,147,0.05)'}} content={<ChartTooltipContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800" />} />
                                <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
                                <Bar yAxisId="left" dataKey="questions" name="Soru Sayısı" fill={COLORS.BLUE} radius={[6, 6, 0, 0]} barSize={activePeriod === 'weekly' ? 30 : 15} />
                                <Area yAxisId="left" type="monotone" dataKey="net" name="Net Başarısı" stroke={COLORS.PURPLE} strokeWidth={4} fill="url(#colorNet)" dot={{ r: 4, fill: COLORS.PURPLE, strokeWidth: 2, stroke: '#fff' }} />
                            </ComposedChart>
                        </ChartContainer>
                    </div>
                </CardContent>
            </Card>
        </section>

        {/* NEW: SUBJECT TREND & DAY OF WEEK ANALYSIS */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <Card className="rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden p-6 md:p-8">
                <div className="flex items-center gap-2 mb-6">
                    <TrendingUp className="w-6 h-6 text-emerald-500" />
                    <div>
                        <CardTitle className="text-lg font-black">Ders Gelişim Trendi</CardTitle>
                        <CardDescription className="text-xs">En aktif 3 dersin son 6 aydaki başarı değişimi</CardDescription>
                    </div>
                </div>
                <div className="h-[300px] w-full">
                    {top3SubjectNames.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={subjectTrendData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(142,142,147,0.1)" />
                                <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700, fill: COLORS.GRAY }} axisLine={false} tickLine={false} dy={10}/>
                                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: COLORS.GRAY }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} formatter={(value: number) => [`%${value}`, "Başarı"]} />
                                <Legend verticalAlign="top" iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                                {top3SubjectNames.map((subject, idx) => (
                                     <Line key={subject} type="monotone" dataKey={subject} name={subject} stroke={CHART_COLORS[idx % CHART_COLORS.length]} strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} connectNulls />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-sm font-bold text-slate-400">Veri bulunamadı.</div>
                    )}
                </div>
            </Card>

            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden p-6 md:p-8">
                 <div className="flex items-center gap-2 mb-6">
                    <Clock className="w-6 h-6 text-indigo-500" />
                    <div>
                        <CardTitle className="text-lg font-black">Çalışma Alışkanlıkları</CardTitle>
                        <CardDescription className="text-xs">Haftanın günlerine göre soru hacmi ve başarı oranı</CardDescription>
                    </div>
                </div>
                <div className="h-[300px] w-full">
                     <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={dayOfWeekData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(142,142,147,0.1)" />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700, fill: COLORS.GRAY }} axisLine={false} tickLine={false} dy={10} />
                            <YAxis yAxisId="left" tick={{ fontSize: 10, fill: COLORS.GRAY }} axisLine={false} tickLine={false} />
                            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 10, fill: COLORS.GRAY }} axisLine={false} tickLine={false} hide />
                            <Tooltip cursor={{fill: 'rgba(142,142,147,0.05)'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                            <Legend verticalAlign="top" iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                            <Bar yAxisId="left" dataKey="total" name="Çözülen Soru" fill={COLORS.BLUE} radius={[4, 4, 0, 0]} barSize={25} />
                            <Line yAxisId="right" type="monotone" dataKey="rate" name="Başarı (%)" stroke={COLORS.ORANGE} strokeWidth={3} dot={{ r: 4, fill: COLORS.ORANGE, stroke: '#fff', strokeWidth: 2 }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        </section>

        {/* DETAILED EXCEL-LIKE CHARTS: RADAR & STACKED BAR */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden p-6 md:p-8">
                <div className="flex items-center gap-2 mb-6">
                    <Target className="w-6 h-6 text-indigo-500" />
                    <div>
                        <CardTitle className="text-lg font-black">Ders Yatkınlık Analizi</CardTitle>
                        <CardDescription className="text-xs">Derslere göre başarı dengesi (Radar)</CardDescription>
                    </div>
                </div>
                <div className="h-[300px] w-full">
                    {subjectDetailedStats.length > 2 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={subjectDetailedStats}>
                                <PolarGrid stroke="rgba(142,142,147,0.2)" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: COLORS.GRAY, fontSize: 11, fontWeight: 'bold' }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: COLORS.GRAY, fontSize: 10 }} />
                                <Radar name="Başarı %" dataKey="successRate" stroke={COLORS.INDIGO} fill={COLORS.INDIGO} fillOpacity={0.4} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-sm font-bold text-slate-400">
                            Radar grafiği için en az 3 farklı ders verisi gereklidir.
                        </div>
                    )}
                </div>
            </Card>

            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden p-6 md:p-8">
                <div className="flex items-center gap-2 mb-6">
                    <BarChart3 className="w-6 h-6 text-orange-500" />
                    <div>
                        <CardTitle className="text-lg font-black">Soru Dağılım Profili</CardTitle>
                        <CardDescription className="text-xs">Doğru, Yanlış ve Boş analizi (Yığılmış)</CardDescription>
                    </div>
                </div>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={subjectDetailedStats.slice(0, 8)} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(142,142,147,0.1)" />
                            <XAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 700, fill: COLORS.GRAY }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: COLORS.GRAY }} axisLine={false} tickLine={false} />
                            <Tooltip cursor={{fill: 'rgba(142,142,147,0.05)'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                            <Legend verticalAlign="top" iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                            <Bar dataKey="correct" name="Doğru" stackId="a" fill={COLORS.GREEN} radius={[0, 0, 4, 4]} maxBarSize={40} />
                            <Bar dataKey="incorrect" name="Yanlış" stackId="a" fill={COLORS.RED} maxBarSize={40} />
                            <Bar dataKey="blank" name="Boş" stackId="a" fill={COLORS.GRAY} radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        </section>

        {/* TOP & WORST & ACTIVITY GRID */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-10">
             <Card className="lg:col-span-1 rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden">
                <CardHeader className="p-6 pb-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950 flex items-center justify-center text-rose-600">
                                <TrendingDown className="w-6 h-6" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-black text-slate-800 dark:text-slate-100">Kritik Konular</CardTitle>
                                <CardDescription className="text-[10px]">Başarısı Düşük Olanlar</CardDescription>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setIsImprovementModalOpen(true)} className="text-xs font-bold text-rose-600 p-0 hover:bg-transparent">
                            Tümü <ChevronRight className="w-4 h-4"/>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-6 pt-2">
                    <div className="space-y-3">
                        {topicStats.worst.length > 0 ? topicStats.worst.map((t, i) => (
                            <div key={i} className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                <div className="flex flex-col min-w-0 pr-2">
                                    <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400 uppercase">{t.subject}</span>
                                    <p className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">{t.topic}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-black text-rose-600">%{t.rate.toFixed(0)}</p>
                                </div>
                            </div>
                        )) : <p className="text-center py-6 text-slate-400 text-xs italic">Henüz kritik bir konu saptanmadı.</p>}
                    </div>
                </CardContent>
             </Card>

             <Card className="lg:col-span-2 rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden p-6 md:p-8">
                 <div className="flex items-center gap-2 mb-4">
                    <Flame className="w-5 h-5 text-orange-500" />
                    <div>
                        <CardTitle className="text-lg font-black">Isı Haritası (Aktivite)</CardTitle>
                        <CardDescription className="text-xs">Son 28 gün çalışma frekansı (Koyu renk = Yüksek soru hacmi)</CardDescription>
                    </div>
                </div>
                <div className="grid grid-cols-7 sm:grid-cols-14 gap-2">
                     {Array.from({ length: 28 }).map((_, i) => {
                         const d = subDays(new Date(), 27 - i);
                         const key = format(d, 'yyyy-MM-dd');
                         const count = enrichedBaseData.filter(t => format(t._solvedDate, 'yyyy-MM-dd') === key).reduce((acc, t) => acc + t._totalQ, 0);
                         
                         let intensity = "bg-slate-100 dark:bg-slate-800";
                         if (count > 0) intensity = "bg-emerald-200 dark:bg-emerald-900/30";
                         if (count > 50) intensity = "bg-emerald-400 dark:bg-emerald-700/60";
                         if (count > 100) intensity = "bg-emerald-600 dark:bg-emerald-50 shadow-[0_0_10px_rgba(16,185,129,0.4)]";

                         return (
                             <div key={i} className="flex flex-col items-center gap-1.5">
                                 <div className={cn("w-full aspect-square rounded-lg transition-all hover:scale-110 cursor-pointer", intensity)} title={`${format(d, 'dd MMM')}: ${count} soru`} />
                                 {i % 7 === 0 && <span className="text-[8px] font-bold text-slate-400 uppercase">{format(d, 'd MMM', {locale: tr})}</span>}
                             </div>
                         )
                     })}
                </div>
             </Card>
        </section>

      </main>

      {/* IMPROVEMENT LIST MODAL */}
      <Dialog open={isImprovementModalOpen} onOpenChange={setIsImprovementModalOpen}>
          <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0 overflow-hidden rounded-[2rem] bg-white dark:bg-slate-950 border-none shadow-2xl">
              <DialogHeader className="p-6 pb-4 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950 flex items-center justify-center text-rose-600 shadow-inner">
                        <ListX className="w-6 h-6" />
                    </div>
                    <div>
                        <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white">Geliştirilmesi Gerekenler</DialogTitle>
                        <DialogDescription className="text-sm font-medium">Başarı oranı düşükten yükseğe tüm konuların analizi.</DialogDescription>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 mr-2">
                        <Filter className="w-3 h-3" /> Ders Filtresi:
                      </div>
                      <button onClick={() => setImprovementModalFilter('all')} className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all border", improvementModalFilter === 'all' ? "bg-slate-900 text-white border-slate-900" : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50")}>Tümü</button>
                      {availableSubjects.map(s => (
                           <button key={s} onClick={() => setImprovementModalFilter(s)} className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all border shrink-0", improvementModalFilter === s ? "bg-indigo-600 text-white border-indigo-600 shadow-md" : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50")}>{s}</button>
                      ))}
                  </div>
              </DialogHeader>

              <ScrollArea className="flex-1 bg-white dark:bg-slate-950">
                  <div className="p-6 space-y-3">
                      {filteredWorstList.length > 0 ? filteredWorstList.map((t, i) => (
                           <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-900 transition-all gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="outline" className="text-[9px] font-black uppercase bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500">{t.subject}</Badge>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.total} Soru</span>
                                    </div>
                                    <p className="font-bold text-slate-800 dark:text-slate-100 truncate text-base">{t.topic}</p>
                                </div>
                                
                                <div className="flex items-center gap-6 self-end sm:self-center bg-white dark:bg-black/20 p-3 px-4 rounded-xl border border-slate-100 dark:border-white/5 shadow-sm">
                                    <div className="text-center min-w-[60px]">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Başarı</p>
                                        <p className={cn("text-lg font-black leading-none", t.rate < 40 ? "text-rose-600" : t.rate < 70 ? "text-amber-500" : "text-emerald-500")}>%{t.rate.toFixed(0)}</p>
                                    </div>
                                    <div className="w-px h-8 bg-slate-100 dark:bg-slate-800" />
                                    <div className="text-center min-w-[60px]">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Net Ort.</p>
                                        <p className="text-lg font-black text-slate-800 dark:text-slate-100 leading-none">{(t.net / (t.total / 10)).toFixed(1)}</p>
                                    </div>
                                </div>
                           </div>
                      )) : (
                          <div className="py-20 text-center opacity-40">
                              <BookOpen className="w-12 h-12 mx-auto mb-3" />
                              <p className="font-bold">Kayıt bulunamadı.</p>
                          </div>
                      )}
                  </div>
              </ScrollArea>

              <DialogFooter className="p-4 border-t dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  <Button onClick={() => setIsImprovementModalOpen(false)} className="w-full h-12 rounded-xl bg-slate-900 text-white font-bold">Kapat</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
}