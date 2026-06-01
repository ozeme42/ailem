
"use client";

import * as React from "react";
import Link from "next/link";
import {
  PlusCircle, ArrowLeft, BookCopy, ClipboardList,
  Settings, CheckCircle2, CircleDashed, PieChart,
  FileText, BookMarked, Library, Ruler, TestTube2, Globe,
  MessageSquare, Gamepad2, FileJson, Layers, BookHeart, AlertTriangle, Lock, KeyRound, ChevronRight, BookOpen, ScrollText, Code, ListTree
} from "lucide-react";
import { Test } from "@/lib/data";
import { onTestsUpdate } from "@/lib/dataService";
import { useAuth } from "@/components/auth-provider";
import { getCategoryName } from "@/app/education/page";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

// ─── TEMA VE RENK SİSTEMİ (Tailwind Uyumlu) ────────────────────────────────────
type ThemeColors = { base: string; softBg: string; text: string; border: string; gradient: string };

const categoryTheme: Record<string, ThemeColors> = {
  'Matematik':               { base: 'bg-rose-500', softBg: 'bg-rose-50 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-100 dark:border-rose-800', gradient: 'from-rose-400 to-rose-500' },
  'Fen Bilimleri':           { base: 'bg-orange-500', softBg: 'bg-orange-50 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-100 dark:border-orange-800', gradient: 'from-orange-400 to-orange-500' },
  'Türkçe':                  { base: 'bg-amber-500', softBg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-100 dark:border-amber-800', gradient: 'from-amber-400 to-amber-500' },
  'Sosyal Bilgiler':         { base: 'bg-cyan-500', softBg: 'bg-cyan-50 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-100 dark:border-cyan-800', gradient: 'from-cyan-400 to-cyan-500' },
  'İngilizce':               { base: 'bg-blue-500', softBg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-100 dark:border-blue-800', gradient: 'from-blue-400 to-blue-500' },
  'Genel Deneme Sınavları':  { base: 'bg-purple-500', softBg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-100 dark:border-purple-800', gradient: 'from-purple-400 to-purple-500' },
  'Serbest Etkinlikler':     { base: 'bg-emerald-500', softBg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-800', gradient: 'from-emerald-400 to-emerald-500' },
  'Diğer':                   { base: 'bg-slate-500', softBg: 'bg-slate-50 dark:bg-slate-800/50', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-100 dark:border-slate-700', gradient: 'from-slate-400 to-slate-500' },
};

const toolTheme: Record<string, ThemeColors> = {
  indigo: { base: 'bg-indigo-500', softBg: 'bg-indigo-50 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-100 dark:border-indigo-800', gradient: 'from-indigo-400 to-indigo-500' },
  emerald: { base: 'bg-emerald-500', softBg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-800', gradient: 'from-emerald-400 to-emerald-500' },
  orange: { base: 'bg-orange-500', softBg: 'bg-orange-50 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-100 dark:border-orange-800', gradient: 'from-orange-400 to-orange-500' },
  blue: { base: 'bg-blue-500', softBg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-100 dark:border-blue-800', gradient: 'from-blue-400 to-blue-500' },
  pink: { base: 'bg-pink-500', softBg: 'bg-pink-50 dark:bg-pink-900/30', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-100 dark:border-pink-800', gradient: 'from-pink-400 to-pink-500' },
  purple: { base: 'bg-purple-500', softBg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-100 dark:border-purple-800', gradient: 'from-purple-400 to-purple-500' },
};

const categoryIcons: Record<string, React.ElementType> = {
  'Matematik':              Ruler,
  'Fen Bilimleri':          TestTube2,
  'Türkçe':                 BookCopy,
  'Sosyal Bilgiler':        Globe,
  'İngilizce':              MessageSquare,
  'Serbest Etkinlikler':    Gamepad2,
  'Diğer':                  FileText,
  'Genel Deneme Sınavları': ClipboardList,
};

// ─── YARDIMCI BİLEŞENLER ────────────────────────────────────────────────────

function KpiCard({ label, value, theme, icon, href }: { label: string; value: string | number; theme: ThemeColors; icon: React.ReactNode; href?: string; }) {
  const inner = (
    <div className="rounded-[1.5rem] p-4 flex flex-col justify-between h-[100px] overflow-hidden relative active:scale-95 transition-transform bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm">
      <div className={cn("absolute -right-4 -top-4 w-16 h-16 rounded-full opacity-20 blur-xl", theme.base)} />
      <div className="flex items-center gap-1.5 relative z-10">
        <span className={theme.text}>{icon}</span>
        <p className={cn("text-[10px] md:text-xs font-bold uppercase tracking-wider", theme.text)}>{label}</p>
      </div>
      <p className="text-3xl font-black leading-none text-slate-900 dark:text-white relative z-10">{value}</p>
    </div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}

function ToolCard({ href, icon: Icon, label, theme }: { href: string; icon: any; label: string; theme: ThemeColors }) {
  return (
    <Link href={href} className="block active:scale-95 transition-transform">
      <div className="rounded-[1.5rem] flex flex-col items-center justify-center py-5 px-2 gap-3 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-md h-full min-h-[110px]">
        <div className={cn("w-12 h-12 rounded-[1rem] flex items-center justify-center", theme.softBg, theme.text)}>
          <Icon className="w-6 h-6" />
        </div>
        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 text-center leading-tight">{label}</p>
      </div>
    </Link>
  );
}

// ─── ANA SAYFA ───────────────────────────────────────────────────────────────
export default function EducationManagementPage() {
  const { familyMembers } = useAuth();
  const [tests, setTests] = React.useState<Test[]>([]);
  const { toast } = useToast();

  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    const unsub = onTestsUpdate(setTests);
    return () => unsub();
  }, []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const auth = getAuth();
    if (!auth.currentUser?.email) {
      setError("Kullanıcı oturumu bulunamadı.");
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, auth.currentUser.email, password);
      setIsAuthenticated(true);
      setError("");
      toast({ title: "Giriş Başarılı ✓", description: "Yönetim paneline hoş geldiniz.", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800" });
    } catch (err) {
      setError("Hatalı şifre. Lütfen tekrar deneyin.");
    }
  };

  const stats = React.useMemo(() => {
    const total = tests.length;
    const completed = tests.filter(t => t.status === 'Sonuçlandı').length;
    const pending = total - completed;
    const completedTests = tests.filter(t => t.status === 'Sonuçlandı');
    let totalQ = 0, totalC = 0;
    completedTests.forEach(t => {
      totalQ += (t.correctAnswers || 0) + (t.incorrectAnswers || 0) + (t.emptyAnswers || 0);
      totalC += t.correctAnswers || 0;
    });
    return { total, completed, pending, successRate: totalQ > 0 ? (totalC / totalQ) * 100 : 0 };
  }, [tests]);

  const testsBySubject = React.useMemo(() => {
    const grouped: Record<string, Test[]> = {};
    tests.filter(t => t.studentId).forEach(t => {
      const s = getCategoryName(t);
      if (!grouped[s]) grouped[s] = [];
      grouped[s].push(t);
    });
    return grouped;
  }, [tests]);

  // ── ŞİFRE EKRANI ────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center px-6 transition-colors duration-300">
        <div className="h-[env(safe-area-inset-top,0px)]" />

        {/* İkon */}
        <div className="w-20 h-20 rounded-[1.5rem] flex items-center justify-center mb-6 bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
          <Lock className="w-8 h-8 text-white" />
        </div>

        <p className="text-2xl font-black text-slate-900 dark:text-white mb-2 text-center tracking-tight">Erişim Korumalı</p>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 text-center mb-8">
          Bu alanı görüntülemek için yönetici şifresini girin.
        </p>

        <form onSubmit={handlePasswordSubmit} className="w-full max-w-[320px] space-y-4">
          {/* Şifre input */}
          <div className="relative group">
            <KeyRound className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-indigo-500" />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••"
              required
              className="w-full h-14 rounded-2xl pl-12 pr-4 text-center text-xl tracking-[0.3em] font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 shadow-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:tracking-normal placeholder:font-medium"
            />
          </div>

          {error && (
            <div className="flex items-center justify-center gap-2 py-2 text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 rounded-xl border border-rose-100 dark:border-rose-900/50">
              <AlertTriangle className="w-4 h-4" />
              <p className="text-xs font-semibold">{error}</p>
            </div>
          )}

          <button
            type="submit"
            className="w-full h-14 rounded-2xl text-white text-base font-black active:scale-95 transition-transform bg-gradient-to-r from-indigo-600 to-purple-600 shadow-md hover:shadow-lg"
          >
            Giriş Yap
          </button>
        </form>
      </div>
    );
  }

  // ── YÖNETİM PANELİ ──────────────────────────────────────────────────────
  const pendingEvaluations = tests.filter(t => t.status === 'Değerlendirme Bekliyor');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans pb-28 transition-colors duration-300">
      <div className="h-[env(safe-area-inset-top,0px)]" />

      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 supports-[backdrop-filter]:bg-white/60">
        <div className="flex items-center justify-between px-3 md:px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.back()}
              className="w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-transform bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
              <p className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Yönetim Paneli</p>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">Sistem Yönetimi & Analiz</p>
            </div>
          </div>

          <Link href="/education/management/questions">
            <button className="flex items-center gap-2 h-11 px-5 md:px-6 rounded-full text-white text-sm font-bold active:scale-95 transition-transform bg-gradient-to-r from-indigo-500 to-blue-600 shadow-md hover:shadow-lg">
              <PlusCircle className="w-5 h-5" />
              <span className="hidden sm:inline">Hızlı Ödev Ata</span>
              <span className="sm:hidden">Ata</span>
            </button>
          </Link>
        </div>
      </header>

      <main className="px-4 md:px-6 pt-6 space-y-10 md:max-w-6xl md:mx-auto">

        {/* DEĞERLENDİRME BEKLEYENLER */}
        {pendingEvaluations.length > 0 && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-2 mb-4 px-1">
               <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="w-4 h-4" />
               </div>
               <p className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">İşlem Bekleyen Ödevler</p>
               <span className="ml-2 px-2 py-0.5 rounded-md bg-rose-500 text-white text-[10px] font-black">{pendingEvaluations.length}</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingEvaluations.map(test => {
                const student = familyMembers.find(m => m.id === test.studentId);
                const subjTheme = categoryTheme[test.subject || 'Diğer'] || categoryTheme['Diğer'];
                
                return (
                  <div key={test.id} className="group p-5 rounded-[2rem] bg-white dark:bg-slate-900 border-2 border-rose-100 dark:border-rose-900/30 shadow-md hover:shadow-xl hover:border-rose-300 dark:hover:border-rose-800 transition-all flex flex-col justify-between gap-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={cn("px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-wider", subjTheme.softBg, subjTheme.text, subjTheme.border)}>
                            {test.subject || getCategoryName(test)}
                          </span>
                          {student && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                               <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: student.color}}/>
                               {student.name}
                            </div>
                          )}
                        </div>
                        <h3 className="text-base font-black text-slate-800 dark:text-slate-100 line-clamp-2">{test.title}</h3>
                      </div>
                    </div>
                    
                    <Link href={`/education/${test.id}?mode=evaluate`}>
                      <button className="w-full h-12 rounded-xl flex items-center justify-center gap-2 font-black text-sm bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white transition-colors">
                        Değerlendir <ChevronRight className="w-4 h-4" />
                      </button>
                    </Link>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* KPI KARTLARI */}
        <section>
          <div className="grid grid-cols-3 gap-3 md:gap-5">
            <KpiCard label="Toplam" value={stats.total} theme={toolTheme.blue} icon={<Library className="w-5 h-5" />} href="/education/all-tests" />
            <KpiCard label="Bekleyen" value={stats.pending} theme={toolTheme.orange} icon={<CircleDashed className="w-5 h-5" />} href="/education/all-tests" />
            <KpiCard label="Başarı Oranı" value={`%${stats.successRate.toFixed(0)}`} theme={toolTheme.emerald} icon={<CheckCircle2 className="w-5 h-5" />} />
          </div>
        </section>

        {/* ARAÇLAR */}
        <section className="space-y-8">
          
          {/* GRUP 1: İçerik Yükleme & Ödev Oluşturma */}
          <div>
            <div className="flex items-center gap-2 mb-4 px-1">
               <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  <Layers className="w-4 h-4" />
               </div>
               <p className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">İçerik & Ödev Ekleme</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
              <ToolCard href="/education/management/questions"        icon={PlusCircle}   label="Soru Bankası"  theme={toolTheme.emerald}  />
              <ToolCard href="/education/management/practice-exams"   icon={ClipboardList}label="Denemeler"     theme={toolTheme.orange} />
              <ToolCard href="/education/management/json-tests"       icon={FileJson}     label="Yazılılar"     theme={toolTheme.purple} />
              <ToolCard href="/education/management/html-tests"       icon={Code}         label="HTML Test"     theme={toolTheme.blue}   />
              <ToolCard href="/education/management/summaries"        icon={ScrollText}   label="Özetler"       theme={toolTheme.emerald} />
            </div>
          </div>

          {/* GRUP 2: Takip & Değerlendirme */}
          <div>
            <div className="flex items-center gap-2 mb-4 px-1">
               <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  <Settings className="w-4 h-4" />
               </div>
               <p className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Takip & Yönetim</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
              <ToolCard href="/education/results"                    icon={ListTree}     label="Sonuçlar"      theme={toolTheme.indigo} />
              <ToolCard href="/education/all-tests"                   icon={Library}      label="Tüm Ödevler"   theme={toolTheme.indigo} />
              <ToolCard href="/education/books"                       icon={BookMarked}   label="Kitap Takibi"  theme={toolTheme.blue}   />
              <ToolCard href="/education/management/subjects"         icon={BookOpen}     label="Ders & Konu"   theme={toolTheme.purple} />
              <ToolCard href="/education/management/study-plans"      icon={BookHeart}    label="Yol Haritaları"theme={toolTheme.pink}   />
            </div>
          </div>
        </section>

        {/* DERS LİSTESİ */}
        <section>
          <div className="flex items-center gap-2 mb-4 px-1">
             <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                <PieChart className="w-4 h-4" />
             </div>
             <p className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Ders İlerlemeleri</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(testsBySubject).map(([subject, subjectTests]) => {
              const total = subjectTests.length;
              const completed = subjectTests.filter(t => t.status === 'Sonuçlandı');
              const pending = total - completed.length;
              const totalQ = completed.reduce((s, t) => s + (t.questionCount || 0), 0);
              const totalC = completed.reduce((s, t) => s + (t.correctAnswers || 0), 0);
              const rate = totalQ > 0 ? (totalC / totalQ) * 100 : 0;
              const theme = categoryTheme[subject] || categoryTheme['Diğer'];
              const Icon = categoryIcons[subject] || FileText;

              return (
                <Link key={subject} href={`/education/category/${encodeURIComponent(subject)}`}
                  className="block active:scale-[0.98] transition-transform">
                  <div className="rounded-[2rem] p-5 flex items-center gap-5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all relative overflow-hidden group">
                    <div className={cn("absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b", theme.gradient)} />

                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ml-1", theme.softBg, theme.text)}>
                      <Icon className="w-7 h-7" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-lg font-black text-slate-900 dark:text-white truncate">{subject}</p>
                        {pending > 0 && (
                          <span className={cn("text-[10px] font-black px-2.5 py-1 rounded-lg shrink-0 ml-2 border", theme.softBg, theme.text, theme.border)}>
                            {pending} Bekleyen
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all duration-500", theme.base)}
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <span className={cn("text-xs font-black shrink-0 w-10 text-right", theme.text)}>
                          %{rate.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

