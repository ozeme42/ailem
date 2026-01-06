
"use client";

import * as React from "react";
import Link from "next/link";
import { 
    PlusCircle, ArrowLeft, BookCopy, ClipboardList, 
    Settings, CheckCircle2, CircleDashed, PieChart, 
    FileText, BookMarked, Library, Ruler, TestTube2, Globe, 
    MessageSquare, Gamepad2, FileJson, Layers, BookHeart, AlertTriangle, Lock, KeyRound 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Test } from "@/lib/data";
import { onTestsUpdate } from "@/lib/dataService";
import { useAuth } from "@/components/auth-provider";
import { getCategoryName } from "@/app/education/page";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// --- ICONS & THEMES ---
const categoryIcons: { [key: string]: React.ElementType } = {
    'Matematik': Ruler,
    'Fen Bilimleri': TestTube2,
    'Türkçe': BookCopy,
    'Sosyal Bilgiler': Globe,
    'İngilizce': MessageSquare,
    'Serbest Etkinlikler': Gamepad2,
    'Diğer': FileText,
    'Genel Deneme Sınavları': ClipboardList,
};

const glassColors = {
    HEADER_BG: "bg-slate-950/80 backdrop-blur-xl border-b border-white/5",
    CARD_BG: "bg-white/[0.03] border border-white/5 hover:bg-white/[0.07] transition-all duration-300",
};

