
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { format, parse } from "date-fns";
import { tr } from "date-fns/locale";
import { CalendarIcon, Loader2, Code, User, BookOpen, Calendar as CalendarLucide, FileCode, Layers, Plus, Trash2, SplitSquareHorizontal } from "lucide-react";

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
  fileUrl: z.string().optional(),
  questionCount: z.coerce.number().min(1, "Soru sayısı en az 1 olmalıdır."),
  sections: z.array(z.object({
    name: z.string().min(1, "Bölüm adı zorunludur."),
    questionCount: z.coerce.number().min(1, "Soru sayısı en az 1 olmalıdır.")
  })).default([]),
  answerKey: z.record(z.string()).default({}),
  openEnded: z.boolean().default(false),
});

type NewPdfTestFormProps = {
  familyMembers: FamilyMember[];
  onFormSubmit: (data: Omit<Test, 'id' | 'familyId'>) => void;
  initialData?: Test | null;
  isReassigning?: boolean;
  availableSubjects: string[];
  onSubjectCreated: (subject: string) => void;
  availableTopics: string[];
  onTopicCreated: (topic: string) => void;
  trackedBooks: TrackedBook[];
  studyPlans: StudyPlan[];
  bankQuestions: BankQuestion[];
};

export function NewPdfTestForm({ 
    familyMembers, 
    onFormSubmit, 
    initialData,
    availableSubjects,
    onSubjectCreated,
    availableTopics,
    onTopicCreated,
    trackedBooks,
    studyPlans,
    bankQuestions,
    isReassigning
}: NewPdfTestFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title || "",
      subject: initialData?.subject || "",
      topic: initialData?.topicId ? initialData.topicId : ((initialData as any)?.topic || ""),
      assigneeId: initialData?.studentId || undefined,
      dueDate: initialData?.dueDate ? parse(initialData.dueDate, 'dd MMMM yyyy', new Date(), { locale: tr }) : new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
      fileUrl: initialData?.fileUrl || "",
      questionCount: initialData?.questionCount || 10,
      answerKey: initialData?.answerKey || {},
      sections: initialData?.sections || [],
      openEnded: initialData?.openEnded || false,
    },
  });

  const watchedSubject = form.watch("subject");
  const { fields: sectionFields, append: appendSection, remove: removeSection } = useFieldArray({
    control: form.control,
    name: "sections",
  });
  const watchedSections = form.watch("sections");

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
        dueDate: initialData.dueDate ? parse(initialData.dueDate, 'dd MMMM yyyy', new Date(), { locale: tr }) : new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        fileUrl: initialData.fileUrl || "",
        questionCount: initialData.questionCount || 10,
        answerKey: initialData.answerKey || {},
        openEnded: initialData.openEnded || false,
      });
    }
  }, [initialData, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      let finalFileUrl = values.fileUrl || "";
      if (file) {
          const { uploadFileToStorage } = await import('@/lib/dataService');
          finalFileUrl = await uploadFileToStorage(file, `pdf-tests/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`);
      }

      if (!finalFileUrl) {
          toast({ title: 'Hata', description: 'Lütfen bir PDF dosyası seçin.', variant: 'destructive' });
          setLoading(false);
          return;
      }

      const formattedData: Omit<Test, "id" | "familyId"> = {
        title: values.title,
        subject: values.subject,
        studentId: values.assigneeId,
        questionCount: values.sections && values.sections.length > 0 ? values.sections.reduce((acc, sec) => acc + sec.questionCount, 0) : values.questionCount,
        sections: values.sections,
        assignedDate: (initialData && !isReassigning) ? initialData.assignedDate : format(new Date(), 'dd MMMM yyyy', { locale: tr }),
        dueDate: format(values.dueDate, 'dd MMMM yyyy', { locale: tr }),
        status: (initialData && !isReassigning) ? initialData.status : 'Atandı',
        sourceType: 'pdf' as const,
        isArchived: (initialData && !isReassigning) ? initialData.isArchived : false,
        fileUrl: finalFileUrl,
        answerKey: values.openEnded ? {} : values.answerKey,
        topicId: values.topic || undefined,
        openEnded: values.openEnded,
        gradingType: values.openEnded ? 'manual' : 'auto',
      };

      await onFormSubmit(formattedData);
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
                            <FormControl><Input placeholder="Örn: 2. Hafta PDF Testi" {...field} className={glassColors.INPUT_BG}/></FormControl>
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
                                    contentClassName={glassColors.POPOVER_BG}
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
                                    contentClassName={glassColors.POPOVER_BG}
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

                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <FormLabel className={glassColors.LABEL}><SplitSquareHorizontal className="w-3.5 h-3.5 text-orange-400"/> Bölümler (Opsiyonel)</FormLabel>
                            <Button type="button" variant="ghost" size="sm" onClick={() => appendSection({ name: "", questionCount: 10 })} className="h-8 text-[11px] font-bold text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                                <Plus className="w-3.5 h-3.5 mr-1.5" /> Bölüm Ekle
                            </Button>
                        </div>
                        
                        {sectionFields.length > 0 ? (
                            <div className="space-y-3">
                                {sectionFields.map((field, index) => (
                                    <div key={field.id} className="flex items-center gap-2 bg-slate-900/30 p-2 rounded-xl border border-white/5">
                                        <FormField control={form.control} name={`sections.${index}.name`} render={({ field: nameField }) => (
                                            <FormItem className="flex-1 space-y-0">
                                                <FormControl><Input placeholder="Bölüm Adı (Örn: Türkçe)" {...nameField} className={cn(glassColors.INPUT_BG, "h-9 text-sm")} /></FormControl>
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name={`sections.${index}.questionCount`} render={({ field: countField }) => (
                                            <FormItem className="w-24 space-y-0">
                                                <FormControl><Input type="number" {...countField} className={cn(glassColors.INPUT_BG, "h-9 text-sm")} /></FormControl>
                                            </FormItem>
                                        )} />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeSection(index)} className="h-9 w-9 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <FormField control={form.control} name="questionCount" render={({ field }) => (
                                <FormItem>
                                    <FormControl><Input type="number" {...field} className={glassColors.INPUT_BG}/></FormControl>
                                    <FormMessage />
                                    <p className="text-[10px] text-slate-500 mt-1">Eğer testiniz birden fazla branş içeriyorsa (Örn: Türkçe ve Matematik), yukarıdan bölüm ekleyebilirsiniz.</p>
                                </FormItem>
                            )}/>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="flex flex-col h-[500px]">
                        <FormLabel className={glassColors.LABEL}><Code className="w-3.5 h-3.5 text-yellow-400"/> PDF Dosyası</FormLabel>
                        <div className={cn("flex-1 bg-black/40 border border-white/10 rounded-md p-4 flex flex-col items-center justify-center text-center", glassColors.INPUT_BG)}>
                            {file ? (
                                <div className="space-y-4">
                                    <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto">
                                        <FileCode className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-200 truncate max-w-[200px] mx-auto">{file.name}</p>
                                        <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                    <Button type="button" variant="outline" onClick={() => setFile(null)} className="border-white/10 hover:bg-red-500/20 hover:text-red-400 text-xs h-8">
                                        Farklı Dosya Seç
                                    </Button>
                                </div>
                            ) : initialData?.fileUrl ? (
                                <div className="space-y-4">
                                    <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto">
                                        <FileCode className="w-8 h-8" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-200">Mevcut PDF Yüklü</p>
                                    <p className="text-xs text-slate-400 mb-4 break-all px-4">{initialData.fileUrl}</p>
                                    <Button type="button" variant="outline" className="border-white/10 hover:bg-white/10 text-xs h-8 relative cursor-pointer">
                                        <input type="file" accept="application/pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => e.target.files && setFile(e.target.files[0])} />
                                        Değiştirmek İçin Tıkla
                                    </Button>
                                </div>
                            ) : (
                                <div className="relative w-full h-full border-2 border-dashed border-white/20 rounded-xl hover:border-indigo-500/50 hover:bg-white/5 transition-all flex flex-col items-center justify-center group cursor-pointer">
                                    <input type="file" accept="application/pdf" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => e.target.files && setFile(e.target.files[0])} />
                                    <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform mb-4">
                                        <Layers className="w-8 h-8 text-indigo-400" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-200">PDF Dosyası Seç</p>
                                    <p className="text-xs text-slate-500 mt-2">Sürükle bırak veya tıklayarak seçin</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col h-[500px]">
                        <div className="flex items-center justify-between mb-1.5">
                            <FormLabel className={glassColors.LABEL.replace("mb-1.5", "")}>
                                {form.watch("openEnded") ? "Açık Uçlu Test" : "Optik Cevap Anahtarı"}
                            </FormLabel>
                            <FormField control={form.control} name="openEnded" render={({ field }) => (
                                <FormItem className="flex items-center gap-2 space-y-0">
                                    <FormLabel className="text-xs text-slate-300 font-bold mb-0">Açık Uçlu (Manuel Puanlama)</FormLabel>
                                    <FormControl>
                                        <div 
                                            className={cn(
                                                "w-10 h-6 rounded-full p-1 cursor-pointer transition-colors relative flex items-center",
                                                field.value ? "bg-indigo-500" : "bg-slate-700"
                                            )}
                                            onClick={() => field.onChange(!field.value)}
                                        >
                                            <div className={cn(
                                                "w-4 h-4 bg-white rounded-full shadow-sm transition-transform",
                                                field.value ? "translate-x-4" : "translate-x-0"
                                            )} />
                                        </div>
                                    </FormControl>
                                </FormItem>
                            )}/>
                        </div>
                        <div className="flex-1 bg-black/20 border border-white/10 rounded-md overflow-hidden flex flex-col relative">
                            {form.watch("openEnded") ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                                    <Layers className="w-12 h-12 text-indigo-500/50 mb-4" />
                                    <p className="font-bold text-slate-300 mb-2">Açık Uçlu Test Modu Aktif</p>
                                    <p className="text-xs">
                                        Öğrenciler optik form yerine metin girişi yapacaklardır. 
                                        Cevap anahtarı girmenize gerek yoktur. Test manuel olarak puanlanacaktır.
                                    </p>
                                </div>
                            ) : (
                                <AnswerKeyForm 
                                    totalQuestions={watchedSections?.length > 0 ? watchedSections.reduce((acc, sec) => acc + Number(sec.questionCount || 0), 0) : watchedQuestionCount} 
                                    sections={watchedSections}
                                    answerKey={watchedAnswerKey} 
                                    onSave={(newKey) => form.setValue('answerKey', newKey as any)} 
                                />
                            )}
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
                initialData ? 'Değişiklikleri Kaydet' : 'PDF Testini Oluştur ve Ata'
            )}
            </Button>
        </div>
      </form>
    </Form>
  );
}
