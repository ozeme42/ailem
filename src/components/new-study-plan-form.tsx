"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import type { StudyPlan } from "@/lib/data";
import { PlusCircle, Trash2, Layers, Link as LinkIcon, FileText, Plus, X, ChevronRight, ChevronLeft, Check, Sparkles, ChevronDown, BookOpen } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { Card, CardContent, CardHeader } from "./ui/card";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

// --- DESIGN SYSTEM ---
const themeColors = {
    INPUT_BG: "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:border-indigo-500 transition-all",
    CARD_BG: "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm",
};

// --- SCHEMAS ---
const topicSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Konu adı en az 2 karakter olmalıdır."),
  sources: z.array(z.string()).optional(),
});

const subjectSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(2, "Ders adı en az 2 karakter olmalıdır."),
    topics: z.array(topicSchema).min(1, "En az bir konu eklemelisiniz."),
});

const formSchema = z.object({
  title: z.string().min(3, "Plan adı en az 3 karakter olmalıdır."),
  description: z.string().optional(),
  subjects: z.array(subjectSchema).min(1, "En az bir ders eklemelisiniz."),
});

type NewStudyPlanFormProps = {
  onSubmit: (data: Omit<StudyPlan, 'id' | 'familyId'>) => void;
  initialData?: StudyPlan | null;
};

type Step = 'info' | 'curriculum';

