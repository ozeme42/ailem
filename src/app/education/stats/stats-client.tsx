
"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, BookCheck, BookX, Check, Percent, Sigma, Target, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { useAuth } from "@/components/auth-provider";
import { onTestsUpdate, onQuestionBanksUpdate, onPracticeExamsUpdate } from "@/lib/dataService";
import { Test, QuestionBank, PracticeExam, Topic } from "@/lib/data";
import { Badge } from "@/components/ui/badge";

type SubjectStats = {
  name: string;
  total: number;
  correct: number;
  incorrect: number;
  empty: number;
  successRate: number;
};

type TopicWithSubject = Topic & { subjectName: string; name: string; total: number; correct: number; successRate: number, subject: string };

export default function StatsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const studentId = searchParams.get('studentId');

  const { familyMembers } = useAuth();
  const [tests, setTests] = React.useState<Test[]>([]);
  const [questionBanks, setQuestionBanks] = React.useState<QuestionBank[]>([]);
  const [practiceExams, setPracticeExams] = React.useState<PracticeExam[]>([]);
  const [loading, setLoading] = React.useState(true);

  const student = React.useMemo(() => familyMembers.find(m => m.id === studentId), [familyMembers, studentId]);

  React.useEffect(() => {
    if (!studentId) {
      setLoading(false);
      return;
    };
    
    const unsubTests = onTestsUpdate(allTests => {
      setTests(allTests.filter(t => t.studentId === studentId && t.status === 'Değerlendirildi'));
      setLoading(false);
    });
    const unsubBanks = onQuestionBanksUpdate(setQuestionBanks);
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
           // This is a simplification. Real distribution would be more complex.
           // We'll distribute correct/incorrect answers proportionally.
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
    
    // Topic Analysis
    const allTopics = questionBanks.flatMap(qb => qb.subjects.flatMap(s => s.topics.map(t => ({...t, subjectName: s.name} as TopicWithSubject))));
    const topicStatsMap = new Map<string, { total: number; correct: number; successRate: number, subject: string, name: string }>();

    tests.filter(t => t.sourceType === 'bank').forEach(test => {
        const topic = allTopics.find(t => t.id.toString() === test.topicId);
        if(topic) {
            const topicKey = `${topic.subjectName} - ${topic.name}`;
            const current = topicStatsMap.get(topicKey) || { total: 0, correct: 0, successRate: 0, subject: topic.subjectName, name: topic.name };
            current.total += test.questionCount;
            current.correct += test.correctAnswers || 0;
            topicStatsMap.set(topicKey, current);
        }
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
  }, [tests, practiceExams, questionBanks]);

  const chartConfig = {
    Başarı: { label: "Başarı %", color: "hsl(var(--chart-1))" },
  } satisfies ChartConfig

  if (loading) {
    // Skeleton can be improved later
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
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Soru</CardTitle>
            <Sigma className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalQuestions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Doğru Cevap</CardTitle>
            <Check className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCorrect}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Yanlış Cevap</CardTitle>
            <X className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalIncorrect}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Genel Başarı</CardTitle>
            <Percent className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Derslere Göre Başarı Dağılımı</CardTitle>
            <CardDescription>Her dersteki başarı yüzdesi.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64">
              <BarChart data={stats.subjectStats} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid horizontal={false} />
                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={80} />
                <XAxis dataKey="successRate" type="number" hide />
                <Tooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                <Bar dataKey="successRate" name="Başarı" radius={5} background={{ fill: 'hsl(var(--muted))', radius: 5 }}>
                    {stats.subjectStats.map(s => (<Cell key={s.name} fill="hsl(var(--chart-1))" />))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Konu Analizi</CardTitle>
                <CardDescription>En başarılı ve geliştirilmesi gereken konular.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
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
            <CardDescription>Tüm değerlendirilmiş testlerin detaylı dökümü.</CardDescription>
          </CardHeader>
          <CardContent>
             <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Test Adı</TableHead>
                    <TableHead className="text-center">Doğru</TableHead>
                    <TableHead className="text-center">Yanlış</TableHead>
                    <TableHead className="text-center">Boş</TableHead>
                    <TableHead className="text-right">Puan</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {tests.map(test => (
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
          </CardContent>
        </Card>
    </>
  );
}
    