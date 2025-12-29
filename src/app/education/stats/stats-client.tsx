
"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Sigma, Check, X, Percent, ArrowUpDown, Search, Target, TrendingUp, AlertCircle, Award } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell, LabelList, PieChart, Pie } from "recharts";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useAuth } from "@/components/auth-provider";
import { onTestsUpdate, onBankQuestionsUpdate, onPracticeExamsUpdate } from "@/lib/dataService";
import { Test, BankQuestion, PracticeExam, Topic } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// --- DESIGN SYSTEM: Glassmorphism Colors ---
const glassColors = {
    HEADER_BG: "bg-slate-950/70 backdrop-blur-lg border-b border-white/5",
    CARD_BG: "bg-white/5 border border-white/10 shadow-lg backdrop-blur-md",
    ICON_BOX: "bg-gradient-to-br p-2.5 rounded-xl shadow-lg",
    BUTTON_GLASS: "bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow-sm",
    INPUT_BG: "bg-slate-900/50 border-white/10 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500/50",
    TABLE_HEADER: "bg-white/5 text-slate-300",
    TABLE_ROW_HOVER: "hover:bg-white/5 transition-colors",
};

type SubjectStats = {
  name: string;
  total: number;
  correct: number;
  incorrect: number;
  empty: number;
  successRate: number;
};

type SortKey = keyof Test | null;

