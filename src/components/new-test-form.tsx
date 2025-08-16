

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
import type { Student, QuestionBank, PracticeExam, Test, AnswerKey, GradingType, FamilyMember, QuickTestQuestion } from "@/lib/data";
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

export type AssignmentType = "quick" | "bank" | "exam";

const formSchema = z.object({
  studentId: z.string({ required_error: "Lütfen bir öğrenci seçin." }),
  activeTab: z.enum(["quick", "bank", "exam"]),
  assignedDate: z.date().optional(),
  dueDate: z.date().optional(),

  // Quick Test Fields
  title: z.string().optional(),
  subject: z.string().optional(),
  gradingType: z.enum(["auto", "manual-text", "manual"]).default("manual-text"),
  answerKey: z.record(z.string()).optional(),
  questions: z.array(z.object({
    questionNumber: z.number(),
    imageUrl: z.string().url("Geçerli bir görsel URL'si girilmelidir."),
  })).optional(),

  // Bank/Exam/Mistake Fields
  bankId: z.string().optional(),
  topicId: z.string().optional(),
  examId: z.string().optional(),
}).refine((data) => {
    if (data.activeTab === 'quick') return data.title && data.title.length >= 2;
    return true;
}, { message: "Test başlığı en az 2 karakter olmalıdır.", path: ["title"] })
.refine((data) => {
    if (data.activeTab === 'quick') return !!data.subject;
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
    if (data.assignedDate && data.dueDate) return data.dueDate >= data.assignedDate;
    return true;
}, { message: "Bitiş tarihi, başlangıç tarihinden önce olamaz.", path: ["dueDate"] });

type NewTestFormProps = {
  students: FamilyMember[];
  questionBanks: QuestionBank[];
  practiceExams: PracticeExam[];
  onAssign: (test: Omit<Test, 'id' | 'status' | 'familyId' | 'isArchived'>, id?: string) => void;
  initialData?: Test | null;
  availableSubjects: string[];
  onSubjectCreated: (subject: string) => void;
};

