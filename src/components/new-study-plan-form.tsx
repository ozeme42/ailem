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
import { Trash2, Layers, BookOpen, Plus, X, ArrowLeft, Check, GripVertical, FileText, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

// --- YARDIMCI FONKSİYON ---
const generateSafeId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

// --- SCHEMAS ---
const planInfoSchema = z.object({
  title: z.string().min(3, "Plan adı en az 3 karakter olmalıdır."),
});

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
  const form = useForm<z.infer<typeof planInfoSchema>>({
    resolver: zodResolver(planInfoSchema),
    defaultValues: {
      title: initialData?.title || "",
    },
  });

  const [subjects, setSubjects] = React.useState<SubjectType[]>(
    initialData?.subjects ? initialData.subjects as SubjectType[] : []
  );

  const [editingSubject, setEditingSubject] = React.useState<{ subject: SubjectType | null, index: number } | null>(null);
  const [isAddingSubject, setIsAddingSubject] = React.useState(false);
  const [draggedSubjectIndex, setDraggedSubjectIndex] = React.useState<number | null>(null);

  const handleFinalSubmit = (values: z.infer<typeof planInfoSchema>) => {
    if (subjects.length === 0) {
        toast({ title: "Ders Eksik", description: "Lütfen en az bir ders ekleyin!", variant: "destructive" });
        return;
    }
    onSubmit({
        ...values,
        subjects: subjects.map(s => ({
            ...s,
            id: s.id || generateSafeId(),
            topics: s.topics.map(t => ({
                ...t,
                id: t.id || generateSafeId(),
                sources: t.sources?.filter(src => src.trim() !== '') || []
            }))
        }))
    });
  };

  const removeSubject = (index: number) => {
      setSubjects(prev => prev.filter((_, i) => i !== index));
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

  const onSubjectDragStart = (e: React.DragEvent, index: number) => {
      setDraggedSubjectIndex(index);
      e.dataTransfer.effectAllowed = "move";
      const target = e.target as HTMLElement;
      setTimeout(() => { target.style.opacity = "0.5"; }, 0);
  };

  const onSubjectDragEnter = (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (draggedSubjectIndex === null || draggedSubjectIndex === index) return;

      setSubjects(prev => {
          const newSubjects = [...prev];
          const draggedItem = newSubjects[draggedSubjectIndex];
          newSubjects.splice(draggedSubjectIndex, 1);
          newSubjects.splice(index, 0, draggedItem);
          return newSubjects;
      });
      setDraggedSubjectIndex(index);
  };

  const onSubjectDragEnd = (e: React.DragEvent) => {
      setDraggedSubjectIndex(null);
      const target = e.target as HTMLElement;
      target.style.opacity = "1";
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
    <div className="w-full bg-white dark:bg-slate-950 flex flex-col h-full overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b dark:border-white/5 bg-slate-50 dark:bg-slate-900 shrink-0">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <Layers className="w-6 h-6 text-indigo-500" />
                {initialData ? "Yol Haritasını Düzenle" : "Yeni Yol Haritası"}
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
                Plan bilgilerini girin ve derslerinizi ayrı ayrı modüller halinde ekleyin.
            </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFinalSubmit)} className="flex flex-col flex-1 min-h-0">
                <ScrollArea className="flex-1 w-full">
                    <div className="px-4 md:px-8 py-6 space-y-8 max-w-4xl mx-auto w-full">
                        
                        <div className="space-y-4 bg-white dark:bg-slate-900 p-5 md:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Plan Başlığı</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Örn: 8. Sınıf LGS Deneme Takibi" {...field} className="h-12 md:h-14 rounded-xl text-base md:text-lg font-bold bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1 mb-4">
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Eklenen Dersler</h3>
                                <div className="flex items-center gap-2">
                                     <span className="text-xs font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-md">
                                        Toplam: {subjects.length}
                                    </span>
                                </div>
                            </div>

                            {subjects.length === 0 ? (
                                <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50 dark:bg-slate-900/50">
                                    <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                    <p className="text-sm md:text-base text-slate-500 font-medium">Henüz ders eklenmedi.<br/>Aşağıdaki butondan ilk dersinizi oluşturun.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {subjects.map((subject, index) => (
                                        <div 
                                            key={subject.id || index} 
                                            draggable
                                            onDragStart={(e) => onSubjectDragStart(e, index)}
                                            onDragEnter={(e) => onSubjectDragEnter(e, index)}
                                            onDragEnd={onSubjectDragEnd}
                                            onDragOver={(e) => e.preventDefault()}
                                            className={cn(
                                                "flex flex-col justify-between p-5 bg-white dark:bg-slate-900 rounded-2xl border shadow-sm transition-all group cursor-grab active:cursor-grabbing",
                                                draggedSubjectIndex === index ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-900/20" : "border-slate-200 dark:border-slate-800 hover:border-indigo-300"
                                            )}
                                        >
                                            <div className="flex items-start gap-3 mb-4">
                                                <div className="mt-1 text-slate-300 hover:text-indigo-400 transition-colors">
                                                    <GripVertical className="w-5 h-5" />
                                                </div>
                                                <div className="w-8 h-8 shrink-0 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center font-black text-sm">
                                                    {index + 1}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base leading-tight truncate">{subject.name}</h4>
                                                    <p className="text-xs font-medium text-slate-500 mt-1">{subject.topics.length} Konu tanımlı</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 w-full pt-3 border-t border-slate-100 dark:border-slate-800">
                                                <Button 
                                                    type="button" 
                                                    variant="outline" 
                                                    onClick={() => setEditingSubject({ subject, index })}
                                                    className="flex-1 h-9 text-xs font-bold text-indigo-600 hover:bg-indigo-50 border-slate-200 dark:border-slate-700"
                                                >
                                                    Düzenle
                                                </Button>
                                                <Button 
                                                    type="button" 
                                                    variant="outline" 
                                                    size="icon"
                                                    onClick={() => removeSubject(index)}
                                                    className="h-9 w-9 text-rose-500 hover:bg-rose-50 border-slate-200 dark:border-slate-700"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <Button 
                                type="button" 
                                variant="outline" 
                                className="w-full h-14 rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-800 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 font-bold mt-6"
                                onClick={() => setIsAddingSubject(true)}
                            >
                                <Plus className="mr-2 h-5 w-5" /> Ders ve Konu Ekle
                            </Button>
                        </div>
                    </div>
                </ScrollArea>
                
                <DialogFooter className="p-4 md:p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
                    <div className="w-full max-w-4xl mx-auto">
                        <Button type="submit" className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black shadow-lg shadow-indigo-500/20 text-white transition-all text-base md:text-lg">
                            <Check className="mr-2 h-5 w-5" /> Tüm Planı Tamamla ve Kaydet
                        </Button>
                    </div>
                </DialogFooter>
            </form>
        </Form>
    </div>
  );
}

// ==========================================
// ALT BİLEŞEN: DERS EDİTÖRÜ (SUBJECT EDITOR - MODAL)
// ==========================================
function SubjectEditor({ 
    initialData, 
    onSave, 
    onCancel 
}: { 
    initialData: SubjectType | null, 
    onSave: (data: SubjectType) => void, 
    onCancel: () => void 
}) {
    const form = useForm<SubjectType>({
        resolver: zodResolver(subjectSchema),
        defaultValues: initialData || {
            name: "",
            topics: [{ name: "", sources: [""] }]
        }
    });

    const { fields: topicFields, append: appendTopic, remove: removeTopic, move: moveTopic } = useFieldArray({
        control: form.control,
        name: "topics"
    });

    const [draggedTopicIndex, setDraggedTopicIndex] = React.useState<number | null>(null);

    const onSubmit = (data: SubjectType) => {
        onSave(data);
    };

    const onTopicDragStart = (e: React.DragEvent, index: number) => {
        setDraggedTopicIndex(index);
        e.dataTransfer.effectAllowed = "move";
        const target = e.target as HTMLElement;
        setTimeout(() => { target.style.opacity = "0.4"; }, 0);
    };

    const onTopicDragEnter = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedTopicIndex === null || draggedTopicIndex === index) return;
        
        moveTopic(draggedTopicIndex, index);
        setDraggedTopicIndex(index);
    };

    const onTopicDragEnd = (e: React.DragEvent) => {
        setDraggedTopicIndex(null);
        const target = e.target as HTMLElement;
        target.style.opacity = "1";
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 dark:bg-black/70 backdrop-blur-sm p-4 md:p-8">
            <div className="flex flex-col w-full max-w-3xl bg-white dark:bg-slate-950 rounded-2xl md:rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-4 md:px-6 md:py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-t-2xl md:rounded-t-[2rem] shrink-0">
                    <Button type="button" variant="ghost" onClick={onCancel} className="h-10 px-3 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl">
                        <ArrowLeft className="w-5 h-5 mr-1 md:mr-2" /> <span className="hidden md:inline">İptal Et</span>
                    </Button>
                    <h2 className="font-bold text-slate-800 dark:text-slate-100 flex-1 text-center md:text-lg">
                        {initialData ? "Dersi Düzenle" : "Yeni Ders Modülü"}
                    </h2>
                    <div className="w-[72px] md:w-[96px]"></div> 
                </div>

                <ScrollArea className="flex-1 w-full">
                    <Form {...form}>
                        <div className="p-4 md:p-8 space-y-8 w-full max-w-2xl mx-auto pb-12">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-black text-indigo-500 uppercase tracking-widest pl-1">Dersin Adı</FormLabel>
                                        <FormControl>
                                            <Input 
                                                placeholder="Örn: Din Kültürü, Siyer, Kodlama..." 
                                                {...field} 
                                                autoFocus
                                                className="h-14 md:h-16 md:text-xl rounded-2xl text-lg font-bold bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800 focus-visible:ring-indigo-500" 
                                            />
                                        </FormControl>
                                        <FormMessage className="text-rose-500" />
                                    </FormItem>
                                )}
                            />

                            <div className="space-y-4 pt-2">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pl-1">
                                        <Layers className="w-4 h-4" /> Alt Konular
                                    </span>
                                </div>

                                {topicFields.map((topicField, topicIndex) => (
                                    <div 
                                        key={topicField.id} 
                                        draggable
                                        onDragStart={(e) => onTopicDragStart(e, topicIndex)}
                                        onDragEnter={(e) => onTopicDragEnter(e, topicIndex)}
                                        onDragEnd={onTopicDragEnd}
                                        onDragOver={(e) => e.preventDefault()}
                                        className={cn(
                                            "relative p-4 md:p-6 rounded-2xl border shadow-sm space-y-4 transition-all cursor-grab active:cursor-grabbing",
                                            draggedTopicIndex === topicIndex ? "border-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/10 ring-2 ring-indigo-500/20" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-200"
                                        )}
                                    >
                                        <div className="flex items-start gap-2 md:gap-3">
                                            <div className="mt-3 text-slate-300 hover:text-indigo-400 transition-colors hidden md:block">
                                                <GripVertical className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <FormField
                                                    control={form.control}
                                                    name={`topics.${topicIndex}.name`}
                                                    render={({ field, fieldState }) => (
                                                        <FormItem className="space-y-1">
                                                            <FormControl>
                                                                <Input 
                                                                    placeholder="Konu başlığı yazın..." 
                                                                    {...field} 
                                                                    className={cn("h-11 md:h-12 bg-slate-50 dark:bg-slate-950 rounded-xl font-bold text-sm md:text-base cursor-text", fieldState.error ? "border-rose-500 ring-1 ring-rose-500" : "border-slate-200 dark:border-slate-800")}
                                                                />
                                                            </FormControl>
                                                            <FormMessage className="text-rose-500 text-[10px]" />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            <Button 
                                                type="button" 
                                                variant="ghost" 
                                                size="icon" 
                                                className="mt-1 md:mt-1.5 h-9 w-9 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-full shrink-0" 
                                                onClick={() => removeTopic(topicIndex)}
                                            >
                                                <X className="h-5 w-5"/>
                                            </Button>
                                        </div>

                                        <div className="pl-2 md:pl-11 pr-2">
                                            <TopicSourcesEditor control={form.control} topicIndex={topicIndex} />
                                        </div>
                                    </div>
                                ))}

                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    className="w-full h-12 md:h-14 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-all font-bold mt-4" 
                                    onClick={() => appendTopic({ name: "", sources: [""] })}
                                >
                                    <Plus className="mr-2 h-4 w-4 md:h-5 md:w-5"/> Yeni Konu Ekle
                                </Button>
                            </div>

                        </div>
                    </Form>
                </ScrollArea>
                
                <div className="p-4 md:p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-b-2xl md:rounded-b-[2rem] shrink-0">
                    <div className="max-w-2xl mx-auto">
                        <Button onClick={form.handleSubmit(onSubmit)} type="button" className="w-full h-12 md:h-14 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold shadow-md text-white md:text-lg transition-all active:scale-95">
                            Bu Dersi Listeye Ekle <Check className="ml-2 h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ==========================================
// ALT-ALT BİLEŞEN: KAYNAK EDİTÖRÜ
// ==========================================
function TopicSourcesEditor({ topicIndex, control}: { topicIndex: number, control: any}) {
    const { fields, append, remove } = useFieldArray({
        control: control,
        name: `topics.${topicIndex}.sources`,
    });

    return (
        <div className="space-y-2.5 border-l-2 border-indigo-100 dark:border-indigo-900/50 pl-3 md:pl-4 py-1">
            {fields.map((field, sourceIndex) => (
                <div key={field.id} className="flex items-center gap-2 md:gap-3">
                    <FormField
                        control={control}
                        name={`topics.${topicIndex}.sources.${sourceIndex}`}
                        render={({ field: sourceField }) => (
                            <FormItem className="flex-grow space-y-0">
                                <FormControl>
                                    <div className="relative">
                                        <Input 
                                            placeholder="YouTube linki, kitap sf. vb." 
                                            {...sourceField} 
                                            className="h-9 md:h-10 pr-8 md:pr-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs md:text-sm rounded-lg"
                                        />
                                        {sourceField.value && (
                                            <div className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2">
                                                <FileText className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-300" />
                                            </div>
                                        )}
                                    </div>
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 md:h-9 md:w-9 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-md shrink-0 transition-colors" 
                        onClick={() => remove(sourceIndex)}
                    >
                        <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4"/>
                    </Button>
                </div>
            ))}
            
            <button 
                type="button" 
                onClick={() => append("")}
                className="text-xs md:text-sm font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-1.5 py-1.5 transition-colors"
            >
                <div className="bg-indigo-50 dark:bg-indigo-900/50 p-1 md:p-1.5 rounded-md">
                    <Plus className="w-3 h-3 md:w-3.5 md:h-3.5"/> 
                </div>
                Kaynak Ekle
            </button>
        </div>
    );
}
