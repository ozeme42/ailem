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

import { Badge } from "@/components/ui/badge";
import { Test, StudyAssignment, StudyPlan, TrackedBook } from "@/lib/data";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { onTestsUpdate, onStudyAssignmentsUpdate, onStudyPlansUpdate, onTrackedBooksUpdate, updateStudyAssignment } from "@/lib/dataService";
import { useAuth } from "@/components/auth-provider";
import { format, parse, isPast, isToday, differenceInDays } from 'date-fns';
import { tr } from 'date-fns/locale';

// ─── RENK SİSTEMİ (iOS sistem renkleri) ────────────────────────────────────
const C = {
  BLUE:   '#007AFF',
  GREEN:  '#34C759',
  ORANGE: '#FF9500',
  RED:    '#FF3B30',
  PURPLE: '#AF52DE',
  PINK:   '#FF2D55',
  TEAL:   '#5AC8FA',
  INDIGO: '#5856D6',
  YELLOW: '#FFCC00',
};

// Kategori → renk eşleşmesi
const categoryColor: Record<string, string> = {
  'Matematik':               C.RED,
  'Fen Bilimleri':           C.ORANGE,
  'Türkçe':                  C.YELLOW,
  'Sosyal Bilgiler':         C.TEAL,
  'İngilizce':               C.BLUE,
  'Genel Deneme Sınavları':  C.PURPLE,
  'Serbest Etkinlikler':     C.GREEN,
  'Diğer':                   '#8E8E93',
};

export const getCategoryName = (test: Test): string => {
  if (test.sourceType === 'exam') return 'Genel Deneme Sınavları';
  if (test.sourceType === 'mistake') return 'Yanlışlarım';
  return test.subject || 'Diğer';
};