export function NewStudyPlanForm({ onSubmit, initialData }: NewStudyPlanFormProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = React.useState<Step>('info');
  const [expandedSubjectIndex, setExpandedSubjectIndex] = React.useState<number | null>(0);

  // Veriyi formata uygun hale getiren yardımcı fonksiyon
  const formatInitialData = (data: StudyPlan) => {
    return {
        title: data.title,
        description: data.description || "",
        subjects: data.subjects && data.subjects.length > 0 
            ? data.subjects.map(s => ({
                id: s.id,
                name: s.name,
                topics: s.topics && s.topics.length > 0 
                    ? s.topics.map(t => ({
                        id: t.id,
                        name: t.name,
                        sources: t.sources && t.sources.length > 0 ? t.sources : [""]
                    })) 
                    : [{ name: "", sources: [""] }]
            }))
            : [{ name: "", topics: [{ name: "", sources: [""] }] }],
    };
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? formatInitialData(initialData) : {
      title: "",
      description: "",
      subjects: [{ name: "", topics: [{ name: "", sources: [""] }] }],
    },
  });
  
  React.useEffect(() => {
    if (initialData) {
      form.reset(formatInitialData(initialData));
    }
  }, [initialData, form]);

  const { fields: subjectFields, append: appendSubject, remove: removeSubject } = useFieldArray({
    control: form.control,
    name: "subjects",
  });

  const handleFormSubmit = (values: z.infer<typeof formSchema>) => {
    const cleanedData = {
        ...values,
        subjects: values.subjects.map(subject => ({
            ...subject,
            id: subject.id || `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            topics: subject.topics.map(topic => ({
                ...topic,
                id: topic.id || `top_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                sources: (topic.sources || []).filter(s => s && s.trim() !== '')
            }))
        }))
    }
    onSubmit(cleanedData);
  };

  const handleFormError = (errors: any) => {
      console.error("Validation Errors:", errors);
      toast({
          title: "Formda Eksikler Var ⚠️",
          description: "Lütfen tüm ders ve konu adlarını doldurduğunuzdan emin olun.",
          variant: "destructive"
      });
  };

  const steps: Step[] = ['info', 'curriculum'];
  const stepIndex = steps.indexOf(currentStep);

  const goToNext = async () => {
    const isStepValid = await form.trigger(['title', 'description']);
    if (isStepValid) {
        setCurrentStep('curriculum');
    } else {
        toast({ title: "Bilgi Eksik", description: "Lütfen plan başlığını girin.", variant: "destructive" });
    }
  };

  const goToPrev = () => setCurrentStep('info');

  const handleAddSubject = () => {
      appendSubject({ name: "", topics: [{ name: "", sources: [""] }] });
      setExpandedSubjectIndex(subjectFields.length);
  };

  const variants = {
    enter: (direction: number) => ({ x: direction > 0 ? 50 : -50, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction < 0 ? 50 : -50, opacity: 0 })
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
        <DialogHeader className="px-6 pt-6 pb-4 border-b dark:border-white/5 bg-slate-50 dark:bg-slate-900/50 shrink-0">
            <div className="flex items-center justify-between mb-4">
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <Layers className="w-6 h-6 text-indigo-500" />
                    {initialData ? "Planı Düzenle" : "Yeni Yol Haritası"}
                </DialogTitle>
                <div className="flex items-center gap-2">
                    {steps.map((s) => (
                        <div key={s} className={cn(
                            "h-1.5 rounded-full transition-all duration-300",
                            s === currentStep ? "w-8 bg-indigo-600 shadow-md" : "w-2 bg-slate-200 dark:bg-slate-800"
                        )} />
                    ))}
                </div>
            </div>
            <DialogDescription className="text-slate-500 font-medium">
                {currentStep === 'info' ? "Planın temel bilgilerini belirleyin." : "Ders ve konu hiyerarşisini kartlar üzerinden yönetin."}
            </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit, handleFormError)} className="flex flex-col flex-1 overflow-hidden">
            <ScrollArea className="flex-1">
                <div className="px-4 md:px-6 py-6">
                    <AnimatePresence mode="wait" custom={stepIndex}>
                        {currentStep === 'info' ? (
                            <motion.div 
                                key="info" 
                                custom={stepIndex} 
                                variants={variants} 
                                initial="enter" 
                                animate="center" 
                                exit="exit"
                                transition={{ duration: 0.2 }}
                                className="space-y-6"
                            >
                                <div className="space-y-5">
                                    <FormField
                                        control={form.control}
                                        name="title"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Plan Başlığı</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Örn: 8. Sınıf LGS Hazırlık" {...field} className={cn("h-14 rounded-2xl text-lg font-bold px-4", themeColors.INPUT_BG)} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Açıklama</FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder="Bu planın kapsamı hakkında kısa notlar..." {...field} className={cn("min-h-[140px] rounded-2xl text-base p-4 leading-relaxed resize-none", themeColors.INPUT_BG)} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-800/50 flex items-start gap-4">
                                    <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm text-indigo-600 shrink-0">
                                        <Sparkles className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-indigo-900 dark:text-indigo-100 text-sm md:text-base">Nasıl Çalışır?</h4>
                                        <p className="text-xs md:text-sm text-indigo-700/80 dark:text-indigo-400 mt-1.5 leading-relaxed">
                                            Dersleri ve konuları adım adım ekleyin. Boş alan bırakmamaya dikkat edin, aksi takdirde plan kaydedilmeyecektir.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="curriculum" 
                                custom={stepIndex} 
                                variants={variants} 
                                initial="enter" 
                                animate="center" 
                                exit="exit"
                                transition={{ duration: 0.2 }}
                                className="space-y-6 pb-20"
                            >
                                <div className="space-y-4">
                                    {subjectFields.map((subjectField, subjectIndex) => {
                                        const isExpanded = expandedSubjectIndex === subjectIndex;
                                        
                                        return (
                                        <Card key={subjectField.id} className={cn("border-2 rounded-3xl transition-all duration-300 overflow-hidden", isExpanded ? "border-indigo-500 shadow-md" : "border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700", themeColors.CARD_BG)}>
                                            <CardHeader 
                                                className={cn("p-4 md:p-5 flex flex-row items-center justify-between gap-3 space-y-0 cursor-pointer transition-colors", isExpanded ? "bg-indigo-50/50 dark:bg-indigo-900/10" : "bg-white dark:bg-slate-900")}
                                                onClick={() => setExpandedSubjectIndex(isExpanded ? null : subjectIndex)}
                                            >
                                                <div className="flex items-center gap-3 flex-1">
                                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg transition-colors", isExpanded ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "bg-slate-100 dark:bg-slate-800 text-slate-500")}>
                                                        {subjectIndex + 1}
                                                    </div>
                                                    <div className="flex-1 pr-2" onClick={(e) => e.stopPropagation()}>
                                                        <FormField
                                                            control={form.control}
                                                            name={`subjects.${subjectIndex}.name`}
                                                            render={({ field }) => (
                                                                <FormItem className="space-y-0">
                                                                    <FormControl>
                                                                        <Input 
                                                                            placeholder="Ders Adı giriniz..." 
                                                                            {...field} 
                                                                            className="h-10 bg-transparent border-none focus-visible:ring-0 font-black text-base md:text-lg text-slate-900 dark:text-slate-100 shadow-none p-0 placeholder:text-slate-300"
                                                                        />
                                                                    </FormControl>
                                                                    <FormMessage className="text-[10px] text-rose-500" />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-1">
                                                    <Button 
                                                        type="button" 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-10 w-10 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-full" 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeSubject(subjectIndex);
                                                        }}
                                                    >
                                                        <Trash2 className="h-5 w-5"/>
                                                    </Button>
                                                    <div className={cn("p-2 text-slate-400 transition-transform duration-300", isExpanded && "rotate-180")}>
                                                        <ChevronDown className="h-5 w-5" />
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            
                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                                    >
                                                        <CardContent className="p-4 md:p-6 bg-slate-50/50 dark:bg-black/10 border-t border-slate-100 dark:border-slate-800">
                                                            <TopicArrayComponent 
                                                                control={form.control}
                                                                subjectIndex={subjectIndex}
                                                            />
                                                        </CardContent>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </Card>
                                    )})}
                                </div>

                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    className="w-full h-14 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 font-bold text-base mt-4"
                                    onClick={handleAddSubject}
                                >
                                    <BookOpen className="mr-2 h-5 w-5" /> Yeni Ders Kartı Ekle
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </ScrollArea>
            
            <DialogFooter className="p-4 md:p-6 border-t dark:border-white/5 bg-slate-50 dark:bg-slate-900/50 flex-row gap-3 shrink-0">
                {currentStep === 'info' ? (
                    <>
                        <Button type="button" variant="ghost" onClick={() => form.reset()} className="flex-1 h-14 rounded-2xl font-bold">Temizle</Button>
                        <Button type="button" onClick={goToNext} className="flex-[2] h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-500/20 text-white transition-all active:scale-95 text-base">
                            Dersleri Düzenle <ChevronRight className="ml-2 h-5 w-5" />
                        </Button>
                    </>
                ) : (
                    <>
                        <Button type="button" variant="ghost" onClick={goToPrev} className="flex-1 h-14 rounded-2xl font-bold flex items-center justify-center gap-2">
                            <ChevronLeft className="h-5 w-5" /> Geri
                        </Button>
                        <Button type="submit" className="flex-[2] h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black shadow-lg shadow-indigo-500/20 text-white transition-all active:scale-95 text-base">
                            <Check className="mr-2 h-5 w-5" /> Planı Kaydet
                        </Button>
                    </>
                )}
            </DialogFooter>
          </form>
        </Form>
    </div>
  );
}

