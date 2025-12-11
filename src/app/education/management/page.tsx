"use client";

import * as React from "react";
import Link from "next/link";
// ArrowRight ikonu buraya eklendi
import { PlusCircle, ArrowLeft, ArrowRight, BookCopy, ClipboardList, Settings, BarChart3, CheckCircle, X, MinusCircle, FileText, BookMarked, Library, MoreVertical, Trash2, Edit, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

import { Test, FamilyMember } from "@/lib/data";
import {
  onTestsUpdate,
  deleteTest,
  updateTest
} from "@/lib/dataService";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-provider";
import { getCategoryName } from "@/app/education/page";

import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

const categoryIcons: { [key: string]: React.ElementType } = {
    'Matematik': FileText,
    'Fen Bilimleri': FileText,
    'Türkçe': FileText,
    'Sosyal Bilgiler': FileText,
    'İngilizce': FileText,
    'Diğer': FileText,
    'Genel Deneme Sınavları': ClipboardList,
};

// --- DESIGN SYSTEM: Glassmorphism Colors ---
const glassColors = {
    HEADER_BG: "bg-slate-950/70 backdrop-blur-lg border-b border-white/5",
    CARD_BG: "bg-white/5 border border-white/10 shadow-lg backdrop-blur-md",
    ICON_BOX: "bg-gradient-to-br p-2.5 rounded-xl shadow-lg",
    BUTTON_GLASS: "bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow-sm",
};

// Renk Temaları
const categoryThemes: { [key: string]: { bg: string, icon: string, title: string, badge: string } } = {
    'Matematik': { bg: 'hover:shadow-red-500/20 hover:border-red-500/40', icon: 'bg-red-500/20 text-red-400', title: 'text-red-100', badge: 'bg-red-500/20 text-red-300' },
    'Fen Bilimleri': { bg: 'hover:shadow-orange-500/20 hover:border-orange-500/40', icon: 'bg-orange-500/20 text-orange-400', title: 'text-orange-100', badge: 'bg-orange-500/20 text-orange-300' },
    'Türkçe': { bg: 'hover:shadow-amber-500/20 hover:border-amber-500/40', icon: 'bg-amber-500/20 text-amber-400', title: 'text-amber-100', badge: 'bg-amber-500/20 text-amber-300' },
    'Sosyal Bilgiler': { bg: 'hover:shadow-cyan-500/20 hover:border-cyan-500/40', icon: 'bg-cyan-500/20 text-cyan-400', title: 'text-cyan-100', badge: 'bg-cyan-500/20 text-cyan-300' },
    'İngilizce': { bg: 'hover:shadow-blue-500/20 hover:border-blue-500/40', icon: 'bg-blue-500/20 text-blue-400', title: 'text-blue-100', badge: 'bg-blue-500/20 text-blue-300' },
    'Genel Deneme Sınavları': { bg: 'hover:shadow-yellow-500/20 hover:border-yellow-500/40', icon: 'bg-yellow-500/20 text-yellow-400', title: 'text-yellow-100', badge: 'bg-yellow-500/20 text-yellow-300' },
    'Diğer': { bg: 'hover:shadow-slate-500/20 hover:border-slate-500/40', icon: 'bg-slate-500/20 text-slate-400', title: 'text-slate-100', badge: 'bg-slate-500/20 text-slate-300' },
};

export default function EducationManagementPage() {
  const { toast } = useToast();
  const { familyMembers, familyId } = useAuth();
  
  const [tests, setTests] = React.useState<Test[]>([]);
  
  const studentMembers = React.useMemo(() => 
    familyMembers.filter(m => m.role.includes('Çocuk')), 
  [familyMembers]);

  React.useEffect(() => {
    const unsubTests = onTestsUpdate(setTests);
    return () => unsubTests();
  }, []);
  
  const testsBySubject = React.useMemo(() => {
    const grouped: { [subject: string]: Test[] } = {};
    tests.filter(test => test.studentId).forEach(test => {
        const subject = getCategoryName(test);
        if (!grouped[subject]) {
            grouped[subject] = [];
        }
        grouped[subject].push(test);
    });
    return grouped;
  }, [tests]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden flex flex-col">
        
        {/* FIXED BACKGROUND */}
        <div className="fixed inset-0 bg-slate-950 -z-50" />
        
        {/* AMBIENT BACKGROUND */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[20%] right-[-5%] w-[400px] h-[400px] bg-emerald-900/20 rounded-full blur-[120px]" />
        </div>

        {/* HEADER */}
        <div className={cn("sticky top-0 z-40 w-full transition-all duration-300", glassColors.HEADER_BG)}>
            <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button 
                        onClick={() => window.history.back()} 
                        variant="ghost" 
                        size="icon"
                        className="rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors -ml-2"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div className={cn("from-emerald-500 to-teal-600", glassColors.ICON_BOX)}>
                         <Settings className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-slate-100 leading-none">
                            İçerik Yönetimi
                        </h1>
                        <p className="text-xs font-medium text-slate-400 mt-0.5">Eğitim Materyalleri</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pr-2">
                     <Link href="/education/management/questions">
                        <Button size="sm" className={cn("rounded-xl h-9 text-xs font-semibold whitespace-nowrap", glassColors.BUTTON_GLASS)}>
                            <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Ödev Ata
                        </Button>
                    </Link>
                    <Link href="/education/management/practice-exams" className="hidden md:inline-flex">
                        <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/10 rounded-xl h-9 text-xs">
                             Denemeler
                        </Button>
                    </Link>
                </div>
            </div>
        </div>

        <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 relative z-10 flex flex-col min-h-0">
            
            {/* Quick Actions Grid (Mobile Friendly) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                 <Link href="/education/management/questions" className="block group">
                    <div className={cn("flex flex-col items-center justify-center p-4 rounded-2xl transition-all border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/10 bg-white/5 h-full")}>
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            <PlusCircle className="h-5 w-5 text-emerald-400" />
                        </div>
                        <span className="text-sm font-semibold text-slate-300 group-hover:text-emerald-300">Soru Bankası</span>
                    </div>
                 </Link>
                 
                 <Link href="/education/management/practice-exams" className="block group">
                    <div className={cn("flex flex-col items-center justify-center p-4 rounded-2xl transition-all border border-white/5 hover:border-amber-500/30 hover:bg-amber-500/10 bg-white/5 h-full")}>
                        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            <ClipboardList className="h-5 w-5 text-amber-400" />
                        </div>
                        <span className="text-sm font-semibold text-slate-300 group-hover:text-amber-300">Denemeler</span>
                    </div>
                 </Link>
                 
                 <Link href="/education/management/study-plans" className="block group">
                    <div className={cn("flex flex-col items-center justify-center p-4 rounded-2xl transition-all border border-white/5 hover:border-pink-500/30 hover:bg-pink-500/10 bg-white/5 h-full")}>
                         <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            <BookOpen className="h-5 w-5 text-pink-400" />
                        </div>
                        <span className="text-sm font-semibold text-slate-300 group-hover:text-pink-300">Konu Anlatımı</span>
                    </div>
                 </Link>
                 
                 <Link href="/education/books" className="block group">
                    <div className={cn("flex flex-col items-center justify-center p-4 rounded-2xl transition-all border border-white/5 hover:border-blue-500/30 hover:bg-blue-500/10 bg-white/5 h-full")}>
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            <BookMarked className="h-5 w-5 text-blue-400" />
                        </div>
                        <span className="text-sm font-semibold text-slate-300 group-hover:text-blue-300">Kitap Takibi</span>
                    </div>
                 </Link>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* All Tests Card */}
                <Link href="/education/all-tests" className="block h-full group md:col-span-2 lg:col-span-1">
                    <div className="relative overflow-hidden rounded-3xl p-6 h-full flex flex-col justify-between shadow-lg transition-all group-hover:-translate-y-1 bg-gradient-to-br from-indigo-600 to-purple-700">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Library className="w-32 h-32 text-white" />
                        </div>
                        
                        <div className="relative z-10">
                            <div className="p-3 bg-white/20 rounded-2xl w-fit backdrop-blur-md mb-4">
                                <Library className="h-6 w-6 text-white" />
                            </div>
                            <h3 className="text-2xl font-black text-white mb-2">Tüm Ödevler</h3>
                            <p className="text-indigo-100 text-sm font-medium leading-relaxed max-w-[200px]">
                                Atanmış tüm testleri, denemeleri ve ödevleri tek listede görüntüleyin.
                            </p>
                        </div>
                        
                        <div className="relative z-10 mt-6 pt-6 border-t border-white/20 flex items-center justify-between text-white font-bold group-hover:translate-x-1 transition-transform">
                            <span>Listeye Git</span>
                            <ArrowRight className="h-5 w-5" />
                        </div>
                    </div>
                </Link>

                {/* Subject Cards */}
                {Object.entries(testsBySubject).map(([subject, subjectTests]) => {
                    const total = subjectTests.length;
                    const completedTests = subjectTests.filter(t => t.status === 'Sonuçlandı');
                    const completed = completedTests.length;
                    const pending = total - completed;
                    const Icon = categoryIcons[subject] || FileText;
                    
                    const theme = categoryThemes[subject] || categoryThemes['Diğer'];
                    
                    // Stats
                    const totalCorrect = completedTests.reduce((sum, test) => sum + (test.correctAnswers || 0), 0);
                    const totalIncorrect = completedTests.reduce((sum, test) => sum + (test.incorrectAnswers || 0), 0);
                    const totalQuestions = completedTests.reduce((sum, test) => sum + (test.questionCount || 0), 0);
                    const successRate = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

                    return (
                        <div key={subject} className={cn("flex flex-col rounded-3xl p-5 border border-white/5 transition-all bg-white/5 backdrop-blur-md group", theme.bg)}>
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={cn("p-2.5 rounded-xl", theme.icon)}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className={cn("text-lg font-bold leading-none", theme.title)}>{subject}</h3>
                                        <p className="text-xs text-slate-500 mt-1">{total} Toplam</p>
                                    </div>
                                </div>
                                {pending > 0 && (
                                     <Badge variant="outline" className={cn("border-0 font-bold", theme.badge)}>{pending} Bekleyen</Badge>
                                )}
                            </div>

                            <div className="space-y-3 mt-auto">
                                <div className="flex items-center justify-between text-xs font-medium text-slate-400 bg-black/20 p-2 rounded-lg">
                                    <div className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-emerald-500"/> {completed} Çözüldü</div>
                                    <div className="h-3 w-px bg-white/10"></div>
                                    <div className="flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5 text-indigo-500"/> %{successRate.toFixed(0)} Başarı</div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                     <Link href={`/education/category/${encodeURIComponent(subject)}`} className="w-full">
                                        <Button variant="ghost" size="sm" className="w-full text-slate-400 hover:text-white hover:bg-white/10 rounded-lg text-xs h-8">
                                            Detaylar
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    </div>
  );
}