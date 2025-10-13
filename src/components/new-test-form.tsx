

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
import type { Student, PracticeExam, Test, AnswerKey, GradingType, FamilyMember, QuickTestQuestion, BankQuestion } from "@/lib/data";
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
import { onTestsUpdate } from "@/lib/dataService";

export type AssignmentType = "quick" | "bank" | "exam" | "mistake";

const formSchema = z.object({
  studentId: z.string({ required_error: "Lütfen bir öğrenci seçin." }),
  activeTab: z.enum(["quick", "bank", "exam", "mistake"]),
  assignedDate: z.date().optional(),
  dueDate: z.date().optional(),

  // Quick & Mistake Test Fields
  title: z.string().optional(),
  subject: z.string().optional(),
  questionCount: z.coerce.number().optional(),
  gradingType: z.enum(["auto", "manual-text", "manual"]).default("manual-text"),
  answerKey: z.record(z.string()).optional(),
  questions: z.array(z.object({
    questionNumber: z.number(),
    imageUrl: z.string().url("Geçerli bir görsel URL'si girilmelidir."),
  })).optional(),
  
  // For Mistake Test
  sourceTestId: z.string().optional(),

  // Bank/Exam Fields
  bankId: z.string().optional(),
  topicId: z.string().optional(),
  examId: z.string().optional(),
}).refine((data) => {
    if (data.activeTab === 'quick' || data.activeTab === 'mistake') return data.title && data.title.length >= 2;
    return true;
}, { message: "Test başlığı en az 2 karakter olmalıdır.", path: ["title"] })
.refine((data) => {
    if (data.activeTab === 'quick' || data.activeTab === 'mistake') return !!data.subject;
    return true;
}, { message: "Lütfen bir ders seçin veya oluşturun.", path: ["subject"] })
.refine((data) => {
    if (data.activeTab === 'bank') return !!data.bankId && !!data.topicId;
    return true;
}, { message: "Lütfen bir soru bankası ve konu seçin.", path: ["topicId"] })
.refine((data) => {
    if (data.activeTab === 'exam') return !!data.examId;
    return true;
}, { message: "Lütfen bir deneme sınavı seçin.", path: ["examId"] })
.refine((data) => {
    if (data.activeTab === 'mistake') return !!data.sourceTestId;
    return true;
}, { message: "Lütfen bir referans test seçin.", path: ["sourceTestId"] })
.refine((data) => {
    if (data.assignedDate && data.dueDate) return data.dueDate >= data.assignedDate;
    return true;
}, { message: "Bitiş tarihi, başlangıç tarihinden önce olamaz.", path: ["dueDate"] });