export default function StatsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const studentId = searchParams.get('studentId');

  const { familyMembers } = useAuth();
  const [tests, setTests] = React.useState<Test[]>([]);
  const [bankQuestions, setBankQuestions] = React.useState<BankQuestion[]>([]);
  const [practiceExams, setPracticeExams] = React.useState<PracticeExam[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [sortKey, setSortKey] = React.useState<SortKey>('assignedDate'); // Default sort by date
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');
  const [selectedSubject, setSelectedSubject] = React.useState<string | null>(null);

  const student = React.useMemo(() => familyMembers.find(m => m.id === studentId), [familyMembers, studentId]);

  React.useEffect(() => {
    if (!studentId) {
      setLoading(false);
      return;
    };
    
    const unsubTests = onTestsUpdate(allTests => {
      setTests(allTests.filter(t => t.studentId === studentId && t.status === 'Sonuçlandı'));
      setLoading(false);
    });
    const unsubBanks = onBankQuestionsUpdate(setBankQuestions);
    const unsubExams = onPracticeExamsUpdate(setPracticeExams);

    return () => {
      unsubTests();
      unsubBanks();
      unsubExams();
    };
  }, [studentId]);

  const stats = React.useMemo(() => {
    const totalQuestions = tests.reduce((sum, test) => sum + (test.questionCount || 0), 0);
    const totalCorrect = tests.reduce((sum, test) => sum + (test.correctAnswers || 0), 0);
    const totalIncorrect = tests.reduce((sum, test) => sum + (test.incorrectAnswers || 0), 0);
    const totalEmpty = tests.reduce((sum, test) => sum + (test.emptyAnswers || 0), 0);
    const successRate = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
    
    const subjectStatsMap = new Map<string, { total: number; correct: number; incorrect: number; empty: number }>();

    tests.forEach(test => {
      if (test.sourceType === 'exam' && test.sourceId) {
        const exam = practiceExams.find(e => e.id === test.sourceId);
        if (exam) {
           const testSuccessRate = test.questionCount > 0 ? (test.correctAnswers || 0) / test.questionCount : 0;
           exam.subjects.forEach(subject => {
             const current = subjectStatsMap.get(subject.name) || { total: 0, correct: 0, incorrect: 0, empty: 0 };
             const qCount = subject.questionCount;
             const correctCount = Math.round(qCount * testSuccessRate);
             current.total += qCount;
             current.correct += correctCount;
             current.incorrect += qCount - correctCount;
             subjectStatsMap.set(subject.name, current);
           });
        }
      } else {
        const subject = test.subject;
        const current = subjectStatsMap.get(subject) || { total: 0, correct: 0, incorrect: 0, empty: 0 };
        current.total += test.questionCount || 0;
        current.correct += test.correctAnswers || 0;
        current.incorrect += test.incorrectAnswers || 0;
        current.empty += test.emptyAnswers || 0;
        subjectStatsMap.set(subject, current);
      }
    });

    const subjectStats: SubjectStats[] = Array.from(subjectStatsMap.entries()).map(([name, data]) => ({
      name,
      ...data,
      successRate: data.total > 0 ? (data.correct / data.total) * 100 : 0
    })).sort((a,b) => b.successRate - a.successRate);
    
    // Topic Analysis Logic (Simplified for this view)
    const topicStatsMap = new Map<string, { total: number; correct: number; successRate: number, subject: string, name: string }>();
    const testsForTopicAnalysis = selectedSubject ? tests.filter(t => t.subject === selectedSubject) : tests;

    testsForTopicAnalysis.filter(t => t.sourceType === 'bank' && t.questions).forEach(test => {
        test.questions?.forEach(q => {
            const bankQ = bankQuestions.find(bq => bq.id === q.questionId);
            if (bankQ) {
                const topicKey = `${bankQ.subject} - ${bankQ.topic}`;
                const current = topicStatsMap.get(topicKey) || { total: 0, correct: 0, successRate: 0, subject: bankQ.subject, name: bankQ.topic };
                current.total++;
                if (test.answerKey && test.studentAnswers) {
                    if(test.studentAnswers[q.questionNumber.toString()] === test.answerKey[q.questionNumber.toString()]) {
                        current.correct++;
                    }
                }
                topicStatsMap.set(topicKey, current);
            }
        });
    });
    
     Array.from(topicStatsMap.entries()).forEach(([key, data]) => {
       data.successRate = data.total > 0 ? (data.correct / data.total) * 100 : 0;
     });

    const sortedTopics = Array.from(topicStatsMap.values()).sort((a,b) => b.successRate - a.successRate);
    const strongTopics = sortedTopics.filter(t => t.successRate >= 75).slice(0, 5);
    const weakTopics = sortedTopics.filter(t => t.successRate < 75).sort((a,b) => a.successRate - b.successRate).slice(0, 5);

    return {
      totalQuestions, totalCorrect, totalIncorrect, totalEmpty, successRate,
      subjectStats, strongTopics, weakTopics
    };
  }, [tests, practiceExams, bankQuestions, selectedSubject]);
  
  const handleSort = (key: SortKey) => {
      if (sortKey === key) {
          setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
      } else {
          setSortKey(key);
          setSortDirection('desc');
      }
  }

  const sortedTests = React.useMemo(() => {
    let filtered = tests.filter(test =>
        test.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortKey) {
        filtered.sort((a, b) => {
            // @ts-ignore
            const valA = a[sortKey];
            // @ts-ignore
            const valB = b[sortKey];
            
            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    return filtered;
  }, [tests, searchTerm, sortKey, sortDirection]);

  // Chart Configs
  const barChartConfig = {
    successRate: { label: "Başarı %", color: "hsl(var(--primary))" },
  } satisfies ChartConfig;

  const pieChartData = [
      { name: "Doğru", value: stats.totalCorrect, fill: "#22c55e" },
      { name: "Yanlış", value: stats.totalIncorrect, fill: "#ef4444" },
      { name: "Boş", value: stats.totalEmpty, fill: "#94a3b8" },
  ];

  if (loading) {
    return (
        <div className="flex h-screen items-center justify-center bg-slate-950">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
    );
  }
  
  if (!student) {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-slate-400">
            <p>Öğrenci bulunamadı.</p>
            <Button variant="link" onClick={() => router.back()} className="text-indigo-400">Geri Dön</Button>
        </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden flex flex-col">
        {/* FIXED BACKGROUND */}
        <div className="fixed inset-0 bg-slate-950 -z-50" />
        
        {/* AMBIENT BACKGROUND */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[20%] left-[-5%] w-[400px] h-[400px] bg-purple-900/20 rounded-full blur-[120px]" />
        </div>

        {/* HEADER */}
        <div className={cn("sticky top-0 z-40 w-full transition-all duration-300", glassColors.HEADER_BG)}>
            <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button onClick={() => router.back()} variant="ghost" size="icon" className="rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors -ml-2">
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div className={cn("from-indigo-500 to-purple-600", glassColors.ICON_BOX)}>
                         <Target className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-slate-100 leading-none">
                            {student.name}
                        </h1>
                        <p className="text-xs font-medium text-slate-400 mt-0.5">Başarı İstatistikleri</p>
                    </div>
                </div>
            </div>
        </div>
      
      <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 relative z-10 flex flex-col min-h-0 space-y-6">
        
        {/* KEY METRICS GRID */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <Card className={cn("flex flex-col justify-center items-center text-center py-4", glassColors.CARD_BG)}>
                <div className="p-3 rounded-full bg-blue-500/20 mb-2"><Sigma className="h-6 w-6 text-blue-400" /></div>
                <div className="text-3xl font-black text-white">{stats.totalQuestions}</div>
                <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Toplam Soru</div>
            </Card>
            <Card className={cn("flex flex-col justify-center items-center text-center py-4", glassColors.CARD_BG)}>
                <div className="p-3 rounded-full bg-emerald-500/20 mb-2"><Check className="h-6 w-6 text-emerald-400" /></div>
                <div className="text-3xl font-black text-emerald-400">{stats.totalCorrect}</div>
                <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Doğru</div>
            </Card>
            <Card className={cn("flex flex-col justify-center items-center text-center py-4", glassColors.CARD_BG)}>
                <div className="p-3 rounded-full bg-rose-500/20 mb-2"><X className="h-6 w-6 text-rose-400" /></div>
                <div className="text-3xl font-black text-rose-400">{stats.totalIncorrect}</div>
                <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Yanlış</div>
            </Card>
            <Card className={cn("flex flex-col justify-center items-center text-center py-4", glassColors.CARD_BG)}>
                <div className="p-3 rounded-full bg-indigo-500/20 mb-2"><Percent className="h-6 w-6 text-indigo-400" /></div>
                <div className="text-3xl font-black text-indigo-400">%{stats.successRate.toFixed(0)}</div>
                <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Başarı</div>
            </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* SUBJECT PERFORMANCE CHART */}
            <Card className={cn("lg:col-span-2 flex flex-col", glassColors.CARD_BG)}>
                <CardHeader>
                    <CardTitle className="text-slate-100 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-indigo-400"/> Ders Başarı Analizi</CardTitle>
                    <CardDescription className="text-slate-400">Derslere göre doğru cevap oranları.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 min-h-[300px]">
                    {/*  - Replaced by Recharts BarChart */}
                    <ChartContainer config={barChartConfig} className="w-full h-[300px]">
                        <BarChart 
                          data={stats.subjectStats} 
                          layout="vertical" 
                          margin={{ left: 0, right: 30, top: 10, bottom: 10 }}
                          onClick={(data) => {
                            if (data && data.activePayload && data.activePayload[0]) {
                                const subjectName = data.activePayload[0].payload.name;
                                router.push(`/education/category/${encodeURIComponent(subjectName)}?studentId=${studentId}`);
                            }
                          }}
                        >
                            <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.1)" />
                            <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={100} tick={{fill: '#94a3b8', fontSize: 12}} />
                            <XAxis type="number" hide domain={[0, 100]} />
                            <ChartTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} content={<ChartTooltipContent indicator="line" />} />
                            <Bar dataKey="successRate" name="Başarı %" radius={[0, 4, 4, 0]} barSize={32} className="cursor-pointer">
                                {stats.subjectStats.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={`hsl(${220 + (index * 20)}, 70%, 60%)`} />
                                ))}
                                <LabelList dataKey="successRate" position="right" formatter={(val: number) => `${val.toFixed(0)}%`} className="fill-slate-300 text-xs font-bold" />
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>

            {/* QUESTION DISTRIBUTION CHART */}
            <Card className={cn("flex flex-col", glassColors.CARD_BG)}>
                <CardHeader>
                    <CardTitle className="text-slate-100 text-center">Soru Dağılımı</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center min-h-[300px]">
                    {/*  - Replaced by Recharts PieChart */}
                    <div className="relative w-full h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieChartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} stroke="rgba(0,0,0,0)" />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                                    itemStyle={{ color: '#f8fafc' }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Text */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[60%] text-center pointer-events-none">
                            <span className="text-3xl font-black text-slate-100">{stats.totalQuestions}</span>
                            <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Toplam</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* TOPIC ANALYSIS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Card className={glassColors.CARD_BG}>
                <CardHeader className="pb-3">
                    <CardTitle className="text-slate-100 flex items-center gap-2 text-base"><Award className="w-5 h-5 text-yellow-400"/> En Güçlü Konular</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {/*  - Simplified list representation */}
                    {stats.strongTopics.length > 0 ? stats.strongTopics.map((topic, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                            <div>
                                <p className="font-semibold text-emerald-200 text-sm">{topic.name}</p>
                                <p className="text-xs text-emerald-400/70">{topic.subject}</p>
                            </div>
                            <Badge className="bg-emerald-500 text-white border-0">%{topic.successRate.toFixed(0)}</Badge>
                        </div>
                    )) : (
                        <p className="text-center text-slate-500 text-sm py-4">Veri yetersiz.</p>
                    )}
                </CardContent>
            </Card>

            <Card className={glassColors.CARD_BG}>
                <CardHeader className="pb-3">
                    <CardTitle className="text-slate-100 flex items-center gap-2 text-base"><AlertCircle className="w-5 h-5 text-rose-400"/> Geliştirilmesi Gerekenler</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {stats.weakTopics.length > 0 ? stats.weakTopics.map((topic, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                            <div>
                                <p className="font-semibold text-rose-200 text-sm">{topic.name}</p>
                                <p className="text-xs text-rose-400/70">{topic.subject}</p>
                            </div>
                            <Badge variant="destructive" className="bg-rose-500 text-white border-0">%{topic.successRate.toFixed(0)}</Badge>
                        </div>
                    )) : (
                        <p className="text-center text-slate-500 text-sm py-4">Veri yetersiz.</p>
                    )}
                </CardContent>
            </Card>
        </div>
      
        {/* TESTS TABLE */}
        <Card className={glassColors.CARD_BG}>
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <CardTitle className="text-slate-100">Son Çözülen Testler</CardTitle>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input 
                        placeholder="Test ara..."
                        className={cn("pl-10 h-9 text-sm", glassColors.INPUT_BG)}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
             <div className="overflow-x-auto">
                <Table>
                    <TableHeader className={glassColors.TABLE_HEADER}>
                        <TableRow className="border-white/5 hover:bg-transparent">
                            <TableHead className="text-slate-400"><Button variant="ghost" onClick={() => handleSort('title')} className="h-8 text-xs font-bold hover:text-white">TEST ADI <ArrowUpDown className="ml-1 h-3 w-3" /></Button></TableHead>
                            <TableHead className="text-center text-slate-400"><Button variant="ghost" onClick={() => handleSort('correctAnswers')} className="h-8 text-xs font-bold hover:text-white">DOĞRU <ArrowUpDown className="ml-1 h-3 w-3" /></Button></TableHead>
                            <TableHead className="text-center text-slate-400"><Button variant="ghost" onClick={() => handleSort('incorrectAnswers')} className="h-8 text-xs font-bold hover:text-white">YANLIŞ <ArrowUpDown className="ml-1 h-3 w-3" /></Button></TableHead>
                            <TableHead className="text-center text-slate-400"><Button variant="ghost" onClick={() => handleSort('emptyAnswers')} className="h-8 text-xs font-bold hover:text-white">BOŞ <ArrowUpDown className="ml-1 h-3 w-3" /></Button></TableHead>
                            <TableHead className="text-right text-slate-400 pr-6"><Button variant="ghost" onClick={() => handleSort('score')} className="h-8 text-xs font-bold hover:text-white">PUAN <ArrowUpDown className="ml-1 h-3 w-3" /></Button></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedTests.length > 0 ? sortedTests.map(test => (
                            <TableRow key={test.id} className={cn("border-white/5 cursor-pointer", glassColors.TABLE_ROW_HOVER)} onClick={() => router.push(`/education/${test.id}`)}>
                                <TableCell className="font-medium text-slate-200">
                                    {test.title}
                                    <span className="block text-[10px] text-slate-500">{test.subject}</span>
                                </TableCell>
                                <TableCell className="text-center text-emerald-400 font-bold">{test.correctAnswers}</TableCell>
                                <TableCell className="text-center text-rose-400 font-bold">{test.incorrectAnswers}</TableCell>
                                <TableCell className="text-center text-slate-400">{test.emptyAnswers}</TableCell>
                                <TableCell className="text-right pr-6">
                                    <Badge variant="outline" className={cn(
                                        "bg-white/5 border-white/10",
                                        (test.score || 0) >= 80 ? "text-emerald-400 border-emerald-500/30" : 
                                        (test.score || 0) >= 50 ? "text-yellow-400 border-yellow-500/30" : "text-rose-400 border-rose-500/30"
                                    )}>
                                        {test.score?.toFixed(0) || 0}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                                    Kayıt bulunamadı.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
