

"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { onTestsUpdate, onBankQuestionsUpdate, addTest, deleteTest, updateTest } from "@/lib/dataService";
import { useAuth } from "@/components/auth-provider";
import { Test, FamilyMember, BankQuestion, Topic } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Check, BookOpen, Clock, Box, CalendarClock, Hourglass, NotebookText, Sparkles, Send, Edit, Trash2, CheckCircle, X as XIcon, MinusCircle } from "lucide-react";
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogFooter as AlertDialogFooterComponent } from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";



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
    studentId ? familyMembers.find(m => m.id === studentId) : null,
  [familyMembers, studentId]);

  React.useEffect(() => {
    const unsubscribeTests = onTestsUpdate((tests) => {
        setAllTests(tests);
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
  }, [loading]);

  const { filteredTests, topicStats } = React.useMemo(() => {
    let testsForCategory = allTests.filter(test => getCategoryName(test) === categoryName);
    
    if (studentId) {
        testsForCategory = testsForCategory.filter(test => test.studentId === studentId);
    }

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

  }, [allTests, categoryName, bankQuestions, studentId]);

  const pageTitle = student ? `${student.name} - ${categoryName}` : `${categoryName} Testleri`;
  
   const handleDeleteTest = async (testId: string) => {
    try {
        await deleteTest(testId);
    } catch (error) {
        console.error("Error deleting test:", error);
    }
  };


  if (loading) {
    return <div>Yükleniyor...</div>;
  }

  if (studentId && !student) {
    return <div className="text-center p-8">Öğrenci bulunamadı.</div>;
  }

  return (
    <div className="space-y-8">
      <PageHeader title={pageTitle}>
        <Button onClick={() => router.back()} variant="outline" className="bg-background/20 text-foreground hover:bg-background/30">
          <ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön
        </Button>
      </PageHeader>
      
      {student && topicStats.length > 0 && (
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
          <h3 className="text-xl font-bold">Atanmış Sınavlar ({filteredTests.length})</h3>
           <Accordion type="multiple" className="w-full" defaultValue={studentId ? [] : filteredTests.map(t => t.id)}>
                {filteredTests.map((test) => {
                const student = familyMembers.find(m => m.id === test.studentId);
                const isTestForSingleStudentView = studentId && test.studentId === studentId;
                const isManagementView = !studentId;

                return (
                    isTestForSingleStudentView ? (
                      <SingleStudentTestCard key={test.id} test={test} />
                    ) : isManagementView ? (
                        <ManagementTestCard key={test.id} test={test} student={student} onDelete={handleDeleteTest} />
                    ) : null
                )
                })}
          </Accordion>
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


function SingleStudentTestCard({ test }: { test: Test }) {
    let buttonText = 'Sınava Gir';
    let buttonClass = "bg-cyan-500 hover:bg-cyan-600";
    let buttonDisabled = false;
    let statusBadge: React.ReactNode = <Badge variant="outline" className="w-fit text-cyan-600 border-cyan-500/50 bg-cyan-500/10">Atandı</Badge>;
    
    if (test.status === 'Sonuçlandı') {
        buttonText = 'Sonuçları Göster';
        buttonClass = "bg-pink-600 hover:bg-pink-700";
        statusBadge = <Badge variant="outline" className="w-fit text-green-600 border-green-500/50 bg-green-500/10">Çözüldü</Badge>;
    } else if (test.status === 'Değerlendirme Bekliyor') {
        buttonText = 'Değerlendiriliyor...';
        buttonDisabled = true;
        buttonClass = "bg-yellow-500 hover:bg-yellow-600";
        statusBadge = <Badge variant="outline" className="w-fit text-yellow-600 border-yellow-500/50 bg-yellow-500/10">Değerlendiriliyor</Badge>;
    }

    const isMistakeTest = test.sourceType === 'mistake';
    const duration = test.questionCount * 1.5;

    return (
        <Card key={test.id} className="flex flex-col shadow-sm overflow-hidden">
            <CardHeader>
                <div className="flex justify-between items-start gap-2">
                    <CardTitle>{test.title}</CardTitle>
                    {statusBadge}
                </div>
                 <CardDescription>
                    {test.assignedDate} - {test.dueDate}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex items-center justify-between">
                <div className="text-center">
                    <p className="text-3xl font-bold">{test.questionCount}</p>
                    <p className="text-sm text-muted-foreground">SORU</p>
                </div>
                {!isMistakeTest && (
                    <div className="text-center">
                        <p className="text-3xl font-bold">{duration}</p>
                        <p className="text-sm text-muted-foreground">DAKİKA</p>
                    </div>
                )}
            </CardContent>
            <CardFooter className="p-0">
            <Link href={`/education/${test.id}`} passHref className="w-full">
                <Button 
                    size="lg" 
                    className={cn("w-full rounded-t-none h-12 text-base", buttonClass)}
                    disabled={buttonDisabled}
                >
                {buttonText}
                </Button>
            </Link>
            </CardFooter>
        </Card>
    );
}

function ManagementTestCard({ test, student, onDelete }: { test: Test, student?: FamilyMember, onDelete: (id: string) => void }) {
    const isCompleted = test.status === 'Sonuçlandı';
    const isPendingGrade = test.status === 'Değerlendirme Bekliyor';
    const scorePercentage = test.score || 0;

    return (
        <AccordionItem value={test.id} className="border bg-background rounded-md mb-2">
            <AccordionTrigger className="p-4">
                <div className="flex justify-between items-center w-full pr-4">
                    <div>
                        <p className="font-semibold">{test.title}</p>
                        <p className="text-sm text-muted-foreground">{student?.name}</p>
                    </div>
                     <Badge variant={isCompleted ? "default" : "outline"} className={cn("text-xs", isCompleted && "bg-green-600", isPendingGrade && "bg-yellow-500 text-yellow-900")}>{test.status}</Badge>
                </div>
            </AccordionTrigger>
            <AccordionContent className="p-4 pt-0">
                 {isCompleted && (
                     <div className="space-y-2 mb-4">
                        <Progress value={scorePercentage} className="h-1.5" />
                        <div className="flex justify-between text-xs font-medium">
                            <span className="flex items-center gap-1 text-green-600"><CheckCircle className="h-3 w-3"/> D: {test.correctAnswers}</span>
                            <span className="flex items-center gap-1 text-red-600"><XIcon className="h-3 w-3"/> Y: {test.incorrectAnswers}</span>
                            <span className="flex items-center gap-1 text-gray-500"><MinusCircle className="h-3 w-3"/> B: {test.emptyAnswers}</span>
                        </div>
                    </div>
                )}
                <div className="flex justify-end gap-2">
                     {isPendingGrade && (
                        <Link href={`/education/${test.id}`}>
                            <Button variant="secondary" size="sm">Not Ver</Button>
                        </Link>
                    )}
                     <Link href={`/education/management/assign?edit=${test.id}`}>
                        <Button variant="outline" size="sm"><Edit className="w-3 h-3 mr-1"/>Düzenle</Button>
                    </Link>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm"><Trash2 className="w-3 h-3 mr-1"/>Sil</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Ödevi Sil</AlertDialogTitle><AlertDialogDescription>"{test.title}" ödevini kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooterComponent><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => onDelete(test.id)}>Evet, Sil</AlertDialogAction></AlertDialogFooterComponent>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </AccordionContent>
        </AccordionItem>
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

