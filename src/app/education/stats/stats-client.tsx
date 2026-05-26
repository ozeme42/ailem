
"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Sigma, Check, X, Percent, Search,
  Target, TrendingUp, AlertCircle, Award, Filter, RotateCcw, ChevronDown,
  Flame
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip,
  XAxis, YAxis, Cell, LabelList, PieChart, Pie, LineChart, Line
} from "recharts";
import { useAuth } from "@/components/auth-provider";
import { onTestsUpdate, onBankQuestionsUpdate, onPracticeExamsUpdate, onTrackedBooksUpdate } from "@/lib/dataService";
import { Test, BankQuestion, PracticeExam, TrackedBook } from "@/lib/data";
import { cn } from "@/lib/utils";
import { getCategoryName } from "@/app/education/page";

// ─── iOS RENK PALETİ ────────────────────────────────────────────────────────
const C = {
  BLUE:   '#007AFF',
  GREEN:  '#34C759',
  ORANGE: '#FF9500',
  RED:    '#FF3B30',
  PURPLE: '#AF52DE',
  TEAL:   '#5AC8FA',
  INDIGO: '#5856D6',
  GRAY:   '#8E8E93',
};

// Bar chart renkleri (ders sırası)
const BAR_COLORS = [C.BLUE, C.INDIGO, C.PURPLE, C.TEAL, C.ORANGE, C.GREEN, '#FF6B6B', '#FFD93D'];
const WEEKLY_GOAL = 500; // Haftalık soru hedefi (Değiştirilebilir)

type TestTypeFilter = 'all' | 'bank' | 'trackedBook' | 'exam' | 'json';
type SortKey = keyof Test | null;

// ─── YARDIMCI BİLEŞENLER ────────────────────────────────────────────────────