function TopicArrayComponent({ subjectIndex, control }: { subjectIndex: number, control: any }) {
    const { fields, append, remove } = useFieldArray({
        control,
        name: `subjects.${subjectIndex}.topics`,
    });

    return (
        <div className="space-y-5">
             <div className="flex items-center justify-between mb-2">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pl-1">
                     <Layers className="w-3.5 h-3.5" /> Konular
                 </span>
             </div>

             <div className="grid grid-cols-1 gap-4">
                {fields.map((field, topicIndex) => (
                    <div key={field.id} className="relative group p-4 md:p-5 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="absolute top-2 right-2 h-8 w-8 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-full transition-colors" 
                            onClick={() => remove(topicIndex)}
                        >
                            <X className="h-4 w-4"/>
                        </Button>

                        <FormField
                            control={control}
                            name={`subjects.${subjectIndex}.topics.${topicIndex}.name`}
                            render={({ field: topicField }) => (
                                <FormItem className="space-y-1 pr-8">
                                    <FormLabel className="text-[10px] font-bold text-slate-500 uppercase ml-1">Konu Adı</FormLabel>
                                    <FormControl>
                                        <Input 
                                            placeholder="Konu başlığı giriniz..." 
                                            {...topicField} 
                                            className="h-12 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl font-bold text-sm md:text-base"
                                        />
                                    </FormControl>
                                    <FormMessage className="text-rose-500 text-[10px]" />
                                </FormItem>
                            )}
                        />
                        
                        <div className="pl-3 md:pl-4 border-l-2 border-indigo-100 dark:border-indigo-900/50 pt-2">
                            <SourceArrayComponent control={control} subjectIndex={subjectIndex} topicIndex={topicIndex} />
                        </div>
                    </div>
                ))}
            </div>

            <Button 
                type="button" 
                size="sm" 
                variant="ghost" 
                className="w-full h-12 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all font-bold bg-white dark:bg-slate-950" 
                onClick={() => append({ name: "", sources: [""] })}
            >
                <Plus className="mr-2 h-4 w-4"/> Yeni Konu Ekle
            </Button>
        </div>
    );
}

function SourceArrayComponent({ subjectIndex, topicIndex, control}: { subjectIndex: number, topicIndex: number, control: any}) {
    const { fields, append, remove } = useFieldArray({
        control: control,
        name: `subjects.${subjectIndex}.topics.${topicIndex}.sources`,
    });

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <LinkIcon className="w-3 h-3" /> Çalışma Kaynakları
                 </span>
            </div>

            <div className="space-y-2.5">
                {fields.map((field, sourceIndex) => (
                    <div key={field.id} className="flex items-center gap-2">
                        <FormField
                            control={control}
                            name={`subjects.${subjectIndex}.topics.${topicIndex}.sources.${sourceIndex}`}
                            render={({ field: sourceField }) => (
                                <FormItem className="flex-grow space-y-0">
                                    <FormControl>
                                        <div className="relative">
                                            <Input 
                                                placeholder="YouTube linki, sayfa no veya not..." 
                                                {...sourceField} 
                                                className="h-10 pr-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs md:text-sm rounded-lg focus:border-indigo-500 shadow-sm"
                                            />
                                            {sourceField.value && (
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                    <FileText className="w-3.5 h-3.5 text-slate-300" />
                                                </div>
                                            )}
                                        </div>
                                    </FormControl>
                                    <FormMessage className="text-[10px] text-rose-500" />
                                </FormItem>
                            )}
                        />
                        <Button 
                            type="button" 
                            variant="outline" 
                            size="icon" 
                            className="h-10 w-10 text-slate-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 shrink-0 rounded-lg transition-colors border-slate-200 dark:border-slate-800" 
                            onClick={() => remove(sourceIndex)}
                        >
                            <Trash2 className="h-4 w-4"/>
                        </Button>
                    </div>
                ))}
            </div>
            
            <button 
                type="button" 
                onClick={() => append("")}
                className="text-xs font-bold text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5 py-1.5 transition-colors"
            >
                <div className="bg-indigo-100 dark:bg-indigo-900/50 p-1 rounded-md">
                    <Plus className="w-3 h-3"/> 
                </div>
                Kaynak Ekle
            </button>
        </div>
    )
}