// ─── YARDIMCI: mini istatistik kutusu ───────────────────────────────────────
function StatChip({ icon, value, label, color, href }: { icon: React.ReactNode; value: string | number; label: string; color: string; href?: string }) {
  const inner = (
    <div className="flex-1 rounded-[22px] p-4 bg-white dark:bg-[#1C1C1E] active:scale-[0.97] transition-transform"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <div className="w-9 h-9 rounded-[11px] flex items-center justify-center mb-3"
        style={{ backgroundColor: `${color}18` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <p className="text-[22px] font-black text-[#1C1C1E] dark:text-white leading-tight">{value}</p>
      <p className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wide mt-0.5">{label}</p>
    </div>
  );
  return href ? <Link href={href} className="flex-1">{inner}</Link> : inner;
}

// ─── ANA SAYFA ───────────────────────────────────────────────────────────────
export default function EducationPage() {
  const { toast } = useToast();
  const { familyMembers } = useAuth();
  const [selectedStudent, setSelectedStudent] = React.useState<any>(null);

  const [allTests, setAllTests] = React.useState<Test[]>([]);
  const [studyAssignments, setStudyAssignments] = React.useState<StudyAssignment[]>([]);
  const [studyPlans, setStudyPlans] = React.useState<StudyPlan[]>([]);
  const [trackedBooks, setTrackedBooks] = React.useState<TrackedBook[]>([]);
  const [expandedBooks, setExpandedBooks] = React.useState<Set<string>>(new Set());

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

  const allTopics = React.useMemo(() =>
    trackedBooks.flatMap(b => (b.subjects || []).flatMap(s =>
      (s.topics || []).map(t => ({ ...t, subjectName: s.name })))),
    [trackedBooks]);

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

  const groupedPendingTests = React.useMemo(() => {
    const groups: Record<string, Test[]> = {};
    tests.filter(t => t.status === 'Atandı').forEach(t => {
      const cat = getCategoryName(t);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [tests]);

  const stats = React.useMemo(() => {
    const completed = tests.filter(t => t.status === 'Sonuçlandı');
    const sorted = [...completed].sort((a, b) =>
      new Date(b.assignedDate || '').getTime() - new Date(a.assignedDate || '').getTime());
    let totalQ = 0, totalC = 0;
    sorted.forEach(t => { totalQ += t.questionCount || 0; totalC += t.correctAnswers || 0; });
    const rate = totalQ > 0 ? (totalC / totalQ) * 100 : 0;
    let trend = 0, hasTrend = false;
    if (sorted.length > 1) {
      let pQ = 0, pC = 0;
      sorted.slice(1).forEach(t => { pQ += t.questionCount || 0; pC += t.correctAnswers || 0; });
      trend = rate - (pQ > 0 ? (pC / pQ) * 100 : 0);
      hasTrend = true;
    }
    return {
      testCount: tests.length,
      pendingCount: tests.filter(t => t.status !== 'Sonuçlandı').length + assignments.filter(s => s.status !== 'completed').length,
      successRate: rate, trend, hasTrend,
    };
  }, [tests, assignments]);

  const handleCompleteStudy = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    await updateStudyAssignment(id, { status: newStatus as any });
    toast({ title: currentStatus === 'completed' ? "Geri Alındı" : "Tamamlandı ✓" });
  };

  const toggleBook = (id: string) => {
    setExpandedBooks(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-black font-sans pb-28">

      {/* ── STATUS BAR SPACER */}
      <div className="h-[env(safe-area-inset-top,0px)]" />

      {/* ── HEADER ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.08]">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[11px] flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${C.INDIGO}, ${C.BLUE})` }}>
              <GraduationCap className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
            </div>
            <p className="text-[17px] font-black text-[#1C1C1E] dark:text-white">Eğitim Paneli</p>
          </div>

          {/* Öğrenci seçici — hap butonlar */}
          <div className="flex gap-1.5">
            {studentMembers.map(s => {
              const active = selectedStudent?.id === s.id;
              return (
                <button key={s.id} onClick={() => setSelectedStudent(s)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all active:scale-95"
                  style={active
                    ? { backgroundColor: s.color, color: '#fff' }
                    : { backgroundColor: 'rgba(0,0,0,0.06)', color: '#8E8E93' }}>
                  <span className="w-2 h-2 rounded-full bg-white/70" />
                  {s.name}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="px-4 pt-5 space-y-6">

        {/* ── İSTATİSTİK KARTLARI ─────────────────────────────── */}
        <section>
          {/* Üst: Başarı oranı — büyük kart */}
          <Link href={`/education/stats?studentId=${selectedStudent?.id}`}>
            <div className="rounded-[28px] p-5 mb-3 relative overflow-hidden active:scale-[0.98] transition-transform"
              style={{
                background: `linear-gradient(135deg, ${C.GREEN} 0%, ${C.TEAL} 100%)`,
                boxShadow: `0 8px 32px ${C.GREEN}40`,
              }}>
              {/* Dekoratif daire */}
              <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
              <div className="absolute -right-2 -bottom-6 w-20 h-20 rounded-full bg-white/10" />

              <div className="relative z-10 flex items-end justify-between">
                <div>
                  <p className="text-white/70 text-[12px] font-bold uppercase tracking-widest mb-1">Başarı Oranı</p>
                  <div className="flex items-baseline gap-3">
                    <p className="text-[44px] font-black text-white leading-none">
                      %{stats.successRate.toFixed(1)}
                    </p>
                    {stats.hasTrend && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/20 text-white text-[12px] font-bold">
                        {stats.trend > 0
                          ? <TrendingUp className="w-3.5 h-3.5" />
                          : <TrendingDown className="w-3.5 h-3.5" />}
                        %{Math.abs(stats.trend).toFixed(1)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Dairesel progress */}
                <div className="relative w-20 h-20">
                  <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="7" />
                    <circle cx="40" cy="40" r="34" fill="none" stroke="white" strokeWidth="7"
                      strokeLinecap="round"
                      strokeDasharray={213.6}
                      strokeDashoffset={213.6 - (213.6 * stats.successRate) / 100}
                      style={{ transition: 'stroke-dashoffset 1s ease' }} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    {stats.successRate >= 90
                      ? <Sparkles className="w-6 h-6 text-white" />
                      : <CheckCircle2 className="w-6 h-6 text-white" />}
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* Alt: 3'lü küçük istatistikler */}
          <div className="flex gap-3">
            <StatChip icon={<AlertCircle style={{ width: 18, height: 18 }} />}
              value={stats.pendingCount} label="Bekleyen" color={C.ORANGE} />
            <StatChip icon={<Layers style={{ width: 18, height: 18 }} />}
              value={stats.testCount} label="Toplam" color={C.BLUE} href="/education/management" />
            <StatChip icon={<CheckCircle2 style={{ width: 18, height: 18 }} />}
              value={stats.testCount - stats.pendingCount} label="Bitti" color={C.GREEN} />
          </div>
        </section>

        {/* ── BEKLEYEN TESTLER ─────────────────────────────────── */}
        {groupedPendingTests.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${C.RED}18` }}>
                <Flame style={{ width: 14, height: 14, color: C.RED }} />
              </div>
              <p className="text-[17px] font-black text-[#1C1C1E] dark:text-white">Yapılacaklar</p>
              <span className="ml-auto text-[13px] font-bold px-2.5 py-0.5 rounded-full"
                style={{ backgroundColor: `${C.RED}15`, color: C.RED }}>
                {groupedPendingTests.reduce((s, [, t]) => s + t.length, 0)}
              </span>
            </div>

            <div className="space-y-3">
              {groupedPendingTests.map(([category, categoryTests]) => {
                const color = categoryColor[category] || '#8E8E93';
                return categoryTests.map(test => {
                  const dueDate = parse(test.dueDate, 'dd MMMM yyyy', new Date(), { locale: tr });
                  const overdue = isPast(dueDate) && !isToday(dueDate);
                  const dueToday = isToday(dueDate);
                  const daysLeft = differenceInDays(dueDate, new Date());
                  const topicName = allTopics.find(t => t.id === test.topicId)?.name;

                  return (
                    <Link key={test.id} href={`/education/${test.id}`}
                      className="block active:scale-[0.98] transition-transform">
                      <div className="rounded-[22px] overflow-hidden bg-white dark:bg-[#1C1C1E]"
                        style={{ boxShadow: `0 2px 16px rgba(0,0,0,0.07)` }}>
                        {/* Renk bandı */}
                        <div className="h-1.5" style={{ backgroundColor: color }} />

                        <div className="p-4">
                          {/* Üst: Kategori + Durum */}
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full"
                              style={{ backgroundColor: `${color}15`, color }}>
                              {category}
                            </span>

                            {overdue ? (
                              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
                                style={{ backgroundColor: `${C.RED}15`, color: C.RED }}>
                                <AlertCircle style={{ width: 12, height: 12 }} />
                                Gecikti
                              </div>
                            ) : dueToday ? (
                              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
                                style={{ backgroundColor: `${C.ORANGE}15`, color: C.ORANGE }}>
                                <Timer style={{ width: 12, height: 12 }} />
                                Bugün
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#8E8E93]">
                                <CalendarClock style={{ width: 12, height: 12 }} />
                                {daysLeft}g
                              </div>
                            )}
                          </div>

                          {/* Başlık */}
                          <p className="text-[16px] font-black text-[#1C1C1E] dark:text-white leading-tight mb-2">
                            {test.title}
                          </p>
                          {topicName && (
                            <div className="flex items-center gap-1.5 mb-3">
                              <BookOpen style={{ width: 12, height: 12, color: '#8E8E93' }} />
                              <p className="text-[12px] font-semibold text-[#8E8E93] truncate">{topicName}</p>
                            </div>
                          )}

                          {/* Alt: Meta + Ok */}
                          <div className="flex items-center justify-between pt-3 border-t border-black/[0.04] dark:border-white/[0.06]">
                            <div className="flex items-center gap-2">
                              {test.durationMinutes && (
                                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E]">
                                  <Clock style={{ width: 11, height: 11, color: '#8E8E93' }} />
                                  <span className="text-[11px] font-bold text-[#8E8E93]">{test.durationMinutes}dk</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E]">
                                <CheckCircle2 style={{ width: 11, height: 11, color: '#8E8E93' }} />
                                <span className="text-[11px] font-bold text-[#8E8E93]">{test.questionCount} soru</span>
                              </div>
                            </div>
                            <div className="w-9 h-9 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: `${color}15` }}>
                              <ArrowRight style={{ width: 16, height: 16, color }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                });
              })}
            </div>
          </section>
        )}

        {/* ── KONU ANLATIMI ────────────────────────────────────── */}
        {assignmentsByBook.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${C.PINK}18` }}>
                <BookHeart style={{ width: 14, height: 14, color: C.PINK }} />
              </div>
              <p className="text-[17px] font-black text-[#1C1C1E] dark:text-white">Konu Anlatımı</p>
            </div>

            <div className="space-y-3">
              {assignmentsByBook.map(group => {
                const pct = (group.completed / group.total) * 100;
                const done = group.completed === group.total;
                const open = expandedBooks.has(group.id);

                return (
                  <div key={group.id} className="rounded-[22px] overflow-hidden bg-white dark:bg-[#1C1C1E]"
                    style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                    {/* Kitap başlığı — tıklanabilir */}
                    <button onClick={() => toggleBook(group.id)}
                      className="w-full flex items-center gap-3 p-4 text-left active:bg-black/[0.02] transition-colors">
                      <div className="w-10 h-14 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: done ? `${C.GREEN}15` : `${C.PINK}12` }}>
                        <BookOpen style={{ width: 20, height: 20, color: done ? C.GREEN : C.PINK }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-black text-[#1C1C1E] dark:text-white truncate mb-2">
                          {group.title}
                        </p>
                        {/* İlerleme bar */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, backgroundColor: done ? C.GREEN : C.PINK }} />
                          </div>
                          <span className="text-[11px] font-black shrink-0"
                            style={{ color: done ? C.GREEN : C.PINK }}>
                            {group.completed}/{group.total}
                          </span>
                        </div>
                      </div>
                      <ChevronDown
                        style={{ width: 18, height: 18, color: '#8E8E93',
                          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s' }} />
                    </button>

                    {/* Görev listesi — açılır/kapanır */}
                    {open && (
                      <div className="border-t border-black/[0.04] dark:border-white/[0.06]">
                        {group.assignments.map((a, i) => (
                          <div key={a.id}
                            onClick={() => handleCompleteStudy(a.id, a.status)}
                            className={cn(
                              "flex items-center gap-3 px-4 py-3 active:bg-black/[0.02] transition-colors cursor-pointer",
                              i < group.assignments.length - 1 && "border-b border-black/[0.03] dark:border-white/[0.04]"
                            )}>
                            {/* Checkbox */}
                            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition-all"
                              style={a.status === 'completed'
                                ? { backgroundColor: C.GREEN, borderColor: C.GREEN }
                                : { borderColor: '#D1D1D6' }}>
                              {a.status === 'completed' && <Check style={{ width: 13, height: 13, color: 'white' }} />}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className={cn("text-[14px] font-semibold truncate",
                                a.status === 'completed'
                                  ? "text-[#8E8E93] line-through"
                                  : "text-[#1C1C1E] dark:text-white")}>
                                {a.topic}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] font-semibold text-[#8E8E93]">{a.subject}</span>
                                {a.durationMinutes && a.durationMinutes > 0 && (
                                  <span className="flex items-center gap-0.5 text-[11px] text-[#8E8E93]">
                                    <Clock style={{ width: 10, height: 10 }} />
                                    {a.durationMinutes}dk
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Boş durum */}
        {groupedPendingTests.length === 0 && assignmentsByBook.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-[24px] flex items-center justify-center mb-4"
              style={{ background: `linear-gradient(135deg, ${C.INDIGO}, ${C.BLUE})` }}>
              <Sparkles className="w-9 h-9 text-white" />
            </div>
            <p className="text-[18px] font-black text-[#1C1C1E] dark:text-white mb-1">Her şey tamamdı!</p>
            <p className="text-[14px] font-medium text-[#8E8E93]">Bekleyen ödev veya görev yok.</p>
          </div>
        )}
      </main>
    </div>
  );
}