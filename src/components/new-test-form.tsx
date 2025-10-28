
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { format, parse } from "date-fns";
import { tr } from "date-fns/locale";
import { CalendarIcon, Key, UploadCloud, Trash2 } from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Student, PracticeExam, Test, AnswerKey, GradingType, FamilyMember, QuickTestQuestion, BankQuestion, Mistake } from "@/lib/data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { AnswerKeyForm } from "./answer-key-form";
import { Combobox } from "./ui/combobox";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { migrateImage } from "@/ai/flows/migrate-image-flow";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "./ui/badge";
import { onPracticeExamsUpdate, onTestsUpdate, onMistakesUpdate } from "@/lib/dataService";
import { ScrollArea } from "./ui/scroll-area";
import { Checkbox } from "./ui/checkbox";

export type AssignmentType = "quick" | "exam" | "bank";

const formSchema = z.object({
  studentIds: z.array(z.string()).min(1, "En az bir öğrenci seçmelisiniz."),
  activeTab: z.enum(["quick", "exam", "bank"]),
  assignedDate: z.date().optional(),
  dueDate: z.date().optional(),

  // Quick Test Fields
  title: z.string().optional(),
  subject: z.string().optional(),
  questionCount: z.coerce.number().optional(),
  gradingType: z.enum(["auto", "manual"]).default("auto"),
  answerKey: z.record(z.string()).optional(),
  questions: z.array(z.object({
    questionId: z.string(),
    questionNumber: z.number(),
    imageUrl: z.string().url("Geçerli bir görsel URL'si girilmelidir."),
  })).optional(),
  
  // Bank/Exam Fields
  selectedBankQuestions: z.array(z.string()).optional(),
  examId: z.string().optional(),
}).refine((data) => {
    if (data.activeTab === 'quick' || data.activeTab === 'bank') return data.title && data.title.length >= 2;
    return true;
}, { message: "Test başlığı en az 2 karakter olmalıdır.", path: ["title"] })
.refine((data) => {
    if (data.activeTab === 'quick' || data.activeTab === 'bank') return !!data.subject;
    return true;
}, { message: "Lütfen bir ders seçin veya oluşturun.", path: ["subject"] })
.refine((data) => {
    if (data.activeTab === 'exam') return !!data.examId;
    return true;
}, { message: "Lütfen bir deneme sınavı seçin.", path: ["examId"] })
.refine((data) => {
    if (data.activeTab === 'bank' && (!data.selectedBankQuestions || data.selectedBankQuestions.length === 0)) return false;
    return true;
}, { message: "Lütfen soru bankasından en az bir soru seçin.", path: ["selectedBankQuestions"] })
.refine((data) => {
    if (data.assignedDate && data.dueDate) return data.dueDate >= data.assignedDate;
    return true;
}, { message: "Bitiş tarihi, başlangıç tarihinden önce olamaz.", path: ["dueDate"] });

type NewTestFormProps = {
  students: FamilyMember[];
  bankQuestions: BankQuestion[];
  onAssign: (test: Omit<Test, 'id' | 'status' | 'familyId' | 'isArchived'>, questions?: (QuickTestQuestion | BankQuestion)[]) => void;
  initialData?: Test | null;
  availableSubjects: string[];
  onSubjectCreated: (subject: string) => void;
  availableTopics: string[];
  onTopicCreated: (topic: string) => void;
};