function KpiCard({ icon, value, label, color }: {
  icon: React.ReactNode; value: string | number; label: string; color: string;
}) {
  return (
    <div className="rounded-[22px] p-4 bg-white dark:bg-[#1C1C1E]"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <div className="w-10 h-10 rounded-[13px] flex items-center justify-center mb-3"
        style={{ backgroundColor: `${color}15` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <p className="text-[26px] font-black leading-tight text-[#1C1C1E] dark:text-white">{value}</p>
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93] mt-0.5">{label}</p>
    </div>
  );
}

// Segment control (tab bar)
function SegmentControl<T extends string>({ options, value, onChange }: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex p-1 rounded-[14px] bg-[#F2F2F7] dark:bg-[#2C2C2E] overflow-x-auto [scrollbar-width:none]">
      {options.map(opt => (
        <button key={opt.id} onClick={() => onChange(opt.id)}
          className="shrink-0 px-3 h-8 rounded-[10px] text-[12px] font-bold whitespace-nowrap transition-all active:scale-95"
          style={value === opt.id
            ? { backgroundColor: 'white', color: '#1C1C1E', boxShadow: '0 1px 6px rgba(0,0,0,0.1)' }
            : { color: C.GRAY }}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// Native select picker (bottom sheet style)
function NativeSelect({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; placeholder: string;
}) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full h-10 rounded-[12px] pl-3 pr-8 text-[13px] font-semibold appearance-none bg-white dark:bg-[#1C1C1E] text-[#1C1C1E] dark:text-white border-0 outline-none focus:ring-2 focus:ring-[#007AFF]"
        style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <option value="all">{placeholder}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown style={{ width: 14, height: 14, color: C.GRAY, position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
    </div>
  );
}

// Konu satırı (güçlü/zayıf)
function TopicRow({ name, subject, rate, color }: { name: string; subject: string; rate: number; color: string }) {
  return (
    <div className="rounded-[18px] p-3.5 bg-white dark:bg-[#1C1C1E]"
      style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1 mr-3 min-w-0">
          <p className="text-[13px] font-bold text-[#1C1C1E] dark:text-white truncate">{name}</p>
          <p className="text-[11px] font-medium text-[#8E8E93]">{subject}</p>
        </div>
        <span className="text-[13px] font-black px-2.5 py-1 rounded-full shrink-0"
          style={{ backgroundColor: `${color}15`, color }}>
          %{rate.toFixed(0)}
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${rate}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// Dairesel İlerleme Çubuğu (Apple Fitness Stili)
function CircularProgress({ percent, color, size = 100, strokeWidth = 10, icon }: any) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={`${color}20`} strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ color }}>
        {icon}
      </div>
    </div>
  );
}

// ─── ANA SAYFA ───────────────────────────────────────────────────────────────
export default function StatsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const studentId = searchParams.get('studentId');
  const { familyMembers } = useAuth();

  const [tests, setTests] = React.useState<Test[]>([]);
  const [bankQuestions, setBankQuestions] = React.useState<BankQuestion[]>([]);
  const [practiceExams, setPracticeExams] = React.useState<PracticeExam[]>([]);
  const [trackedBooks, setTrackedBooks] = React.useState<TrackedBook[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [activeTestType, setActiveTestType] = React.useState<TestTypeFilter>('all');
  const [selectedSubject, setSelectedSubject] = React.useState('all');
  const [selectedSource, setSelectedSource] = React.useState('all');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [sortKey, setSortKey] = React.useState<SortKey>('assignedDate');
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc');
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const student = React.useMemo(() => familyMembers.find(m => m.id === studentId), [familyMembers, studentId]);

  React.useEffect(() => {
    if (!studentId) { setLoading(false); return; }
    const u1 = onTestsUpdate(all => {
      setTests(all.filter(t => t.studentId === studentId && t.status === 'Sonuçlandı'));
      setLoading(false);
    });
    const u2 = onBankQuestionsUpdate(setBankQuestions);
    const u3 = onPracticeExamsUpdate(setPracticeExams);
    const u4 = onTrackedBooksUpdate(setTrackedBooks);
    return () => { u1(); u2(); u3(); u4(); };
  }, [studentId]);

  const { filteredTests, chartData, topicStats, sourceOptions, subjectOptions, isTopicView } = React.useMemo(() => {
    const enriched = tests.map(test => {
      let sourceId = 'unknown', sourceName = 'Bilinmeyen Kaynak', topicName = 'Genel';
      const subjectName = getCategoryName(test);

      if (test.sourceType === 'trackedBook') {
        const book = trackedBooks.find(b => b.subjects.some(s => s.topics.some(t => t.id === test.topicId)));
        if (book) { sourceId = book.id; sourceName = book.title; }
      } else if (test.sourceType === 'exam') {
        const exam = practiceExams.find(e => e.id === test.sourceId);
        if (exam) { sourceId = exam.id; sourceName = exam.title; }
        else { sourceId = test.sourceId || test.title; sourceName = test.title; }
      } else {
        sourceId = test.sourceId || test.title;
        sourceName = (test as any).sourceName || test.title;
      }
      if (test.topicId) {
        const t = trackedBooks.flatMap(b => b.subjects.flatMap(s => s.topics)).find(t => t.id === test.topicId);
        if (t) topicName = t.name;
      }
      return { ...test, _sourceId: sourceId, _sourceName: sourceName, _topicName: topicName, _subjectName: subjectName };
    });

    const filtered = enriched.filter(t => {
      if (activeTestType !== 'all' && t.sourceType !== activeTestType) return false;
      if (selectedSubject !== 'all' && t._subjectName !== selectedSubject) return false;
      if (selectedSource !== 'all' && t._sourceId !== selectedSource) return false;
      if (searchTerm && !t.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });

    const uniqueSubjects = Array.from(new Set(enriched.map(t => t._subjectName))).sort();
    const uniqueSources = Array.from(new Set(
      enriched.filter(t => activeTestType === 'all' || t.sourceType === activeTestType)
        .map(t => JSON.stringify({ id: t._sourceId, name: t._sourceName }))
    )).map(s => JSON.parse(s));

    const isTopicMode = selectedSubject !== 'all';
    const statsMap = new Map<string, { total: number; correct: number; name: string }>();
    filtered.forEach(t => {
      const key = isTopicMode ? (t._topicName || 'Genel') : t._subjectName;
      const cur = statsMap.get(key) || { total: 0, correct: 0, name: key };
      cur.total += t.questionCount || 0;
      cur.correct += t.correctAnswers || 0;
      statsMap.set(key, cur);
    });
    const chart = Array.from(statsMap.values())
      .map(d => ({ ...d, successRate: d.total > 0 ? (d.correct / d.total) * 100 : 0 }))
      .sort((a, b) => b.successRate - a.successRate);

    const topicMap = new Map<string, { total: number; correct: number; subject: string; name: string }>();
    filtered.forEach(t => {
      if (t.topicId) {
        const cur = topicMap.get(t.topicId) || { total: 0, correct: 0, subject: t._subjectName, name: t._topicName };
        cur.total += t.questionCount || 0;
        cur.correct += t.correctAnswers || 0;
        topicMap.set(t.topicId, cur);
      }
    });
    const topics = Array.from(topicMap.values())
      .map(d => ({ ...d, successRate: d.total > 0 ? (d.correct / d.total) * 100 : 0 }))
      .sort((a, b) => b.successRate - a.successRate);

    return { filteredTests: filtered, chartData: chart, topicStats: topics, sourceOptions: uniqueSources, subjectOptions: uniqueSubjects, isTopicView: isTopicMode };
  }, [tests, trackedBooks, practiceExams, activeTestType, selectedSubject, selectedSource, searchTerm]);

  // Yeni Veriler: Haftalık Hedef, Trend, Heatmap
  const { weeklyQuestions, trendData, heatmapData, currentStreak } = React.useMemo(() => {
    const now = new Date();
    
    // 1. Haftalık Hedef Verisi
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1)); // Pazartesi başlar
    startOfWeek.setHours(0, 0, 0, 0);
    
    const weeklyQ = filteredTests
      .filter(t => {
        if (!t.assignedDate) return false;
        // Firebase Timestamp veya normal date objesini güvenli işleme
        const d = typeof (t as any).assignedDate?.toDate === 'function' 
          ? (t as any).assignedDate.toDate() 
          : new Date(t.assignedDate);
        if (isNaN(d.getTime())) return false;
        return d >= startOfWeek;
      })
      .reduce((acc, t) => acc + (t.questionCount || 0), 0);

    // 2. Trend (Çizgi Grafik) Verisi - Son 10 test günü
    const groupedByDate: Record<string, { totalQ: number; totalC: number; label: string }> = {};
    
    // Güvenli sıralama
    const sortedDates = [...filteredTests].sort((a, b) => {
      const dA = new Date(a.assignedDate || 0).getTime();
      const dB = new Date(b.assignedDate || 0).getTime();
      return (isNaN(dA) ? 0 : dA) - (isNaN(dB) ? 0 : dB);
    });
    
    sortedDates.forEach(t => {
      if (!t.assignedDate) return;
      const d = typeof (t as any).assignedDate?.toDate === 'function' 
        ? (t as any).assignedDate.toDate() 
        : new Date(t.assignedDate);
        
      if (isNaN(d.getTime())) return; // KRİTİK KONTROL
      
      const key = d.toISOString().split('T')[0]; // YYYY-MM-DD
      const label = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
      
      if (!groupedByDate[key]) groupedByDate[key] = { totalQ: 0, totalC: 0, label };
      groupedByDate[key].totalQ += (t.questionCount || 0);
      groupedByDate[key].totalC += (t.correctAnswers || 0);
    });

    const trend = Object.values(groupedByDate).map(d => ({
      date: d.label,
      rate: d.totalQ > 0 ? Math.round((d.totalC / d.totalQ) * 100) : 0
    })).slice(-10); // Sadece son 10 aktif günü al

    // 3. Heatmap Verisi (Son 28 gün - 4 hafta)
    const heatmapDays: Array<{date: Date; key: string; count: number}> = [];
    let streak = 0;
    const today = new Date();
    today.setHours(0,0,0,0);
    
    for (let i = 27; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      heatmapDays.push({ date: d, key: d.toISOString().split('T')[0], count: 0 });
    }

    filteredTests.forEach(t => {
      if (!t.assignedDate) return;
      const d = typeof (t as any).assignedDate?.toDate === 'function' 
        ? (t as any).assignedDate.toDate() 
        : new Date(t.assignedDate);
        
      if (isNaN(d.getTime())) return; // KRİTİK KONTROL
      
      const tDate = d.toISOString().split('T')[0];
      const dayTarget = heatmapDays.find(day => day.key === tDate);
      if (dayTarget) dayTarget.count += (t.questionCount || 0);
    });

    // Güncel Streak Hesaplama
    for (let i = heatmapDays.length - 1; i >= 0; i--) {
      if (heatmapDays[i].count > 0) streak++;
      else if (i !== heatmapDays.length - 1) break; 
    }

    return { weeklyQuestions: weeklyQ, trendData: trend, heatmapData: heatmapDays, currentStreak: streak };
  }, [filteredTests]);

  const sortedTests = React.useMemo(() => {
    return [...filteredTests].sort((a, b) => {
      if (!sortKey) return 0;
      const va = (a as any)[sortKey], vb = (b as any)[sortKey];
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredTests, sortKey, sortDir]);

  // Özet sayılar
  const totalQ = filteredTests.reduce((s, t) => s + (t.questionCount || 0), 0);
  const totalC = filteredTests.reduce((s, t) => s + (t.correctAnswers || 0), 0);
  const totalW = filteredTests.reduce((s, t) => s + (t.incorrectAnswers || 0), 0);
  const totalE = filteredTests.reduce((s, t) => s + (t.emptyAnswers || 0), 0);
  const successRate = totalQ > 0 ? (totalC / totalQ) * 100 : 0;
  const weeklyPercent = Math.min((weeklyQuestions / WEEKLY_GOAL) * 100, 100);

  const pieData = [
    { name: 'Doğru', value: totalC, fill: C.GREEN },
    { name: 'Yanlış', value: totalW, fill: C.RED },
    { name: 'Boş',   value: totalE, fill: C.GRAY },
  ];

  const typeOptions: { id: TestTypeFilter; label: string }[] = [
    { id: 'all', label: 'Tümü' },
    { id: 'bank', label: 'S. Bankası' },
    { id: 'trackedBook', label: 'Kitap' },
    { id: 'exam', label: 'Deneme' },
    { id: 'json', label: 'Yazılı' },
  ];

  if (loading) return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-black flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: `${C.BLUE} transparent transparent transparent` }} />
    </div>
  );

  if (!student) return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-black flex flex-col items-center justify-center gap-4">
      <p className="text-[16px] font-semibold text-[#8E8E93]">Öğrenci bulunamadı.</p>
      <button onClick={() => router.back()}
        className="h-11 px-6 rounded-2xl text-white font-bold active:scale-95 transition-transform"
        style={{ backgroundColor: C.BLUE }}>
        Geri Dön
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-black font-sans pb-28">
      <div className="h-[env(safe-area-inset-top,0px)]" />

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.08]">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-[#F2F2F7] dark:bg-[#2C2C2E] active:scale-90 transition-transform shrink-0">
            <ArrowLeft style={{ width: 18, height: 18, color: C.BLUE }} />
          </button>
          <div className="w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0"
            style={{ background: `linear-gradient(135deg, ${C.INDIGO}, ${C.PURPLE})` }}>
            <Target style={{ width: 18, height: 18, color: 'white' }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-black text-[#1C1C1E] dark:text-white truncate leading-tight">{student.name}</p>
            <p className="text-[11px] font-semibold text-[#8E8E93]">Başarı İstatistikleri</p>
          </div>
          <button onClick={() => setFiltersOpen(p => !p)}
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform shrink-0 relative"
            style={{ backgroundColor: filtersOpen ? C.BLUE : '#F2F2F7' }}>
            <Filter style={{ width: 16, height: 16, color: filtersOpen ? 'white' : C.GRAY }} />
            {(activeTestType !== 'all' || selectedSubject !== 'all' || selectedSource !== 'all' || searchTerm) && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                style={{ backgroundColor: C.RED }} />
            )}
          </button>
        </div>
      </header>

      <main className="px-4 pt-5 space-y-5">

        {/* ── FİLTRELER PANELİ (açılır/kapanır) ─────────────── */}
        {filtersOpen && (
          <div className="rounded-[22px] p-4 bg-white dark:bg-[#1C1C1E] space-y-3 animate-in slide-in-from-top-2 duration-200"
            style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <p className="text-[11px] font-black uppercase tracking-widest text-[#8E8E93]">Test Tipi</p>
            <SegmentControl options={typeOptions} value={activeTestType}
              onChange={v => { setActiveTestType(v); setSelectedSource('all'); }} />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider mb-1">Ders</p>
                <NativeSelect value={selectedSubject} onChange={setSelectedSubject}
                  options={subjectOptions.map(s => ({ value: s, label: s }))}
                  placeholder="Tüm Dersler" />
              </div>
              {sourceOptions.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider mb-1">Kaynak</p>
                  <NativeSelect value={selectedSource} onChange={setSelectedSource}
                    options={sourceOptions.map((s: any) => ({ value: s.id, label: s.name }))}
                    placeholder="Tüm Kaynaklar" />
                </div>
              )}
            </div>

            {/* Arama */}
            <div className="relative">
              <Search style={{ width: 15, height: 15, color: C.GRAY, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="Test ara..."
                className="w-full h-10 rounded-[12px] pl-9 pr-4 text-[13px] font-semibold bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-white border-0 outline-none"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 active:scale-90 transition-transform">
                  <X style={{ width: 14, height: 14, color: C.GRAY }} />
                </button>
              )}
            </div>

            {/* Sıfırla */}
            {(activeTestType !== 'all' || selectedSubject !== 'all' || selectedSource !== 'all' || searchTerm) && (
              <button onClick={() => { setActiveTestType('all'); setSelectedSubject('all'); setSelectedSource('all'); setSearchTerm(''); }}
                className="w-full h-9 rounded-[12px] text-[13px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
                style={{ backgroundColor: `${C.RED}12`, color: C.RED }}>
                <RotateCcw style={{ width: 13, height: 13 }} />
                Filtreleri Sıfırla
              </button>
            )}
          </div>
        )}

        {/* ── KPI KARTLARI ────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <KpiCard icon={<Sigma style={{ width: 20, height: 20 }} />} value={totalQ} label="Toplam Soru" color={C.BLUE} />
          <KpiCard icon={<Percent style={{ width: 20, height: 20 }} />} value={`%${successRate.toFixed(0)}`} label="Genel Başarı" color={C.INDIGO} />
        </div>

        {/* ── HEDEF VE AKTİVİTE BÖLÜMÜ ──────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Haftalık Hedef */}
          <div className="rounded-[22px] p-4 bg-white dark:bg-[#1C1C1E] flex flex-col items-center justify-center text-center"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <p className="text-[12px] font-bold text-[#8E8E93] mb-3">Haftalık Hedef</p>
            <CircularProgress percent={weeklyPercent} color={weeklyPercent >= 100 ? C.GREEN : C.ORANGE} size={84} strokeWidth={8}
              icon={<Target style={{ width: 24, height: 24 }} />} />
            <p className="text-[16px] font-black text-[#1C1C1E] dark:text-white mt-3 leading-none">
              {weeklyQuestions} <span className="text-[12px] text-[#8E8E93] font-medium">/ {WEEKLY_GOAL}</span>
            </p>
            {weeklyPercent >= 100 && (
              <p className="text-[10px] font-bold text-green-500 mt-1">Hedefe Ulaşıldı! 🎉</p>
            )}
          </div>

          {/* Çalışma Serisi & Heatmap */}
          <div className="rounded-[22px] p-4 bg-white dark:bg-[#1C1C1E] flex flex-col"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[12px] font-bold text-[#8E8E93]">Aktivite</p>
              <div className="flex items-center gap-1 bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded-full">
                <Flame style={{ width: 12, height: 12, color: C.ORANGE }} />
                <span className="text-[11px] font-black text-orange-600 dark:text-orange-400">{currentStreak} Gün</span>
              </div>
            </div>
            
            {/* 4 Haftalık Heatmap Grid */}
            <div className="flex-1 flex flex-col justify-end">
              <div className="grid grid-cols-7 gap-1.5 mt-auto">
                {heatmapData.map((day, idx) => {
                  let opacity = 0.1;
                  if (day.count > 0) opacity = 0.4;
                  if (day.count > 20) opacity = 0.7;
                  if (day.count > 50) opacity = 1;
                  
                  return (
                    <div key={idx} className="aspect-square rounded-[4px] transition-all"
                      style={{ 
                        backgroundColor: day.count > 0 ? C.GREEN : (document.documentElement.classList.contains('dark') ? '#2C2C2E' : '#F2F2F7'),
                        opacity: day.count > 0 ? opacity : 1
                      }}
                      title={`${day.key}: ${day.count} Soru`}
                    />
                  );
                })}
              </div>
              <p className="text-[9px] font-semibold text-[#8E8E93] mt-2 text-right">Son 28 Gün</p>
            </div>
          </div>
        </div>

        {/* ── GELİŞİM TRENDİ ─────────────── */}
        <div className="rounded-[24px] p-4 bg-white dark:bg-[#1C1C1E]"
          style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.07)' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ backgroundColor: `${C.PURPLE}15` }}>
              <TrendingUp style={{ width: 16, height: 16, color: C.PURPLE }} />
            </div>
            <div>
              <p className="text-[14px] font-black text-[#1C1C1E] dark:text-white leading-tight">Başarı Trendi</p>
              <p className="text-[11px] font-medium text-[#8E8E93]">Son aktivitelerdeki net yüzdesi</p>
            </div>
          </div>
          
          {trendData.length > 1 ? (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(142,142,147,0.15)" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8E8E93', fontWeight: 600 }} dy={10} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'white', border: 'none', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12, fontWeight: 700 }}
                  formatter={(v: number) => [`%${v}`, 'Başarı']}
                  labelStyle={{ color: C.GRAY, marginBottom: 4 }}
                />
                <Line type="monotone" dataKey="rate" stroke={C.PURPLE} strokeWidth={4} 
                  dot={{ r: 4, fill: 'white', stroke: C.PURPLE, strokeWidth: 2 }} 
                  activeDot={{ r: 6, fill: C.PURPLE, stroke: 'white', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[120px] flex items-center justify-center">
              <p className="text-[12px] text-[#8E8E93] font-medium">Trend için daha fazla test çözmelisin.</p>
            </div>
          )}
        </div>

        {/* ── BAŞARI ORANI BÜYÜK KART (Dersler/Konular) ────────── */}
        <div className="rounded-[24px] overflow-hidden bg-white dark:bg-[#1C1C1E]"
          style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.07)' }}>
          <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${C.GREEN}, ${C.TEAL})` }} />
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-[#8E8E93] mb-1">
                  {isTopicView ? `${selectedSubject} — Konu Başarısı` : 'Ders Başarısı'}
                </p>
                <p className="text-[15px] font-black text-[#1C1C1E] dark:text-white">
                  {isTopicView ? 'Konulara tıklayarak detay görün' : 'Derse tıklayarak konu analizi yapın'}
                </p>
              </div>
              {isTopicView && (
                <button onClick={() => setSelectedSubject('all')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold active:scale-95 transition-transform"
                  style={{ backgroundColor: `${C.INDIGO}15`, color: C.INDIGO }}>
                  <RotateCcw style={{ width: 11, height: 11 }} />
                  Tüm Dersler
                </button>
              )}
            </div>

            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 44)}>
                <BarChart data={chartData} layout="vertical"
                  margin={{ left: 0, right: 36, top: 4, bottom: 4 }}
                  onClick={d => {
                    if (!isTopicView && d?.activePayload?.[0]) {
                      setSelectedSubject(d.activePayload[0].payload.name);
                    }
                  }}>
                  <CartesianGrid horizontal={false} stroke="rgba(0,0,0,0.04)" />
                  <YAxis dataKey="name" type="category" tickLine={false} axisLine={false}
                    width={110} tick={{ fill: '#8E8E93', fontSize: 11, fontWeight: 600 }} />
                  <XAxis type="number" hide domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'white', border: 'none', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', fontSize: 13 }}
                    formatter={(v: number) => [`%${v.toFixed(1)}`, 'Başarı']}
                  />
                  <Bar dataKey="successRate" radius={[0, 8, 8, 0]} barSize={28}
                    className="cursor-pointer">
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                    <LabelList dataKey="successRate" position="right"
                      formatter={(v: number) => `%${v.toFixed(0)}`}
                      style={{ fill: '#8E8E93', fontSize: 11, fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center py-10">
                <p className="text-[14px] text-[#8E8E93] font-medium">Veri bulunamadı</p>
              </div>
            )}
          </div>
        </div>

        {/* ── SORU DAĞILIMI (Pasta grafik) ────────────────────── */}
        <div className="rounded-[24px] p-4 bg-white dark:bg-[#1C1C1E]"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <p className="text-[13px] font-black text-[#1C1C1E] dark:text-white mb-4">Soru Dağılımı</p>
          <div className="flex items-center gap-4">
            {/* Pasta */}
            <div className="relative shrink-0" style={{ width: 120, height: 120 }}>
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={pieData} cx={55} cy={55} innerRadius={36} outerRadius={52}
                    paddingAngle={4} dataKey="value" startAngle={90} endAngle={-270}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.fill} stroke="none" />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-[18px] font-black text-[#1C1C1E] dark:text-white leading-none">{totalQ}</p>
                <p className="text-[9px] font-bold text-[#8E8E93] uppercase tracking-wide">Toplam</p>
              </div>
            </div>

            {/* Lejant */}
            <div className="flex-1 space-y-2.5">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.fill }} />
                    <p className="text-[13px] font-semibold text-[#1C1C1E] dark:text-white">{d.name}</p>
                  </div>
                  <p className="text-[13px] font-black" style={{ color: d.fill }}>{d.value}</p>
                </div>
              ))}
              {totalQ > 0 && (
                <div className="pt-1 border-t border-black/[0.04] dark:border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] font-bold text-[#8E8E93]">Net</p>
                    <p className="text-[13px] font-black" style={{ color: C.GREEN }}>
                      {(totalC - totalW / 3).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── GÜÇLÜ / ZAYIF KONULAR ───────────────────────────── */}
        <div className="grid grid-cols-1 gap-4">
          {/* Güçlü */}
          <div className="rounded-[24px] p-4 bg-white dark:bg-[#1C1C1E]"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-[9px] flex items-center justify-center" style={{ backgroundColor: `${C.GREEN}18` }}>
                <Award style={{ width: 15, height: 15, color: C.GREEN }} />
              </div>
              <p className="text-[15px] font-black text-[#1C1C1E] dark:text-white">En Güçlü Konular</p>
            </div>
            <div className="space-y-2">
              {topicStats.filter(t => t.successRate >= 80).slice(0, 5).map((t, i) => (
                <TopicRow key={i} name={t.name} subject={t.subject} rate={t.successRate} color={C.GREEN} />
              ))}
              {topicStats.filter(t => t.successRate >= 80).length === 0 && (
                <p className="text-center text-[13px] text-[#8E8E93] py-4 font-medium">Henüz yeterli veri yok.</p>
              )}
            </div>
          </div>

          {/* Zayıf */}
          <div className="rounded-[24px] p-4 bg-white dark:bg-[#1C1C1E]"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-[9px] flex items-center justify-center" style={{ backgroundColor: `${C.RED}15` }}>
                  <AlertCircle style={{ width: 15, height: 15, color: C.RED }} />
                </div>
                <p className="text-[15px] font-black text-[#1C1C1E] dark:text-white">Geliştirilmesi Gerekenler</p>
              </div>
            </div>
            <div className="space-y-2">
              {topicStats.filter(t => t.successRate < 70 && t.total > 0)
                .sort((a, b) => a.successRate - b.successRate).slice(0, 5)
                .map((t, i) => (
                  <div key={i} className="relative group">
                    <TopicRow name={t.name} subject={t.subject} rate={t.successRate} color={C.RED} />
                  </div>
                ))}
              {topicStats.filter(t => t.successRate < 70 && t.total > 0).length === 0 && (
                <div className="flex flex-col items-center py-6 gap-2">
                  <p className="text-[22px]">🎉</p>
                  <p className="text-[13px] font-semibold text-[#8E8E93]">Tebrikler! Zayıf konu bulunamadı.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── TEST SONUÇLARI — DERS → KONU → TEST ─────────────── */}
        <TestResultsTree tests={sortedTests} router={router} />
      </main>
    </div>
  );
}

// ─── HİYERARŞİK TEST SONUÇ AĞACI ────────────────────────────────────────────
function TestResultsTree({ tests, router }: { tests: any[]; router: any }) {
  // 1. Ders → Konu → Testler grupla (testler kendi içinde kronolojik, en yeni önce)
  const grouped = React.useMemo(() => {
    const bySubject: Record<string, Record<string, any[]>> = {};
    tests.forEach(t => {
      const subj = t._subjectName || 'Diğer';
      const topic = (t._topicName && t._topicName !== 'Genel') ? t._topicName : '— Genel —';
      if (!bySubject[subj]) bySubject[subj] = {};
      if (!bySubject[subj][topic]) bySubject[subj][topic] = [];
      bySubject[subj][topic].push(t);
    });
    
    // Her konudaki testleri kronolojik sırala (Geçersiz tarihleri alta atarak güvenli sıralama)
    Object.values(bySubject).forEach(topics =>
      Object.values(topics).forEach(arr =>
        arr.sort((a, b) => {
          const dA = new Date(a.assignedDate || 0).getTime();
          const dB = new Date(b.assignedDate || 0).getTime();
          return (isNaN(dB) ? 0 : dB) - (isNaN(dA) ? 0 : dA); // Azalan sıra (En yeni)
        })
      )
    );
    return bySubject;
  }, [tests]);

  // Hangi ders/konu açık
  const [openSubjects, setOpenSubjects] = React.useState<Set<string>>(new Set());
  const [openTopics, setOpenTopics] = React.useState<Set<string>>(new Set());

  const toggleSubject = (s: string) =>
    setOpenSubjects(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });
  const toggleTopic = (key: string) =>
    setOpenTopics(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  if (tests.length === 0) {
    return (
      <div className="rounded-[24px] flex flex-col items-center justify-center py-12 bg-white dark:bg-[#1C1C1E]"
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <p className="text-[14px] font-medium text-[#8E8E93]">Kayıt bulunamadı.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-[17px] font-black text-[#1C1C1E] dark:text-white">Test Geçmişi</p>
        <span className="text-[12px] font-bold px-2.5 py-1 rounded-full"
          style={{ backgroundColor: `${C.BLUE}12`, color: C.BLUE }}>
          {tests.length} test
        </span>
      </div>

      {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([subject, topics], si) => {
        const subjectColor = BAR_COLORS[si % BAR_COLORS.length];
        const subjOpen = openSubjects.has(subject);
        // Ders özet istatistikleri
        const allSubjTests = Object.values(topics).flat();
        const subjQ = allSubjTests.reduce((s, t) => s + (t.questionCount || 0), 0);
        const subjC = allSubjTests.reduce((s, t) => s + (t.correctAnswers || 0), 0);
        const subjRate = subjQ > 0 ? (subjC / subjQ) * 100 : 0;

        return (
          <div key={subject} className="rounded-[22px] overflow-hidden bg-white dark:bg-[#1C1C1E]"
            style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
            {/* ── DERS BAŞLIĞI ── */}
            <button onClick={() => toggleSubject(subject)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-[#F2F2F7] dark:active:bg-[#2C2C2E] transition-colors">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: subjectColor }} />
              <p className="flex-1 text-[15px] font-black text-[#1C1C1E] dark:text-white">{subject}</p>
              <span className="text-[12px] font-black px-2 py-0.5 rounded-full mr-1"
                style={{ backgroundColor: `${subjectColor}15`, color: subjectColor }}>
                %{subjRate.toFixed(0)}
              </span>
              <span className="text-[11px] font-semibold text-[#8E8E93] mr-1">{allSubjTests.length} test</span>
              <ChevronDown style={{
                width: 16, height: 16, color: C.GRAY,
                transform: subjOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }} />
            </button>

            {subjOpen && (
              <div className="border-t border-black/[0.04] dark:border-white/[0.05]">
                {Object.entries(topics).sort(([a], [b]) => a.localeCompare(b)).map(([topic, topicTests], ti) => {
                  const topicKey = `${subject}__${topic}`;
                  const topicOpen = openTopics.has(topicKey);
                  const topicQ = topicTests.reduce((s, t) => s + (t.questionCount || 0), 0);
                  const topicC = topicTests.reduce((s, t) => s + (t.correctAnswers || 0), 0);
                  const topicRate = topicQ > 0 ? (topicC / topicQ) * 100 : 0;
                  const topicRateColor = topicRate >= 80 ? C.GREEN : topicRate >= 50 ? C.ORANGE : C.RED;

                  return (
                    <div key={topic} className="border-b last:border-b-0 border-black/[0.03] dark:border-white/[0.04]">
                      {/* ── KONU BAŞLIĞI ── */}
                      <button onClick={() => toggleTopic(topicKey)}
                        className="w-full flex items-center gap-3 pl-8 pr-4 py-3 text-left active:bg-[#F2F2F7] dark:active:bg-[#2C2C2E] transition-colors">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#D1D1D6] dark:bg-[#48484A]" />
                        <p className="flex-1 text-[13px] font-bold text-[#3C3C43] dark:text-[#EBEBF5]">{topic}</p>
                        <span className="text-[11px] font-black px-2 py-0.5 rounded-full mr-1"
                          style={{ backgroundColor: `${topicRateColor}12`, color: topicRateColor }}>
                          %{topicRate.toFixed(0)}
                        </span>
                        <span className="text-[10px] font-semibold text-[#8E8E93] mr-1">{topicTests.length}</span>
                        <ChevronDown style={{
                          width: 14, height: 14, color: C.GRAY,
                          transform: topicOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s',
                        }} />
                      </button>

                      {topicOpen && (
                        <div className="bg-[#F9F9FB] dark:bg-[#141414]">
                          {topicTests.map((test, ti2) => {
                            const rate = test.questionCount ? ((test.correctAnswers || 0) / test.questionCount) * 100 : 0;
                            const rateColor = rate >= 80 ? C.GREEN : rate >= 50 ? C.ORANGE : C.RED;
                            
                            // Güvenli Tarih Çevrimi
                            let dateStr = '';
                            if (test.assignedDate) {
                              const d = new Date(test.assignedDate);
                              if (!isNaN(d.getTime())) {
                                dateStr = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
                              }
                            }

                            return (
                              <button key={test.id}
                                onClick={() => router.push(`/education/${test.id}`)}
                                className={cn(
                                  "w-full flex items-center gap-3 pl-10 pr-4 py-3 text-left active:bg-[#F2F2F7] dark:active:bg-[#2C2C2E] transition-colors",
                                  ti2 < topicTests.length - 1 && "border-b border-black/[0.03] dark:border-white/[0.03]"
                                )}>
                                {/* Kronoloji çizgisi */}
                                <div className="flex flex-col items-center gap-0.5 shrink-0">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: rateColor }} />
                                  {ti2 < topicTests.length - 1 && (
                                    <div className="w-px h-6 bg-[#D1D1D6] dark:bg-[#48484A]" />
                                  )}
                                </div>
                                {/* İçerik */}
                                <div className="flex-1 min-w-0 py-0.5">
                                  <p className="text-[12px] font-bold text-[#1C1C1E] dark:text-white truncate">{test.title}</p>
                                  <p className="text-[10px] font-semibold text-[#8E8E93] mt-0.5">{dateStr}</p>
                                </div>
                                {/* Mini istatistikler */}
                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="text-right">
                                    <p className="text-[11px] font-black text-[#1C1C1E] dark:text-white">{test.questionCount}</p>
                                    <p className="text-[9px] text-[#8E8E93] font-bold">S</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[11px] font-black" style={{ color: C.GREEN }}>{test.correctAnswers}</p>
                                    <p className="text-[9px] text-[#8E8E93] font-bold">D</p>
                                  </div>
                                  <div className="w-10 text-right">
                                    <p className="text-[12px] font-black" style={{ color: rateColor }}>%{rate.toFixed(0)}</p>
                                    <p className="text-[9px] text-[#8E8E93] font-bold">Net</p>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
