

"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { onTestsUpdate, onBankQuestionsUpdate, addTest, deleteTest, updateTest, onTopicsUpdate, onTrackedBooksUpdate } from "@/lib/dataService";
import { useAuth } from "@/components/auth-provider";
import { Test, FamilyMember, BankQuestion, Topic, TrackedBook } from "@/lib/data";
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
import { getCategoryName } from "@/app/education/page";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


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

  const { familyMembers, user } = useAuth();
  const [allTests, setAllTests] = React.useState<Test[]>([]);
  const [trackedBooks, setTrackedBooks] = React.useState<TrackedBook[]>([]);
  const [loading, setLoading] = React.useState(true);
  
  const student = React.useMemo(() => 
    studentId ? familyMembers.find(m => m.id === studentId) : null,
  [familyMembers, studentId]);

  React.useEffect(() => {
    const unsubscribeTests = onTestsUpdate((tests) => {
        setAllTests(tests);
        if (loading) setLoading(false);
    });
    const unsubTrackedBooks = onTrackedBooksUpdate(setTrackedBooks);
    
    Promise.all([
        new Promise(resolve => onTestsUpdate(t => resolve(t), true)),
    ]).then(() => setLoading(false));

    return () => {
        unsubscribeTests();
        unsubTrackedBooks();
    };
  }, [loading]);

  const { filteredTests, testsByStudent } = React.useMemo(() => {
    const testsForCategory = allTests.filter(test => getCategoryName(test) === categoryName);
    
    if (studentId) {
        return { 
            filteredTests: testsForCategory.filter(test => test.studentId === studentId),
            testsByStudent: {}
        };
    }
    
    // Management view: group by student
    const studentGroup: { [studentId: string]: Test[] } = {};
    testsForCategory.forEach(test => {
        if (!test.studentId) return;
        if (!studentGroup[test.studentId]) {
            studentGroup[test.studentId] = [];
        }
        studentGroup[test.studentId].push(test);
    });
    return { filteredTests: [], testsByStudent: studentGroup };

  }, [allTests, categoryName, studentId]);

  const pageTitle = student ? `${student.name} - ${categoryName}` : `${categoryName} Testleri`;
  
   const handleDeleteTest = async (testId: string) => {
    try {
        await deleteTest(testId);
    } catch (error) {
        console.error("Error deleting test:", error);
    }
  };

  const pendingTests = filteredTests.filter(t => t.status === 'Atandı' || t.status === 'Değerlendirme Bekliyor');
  const completedTests = filteredTests.filter(t => t.status === 'Sonuçlandı');


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
      
        <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pending">Bekleyenler ({studentId ? pendingTests.length : Object.values(testsByStudent).flat().filter(t => t.status !== 'Sonuçlandı').length})</TabsTrigger>
                <TabsTrigger value="completed">Bitenler ({studentId ? completedTests.length : Object.values(testsByStudent).flat().filter(t => t.status === 'Sonuçlandı').length})</TabsTrigger>
            </TabsList>
            <TabsContent value="pending" className="mt-6">
                {studentId ? (
                    pendingTests.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {pendingTests.map((test) => {
                                 const allTopics = trackedBooks.flatMap(book => (book.subjects || []).flatMap(subject => subject.topics || []));
                                 const topicName = allTopics.find(t => t.id === test.topicId)?.name;
                                return <SingleStudentTestCard key={test.id} test={test} topicName={topicName} />
                            })}
                        </div>
                    ) : (
                        <Card><CardContent className="p-8 text-center text-muted-foreground">Bekleyen sınav bulunmuyor.</CardContent></Card>
                    )
                ) : (
                    <Accordion type="multiple" className="w-full space-y-2">
                         {Object.entries(testsByStudent).map(([sId, studentTests]) => {
                             const studentForTest = familyMembers.find(m => m.id === sId);
                             const pending = studentTests.filter(t => t.status !== 'Sonuçlandı');
                             if(pending.length === 0) return null;
                             return (
                                <AccordionItem key={sId} value={sId}>
                                    <AccordionTrigger className="p-3 bg-muted/50 rounded-t-lg text-lg font-semibold">{studentForTest?.name} ({pending.length})</AccordionTrigger>
                                    <AccordionContent className="p-2 space-y-2">
                                        {pending.map(test => <ManagementTestCard key={test.id} test={test} student={studentForTest} onDelete={handleDeleteTest} />)}
                                    </AccordionContent>
                                </AccordionItem>
                             )
                         })}
                    </Accordion>
                )}
            </TabsContent>
            <TabsContent value="completed" className="mt-6">
                {studentId ? (
                     completedTests.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {completedTests.map((test) => {
                                const allTopics = trackedBooks.flatMap(book => (book.subjects || []).flatMap(subject => subject.topics || []));
                                const topicName = allTopics.find(t => t.id === test.topicId)?.name;
                                return <SingleStudentTestCard key={test.id} test={test} topicName={topicName} />
                            })}
                        </div>
                    ) : (
                        <Card><CardContent className="p-8 text-center text-muted-foreground">Henüz tamamlanmış sınav bulunmuyor.</CardContent></Card>
                    )
                ) : (
                     <Accordion type="multiple" className="w-full space-y-2">
                         {Object.entries(testsByStudent).map(([sId, studentTests]) => {
                             const studentForTest = familyMembers.find(m => m.id === sId);
                             const completed = studentTests.filter(t => t.status === 'Sonuçlandı');
                             if(completed.length === 0) return null;
                             return (
                                <AccordionItem key={sId} value={sId}>
                                    <AccordionTrigger className="p-3 bg-muted/50 rounded-t-lg text-lg font-semibold">{studentForTest?.name} ({completed.length})</AccordionTrigger>
                                    <AccordionContent className="p-2 space-y-2">
                                        {completed.map(test => <ManagementTestCard key={test.id} test={test} student={studentForTest} onDelete={handleDeleteTest} />)}
                                    </AccordionContent>
                                </AccordionItem>
                             )
                         })}
                    </Accordion>
                )}
            </TabsContent>
        </Tabs>
    </div>
  );
}


function SingleStudentTestCard({ test, topicName }: { test: Test, topicName?: string }) {
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
    const duration = test.durationMinutes || test.questionCount * 1.5;
    const finalTitle = topicName ? `${topicName} - ${test.title}` : test.title;

    return (
        <Card key={test.id} className="flex flex-col shadow-sm overflow-hidden">
            <CardHeader>
                <div className="flex justify-between items-start gap-2">
                    <CardTitle title={finalTitle} className="line-clamp-2">{finalTitle}</CardTitle>
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

    const hexToRgba = (hex: string, alpha: number) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    
    const cardStyle = student ? { backgroundColor: hexToRgba(student.color, 0.15) } : {};

    return (
        <AccordionItem value={test.id} className="border bg-background rounded-md mb-2" style={cardStyle}>
            <AccordionTrigger className="p-4 hover:no-underline">
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

