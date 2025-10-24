

"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { onTestsUpdate, onBankQuestionsUpdate, addTest } from "@/lib/dataService";
import { useAuth } from "@/components/auth-provider";
import { Test, FamilyMember, BankQuestion, Topic } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Check, BookOpen, Clock, Box, CalendarClock, Hourglass, NotebookText, Sparkles, Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { compareDesc, format, parse } from 'date-fns';
import { tr } from 'date-fns/locale';
import Link from 'next/link';
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";


type TopicStats = {
  id: string;
  name: string;
  correct: number;
  total: number;
  successRate: number;
};

// This function must be consistent with the one in `src/app/education/page.tsx`
const getCategoryName = (test: Test): string => {
    if (test.sourceType === 'exam') return 'Genel Deneme Sınavları';
    if (test.sourceType === 'mistake') return 'Yanlışlarım';
    return test.subject || 'Diğer';
};

export default function CategoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  
  const categoryName = decodeURIComponent(params.categoryName as string);
  const studentId = searchParams.get('studentId');

  const { familyMembers, user } = useAuth();
  const [allTests, setAllTests] = React.useState<Test[]>([]);
  const [bankQuestions, setBankQuestions] = React.useState<BankQuestion[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState(false);
  const [selectedTopic, setSelectedTopic] = React.useState<TopicStats | null>(null);

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
    const unsubscribeBanks = onBankQuestionsUpdate((questions) => {
        setBankQuestions(questions);
        if (loading) setLoading(false);
    });

    // Initial loading state management
    Promise.all([
        new Promise(resolve => onTestsUpdate(t => resolve(t), true)),
        new Promise(resolve => onBankQuestionsUpdate(b => resolve(b), true))
    ]).then(() => setLoading(false));

    return () => {
        unsubscribeTests();
        unsubscribeBanks();
    };
  }, [studentId, loading]);

  const { filteredTests, topicStats } = React.useMemo(() => {
    const testsForCategory = allTests.filter(test => getCategoryName(test) === categoryName);

    const sortedTests = [...testsForCategory].sort((a, b) => {
        try {
            const dateA = a.assignedDate ? parse(a.assignedDate, 'dd MMMM yyyy', new Date()) : 0;
            const dateB = b.assignedDate ? parse(b.assignedDate, 'dd MMMM yyyy', new Date()) : 0;
            if (!dateA || !dateB) return 0;
            return compareDesc(dateA, dateB);
        } catch(e) {
            return 0;
        }
    });
      
    // Calculate Topic Stats
    const tempTopicStats = new Map<string, { name: string; correct: number; total: number }>();
    const allTopicsForSubject = Array.from(new Set(bankQuestions.filter(q => q.subject === categoryName).map(q => q.topic)));


    testsForCategory
      .filter(t => t.status === 'Sonuçlandı' && t.sourceType === 'bank')
      .forEach(test => {
          const testTopicName = bankQuestions.find(q => q.id === test.sourceId)?.topic;
          if (testTopicName && test.subject === categoryName) {
              const stats = tempTopicStats.get(testTopicName) || { name: testTopicName, correct: 0, total: 0 };
              stats.correct += test.correctAnswers || 0;
              stats.total += test.questionCount || 0;
              tempTopicStats.set(testTopicName, stats);
          }
      });

    const finalTopicStats: TopicStats[] = Array.from(tempTopicStats.entries()).map(([name, data]) => ({
      id: name,
      ...data,
      successRate: data.total > 0 ? (data.correct / data.total) * 100 : 0,
    })).sort((a, b) => b.successRate - a.successRate);

    return { filteredTests: sortedTests, topicStats: finalTopicStats };

  }, [allTests, categoryName, bankQuestions]);
  
  const formatTestDate = (dateString: string) => {
      try {
        const date = parse(dateString, 'dd MMMM yyyy', new Date());
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
                  <CardDescription>Bu dersteki konulara göre başarı dağılımı. Zayıf konulardan hızlıca ödev oluşturun.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                  {topicStats.map(topic => {
                      const progressColor = topic.successRate >= 75 ? "bg-green-500" : topic.successRate >= 50 ? "bg-yellow-500" : "bg-red-500";
                      return (
                           <div key={topic.id} className="p-3 border rounded-lg">
                              <div className="flex justify-between items-center mb-2">
                                <p className="font-semibold">{topic.name}</p>
                                <Button size="sm" variant="secondary" onClick={() => { setSelectedTopic(topic); setIsAssignDialogOpen(true); }}>
                                    <Send className="mr-2 h-4 w-4"/> Ödev Ata
                                </Button>
                              </div>
                              <div className="flex items-center gap-4">
                                <Progress value={topic.successRate} className="h-2 flex-grow" indicatorClassName={progressColor} />
                                <p className="text-xs text-muted-foreground font-medium">{topic.correct} / {topic.total} Doğru</p>
                              </div>
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
              let buttonText = 'Sınava Gir';
              let buttonClass = "bg-cyan-500 hover:bg-cyan-600";
              
              if (test.status === 'Sonuçlandı') {
                  buttonText = 'Sonuçları Göster';
                  buttonClass = "bg-pink-600 hover:bg-pink-700";
              }

              const startDate = formatTestDate(test.assignedDate);
              const endDate = formatTestDate(test.dueDate);
              const isMistakeTest = test.sourceType === 'mistake';
              const duration = test.questionCount * 1.5;

              return (
                <Card key={test.id} className="flex flex-col shadow-lg overflow-hidden">
                  <CardContent className="p-4 flex-grow grid grid-cols-[1fr_auto_auto] gap-4">
                    
                    <div className="flex flex-col justify-between">
                      <div>
                          <p className="text-xs text-muted-foreground">{test.subject}</p>
                          <h3 className="font-bold text-lg leading-tight">{test.title}</h3>
                      </div>
                      {test.status !== 'Atandı' ? (
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
                       {isMistakeTest ? (
                           <>
                                <NotebookText className="w-8 h-8 text-primary/80 mb-2"/>
                                <p className="text-2xl font-bold">{test.questionCount}</p>
                                <p className="text-sm text-muted-foreground">SORU</p>
                           </>
                       ) : (
                           <>
                                <Clock className="w-8 h-8 text-primary/80 mb-2"/>
                                <p className="text-2xl font-bold">{duration}</p>
                                <p className="text-sm text-muted-foreground">DK</p>
                           </>
                       )}
                    </div>
                  </CardContent>
                  <CardFooter className="p-0">
                    <Link href={`/education/${test.id}`} passHref className="w-full">
                      <Button 
                          size="lg" 
                          className={cn("w-full rounded-t-none h-12 text-base", buttonClass)}
                      >
                        {buttonText}
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

      {selectedTopic && student && (
        <NewTestFromTopicForm
          isOpen={isAssignDialogOpen}
          onOpenChange={setIsAssignDialogOpen}
          student={student}
          subject={categoryName}
          topic={selectedTopic.name}
          allBankQuestions={bankQuestions}
        />
      )}
    </div>
  );
}

const formSchema = z.object({
  title: z.string().min(3, "Başlık en az 3 karakter olmalıdır."),
  questionCount: z.coerce.number().min(1, "Soru sayısı en az 1 olmalıdır."),
});

type NewTestFromTopicFormProps = {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    student: FamilyMember;
    subject: string;
    topic: string;
    allBankQuestions: BankQuestion[];
}

function NewTestFromTopicForm({ isOpen, onOpenChange, student, subject, topic, allBankQuestions }: NewTestFromTopicFormProps) {
    const { toast } = useToast();
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: `${topic} Tekrar Testi`,
            questionCount: 10,
        },
    });
    
    const availableQuestions = React.useMemo(() => 
        allBankQuestions.filter(q => q.subject === subject && q.topic === topic),
    [allBankQuestions, subject, topic]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (values.questionCount > availableQuestions.length) {
            toast({
                title: "Yetersiz Soru",
                description: `Bu konuda sadece ${availableQuestions.length} soru mevcut. Lütfen daha az soru sayısı girin.`,
                variant: 'destructive',
            });
            return;
        }

        const shuffled = [...availableQuestions].sort(() => 0.5 - Math.random());
        const selectedQuestions = shuffled.slice(0, values.questionCount);

        const testData = {
          title: values.title,
          subject: subject,
          studentId: student.id,
          questionCount: values.questionCount,
          assignedDate: format(new Date(), 'dd MMMM yyyy', { locale: tr }),
          dueDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'dd MMMM yyyy', { locale: tr }),
          sourceType: 'bank' as const,
          sourceId: topic, // Using topic as sourceId for simplicity
          topicId: topic,
          gradingType: 'auto' as const,
        };

        try {
            await addTest(testData, selectedQuestions);
            toast({
                title: "✅ Ödev Atandı",
                description: `${values.title} testi ${student.name} öğrencisine başarıyla atandı.`,
            });
            onOpenChange(false);
            form.reset();
        } catch (error) {
            console.error(error);
            toast({ title: "Hata", variant: "destructive" });
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{topic} konusundan ödev ata</DialogTitle>
                    <DialogDescription>
                        {student.name} için {subject} dersinden yeni bir test oluşturun. 
                        Soru bankasında bu konu için toplam {availableQuestions.length} soru bulunmaktadır.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                        <FormField control={form.control} name="title" render={({ field }) => (
                            <FormItem><FormLabel>Test Başlığı</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="questionCount" render={({ field }) => (
                            <FormItem><FormLabel>Soru Sayısı</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>İptal</Button>
                            <Button type="submit">Ödevi Ata</Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}


