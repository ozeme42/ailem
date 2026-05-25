"use client";

import * as React from "react";
import { z } from "zod";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "./ui/button";
import { Form, FormControl, FormField, FormItem } from "./ui/form";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { ScrollArea } from "./ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Check, Save, ListPlus, Type, FileJson, Copy } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "./ui/textarea";

// --- DESIGN SYSTEM: Modern & Light Glassmorphism ---
const glassColors = {
    ITEM_BG: "flex items-center justify-between p-3 border-b border-white/[0.06] hover:bg-white/[0.04] transition-colors last:border-0",
    OPTION_BUTTON: `
        flex items-center justify-center w-10 h-10 rounded-xl border text-sm font-bold transition-all cursor-pointer
        bg-white/[0.03] border-white/10 text-slate-400 
        hover:bg-indigo-500/10 hover:text-indigo-300 hover:border-indigo-500/30 hover:scale-105
        peer-data-[state=checked]:bg-indigo-600 
        peer-data-[state=checked]:text-white 
        peer-data-[state=checked]:border-indigo-500 
        peer-data-[state=checked]:shadow-[0_0_20px_rgba(79,70,229,0.3)] 
        peer-data-[state=checked]:scale-105
    `,
    BUTTON_PRIMARY: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02]",
    NUMBER_BADGE: "flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 text-slate-300 font-mono text-sm border border-white/5",
};

type AnswerKey = { [key: number | string]: string };

const formSchema = z.object({
  answers: z.array(
    z.object({
      questionNumber: z.number(),
      value: z.string().nullable(),
    })
  ),
});

type AnswerKeyFormProps = {
  totalQuestions: number;
  answerKey: AnswerKey;
  onSave: (newKey: AnswerKey) => void;
};

const sampleJsonPlaceholder = `[
  {
    "1": "A",
    "2": "B",
    "3": "C",
    "4": "D",
    "5": "E"
  }
]`;

