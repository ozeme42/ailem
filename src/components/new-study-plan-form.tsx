
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Control, FormProvider } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import type { StudyPlan, StudyPlanSubject, StudyTopic } from "@/lib/data";
import { PlusCircle, Trash2, BookOpen, Layers, Link as LinkIcon, FileText, Plus, X } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { Card, CardContent, CardHeader } from "./ui/card";
import { cn } from "@/lib/utils";

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

export function NewStudyPlanForm({ onSubmit, initialData }: NewStudyPlanFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      subjects: [{ id: Date.now().toString(), name: "", topics: [{ name: "", sources: [""] }] }],
    },
  });
  
  React.useEffect(() => {
    if (initialData) {
      form.reset({
        title: initialData.title,
        description: initialData.description || "",
        subjects: (initialData.subjects || []).map(s => ({
            ...s,
            topics: (s.topics || []).map(t => ({
                ...t,
                sources: (t.sources || []).length > 0 ? t.sources : [""]
            }))
        })) || [],
      });
    } else {
        form.reset({
            title: "",
            description: "",
            subjects: [{ id: Date.now().toString(), name: "", topics: [{ name: "", sources: [""] }] }],
        })
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
            id: subject.id || (Date.now().toString() + Math.random().toString()),
            topics: subject.topics.map(topic => ({
                ...topic,
                id: topic.id || (Date.now().toString() + Math.random().toString()),
                sources: (topic.sources || []).filter(s => s && s.trim() !== '')
            }))
        }))
    }
    onSubmit(cleanedData);
    form.reset();
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
        <DialogHeader className="px-6 pt-6 pb-4 border-b dark:border-white/5 bg-slate-50 dark:bg-slate-900/50">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Layers className="w-6 h-6 text-indigo-500" />
                {initialData ? "Planı Düzenle" : "Yeni Yol Haritası"}
            </DialogTitle>
            <DialogDescription className="text-slate-500">
                Ders ve ünite bazlı konu anlatım planı oluşturun.
            </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <ScrollArea className="flex-1">
                <div className="px-6 py-6 space-y-8">
                    {/* Genel Bilgiler */}
                    <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold text-slate-500 uppercase tracking-widest">Plan Başlığı</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Örn: 8. Sınıf LGS Hazırlık" {...field} className="h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800" />
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
                                    <FormLabel className="text-xs font-bold text-slate-500 uppercase tracking-widest">Açıklama</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Bu planın kapsamı hakkında kısa notlar..." {...field} className="min-h-[80px] rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 resize-none" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Dersler ve Konular Bölümü */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Müfredat Yapısı</h3>
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                className="h-8 rounded-lg border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 font-bold"
                                onClick={() => appendSubject({ id: Date.now().toString(), name: "", topics: [{ name: "", sources: [""] }] })}
                            >
                                <PlusCircle className="mr-1.5 h-4 w-4" /> Ders Ekle
                            </Button>
                        </div>

                        <div className="space-y-6">
                            {subjectFields.map((subjectField, subjectIndex) => (
                                <Card key={subjectField.id} className="border-2 border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                                    <CardHeader className="bg-slate-50 dark:bg-slate-900/50 p-4 border-b dark:border-white/5 flex flex-row items-center justify-between gap-4 space-y-0">
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                                                {subjectIndex + 1}
                                            </div>
                                            <FormField
                                                control={form.control}
                                                name={`subjects.${subjectIndex}.name`}
                                                render={({ field }) => (
                                                    <FormItem className="flex-1 space-y-0">
                                                        <FormControl>
                                                            <Input 
                                                                placeholder="Ders Adı (örn: Matematik)" 
                                                                {...field} 
                                                                className="h-10 bg-white dark:bg-slate-950 border-transparent focus:border-indigo-500 font-bold text-base shadow-none"
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <Button 
                                            type="button" 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-9 w-9 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl" 
                                            onClick={() => removeSubject(subjectIndex)}
                                        >
                                            <Trash2 className="h-5 w-5"/>
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="p-4 bg-white dark:bg-slate-900">
                                        <TopicArrayComponent 
                                            control={form.control}
                                            subjectIndex={subjectIndex}
                                        />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            </ScrollArea>
            
            <DialogFooter className="p-6 border-t dark:border-white/5 bg-slate-50 dark:bg-slate-900/50 flex-row gap-3">
                <Button type="button" variant="ghost" onClick={() => form.reset()} className="flex-1 h-12 rounded-xl font-bold">Temizle</Button>
                <Button type="submit" className="flex-[2] h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-500/20 text-white transition-all active:scale-95">
                    {initialData ? 'Değişiklikleri Kaydet' : 'Yol Haritasını Oluştur'}
                </Button>
            </DialogFooter>
          </form>
        </Form>
    </div>
  );
}

function TopicArrayComponent({ subjectIndex, control }: { subjectIndex: number, control: Control<z.infer<typeof formSchema>> }) {
    const { fields, append, remove } = useFieldArray({
        control,
        name: `subjects.${subjectIndex}.topics`,
    });

    return (
        <div className="space-y-4">
             <div className="flex items-center justify-between mb-2">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                     <Layers className="w-3.5 h-3.5" /> Konular
                 </span>
             </div>

             <div className="grid grid-cols-1 gap-4">
                {fields.map((field, topicIndex) => (
                    <div key={field.id} className="relative group p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-black/20 space-y-4">
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="absolute top-2 right-2 h-7 w-7 text-slate-400 hover:text-rose-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" 
                            onClick={() => remove(topicIndex)}
                        >
                            <X className="h-4 w-4"/>
                        </Button>

                        <FormField
                            control={control}
                            name={`subjects.${subjectIndex}.topics.${topicIndex}.name`}
                            render={({ field: topicField }) => (
                                <FormItem className="space-y-1">
                                    <FormLabel className="text-[10px] font-bold text-slate-500 uppercase">Konu Adı</FormLabel>
                                    <FormControl>
                                        <Input 
                                            placeholder="Örn: Üslü Sayılar" 
                                            {...topicField} 
                                            className="h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <div className="pl-2 border-l-2 border-indigo-100 dark:border-indigo-900/50">
                            <SourceArrayComponent control={control} subjectIndex={subjectIndex} topicIndex={topicIndex} />
                        </div>
                    </div>
                ))}
            </div>

            <Button 
                type="button" 
                size="sm" 
                variant="ghost" 
                className="w-full h-10 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-all font-bold" 
                onClick={() => append({ name: "", sources: [""] })}
            >
                <Plus className="mr-2 h-4 w-4"/> Yeni Konu Ekle
            </Button>
        </div>
    );
}

function SourceArrayComponent({ subjectIndex, topicIndex, control}: { subjectIndex: number, topicIndex: number, control: Control<z.infer<typeof formSchema>>}) {
    const { fields, append, remove } = useFieldArray({
        control: control,
        name: `subjects.${subjectIndex}.topics.${topicIndex}.sources`,
    });

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between mb-1">
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <LinkIcon className="w-3 h-3" /> Kaynaklar
                 </span>
            </div>

            <div className="space-y-2">
                {fields.map((field, sourceIndex) => (
                    <div key={field.id} className="flex items-center gap-2 group/source">
                        <FormField
                            control={control}
                            name={`subjects.${subjectIndex}.topics.${topicIndex}.sources.${sourceIndex}`}
                            render={({ field: sourceField }) => (
                                <FormItem className="flex-grow space-y-0">
                                    <FormControl>
                                        <div className="relative">
                                            <Input 
                                                placeholder="Link veya not..." 
                                                {...sourceField} 
                                                className="h-9 pr-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs rounded-lg focus:border-indigo-500"
                                            />
                                            {sourceField.value && (
                                                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                    <FileText className="w-3.5 h-3.5 text-slate-300" />
                                                </div>
                                            )}
                                        </div>
                                    </FormControl>
                                    <FormMessage className="text-[10px]" />
                                </FormItem>
                            )}
                        />
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-300 hover:text-rose-500 shrink-0 rounded-lg opacity-0 group-hover/source:opacity-100 transition-opacity" 
                            onClick={() => remove(sourceIndex)}
                        >
                            <Trash2 className="h-3.5 w-3.5"/>
                        </Button>
                    </div>
                ))}
            </div>
            
            <button 
                type="button" 
                onClick={() => append("")}
                className="text-[10px] font-black text-indigo-500 hover:text-indigo-400 uppercase tracking-widest flex items-center gap-1 px-1 py-1 transition-colors"
            >
                <Plus className="w-3 h-3"/> Kaynak Ekle
            </button>
        </div>
    )
}
