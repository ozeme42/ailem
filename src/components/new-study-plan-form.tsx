"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import type { StudyPlan } from "@/lib/data";
import { Trash2, Layers, BookOpen, Plus, X, ArrowLeft, Check, FileText, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { tr } from "date-fns/locale";

// --- YARDIMCI FONKSİYON ---
const generateSafeId = () => {
    return 'id-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
};

// --- SCHEMAS ---
const topicSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Konu adı boş bırakılamaz"),
    sources: z.array(z.string()).optional(),
});
  
const subjectSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Ders adı boş bırakılamaz"),
    topics: z.array(topicSchema).min(1, "En az 1 konu eklemelisiniz"),
});

const planInfoSchema = z.object({
  title: z.string().min(3, "Plan adı en az 3 karakter olmalıdır."),
});

// TYPES
type SubjectType = z.infer<typeof subjectSchema>;

type NewStudyPlanFormProps = {
  onSubmit: (data: Omit<StudyPlan, 'id' | 'familyId'>) => void;
  initialData?: StudyPlan | null;
};

// ==========================================
// ANA BİLEŞEN (MAIN VIEW)
// ==========================================
export function NewStudyPlanForm({ onSubmit, initialData }: NewStudyPlanFormProps) {
  const { toast } = useToast();
  
  // Master state for subjects
  const [subjects, setSubjects] = React.useState<SubjectType[]>([]);

  const form = useForm<z.infer<typeof planInfoSchema>>({
    resolver: zodResolver(planInfoSchema),
    defaultValues: {
      title: initialData?.title || "",
    },
    shouldUnregister: false,
  });

  // Sync subjects from initialData
  React.useEffect(() => {
    if (initialData) {
      form.reset({
        title: initialData.title,
      });
      setSubjects((initialData.subjects || []) as SubjectType[]);
    }
  }, [initialData, form]);

  const [editingSubject, setEditingSubject] = React.useState<{ subject: SubjectType | null, index: number } | null>(null);
  const [isAddingSubject, setIsAddingSubject] = React.useState(false);

  const handleFinalSubmit = (values: z.infer<typeof planInfoSchema>) => {
    if (subjects.length === 0) {
        toast({ 
            title: "Ders Eksik ⚠️", 
            description: "Kaydetmek için en az bir ders eklemelisiniz.", 
            variant: "destructive" 
        });
        return;
    }
    
    // Process data for submission
    const finalData = {
        title: values.title,
        subjects: subjects.map(s => ({
            ...s,
            id: s.id || generateSafeId(),
            topics: s.topics.map(t => ({
                ...t,
                id: t.id || generateSafeId(),
                sources: t.sources?.filter(src => src.trim() !== '') || []
            }))
        }))
    };
    
    onSubmit(finalData);
  };

  const handleFormError = (errors: any) => {
    console.error("Plan Form Validation Errors:", errors);
    toast({
        title: "Formda Eksikler Var ⚠️",
        description: "Lütfen plan başlığını kontrol edin.",
        variant: "destructive"
    });
  };

  const handleSaveSubject = (savedSubject: SubjectType) => {
      if (editingSubject) {
          setSubjects(prev => {
              const newArr = [...prev];
              newArr[editingSubject.index] = savedSubject;
              return newArr;
          });
          setEditingSubject(null);
      } else if (isAddingSubject) {
          setSubjects(prev => [...prev, { ...savedSubject, id: generateSafeId() }]);
          setIsAddingSubject(false);
      }
  };

  if (isAddingSubject || editingSubject) {
      return (
          <SubjectEditor 
            initialData={editingSubject?.subject || null}
            onSave={handleSaveSubject}
            onCancel={() => {
                setIsAddingSubject(false);
                setEditingSubject(null);
            }}
          />
      );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-950">
        <DialogHeader className="px-6 py-5 border-b dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/50 shrink-0 text-left">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Layers className="w-6 h-6 text-indigo-500" />
                {initialData ? "Yol Haritasını Düzenle" : "Yeni Yol Haritası"}
            </DialogTitle>
            <DialogDescription className="text-xs font-medium text-slate-500">
                Plan başlığını girin ve ders modüllerini oluşturun.
            </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFinalSubmit, handleFormError)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <ScrollArea className="flex-1 h-full">
                    <div className="p-6 space-y-8 max-w-2xl mx-auto w-full">
                        
                        {/* Başlık Alanı */}
                        <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Plan Başlığı</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Örn: LGS 2025 Hazırlık" {...field} className="h-12 rounded-xl text-base font-bold bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:ring-2 ring-indigo-500/20" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Ders Kartları */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">Dersler</h3>
                                <Badge variant="secondary" className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-none font-bold">
                                    {subjects.length} Ders Tanımlı
                                </Badge>
                            </div>

                            <div className="grid gap-3">
                                {subjects.map((subject, index) => (
                                    <div 
                                        key={subject.id || index} 
                                        className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group"
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xs shrink-0">
                                                {index + 1}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-slate-800 dark:text-slate-100 truncate">{subject.name}</h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">{subject.topics.length} Konu</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <Button 
                                                type="button" 
                                                variant="ghost" 
                                                size="sm"
                                                onClick={() => setEditingSubject({ subject, index })}
                                                className="h-8 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/40"
                                            >
                                                Düzenle
                                            </Button>
                                            <Button 
                                                type="button" 
                                                variant="ghost" 
                                                size="icon"
                                                onClick={() => setSubjects(prev => prev.filter((_, i) => i !== index))}
                                                className="h-8 w-8 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/40 rounded-lg"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <Button 
                                type="button" 
                                variant="outline" 
                                className="w-full h-12 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all font-bold"
                                onClick={() => setIsAddingSubject(true)}
                            >
                                <PlusCircle className="mr-2 h-4 w-4" /> Yeni Ders Ekle
                            </Button>
                        </div>
                    </div>
                </ScrollArea>
                
                <DialogFooter className="p-4 md:p-6 border-t dark:border-white/5 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md shrink-0">
                    <Button type="submit" className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-500/20 text-white transition-all">
                        <Check className="mr-2 h-5 w-5" /> Planı Kaydet
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    </div>
  );
}

// ==========================================
// ALT BİLEŞEN: DERS EDİTÖRÜ (INNER MODAL)
// ==========================================
function SubjectEditor({ initialData, onSave, onCancel }: { initialData: SubjectType | null, onSave: (data: SubjectType) => void, onCancel: () => void }) {
    const { toast } = useToast();
    const form = useForm<SubjectType>({
        resolver: zodResolver(subjectSchema),
        defaultValues: initialData || {
            name: "",
            topics: [{ name: "", sources: [""] }]
        },
        shouldUnregister: false,
    });

    const { fields: topicFields, append: appendTopic, remove: removeTopic } = useFieldArray({
        control: form.control,
        name: "topics"
    });

    // Sync form when initialData changes
    React.useEffect(() => {
        if (initialData) {
            form.reset(initialData);
        } else {
            form.reset({
                name: "",
                topics: [{ name: "", sources: [""] }]
            });
        }
    }, [initialData, form]);

    const handleInternalSubmit = (data: SubjectType) => {
        onSave(data);
    };

    const handleInternalError = (errors: any) => {
        console.error("Subject Editor Validation Errors:", errors);
        
        // Manuel kontrol
        const name = form.getValues("name");
        const topics = form.getValues("topics");
        const hasEmptyTopic = topics.some(t => !t.name.trim());

        let message = "Lütfen tüm zorunlu alanları doldurun.";
        if (!name.trim()) message = "Lütfen ders adını yazın.";
        else if (topics.length === 0) message = "En az bir konu eklemelisiniz.";
        else if (hasEmptyTopic) message = "Lütfen tüm konu başlıklarını doldurun.";

        toast({
            title: "Eksik Bilgi ⚠️",
            description: message,
            variant: "destructive"
        });
    };

    return (
        <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-950">
            <div className="flex items-center justify-between p-4 md:px-6 border-b dark:border-white/5 bg-slate-50 dark:bg-slate-900 shrink-0">
                <Button type="button" variant="ghost" onClick={onCancel} className="h-9 rounded-lg gap-2 text-slate-500">
                    <ArrowLeft className="w-4 h-4" /> Vazgeç
                </Button>
                <h2 className="font-bold text-slate-900 dark:text-white">{initialData ? "Dersi Düzenle" : "Yeni Ders Modülü"}</h2>
                <div className="w-20" />
            </div>

            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                <ScrollArea className="flex-1">
                    <Form {...form}>
                        <div className="p-6 space-y-6 max-w-xl mx-auto w-full">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-black text-indigo-500 uppercase tracking-widest pl-1">Ders Adı</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Matematik, Türkçe..." {...field} autoFocus className="h-12 rounded-xl text-base font-bold bg-slate-50 dark:bg-slate-900 border-indigo-100 dark:border-indigo-900/50" />
                                        </FormControl>
                                        <FormMessage className="text-rose-500" />
                                    </FormItem>
                                )}
                            />

                            <div className="space-y-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Konu Başlıkları</span>
                                
                                {topicFields.map((topicField, topicIndex) => (
                                    <div key={topicField.id} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-3 relative group">
                                        <div className="flex items-start gap-3">
                                            <div className="flex-grow">
                                                <FormField
                                                    control={form.control}
                                                    name={`topics.${topicIndex}.name`}
                                                    render={({ field }) => (
                                                        <FormItem className="space-y-0">
                                                            <FormControl>
                                                                <Input placeholder="Konu başlığı..." {...field} className="h-10 rounded-lg font-bold text-sm bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800" />
                                                            </FormControl>
                                                            <FormMessage className="text-[10px] mt-1" />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            <Button 
                                                type="button" 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-10 w-10 text-slate-300 hover:text-rose-500 rounded-lg shrink-0" 
                                                onClick={() => removeTopic(topicIndex)}
                                            >
                                                <X className="h-5 w-5"/>
                                            </Button>
                                        </div>

                                        <TopicSourcesEditor control={form.control} topicIndex={topicIndex} />
                                    </div>
                                ))}

                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    className="w-full h-10 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 hover:text-indigo-600 transition-all font-bold text-xs" 
                                    onClick={() => appendTopic({ name: "", sources: [""] })}
                                >
                                    <Plus className="mr-2 h-3 w-3"/> Yeni Konu
                                </Button>
                            </div>
                        </div>
                    </Form>
                </ScrollArea>
            </div>
            
            <div className="p-4 md:p-6 border-t dark:border-white/5 bg-slate-50 dark:bg-slate-900 shrink-0">
                <Button onClick={form.handleSubmit(handleInternalSubmit, handleInternalError)} type="button" className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold shadow-md text-white">
                    Modülü Tamamla <Check className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

function TopicSourcesEditor({ topicIndex, control }: { topicIndex: number, control: any }) {
    const { fields, append, remove } = useFieldArray({
        control: control,
        name: `topics.${topicIndex}.sources`,
    });

    return (
        <div className="space-y-2 border-l-2 border-indigo-100 dark:border-indigo-900/30 pl-4">
            {fields.map((field, sourceIndex) => (
                <div key={field.id} className="flex items-center gap-2">
                    <FormField
                        control={control}
                        name={`topics.${topicIndex}.sources.${sourceIndex}`}
                        render={({ field: sourceField }) => (
                            <FormItem className="flex-grow space-y-0">
                                <FormControl>
                                    <Input placeholder="Link veya sayfa notu..." {...sourceField} className="h-8 text-xs bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 rounded-md" />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-rose-500 rounded-md shrink-0" onClick={() => remove(sourceIndex)}>
                        <Trash2 className="h-3 h-3"/>
                    </Button>
                </div>
            ))}
            <button 
                type="button" 
                onClick={() => append("")}
                className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-1.5 py-1"
            >
                <Plus className="w-3 h-3"/> Kaynak Ekle
            </button>
        </div>
    );
}