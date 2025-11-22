
"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, BookCheck, BookX, Check, Percent, Sigma, Target, ThumbsDown, ThumbsUp, X, Search, ArrowUpDown } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell, LabelList } from "recharts";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { useAuth } from "@/components/auth-provider";
import { onTestsUpdate, onBankQuestionsUpdate, onPracticeExamsUpdate } from "@/lib/dataService";
import { Test, BankQuestion, PracticeExam, Topic } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";


type SubjectStats = {
  name: string;
  total: number;
  correct: number;
  incorrect: number;
  empty: number;
  successRate: number;
};

type TopicWithSubject = Topic & { subjectName: string; name: string; total: number; correct: number; successRate: number, subject: string };

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
  const [sortKey, setSortKey] = React.useState<SortKey>('score');
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

    const topicStatsForSelectedSubject = Array.from(topicStatsMap.values())
        .filter(t => t.subject === selectedSubject)
        .sort((a, b) => b.successRate - a.successRate);


    return {
      totalQuestions, totalCorrect, totalIncorrect, totalEmpty, successRate,
      subjectStats, strongTopics, weakTopics, topicStatsForSelectedSubject
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
            const valA = a[sortKey as keyof Test] as number | undefined || 0;
            const valB = b[sortKey as keyof Test] as number | undefined || 0;
            
            if (sortDirection === 'asc') {
                return valA - valB;
            } else {
                return valB - valA;
            }
        });
    }

    return filtered;
  }, [tests, searchTerm, sortKey, sortDirection]);

  const chartConfig = {
    Başarı: { label: "Başarı %", color: "hsl(var(--chart-1))" },
  } satisfies ChartConfig
  
  const chartColors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];


  if (loading) {
    return <div>Yükleniyor...</div>;
  }
  
  if (!student) {
    return (
        <div>
            <PageHeader title="Öğrenci Bulunamadı" />
            <p>İstatistiklerini görmek için lütfen geçerli bir öğrenci seçin.</p>
             <Button onClick={() => router.push('/education')} className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Eğitim Sayfasına Geri Dön
            </Button>
        </div>
    )
  }
  
  return (
    <>
      <PageHeader title={`${student.name}'in Başarı İstatistikleri 📈`}>
        <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Geri
        </Button>
      </PageHeader>
      
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-8">
        <Card className="bg-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Toplam Soru</CardTitle>
            <Sigma className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalQuestions}</div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Doğru</CardTitle>
            <Check className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.totalCorrect}</div>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Yanlış</CardTitle>
            <X className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.totalIncorrect}</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Başarı</CardTitle>
            <Percent className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.successRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>{selectedSubject ? `${selectedSubject} Konu Analizi` : 'Derslere Göre Başarı Dağılımı'}</CardTitle>
                     {selectedSubject && (
                        <Button variant="ghost" size="sm" onClick={() => setSelectedSubject(null)}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Derslere Dön
                        </Button>
                    )}
                </div>
                <CardDescription>{selectedSubject ? 'Bu dersteki konuların başarı yüzdeleri.' : 'Her dersteki genel başarı yüzdesi.'}</CardDescription>
            </CardHeader>
            <CardContent>
                {selectedSubject ? (
                     <ChartContainer config={chartConfig} className="h-64 w-full">
                       <BarChart data={stats.topicStatsForSelectedSubject} layout="vertical" margin={{ left: 10, right: 30 }}>
                        <CartesianGrid horizontal={false} />
                        <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={80} fontSize={12}/>
                        <XAxis dataKey="successRate" type="number" hide />
                        <Tooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                        <Bar dataKey="successRate" name="Başarı" radius={5}>
                             {stats.topicStatsForSelectedSubject.map((s, index) => (<Cell key={s.name} fill={chartColors[index % chartColors.length]} />))}
                             <LabelList dataKey="successRate" position="center" className="fill-primary-foreground text-xs" formatter={(value: number) => `${value.toFixed(1)}%`}/>
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                ) : (
                    <ChartContainer config={chartConfig} className="h-64 w-full">
                       <BarChart data={stats.subjectStats} layout="vertical" margin={{ left: 10, right: 30 }} onClick={(e) => e.activePayload && setSelectedSubject(e.activePayload[0].payload.name)}>
                        <CartesianGrid horizontal={false} />
                        <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={80} fontSize={12}/>
                        <XAxis dataKey="successRate" type="number" hide />
                        <Tooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                        <Bar dataKey="successRate" name="Başarı" radius={5} className="cursor-pointer">
                            {stats.subjectStats.map((s, index) => (<Cell key={s.name} fill={chartColors[index % chartColors.length]} />))}
                             <LabelList dataKey="successRate" position="center" className="fill-primary-foreground text-xs" formatter={(value: number) => `${value.toFixed(1)}%`}/>
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Konu Analizi</CardTitle>
                <CardDescription>En başarılı ve geliştirilmesi gereken konular.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <h4 className="font-semibold flex items-center gap-2 mb-2"><ThumbsUp className="text-green-500"/> En Güçlü Konular</h4>
                    <div className="space-y-2">
                        {stats.strongTopics.map((topic, i) => (
                           <div key={i} className="p-2 rounded-md bg-green-500/10 text-sm">
                             <p className="font-medium text-green-800">{topic.name}</p>
                             <p className="text-xs text-green-700">{topic.subject} - {topic.correct} / {topic.total} doğru</p>
                           </div>
                        ))}
                         {stats.strongTopics.length === 0 && <p className="text-xs text-muted-foreground">Veri yetersiz.</p>}
                    </div>
                </div>
                 <div>
                    <h4 className="font-semibold flex items-center gap-2 mb-2"><ThumbsDown className="text-red-500"/> Geliştirilecek Konular</h4>
                     <div className="space-y-2">
                        {stats.weakTopics.map((topic, i) => (
                           <div key={i} className="p-2 rounded-md bg-red-500/10 text-sm">
                             <p className="font-medium text-red-800">{topic.name}</p>
                             <p className="text-xs text-red-700">{topic.subject} - {topic.correct} / {topic.total} doğru</p>
                           </div>
                        ))}
                        {stats.weakTopics.length === 0 && <p className="text-xs text-muted-foreground">Veri yetersiz.</p>}
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>
      
       <Card>
          <CardHeader>
            <CardTitle>Test Sonuçları</CardTitle>
             <div className="relative w-full max-w-sm mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Test adına göre filtrele..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
          </CardHeader>
          <CardContent>
             <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead><Button variant="ghost" onClick={() => handleSort('title')}>Test Adı <ArrowUpDown className="ml-2 h-4 w-4 inline-block" /></Button></TableHead>
                            <TableHead className="text-center"><Button variant="ghost" onClick={() => handleSort('correctAnswers')}>Doğru <ArrowUpDown className="ml-2 h-4 w-4 inline-block" /></Button></TableHead>
                            <TableHead className="text-center"><Button variant="ghost" onClick={() => handleSort('incorrectAnswers')}>Yanlış <ArrowUpDown className="ml-2 h-4 w-4 inline-block" /></Button></TableHead>
                            <TableHead className="text-center"><Button variant="ghost" onClick={() => handleSort('emptyAnswers')}>Boş <ArrowUpDown className="ml-2 h-4 w-4 inline-block" /></Button></TableHead>
                            <TableHead className="text-right"><Button variant="ghost" onClick={() => handleSort('score')}>Puan <ArrowUpDown className="ml-2 h-4 w-4 inline-block" /></Button></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedTests.map(test => (
                            <TableRow key={test.id}>
                                <TableCell className="font-medium">{test.title}</TableCell>
                                <TableCell className="text-center text-green-600 font-semibold">{test.correctAnswers}</TableCell>
                                <TableCell className="text-center text-red-600 font-semibold">{test.incorrectAnswers}</TableCell>
                                <TableCell className="text-center">{test.emptyAnswers}</TableCell>
                                <TableCell className="text-right">
                                    <Badge variant="outline">{test.score?.toFixed(1)}</Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
             </div>
             {sortedTests.length === 0 && (
                <p className="text-center py-8 text-muted-foreground">
                    Aranan kriterlere uygun test sonucu bulunamadı.
                </p>
             )}
          </CardContent>
        </Card>
    </>
  );
}
    

    
