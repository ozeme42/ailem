
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format, parse } from "date-fns";
import { tr } from "date-fns/locale";
import { CalendarIcon, Loader2, Code, User, BookOpen, Calendar as CalendarLucide, FileCode, Layers } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FamilyMember, Test, TrackedBook, StudyPlan, BankQuestion } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "./ui/scroll-area";
import { AnswerKeyForm } from "./answer-key-form";
import { Combobox } from "./ui/combobox";

// --- DESIGN SYSTEM: Glassmorphism ---
const glassColors = {
    INPUT_BG: "bg-slate-900/50 border-white/10 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500/50 hover:bg-slate-900/70 transition-colors",
    LABEL: "text-slate-300 font-medium text-xs uppercase tracking-wider mb-1.5 flex items-center gap-2",
    BUTTON_PRIMARY: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02]",
    POPOVER_BG: "bg-slate-950 border-white/10 text-slate-200",
};

const formSchema = z.object({
  title: z.string().min(3, "Başlık en az 3 karakter olmalıdır."),
  subject: z.string().min(1, "Ders seçimi zorunludur."),
  topic: z.string().optional(),
  assigneeId: z.string({ required_error: "Lütfen bir sorumlu seçin." }),
  dueDate: z.date({ required_error: "Lütfen bir bitiş tarihi seçin." }),
  htmlContent: z.string().min(1, "Lütfen HTML içeriği girin."),
  questionCount: z.coerce.number().min(1, "Soru sayısı en az 1 olmalıdır."),
  answerKey: z.record(z.string()).default({}),
});

type NewHtmlTestFormProps = {
  familyMembers: FamilyMember[];
  onFormSubmit: (data: Omit<Test, 'id' | 'familyId'>) => void;
  initialData?: Test | null;
  availableSubjects: string[];
  onSubjectCreated: (subject: string) => void;
  availableTopics: string[];
  onTopicCreated: (topic: string) => void;
  trackedBooks: TrackedBook[];
  studyPlans: StudyPlan[];
  bankQuestions: BankQuestion[];
};

