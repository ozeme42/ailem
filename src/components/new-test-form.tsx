
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Student, QuestionBank, PracticeExam, Test, AnswerKey, GradingType, FamilyMember } from "@/lib/data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { AnswerKeyForm } from "./answer-key-form";
import { Key } from "lucide-react";
import { Combobox } from "./ui/combobox";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";

const formSchema = z.object({
  studentId: z.string({ required_error: "Lütfen bir öğrenci seçin." }),
  
  // Quick Test
  title: z.string().optional(),
  subject: z.string().optional(),
  questionCount: z.coerce.number().optional(),
  gradingType: z.enum(["auto", "manual-text", "manual"]).default("manual-text"),
  answerKey: z.record(z.string()).optional(),

  // Bank
  bankId: z.string().optional(),
  topicId: z.string().optional(),

  // Exam
  examId: z.string().optional(),

  // Dates
  assignedDate: z.date().optional(),
  dueDate: z.date().optional(),
}).refine((data) => {
    if (data.assignedDate && data.dueDate) {
        return data.dueDate >= data.assignedDate;
    }
    return true;
}, {
    message: "Bitiş tarihi, başlangıç tarihinden önce olamaz.",
    path: ["dueDate"],
});


export type AssignmentType = "quick" | "bank" | "exam";

type NewTestFormProps = {
  students: FamilyMember[];
  questionBanks: QuestionBank[];
  practiceExams: PracticeExam[];
  onAssign: (test: Omit<Test, 'id' | 'status' | 'familyId'>, id?: string) => void;
  initialData?: Test | null;
  availableSubjects: string[];
  onSubjectCreated: (subject: string) => void;
};