export function NewTestForm({ students, bankQuestions, onAssign, initialData, availableSubjects, onSubjectCreated, availableTopics, onTopicCreated }: NewTestFormProps) {
  const [isAnswerKeyDialogOpen, setIsAnswerKeyDialogOpen] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [allTests, setAllTests] = React.useState<Test[]>([]);
  const [practiceExams, setPracticeExams] = React.useState<PracticeExam[]>([]);
  
  // State for bank question filtering
  const [bankSubjectFilter, setBankSubjectFilter] = React.useState<string>("");
  const [bankTopicFilter, setBankTopicFilter] = React.useState<string>("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    shouldUnregister: false,
    defaultValues: {
      studentIds: initialData?.studentId ? [initialData.studentId] : [],
      activeTab: initialData?.sourceType === 'exam' ? 'exam' : (initialData?.sourceType === 'bank' ? 'bank' : 'quick'),
      title: initialData?.title || "",
      subject: initialData?.subject || "",
      questionCount: initialData?.questionCount || 0,
      gradingType: 'auto',
      answerKey: initialData?.answerKey || {},
      questions: initialData?.questions || [],
      selectedBankQuestions: initialData?.sourceType === 'bank' ? (initialData.questions || []).map(q => q.questionId) : [],
      examId: initialData?.sourceType === 'exam' ? initialData.sourceId : undefined,
      assignedDate: initialData?.assignedDate ? parse(initialData.assignedDate, 'dd MMMM yyyy', new Date(), { locale: tr }) : new Date(),
      dueDate: initialData?.dueDate ? parse(initialData.dueDate, 'dd MMMM yyyy', new Date(), { locale: tr }) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "questions",
  });
  
  React.useEffect(() => {
    const unsubTests = onTestsUpdate(setAllTests);
    const unsubExams = onPracticeExamsUpdate(setPracticeExams);
    return () => {
      unsubTests();
      unsubExams();
    }
  }, []);

  const activeTab = form.watch("activeTab");
  const gradingType = form.watch("gradingType");
  const questions = form.watch("questions") || [];
  const selectedStudentIds = form.watch("studentIds");
  const selectedBankQuestions = form.watch("selectedBankQuestions") || [];
  
  const handleTabChange = (value: string) => {
    form.setValue('activeTab', value as "quick" | "exam" | "bank");
  };
  
   const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    toast({ title: 'Görseller Yükleniyor...', description: 'Bu işlem biraz zaman alabilir.' });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.readAsDataURL(file);
      await new Promise<void>(resolve => {
        reader.onload = async () => {
          const imageDataUri = reader.result as string;
          try {
            const destinationPath = `test-questions/${Date.now()}-${file.name}`;
            const migrationResult = await migrateImage({ imageDataUri, destinationPath });
            if (migrationResult.success && migrationResult.newUrl) {
              append({
                questionId: `${fields.length + i + 1}`, // temp id
                questionNumber: fields.length + i + 1,
                imageUrl: migrationResult.newUrl,
              });
            } else {
               toast({ title: "Görsel Yükleme Hatası", description: migrationResult.error, variant: "destructive" });
            }
          } catch(e) {
             toast({ title: "Görsel Yükleme Hatası", variant: "destructive" });
          }
          resolve();
        };
      });
    }
     if (event.target) {
      event.target.value = ''; // Reset file input
    }
  };


  React.useEffect(() => {
    if (students.length === 1 && !initialData) {
      form.setValue("studentIds", [students[0].id]);
    }
  }, [students, form, initialData]);
  
  React.useEffect(() => {
    if (activeTab === 'quick') {
      form.setValue('questionCount', questions.length);
    } else if (activeTab === 'bank') {
      form.setValue('questionCount', selectedBankQuestions.length);
    }
  }, [questions, selectedBankQuestions, form, activeTab]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    const assignedDate = values.assignedDate ? format(values.assignedDate, 'dd MMMM yyyy', { locale: tr }) : format(new Date(), 'dd MMMM yyyy', { locale: tr });
    const dueDate = values.dueDate ? format(values.dueDate, 'dd MMMM yyyy', { locale: tr }) : format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'dd MMMM yyyy', { locale: tr });
    
    values.studentIds.forEach(studentId => {
      let testData: Omit<Test, 'id' | 'status' | 'familyId' | 'isArchived'>;
      let questionsForSubcollection: (QuickTestQuestion | BankQuestion)[] | undefined = undefined;

      switch (values.activeTab) {
        case 'quick':
          testData = {
            title: values.title!,
            subject: values.subject!,
            studentId: studentId,
            questionCount: values.questions?.length || 0,
            assignedDate, dueDate,
            sourceType: 'quick',
            gradingType: 'auto',
            answerKey: values.answerKey,
            questions: values.questions,
          };
          questionsForSubcollection = values.questions;
          break;
        
        case 'bank':
          const selectedQuestionsFromBank = (values.selectedBankQuestions || []).map(qId => bankQuestions.find(bq => bq.id === qId)).filter((q): q is BankQuestion => !!q);
          
          testData = {
            title: values.title!,
            subject: values.subject!,
            studentId: studentId,
            questionCount: selectedQuestionsFromBank.length,
            assignedDate, dueDate,
            sourceType: 'bank',
          };
          questionsForSubcollection = selectedQuestionsFromBank;
          break;

        case 'exam':
          const selectedExam = practiceExams.find(e => e.id === values.examId);
          if (!selectedExam) return;
          testData = {
            title: selectedExam.name,
            subject: 'Deneme Sınavı',
            studentId: studentId,
            questionCount: selectedExam.subjects?.reduce((acc, s) => acc + s.questionCount, 0) || (selectedExam.questions || []).length || 0,
            assignedDate, dueDate,
            sourceType: 'exam',
            sourceId: selectedExam.id,
            gradingType: selectedExam.gradingType,
            answerKey: selectedExam.answerKey,
            questions: selectedExam.questions,
          };
          break;

        default:
          toast({ title: "Geçersiz seçim", description: "Lütfen geçerli bir ödev türü seçin.", variant: "destructive" });
          return;
      }
      
      onAssign(testData, questionsForSubcollection);
    });
  }
  
  const subjectOptions = availableSubjects.map(s => ({ label: s, value: s }));

  const filteredBankQuestions = React.useMemo(() => {
    return bankQuestions.filter(q => {
      const subjectMatch = !bankSubjectFilter || q.subject === bankSubjectFilter;
      const topicMatch = !bankTopicFilter || q.topic === bankTopicFilter;
      return subjectMatch && topicMatch;
    });
  }, [bankQuestions, bankSubjectFilter, bankTopicFilter]);

  const bankTopicsOptions = React.useMemo(() => {
    if (!bankSubjectFilter) return [];
    const topics = new Set(bankQuestions.filter(q => q.subject === bankSubjectFilter).map(q => q.topic));
    return Array.from(topics).map(t => ({ label: t, value: t }));
  }, [bankQuestions, bankSubjectFilter]);


  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="bank" disabled={!!initialData}>Soru Bankası</TabsTrigger>
        <TabsTrigger value="quick" disabled={!!initialData}>Hızlı Test</TabsTrigger>
        <TabsTrigger value="exam" disabled={!!initialData}>Deneme Sınavı</TabsTrigger>
      </TabsList>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
           <FormField
              control={form.control}
              name="studentIds"
              render={() => (
                <FormItem>
                  <FormLabel>Öğrenci(ler)</FormLabel>
                  {students.map((student) => (
                    <FormField
                      key={student.id}
                      control={form.control}
                      name="studentIds"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={student.id}
                            className="flex flex-row items-start space-x-3 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(student.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...(field.value || []), student.id])
                                    : field.onChange(
                                        field.value?.filter(
                                          (value) => value !== student.id
                                        )
                                      )
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">
                              {student.name}
                            </FormLabel>
                          </FormItem>
                        )
                      }}
                    />
                  ))}
                  <FormMessage />
                </FormItem>
              )}
            />
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="assignedDate" render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Başlangıç Tarihi</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: tr }) : <span>Tarih seçin</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="dueDate" render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Bitiş Tarihi</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: tr }) : <span>Tarih seçin</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => form.getValues('assignedDate') ? date < form.getValues('assignedDate')! : false} initialFocus/></PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )} />
          </div>

           <TabsContent value="bank" className="space-y-4 m-0">
             <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem><FormLabel>Test Başlığı</FormLabel><FormControl><Input placeholder="Örn: Rasyonel Sayılar Değerlendirme" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
             <FormField control={form.control} name="subject" render={({ field }) => (
                <FormItem><FormLabel>Ders</FormLabel><Combobox options={subjectOptions} value={field.value || ""} onChange={field.onChange} onCreate={onSubjectCreated} placeholder="Ders seç..." notfoundText="Ders bulunamadı." createText="Yeni ders oluştur:" /><FormMessage /></FormItem>
            )} />

             <div className="p-4 border rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Soru Seçimi</h3>
                 <div className="grid grid-cols-2 gap-4 mb-4">
                    <Select value={bankSubjectFilter} onValueChange={(value) => {setBankSubjectFilter(value === 'all' ? '' : value); setBankTopicFilter('');}}>
                        <SelectTrigger><SelectValue placeholder="Derse göre filtrele"/></SelectTrigger>
                        <SelectContent><SelectItem value="all">Tüm Dersler</SelectItem>{availableSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={bankTopicFilter} onValueChange={(value) => setBankTopicFilter(value === 'all' ? '' : value)} disabled={!bankSubjectFilter}>
                        <SelectTrigger><SelectValue placeholder="Konuya göre filtrele"/></SelectTrigger>
                        <SelectContent><SelectItem value="all">Tüm Konular</SelectItem>{bankTopicsOptions.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                 <FormField
                    control={form.control}
                    name="selectedBankQuestions"
                    render={({ field }) => (
                        <FormItem>
                             <ScrollArea className="h-72">
                                <div className="space-y-2 pr-4">
                                {filteredBankQuestions.map(q => (
                                    <div key={q.id} className="flex items-center gap-2 p-2 border rounded-md">
                                        <Checkbox 
                                            checked={field.value?.includes(q.id)}
                                            onCheckedChange={(checked) => {
                                                return checked 
                                                    ? field.onChange([...(field.value || []), q.id])
                                                    : field.onChange(field.value?.filter(v => v !== q.id))
                                            }}
                                        />
                                        <Image src={q.imageUrl} alt={q.topic} width={60} height={40} className="rounded-sm border object-contain aspect-video" data-ai-hint="question paper" />
                                        <div className="flex-grow">
                                            <p className="font-medium text-sm">{q.topic}</p>
                                            <p className="text-xs text-muted-foreground">{q.subject}</p>
                                        </div>
                                        <Badge variant={q.type === 'open_ended' ? 'outline' : 'secondary'}>{q.type === 'open_ended' ? 'Açık Uçlu' : `${Object.keys(q.options || {}).length} şık`}</Badge>
                                    </div>
                                ))}
                                </div>
                            </ScrollArea>
                             <FormMessage />
                        </FormItem>
                    )}
                 />
            </div>
           </TabsContent>

          <TabsContent value="quick" className="space-y-4 m-0">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem><FormLabel>Test Başlığı</FormLabel><FormControl><Input placeholder="Örn: 2. Dönem Genel Tekrar" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            
             <FormField control={form.control} name="subject" render={({ field }) => (
                <FormItem><FormLabel>Ders</FormLabel><Combobox options={subjectOptions} value={field.value || ""} onChange={field.onChange} onCreate={onSubjectCreated} placeholder="Ders seç..." notfoundText="Ders bulunamadı." createText="Yeni ders oluştur:" /><FormMessage /></FormItem>
            )} />
             
             <div className="space-y-2">
                <FormLabel>Sorular ({questions.length} adet)</FormLabel>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {fields.map((field, index) => (
                        <div key={field.id} className="relative group">
                             <Badge className="absolute top-1 left-1 z-10">Soru {index + 1}</Badge>
                            <Image src={(field as any).imageUrl} alt={`Soru ${index + 1}`} width={100} height={100} className="w-full h-auto object-contain rounded-md border" data-ai-hint="question paper" />
                            <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => remove(index)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
                <Button type="button" variant="outline" size="sm" className="w-full" onClick={handleImageUpload}>
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Soru Resimleri Yükle
                </Button>
                <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    multiple
                />
            </div>
            
            <Dialog open={isAnswerKeyDialogOpen} onOpenChange={setIsAnswerKeyDialogOpen}>
              <DialogTrigger asChild><Button type="button" variant="secondary" disabled={questions.length === 0}><Key className="mr-2 h-4 w-4"/>Cevap Anahtarını Düzenle ({Object.keys(form.getValues('answerKey') || {}).length} / {questions.length})</Button></DialogTrigger>
              <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Cevap Anahtarı</DialogTitle><DialogDescription>{form.getValues('title')} için cevapları girin. Toplam {questions.length} soru.</DialogDescription></DialogHeader>
                <AnswerKeyForm totalQuestions={questions.length} answerKey={form.getValues('answerKey') || {}} onSave={(newKey: AnswerKey) => { form.setValue('answerKey', newKey); setIsAnswerKeyDialogOpen(false); }} />
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="exam" className="space-y-4 m-0">
             <FormField control={form.control} name="examId" render={({ field }) => (
                <FormItem><FormLabel>Deneme Sınavı</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!selectedStudentIds}>
                  <FormControl><SelectTrigger><SelectValue placeholder={"Bir deneme sınavı seçin"} /></SelectTrigger></FormControl>
                  <SelectContent>{practiceExams.map((exam) => (<SelectItem key={exam.id} value={exam.id}>{exam.name}</SelectItem>))}</SelectContent>
                </Select><FormMessage /></FormItem>
             )} />
          </TabsContent>
          
          <Button type="submit" className="w-full">{initialData ? 'Ödevi Güncelle' : `Ödevi Ata`}</Button>
        </form>
      </Form>
    </Tabs>
  );
}

    