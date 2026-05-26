"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Check, X, Percent, Search,
  Target, TrendingUp, AlertCircle, Award, Filter, RotateCcw, ChevronDown,
  Flame, Calendar, BarChart3, PieChart as PieIcon, LineChart as LineIcon,
  Calculator, Zap, Layers, ChevronRight, Activity, BookOpen, Loader2
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip,
  XAxis, YAxis, Cell, LabelList, PieChart, Pie, LineChart, Line, Area, AreaChart,
  ComposedChart, Legend
} from "recharts";
import { useAuth } from "@/components/auth-provider";
import { onTestsUpdate, onBankQuestionsUpdate, onPracticeExamsUpdate, onTrackedBooksUpdate } from "@/lib/dataService";
import { Test, BankQuestion, PracticeExam, TrackedBook, FamilyMember } from "@/lib/data";
import { cn } from "@/lib/utils";
import { getCategoryName } from "@/app/education/page";
import { 
  format, startOfWeek, endOfWeek, eachDayOfInterval, 
  subDays, isToday, parseISO, startOfMonth, endOfMonth, 
  eachMonthOfInterval, getYear, isWithinInterval, subMonths, 
  startOfYear, endOfYear, eachWeekOfInterval, isSameMonth, parse
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

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
    <div className={cn("absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-5 blur-2xl transition-all group-hover:scale-150", `bg-[${color}]`)} />
    <div className="flex items-center justify-between mb-4 relative z-10">
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      {trend !== undefined && (
        <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1", trend > 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
          {trend > 0 ? <TrendingUp className="w-3 h-3"/> : <TrendingDown className="w-3 h-3"/>}
          %{Math.abs(trend).toFixed(0)}
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

// --- MAIN CLIENT ---
export function BudgetStatsClient() { return null; } // For type safety with earlier components

export default function StatsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const studentId = searchParams.get('studentId');
  const { familyMembers } = useAuth();

  const [tests, setTests] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  
  // States
  const [activePeriod, setActivePeriod] = React.useState<Period>('monthly');
  const [selectedSubject, setSelectedSubject] = React.useState('all');
  const [selectedType, setSelectedSourceType] = React.useState('all');

  const student = React.useMemo(() => familyMembers.find(m => m.id === studentId), [familyMembers, studentId]);

  React.useEffect(() => {
    if (!studentId) { setLoading(false); return; }
    const unsubTests = onTestsUpdate(all => {
      setTests(all.filter(t => t.studentId === studentId && t.status === 'Sonuçlandı'));
      setLoading(false);
    });
    return () => { unsubTests(); };
  }, [studentId]);

  // --- DATA PROCESSING (FIXED DATE PARSING) ---
  const processedData = React.useMemo(() => {
    const enriched = tests.map(test => {
      const subjectName = getCategoryName(test);
      
      // GÜVENLİ TARİH AYRIŞTIRMA (results-client ile senkron)
      let solvedDate: Date;
      if (test.updatedAt) {
          solvedDate = parseISO(test.updatedAt);
      } else {
          try {
              // "15 Ağustos 2024" gibi Türkçe formatları ayrıştır
              solvedDate = parse(test.assignedDate, 'dd MMMM yyyy', new Date(), { locale: tr });
          } catch (e) {
              solvedDate = new Date(test.assignedDate);
          }
      }

      // Geçersiz tarih kontrolü
      if (isNaN(solvedDate.getTime())) {
          solvedDate = new Date();
      }

      const net = (test.correctAnswers || 0) - ((test.incorrectAnswers || 0) / 3);
      
      return {
        ...test,
        _subjectName: subjectName,
        _solvedDate: solvedDate,
        _net: net
      };
    });

    const filtered = enriched.filter(t => {
      if (selectedSubject !== 'all' && t._subjectName !== selectedSubject) return false;
      if (selectedType !== 'all' && t.sourceType !== selectedType) return false;
      return true;
    });

    return filtered;
  }, [tests, selectedSubject, selectedType]);

  // --- KPI CALCULATIONS ---
  const kpis = React.useMemo(() => {
    const totalQ = processedData.reduce((acc, t) => acc + (t.questionCount || 0), 0);
    const totalC = processedData.reduce((acc, t) => acc + (t.correctAnswers || 0), 0);
    const totalW = processedData.reduce((acc, t) => acc + (t.incorrectAnswers || 0), 0);
    const totalNet = processedData.reduce((acc, t) => acc + (t._net || 0), 0);
    const successRate = totalQ > 0 ? (totalC / totalQ) * 100 : 0;

    return { totalQ, totalC, totalW, totalNet, successRate, testCount: processedData.length };
  }, [processedData]);

  // --- MAIN TIME SERIES CHART DATA ---
  const timeSeriesData = React.useMemo(() => {
    const today = new Date();
    const dataMap = new Map<string, { name: string, questions: number, net: number, tests: number }>();

    if (activePeriod === 'weekly') {
      const start = startOfWeek(today, { weekStartsOn: 1 });
      const days = eachDayOfInterval({ start, end: today });
      days.forEach(day => {
        const key = format(day, 'yyyy-MM-dd');
        dataMap.set(key, { name: format(day, 'EEE', { locale: tr }), questions: 0, net: 0, tests: 0 });
      });
      processedData.forEach(t => {
        const key = format(t._solvedDate, 'yyyy-MM-dd');
        if (dataMap.has(key)) {
          const cur = dataMap.get(key)!;
          cur.questions += t.questionCount || 0;
          cur.net += t._net || 0;
          cur.tests += 1;
        }
      });
    } 
    else if (activePeriod === 'monthly') {
      const months = eachMonthOfInterval({ start: subMonths(today, 11), end: today });
      months.forEach(m => {
        const key = format(m, 'yyyy-MM');
        dataMap.set(key, { name: format(m, 'MMM', { locale: tr }), questions: 0, net: 0, tests: 0 });
      });
      processedData.forEach(t => {
        const key = format(t._solvedDate, 'yyyy-MM');
        if (dataMap.has(key)) {
          const cur = dataMap.get(key)!;
          cur.questions += t.questionCount || 0;
          cur.net += t._net || 0;
          cur.tests += 1;
        }
      });
    }
    else if (activePeriod === 'yearly') {
       const yearsCount = 3;
       const start = startOfYear(subDays(today, 365 * (yearsCount - 1)));
       for(let i=0; i<yearsCount; i++) {
           const d = addMonths(start, i * 12);
           const key = format(d, 'yyyy');
           dataMap.set(key, { name: key, questions: 0, net: 0, tests: 0 });
       }
       processedData.forEach(t => {
         const key = format(t._solvedDate, 'yyyy');
         if (dataMap.has(key)) {
           const cur = dataMap.get(key)!;
           cur.questions += t.questionCount || 0;
           cur.net += t._net || 0;
           cur.tests += 1;
         }
       });
    }

    return Array.from(dataMap.values());
  }, [processedData, activePeriod]);

  // --- TYPE BREAKDOWN ---
  const typeBreakdown = React.useMemo(() => {
    const map = new Map<string, { name: string, value: number, fill: string, net: number }>();
    const types = ['exam', 'bank', 'json', 'trackedBook', 'html', 'quick', 'mistake'];
    
    types.forEach((type, idx) => {
      const typeTests = processedData.filter(t => t.sourceType === type);
      if (typeTests.length > 0) {
        map.set(type, {
          name: translateType(type),
          value: typeTests.reduce((acc, t) => acc + t.questionCount, 0),
          net: typeTests.reduce((acc, t) => acc + t._net, 0) / typeTests.length,
          fill: CHART_COLORS[idx % CHART_COLORS.length]
        });
      }
    });
    return Array.from(map.values());
  }, [processedData]);

  // --- SUBJECT BREAKDOWN ---
  const subjectBreakdown = React.useMemo(() => {
    const map = new Map<string, { name: string, total: number, correct: number, net: number }>();
    processedData.forEach(t => {
      const cur = map.get(t._subjectName) || { name: t._subjectName, total: 0, correct: 0, net: 0 };
      cur.total += t.questionCount || 0;
      cur.correct += t.correctAnswers || 0;
      cur.net += t._net || 0;
      map.set(t._subjectName, cur);
    });
    return Array.from(map.values()).map(d => ({
      ...d,
      rate: d.total > 0 ? (d.correct / d.total) * 100 : 0
    })).sort((a,b) => b.rate - a.rate);
  }, [processedData]);

  const barChartConfig = {
    questions: { label: "Soru Sayısı", color: COLORS.BLUE },
    net: { label: "Net Başarısı", color: COLORS.PURPLE },
  } satisfies ChartConfig;

  if (loading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Veriler Analiz Ediliyor...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans pb-28 text-slate-900 dark:text-slate-100">
      
      {/* ── HEADER ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-500/20 text-white">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight leading-none">{student?.name || "Öğrenci Analizi"}</h1>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest">Performans Kokpiti</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <div className="hidden md:flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                {(['weekly', 'monthly', 'yearly'] as Period[]).map(p => (
                   <button key={p} onClick={() => setActivePeriod(p)} className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", activePeriod === p ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                     {p === 'weekly' ? 'HAFTA' : p === 'monthly' ? 'AY' : 'YIL'}
                   </button>
                ))}
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-8 space-y-8">

        {/* ── KPI GRID ───────────────────────────────────────── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatBox icon={SigmaIcon} value={kpis.totalQ} label="Toplam Soru" subValue="Tüm zamanlar" color={COLORS.BLUE} />
          <StatBox icon={Calculator} value={kpis.totalNet.toFixed(1)} label="Toplam Net" subValue="3 Yanlış -1 Doğru" color={COLORS.PURPLE} />
          <StatBox icon={Percent} value={`%${kpis.successRate.toFixed(0)}`} label="Başarı Oranı" subValue="Doğru/Toplam" color={COLORS.GREEN} />
          <StatBox icon={Layers} value={kpis.testCount} label="Çözülen Sınav" subValue="Adet bazında" color={COLORS.ORANGE} />
        </section>

        {/* ── ANA ZAMAN SERİSİ GRAFİĞİ ────────────────────────── */}
        <section className="grid grid-cols-1 gap-6">
            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden">
                <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-xl font-black flex items-center gap-3">
                            <Activity className="w-6 h-6 text-indigo-500" />
                            Gelişim Grafiği
                        </CardTitle>
                        <CardDescription>Soru hacmi ve net başarısı korelasyonu</CardDescription>
                    </div>
                    {/* Mobil Dönem Seçici */}
                    <div className="md:hidden">
                        <Select value={activePeriod} onValueChange={(v: any) => setActivePeriod(v)}>
                            <SelectTrigger className="w-32 h-9 rounded-xl">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="weekly">Haftalık</SelectItem>
                                <SelectItem value="monthly">Aylık</SelectItem>
                                <SelectItem value="yearly">Yıllık</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent className="p-6 md:p-8">
                    <div className="h-[350px] w-full">
                        <ChartContainer config={barChartConfig} className="h-full w-full">
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
                                <ChartTooltip 
                                    content={<ChartTooltipContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800" />}
                                />
                                <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
                                <Bar yAxisId="left" dataKey="questions" name="Soru Sayısı" fill={COLORS.BLUE} radius={[6, 6, 0, 0]} barSize={activePeriod === 'weekly' ? 30 : 15} />
                                <Area yAxisId="left" type="monotone" dataKey="net" name="Net Başarısı" stroke={COLORS.PURPLE} strokeWidth={4} fill="url(#colorNet)" dot={{ r: 4, fill: COLORS.PURPLE, strokeWidth: 2, stroke: '#fff' }} />
                            </ComposedChart>
                        </ChartContainer>
                    </div>
                </CardContent>
            </Card>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* ── SINAV TÜRÜ ANALİZİ ───────────────────────────── */}
            <section className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                    <PieIcon className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest text-xs">Sınav Türlerine Göre Dağılım</h3>
                </div>
                <Card className="rounded-[2.5rem] border-none shadow-lg bg-white dark:bg-slate-900 p-8">
                    <div className="flex flex-col sm:flex-row items-center gap-8">
                        <div className="w-full sm:w-1/2 h-[240px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={typeBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} stroke="none">
                                        {typeBreakdown.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-full sm:w-1/2 space-y-3">
                            {typeBreakdown.map((type, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.fill }} />
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{type.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black leading-none">{type.value}</p>
                                        <p className="text-[9px] font-bold text-slate-400 mt-1">{type.net.toFixed(1)} Net Ort.</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            </section>

            {/* ── DERS BAZLI BAŞARI ANALİZİ ───────────────────────── */}
            <section className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                    <Award className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest text-xs">Ders Bazlı Başarı Karnesi</h3>
                </div>
                <Card className="rounded-[2.5rem] border-none shadow-lg bg-white dark:bg-slate-900 p-8">
                    <ScrollArea className="h-[300px] pr-4">
                        <div className="space-y-4">
                            {subjectBreakdown.map((s, idx) => (
                                <div key={idx} className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{s.name}</h4>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">{s.total} Soru Çözüldü</p>
                                        </div>
                                        <div className="text-right">
                                            <span className={cn("text-lg font-black", s.rate >= 75 ? "text-emerald-500" : s.rate >= 50 ? "text-amber-500" : "text-rose-500")}>%{s.rate.toFixed(0)}</span>
                                        </div>
                                    </div>
                                    <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
                                        <motion.div 
                                            initial={{ width: 0 }} 
                                            animate={{ width: `${s.rate}%` }} 
                                            transition={{ duration: 1, delay: idx * 0.1 }}
                                            className={cn("h-full rounded-full", s.rate >= 75 ? "bg-emerald-500" : s.rate >= 50 ? "bg-amber-500" : "bg-rose-500")} 
                                        />
                                    </div>
                                    <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1">
                                        <span>{s.correct} Doğru</span>
                                        <span>{s.net.toFixed(1)} Net</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </Card>
            </section>
        </div>

        {/* ── ÇALIŞMA YOĞUNLUĞU (HEATMAP) ─────────────────────── */}
        <section className="pb-10">
             <div className="flex items-center gap-2 mb-4 px-2">
                <Flame className="w-5 h-5 text-orange-500" />
                <h3 className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest text-xs">Çalışma Disiplini (Son 28 Gün)</h3>
            </div>
            <Card className="rounded-[2.5rem] border-none shadow-lg bg-white dark:bg-slate-900 p-8">
                <div className="grid grid-cols-7 sm:grid-cols-14 gap-2">
                     {Array.from({ length: 28 }).map((_, i) => {
                         const d = subDays(new Date(), 27 - i);
                         const key = format(d, 'yyyy-MM-dd');
                         const dayTests = processedData.filter(t => format(t._solvedDate, 'yyyy-MM-dd') === key);
                         const count = dayTests.reduce((acc, t) => acc + (t.questionCount || 0), 0);
                         
                         let intensity = "bg-slate-100 dark:bg-slate-800";
                         if (count > 0) intensity = "bg-emerald-200 dark:bg-emerald-900/30";
                         if (count > 50) intensity = "bg-emerald-400 dark:bg-emerald-700/60";
                         if (count > 100) intensity = "bg-emerald-600 dark:bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]";

                         return (
                             <div key={i} className="flex flex-col items-center gap-1.5">
                                 <div className={cn("w-full aspect-square rounded-lg transition-all hover:scale-110 cursor-pointer", intensity)} title={`${format(d, 'dd MMM')}: ${count} soru`} />
                                 {i % 7 === 0 && <span className="text-[8px] font-bold text-slate-400 uppercase">{format(d, 'd MMM', {locale: tr})}</span>}
                             </div>
                         )
                     })}
                </div>
                <div className="mt-8 flex items-center justify-end gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>Az Soru</span>
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-sm bg-slate-100 dark:bg-slate-800" />
                        <div className="w-3 h-3 rounded-sm bg-emerald-200 dark:bg-emerald-900/30" />
                        <div className="w-3 h-3 rounded-sm bg-emerald-400 dark:bg-emerald-700/60" />
                        <div className="w-3 h-3 rounded-sm bg-emerald-600" />
                    </div>
                    <span>Çok Soru</span>
                </div>
            </Card>
        </section>

      </main>
    </div>
  );
}

// Helper: İkonlar için placeholder
function SigmaIcon(props: any) { return <BarChart3 {...props} /> }

// Helper: Tür çevirisi
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