export function NewTestForm({ students, questionBanks, practiceExams, onAssign, initialData, availableSubjects, onSubjectCreated }: NewTestFormProps) {
  const [activeTab, setActiveTab] = React.useState<AssignmentType>(initialData?.sourceType || "quick");
  const [selectedBankId, setSelectedBankId] = React.useState<string | null>(initialData?.sourceId || null);
  const [isAnswerKeyDialogOpen, setIsAnswerKeyDialogOpen] = React.useState(false);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    shouldUnregister: false,
    defaultValues: {
      studentId: initialData?.studentId || "",
      // Quick Test
      title: initialData?.sourceType === 'quick' ? initialData.title : "",
      subject: initialData?.sourceType === 'quick' ? initialData.subject : "",
      questionCount: initialData?.sourceType === 'quick' ? initialData.questionCount : 20,
      gradingType: initialData?.sourceType === 'quick' ? initialData.gradingType : "manual-text",
      answerKey: initialData?.sourceType === 'quick' ? initialData.answerKey : {},
      // Bank Test
      bankId: initialData?.sourceType === 'bank' ? initialData.sourceId : "",
      topicId: initialData?.sourceType === 'bank' ? initialData.topicId : "",
      // Exam Test
      examId: initialData?.sourceType === 'exam' ? initialData.sourceId : "",
      assignedDate: initialData?.assignedDate ? new Date(initialData.assignedDate) : undefined,
      dueDate: initialData?.dueDate ? new Date(initialData.dueDate) : undefined,
    },
  });

  React.useEffect(() => {
    if (initialData) {
      setActiveTab(initialData.sourceType);
      setSelectedBankId(initialData.sourceId || null);
      form.reset({
        studentId: initialData.studentId,
        title: initialData.sourceType === 'quick' ? initialData.title : "",
        subject: initialData.sourceType === 'quick' ? initialData.subject : "",
        questionCount: initialData.sourceType === 'quick' ? initialData.questionCount : 20,
        gradingType: initialData.gradingType || "manual",
        answerKey: initialData.answerKey || {},
        bankId: initialData.sourceType === 'bank' ? initialData.sourceId : "",
        topicId: initialData.sourceType === 'bank' ? initialData.topicId : "",
        examId: initialData.sourceType === 'exam' ? initialData.sourceId : "",
        assignedDate: initialData.assignedDate ? new Date(initialData.assignedDate) : undefined,
        dueDate: initialData.dueDate ? new Date(initialData.dueDate) : undefined,
      });
    } else {
      setActiveTab('quick');
      setSelectedBankId(null);
      form.reset({
          studentId: "",
          questionCount: 20,
          title: "",
          subject: "",
          gradingType: "manual-text",
          answerKey: {},
          bankId: "",
          topicId: "",
          examId: "",
          assignedDate: undefined,
          dueDate: undefined,
      });
    }
  }, [initialData, form]);

  const gradingType = form.watch("gradingType");
  const questionCount = form.watch("questionCount") || 0;

  function onSubmit(values: z.infer<typeof formSchema>) {
    const assignedDate = values.assignedDate ? format(values.assignedDate, 'dd MMMM yyyy', { locale: tr }) : format(new Date(), 'dd MMMM yyyy', { locale: tr });
    const dueDate = values.dueDate ? format(values.dueDate, 'dd MMMM yyyy', { locale: tr }) : format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'dd MMMM yyyy', { locale: tr }); // 1 week from now
    
    let newTest: Omit<Test, 'id' | 'status' | 'familyId'> | null = null;
    
    const currentActiveTab = initialData?.sourceType || activeTab;

    if (currentActiveTab === 'quick' && values.title && values.subject && values.questionCount) {
        newTest = {
            title: values.title,
            subject: values.subject,
            studentId: values.studentId,
            questionCount: values.questionCount,
            assignedDate: initialData?.assignedDate || assignedDate,
            dueDate: initialData?.dueDate || dueDate,
            sourceType: 'quick',
            gradingType: values.gradingType,
            answerKey: values.gradingType === 'auto' ? values.answerKey : undefined,
        }
    } else if (currentActiveTab === 'bank' && values.bankId && values.topicId) {
        const bank = questionBanks.find(b => b.id.toString() === values.bankId);
        const topic = bank?.subjects.flatMap(s => s.topics).find(t => t.id.toString() === values.topicId);
        if (bank && topic) {
             newTest = {
                title: `${bank.name} - ${topic.name}`,
                subject: bank.subjects.find(s => s.topics.some(t => t.id === topic.id))?.name || "Ders", // find subject name
                studentId: values.studentId,
                questionCount: topic.questionCount,
                assignedDate: initialData?.assignedDate || assignedDate,
                dueDate: initialData?.dueDate || dueDate,
                sourceType: 'bank',
                sourceId: bank.id,
                topicId: topic.id.toString(),
                gradingType: topic.gradingType
            }
        }
    } else if (currentActiveTab === 'exam' && values.examId) {
        const exam = practiceExams.find(e => e.id.toString() === values.examId);
        if (exam) {
            newTest = {
                title: exam.name,
                subject: "Deneme Sınavı",
                studentId: values.studentId,
                questionCount: exam.subjects.reduce((acc, s) => acc + s.questionCount, 0),
                assignedDate: initialData?.assignedDate || assignedDate,
                dueDate: initialData?.dueDate || dueDate,
                sourceType: 'exam',
                sourceId: exam.id,
                gradingType: exam.gradingType,
                answerKey: exam.answerKey,
            }
        }
    }
    
    if (newTest) {
      onAssign(newTest, initialData?.id);
    }
  }
  
  const selectedBank = questionBanks.find(b => b.id.toString() === selectedBankId);
  const subjectOptions = availableSubjects.map(s => ({ label: s, value: s }));

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AssignmentType)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="quick" disabled={!!initialData && initialData.sourceType !== 'quick'}>Hızlı Test</TabsTrigger>
            <TabsTrigger value="bank" disabled={!!initialData && initialData.sourceType !== 'bank'}>Soru Bankası</TabsTrigger>
            <TabsTrigger value="exam" disabled={!!initialData && initialData.sourceType !== 'exam'}>Deneme</TabsTrigger>
        </TabsList>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                 <FormField
                    control={form.control}
                    name="studentId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Öğrenci</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Öğrenci seçin" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {students.map((student) => (
                            <SelectItem key={student.id} value={student.id.toString()}>
                                {student.name}
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="assignedDate"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                <FormLabel>Başlangıç Tarihi (Opsiyonel)</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                        {field.value ? format(field.value, "PPP", { locale: tr }) : <span>Tarih seçin</span>}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="dueDate"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                <FormLabel>Bitiş Tarihi (Opsiyonel)</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                        {field.value ? format(field.value, "PPP", { locale: tr }) : <span>Tarih seçin</span>}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => form.getValues('assignedDate') ? date < form.getValues('assignedDate')! : false} initialFocus/>
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                <TabsContent value="quick" className="space-y-4 m-0">
                    <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Test Başlığı</FormLabel>
                        <FormControl>
                            <Input placeholder="Örn: 2. Dönem Genel Tekrar" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="subject"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Ders</FormLabel>
                                <Combobox
                                    options={subjectOptions}
                                    value={field.value || ""}
                                    onChange={field.onChange}
                                    onCreate={onSubjectCreated}
                                    placeholder="Ders seç..."
                                    notfoundText="Ders bulunamadı."
                                    createText="Yeni ders oluştur:"
                                />
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="questionCount"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Soru Sayısı</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="20" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                    </div>
                     <FormField
                        control={form.control}
                        name="gradingType"
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                            <FormLabel>Değerlendirme Tipi</FormLabel>
                            <FormControl>
                                <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value}
                                className="flex flex-col space-y-1"
                                >
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                    <RadioGroupItem value="auto" />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                    Otomatik Kontrol (Çoktan Seçmeli)
                                    </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                    <RadioGroupItem value="manual-text" />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                    Manuel Kontrol (Açık Uçlu)
                                    </FormLabel>
                                </FormItem>
                                 <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                    <RadioGroupItem value="manual" />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                    Cevap Gerekmiyor (Manuel Kontrol)
                                    </FormLabel>
                                </FormItem>
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    {gradingType === 'auto' && (
                        <Dialog open={isAnswerKeyDialogOpen} onOpenChange={setIsAnswerKeyDialogOpen}>
                            <DialogTrigger asChild>
                            <Button type="button" variant="secondary" disabled={questionCount === 0}>
                                <Key className="mr-2 h-4 w-4"/>
                                Cevap Anahtarını Düzenle ({Object.keys(form.getValues('answerKey') || {}).length} / {questionCount})
                            </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>Cevap Anahtarı</DialogTitle>
                                    <DialogDescription>
                                        {form.getValues('title')} için cevapları girin. Toplam {questionCount} soru.
                                    </DialogDescription>
                                </DialogHeader>
                                <AnswerKeyForm
                                    totalQuestions={questionCount}
                                    answerKey={form.getValues('answerKey') || {}}
                                    onSave={(newKey: AnswerKey) => {
                                        form.setValue('answerKey', newKey);
                                        setIsAnswerKeyDialogOpen(false);
                                    }}
                                />
                            </DialogContent>
                        </Dialog>
                    )}
                </TabsContent>

                <TabsContent value="bank" className="space-y-4 m-0">
                    <FormField
                        control={form.control}
                        name="bankId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Soru Bankası</FormLabel>
                            <Select onValueChange={(value) => { field.onChange(value); setSelectedBankId(value); form.resetField('topicId'); }} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Soru bankası seçin" /></SelectTrigger></FormControl>
                            <SelectContent>
                                {questionBanks.map((bank) => (
                                <SelectItem key={bank.id} value={bank.id.toString()}>{bank.name}</SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    {selectedBank && (
                        <FormField
                            control={form.control}
                            name="topicId"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Konu</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Konu seçin" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {selectedBank.subjects.map(subject => 
                                        subject.topics.map(topic => (
                                            <SelectItem key={topic.id} value={topic.id.toString()}>
                                                {subject.name} - {topic.name} ({topic.questionCount} soru)
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    )}
                </TabsContent>

                <TabsContent value="exam" className="space-y-4 m-0">
                     <FormField
                        control={form.control}
                        name="examId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Deneme Sınavı</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Deneme seçin" /></SelectTrigger></FormControl>
                            <SelectContent>
                                {practiceExams.map((exam) => (
                                <SelectItem key={exam.id} value={exam.id.toString()}>{exam.name}</SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormDescription>
                        Seçilen deneme sınavı öğrenciye atanacaktır.
                    </FormDescription>
                </TabsContent>
                
                <Button type="submit" className="w-full">{initialData ? 'Ödevi Güncelle' : 'Ödevi Ata'}</Button>
            </form>
        </Form>
    </Tabs>
  );
}

    