const categoryThemes: { [key: string]: { color: string, bg: string } } = {
    'Matematik': { color: 'text-red-400', bg: 'bg-red-500/10' },
    'Fen Bilimleri': { color: 'text-orange-400', bg: 'bg-orange-500/10' },
    'Türkçe': { color: 'text-amber-400', bg: 'bg-amber-500/10' },
    'Sosyal Bilgiler': { color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    'İngilizce': { color: 'text-blue-400', bg: 'bg-blue-500/10' },
    'Genel Deneme Sınavları': { color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    'Diğer': { color: 'text-slate-400', bg: 'bg-slate-500/10' },
};

export default function EducationManagementPage() {
  const { familyMembers } = useAuth();
  const [tests, setTests] = React.useState<Test[]>([]);
  const { toast } = useToast();

  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  
  React.useEffect(() => {
    const unsubTests = onTestsUpdate(setTests);
    return () => unsubTests();
  }, []);
  
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "159753") {
      setIsAuthenticated(true);
      setError("");
      toast({ title: "Giriş Başarılı", description: "Yönetim paneline hoş geldiniz." });
    } else {
      setError("Hatalı şifre. Lütfen tekrar deneyin.");
    }
  };
  
  // İstatistik Hesaplamaları
  const stats = React.useMemo(() => {
    const total = tests.length;
    const completed = tests.filter(t => t.status === 'Sonuçlandı').length;
    const pending = total - completed;
    
    // Genel Başarı
    const completedTests = tests.filter(t => t.status === 'Sonuçlandı');
    let totalQuestions = 0;
    let totalCorrect = 0;
    completedTests.forEach(t => {
        totalQuestions += (t.correctAnswers || 0) + (t.incorrectAnswers || 0) + (t.emptyAnswers || 0);
        totalCorrect += (t.correctAnswers || 0);
    });
    const successRate = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

    return { total, completed, pending, successRate };
  }, [tests]);

  const testsBySubject = React.useMemo(() => {
    const grouped: { [subject: string]: Test[] } = {};
    tests.filter(test => test.studentId).forEach(test => {
        const subject = getCategoryName(test);
        if (!grouped[subject]) grouped[subject] = [];
        grouped[subject].push(test);
    });
    return grouped;
  }, [tests]);

  if (!isAuthenticated) {
    return (
        <div className="flex h-screen w-screen items-center justify-center bg-slate-900 p-4">
             <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-slate-900 to-purple-900/40 -z-10"></div>
             <Card className="w-full max-w-sm bg-slate-950/50 border-white/10 text-white backdrop-blur-xl shadow-2xl shadow-black/50">
                 <CardHeader className="text-center">
                     <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 border-2 border-indigo-400/50 shadow-lg shadow-indigo-500/30">
                        <Lock className="text-white h-8 w-8" />
                     </div>
                     <CardTitle className="text-2xl font-black">Erişim Korumalı</CardTitle>
                     <CardDescription className="text-slate-400">
                         Bu alanı görüntülemek için lütfen şifreyi girin.
                     </CardDescription>
                 </CardHeader>
                 <CardContent>
                     <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <div className="relative">
                             <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500"/>
                             <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••"
                                className="pl-10 h-12 bg-white/5 border-white/10 focus:border-indigo-400 text-lg tracking-widest text-center"
                                required
                             />
                        </div>
                        {error && (
                            <div className="flex items-center justify-center gap-2 text-sm text-rose-400 font-semibold">
                                <AlertTriangle className="h-4 w-4" /> {error}
                            </div>
                        )}
                        <Button type="submit" className="w-full h-12 text-base font-bold bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20">
                            Giriş Yap
                        </Button>
                     </form>
                 </CardContent>
             </Card>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden flex flex-col">
        {/* BACKGROUND */}
        <div className="fixed inset-0 bg-slate-950 -z-50" />
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[150px]" />
            <div className="absolute bottom-[10%] right-[-10%] w-[500px] h-[500px] bg-emerald-900/10 rounded-full blur-[150px]" />
        </div>

        {/* HEADER */}
        <div className={cn("sticky top-0 z-40 w-full", glassColors.HEADER_BG)}>
            <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button onClick={() => window.history.back()} variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-white/10 rounded-full">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="h-6 w-px bg-white/10 mx-1" />
                    <h1 className="text-lg font-bold text-slate-100 tracking-tight">Eğitim Yönetimi</h1>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/education/management/questions">
                        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 rounded-full px-4 h-8 text-xs font-medium">
                            <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Ödev Ata
                        </Button>
                    </Link>
                </div>
            </div>
        </div>

        <div className="flex-1 max-w-6xl mx-auto w-full p-4 space-y-6 relative z-10">
            
            {/* 1. ÜST ÖZET KARTLARI (KPI) */}
            <div className="grid grid-cols-3 gap-3 md:gap-4">
                
                {/* TOPLAM KARTI (Tıklanabilir) */}
                <Link href="/education/all-tests" className="block group">
                    <div className={cn("p-4 rounded-2xl flex flex-col justify-between h-24 relative overflow-hidden cursor-pointer", glassColors.CARD_BG)}>
                        <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><Layers className="w-16 h-16" /></div>
                        <span className="text-slate-400 text-xs font-medium uppercase tracking-wider flex items-center gap-2 group-hover:text-slate-200 transition-colors">
                            <Library className="w-3.5 h-3.5"/> Toplam
                        </span>
                        <div className="text-2xl font-black text-white tracking-tighter group-hover:scale-105 transition-transform origin-left">{stats.total}</div>
                    </div>
                </Link>

                {/* BEKLEYEN KARTI (Tıklanabilir) */}
                <Link href="/education/all-tests" className="block group">
                    <div className={cn("p-4 rounded-2xl flex flex-col justify-between h-24 relative overflow-hidden cursor-pointer border-amber-500/10 hover:border-amber-500/30", glassColors.CARD_BG)}>
                        <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><CircleDashed className="w-16 h-16 text-amber-400" /></div>
                        <span className="text-amber-400/80 text-xs font-medium uppercase tracking-wider flex items-center gap-2 group-hover:text-amber-400 transition-colors">
                            <CircleDashed className="w-3.5 h-3.5"/> Bekleyen
                        </span>
                        <div className="text-2xl font-black text-amber-100 tracking-tighter group-hover:scale-105 transition-transform origin-left">{stats.pending}</div>
                    </div>
                </Link>

                {/* BAŞARI KARTI (Statik) */}
                <div className={cn("p-4 rounded-2xl flex flex-col justify-between h-24 relative overflow-hidden group", glassColors.CARD_BG)}>
                    <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><PieChart className="w-16 h-16 text-emerald-400" /></div>
                    <span className="text-emerald-400/80 text-xs font-medium uppercase tracking-wider flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5"/> Başarı</span>
                    <div className="text-2xl font-black text-emerald-100 tracking-tighter">%{stats.successRate.toFixed(0)}</div>
                </div>
            </div>

            {/* 2. ARAÇLAR (Tek Satır - Kompakt Grid) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <QuickActionCard href="/education/all-tests" icon={Library} label="Tüm Ödevler" color="indigo" />
                <QuickActionCard href="/education/management/questions" icon={PlusCircle} label="Soru Bankası" color="emerald" />
                <QuickActionCard href="/education/management/practice-exams" icon={ClipboardList} label="Denemeler" color="amber" />
                <QuickActionCard href="/education/books" icon={BookMarked} label="Kitap Takibi" color="blue" />
                <QuickActionCard href="/education/management/study-plans" icon={BookHeart} label="Yol Haritaları" color="rose" />
                <QuickActionCard href="/education/management/json-tests" icon={FileJson} label="Yazılılar" color="purple" />
            </div>

            {/* 3. DERS LİSTESİ */}
            <div>
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Dersler ve İlerleme</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(testsBySubject).map(([subject, subjectTests]) => {
                        const total = subjectTests.length;
                        const completedTests = subjectTests.filter(t => t.status === 'Sonuçlandı');
                        const pending = total - completedTests.length;
                        
                        // Başarı Hesabı
                        const totalQ = completedTests.reduce((s, t) => s + (t.questionCount || 0), 0);
                        const totalC = completedTests.reduce((s, t) => s + (t.correctAnswers || 0), 0);
                        const rate = totalQ > 0 ? (totalC / totalQ) * 100 : 0;

                        const Icon = categoryIcons[subject] || FileText;
                        const theme = categoryThemes[subject] || categoryThemes['Diğer'];

                        return (
                            <Link key={subject} href={`/education/category/${encodeURIComponent(subject)}`} className="block group">
                                <div className={cn("p-4 rounded-2xl flex items-center gap-4 transition-all h-full bg-white/[0.03] border border-white/5 hover:bg-white/[0.07]")}>
                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105", theme.bg, theme.color)}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-1.5">
                                            <h3 className="font-bold text-sm text-slate-200 truncate">{subject}</h3>
                                            {pending > 0 && <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-medium">{pending} Bekleyen</span>}
                                        </div>
                                        
                                        <div className="space-y-1">
                                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                                <div 
                                                    className={cn("h-full rounded-full opacity-80", theme.bg.replace('/10',''))} 
                                                    style={{ width: `${rate}%` }} 
                                                />
                                            </div>
                                            <div className="flex justify-between text-[10px] text-slate-500">
                                                <span>%{rate.toFixed(0)} Başarı</span>
                                                <span>{completedTests.length}/{total}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    </div>
  );
}

// Yardımcı Bileşen: Küçük Araç Kartı
function QuickActionCard({ href, icon: Icon, label, color }: { href: string, icon: any, label: string, color: string }) {
    const colorClasses: {[key:string]: string} = {
        emerald: "group-hover:text-emerald-400 group-hover:bg-emerald-500/10 text-emerald-500/50 bg-emerald-500/10",
        amber: "group-hover:text-amber-400 group-hover:bg-amber-500/10 text-amber-500/50 bg-amber-500/10",
        rose: "group-hover:text-rose-400 group-hover:bg-rose-500/10 text-rose-500/50 bg-rose-500/10",
        blue: "group-hover:text-blue-400 group-hover:bg-blue-500/10 text-blue-500/50 bg-blue-500/10",
        purple: "group-hover:text-purple-400 group-hover:bg-purple-500/10 text-purple-500/50 bg-purple-500/10",
        indigo: "group-hover:text-indigo-400 group-hover:bg-indigo-500/10 text-indigo-500/50 bg-indigo-500/10",
    };

    return (
        <Link href={href} className="block group">
            <div className="h-24 flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] transition-all hover:bg-white/[0.05] cursor-pointer">
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform", colorClasses[color])}>
                    <Icon className="w-4 h-4 transition-colors" />
                </div>
                <span className="text-xs font-medium text-slate-400 group-hover:text-slate-200 transition-colors">{label}</span>
            </div>
        </Link>
    )
}