export function AnswerKeyForm({ totalQuestions, answerKey, onSave }: AnswerKeyFormProps) {
  const { toast } = useToast();
  const [isBulkDialogOpen, setIsBulkDialogOpen] = React.useState(false);
  const [bulkInput, setBulkInput] = React.useState("");
  const [copied, setCopied] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      answers: Array.from({ length: totalQuestions }, (_, i) => ({
        questionNumber: i + 1,
        value: answerKey[i + 1] || null,
      })),
    },
  });

  React.useEffect(() => {
    form.reset({
      answers: Array.from({ length: totalQuestions }, (_, i) => ({
        questionNumber: i + 1,
        value: answerKey[i + 1] || null,
      })),
    });
  }, [totalQuestions, answerKey, form]);

  const { fields } = useFieldArray({
    control: form.control,
    name: "answers",
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const newKey: AnswerKey = {};
    data.answers.forEach((ans) => {
      if (ans.value) {
        newKey[ans.questionNumber] = ans.value;
      }
    });
    onSave(newKey);
    toast({ 
        title: "Başarılı", 
        description: "Cevap anahtarı güncellendi.", 
        className: "bg-emerald-900 border-emerald-800 text-white" 
    });
  };

  const handleCopySample = () => {
    navigator.clipboard.writeText(sampleJsonPlaceholder);
    setCopied(true);
    toast({
        title: "Kopyalandı",
        description: "Örnek şablon panoya kopyalandı.",
        className: "bg-slate-900 border-white/10 text-white"
    });
    
    // Auto-fill if empty
    if (!bulkInput.trim()) {
        setBulkInput(sampleJsonPlaceholder);
    }

    setTimeout(() => setCopied(false), 2000);
  };

  const handleBulkProcess = () => {
    if (!bulkInput.trim()) return;

    let detectedAnswers: string[] = [];

    // Try parsing as JSON first
    try {
        const parsed = JSON.parse(bulkInput);
        if (Array.isArray(parsed)) {
            // Case 1: Simple array ["A", "B", ...]
            if (typeof parsed[0] === 'string') {
                detectedAnswers = parsed.map(String).map(s => s.toUpperCase());
            } 
            // Case 2: Array of objects [{"1":"A"}, ...]
            else if (typeof parsed[0] === 'object') {
                parsed.forEach(obj => {
                    Object.entries(obj).forEach(([key, val]) => {
                        const idx = parseInt(key) - 1;
                        if (!isNaN(idx)) detectedAnswers[idx] = String(val).toUpperCase();
                    });
                });
            }
        } else if (typeof parsed === 'object') {
            // Case 3: Single object {"1": "A", "2": "B"}
            Object.entries(parsed).forEach(([key, val]) => {
                const idx = parseInt(key) - 1;
                if (!isNaN(idx)) detectedAnswers[idx] = String(val).toUpperCase();
            });
        }
    } catch (e) {
        // Fallback to text parsing (Regex for A-E characters)
        const cleanedInput = bulkInput.toUpperCase();
        
        // If it's a simple string like "ABCDA"
        if (/^[A-E]+$/.test(cleanedInput.replace(/\s/g, ''))) {
            detectedAnswers = cleanedInput.replace(/\s/g, '').split('');
        } else {
            // Split by common delimiters and find A-E
            const segments = bulkInput.split(/[\s,.\-\:]+/);
            segments.forEach(seg => {
                const val = seg.trim().toUpperCase();
                if (val.length === 1 && /[A-E]/.test(val)) {
                    detectedAnswers.push(val);
                }
            });
        }
    }

    if (detectedAnswers.length === 0) {
        toast({ title: "Hata", description: "Geçerli bir cevap formatı bulunamadı.", variant: 'destructive' });
        return;
    }

    // Apply to form
    const currentAnswers = form.getValues("answers");
    const updatedAnswers = currentAnswers.map((ans, idx) => ({
        ...ans,
        value: detectedAnswers[idx] || ans.value
    }));

    form.setValue("answers", updatedAnswers);
    setIsBulkDialogOpen(false);
    setBulkInput("");
    toast({ 
        title: "Toplu Giriş Yapıldı", 
        description: `${Math.min(detectedAnswers.length, totalQuestions)} soru güncellendi.`,
        className: "bg-indigo-900 border-indigo-800 text-white"
    });
  };

  return (
    <Form {...form}>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Soru No / Seçenekler
            </div>
            
            <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
                <DialogTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" className="h-8 text-[11px] font-bold text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                        <ListPlus className="w-3.5 h-3.5 mr-1.5" /> Toplu Ekle
                    </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-white/10 text-slate-100 sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Toplu Cevap Girişi</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Cevapları metin veya JSON formatında yapıştırın.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-2 mb-2">
                            <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-[10px] text-slate-400">
                                <p className="font-bold text-indigo-400 mb-1 flex items-center gap-1"><Type className="w-3 h-3"/> Metin Formatı</p>
                                <p>"ABCDE..." veya "1.A 2.B..." şeklinde yazabilirsiniz.</p>
                            </div>
                            <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-[10px] text-slate-400">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="font-bold text-pink-400 flex items-center gap-1"><FileJson className="w-3 h-3"/> JSON Formatı</p>
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        onClick={handleCopySample}
                                        className="h-5 px-1.5 text-[9px] bg-white/5 hover:bg-white/10 text-slate-300"
                                    >
                                        {copied ? <Check className="w-2.5 h-2.5 mr-1 text-emerald-400" /> : <Copy className="w-2.5 h-2.5 mr-1" />}
                                        {copied ? "Kopyalandı" : "Şablonu Kopyala"}
                                    </Button>
                                </div>
                                <p>&#123;"1":"A", "2":"B"...&#125; şeklinde yazabilirsiniz.</p>
                            </div>
                        </div>
                        <Textarea 
                            value={bulkInput}
                            onChange={(e) => setBulkInput(e.target.value)}
                            placeholder="Cevapları buraya yapıştırın..."
                            className="h-40 font-mono text-sm bg-black/30 border-white/10 text-emerald-400 focus:ring-indigo-500/30"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsBulkDialogOpen(false)} className="text-slate-400 hover:text-white">İptal</Button>
                        <Button onClick={handleBulkProcess} className="bg-indigo-600 hover:bg-indigo-500">İşle ve Uygula</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>

        <ScrollArea className="flex-1 -mr-4 pr-4">
          <div className="flex flex-col">
            {fields.map((field, index) => (
              <FormField
                key={field.id}
                control={form.control}
                name={`answers.${index}.value`}
                render={({ field }) => (
                  <FormItem className={cn("space-y-0", glassColors.ITEM_BG)}>
                    <div className="flex items-center gap-3">
                        <div className={glassColors.NUMBER_BADGE}>
                            {index + 1}
                        </div>
                    </div>
                    
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value || ""}
                        className="flex items-center gap-2"
                      >
                        {["A", "B", "C", "D", "E"].map((option) => (
                          <FormItem
                            key={option}
                            className="flex items-center space-x-0 space-y-0"
                          >
                            <FormControl>
                              <div className="relative">
                                  <RadioGroupItem 
                                    value={option} 
                                    id={`q${index}-${option}`} 
                                    className="peer sr-only" 
                                  />
                                  <Label 
                                    htmlFor={`q${index}-${option}`}
                                    className={glassColors.OPTION_BUTTON}
                                  >
                                    {option}
                                  </Label>
                              </div>
                            </FormControl>
                          </FormItem>
                        ))}
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />
            ))}
          </div>
        </ScrollArea>
        
        <div className="p-6 mt-auto border-t border-white/10 bg-slate-900/50 backdrop-blur-sm">
          <Button type="button" onClick={form.handleSubmit(onSubmit)} size="lg" className={cn("w-full font-bold h-12 rounded-xl", glassColors.BUTTON_PRIMARY)}>
            <Save className="w-5 h-5 mr-2" />
            Cevap Anahtarını Kaydet
          </Button>
        </div>
      </div>
    </Form>
  );
}