export function NewTestForm({ students, questionBanks, practiceExams, onAssign, initialData, availableSubjects, onSubjectCreated }: NewTestFormProps) {
  const [isAnswerKeyDialogOpen, setIsAnswerKeyDialogOpen] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    shouldUnregister: false,
    defaultValues: {
      studentId: initialData?.studentId || undefined,
      activeTab: initialData?.sourceType || 'quick',
      title: initialData?.title || "",
      subject: initialData?.subject || "",
      gradingType: initialData?.gradingType || "manual-text",
      answerKey: initialData?.answerKey || {},
      questions: initialData?.questions || [],
      bankId: initialData?.sourceType === 'bank' ? initialData.sourceId : undefined,
      topicId: initialData?.topicId || undefined,
      examId: initialData?.sourceType === 'exam' ? initialData.sourceId : undefined,
      assignedDate: initialData?.assignedDate ? parse(initialData.assignedDate, 'dd MMMM yyyy', new Date(), { locale: tr }) : new Date(),
      dueDate: initialData?.dueDate ? parse(initialData.dueDate, 'dd MMMM yyyy', new Date(), { locale: tr }) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  const activeTab = form.watch("activeTab");
  const bankId = form.watch("bankId");
  const gradingType = form.watch("gradingType");
  const questionCount = form.watch("questions")?.length || 0;
  
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
                questionNumber: fields.length + 1,
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


  function onSubmit(values: z.infer<typeof formSchema>) {
    const assignedDate = values.assignedDate ? format(values.assignedDate, 'dd MMMM yyyy', { locale: tr }) : format(new Date(), 'dd MMMM yyyy', { locale: tr });
    const dueDate = values.dueDate ? format(values.dueDate, 'dd MMMM yyyy', { locale: tr }) : format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'dd MMMM yyyy', { locale: tr });
    
    let testData: Omit<Test, 'id' | 'status' | 'familyId' | 'isArchived'>;

    switch (values.activeTab) {
      case 'quick':
        testData = {
          title: values.title!,
          subject: values.subject!,
          studentId: values.studentId,
          questionCount: values.questions?.length || 0,
          assignedDate, dueDate,
          sourceType: 'quick',
          gradingType: values.gradingType,
          answerKey: values.gradingType === 'auto' ? values.answerKey : {},
          questions: values.questions,
        };
        break;
      
      case 'bank':
        const bank = questionBanks.find(b => b.id === values.bankId);
        const topic = bank?.subjects.flatMap(s => s.topics).find(t => t.id.toString() === values.topicId);
        if (!bank || !topic) return; 
        const subjectName = bank.subjects.find(s => s.topics.some(t => t.id.toString() === values.topicId))?.name || "Ders";
        testData = {
          title: `${bank.name} - ${topic.name}`,
          subject: subjectName,
          studentId: values.studentId,
          questionCount: topic.questionCount,
          assignedDate, dueDate,
          sourceType: 'bank',
          sourceId: bank.id,
          topicId: topic.id.toString(),
          gradingType: topic.gradingType,
          answerKey: topic.answerKey,
        };
        break;

      case 'exam':
        const exam = practiceExams.find(e => e.id === values.examId);
        if (!exam) return;
        testData = {
          title: exam.name,
          subject: "Genel Deneme Sınavları",
          studentId: values.studentId,
          questionCount: exam.subjects.reduce((acc, s) => acc + s.questionCount, 0),
          assignedDate, dueDate,
          sourceType: 'exam',
          sourceId: exam.id,
          gradingType: exam.gradingType,
          answerKey: exam.answerKey,
        };
        break;
      
      default:
        return;
    }
    
    onAssign(testData, initialData?.id);
  }
  
  const selectedBank = questionBanks.find(b => b.id === bankId);
  const subjectOptions = availableSubjects.map(s => ({ label: s, value: s }));

  return (
    <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as AssignmentType)} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="quick" disabled={!!initialData}>Hızlı</TabsTrigger>
        <TabsTrigger value="bank" disabled={!!initialData}>Banka</TabsTrigger>
        <TabsTrigger value="exam" disabled={!!initialData}>Deneme</TabsTrigger>
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
                <FormLabel>Sorular</FormLabel>
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
                <DialogTrigger asChild><Button type="button" variant="secondary" disabled={questionCount === 0}><Key className="mr-2 h-4 w-4"/>Cevap Anahtarını Düzenle ({Object.keys(form.getValues('answerKey') || {}).length} / {questionCount})</Button></DialogTrigger>
                <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Cevap Anahtarı</DialogTitle><DialogDescription>{form.getValues('title')} için cevapları girin. Toplam {questionCount} soru.</DialogDescription></DialogHeader>
                  <AnswerKeyForm totalQuestions={questionCount} answerKey={form.getValues('answerKey') || {}} onSave={(newKey: AnswerKey) => { form.setValue('answerKey', newKey); setIsAnswerKeyDialogOpen(false); }} />
                </DialogContent>
              </Dialog>
            )}
          </TabsContent>

          <TabsContent value="bank" className="space-y-4 m-0">
            <FormField control={form.control} name="bankId" render={({ field }) => (
              <FormItem><FormLabel>Soru Bankası</FormLabel><Select onValueChange={(value) => { field.onChange(value); form.resetField('topicId'); }} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Soru bankası seçin" /></SelectTrigger></FormControl>
                  <SelectContent>{questionBanks.map((bank) => (<SelectItem key={bank.id} value={bank.id}>{bank.name}</SelectItem>))}</SelectContent>
                </Select><FormMessage /></FormItem>
            )} />
            {selectedBank && (
              <FormField control={form.control} name="topicId" render={({ field }) => (
                <FormItem><FormLabel>Konu</FormLabel><Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Konu seçin" /></SelectTrigger></FormControl>
                    <SelectContent>{selectedBank.subjects.map(subject => subject.topics.map(topic => (<SelectItem key={topic.id} value={topic.id.toString()}>{subject.name} - {topic.name} ({topic.questionCount} soru)</SelectItem>)))}</SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
            )}
          </TabsContent>

          <TabsContent value="exam" className="space-y-4 m-0">
            <FormField control={form.control} name="examId" render={({ field }) => (
              <FormItem><FormLabel>Deneme Sınavı</FormLabel><Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Deneme seçin" /></SelectTrigger></FormControl>
                  <SelectContent>{practiceExams.map((exam) => (<SelectItem key={exam.id} value={exam.id}>{exam.name}</SelectItem>))}</SelectContent>
                </Select><FormMessage /></FormItem>
            )} />
            <FormDescription>Seçilen deneme sınavı öğrenciye atanacaktır.</FormDescription>
          </TabsContent>

          <Button type="submit" className="w-full">{initialData ? 'Ödevi Güncelle' : 'Ödevi Ata'}</Button>
        </form>
      </Form>
    </Tabs>
  );
}
