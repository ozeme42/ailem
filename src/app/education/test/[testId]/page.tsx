"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { onTestsUpdate, onQuestionBanksUpdate } from "@/lib/dataService";
import { useAuth } from "@/components/auth-provider";
import { Test, FamilyMember, QuestionBank, Topic } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Check, BookOpen, Clock, Box, CalendarClock, Hourglass } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { compareDesc, format, parse } from 'date-fns';
import { tr } from 'date-fns/locale';
import Link from 'next/link';
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

type TopicStats = {
  id: string;
  name: string;
  correct: number;
  total: number;
  successRate: number;
};

export default function CategoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  
  const categoryName = decodeURIComponent(params.categoryName as string);
  const studentId = searchParams.get('studentId');

  const { familyMembers } = useAuth();
  const [allTests, setAllTests] = React.useState<Test[]>([]);
  const [questionBanks, setQuestionBanks] = React.useState<QuestionBank[]>([]);
  const [loading, setLoading] = React.useState(true);

  const student = React.useMemo(() => 
    familyMembers.find(m => m.id === studentId),
  [familyMembers, studentId]);

  React.useEffect(() => {
    if (!studentId) {
      setLoading(false);
      return;
    }
    const unsubscribeTests = onTestsUpdate((tests) => {
      setAllTests(tests.filter(t => t.studentId === studentId));
      if (loading) setLoading(false);
    });
    const unsubscribeBanks = onQuestionBanksUpdate((banks) => {
        setQuestionBanks(banks);
        if (loading) setLoading(false);
    });

    // Initial loading state management
    Promise.all([
        new Promise(resolve => onTestsUpdate(t => resolve(t), true)),
        new Promise(resolve => onQuestionBanksUpdate(b => resolve(b), true))
    ]).then(() => setLoading(false));

    return () => {
        unsubscribeTests();
        unsubscribeBanks();
    };
  }, [studentId, loading]);

  const { filteredTests, topicStats } = React.useMemo(() => {
    const getCategoryName = (test: Test): string => {
        if (test.sourceType === 'exam') return 'Genel Deneme Sınavları';
        if (test.sourceType === 'mistake') return 'Yanlış Havuzu';
        // Note: `availableSubjects` is not available here, but we can rely on `test.subject`
        // as the main identifier for bank/quick tests. The main page already grouped them.
        if (test.subject) return test.subject;
        return 'Diğer';
    };
    
    const testsForCategory = allTests
      .filter(test => getCategoryName(test) === categoryName);

    const sortedTests = [...testsForCategory].sort((a, b) => {
          try {
              const dateA = parse(a.assignedDate, 'dd MMMM yyyy', new Date(), { locale: tr });
              const dateB = parse(b.assignedDate, 'dd MMMM yyyy', new Date(), { locale: tr });
              return compareDesc(dateA, dateB);
          } catch(e) {
              return 0;
          }
      });
      
    // Calculate Topic Stats
    const tempTopicStats = new Map<string, { name: string; correct: number; total: number }>();
    const allTopics = questionBanks.flatMap(qb => qb.subjects.flatMap(s => s.topics.map(t => ({...t, subjectName: s.name} as Topic & { subjectName: string } ))));

    testsForCategory
      .filter(t => t.status === 'Sonuçlandı' && t.sourceType === 'bank' && t.topicId)
      .forEach(test => {
        const topicInfo = allTopics.find(t => t.id.toString() === test.topicId && t.subjectName === categoryName);
        if (topicInfo) {
          const stats = tempTopicStats.get(topicInfo.id.toString()) || { name: topicInfo.name, correct: 0, total: 0 };
          stats.correct += test.correctAnswers || 0;
          stats.total += test.questionCount || 0;
          tempTopicStats.set(topicInfo.id.toString(), stats);
        }
      });

    const finalTopicStats: TopicStats[] = Array.from(tempTopicStats.entries()).map(([id, data]) => ({
      id,
      ...data,
      successRate: data.total > 0 ? (data.correct / data.total) * 100 : 0,
    })).sort((a, b) => b.successRate - a.successRate);

    return { filteredTests: sortedTests, topicStats: finalTopicStats };

  }, [allTests, categoryName, questionBanks]);
  
  const formatTestDate = (dateString: string) => {
      try {
        const date = parse(dateString, 'dd MMMM yyyy', new Date(), { locale: tr });
        return {
            day: format(date, 'd', { locale: tr }),
            month: format(date, 'MMMM', { locale: tr }),
            year: format(date, 'yyyy', { locale: tr }),
            time: format(date, 'HH:mm'),
        }
      } catch (e) {
          return { day: '?', month: '?', year: '?', time: '?' };
      }
  };


  if (loading) {
    return <div>Yükleniyor...</div>;
  }

  if (!student) {
    return <div className="text-center p-8">Öğrenci bulunamadı.</div>;
  }

  return (
    <div className="space-y-8">
      <PageHeader title={`${student.name} - ${categoryName}`}>
        <Button onClick={() => router.back()} variant="outline" className="bg-background/20 text-foreground hover:bg-background/30">
          <ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön
        </Button>
      </PageHeader>
      
      {topicStats.length > 0 && (
          <Card>
              <CardHeader>
                  <CardTitle>Konu Başarı Durumu</CardTitle>
                  <CardDescription>Bu dersteki konulara göre başarı dağılımı.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                  {topicStats.map(topic => {
                      const progressColor = topic.successRate >= 75 ? "bg-green-500" : topic.successRate >= 50 ? "bg-yellow-500" : "bg-red-500";
                      return (
                           <div key={topic.id}>
                              <div className="flex justify-between items-baseline mb-1">
                                <p className="font-semibold text-sm">{topic.name}</p>
                                <p className="text-xs text-muted-foreground">{topic.correct} / {topic.total} Doğru</p>
                              </div>
                              <Progress value={topic.successRate} className="h-2" indicatorClassName={progressColor} />
                           </div>
                      )
                  })}
              </CardContent>
          </Card>
      )}

      {filteredTests.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-xl font-bold">Atanmış Sınavlar</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTests.map((test) => {
              const isPending = test.status === 'Atandı';
              const startDate = formatTestDate(test.assignedDate);
              const endDate = formatTestDate(test.dueDate);
              const duration = test.questionCount * 1.5;

              return (
                <Card key={test.id} className="flex flex-col shadow-lg overflow-hidden">
                  <CardContent className="p-4 flex-grow grid grid-cols-[1fr_auto_auto] gap-4">
                    
                    <div className="flex flex-col justify-between">
                      <div>
                          <p className="text-xs text-muted-foreground">{test.subject}</p>
                          <h3 className="font-bold text-lg leading-tight">{test.title}</h3>
                      </div>
                      {!isPending ? (
                          <Badge variant="outline" className="w-fit text-green-600 border-green-500/50 bg-green-500/10">Çözüldü</Badge>
                      ) : (
                          <Box className="w-8 h-8 text-muted-foreground/70" />
                      )}
                    </div>
                    
                    <div className="flex flex-col justify-between items-center px-4 border-l border-r">
                      <div className="text-center">
                          <p className="text-xs text-muted-foreground">Başlangıç:</p>
                          <p className="text-sm font-semibold">{startDate.day}</p>
                          <p className="text-sm">{startDate.month}</p>
                          <p className="text-xs">{startDate.year}</p>
                      </div>
                      <div className="text-center">
                          <p className="text-xs text-muted-foreground">Bitiş:</p>
                          <p className="text-sm font-semibold">{endDate.day}</p>
                          <p className="text-sm">{endDate.month}</p>
                          <p className="text-xs">{endDate.year}</p>
                      </div>
                    </div>

                    <div className="flex flex-col justify-center items-center text-center">
                      <Clock className="w-8 h-8 text-primary/80 mb-2"/>
                      <p className="text-2xl font-bold">{duration}</p>
                      <p className="text-sm text-muted-foreground">DK</p>
                    </div>
                  </CardContent>
                  <CardFooter className="p-0">
                    <Link href={`/education/${test.id}`} passHref className="w-full">
                      <Button 
                          size="lg" 
                          className={cn(
                              "w-full rounded-t-none h-12 text-base",
                              !isPending 
                                  ? "bg-pink-600 hover:bg-pink-700"
                                  : "bg-cyan-500 hover:bg-cyan-600"
                          )}
                      >
                        {isPending ? 'Sınav Giriş Ekranına Git' : 'Sonuçlarımı Göster'}
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Bu kategoride atanmış test bulunmuyor.
          </CardContent>
        </Card>
      )}
    </div>
  );
}