type NewTestFormProps = {
  students: FamilyMember[];
  bankQuestions: BankQuestion[];
  onAssign: (test: Omit<Test, 'id' | 'status' | 'familyId' | 'isArchived'>, id?: string) => void;
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    shouldUnregister: false,
    defaultValues: {
      studentId: initialData?.studentId || undefined,
      activeTab: initialData?.sourceType || 'quick',
      title: initialData?.title || "",
      subject: initialData?.subject || "",
      questionCount: initialData?.questionCount || 0,
      gradingType: initialData?.gradingType || "manual-text",
      answerKey: initialData?.answerKey || {},
      questions: initialData?.questions || [],
      sourceTestId: initialData?.sourceType === 'mistake' ? initialData.sourceId : undefined,
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
    return () => unsubTests();
  }, []);

  const activeTab = form.watch("activeTab");
  const gradingType = form.watch("gradingType");
  const questions = form.watch("questions") || [];
  const selectedStudentId = form.watch("studentId");
  
  const studentCompletedTests = React.useMemo(() => {
    return allTests.filter(t => t.studentId === selectedStudentId && t.status === 'Sonuçlandı');
  }, [allTests, selectedStudentId]);

  
  const handleTabChange = (value: AssignmentType) => {
    form.setValue('activeTab', value);
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
      form.setValue("studentId", students[0].id);
    }
  }, [students, form, initialData]);
  
  React.useEffect(() => {
    form.setValue('questionCount', questions.length);
  }, [questions, form]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    const assignedDate = values.assignedDate ? format(values.assignedDate, 'dd MMMM yyyy', { locale: tr }) : format(new Date(), 'dd MMMM yyyy', { locale: tr });
    const dueDate = values.dueDate ? format(values.dueDate, 'dd MMMM yyyy', { locale: tr }) : format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'dd MMMM yyyy', { locale: tr });
    
    let testData: Omit<Test, 'id' | 'status' | 'familyId' | 'isArchived'>;

    switch (values.activeTab) {
      case 'quick':
      case 'mistake':
        testData = {
          title: values.title!,
          subject: values.subject!,
          studentId: values.studentId,
          questionCount: values.questions?.length || 0,
          assignedDate, dueDate,
          sourceType: values.activeTab,
          sourceId: values.activeTab === 'mistake' ? values.sourceTestId : undefined,
          gradingType: values.gradingType,
          answerKey: values.gradingType === 'auto' ? values.answerKey : {},
          questions: values.questions,
        };
        break;
      
      case 'bank':
        const selectedQuestions = bankQuestions.filter(q => (values.topicId || []).includes(q.id));
        if (selectedQuestions.length === 0) return;
        const firstQuestion = selectedQuestions[0];
        testData = {
          title: `${firstQuestion.subject} - ${firstQuestion.topic} Testi`,
          subject: firstQuestion.subject,
          studentId: values.studentId,
          questionCount: selectedQuestions.length,
          assignedDate, dueDate,
          sourceType: 'quick', // Treat as quick test with pre-filled questions
          gradingType: 'auto',
          answerKey: selectedQuestions.reduce((acc, q, index) => {
              acc[(index + 1).toString()] = q.correctAnswer;
              return acc;
          }, {} as AnswerKey),
          questions: selectedQuestions.map((q, index) => ({
              questionId: q.id,
              questionNumber: index + 1,
              imageUrl: q.imageUrl,
          })),
        };
        break;

      case 'exam':
        return;
      
      default:
        return;
    }
    
    onAssign(testData, initialData?.id);
  }
  
  const subjectOptions = availableSubjects.map(s => ({ label: s, value: s }));
  const topicOptions = availableTopics.map(t => ({ label: t, value: t }));

  return (
    <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as AssignmentType)} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="quick" disabled={!!initialData}>Hızlı</TabsTrigger>
        <TabsTrigger value="bank" disabled={!!initialData}>Banka</TabsTrigger>
        <TabsTrigger value="exam" disabled={!!initialData}>Deneme</TabsTrigger>
        <TabsTrigger value="mistake" disabled={!!initialData}>Yanlışlarım</TabsTrigger>
      </TabsList>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <FormField
            control={form.control}
            name="studentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Öğrenci</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ''}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Öğrenci seçin" /></SelectTrigger></FormControl>
                  <SelectContent>{students.map((student) => (<SelectItem key={student.id} value={student.id}>{student.name}</SelectItem>))}</SelectContent>
                </Select>
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
            
            <FormField control={form.control} name="gradingType" render={({ field }) => (
              <FormItem className="space-y-3"><FormLabel>Değerlendirme Tipi</FormLabel><FormControl>
                  <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                    <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="auto" /></FormControl><FormLabel className="font-normal">Otomatik Kontrol (Çoktan Seçmeli)</FormLabel></FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="manual-text" /></FormControl><FormLabel className="font-normal">Manuel Kontrol (Açık Uçlu)</FormLabel></FormItem>
                  </RadioGroup>
              </FormControl><FormMessage /></FormItem>
            )} />
            {gradingType === 'auto' && (
              <Dialog open={isAnswerKeyDialogOpen} onOpenChange={setIsAnswerKeyDialogOpen}>
                <DialogTrigger asChild><Button type="button" variant="secondary" disabled={questions.length === 0}><Key className="mr-2 h-4 w-4"/>Cevap Anahtarını Düzenle ({Object.keys(form.getValues('answerKey') || {}).length} / {questions.length})</Button></DialogTrigger>
                <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Cevap Anahtarı</DialogTitle><DialogDescription>{form.getValues('title')} için cevapları girin. Toplam {questions.length} soru.</DialogDescription></DialogHeader>
                  <AnswerKeyForm totalQuestions={questions.length} answerKey={form.getValues('answerKey') || {}} onSave={(newKey: AnswerKey) => { form.setValue('answerKey', newKey); setIsAnswerKeyDialogOpen(false); }} />
                </DialogContent>
              </Dialog>
            )}
          </TabsContent>

          <TabsContent value="bank" className="space-y-4 m-0">
             <FormField control={form.control} name="subject" render={({ field }) => (
                <FormItem><FormLabel>Ders</FormLabel><Combobox options={subjectOptions} value={field.value || ""} onChange={field.onChange} onCreate={onSubjectCreated} placeholder="Ders seç..." notfoundText="Ders bulunamadı." createText="Yeni ders oluştur:" /><FormMessage /></FormItem>
            )} />
             <FormField control={form.control} name="topicId" render={({ field }) => (
                <FormItem><FormLabel>Konu</FormLabel><Combobox options={topicOptions} value={field.value || ""} onChange={field.onChange} onCreate={onTopicCreated} placeholder="Konu seç..." notfoundText="Konu bulunamadı." createText="Yeni konu oluştur:" /><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="questionCount" render={({ field }) => (
              <FormItem><FormLabel>Soru Sayısı</FormLabel><FormControl><Input type="number" placeholder="20" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </TabsContent>

          <TabsContent value="exam" className="space-y-4 m-0">
            {/* Kept empty as per new design */}
            <p className="text-sm text-muted-foreground">Bu özellik yeni tasarımla kullanımdan kaldırılmıştır. Deneme sınavları için lütfen "Hızlı" test seçeneğini kullanın.</p>
          </TabsContent>
          
          <TabsContent value="mistake" className="space-y-4 m-0">
             <FormField control={form.control} name="sourceTestId" render={({ field }) => (
                <FormItem><FormLabel>Referans Test</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!selectedStudentId}>
                  <FormControl><SelectTrigger><SelectValue placeholder={!selectedStudentId ? "Önce öğrenci seçin" : "Referans alınacak testi seçin"} /></SelectTrigger></FormControl>
                  <SelectContent>{studentCompletedTests.map((test) => (<SelectItem key={test.id} value={test.id}>{test.title}</SelectItem>))}</SelectContent>
                </Select><FormMessage /></FormItem>
             )} />
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem><FormLabel>Test Başlığı</FormLabel><FormControl><Input placeholder="Örn: Matematik Yanlışlarım" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
             <FormField control={form.control} name="subject" render={({ field }) => (
                <FormItem><FormLabel>Ders</FormLabel><Combobox options={subjectOptions} value={field.value || ""} onChange={field.onChange} onCreate={onSubjectCreated} placeholder="Ders seç..." notfoundText="Ders bulunamadı." createText="Yeni ders oluştur:" /><FormMessage /></FormItem>
            )} />
             <div className="space-y-2">
                <FormLabel>Yanlış Soruların Resimleri ({questions.length} adet)</FormLabel>
                <Button type="button" variant="outline" size="sm" className="w-full" onClick={handleImageUpload}>
                    <UploadCloud className="mr-2 h-4 w-4" />Soru Resimleri Yükle
                </Button>
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} multiple />
            </div>
          </TabsContent>

          <Button type="submit" className="w-full">{initialData ? 'Ödevi Güncelle' : 'Ödevi Ata'}</Button>
        </form>
      </Form>
    </Tabs>
  );
}