export function NewHtmlTestForm({ 
    familyMembers, 
    onFormSubmit, 
    initialData,
    availableSubjects,
    onSubjectCreated,
    availableTopics,
    onTopicCreated,
    trackedBooks,
    studyPlans,
    bankQuestions
}: NewHtmlTestFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title || "",
      subject: initialData?.subject || "",
      topic: initialData?.topicId ? initialData.topicId : ((initialData as any)?.topic || ""),
      assigneeId: initialData?.studentId || undefined,
      dueDate: initialData?.dueDate ? parse(initialData.dueDate, 'dd MMMM yyyy', new Date(), { locale: tr }) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      htmlContent: initialData?.htmlContent || "",
      questionCount: initialData?.questionCount || 10,
      answerKey: initialData?.answerKey || {},
    },
  });

  const watchedSubject = form.watch("subject");

  // Hiyerarşik Konu Listesi: Seçilen derse göre filtreleme
  const filteredTopicsOptions = React.useMemo(() => {
    if (!watchedSubject) return [];
    const topicsSet = new Set<string>();
    
    trackedBooks.forEach(book => (book.subjects || []).forEach(s => { 
        if (s.name === watchedSubject) (s.topics || []).forEach(t => topicsSet.add(t.name)); 
    }));
    
    studyPlans.forEach(plan => (plan.subjects || []).forEach(s => { 
        if (s.name === watchedSubject) (s.topics || []).forEach(t => topicsSet.add(t.name)); 
    }));
    
    bankQuestions.forEach(q => {
        if (q.subject === watchedSubject && q.topic) topicsSet.add(q.topic);
    });

    availableTopics.forEach(t => topicsSet.add(t));
    
    return Array.from(topicsSet).sort().map(t => ({ label: t, value: t }));
  }, [watchedSubject, trackedBooks, studyPlans, bankQuestions, availableTopics]);

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        title: initialData.title,
        subject: initialData.subject,
        topic: initialData.topicId ? initialData.topicId : ((initialData as any)?.topic || ""),
        assigneeId: initialData.studentId,
        dueDate: initialData.dueDate ? parse(initialData.dueDate, 'dd MMMM yyyy', new Date(), { locale: tr }) : new Date(),
        htmlContent: initialData.htmlContent || "",
        questionCount: initialData.questionCount || 10,
        answerKey: initialData.answerKey || {},
      });
    }
  }, [initialData, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const testData: any = {
        title: values.title,
        subject: values.subject,
        studentId: values.assigneeId,
        questionCount: values.questionCount,
        assignedDate: initialData?.assignedDate || format(new Date(), 'dd MMMM yyyy', { locale: tr }),
        dueDate: format(values.dueDate, 'dd MMMM yyyy', { locale: tr }),
        sourceType: 'html' as const,
        status: initialData?.status || 'Atandı' as const,
        isArchived: initialData?.isArchived || false,
        htmlContent: values.htmlContent,
        answerKey: values.answerKey,
      };

      if (values.topic) {
          testData.topic = values.topic;
      }

      onFormSubmit(testData);
    } catch (err: any) {
      toast({ title: 'Hata', description: 'Test oluşturulurken bir sorun oluştu.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const subjectOptions = availableSubjects.map(s => ({ label: s, value: s }));
  const watchedQuestionCount = form.watch("questionCount");
  const watchedAnswerKey = form.watch("answerKey");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col h-full overflow-hidden">
        <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-5 py-4 pt-2">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField control={form.control} name="title" render={({ field }) => (
                        <FormItem>
                            <FormLabel className={glassColors.LABEL}><FileCode className="w-3.5 h-3.5 text-indigo-400"/> Test Başlığı</FormLabel>
                            <FormControl><Input placeholder="Örn: 2. Hafta HTML Testi" {...field} className={glassColors.INPUT_BG}/></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    
                    <FormField control={form.control} name="assigneeId" render={({ field }) => (
                        <FormItem>
                            <FormLabel className={glassColors.LABEL}><User className="w-3.5 h-3.5 text-emerald-400"/> Sorumlu Kişi</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger className={glassColors.INPUT_BG}>
                                        <SelectValue placeholder="Birini seçin" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent className={glassColors.POPOVER_BG}>
                                    {familyMembers.map((member) => (<SelectItem key={member.id} value={member.id} className="text-slate-200 focus:bg-white/10 focus:text-white">{member.name}</SelectItem>))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}/>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField control={form.control} name="subject" render={({ field }) => (
                        <FormItem>
                            <FormLabel className={glassColors.LABEL}><BookOpen className="w-3.5 h-3.5 text-pink-400"/> Ders</FormLabel>
                            <FormControl>
                                <Combobox 
                                    options={subjectOptions}
                                    value={field.value}
                                    onChange={(val) => {
                                        field.onChange(val);
                                        form.setValue('topic', '');
                                    }}
                                    onCreate={onSubjectCreated}
                                    placeholder="Ders seçin..."
                                    className={glassColors.INPUT_BG}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>

                    <FormField control={form.control} name="topic" render={({ field }) => (
                        <FormItem>
                            <FormLabel className={glassColors.LABEL}><Layers className="w-3.5 h-3.5 text-indigo-400"/> Konu (Opsiyonel)</FormLabel>
                            <FormControl>
                                <Combobox 
                                    options={filteredTopicsOptions}
                                    value={field.value || ""}
                                    onChange={field.onChange}
                                    onCreate={onTopicCreated}
                                    placeholder={watchedSubject ? "Konu seçin..." : "Önce ders seçin..."}
                                    className={glassColors.INPUT_BG}
                                    disabled={!watchedSubject}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField control={form.control} name="dueDate" render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel className={glassColors.LABEL}><CalendarLucide className="w-3.5 h-3.5 text-blue-400"/> Bitiş Tarihi</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button variant={"outline"} className={cn("w-full h-10 pl-3 text-left font-normal", !field.value && "text-muted-foreground", glassColors.INPUT_BG)}>
                                            {field.value ? format(field.value, "d MMMM yyyy", { locale: tr }) : <span>Tarih seçin</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className={cn("w-auto p-0", glassColors.POPOVER_BG)} align="start">
                                    <Calendar 
                                        mode="single" 
                                        selected={field.value} 
                                        onSelect={field.onChange} 
                                        disabled={(date) => date < new Date() && !initialData} 
                                        initialFocus 
                                        className="bg-slate-950 text-slate-200 rounded-md border border-white/10"
                                    />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )}/>

                    <FormField control={form.control} name="questionCount" render={({ field }) => (
                        <FormItem>
                            <FormLabel className={glassColors.LABEL}>Soru Sayısı</FormLabel>
                            <FormControl><Input type="number" {...field} className={glassColors.INPUT_BG}/></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <FormField control={form.control} name="htmlContent" render={({ field }) => (
                        <FormItem className="flex flex-col h-[500px]">
                            <FormLabel className={glassColors.LABEL}><Code className="w-3.5 h-3.5 text-yellow-400"/> HTML İçeriği</FormLabel>
                            <FormControl>
                                <Textarea 
                                    placeholder="HTML kodunu buraya yapıştırın..." 
                                    className={cn("flex-1 font-mono text-xs leading-relaxed resize-none bg-black/40 border-white/10 text-emerald-400", "custom-scrollbar")} 
                                    {...field} 
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>

                    <div className="flex flex-col h-[500px]">
                         <FormLabel className={glassColors.LABEL}>Optik Cevap Anahtarı</FormLabel>
                         <div className="flex-1 bg-black/20 border border-white/10 rounded-md overflow-hidden">
                            <AnswerKeyForm 
                                totalQuestions={watchedQuestionCount} 
                                answerKey={watchedAnswerKey} 
                                onSave={(newKey) => form.setValue('answerKey', newKey as any)} 
                            />
                         </div>
                    </div>
                </div>
            </div>
        </ScrollArea>
        
        <div className="pt-6 border-t border-white/5 mt-auto">
            <Button type="submit" className={cn("w-full h-12 text-base font-semibold", glassColors.BUTTON_PRIMARY)} disabled={loading}>
            {loading ? (
                <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Kaydediliyor...
                </>
            ) : (
                initialData ? 'Değişiklikleri Kaydet' : 'HTML Testini Oluştur ve Ata'
            )}
            </Button>
        </div>
      </form>
    </Form>
  );
}

