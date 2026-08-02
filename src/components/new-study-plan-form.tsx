"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter, Dialog, DialogContent } from "./ui/dialog";
import type { StudyPlan } from "@/lib/data";
import { Trash2, Layers, Plus, Check, ListPlus, PlusCircle, X, Sparkles, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "./ui/textarea";

const generateSafeId = () => {
    return 'id-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
};

const planInfoSchema = z.object({
  title: z.string().min(1, "Lütfen bir plan başlığı girin."),
  link: z.string().optional(),
});

type SubjectType = {
  id?: string;
  name: string;
  topics: { id?: string; name: string; sources?: string[] }[];
};

type NewStudyPlanFormProps = {
  onSubmit: (data: Omit<StudyPlan, 'id' | 'familyId'>) => void;
  initialData?: StudyPlan | null;
};

export function NewStudyPlanForm({ onSubmit, initialData }: NewStudyPlanFormProps) {
  const { toast } = useToast();
  
  const [subjects, setSubjects] = React.useState<SubjectType[]>([]);
  const [isBulkAddOpen, setIsBulkAddOpen] = React.useState(false);
  const [bulkTargetSubjectIndex, setBulkTargetSubjectIndex] = React.useState<number | null>(null);
  const [bulkText, setBulkText] = React.useState("");

  const form = useForm<z.infer<typeof planInfoSchema>>({
    resolver: zodResolver(planInfoSchema),
    defaultValues: {
      title: initialData?.title || "",
      link: initialData?.link || "",
    },
  });

  // Load initial data
  React.useEffect(() => {
    if (initialData) {
      form.reset({
        title: initialData.title || "",
        link: initialData.link || "",
      });
      setSubjects(
        (initialData.subjects || []).map(s => ({
          id: s.id || generateSafeId(),
          name: s.name || "Ders",
          topics: (s.topics || []).map(t => ({
            id: t.id || generateSafeId(),
            name: t.name || "",
            sources: t.sources || []
          }))
        }))
      );
    } else {
      setSubjects([
        {
          id: generateSafeId(),
          name: "Genel Konular",
          topics: [{ id: generateSafeId(), name: "" }]
        }
      ]);
    }
  }, [initialData, form]);

  // Add a new subject module
  const handleAddSubject = () => {
    setSubjects(prev => [
      ...prev,
      {
        id: generateSafeId(),
        name: `Ders ${prev.length + 1}`,
        topics: [{ id: generateSafeId(), name: "" }]
      }
    ]);
  };

  // Remove a subject module
  const handleRemoveSubject = (index: number) => {
    if (subjects.length === 1) {
      toast({ title: "En az bir ders kalmalıdır.", variant: "default" });
      return;
    }
    setSubjects(prev => prev.filter((_, i) => i !== index));
  };

  // Update subject name
  const handleSubjectNameChange = (index: number, name: string) => {
    setSubjects(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], name };
      return copy;
    });
  };

  // Add a topic to a subject
  const handleAddTopic = (subjectIndex: number, topicName: string = "") => {
    setSubjects(prev => {
      const copy = [...prev];
      const targetSub = copy[subjectIndex];
      copy[subjectIndex] = {
        ...targetSub,
        topics: [...targetSub.topics, { id: generateSafeId(), name: topicName }]
      };
      return copy;
    });
  };

  // Remove a topic from a subject
  const handleRemoveTopic = (subjectIndex: number, topicIndex: number) => {
    setSubjects(prev => {
      const copy = [...prev];
      const targetSub = copy[subjectIndex];
      copy[subjectIndex] = {
        ...targetSub,
        topics: targetSub.topics.filter((_, i) => i !== topicIndex)
      };
      return copy;
    });
  };

  // Update topic name
  const handleTopicNameChange = (subjectIndex: number, topicIndex: number, name: string) => {
    setSubjects(prev => {
      const copy = [...prev];
      const targetSub = copy[subjectIndex];
      const topicsCopy = [...targetSub.topics];
      topicsCopy[topicIndex] = { ...topicsCopy[topicIndex], name };
      copy[subjectIndex] = { ...targetSub, topics: topicsCopy };
      return copy;
    });
  };

  // Handle Bulk Add Topics
  const handleBulkAddExecute = () => {
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      setIsBulkAddOpen(false);
      return;
    }

    const targetIdx = bulkTargetSubjectIndex !== null ? bulkTargetSubjectIndex : (subjects.length > 0 ? 0 : 0);

    setSubjects(prev => {
      if (prev.length === 0) {
        return [{
          id: generateSafeId(),
          name: form.getValues('title')?.trim() || "Genel Konular",
          topics: lines.map(line => ({ id: generateSafeId(), name: line }))
        }];
      }

      const copy = [...prev];
      const targetSub = copy[targetIdx] || copy[0];
      
      // Filter out empty topic placeholder if present
      const existingTopics = targetSub.topics.filter(t => t.name.trim().length > 0);
      const newTopics = lines.map(line => ({ id: generateSafeId(), name: line }));

      copy[targetIdx] = {
        ...targetSub,
        topics: [...existingTopics, ...newTopics]
      };
      return copy;
    });

    setBulkText("");
    setIsBulkAddOpen(false);
    toast({ title: "Konular Eklendi ✅", description: `${lines.length} adet konu listeye başarıyla eklendi.` });
  };

  // Final submit handler - 100% fail-safe
  const handleFinalSubmit = (values: z.infer<typeof planInfoSchema>) => {
    const planTitle = values.title.trim();

    // Clean subjects & topics
    let cleanedSubjects = subjects.map(s => {
      const validTopics = (s.topics || [])
        .map(t => ({
          id: t.id || generateSafeId(),
          name: (t.name || "").trim(),
          sources: (t.sources || []).filter(src => typeof src === 'string' && src.trim() !== '')
        }))
        .filter(t => t.name.length > 0);

      return {
        id: s.id || generateSafeId(),
        name: (s.name || "").trim() || planTitle || "Genel Ders",
        topics: validTopics
      };
    }).filter(s => s.topics.length > 0 || s.name.length > 0);

    // Fail-safe fallback: If no subjects or topics exist, auto-create one!
    if (cleanedSubjects.length === 0 || cleanedSubjects.every(s => s.topics.length === 0)) {
      cleanedSubjects = [{
        id: generateSafeId(),
        name: planTitle || "Genel Konular",
        topics: [{ id: generateSafeId(), name: planTitle || "Konu 1", sources: [] }]
      }];
    }

    const finalData: any = {
      title: planTitle,
      subjects: cleanedSubjects
    };

    if (values.link && values.link.trim()) {
      finalData.link = values.link.trim();
    }

    onSubmit(finalData);
  };

  const handleFormError = (errors: any) => {
    console.error("Form errors:", errors);
    toast({
      title: "Lütfen Plan Başlığı Giriniz ⚠️",
      description: "Plan başlığı alanını doldurup tekrar deneyin.",
      variant: "destructive"
    });
  };

  const totalTopicsCount = subjects.reduce((acc, s) => acc + s.topics.filter(t => t.name.trim()).length, 0);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-950">
      {/* HEADER */}
      <DialogHeader className="px-6 py-4 border-b dark:border-white/5 bg-slate-50/80 dark:bg-slate-900/80 shrink-0 text-left">
        <DialogTitle className="text-xl font-bold flex items-center gap-2">
          <Layers className="w-6 h-6 text-indigo-500" />
          {initialData ? "Yol Haritasını Düzenle" : "Yeni Yol Haritası"}
        </DialogTitle>
        <DialogDescription className="text-xs font-medium text-slate-500">
          Başlığı yazın, konuları ekleyin veya toplu olarak yapıştırın.
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFinalSubmit, handleFormError)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="flex-1">
            <div className="p-5 md:p-6 space-y-6 max-w-3xl mx-auto w-full">
              
              {/* PLAN BAŞLIĞI ALANI */}
              <div className="space-y-4 bg-slate-50/50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest pl-1">Plan Başlığı *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Örn: LGS 2025 Matematik Hazırlık" 
                          {...field} 
                          className="h-12 rounded-xl text-base font-bold bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-2 ring-indigo-500/20" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="link"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Genel Link (İsteğe Bağlı)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Örn: https://youtube.com/playlist..." 
                          {...field} 
                          className="h-10 rounded-xl text-xs font-medium bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800" 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* DERSLER VE KONULAR ALANI */}
              <div className="space-y-6">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Dersler & Konular</h3>
                    <Badge variant="secondary" className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-none font-bold">
                      {totalTopicsCount} Konu
                    </Badge>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setBulkTargetSubjectIndex(0);
                      setIsBulkAddOpen(true);
                    }}
                    className="h-9 px-3 rounded-xl border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 font-bold text-xs gap-1.5"
                  >
                    <ListPlus className="w-4 h-4" /> Toplu Konu Yapıştır
                  </Button>
                </div>

                {/* DERS MODÜLLERİ LİSTESİ */}
                {subjects.map((sub, sIdx) => (
                  <div key={sub.id || sIdx} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 md:p-5 space-y-4 shadow-sm relative">
                    
                    {/* DERS BAŞLIĞI KARTI */}
                    <div className="flex items-center justify-between gap-3 border-b dark:border-white/5 pb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 font-black text-xs flex items-center justify-center shrink-0">
                          {sIdx + 1}
                        </span>
                        <Input
                          value={sub.name}
                          onChange={(e) => handleSubjectNameChange(sIdx, e.target.value)}
                          placeholder="Ders Adı (Örn: Matematik)"
                          className="h-10 text-sm font-bold bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
                        />
                      </div>
                      
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setBulkTargetSubjectIndex(sIdx);
                            setIsBulkAddOpen(true);
                          }}
                          className="h-8 px-2 text-xs font-bold text-indigo-500 hover:bg-indigo-50 rounded-lg gap-1"
                        >
                          <ListPlus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Toplu Konu</span>
                        </Button>
                        {subjects.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveSubject(sIdx)}
                            className="h-8 w-8 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* KONULAR LİSTESİ */}
                    <div className="space-y-2 pl-2 md:pl-4">
                      {sub.topics.map((top, tIdx) => (
                        <div key={top.id || tIdx} className="flex items-center gap-2 group">
                          <span className="text-[10px] font-bold text-slate-300 dark:text-slate-700 w-5 text-right shrink-0">
                            {tIdx + 1}.
                          </span>
                          <Input
                            value={top.name}
                            onChange={(e) => handleTopicNameChange(sIdx, tIdx, e.target.value)}
                            placeholder="Konu adı (Örn: Üslü İfadeler)"
                            className="h-9 text-xs font-bold bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-lg flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveTopic(sIdx, tIdx)}
                            className="h-8 w-8 text-slate-300 hover:text-rose-500 rounded-lg opacity-80 hover:opacity-100 shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}

                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => handleAddTopic(sIdx)}
                        className="h-8 px-3 text-xs font-bold text-indigo-500 hover:bg-indigo-50 rounded-lg gap-1.5 mt-2"
                      >
                        <Plus className="w-3.5 h-3.5" /> Konu Ekle
                      </Button>
                    </div>
                  </div>
                ))}

                {/* YENİ DERS MODÜLÜ EKLE BUTONU */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddSubject}
                  className="w-full h-12 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all font-bold text-xs gap-2"
                >
                  <PlusCircle className="w-4 h-4" /> Başka Ders Ekleyin
                </Button>
              </div>

            </div>
          </ScrollArea>

          {/* FOOTER */}
          <DialogFooter className="p-4 border-t dark:border-white/5 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md shrink-0">
            <Button 
              type="submit" 
              className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-extrabold text-white text-base shadow-lg shadow-indigo-500/20 gap-2"
            >
              <Check className="w-5 h-5" /> Planı Kaydet
            </Button>
          </DialogFooter>
        </form>
      </Form>

      {/* TOPLU KONU YAPIŞTIR MODALI */}
      <Dialog open={isBulkAddOpen} onOpenChange={setIsBulkAddOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-950 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <ListPlus className="w-5 h-5 text-indigo-500" />
              Toplu Konu Yapıştır
            </DialogTitle>
            <DialogDescription className="text-xs">
              Her satıra bir konu gelecek şekilde listenizi buraya yapıştırın.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              placeholder={`Üslü İfadeler\nKöklü İfadeler\nVeri Analizi\nOlasılık...`}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              className="h-56 rounded-xl font-medium text-xs leading-relaxed bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsBulkAddOpen(false)} className="rounded-xl text-xs">
              İptal
            </Button>
            <Button onClick={handleBulkAddExecute} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white">
              Listeye Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
